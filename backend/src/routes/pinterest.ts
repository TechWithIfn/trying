import { Router, Request, Response } from "express";
import { validatePinterestUrl } from "../lib/validators/pinterest-url.js";
import type { ParsedPinterestUrl } from "../lib/validators/pinterest-url.js";
import { resolvePinterestPin } from "../lib/pinterest/resolve.js";
import type { PinterestExpected } from "../lib/pinterest/resolve.js";
import { checkRateLimit, routeRateLimitConfig } from "../lib/rate-limit.js";
import { generateToken } from "../lib/crypto.js";
import { storeMedia } from "../lib/temp-store.js";
import { logger } from "../lib/logger.js";
import { AppError, createError, createErrorResponse, toAppError, withRequestDiagnostics } from "../lib/errors.js";
import { KeyedConcurrency } from "../lib/capacity.js";
import { getBuildVersion, readPositiveInt } from "../lib/env.js";
import { getClientIp } from "../lib/media-proxy.js";
import type { ResolveResponse, ResolveDiagnostics } from "../lib/types.js";

const router = Router();

/**
 * Pinterest resolution fetches and parses the pin page's server-rendered data
 * (no browser), so it is far cheaper than before — but it still has its own
 * admission budget plus a per-client cap. Lightweight URL validation runs for
 * everyone and stays cheap: the budget is only consumed after the URL parses.
 */
const pinterestRateConfig = routeRateLimitConfig("pinterest");
const perIpResolve = new KeyedConcurrency(readPositiveInt("MAX_CONCURRENT_RESOLVES_PER_IP", 2));

/**
 * Effective route timeout with a serverless safety margin: answer just under
 * the platform's function cap so the client receives our structured timeout
 * error instead of a platform 504 with no body. Never raises a configured
 * value. The HTTP resolver needs only a few seconds, so the default leaves a
 * wide margin below Vercel's function ceiling.
 */
function pinterestTimeoutMs(): number {
  const configured = readPositiveInt("PINTEREST_RESOLVER_TIMEOUT_MS", 25_000);
  if (process.env.VERCEL && configured > 55_000) return 55_000;
  return configured;
}

function requestDiagnostics(requestId: string, startTime: number): ResolveDiagnostics {
  return {
    requestId,
    build: getBuildVersion(),
    provider: "pinterest-http",
    totalDurationMs: Date.now() - startTime,
  };
}

/** Body/query `kind` → resolver expectation; unknown values fail closed. */
function parseKind(raw: unknown): PinterestExpected | null {
  if (raw === undefined || raw === null || raw === "") return "any";
  if (raw === "video" || raw === "image" || raw === "any") return raw;
  return null;
}

