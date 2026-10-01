import { Router, Request, Response } from "express";
import { validateInstagramUrl } from "../lib/validators/instagram-url.js";
import type { ParsedInstagramUrl } from "../lib/validators/instagram-url.js";
import { resolveUrl, getActiveProviderName, isResolutionInFlight } from "../lib/resolvers/index.js";
import { checkRateLimit, peekRateLimit } from "../lib/rate-limit.js";
import { generateToken } from "../lib/crypto.js";
import { storeMedia } from "../lib/temp-store.js";
import { logger } from "../lib/logger.js";
import { AppError, createError, createErrorResponse, toAppError, withRequestDiagnostics } from "../lib/errors.js";
import { KeyedConcurrency, getGate } from "../lib/capacity.js";
import { getBuildVersion, readBoundedInt, readPositiveInt } from "../lib/env.js";
import { getClientIp } from "../lib/media-proxy.js";
import type { ResolveResponse, ResolveErrorResponse } from "../lib/types.js";

const router = Router();

/**
 * Resolution is the expensive step (browser work), so it has a dedicated
 * admission budget plus a per-client cap. Lightweight validation still runs
 * for everyone and stays cheap: the gate is only entered after the URL parses.
 */
const resolveGate = getGate("resolve");
const perIpResolve = new KeyedConcurrency(readBoundedInt("MAX_CONCURRENT_RESOLVES_PER_IP", 2, 1, 16));

/**
 * Request-level diagnostics merged into every resolve error response:
 * requestId/build/provider/duration. Provider stage fields (if any) are
 * preserved — this only fills in request scope. Scalars only, no secrets.
 */
function requestDiagnostics(requestId: string, startTime: number): import("../lib/types.js").ResolveDiagnostics {
  // Diagnostics must never break the response path: provider lookup can throw
  // when no provider was ever instantiated (e.g. validation rejects before
  // any resolve), so fall back to the configured name.
  let provider: string;
  try {
    provider = getActiveProviderName();
  } catch {
    provider = process.env.RESOLVER_PROVIDER || "placeholder";
  }
  return {
    requestId,
    build: getBuildVersion(),
    provider,
    totalDurationMs: Date.now() - startTime,
  };
}

/**
 * Upstream backoff Instagram asked for (seconds), when the provider captured
 * one from a genuine 429's `Retry-After` header. Null when absent — callers
 * fall back to a conservative static value.
 */
function upstreamRetryAfterSeconds(error: AppError): number | null {
  const value = error.details?.upstreamRetryAfterSeconds;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return Math.min(Math.ceil(value), 300);
}

/** [Downloadit Media Debug] first-item type + hostname only (never query/tokens). */
function firstMediaDiag(media: { type: string; url: string }[]): {
  firstMediaType: string | null;
  firstMediaHost: string | null;
} {
  const first = media[0];
  if (!first) return { firstMediaType: null, firstMediaHost: null };
  let host: string | null = null;
  try {
    host = new URL(first.url).hostname;
  } catch {
    host = null;
  }
  return { firstMediaType: first.type, firstMediaHost: host };
}

