import { Router, type Request, type Response } from "express";
import { generateToken } from "../lib/crypto.js";
import { logger } from "../lib/logger.js";
import { checkRateLimit, routeRateLimitConfig } from "../lib/rate-limit.js";
import { getClientIp } from "../lib/media-proxy.js";
import { runYtDlp, YtDlpAbortedError, YtDlpProcessError } from "../lib/youtube/ytdlp.js";
import { validateFacebookUrl } from "../lib/validators/facebook-url.js";

const router = Router();
const RESOLVE_TIMEOUT_MS = 45_000;

function failure(code: string, message: string) {
  return { success: false, error: { code, message } };
}

function classify(stderr: string): { code: string; message: string; status: number } {
  const text = stderr.toLowerCase();
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
  const rateLimit = checkRateLimit(`facebook:${getClientIp(req)}`, routeRateLimitConfig("facebook"));
  if (!rateLimit.allowed) {
    res.setHeader("Retry-After", String(Math.ceil(rateLimit.retryAfterMs / 1000)));
    res.status(429).json(failure("FACEBOOK_RATE_LIMITED", "Too many Facebook requests. Please try again later."));
    return;
  }
  const checked = validateFacebookUrl(req.body?.url);
  if (!checked.valid || !checked.parsed) {
    res.status(400).json(failure("FACEBOOK_INVALID_URL", checked.error || "Invalid Facebook URL."));
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
    };
    if (!info.url || !/^https?:\/\//i.test(info.url)) {
      res.status(422).json(failure("FACEBOOK_NO_VIDEO", "Facebook did not provide a public downloadable video."));
      return;
    }
    logger.info("[FACEBOOK] resolved public video", { requestId, url: checked.parsed.normalized, mediaId: info.id || null });
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
    const stderr = error instanceof YtDlpProcessError ? error.stderr : error instanceof Error ? error.message : "unknown";
    const mapped = classify(stderr);
    logger.warn("[FACEBOOK] resolve failed", { requestId, category: mapped.code, stderr: stderr.slice(0, 2000) });
    if (!res.headersSent) res.status(mapped.status).json(failure(mapped.code, mapped.message));
  } finally {
    res.off("close", onClose);
  }
});

export default router;
