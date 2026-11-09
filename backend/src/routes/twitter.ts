import { Router, type Request, type Response } from "express";
import { generateToken } from "../lib/crypto.js";
import { logger } from "../lib/logger.js";
import { checkRateLimit, routeRateLimitConfig } from "../lib/rate-limit.js";
import { getClientIp } from "../lib/media-proxy.js";
import {
  resolveTwitterPost,
  TwitterResolveError,
} from "../lib/twitter/resolve.js";

const router = Router();
const RESOLVE_TIMEOUT_MS = 45_000;

function failure(code: string, message: string) {
  return { success: false, error: { code, message } };
}

/**
 * Public Twitter/X video resolution.
 *
 * All extraction, format selection, URL validation and metadata mapping lives
 * in `lib/twitter/resolve.ts` (shared with the download/stream expiry-recovery
 * path). This route only owns HTTP concerns: rate limiting, validation,
 * cancellation and honest status codes.
 */
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

  const controller = new AbortController();
  const onClose = (): void => {
    if (!res.writableEnded) controller.abort();
  };
  res.on("close", onClose);
  try {
    const result = await resolveTwitterPost(req.body?.url, {
      signal: controller.signal,
      requestId,
      timeoutMs: RESOLVE_TIMEOUT_MS,
      purpose: "resolve",
    });
    const duration = Date.now() - startedAt;
    res.setHeader("X-Resolve-Duration-Ms", String(duration));
    logger.info("[TWITTER] resolve success", {
      requestId,
      duration,
      mediaId: result.mediaId,
      mediaCount: result.media.length,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    if (res.headersSent) return;
    const mapped =
      error instanceof TwitterResolveError
        ? error
        : new TwitterResolveError(
            "TWITTER_RESOLVE_FAILED",
            "Twitter/X did not provide a public downloadable video.",
            422
          );
    if (mapped.status === 429) {
      res.setHeader("Retry-After", "5");
    }
    logger.warn("[TWITTER] resolve failed", {
      requestId,
      category: mapped.code,
      status: mapped.status,
      duration: Date.now() - startedAt,
    });
    // The message is already user-safe: never forward raw stderr, URLs,
    // cookies or extractor internals to the client.
    res.status(mapped.status).json(failure(mapped.code, mapped.message));
  } finally {
    res.off("close", onClose);
  }
});

export default router;