router.post("/", async (req: Request, res: Response): Promise<void> => {
  const requestId = generateToken();
  const startTime = Date.now();
  // Every error below carries request diagnostics so production failures are
  // traceable without log access. Provider stage fields (when present) win.
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
    if (
      !contentTypeHeader ||
      !contentTypeHeader.includes("application/json")
    ) {
      fail(400, "VALIDATION_ERROR");
      return;
    }

    const body = req.body;
    if (!body || typeof body !== "object" || !("url" in body)) {
      fail(400, "VALIDATION_ERROR");
      return;
    }

    const { url, refresh } = body as { url: unknown; refresh?: unknown };
    if (typeof url !== "string") {
      fail(400, "VALIDATION_ERROR");
      return;
    }
    // Stale-media recovery: the preview layer detected an expired signed CDN
    // URL (backend answered 410 MEDIA_URL_EXPIRED) and asks for exactly one
    // freshly resolved result. Unknown shapes are ignored (treated as false)
    // so this flag can never disable caching by accident.
    const refreshRequested = refresh === true;

    logger.info("Request received", { requestId, url: url.slice(0, 100) });

    const ip = getClientIp(req);

    // Validation runs BEFORE rate limiting: cheap rejects (malformed URLs)
    // must never burn quota, and the normalized URL is needed to tell a
    // duplicate submit (joins in-flight work, costs nothing) from new work.
    const validation = validateInstagramUrl(url);
    if (!validation.valid || !validation.parsed) {
      logger.info("URL validation failed", {
        requestId,
        error: validation.error,
      });
      fail(400, "INVALID_URL");
      return;
    }
    // Bind the narrowed value: property narrowing does not survive into the
    // gate callback below.
    const parsed = validation.parsed;

    logger.info("URL validated", {
      requestId,
      contentType: validation.parsed.contentType,
      shortcode: validation.parsed.shortcode,
      storyUsername: validation.parsed.storyUsername,
      storyId: validation.parsed.storyId,
    });

    // Admission happens AFTER validation so cheap rejects are never throttled,
    // and BEFORE any provider/browser work. A request that will merely join an
    // in-flight resolution for the same URL consumes no quota and no per-IP
    // slot: it starts no additional Instagram request (the SSE→POST fallback
    // for one user action coalesces here instead of doubling upstream load).
    const joiningInflight = isResolutionInFlight(parsed.normalized);
    let rateLimitRemaining: number;
    if (joiningInflight) {
      rateLimitRemaining = peekRateLimit(`resolve:${ip}`).remaining;
    } else {
      const rateLimitResult = checkRateLimit(`resolve:${ip}`);
      if (!rateLimitResult.allowed) {
        logger.warn("Rate limit exceeded", { requestId, ip });
        res.setHeader("Retry-After", String(Math.ceil(rateLimitResult.retryAfterMs / 1000)));
        fail(429, "RATE_LIMITED");
        return;
      }
      rateLimitRemaining = rateLimitResult.remaining;
    }
    if (!joiningInflight && !perIpResolve.tryAcquire(ip)) {
      logger.warn("Resolve per-client limit reached", { requestId, ip });
      res.setHeader("Retry-After", "3");
      res.status(503).json(createErrorResponse("CAPACITY_EXHAUSTED"));
      return;
    }
    const counted = !joiningInflight;

    // A client that disconnects mid-resolve must release its browser page, so
    // this signal is propagated into the provider chain. The listener is on
    // `res`, not `req`: `req` emits "close" as soon as a POST body has been
    // consumed, which would abort every request before it even started.
    const controller = new AbortController();
    const onClose = (): void => {
      if (!res.writableEnded) controller.abort();
    };
    res.on("close", onClose);

    try {
      await resolveGate.run(
        () =>
          performResolve(
            req,
            res,
            requestId,
            startTime,
            ip,
            rateLimitRemaining,
            parsed,
            controller.signal,
            { bypassCache: refreshRequested }
          ),
        { signal: controller.signal }
      );
    } catch (error) {
      if (res.headersSent) {
        res.destroy();
        return;
      }
      if (error instanceof AppError) {
        if (error.statusCode === 503) res.setHeader("Retry-After", "3");
        if (error.code === "INSTAGRAM_RATE_LIMITED" || error.code === "PROVIDER_RATE_LIMITED") {
          // Genuine upstream throttling: answer with the backoff Instagram
          // asked for when it sent one, so the client backs off instead of
          // hammering. This header is set ONLY for real upstream 429s — never
          // for our own quota (handled above) or other failures.
          res.setHeader("Retry-After", String(upstreamRetryAfterSeconds(error) ?? 30));
        }
        res.status(error.statusCode).json(withRequestDiagnostics(error.toResponse(), requestDiagnostics(requestId, startTime)));
        return;
      }
      const mapped = toAppError(error, "TEMPORARY_ERROR");
      res.status(mapped.statusCode).json(withRequestDiagnostics(mapped.toResponse(), requestDiagnostics(requestId, startTime)));
    } finally {
      res.off("close", onClose);
      if (counted) perIpResolve.release(ip);
    }
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error instanceof AppError) {
      logger.warn("Resolver error", {
        requestId,
        code: error.code,
        message: error.message,
        duration,
      });
      const response: ResolveResponse = withRequestDiagnostics(error.toResponse(), requestDiagnostics(requestId, startTime));
      if (process.env.NODE_ENV === "development") {
        (response as ResolveErrorResponse & { _debug?: string })._debug = `[${error.code}] ${error.message}`;
      }
      res.status(error.statusCode).json(response);
      return;
    }

    const errName = error instanceof Error ? error.name : "Unknown";
    const errMsg = error instanceof Error ? error.message : "unknown";
    const errStack = error instanceof Error ? error.stack?.split("\n").slice(0, 4).join(" | ") : "";
    // Known library failures (dead browser socket, upstream timeout, DNS
    // failure, ...) are mapped to an honest code. Only genuinely unknown
    // errors keep the generic TEMPORARY_ERROR response.
    const mapped = toAppError(error, "TEMPORARY_ERROR");

    logger.error("Unexpected error", {
      requestId,
      duration,
      errorName: errName,
      errorMessage: errMsg,
      errorCode: mapped.code,
      errorStack: errStack,
    });

    const errorResponse = withRequestDiagnostics(mapped.toResponse(), requestDiagnostics(requestId, startTime));
    if (process.env.NODE_ENV === "development") {
      (errorResponse as ResolveErrorResponse & { _debug?: string })._debug = `${errName}: ${errMsg}`;
    }
    res.status(mapped.statusCode).json(errorResponse);
  }
});

