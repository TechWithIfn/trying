import { Router, type Request, type Response } from "express";
import { generateToken } from "../lib/crypto.js";
import { logger } from "../lib/logger.js";
import { checkRateLimit, routeRateLimitConfig } from "../lib/rate-limit.js";
import { getClientIp } from "../lib/media-proxy.js";
import { runYtDlp, YtDlpAbortedError, YtDlpNotAvailableError, YtDlpProcessError, getYtDlpRetryAfterMs, isRetryableYtDlpError } from "../lib/ytdlp.js";
import { withRetry } from "../lib/retry.js";
import { validateFacebookUrl } from "../lib/validators/facebook-url.js";
import { readUpstreamSignal, describeUpstreamFailure } from "../lib/upstream.js";

const router = Router();
const RESOLVE_TIMEOUT_MS = 45_000;

function failure(code: string, message: string) {
  return { success: false, error: { code, message } };
}

function classify(stderr: string, sourceUrl: string): { code: string; message: string; status: number } {
  const text = stderr.toLowerCase();
  const upstream = readUpstreamSignal(stderr, sourceUrl);
  // Blocking/limiting is a server-side condition: retrying later helps, and
  // the link itself is fine. Checked before content verdicts so a 403 is
  // never reported as "this video is private".
  if (upstream.rateLimited) {
    return { code: "PLATFORM_BUSY", message: "Facebook is temporarily limiting download requests. Please try again in a few minutes.", status: 503 };
  }
  if (upstream.blocked) {
    return { code: "PLATFORM_BLOCKED", message: "Facebook is refusing download requests from this server right now. This is usually temporary — please try again later.", status: 503 };
  }
  if (/login required|log in|private|not available|video unavailable|could not find/.test(text)) {
    return { code: "FACEBOOK_CONTENT_UNAVAILABLE", message: "This Facebook video is unavailable or requires a login.", status: 404 };
  }
  if (/timed out|timeout|network|connection/.test(text)) {
    return { code: "FACEBOOK_RESOLVE_TIMEOUT", message: "Facebook did not respond in time. Please try again.", status: 504 };
  }
  return { code: "FACEBOOK_RESOLVE_FAILED", message: "Facebook did not provide a public downloadable video.", status: 422 };
}

router.post("/resolve", async (req: Request, res: Response): Promise<void> => {
  const requestId = generateToken();
  const startedAt = Date.now();
  res.setHeader("X-Request-Id", requestId);
  res.setHeader("Cache-Control", "no-store");
  const rateLimit = checkRateLimit(`facebook:${getClientIp(req)}`, routeRateLimitConfig("facebook"));
  if (!rateLimit.allowed) {
    res.setHeader("Retry-After", String(Math.ceil(rateLimit.retryAfterMs / 1000)));
    res.status(429).json(failure("FACEBOOK_RATE_LIMITED", "Too many Facebook requests. Please try again later."));
    return;
  }
  const checked = validateFacebookUrl(req.body?.url);
  if (!checked.valid || !checked.parsed) {
    logger.info("[FACEBOOK] URL validation failed", { requestId, duration: Date.now() - startedAt });
    res.status(400).json(failure("FACEBOOK_INVALID_URL", checked.error || "Invalid Facebook URL."));
    return;
  }
  logger.info("[FACEBOOK] URL validated", {
    requestId,
    duration: Date.now() - startedAt,
    host: checked.parsed.hostname,
  });

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
          [
            "--no-playlist",
            "--skip-download",
            "--dump-single-json",
            "--format",
            "best[ext=mp4]/best",
            "--no-warnings",
            source.normalized,
          ],
          { timeoutMs: RESOLVE_TIMEOUT_MS, signal: controller.signal }
        ),
      {
        attempts: 2,
        signal: controller.signal,
        isRetryable: isRetryableYtDlpError,
        retryAfterMs: getYtDlpRetryAfterMs,
        logContext: { platform: "facebook", requestId, host: source.hostname },
      }
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
    };
    if (!info.url || !/^https?:\/\//i.test(info.url)) {
      res.status(422).json(failure("FACEBOOK_NO_VIDEO", "Facebook did not provide a public downloadable video."));
      return;
    }
    const duration = Date.now() - startedAt;
    res.setHeader("X-Resolve-Duration-Ms", String(duration));
    logger.info("[FACEBOOK] resolved public video", { requestId, duration, mediaId: info.id || null });
    res.json({
      success: true,
      data: {
        type: "VIDEO",
        sourceUrl: checked.parsed.normalized,
        thumbnail: info.thumbnail || null,
        title: info.title || null,
        author: info.uploader || info.uploader_id ? { username: info.uploader_id || null, displayName: info.uploader || null } : null,
        media: [{
          url: info.url,
          type: "video",
          width: typeof info.width === "number" ? info.width : null,
          height: typeof info.height === "number" ? info.height : null,
          duration: typeof info.duration === "number" ? info.duration : null,
          thumbnail: info.thumbnail || null,
          format: info.ext || "mp4",
        }],
        mediaId: info.id || undefined,
      },
    });
  } catch (error) {
    if (error instanceof YtDlpAbortedError) {
      if (!res.headersSent) res.status(504).json(failure("FACEBOOK_RESOLVE_TIMEOUT", "Facebook did not respond in time. Please try again."));
      return;
    }
    if (error instanceof YtDlpNotAvailableError) {
      logger.error("[FACEBOOK] extractor unavailable", {
        platform: "facebook",
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
      "[FACEBOOK] resolve failed",
      describeUpstreamFailure(
        "facebook",
        requestId,
        readUpstreamSignal(stderr, checked.parsed.normalized),
        Date.now() - startedAt,
        mapped.code
      )
    );
    logger.debug("[FACEBOOK] upstream stderr", { requestId, stderr: stderr.slice(0, 2000) });
    if (!res.headersSent) res.status(mapped.status).json(failure(mapped.code, mapped.message));
  } finally {
    res.off("close", onClose);
  }
});

export default router;
