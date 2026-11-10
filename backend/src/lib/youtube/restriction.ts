import { AppError, ERRORS } from "../errors.js";
import { readPositiveInt } from "../env.js";
import { logger } from "../logger.js";
import { inc } from "../metrics.js";
import type { ResolveDiagnostics } from "../types.js";

/**
 * Process-local YouTube circuit breaker.
 *
 * yt-dlp tells the truth: a "Sign in to confirm you're not a bot" page or an
 * HTTP 429 means YouTube is refusing THIS host's outbound IP. Retrying the
 * same request seconds later cannot change that — it only adds load and can
 * lengthen the block. This module therefore:
 *
 *  - arms a cooldown when a bot check / rate limit is observed,
 *  - refuses new extraction attempts while it is active (cache reads are
 *    refused too, because the download path would still hit YouTube),
 *  - escalates the cooldown when the same restriction recurs after expiry,
 *  - clears the state only after a real successful extraction,
 *  - exposes a sanitized snapshot for health/monitoring.
 *
 * It deliberately does NOT rotate IPs, use cookies, or try to defeat the
 * restriction. The only honest response to an access block is to stop asking
 * for a while and tell the user when a retry may be attempted.
 */

export type YouTubeRestrictionKind = "bot_check" | "rate_limited";
export type YouTubeRestrictionReason = "YOUTUBE_BOT_CHECK" | "YOUTUBE_RATE_LIMITED";

const BOT_REASON: YouTubeRestrictionReason = "YOUTUBE_BOT_CHECK";
const RATE_REASON: YouTubeRestrictionReason = "YOUTUBE_RATE_LIMITED";

interface ActiveRestriction {
  kind: YouTubeRestrictionKind;
  reason: YouTubeRestrictionReason;
  until: number;
  armedAt: number;
}

export interface YouTubeRestrictionSnapshot {
  active: boolean;
  kind: YouTubeRestrictionKind | null;
  reason: YouTubeRestrictionReason | null;
  /** Seconds remaining; 0 when inactive. */
  retryAfterSeconds: number;
  /** How many consecutive restrictions were observed without a success. */
  consecutive: number;
  /** Sanitized lifetime count for this process. */
  totalEvents: number;
  /** ISO timestamp when the current cooldown ends (null when inactive). */
  until: string | null;
  /** ISO timestamp of the last successful extraction that cleared a block. */
  clearedAt: string | null;
}

export interface RecordedRestriction {
  retryAfterMs: number;
  until: number;
  consecutive: number;
  kind: YouTubeRestrictionKind;
}

let active: ActiveRestriction | null = null;
let consecutive = 0;
let totalEvents = 0;
let lastClearedAt: number | null = null;

function botCooldownMs(): number {
  return readPositiveInt("YOUTUBE_BOT_COOLDOWN_MS", 60_000);
}

function rateLimitCooldownMs(): number {
  return readPositiveInt("YOUTUBE_RATE_LIMIT_COOLDOWN_MS", 120_000);
}

function maxCooldownMs(): number {
  return readPositiveInt("YOUTUBE_MAX_COOLDOWN_MS", 15 * 60_000);
}

function reasonForCode(code: string): YouTubeRestrictionReason | null {
  if (code === BOT_REASON) return BOT_REASON;
  if (code === RATE_REASON) return RATE_REASON;
  return null;
}

function kindForReason(reason: YouTubeRestrictionReason): YouTubeRestrictionKind {
  return reason === RATE_REASON ? "rate_limited" : "bot_check";
}

function baseCooldownMs(reason: YouTubeRestrictionReason): number {
  return reason === RATE_REASON ? rateLimitCooldownMs() : botCooldownMs();
}

function activeAt(now: number): ActiveRestriction | null {
  return active !== null && active.until > now ? active : null;
}

/**
 * Arm (or extend) the cooldown for a classified bot-check / rate-limit
 * failure. Exponentially escalates while consecutive failures keep occurring
 * without a successful extraction, bounded by YOUTUBE_MAX_COOLDOWN_MS.
 */