async function performResolve(
  req: Request,
  res: Response,
  requestId: string,
  startTime: number,
  ip: string,
  rateLimitRemaining: number,
  parsed: ParsedInstagramUrl,
  signal: AbortSignal,
  opts?: { bypassCache?: boolean }
): Promise<void> {
  // Route-level timeout (mirrors the SSE stream guard): a hung provider
  // fails fast with 504 while the in-flight work keeps running and warms
  // the cache — so the same URL can be retried immediately and the retry
  // is served from cache instead of hanging again. The provider now has its
  // own hard deadline, so "keeps running" can never mean "runs forever".
  const timeoutMs = readPositiveInt("RESOLVER_TIMEOUT_MS", 15_000);
  if (opts?.bypassCache) {
    logger.info("Refresh resolve requested (stale CDN URL recovery)", { requestId });
  }
  const pending = resolveUrl(parsed.normalized, undefined, { signal, bypassCache: opts?.bypassCache, requestId });
  let gateWon = false;
  const timeoutGate = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => {
      gateWon = true;
      reject(createError("RESOLVER_TIMEOUT"));
    }, timeoutMs);
    const cancel = () => clearTimeout(timer);
    pending.then(cancel, cancel);
  });
  // Observe a late outcome for cache-warming visibility (and to avoid
  // unhandled-rejection noise); quiet on the fast path.
  pending.then(
    (late) => {
      if (gateWon) {
        logger.info("Late resolve settled after route timeout (cache warmed)", {
          requestId,
          mediaCount: late.media.length,
        });
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
    detectedType: parsed.contentType,
    audioId: parsed.audioId,
    provider: getActiveProviderName(),
    mediaCount: result.media.length,
    failedItems: 0,
    finalResult: result.type,
    mediaId,
    ...firstMediaDiag(result.media),
  });

  const response: ResolveResponse = {
    success: true,
    data: {
      ...result,
      sourceUrl: parsed.normalized,
      mediaId,
      startIndex: parsed.slideIndex,
    },
  };

  res.setHeader("X-Request-Id", requestId);
  res.setHeader("X-RateLimit-Remaining", String(rateLimitRemaining));
  res.json(response);
}

/**
 * GET /api/resolve/stream?url=<instagram-url>
 *
 * Server-Sent Events endpoint that reports REAL resolution stages as they
 * complete, then delivers the normalized media result. No timers, no fake
 * percentages: every `progress` event is emitted only after the
 * corresponding backend stage has actually finished.
 *
 * Lifecycle: the request deadline (RESOLVER_TIMEOUT_MS) owns the whole
 * operation — on expiry the resolver job is aborted (pool slot, provider
 * work, browser page) and exactly one STREAM_TIMEOUT error is sent. Client
 * disconnect aborts the same way. A comment heartbeat keeps idle streams
 * alive through intermediaries. No resolver work outlives this response.
 *
 * Events:
 *   progress  { progress: 0-99, stage: string }
 *   complete  { progress: 100, stage: "Media ready!", data: ResolvedMedia }
 *   error     { code, message, retryable }
 */
