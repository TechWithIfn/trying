/**
 * Centralized Instagram request client for Story extraction (server-side ONLY).
 *
 * This is the ONE place that builds Instagram request headers, attaches the
 * dedicated service-account session, interprets session/auth responses, and
 * retries transient failures. Story extraction must never hand-roll its own
 * Cookie/X-CSRFToken wiring anywhere else — `story-resolve.ts` delegates here,
 * and the browser jar (`parseSessionCookies`) reads the same session module,
 * so there is exactly one authentication implementation.
 *
 * Secrecy: cookie values, CSRF tokens and ds_user_id NEVER reach logs,
 * responses, or health output. Logs carry endpoint tags, HTTP statuses,
 * verdict names and counts only.
 */
import { AppError } from "./errors.js";
import { logger } from "./logger.js";
import {
  getInstagramCsrfToken,
  getInstagramDsUserId,
  getInstagramSessionCookie,
  isInstagramSessionConfigured,
  markSessionInvalid,
  noteSessionLive,
  sessionEnvDiag,
} from "./instagram-session.js";
import JSONbig from "json-bigint";

const JSONbigString = JSONbig({ storeAsString: true, useNativeBigInt: false });

export const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
export const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

/** Instagram web App ID (overridable for rollout changes, safe default built in). */
export function instagramAppId(): string {
  const raw = (process.env.X_IG_APP_ID || "").trim();
  return raw.length > 0 ? raw : "936619743392459";
}

/**
 * Canonical Instagram API host for user-lookup requests
 * (`web_profile_info`). `i.instagram.com` is the API host; `www` answers
 * identically (verified live), but the API host is the correct target.
 * Story-tray (`reels_media`) requests stay on `www.instagram.com`, where
 * session acceptance for Story reads was verified live.
 */
export const INSTAGRAM_API_HOST = "i.instagram.com";
export const INSTAGRAM_WWW_HOST = "www.instagram.com";

/** Authenticated user-lookup URL (username → user ID + privacy flag). */
export function webProfileInfoUrl(username: string): string {
  return `https://${INSTAGRAM_API_HOST}/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;
}

/** Story-tray URL (user ID → active Story items). Session-gated reads live here. */
export function reelsMediaUrl(reelId: string): string {
  return `https://${INSTAGRAM_WWW_HOST}/api/v1/feed/reels_media/?reel_ids=${encodeURIComponent(reelId)}`;
}

export const FETCH_TIMEOUT_MS = 10_000;
/** Bounded transient retries: initial attempt + this many retries (never for auth/4xx). */
export const MAX_TRANSIENT_RETRIES = 1;
const RETRY_BASE_DELAY_MS = 400;

/**
 * Minimal request-state surface the client updates. `story-resolve.ts`'s full
 * `StoryResolveState` satisfies this structurally — no import cycle.
 */
export interface StoryRequestState {
  totalRequests: number;
  apiRequests: number;
  sequence: number;
  usedAuthenticatedRequest: boolean;
  authedStatus: number | null;
  sawAuthedWall: boolean;
  rateLimited: boolean;
  saw429: boolean;
  upstreamRetryAfterMs: number | null;
  /** Set when Instagram demands verification (challenge) on an authed request. */
  sawChallenge?: boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    timer.unref?.();
  });
}

/** BigInt-safe JSON parse (Instagram IDs exceed Number.MAX_SAFE_INTEGER). Pure. */
export function parseJsonBigInt(text: string): unknown | null {
  try {
    return JSONbigString.parse(text);
  } catch {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }
}

/**
 * Realistic Instagram web headers. Cookie + X-CSRFToken are attached ONLY when
 * `includeCookie` is set AND a usable session exists; the values never leave
 * this module except on the wire to instagram.com.
 *
 * Identity is desktop Chrome by default: service-account sessions are minted
 * by desktop browser logins, and presenting them with a mobile identity makes
 * Instagram distrust the session (observed: identical cookies 401 under a
 * mobile UA). Pass `useDesktop: false` only for callers that specifically
 * need the mobile document.
 */
