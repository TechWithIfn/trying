import { Router, Request, Response } from "express";
import { createReadStream } from "fs";
import { pipeline } from "stream/promises";
import { validateYouTubeUrl } from "../lib/validators/youtube-url.js";
import {
  classifyYtDlpFailure,
  invalidateYouTubeProbe,
  probeYouTube,
  selectionForQuality,
  toResolveData,
  type YouTubeProbe,
  type YouTubeSelection,
} from "../lib/youtube/resolve.js";
import {
  downloadYouTubeFile,
  safeRemoveDir,
  type YouTubeDownloadFormat,
} from "../lib/youtube/download.js";
import {
  isYouTubeAudioFormat,
  parseYouTubeAudioOption,
  type YouTubeAudioOption,
} from "../lib/youtube/audio.js";
import { checkRateLimit, routeRateLimitConfig } from "../lib/rate-limit.js";
import { generateToken } from "../lib/crypto.js";
import { getGate, KeyedConcurrency } from "../lib/capacity.js";
import { getBuildVersion, readBoundedInt, readPositiveInt } from "../lib/env.js";
import { getClientIp } from "../lib/media-proxy.js";
import { logger } from "../lib/logger.js";
import {
  AppError,
  createError,
  createErrorResponse,
  isNetworkError,
  isTimeoutError,
  withRequestDiagnostics,
} from "../lib/errors.js";
import { contentDispositionAttachment, sanitizeFilenameBase } from "../lib/download-filename.js";
import type { ResolveDiagnostics } from "../lib/types.js";

const router = Router();

const youtubeResolveGate = getGate("youtubeResolve");
const youtubeGate = getGate("youtube");
const ffmpegGate = getGate("ffmpeg");
const youtubeRateConfig = routeRateLimitConfig("youtube");
const perIpResolve = new KeyedConcurrency(
  readBoundedInt("MAX_CONCURRENT_YOUTUBE_RESOLVES_PER_IP", 2, 1, 8)
);
const perIpDownload = new KeyedConcurrency(
  readBoundedInt("MAX_CONCURRENT_YOUTUBE_DOWNLOADS_PER_IP", 1, 1, 4)
);

function resolveTimeoutMs(): number {
  const configured = readPositiveInt("YOUTUBE_RESOLVE_TIMEOUT_MS", 30_000);
  if (process.env.VERCEL) return Math.min(configured, 50_000);
  return configured;
}

function downloadTimeoutMs(): number {
  const configured = readPositiveInt("YOUTUBE_DOWNLOAD_TIMEOUT_MS", 5 * 60_000);
  if (process.env.VERCEL) return Math.min(configured, 55_000);
  return configured;
}

function requestDiagnostics(requestId: string, startTime: number, extra?: ResolveDiagnostics): ResolveDiagnostics {
  return {
    requestId,
    build: getBuildVersion(),
    provider: "youtube-yt-dlp",
    totalDurationMs: Date.now() - startTime,
    ...extra,
  };
}

function toYouTubeAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (isTimeoutError(error)) return createError("YOUTUBE_TIMEOUT");
  if (isNetworkError(error)) return createError("YOUTUBE_UPSTREAM_ERROR");
  return createError("YOUTUBE_UPSTREAM_ERROR");
}

function sendError(
  res: Response,
  error: unknown,
  requestId: string,
  startTime: number,
  requestPath: string
): void {
  const appError = error instanceof AppError ? error : toYouTubeAppError(error);
  if (res.headersSent) {
    res.destroy();
    return;
  }
  if (appError.statusCode === 503) res.setHeader("Retry-After", "5");
  logger.warn("[YOUTUBE] request failed", {
    requestId,
    path: requestPath,
    code: appError.code,
    status: appError.statusCode,
    duration: Date.now() - startTime,
  });
  res
    .status(appError.statusCode)
    .json(withRequestDiagnostics(appError.toResponse(), requestDiagnostics(requestId, startTime)));
}

/* -------------------------------------------------------------------------- */
/* POST /api/youtube/resolve                                                   */
/* -------------------------------------------------------------------------- */

