import { Router, Request, Response } from "express";
import { timingSafeEqual } from "crypto";
import { validateInstagramUrl } from "../lib/validators/instagram-url.js";
import { isStoryOrHighlightUrl } from "../lib/story-resolve.js";
import {
  createStoryResolveState,
  extractIsPrivateFromWebProfileInfo,
  extractStoryMediaItem,
  extractUserIdFromWebProfileInfo,
  parseReelsMediaResponse,
  parseStoryUrl,
} from "../lib/story-resolve.js";
import {
  currentUserUrl,
  extractSessionOwnerId,
  fetchInstagramJson,
  reelsMediaUrl,
  webProfileInfoUrl,
} from "../lib/instagram-client.js";
import {
  getSessionState,
  isInstagramSessionConfigured,
  sessionEnvPresence,
} from "../lib/instagram-session.js";
import { checkRateLimit } from "../lib/rate-limit.js";
import { getClientIp } from "../lib/media-proxy.js";
import { readPositiveInt } from "../lib/env.js";
import { logger } from "../lib/logger.js";
import { AppError } from "../lib/errors.js";

const router = Router();

/**
 * Protected development-only Story diagnostics.
 *
 * GET /api/debug/story?url=<instagram-story-url>&secret=<DEBUG_SECRET>
 *
 * Mirrors the production pipeline (session validation → username → user ID →
 * tray fetch → parse → media classification) and reports each stage WITHOUT
 * exposing credentials, cookies, tokens, media URLs, or the secret itself.
 * Debug responses are never cached.
 *
 * Protection:
 * - Disabled with 404 in production unless ALLOW_STORY_DEBUG=true.
 * - Requires ?secret= to equal DEBUG_SECRET (timing-safe compare); wrong or
 *   missing secrets answer 403/400 without revealing whether the endpoint or
 *   the URL was the problem beyond the status.
 * - Per-IP rate limited like any other endpoint.
 */
function debugEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.ALLOW_STORY_DEBUG === "true";
}