export function buildInstagramHeaders(
  opts: { includeCookie?: boolean; useDesktop?: boolean } = {}
): Record<string, string> {
  const desktop = opts.useDesktop !== false;
  const headers: Record<string, string> = {
    "User-Agent": desktop ? DESKTOP_UA : MOBILE_UA,
    Accept: desktop ? "*/*" : "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "X-IG-App-ID": instagramAppId(),
    Referer: "https://www.instagram.com/",
    "X-Requested-With": "XMLHttpRequest",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-Mode": "cors",
  };
  if (opts.includeCookie) {
    const cookie = getInstagramSessionCookie();
    if (cookie) {
      headers.Cookie = cookie;
      const csrf = getInstagramCsrfToken();
      if (csrf) headers["X-CSRFToken"] = csrf;
    }
  }
  return headers;
}

/** Anonymous page headers for public HTML fetches (never carry a session). */
export function buildInstagramHtmlHeaders(useDesktop = false): Record<string, string> {
  return {
    "User-Agent": useDesktop ? DESKTOP_UA : MOBILE_UA,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    Referer: "https://www.instagram.com/",
  };
}

/**
 * Interactive-verification markers. NOTE: `login_required` is deliberately
 * NOT here — it is the milder "session not verified for this content"
 * verdict and maps to login_required WITHOUT the challenge flag, while the
 * patterns below mean Instagram demanded a verification challenge.
 */
const CHALLENGE_RE =
  /checkpoint|challenge|feedback_required|two_factor|verification|verify.*account|suspicious.*login/i;

const LOGIN_REQUIRED_RE = /login_required|login required/;

function jsonMentionsChallenge(json: unknown): boolean {
  if (!json || typeof json !== "object") return false;
  try {
    const text = JSON.stringify(json);
    if (CHALLENGE_RE.test(text)) return true;
    const obj = json as Record<string, unknown>;
    if (obj["message"] === "challenge_required" || obj["challenge"] !== undefined) return true;
    if (obj["checkpoint_url"] !== undefined || obj["challenge_url"] !== undefined) return true;
  } catch {
    /* unstringifiable — treat as no signal */
  }
  return false;
}

/**
 * True when a response (status + body) proves Instagram wants interactive
 * verification for this session: checkpoint/challenge payloads, login_required
 * errors, or challenge redirects. Such verdicts must surface as
 * authentication failures — NEVER as "no active Story".
 */
export function isChallengeResponse(status: number | null, textSnippet: string | null, json: unknown): boolean {
  if (status === 400 && jsonMentionsChallenge(json)) return true;
  if (textSnippet && CHALLENGE_RE.test(textSnippet)) {
    // A bare "login required" string on an AUTHENTICATED request is a session
    // verdict; on anonymous requests the login wall is expected (not a challenge).
    return true;
  }
  if (jsonMentionsChallenge(json)) return true;
  return false;
}

/** True when the status is retryable-transient (429 handled separately, never retried blindly). */
export function isTransientInstagramStatus(status: number | null): boolean {
  return status !== null && status >= 500 && status <= 599;
}

/**
 * First 300 characters of a raw response body for stage diagnostics:
 * HTTP status, duration and body head are logged per stage so a false
 * negative can be traced to its exact point. Bodies are Instagram's
 * responses (never our cookies/credentials — those are request headers and
 * are never logged anywhere).
 */
export function bodySnippet(text: string | null, maxChars = 300): string | null {
  if (!text) return null;
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (!collapsed) return null;
  return collapsed.length > maxChars ? collapsed.slice(0, maxChars) : collapsed;
}

/** FETCH_FAILED with the responsible stage in the message (never a bare code). */
export function storyFetchFailed(stage: string, detail: string, statusCode = 502): AppError {
  return new AppError("FETCH_FAILED", `Story request failed during ${stage}: ${detail}`, statusCode);
}

export interface InstagramJsonResult {
  status: number;
  json: unknown | null;
  textSnippet: string | null;
  contentType: string | null;
  bodyLength: number;
}

/**
 * Single Instagram JSON request with session bookkeeping and bounded
 * transient-only retries. NEVER retries 401/403/404/410, challenge, or
 * login_required — those are final verdicts. 429 is returned (not retried) so
 * the caller records rate-limit state and backs off.
 *
 * Session liveness requires REAL user data on an authenticated 200 — a bare
 * 200-{} proves nothing (logged-out endpoints answer it too) and must never
 * mark the session verified.
 */