export function recordYouTubeRestriction(
  code: string,
  options: { source?: string; now?: number } = {}
): RecordedRestriction | null {
  const reason = reasonForCode(code);
  if (!reason) return null;

  const now = options.now ?? Date.now();
  consecutive += 1;
  totalEvents += 1;

  const base = baseCooldownMs(reason);
  const max = Math.max(base, maxCooldownMs());
  const escalated = Math.min(max, base * 2 ** Math.min(consecutive - 1, 10));
  const existing = activeAt(now);
  const until = Math.max(now + escalated, existing?.until ?? 0);
  const kind = kindForReason(reason);

  active = {
    kind,
    reason,
    until,
    armedAt: existing?.armedAt ?? now,
  };

  inc("youtubeRestrictions");
  logger.warn("[YOUTUBE] restriction cooldown armed", {
    code,
    kind,
    source: options.source ?? null,
    consecutive,
    cooldownMs: escalated,
    retryAfterSeconds: Math.max(1, Math.ceil((until - now) / 1000)),
  });

  return {
    retryAfterMs: Math.max(0, until - now),
    until,
    consecutive,
    kind,
  };
}

/**
 * Attach the cooldown to an AppError whose code proves a YouTube restriction.
 * Other verdicts pass through untouched.
 */
export function applyYouTubeRestriction(error: AppError, source: string): AppError {
  if (error.code !== BOT_REASON && error.code !== RATE_REASON) return error;
  const recorded = recordYouTubeRestriction(error.code, { source });
  if (recorded) error.retryAfterMs = recorded.retryAfterMs;
  return error;
}

/**
 * The current restriction as an AppError, or null when extraction is allowed.
 * Callers pass their request diagnostics so the response still identifies the
 * exact request/video without leaking anything secret.
 */
export function activeYouTubeRestrictionError(
  extra?: ResolveDiagnostics,
  now: number = Date.now()
): AppError | null {
  const current = activeAt(now);
  if (!current) return null;

  const retryAfterMs = Math.max(1, current.until - now);
  inc("youtubeCooldownRejections");
  logger.info("[YOUTUBE] request blocked by cooldown", {
    requestId: extra?.requestId ?? null,
    videoId: extra?.youtubeVideoId ?? null,
    kind: current.kind,
    retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
  });

  return new AppError(
    current.reason,
    ERRORS[current.reason].message,
    ERRORS[current.reason].status,
    { provider: "youtube-yt-dlp", stage: "cooldown", youtubeStage: "cooldown", ...extra },
    retryAfterMs
  );
}

/**
 * A real extraction succeeded. Only this clears the escalation streak — a
 * cache hit does not prove YouTube is reachable again.
 */
export function clearYouTubeRestriction(source = "probe"): void {
  if (!active && consecutive === 0) return;
  const wasActive = active !== null;
  active = null;
  consecutive = 0;
  lastClearedAt = Date.now();
  if (wasActive) {
    logger.info("[YOUTUBE] restriction cleared after successful extraction", { source });
  }
}

export function youtubeRestrictionSnapshot(now: number = Date.now()): YouTubeRestrictionSnapshot {
  const current = activeAt(now);
  return {
    active: current !== null,
    kind: current?.kind ?? null,
    reason: current?.reason ?? null,
    retryAfterSeconds: current ? Math.max(1, Math.ceil((current.until - now) / 1000)) : 0,
    consecutive,
    totalEvents,
    until: current ? new Date(current.until).toISOString() : null,
    clearedAt: lastClearedAt !== null ? new Date(lastClearedAt).toISOString() : null,
  };
}

/** Test-only: drop all restriction state and counters. */
export function resetYouTubeRestrictionForTests(): void {
  active = null;
  consecutive = 0;
  totalEvents = 0;
  lastClearedAt = null;
}