router.get("/stream", async (req: Request, res: Response): Promise<void> => {
  const requestId = generateToken();
  const startTime = Date.now();
  let settled = false;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
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

  const sendError = (error: unknown): void => {
    if (error instanceof AppError) {
      logger.warn("Resolve stream error", {
        requestId,
        code: error.code,
        duration: Date.now() - startTime,
      });
      send("error", withRequestDiagnostics(error.toResponse(), requestDiagnostics(requestId, startTime)).error);
    } else {
      // Map known library failures to their real code; the raw cause stays
      // in the log so an unknown failure is still diagnosable server-side.
      const mapped = toAppError(error, "TEMPORARY_ERROR");
      logger.error("Resolve stream unexpected error", {
        requestId,
        duration: Date.now() - startTime,
        errorCode: mapped.code,
        error: error instanceof Error ? error.message : "unknown",
      });
      send("error", withRequestDiagnostics(mapped.toResponse(), requestDiagnostics(requestId, startTime)).error);
    }
    finish();
  };

  // Same safe parser as the POST route: a malformed env value must fall back
  // to 15s, never NaN (setTimeout(NaN) fires immediately and breaks all SSE).
  const timeoutMs = readPositiveInt("RESOLVER_TIMEOUT_MS", 15_000);
  const timer = setTimeout(() => {
    if (settled) return;
    logger.warn("Resolve stream timeout", { requestId, timeoutMs });
    // The request deadline owns the whole operation: abort the resolver job
    // (pool slot, provider work, browser page) so nothing outlives this
    // response, then answer once with the stream-specific timeout code.
    controller.abort();
    send("error", createErrorResponse("STREAM_TIMEOUT").error);
    finish();
  }, timeoutMs);

  // Idle-stream heartbeat: SSE comment frames are ignored by EventSource but
  // reset idle timers on proxies/serverless frontends, so a quiet browser
  // phase is never mistaken for a dead connection ("could not reach the
  // server"). Carries no stage — the frontend silence watchdog is unaffected.
  const heartbeat = setInterval(() => {
    if (settled || res.writableEnded) return;
    try {
      res.write(": ping\n\n");
    } catch {
      /* closed underneath us; the close handler owns cleanup */
    }
  }, 10_000);
  // A heartbeat must never keep the process alive on its own.
  heartbeat.unref?.();

  // The SSE connection is a long-lived client: on disconnect the provider work
  // must stop (and its browser page be freed) instead of running unseen.
  const controller = new AbortController();
  req.on("close", () => {
    if (!settled) {
      settled = true;
      clearTimeout(timer);
      controller.abort();
      logger.info("Resolve stream client disconnected", { requestId });
    }
  });

  const ip = getClientIp(req);
  /** True only when this request actually holds a per-client slot. */
  let admitted = false;
  // Same request diagnostics as POST, on the SSE error events.
  const failEvent = (code: Parameters<typeof createErrorResponse>[0]): void => {
    send("error", withRequestDiagnostics(createErrorResponse(code), requestDiagnostics(requestId, startTime)).error);
  };
  try {
    const rawUrl = req.query.url;
    send("progress", { progress: 5, stage: "Request received" });

    if (typeof rawUrl !== "string" || rawUrl.length === 0) {
      failEvent("VALIDATION_ERROR");
      finish();
      return;
    }

    // Validation first (cheap rejects never burn quota), then the duplicate
    // check: joining an in-flight resolution costs no extra provider/browser
    // work, so it consumes neither quota nor a per-client slot.
    const validation = validateInstagramUrl(rawUrl);
    if (!validation.valid || !validation.parsed) {
      logger.info("URL validation failed", {
        requestId,
        error: validation.error,
      });
      failEvent("INVALID_URL");
      finish();
      return;
    }

    const joiningInflight = isResolutionInFlight(validation.parsed.normalized);
    if (!joiningInflight) {
      const rateLimitResult = checkRateLimit(`resolve:${ip}`);
      if (!rateLimitResult.allowed) {
        logger.warn("Rate limit exceeded", { requestId, ip });
        failEvent("RATE_LIMITED");
        finish();
        return;
      }
    }

    // Per-client admission for the expensive part only, and only once the URL
    // is known good: a malformed URL is rejected above without consuming a
    // slot. Joining an in-flight resolution costs no extra provider/browser
    // work, so it is not throttled.
    if (!joiningInflight) {
      // Only release a slot this request actually took: a coalesced waiter
      // holds none, and releasing one for it would free another request's slot
      // and silently lift the per-client limit.
      admitted = perIpResolve.tryAcquire(ip);
      if (!admitted) {
        logger.warn("Resolve stream per-client limit reached", { requestId, ip });
        failEvent("CAPACITY_EXHAUSTED");
        finish();
        return;
      }
    }
    send("progress", { progress: 15, stage: "Link validated" });

    const result = await resolveGate.run(
      () =>
        resolveUrl(
          validation.parsed!.normalized,
          (progress, stage) => {
            send("progress", { progress, stage });
          },
          { signal: controller.signal, requestId }
        ),
      { signal: controller.signal }
    );
    if (settled) return;

    const mediaId = generateToken();
    storeMedia(mediaId, result.media, result.type);

    const duration = Date.now() - startTime;
    logger.info("Resolution complete", {
      requestId,
      duration,
      detectedType: validation.parsed.contentType,
      audioId: validation.parsed.audioId,
      provider: getActiveProviderName(),
      mediaCount: result.media.length,
      failedItems: 0,
      finalResult: result.type,
      mediaId,
      ...firstMediaDiag(result.media),
    });

    const data = {
      ...result,
      sourceUrl: validation.parsed.normalized,
      mediaId,
      startIndex: validation.parsed.slideIndex,
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