export async function fetchInstagramJson(
  url: string,
  tag: string,
  opts: {
    includeCookie?: boolean;
    state?: StoryRequestState;
    useDesktop?: boolean;
    timeoutMs?: number;
    /**
     * Set false for lookup-endpoint probes (web_profile_info): that endpoint
     * gates datacenter clients even when the SAME session is accepted for
     * Story trays, so its 401 must not quarantine a story-valid session.
     * Story-endpoint requests always quarantine on a wall (default true).
     */
    quarantineOnWall?: boolean;
  } = {}
): Promise<InstagramJsonResult> {
  const timeoutMs = opts.timeoutMs ?? FETCH_TIMEOUT_MS;
  if (opts.state) {
    if (opts.state.rateLimited) {
      throw new AppError(
        "RATE_LIMITED",
        "Instagram is temporarily rate-limiting requests. Please try again later.",
        429
      );
    }
    opts.state.totalRequests++;
    opts.state.apiRequests++;
    if (opts.includeCookie) opts.state.usedAuthenticatedRequest = true;
  }
  const seq = opts.state ? ++opts.state.sequence : 0;

  let lastNetworkError: unknown = null;
  for (let attempt = 0; attempt <= MAX_TRANSIENT_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const start = Date.now();
    try {
      const res = await fetch(url, {
        headers: buildInstagramHeaders({ includeCookie: opts.includeCookie, useDesktop: opts.useDesktop }),
        signal: controller.signal,
        redirect: "follow",
      });
      const status = res.status;
      const ct = res.headers.get("content-type") || "";
      let text: string | null = null;
      let json: unknown | null = null;
      try {
        text = await res.text();
        if (ct.includes("json") || text.trim().startsWith("{")) {
          json = parseJsonBigInt(text);
        }
      } catch {
        await res.body?.cancel().catch(() => {});
      }
      const elapsed = Date.now() - start;
      // [STORY] per-stage diagnostics: endpoint, HTTP status, duration,
      // content type and the first 300 chars of the raw body. Bodies are
      // Instagram's responses — request cookies/credentials never appear
      // here or in any log.
      logger.info("[STORY] Instagram response status", {
        endpoint: tag,
        status,
        authenticated: Boolean(opts.includeCookie),
        sequence: seq,
        elapsedMs: elapsed,
        hasJson: Boolean(json),
        responseContentType: ct ? ct.split(";")[0].trim().toLowerCase() : null,
        bodySnippet: bodySnippet(text),
      });

      if (opts.state && opts.includeCookie) {
        opts.state.authedStatus = status;
        if (status === 401 || status === 403) {
          opts.state.sawAuthedWall = true;
          if (opts.quarantineOnWall !== false) markSessionInvalid();
        }
        if (status === 200 && json && hasWebProfileUserId(json)) {
          noteSessionLive();
        }
      }
      if (status === 429) {
        if (opts.state) {
          opts.state.rateLimited = true;
          opts.state.saw429 = true;
          const retryAfter = res.headers.get("retry-after");
          const seconds = retryAfter ? Number.parseInt(retryAfter, 10) : NaN;
          if (Number.isFinite(seconds) && seconds > 0) {
            opts.state.upstreamRetryAfterMs = Math.min(seconds, 300) * 1000;
          }
        }
        logger.info("[STORY] rateLimited", { rateLimited: true, endpoint: tag });
        // 429 is final for this request — the caller throws the rate-limit
        // error (with upstream Retry-After) instead of retrying into a ban.
        return {
          status,
          json,
          textSnippet: text ? text.slice(0, 600) : null,
          contentType: ct ? ct.split(";")[0].trim().toLowerCase() : null,
          bodyLength: text ? text.length : 0,
        };
      }
      // Challenge / verification on an AUTHENTICATED request is a session
      // verdict, never content evidence. Throw immediately — no retry.
      if (
        opts.includeCookie &&
        isChallengeResponse(status, text ? text.slice(0, 600) : null, json)
      ) {
        // Recorded on the resolve state so final error selection reports a
        // verification failure — never "no active Story".
        if (opts.state) opts.state.sawChallenge = true;
        throw new AppError(
          "SESSION_EXPIRED",
          "Instagram asked for verification for this session (challenge required). The server session needs to be refreshed.",
          401
        );
      }
      if (isTransientInstagramStatus(status) && attempt < MAX_TRANSIENT_RETRIES) {
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 150;
        logger.info("[STORY] transient upstream status, retrying", {
          endpoint: tag,
          status,
          attempt: attempt + 1,
          delayMs: Math.round(delay),
        });
        await sleep(delay);
        continue;
      }
      return {
        status,
        json,
        textSnippet: text ? text.slice(0, 600) : null,
        contentType: ct ? ct.split(";")[0].trim().toLowerCase() : null,
        bodyLength: text ? text.length : 0,
      };
    } catch (err) {
      if (err instanceof AppError) throw err;
      lastNetworkError = err;
      const name = err instanceof Error ? err.name : "fetch-failed";
      // Abort/timeout budget is spent — never retry (would exceed budgets).
      if (name === "AbortError" || name === "TimeoutError") {
        logger.warn("[STORY] Instagram request aborted/timed out", { endpoint: tag, error: name, sequence: seq });
        throw storyFetchFailed(tag, `request ${name === "AbortError" ? "aborted" : "timed out"} after ${timeoutMs}ms`);
      }
      if (attempt < MAX_TRANSIENT_RETRIES) {
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 150;
        logger.warn("[STORY] Instagram request transport failure, retrying", {
          endpoint: tag,
          error: name,
          attempt: attempt + 1,
          delayMs: Math.round(delay),
        });
        await sleep(delay);
        continue;
      }
      logger.warn("[STORY] Instagram request failed", { endpoint: tag, error: name, sequence: seq });
      throw storyFetchFailed(tag, `transport failure (${name}) after bounded retries`);
    } finally {
      clearTimeout(timer);
    }
  }
  logger.warn("[STORY] Instagram request failed", {
    endpoint: tag,
    error: lastNetworkError instanceof Error ? lastNetworkError.name : "fetch-failed",
    sequence: seq,
  });
  throw storyFetchFailed(tag, "no response after bounded retries");
}

