import { Router, type Request, type Response } from "express";
import { generateToken } from "../lib/crypto.js";
import { logger } from "../lib/logger.js";
import { checkRateLimit, routeRateLimitConfig } from "../lib/rate-limit.js";
import { getClientIp } from "../lib/media-proxy.js";
import { runYtDlp, YtDlpAbortedError, YtDlpNotAvailableError, YtDlpProcessError, getYtDlpRetryAfterMs, isRetryableYtDlpError } from "../lib/ytdlp.js";
import { withRetry } from "../lib/retry.js";
import { validateThreadsUrl } from "../lib/validators/threads-url.js";
import { readUpstreamSignal, describeUpstreamFailure } from "../lib/upstream.js";

const router = Router();
const RESOLVE_TIMEOUT_MS = 45_000;

function failure(code: string, message: string) {
  return { success: false, error: { code, message } };
}

function classify(stderr: string, sourceUrl: string): { code: string; message: string; status: number } {
  const text = stderr.toLowerCase();
  const upstream = readUpstreamSignal(stderr, sourceUrl);
  if (upstream.rateLimited) {
    return { code: "PLATFORM_BUSY", message: "Threads is temporarily limiting download requests. Please try again in a few minutes.", status: 503 };
  }
  if (upstream.blocked) {
    return { code: "PLATFORM_BLOCKED", message: "Threads is refusing download requests from this server right now. This is usually temporary — please try again later.", status: 503 };
  }
  // A profile or share URL that our own validator already rejected never
  // reaches yt-dlp. "Unsupported URL" here means the current yt-dlp build has
  // no Threads extractor (confirmed against 2026.10.26): the link shape was
  // valid, and blaming the visitor is wrong.
  if (/unsupported url/.test(text)) {
    return {
      code: "THREADS_EXTRACTOR_UNSUPPORTED",
      message:
        "Threads did not return a public media file for this link. If the post is public and includes a photo or video, try again in a few minutes. Text-only posts have nothing to save.",
      status: 502,
    };
  }
  if (/invalid_post|invalid post|not a valid/.test(text)) {
    return { code: "THREADS_INVALID_POST", message: "That Threads link does not point to a single public post. Open the post, tap Share, then Copy link and paste that.", status: 400 };
  }
  if (/login required|log in|private|not available|post unavailable|does not exist|suspended|protected/.test(text)) {
    return { code: "THREADS_CONTENT_UNAVAILABLE", message: "This Threads post is unavailable, private, or requires access.", status: 404 };
  }
  if (/no video|no media|requested format not available|there is no video/.test(text)) {
    return { code: "THREADS_NO_MEDIA", message: "This Threads post does not contain supported public media.", status: 422 };
  }
  if (/timed out|timeout|network|connection|unable to download/.test(text)) {
    return { code: "THREADS_RESOLVE_TIMEOUT", message: "Threads did not respond in time. Please try again.", status: 504 };
  }
  return { code: "THREADS_RESOLVE_FAILED", message: "Threads did not provide public downloadable media.", status: 422 };
}

type RawMedia = {
  url?: string;
  type?: string;
  ext?: string;
  mimeType?: string;
  vcodec?: string;
  acodec?: string;
  width?: number;
  height?: number;
  duration?: number;
  thumbnail?: string;
};