router.post("/resolve", async (req: Request, res: Response): Promise<void> => {
  const requestId = generateToken();
  const startTime = Date.now();
  res.setHeader("Cache-Control", "no-store");

  if (!req.is("application/json")) {
    res.status(400).json(withRequestDiagnostics(createErrorResponse("VALIDATION_ERROR"), requestDiagnostics(requestId, startTime)));
    return;
  }
  const contentLength = req.headers["content-length"];
  if (contentLength && parseInt(contentLength, 10) > 2048) {
    res.status(413).json(withRequestDiagnostics(createErrorResponse("REQUEST_TOO_LARGE"), requestDiagnostics(requestId, startTime)));
    return;
  }
  const body = req.body as { url?: unknown } | null;
  if (!body || typeof body !== "object" || typeof body.url !== "string") {
    res.status(400).json(withRequestDiagnostics(createErrorResponse("VALIDATION_ERROR"), requestDiagnostics(requestId, startTime)));
    return;
  }

  const validation = validateYouTubeUrl(body.url);
  if (!validation.valid || !validation.parsed) {
    res.status(400).json(withRequestDiagnostics(createErrorResponse("YOUTUBE_INVALID_URL"), requestDiagnostics(requestId, startTime)));
    return;
  }
  const parsed = validation.parsed;

  const ip = getClientIp(req);
  const rate = checkRateLimit(`youtube:${ip}`, youtubeRateConfig);
  if (!rate.allowed) {
    res.setHeader("Retry-After", String(Math.ceil(rate.retryAfterMs / 1000)));
    res.status(429).json(withRequestDiagnostics(createErrorResponse("RATE_LIMITED"), requestDiagnostics(requestId, startTime)));
    return;
  }

  let admitted = false;
  let lease: Awaited<ReturnType<typeof youtubeResolveGate.acquire>> | null = null;
  const controller = new AbortController();
  const onClose = (): void => {
    if (!res.writableEnded) controller.abort();
  };
  res.on("close", onClose);

  try {
    admitted = perIpResolve.tryAcquire(ip);
    if (!admitted) {
      res.setHeader("Retry-After", "3");
      res.status(503).json(withRequestDiagnostics(createErrorResponse("CAPACITY_EXHAUSTED"), requestDiagnostics(requestId, startTime)));
      return;
    }

    lease = await youtubeResolveGate.acquire({ signal: controller.signal, waitMs: 8_000 });
    logger.info("[YOUTUBE] resolve started", { requestId, videoId: parsed.videoId });

    const probe = await probeYouTube(parsed, {
      signal: controller.signal,
      timeoutMs: resolveTimeoutMs(),
      requestId,
    });
    if (res.destroyed) return;

    res.setHeader("X-Request-Id", requestId);
    res.setHeader("X-RateLimit-Remaining", String(rate.remaining));
    res.json({ success: true, data: toResolveData(probe) });
  } catch (error) {
    if (res.destroyed) return;
    sendError(res, error, requestId, startTime, "/api/youtube/resolve");
  } finally {
    res.off("close", onClose);
    lease?.release();
    if (admitted) perIpResolve.release(ip);
  }
});

/* -------------------------------------------------------------------------- */
/* GET /api/youtube/download?url=…&quality=1080&format=mp4|mp3|m4a             */
/* -------------------------------------------------------------------------- */

const ALLOWED_FORMATS = new Set<YouTubeDownloadFormat>(["mp4", "mp3", "m4a"]);

function parseFormat(raw: unknown): YouTubeDownloadFormat | null {
  return typeof raw === "string" && ALLOWED_FORMATS.has(raw as YouTubeDownloadFormat)
    ? (raw as YouTubeDownloadFormat)
    : null;
}