function hasWebProfileUserId(json: unknown): boolean {
  if (!json || typeof json !== "object") return false;
  const obj = json as Record<string, unknown>;
  const data = obj["data"];
  if (data && typeof data === "object") {
    const user = (data as Record<string, unknown>)["user"];
    if (user && typeof user === "object") {
      const id = (user as Record<string, unknown>)["id"];
      if ((typeof id === "string" && id) || typeof id === "number") return true;
    }
  }
  const directUser = obj["user"];
  if (directUser && typeof directUser === "object") {
    const id = (directUser as Record<string, unknown>)["id"];
    if ((typeof id === "string" && id) || typeof id === "number") return true;
  }
  return false;
}

export type SessionValidation =
  | { status: "unconfigured" }
  | { status: "ok" }
  | { status: "unknown" }
  | { status: "expired_invalid" }
  | { status: "login_required"; challenge: boolean }
  | { status: "rate_limited" }
  | { status: "transient_error" };

function hasStoryTrayKeys(json: unknown): boolean {
  if (!json || typeof json !== "object") return false;
  const obj = json as Record<string, unknown>;
  return "reels_media" in obj || "reels" in obj;
}

/**
 * Validate the dedicated service-account session BEFORE Story extraction.
 * Exactly one lightweight authenticated probe; the verdict distinguishes
 * expired/invalid, login_required, challenge, and rate_limited so callers can
 * surface the real reason instead of "no active Story".
 *
 * Probe family matters: the session is validated against the SAME endpoint
 * family used for extraction (Story trays) — the target user's tray when
 * their ID is already known, else the service account's own tray via
 * DS_USER_ID. Only when neither ID exists is the generic lookup endpoint
 * used, and its plain 401 is reported as `unknown` (that endpoint gates
 * datacenter clients even while the same session is accepted for Story
 * trays — observed live — so it must never masquerade as a dead session).
 * A Story-endpoint 401/403 IS proof for Story purposes: the session is
 * quarantined and reported expired_invalid.
 *
 * Never throws for verdicts — unexpected transport failures map to
 * transient_error.
 */
