import { Router, type Request, type Response } from "express";
import { generateToken } from "../lib/crypto.js";
import { logger } from "../lib/logger.js";
import { checkRateLimit, routeRateLimitConfig } from "../lib/rate-limit.js";
import { getClientIp } from "../lib/media-proxy.js";
import { runYtDlp, YtDlpAbortedError, YtDlpProcessError } from "../lib/youtube/ytdlp.js";
import { validateTwitterUrl } from "../lib/validators/twitter-url.js";

const router = Router();
const RESOLVE_TIMEOUT_MS = 45_000;

function failure(code: string, message: string) {
  return { success: false, error: { code, message } };
}

function classify(stderr: string): { code: string; message: string; status: number } {
  const text = stderr.toLowerCase();
  if (/login required|log in|private|not available|video unavailable|does not exist|suspended|protected/.test(text)) {
    return { code: "TWITTER_CONTENT_UNAVAILABLE", message: "This Twitter/X post is unavailable, private, or requires access.", status: 404 };
  }
  if (/no video|requested format not available|there is no video/.test(text)) {
    return { code: "TWITTER_NO_VIDEO", message: "This Twitter/X post does not contain a downloadable video.", status: 422 };
  }
  if (/timed out|timeout|network|connection|unable to download/.test(text)) {
    return { code: "TWITTER_RESOLVE_TIMEOUT", message: "Twitter/X did not respond in time. Please try again.", status: 504 };
  }
  return { code: "TWITTER_RESOLVE_FAILED", message: "Twitter/X did not provide a public downloadable video.", status: 422 };
}

router.post("/resolve", async (req: Request, res: Response): Promise<void> => {
  const requestId = generateToken();
  const startedAt = Date.now();
  res.setHeader("X-Request-Id", requestId);
  res.setHeader("Cache-Control", "no-store");
  const rateLimit = checkRateLimit(`twitter:${getClientIp(req)}`, routeRateLimitConfig("twitter"));
  if (!rateLimit.allowed) {
    res.setHeader("Retry-After", String(Math.ceil(rateLimit.retryAfterMs / 1000)));
    res.status(429).json(failure("TWITTER_RATE_LIMITED", "Too many Twitter/X requests. Please try again later."));
    return;
  }
  const checked = validateTwitterUrl(req.body?.url);
  if (!checked.valid || !checked.parsed) {
    res.status(400).json(failure("TWITTER_INVALID_URL", checked.valid ? "Invalid Twitter/X URL." : checked.error));
    return;
  }

  const controller = new AbortController();
  const onClose = (): void => {
    if (!res.writableEnded) controller.abort();
  };
  res.on("close", onClose);
  try {
    const result = await runYtDlp(
      [
        "--no-playlist",
        "--skip-download",
        "--dump-single-json",
        "--format",
        "best[ext=mp4]/best",
        "--no-warnings",
        checked.parsed.normalized,
      ],
      { timeoutMs: RESOLVE_TIMEOUT_MS, signal: controller.signal }
    );
    const info = JSON.parse(result.stdout) as {
      id?: string;
      title?: string;
      uploader?: string;
      uploader_id?: string;
      thumbnail?: string;
      duration?: number;
      width?: number;
      height?: number;
      ext?: string;
      url?: string;
      vcodec?: string;
      acodec?: string;
    };
    if (!info.url || !/^https?:\/\//i.test(info.url) || info.vcodec === "none") {
      res.status(422).json(failure("TWITTER_NO_VIDEO", "This Twitter/X post does not contain a downloadable video."));
      return;
    }
    const duration = Date.now() - startedAt;
    res.setHeader("X-Resolve-Duration-Ms", String(duration));
    logger.info("[TWITTER] resolved public video", { requestId, duration, mediaId: info.id || null });
    res.json({
      success: true,
      data: {
        type: "VIDEO",
        sourceUrl: checked.parsed.normalized,
        thumbnail: info.thumbnail || null,
        title: info.title || null,
        author: info.uploader || info.uploader_id
          ? { username: info.uploader_id || null, displayName: info.uploader || null }
          : null,
        media: [{
          url: info.url,
          type: "video",
          width: typeof info.width === "number" ? info.width : null,
          height: typeof info.height === "number" ? info.height : null,
          duration: typeof info.duration === "number" ? info.duration : null,
          thumbnail: info.thumbnail || null,
          format: info.ext || "mp4",
          mimeType: "video/mp4",
        }],
        mediaId: info.id || undefined,
      },
    });
  } catch (error) {
    if (error instanceof YtDlpAbortedError) {
      if (!res.headersSent) res.status(504).json(failure("TWITTER_RESOLVE_TIMEOUT", "Twitter/X did not respond in time. Please try again."));
      return;
    }
    const stderr = error instanceof YtDlpProcessError ? error.stderr : error instanceof Error ? error.message : "unknown";
    const mapped = classify(stderr);
    logger.warn("[TWITTER] resolve failed", {
      requestId,
      category: mapped.code,
      duration: Date.now() - startedAt,
      stderr: stderr.slice(0, 2000),
    });
    if (!res.headersSent) res.status(mapped.status).json(failure(mapped.code, mapped.message));
  } finally {
    res.off("close", onClose);
  }
});

export default router;