function secretMatches(provided: unknown): boolean {
  const expected = process.env.DEBUG_SECRET || "";
  if (!expected || typeof provided !== "string" || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export interface StoryDebugResult {
  url: string;
  sessionValid: boolean;
  sessionValidation: string;
  /** Env variable NAME that supplied the session (never the value). */
  sessionSource: string | null;
  /** Which session materials are configured (booleans ONLY, never values). */
  envCookiesPresent: { sessionId: boolean; csrfToken: boolean; dsUserId: boolean };
  /** Raw HTTP status of the session-owner (current_user) check. */
  currentUserStatus: number | null;
  /** Pipeline stage that failed (null when nothing failed). */
  failedStage: string | null;
  parsedUsername: string | null;
  resolvedUserId: boolean;
  isPrivate: boolean | null;
  webProfileStatus: number | null;
  /** Which tray shape Instagram answered with. */
  responseShape: "reels_media" | "reels" | "unknown" | null;
  reelsStatus: number | null;
  rawItemCount: number;
  validMediaCount: number;
  finalMediaType: "video" | "image" | null;
  lastError: { code: string; message: string } | null;
}

router.get("/", async (req: Request, res: Response): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  if (!debugEnabled()) {
    res.status(404).json({ success: false, error: { code: "CONTENT_NOT_FOUND", message: "Not found." } });
    return;
  }
  if (!secretMatches(req.query.secret)) {
    res.status(403).json({ success: false, error: { code: "UPSTREAM_FORBIDDEN", message: "Forbidden." } });
    return;
  }

  const ip = getClientIp(req);
  const windowMs = readPositiveInt("RATE_LIMIT_WINDOW_MS", 60_000);
  const limit = checkRateLimit(`debug-story:${ip}`, { windowMs, maxRequests: 30 });
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(Math.ceil(limit.retryAfterMs / 1000)));
    res.status(429).json({ success: false, error: { code: "RATE_LIMITED", message: "Too many requests." } });
    return;
  }

  const rawUrl = req.query.url;
  if (typeof rawUrl !== "string" || rawUrl.length === 0) {
    res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Missing url." } });
    return;
  }
  const validation = validateInstagramUrl(rawUrl);
  if (!validation.valid || !validation.parsed || !isStoryOrHighlightUrl(validation.parsed.normalized)) {
    res.status(400).json({ success: false, error: { code: "INVALID_URL", message: "Not a Story URL." } });
    return;
  }
  const normalized = validation.parsed.normalized;

  const result: StoryDebugResult = {
    url: normalized,
    sessionValid: false,
    sessionValidation: "unconfigured",
    sessionSource: getSessionState().source,
    envCookiesPresent: {
      sessionId: sessionEnvPresence().sessionid,
      csrfToken: sessionEnvPresence().csrftoken,
      dsUserId: sessionEnvPresence().ds_user_id,
    },
    currentUserStatus: null,
    failedStage: null,
    parsedUsername: null,
    resolvedUserId: false,
    isPrivate: null,
    webProfileStatus: null,
    responseShape: null,
    reelsStatus: null,
    rawItemCount: 0,
    validMediaCount: 0,
    finalMediaType: null,
    lastError: null,
  };
  const fail = (stage: string, error: unknown): void => {
    if (!result.failedStage) result.failedStage = stage;
    if (error instanceof AppError) {
      result.lastError = { code: error.code, message: error.message };
    } else {
      result.lastError = { code: "TEMPORARY_ERROR", message: error instanceof Error ? error.message : "unknown" };
    }
  };

  try {
    let parsed: { username: string; storyId: string | null; highlightId: string | null };
    try {
      parsed = parseStoryUrl(normalized);
    } catch (err) {
      fail("url-parse", err);
      res.json({ success: true, data: result });
      return;
    }
    result.parsedUsername = parsed.username || null;
    if (parsed.highlightId || !parsed.username) {
      result.lastError = { code: "UNSUPPORTED_CONTENT", message: "Debug supports Story/profile URLs." };
      result.failedStage = "url-parse";
      res.json({ success: true, data: result });
      return;
    }

    // 1. Session validation: lightweight authenticated session-owner call,
    // exactly like the real pipeline's fail-fast gate (observational here —
    // no quarantine, no state). Raw status reported so 401 vs empty vs
    // timeout is distinguishable.
    if (isInstagramSessionConfigured()) {
      try {
        const owner = await fetchInstagramJson(currentUserUrl(), "debug_session_owner", {
          includeCookie: true,
        });
        result.currentUserStatus = owner.status;
        if (owner.status === 200 && extractSessionOwnerId(owner.json)) {
          result.sessionValidation = "ok";
          result.sessionValid = true;
        } else if (owner.status === 429) {
          result.sessionValidation = "rate_limited";
          fail("session-validation", new AppError("RATE_LIMITED", "Instagram is rate-limiting requests.", 429));
        } else if (owner.status === 401 || owner.status === 403) {
          result.sessionValidation = "expired_invalid";
          fail("session-validation", new AppError("SESSION_EXPIRED", "Instagram session expired or requires verification.", 401));
        } else {
          result.sessionValidation = "unknown";
        }
      } catch (error) {
        result.sessionValidation = "transient_error";
        fail("session-validation", error);
      }
    }
    result.sessionSource = getSessionState().source;
    // Mirror the production fail-fast gate: a dead or throttled session
    // stops here with its own verdict instead of running the lookup/tray
    // chain on a known-bad identity (downstream failures would only be noise
    // and could masquerade as content verdicts).
    if (result.lastError) {
      res.json({ success: true, data: result });
      return;
    }

    // 2–3. Username → user ID + privacy flag (public lookup, single attempt).
    const state = createStoryResolveState();
    const profile = await fetchInstagramJson(webProfileInfoUrl(parsed.username), "debug_web_profile_info", {
      includeCookie: false,
      state,
    });
    result.webProfileStatus = profile.status;
    if (profile.status === 200 && profile.json) {
      const userId = extractUserIdFromWebProfileInfo(profile.json);
      if (userId) {
        result.resolvedUserId = true;
        result.isPrivate = extractIsPrivateFromWebProfileInfo(profile.json);

        // 4–5. Tray fetch (authed iff a usable session exists) + shape parse.
        const useCookie = isInstagramSessionConfigured();
        const tray = await fetchInstagramJson(reelsMediaUrl(userId), "debug_reels_media", {
          includeCookie: useCookie,
          state,
        });
        result.reelsStatus = tray.status;
        if (tray.status === 200 && tray.json && typeof tray.json === "object") {
          const keys = Object.keys(tray.json as Record<string, unknown>);
          result.responseShape = keys.includes("reels_media")
            ? "reels_media"
            : keys.includes("reels")
              ? "reels"
              : "unknown";
        }
        const items = parseReelsMediaResponse(tray.json);
        result.rawItemCount = items.length;
        for (const item of items) {
          try {
            const { media } = extractStoryMediaItem(item, parsed.username);
            result.validMediaCount++;
            if (!result.finalMediaType && (media.type === "video" || media.type === "image")) {
              result.finalMediaType = media.type;
            }
          } catch {
            /* counted as invalid — extraction continues */
          }
        }
        if (tray.status === 401 || tray.status === 403) {
          fail("tray-fetch", new AppError("SESSION_EXPIRED", "Instagram session expired or requires verification.", 401));
        } else if (tray.status === 429) {
          fail("tray-fetch", new AppError("RATE_LIMITED", "Instagram is rate-limiting requests.", 429));
        }
      } else {
        result.lastError = { code: "USER_NOT_FOUND", message: "User ID not present in lookup response." };
        if (!result.failedStage) result.failedStage = "user-lookup";
      }
    } else if (profile.status === 404) {
      result.lastError = { code: "USER_NOT_FOUND", message: "Profile not found." };
      if (!result.failedStage) result.failedStage = "user-lookup";
    } else if (profile.status === 429) {
      result.lastError = { code: "RATE_LIMITED", message: "Instagram is rate-limiting requests." };
      if (!result.failedStage) result.failedStage = "user-lookup";
    } else {
      result.lastError = { code: "FETCH_FAILED", message: `Story request failed during user-lookup: Lookup answered HTTP ${profile.status}.` };
      if (!result.failedStage) result.failedStage = "user-lookup";
    }
  } catch (error) {
    fail("tray-fetch", error);
    logger.info("[STORY] debug failed", {
      code: result.lastError?.code ?? "unknown",
      // Scalars only — never URLs, cookies, or secrets.
      webProfileStatus: result.webProfileStatus,
      reelsStatus: result.reelsStatus,
    });
  }
  res.json({ success: true, data: result });
});

export default router;