export async function validateInstagramSession(
  opts: { userId?: string | null; state?: StoryRequestState } = {}
): Promise<SessionValidation> {
  if (!isInstagramSessionConfigured()) return { status: "unconfigured" };
  const dsUserId = getInstagramDsUserId();
  const trayId = opts.userId || dsUserId;
  const family: "tray" | "lookup" = trayId ? "tray" : "lookup";
  const probeUrl = trayId
    ? reelsMediaUrl(trayId)
    : webProfileInfoUrl("instagram");
  logger.info("[STORY] session probe", { family });
  let result: InstagramJsonResult;
  try {
    result = await fetchInstagramJson(probeUrl, "session_validation_probe", {
      includeCookie: true,
      state: opts.state,
      // Lookup-endpoint gating is endpoint-specific: record the verdict but
      // never quarantine a session the Story endpoints may still accept.
      quarantineOnWall: family === "tray",
    });
  } catch (err) {
    if (err instanceof AppError && err.code === "SESSION_EXPIRED") {
      return { status: "login_required", challenge: true };
    }
    if (err instanceof AppError && err.code === "RATE_LIMITED") {
      return { status: "rate_limited" };
    }
    return { status: "transient_error" };
  }
  if (result.status === 429) return { status: "rate_limited" };
  if (isChallengeResponse(result.status, result.textSnippet, result.json)) {
    return { status: "login_required", challenge: true };
  }
  if (LOGIN_REQUIRED_RE.test(result.textSnippet || "")) {
    return { status: "login_required", challenge: false };
  }
  if (result.status === 401 || result.status === 403) {
    // Tray family: Instagram rejected THIS session for Story reads — expired.
    // Quarantine explicitly (the stateless probe path skips fetch-level
    // bookkeeping): no later request re-attaches it while anonymous/public
    // discovery continues. Lookup family: endpoint-specific gating is
    // possible — stay unverified and let the Story strategies (same family
    // as extraction) judge.
    if (family === "tray") {
      markSessionInvalid();
      return { status: "expired_invalid" };
    }
    return { status: "unknown" };
  }
  if (result.status === 200) {
    if (family === "tray") {
      if (result.json && hasStoryTrayKeys(result.json)) {
        // Accepted for Story reads (even an empty tray proves acceptance).
        noteSessionLive();
        return { status: "ok" };
      }
      return { status: "unknown" };
    }
    if (result.json && hasWebProfileUserId(result.json)) return { status: "ok" };
    // 200 without user data proves nothing — session stays unverified.
    return { status: "unknown" };
  }
  return { status: "transient_error" };
}

/** Map a session verdict to its honest error. Never maps to "no active Story". */
export function sessionValidationError(validation: SessionValidation): AppError | null {
  switch (validation.status) {
    case "expired_invalid":
      return new AppError(
        "SESSION_EXPIRED",
        "Instagram session expired or requires verification.",
        401
      );
    case "login_required":
      return validation.challenge
        ? new AppError(
            "SESSION_EXPIRED",
            "Instagram asked for verification for this session (challenge required). The server session needs to be refreshed.",
            401
          )
        : new AppError(
            "SESSION_EXPIRED",
            "Instagram session expired or requires verification.",
            401
          );
    case "rate_limited":
      return new AppError(
        "RATE_LIMITED",
        "Instagram is rate-limiting requests. Please try again shortly.",
        429
      );
    default:
      return null;
  }
}

/** Session-owner endpoint: the lightest authoritative session check (needs no target ID). */
export function currentUserUrl(): string {
  return `https://${INSTAGRAM_WWW_HOST}/api/v1/accounts/current_user/`;
}

/**
 * The session-owner user record in a current_user response, flexibly located:
 * `{user:{pk|id}}`, `{data:{user:{id}}}`, or top-level `{pk|id}`. Both number
 * and string IDs count (Instagram IDs exceed float precision — always kept
 * as strings downstream).
 */