router.post("/resolve", async (req: Request, res: Response): Promise<void> => {
  const requestId = generateToken();
  const startTime = Date.now();
  res.setHeader("Cache-Control", "no-store");
  const fail = (status: number, code: Parameters<typeof createErrorResponse>[0]): void => {
    res.status(status).json(withRequestDiagnostics(createErrorResponse(code), requestDiagnostics(requestId, startTime)));
  };

  try {
    const contentLength = req.headers["content-length"];
    if (contentLength && parseInt(contentLength, 10) > 1024) {
      fail(413, "REQUEST_TOO_LARGE");
      return;
    }
    const contentTypeHeader = req.headers["content-type"];
    if (!contentTypeHeader || !contentTypeHeader.includes("application/json")) {
      fail(400, "VALIDATION_ERROR");
      return;
    }
    const body = req.body as { url?: unknown; kind?: unknown } | null;
    if (!body || typeof body !== "object" || !("url" in body)) {
      fail(400, "VALIDATION_ERROR");
      return;
    }
    if (typeof body.url !== "string") {
      fail(400, "VALIDATION_ERROR");
      return;
    }
    const kind = parseKind(body.kind);
    if (kind === null) {
      fail(400, "VALIDATION_ERROR");
      return;
    }

    logger.info("Request received", { requestId, url: body.url.slice(0, 100) });

    const ip = getClientIp(req);

    // Validation BEFORE rate limiting: cheap rejects never burn quota, and
    // the normalized URL is the cache/admission key.
    const validation = validatePinterestUrl(body.url);
    if (!validation.valid || !validation.parsed) {
      logger.info("URL validation failed", { requestId, error: validation.error });
      fail(400, "PINTEREST_INVALID_URL");
      return;
    }
    const parsed: ParsedPinterestUrl = validation.parsed;

    logger.info("URL validated", {
      requestId,
      pinId: parsed.pinId,
      isShortLink: parsed.isShortLink,
      kind,
    });

    const rateLimitResult = checkRateLimit(`pinterest-resolve:${ip}`, pinterestRateConfig);
    if (!rateLimitResult.allowed) {
      logger.warn("Rate limit exceeded", { requestId, ip });
      res.setHeader("Retry-After", String(Math.ceil(rateLimitResult.retryAfterMs / 1000)));
      fail(429, "RATE_LIMITED");
      return;
    }
    if (!perIpResolve.tryAcquire(ip)) {
      logger.warn("Resolve per-client limit reached", { requestId, ip });
      res.setHeader("Retry-After", "3");
      res.status(503).json(createErrorResponse("CAPACITY_EXHAUSTED"));
      return;
    }

    // A client that disconnects mid-resolve must stop the upstream fetch, so
    // this signal is propagated into the resolver chain. The listener is on
    // `res`, not `req`: `req` emits "close" as soon as a POST body has been
    // consumed, which would abort every request before it even started.
    const controller = new AbortController();
    const onClose = (): void => {
      if (!res.writableEnded) controller.abort();
    };
    res.on("close", onClose);

    try {
      const timeoutMs = pinterestTimeoutMs();
      const pending = resolvePinterestPin(parsed.normalized, kind, { signal: controller.signal, requestId });
      let gateWon = false;
      const timeoutGate = new Promise<never>((_, reject) => {
        const timer = setTimeout(() => {
          gateWon = true;
          reject(createError("RESOLVER_TIMEOUT"));
        }, timeoutMs);
        const cancel = () => clearTimeout(timer);
        pending.then(cancel, cancel);
      });
      // Observe a late outcome quietly (avoids unhandled-rejection noise).
      pending.then(
        (late) => {
          if (gateWon) {
            logger.info("Late resolve settled after route timeout", { requestId, mediaCount: late.media.length });
          }
        },
        (lateErr) => {
          if (gateWon) {
            logger.warn("Late resolve failed after route timeout", {
              requestId,
              error: lateErr instanceof Error ? lateErr.message : "unknown",
            });
          }
        }
      );
      const result = await Promise.race([pending, timeoutGate]);

      const mediaId = generateToken();
      storeMedia(mediaId, result.media, result.type);

      const duration = Date.now() - startTime;
      logger.info("Resolution complete", {
        requestId,
        duration,
        kind,
        mediaCount: result.media.length,
        finalResult: result.type,
        mediaId,
      });

      const response: ResolveResponse = {
        success: true,
        data: {
          ...result,
          sourceUrl: parsed.normalized,
          mediaId,
          startIndex: null,
        },
      };
      res.setHeader("X-Request-Id", requestId);
      res.setHeader("X-RateLimit-Remaining", String(rateLimitResult.remaining));
      res.json(response);
    } catch (error) {
      if (res.headersSent) {
        res.destroy();
        return;
      }
      if (error instanceof AppError) {
        if (error.statusCode === 503) res.setHeader("Retry-After", "3");
        res.status(error.statusCode).json(withRequestDiagnostics(error.toResponse(), requestDiagnostics(requestId, startTime)));
        return;
      }
      const mapped = toAppError(error, "TEMPORARY_ERROR");
      res.status(mapped.statusCode).json(withRequestDiagnostics(mapped.toResponse(), requestDiagnostics(requestId, startTime)));
    } finally {
      res.off("close", onClose);
      perIpResolve.release(ip);
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    if (error instanceof AppError) {
      logger.warn("Pinterest resolver error", { requestId, code: error.code, message: error.message, duration });
      res.status(error.statusCode).json(withRequestDiagnostics(error.toResponse(), requestDiagnostics(requestId, startTime)));
      return;
    }
    const mapped = toAppError(error, "TEMPORARY_ERROR");
    logger.error("Unexpected Pinterest error", {
      requestId,
      duration,
      errorName: error instanceof Error ? error.name : "Unknown",
      errorMessage: error instanceof Error ? error.message : "unknown",
      errorCode: mapped.code,
    });
    res.status(mapped.statusCode).json(withRequestDiagnostics(mapped.toResponse(), requestDiagnostics(requestId, startTime)));
  }
});

/**
 * GET /api/pinterest/resolve/stream?url=<pinterest-url>&kind=video|image
 *
 * Server-Sent Events endpoint reporting REAL resolution stages as they
 * complete, then delivering the normalized media result. No timers, no fake
 * percentages. The request deadline owns the whole operation: on expiry the
 * resolver job is aborted (upstream fetch cancelled) and exactly one
 * STREAM_TIMEOUT error is sent. Client disconnect aborts the same way. A heartbeat
 * keeps idle streams alive through intermediaries.
 *
 * Events:
 *   progress  { progress: 0-99, stage: string }
 *   complete  { progress: 100, stage: "Media ready!", data: ResolvedMedia }
 *   error     { code, message, retryable }
 */
router.get("/resolve/stream", async (req: Request, res: Response): Promise<void> => {
  const requestId = generateToken();
  const startTime = Date.now();
  let settled = false;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("X-Request-Id", requestId);
  res.flushHeaders();

  const send = (event: string, data: unknown): void => {
    if (settled || res.writableEnded) return;
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const finish = (): void => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    clearInterval(heartbeat);
    try {
      res.end();
    } catch {
      /* client already gone */
    }
  };

  const failEvent = (code: Parameters<typeof createErrorResponse>[0]): void => {
    send("error", withRequestDiagnostics(createErrorResponse(code), requestDiagnostics(requestId, startTime)).error);
  };

  const sendError = (error: unknown): void => {
    if (error instanceof AppError) {
      logger.warn("Pinterest stream error", {
        requestId,
        code: error.code,
        duration: Date.now() - startTime,
      });
      send("error", withRequestDiagnostics(error.toResponse(), requestDiagnostics(requestId, startTime)).error);
    } else {
      const mapped = toAppError(error, "TEMPORARY_ERROR");
      logger.error("Pinterest stream unexpected error", {
        requestId,
        duration: Date.now() - startTime,
        errorCode: mapped.code,
        error: error instanceof Error ? error.message : "unknown",
      });
      send("error", withRequestDiagnostics(mapped.toResponse(), requestDiagnostics(requestId, startTime)).error);
    }
    finish();
  };

  const timeoutMs = pinterestTimeoutMs();
  const timer = setTimeout(() => {
    if (settled) return;
    logger.warn("Pinterest stream timeout", { requestId, timeoutMs });
    controller.abort();
    send("error", createErrorResponse("STREAM_TIMEOUT").error);
    finish();
  }, timeoutMs);

  // Idle-stream heartbeat: SSE comment frames are ignored by EventSource but
  // reset idle timers on proxies/serverless frontends.
  const heartbeat = setInterval(() => {
    if (settled || res.writableEnded) return;
    try {
      res.write(": ping\n\n");
    } catch {
      /* closed underneath us; the close handler owns cleanup */
    }
  }, 10_000);
  heartbeat.unref?.();

  // The SSE connection is a long-lived client: on disconnect the resolver
  // work must stop (and its upstream fetch be cancelled) instead of running unseen.
  const controller = new AbortController();
  req.on("close", () => {
    if (!settled) {
      settled = true;
      clearTimeout(timer);
      clearInterval(heartbeat);
      controller.abort();
      logger.info("Pinterest stream client disconnected", { requestId });
    }
  });

  const ip = getClientIp(req);
  let admitted = false;
  try {
    const rawUrl = req.query.url;
    send("progress", { progress: 0, stage: "Request accepted" });

    if (typeof rawUrl !== "string" || rawUrl.length === 0) {
      failEvent("VALIDATION_ERROR");
      finish();
      return;
    }

    const kind = parseKind(req.query.kind);
    if (kind === null) {
      failEvent("VALIDATION_ERROR");
      finish();
      return;
    }

    const validation = validatePinterestUrl(rawUrl);
    if (!validation.valid || !validation.parsed) {
      logger.info("URL validation failed", { requestId, error: validation.error });
      failEvent("PINTEREST_INVALID_URL");
      finish();
      return;
    }

    const rateLimitResult = checkRateLimit(`pinterest-resolve:${ip}`, pinterestRateConfig);
    if (!rateLimitResult.allowed) {
      logger.warn("Rate limit exceeded", { requestId, ip });
      failEvent("RATE_LIMITED");
      finish();
      return;
    }
    admitted = perIpResolve.tryAcquire(ip);
    if (!admitted) {
      logger.warn("Pinterest stream per-client limit reached", { requestId, ip });
      failEvent("CAPACITY_EXHAUSTED");
      finish();
      return;
    }
    send("progress", { progress: 10, stage: "Link validated" });

    // Monotonic per-request progress: stage text may legitimately repeat a
    // value, but must never move backwards on one stream.
    let lastProgress = 0;
    const emitProgress = (progress: number, stage: string): void => {
      if (progress <= lastProgress) return;
      lastProgress = progress;
      send("progress", { progress, stage });
    };

    const result = await resolvePinterestPin(
      validation.parsed.normalized,
      kind,
      { signal: controller.signal, requestId },
      emitProgress
    );
    if (settled) return;

    const mediaId = generateToken();
    storeMedia(mediaId, result.media, result.type);

    const duration = Date.now() - startTime;
    logger.info("Resolution complete", {
      requestId,
      duration,
      kind,
      mediaCount: result.media.length,
      finalResult: result.type,
      mediaId,
    });

    const data = {
      ...result,
      sourceUrl: validation.parsed.normalized,
      mediaId,
      startIndex: null,
    };
    send("complete", { progress: 100, stage: "Media ready!", data });
    finish();
  } catch (error) {
    if (settled) return;
    sendError(error);
  } finally {
    if (admitted) perIpResolve.release(ip);
  }
});

export default router;