function parseQuality(raw: unknown): number | null {
  if (typeof raw !== "string" || !/^\d{2,4}$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value >= 144 && value <= 4320 ? value : null;
}

router.get("/download", async (req: Request, res: Response): Promise<void> => {
  const requestId = generateToken();
  const startTime = Date.now();
  res.setHeader("Cache-Control", "no-store");

  const rawUrl = req.query.url;
  if (typeof rawUrl !== "string" || rawUrl.length === 0) {
    res.status(400).json(withRequestDiagnostics(createErrorResponse("VALIDATION_ERROR"), requestDiagnostics(requestId, startTime)));
    return;
  }
  const validation = validateYouTubeUrl(rawUrl);
  if (!validation.valid || !validation.parsed) {
    res.status(400).json(withRequestDiagnostics(createErrorResponse("YOUTUBE_INVALID_URL"), requestDiagnostics(requestId, startTime)));
    return;
  }
  const parsed = validation.parsed;

  const format = parseFormat(req.query.format);
  if (!format) {
    res.status(400).json(withRequestDiagnostics(createErrorResponse("VALIDATION_ERROR"), requestDiagnostics(requestId, startTime)));
    return;
  }
  const requestedQuality = format === "mp4" ? parseQuality(req.query.quality) : null;
  if (format === "mp4" && requestedQuality === null) {
    res.status(400).json(withRequestDiagnostics(createErrorResponse("VALIDATION_ERROR"), requestDiagnostics(requestId, startTime)));
    return;
  }
  let audioOption: YouTubeAudioOption | null = null;
  if (isYouTubeAudioFormat(format)) {
    audioOption = parseYouTubeAudioOption(format, req.query.bitrate);
    if (!audioOption) {
      res.status(400).json(withRequestDiagnostics(createErrorResponse("VALIDATION_ERROR"), requestDiagnostics(requestId, startTime)));
      return;
    }
  }

  const ip = getClientIp(req);
  const rate = checkRateLimit(`youtube:${ip}`, youtubeRateConfig);
  if (!rate.allowed) {
    res.setHeader("Retry-After", String(Math.ceil(rate.retryAfterMs / 1000)));
    res.status(429).json(withRequestDiagnostics(createErrorResponse("RATE_LIMITED"), requestDiagnostics(requestId, startTime)));
    return;
  }

  let admitted = false;
  let youtubeLease: Awaited<ReturnType<typeof youtubeGate.acquire>> | null = null;
  let ffmpegLease: Awaited<ReturnType<typeof ffmpegGate.acquire>> | null = null;
  let tempDir: string | null = null;

  const controller = new AbortController();
  const onClose = (): void => {
    if (!res.writableEnded) controller.abort();
  };
  res.on("close", onClose);

  try {
    admitted = perIpDownload.tryAcquire(ip);
    if (!admitted) {
      res.setHeader("Retry-After", "3");
      res.status(503).json(withRequestDiagnostics(createErrorResponse("CAPACITY_EXHAUSTED"), requestDiagnostics(requestId, startTime)));
      return;
    }

    youtubeLease = await youtubeGate.acquire({ signal: controller.signal, waitMs: 10_000 });

    let probe = await probeYouTube(parsed, {
      signal: controller.signal,
      timeoutMs: resolveTimeoutMs(),
      requestId,
    });

    let selection: YouTubeSelection | undefined;
    if (format === "mp4") {
      selection = selectionForQuality(probe, requestedQuality as number);
    } else if (!probe.audioAvailable) {
      throw createError("YOUTUBE_AUDIO_UNAVAILABLE");
    }

    ffmpegLease = await ffmpegGate.acquire({ signal: controller.signal, waitMs: 10_000 });

    logger.info("[YOUTUBE] download started", {
      requestId,
      videoId: probe.videoId,
      format,
      audioBitrate: audioOption?.bitrateKbps ?? null,
      height: selection?.height ?? null,
    });

    const prepare = async (): Promise<Awaited<ReturnType<typeof downloadYouTubeFile>>> =>
      downloadYouTubeFile({
        probe,
        format,
        selection,
        audioBitrate: audioOption?.bitrateKbps,
        timeoutMs: downloadTimeoutMs(),
        signal: controller.signal,
        requestId,
      });

    let file: Awaited<ReturnType<typeof downloadYouTubeFile>>;
    try {
      file = await prepare();
    } catch (error) {
      // A cached probe can outlive a rendition change. Retry once with fresh
      // metadata before telling the user the quality is gone.
      if (
        error instanceof AppError &&
        error.code === "YOUTUBE_QUALITY_UNAVAILABLE" &&
        format === "mp4"
      ) {
        invalidateYouTubeProbe(parsed.normalized);
        probe = await probeYouTube(parsed, {
          signal: controller.signal,
          timeoutMs: resolveTimeoutMs(),
          requestId,
          fresh: true,
        });
        selection = selectionForQuality(probe, requestedQuality as number);
        file = await prepare();
      } else {
        throw error;
      }
    }
    tempDir = file.tempDir;
    if (res.destroyed) return;

    const extension = format === "mp4" ? ".mp4" : `.${format}`;
    const filename = sanitizeFilenameBase(`Downloadit ${probe.title}`) + extension;
    res.setHeader(
      "Content-Type",
      format === "mp4" ? "video/mp4" : format === "m4a" ? "audio/mp4" : "audio/mpeg"
    );
    res.setHeader("Content-Length", String(file.sizeBytes));
    res.setHeader("Content-Disposition", contentDispositionAttachment(filename));
    res.setHeader("Accept-Ranges", "none");
    res.setHeader("X-Request-Id", requestId);
    res.setHeader("X-RateLimit-Remaining", String(rate.remaining));

    await pipeline(createReadStream(file.filePath), res);
  } catch (error) {
    if (res.destroyed) return;
    if (res.headersSent) {
      logger.warn("[YOUTUBE] stream failed after headers", {
        requestId,
        error: error instanceof Error ? error.message : "unknown",
      });
      res.destroy();
      return;
    }
    if (error instanceof AppError) {
      sendError(res, error, requestId, startTime, "/api/youtube/download");
      return;
    }
    const mapped = classifyYtDlpFailure(error, "download", requestId, parsed.videoId);
    sendError(res, mapped, requestId, startTime, "/api/youtube/download");
  } finally {
    res.off("close", onClose);
    ffmpegLease?.release();
    youtubeLease?.release();
    if (admitted) perIpDownload.release(ip);
    if (tempDir) await safeRemoveDir(tempDir, requestId);
  }
});

export default router;