/**
 * A top-level string field from an Instagram JSON body (e.g. `message`,
 * `error_type`) for diagnostics. Scalars only — never secrets (our
 * credentials travel in request headers, never in Instagram's responses).
 */
export function extractBodyField(json: unknown, field: string): string | null {
  if (!json || typeof json !== "object") return null;
  const value = (json as Record<string, unknown>)[field];
  if (typeof value === "string" && value) return value.slice(0, 200);
  return null;
}

export function extractSessionOwnerId(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const obj = json as Record<string, unknown>;
  const candidates: unknown[] = [
    (obj["user"] as Record<string, unknown> | undefined)?.["pk"],
    (obj["user"] as Record<string, unknown> | undefined)?.["id"],
    ((obj["data"] as Record<string, unknown> | undefined)?.["user"] as Record<string, unknown> | undefined)?.["id"],
    obj["pk"],
    obj["id"],
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate) return candidate;
    if (typeof candidate === "number" && Number.isFinite(candidate)) return String(candidate);
  }
  return null;
}

/**
 * Validate the session FIRST with a lightweight authenticated call to the
 * session-owner endpoint — before any username lookup or Story fetch. One
 * request, no fallbacks inside:
 * - 200 with an owner record → valid ("ok"), session marked live.
 * - 401/403, login_required, checkpoint/challenge → SESSION_EXPIRED verdict
 *   ("expired_invalid", challenge flagged); the session is quarantined so no
 *   fallback re-attaches it.
 * - 429 → "rate_limited".
 * - anything else (5xx, transport failure, 200 without owner data) →
 *   "unknown" (inconclusive — the caller proceeds to the tray-family probe
 *   after resolving the user ID instead of guessing).
 *
 * Callers fail fast on expired/rate_limited (SESSION_EXPIRED/RATE_LIMITED
 * immediately, no fallback chain) and continue otherwise. Never throws for
 * verdicts.
 */
export async function validateSessionOwner(
  state?: StoryRequestState
): Promise<SessionValidation> {
  if (!isInstagramSessionConfigured()) return { status: "unconfigured" };
  // Request-time material diagnostics (defined-ness + lengths, never values)
  // so a rejection can be attributed to unset/mangled variables vs a dead
  // session without exposing secrets.
  logger.info("[STORY] session env", sessionEnvDiag());
  let result: InstagramJsonResult;
  try {
    result = await fetchInstagramJson(currentUserUrl(), "session_owner_probe", {
      includeCookie: true,
      state,
    });
  } catch (err) {
    if (err instanceof AppError && err.code === "SESSION_EXPIRED") {
      return { status: "login_required", challenge: true };
    }
    if (err instanceof AppError && err.code === "RATE_LIMITED") {
      return { status: "rate_limited" };
    }
    return { status: "transient_error" };
  }
  // Raw owner-response signals for the log: Instagram's own `message` /
  // `error_type` fields decide the verdict — never empty data or parse
  // outcomes. Both fields are Instagram's words, never our secrets.
  const bodyMessage = extractBodyField(result.json, "message");
  const bodyErrorType = extractBodyField(result.json, "error_type");
  logger.info("[STORY] session owner response", {
    status: result.status,
    message: bodyMessage,
    errorType: bodyErrorType,
    hasOwner: extractSessionOwnerId(result.json) !== null,
  });
  if (result.status === 429) return { status: "rate_limited" };
  if (isChallengeResponse(result.status, result.textSnippet, result.json)) {
    return { status: "login_required", challenge: true };
  }
  if (LOGIN_REQUIRED_RE.test(result.textSnippet || "")) {
    return { status: "login_required", challenge: false };
  }
  if (result.status === 401 || result.status === 403) {
    // The session-owner endpoint is authoritative for session validity
    // (unlike the lookup endpoint): a wall here proves a dead session.
    // fetchInstagramJson already quarantined it when state was passed.
    return { status: "expired_invalid" };
  }
  if (result.status === 200) {
    if (extractSessionOwnerId(result.json)) {
      noteSessionLive();
      return { status: "ok" };
    }
    return { status: "unknown" };
  }
  return { status: "transient_error" };
}