function mediaFromInfo(info: RawMedia): RawMedia | null {
  if (!info.url || !/^https?:\/\//i.test(info.url)) return null;
  const image = info.vcodec === "none" && info.acodec === "none" || /^(jpg|jpeg|png|webp|gif)$/i.test(info.ext || "");
  const video = info.type === "video" || (typeof info.vcodec === "string" && info.vcodec !== "none" && !image);
  if (!image && !video) return null;
  return { ...info, type: image ? "image" : "video" };
}

router.post("/resolve", async (req: Request, res: Response): Promise<void> => {
  const requestId = generateToken();
  const startedAt = Date.now();
  res.setHeader("X-Request-Id", requestId);
  res.setHeader("Cache-Control", "no-store");
  const rateLimit = checkRateLimit(`threads:${getClientIp(req)}`, routeRateLimitConfig("threads"));
  if (!rateLimit.allowed) {
    res.setHeader("Retry-After", String(Math.ceil(rateLimit.retryAfterMs / 1000)));
    res.status(429).json(failure("THREADS_RATE_LIMITED", "Too many Threads requests. Please try again later."));
    return;
  }
  const checked = validateThreadsUrl(req.body?.url);
  if (!checked.valid || !checked.parsed) {
    res.status(400).json(failure("THREADS_INVALID_URL", checked.valid ? "Invalid Threads URL." : checked.error));
    return;
  }
  const controller = new AbortController();
  const onClose = (): void => {
    if (!res.writableEnded) controller.abort();
  };
  res.on("close", onClose);
  const source = checked.parsed;
  try {
    const result = await withRetry(
      () =>
        runYtDlp(
          ["--no-playlist", "--skip-download", "--dump-single-json", "--no-warnings", source.normalized],
          { timeoutMs: RESOLVE_TIMEOUT_MS, signal: controller.signal }
        ),
      {
        attempts: 2,
        signal: controller.signal,
        isRetryable: isRetryableYtDlpError,
        retryAfterMs: getYtDlpRetryAfterMs,
        logContext: { platform: "threads", requestId, host: source.hostname },
      }
    );
    const info = JSON.parse(result.stdout) as RawMedia & {
      id?: string;
      title?: string;
      uploader?: string;
      uploader_id?: string;
      thumbnail?: string;
      entries?: Array<RawMedia>;
    };
    const candidates = [
      ...(Array.isArray(info.entries) ? info.entries : []),
      info,
    ].flatMap((entry) => [entry, ...(Array.isArray((entry as RawMedia & { formats?: RawMedia[] }).formats) ? (entry as RawMedia & { formats: RawMedia[] }).formats : [])]);
    const media = candidates.map(mediaFromInfo).filter((item): item is RawMedia => item !== null);
    const unique = media.filter((item, index, list) => list.findIndex((candidate) => candidate.url === item.url) === index);
    if (unique.length === 0) {
      res.status(422).json(failure("THREADS_NO_MEDIA", "This Threads post does not contain supported public media."));
      return;
    }
    const duration = Date.now() - startedAt;
    res.setHeader("X-Resolve-Duration-Ms", String(duration));
    logger.info("[THREADS] resolved public media", { requestId, duration, mediaCount: unique.length });
    res.json({
      success: true,
      data: {
        type: unique.some((item) => item.type === "video") ? "VIDEO" : unique.length > 1 ? "CAROUSEL" : "PHOTO",
        sourceUrl: checked.parsed.normalized,
        thumbnail: info.thumbnail || unique[0].thumbnail || null,
        title: info.title || null,
        author: info.uploader || info.uploader_id ? { username: info.uploader_id || null, displayName: info.uploader || null } : null,
        media: unique.map((item) => ({
          url: item.url!,
          type: item.type as "image" | "video",
          width: typeof item.width === "number" ? item.width : null,
          height: typeof item.height === "number" ? item.height : null,
          duration: typeof item.duration === "number" ? item.duration : null,
          thumbnail: item.thumbnail || info.thumbnail || null,
          format: item.ext || (item.type === "video" ? "mp4" : "jpg"),
          mimeType: item.mimeType || (item.type === "video" ? "video/mp4" : "image/jpeg"),
        })),
        mediaId: info.id || undefined,
      },
    });
  } catch (error) {
    if (error instanceof YtDlpAbortedError) {
      if (!res.headersSent) res.status(504).json(failure("THREADS_RESOLVE_TIMEOUT", "Threads did not respond in time. Please try again."));
      return;
    }
    if (error instanceof YtDlpNotAvailableError) {
      logger.error("[THREADS] extractor unavailable", {
        platform: "threads",
        requestId,
        host: source.hostname,
        upstreamStatus: null,
        code: "SERVICE_ERROR",
        durationMs: Date.now() - startedAt,
      });
      if (!res.headersSent) {
        res.status(503).json(failure("SERVICE_ERROR", "Service issue on our side. Please try again in a minute."));
      }
      return;
    }
    const stderr = error instanceof YtDlpProcessError ? error.stderr : error instanceof Error ? error.message : "unknown";
    const mapped = classify(stderr, checked.parsed.normalized);
    logger.warn(
      "[THREADS] resolve failed",
      describeUpstreamFailure(
        "threads",
        requestId,
        readUpstreamSignal(stderr, checked.parsed.normalized),
        Date.now() - startedAt,
        mapped.code
      )
    );
    logger.debug("[THREADS] upstream stderr", { requestId, stderr: stderr.slice(0, 2000) });
    if (!res.headersSent) res.status(mapped.status).json(failure(mapped.code, mapped.message));
  } finally {
    res.off("close", onClose);
  }
});

export default router;
