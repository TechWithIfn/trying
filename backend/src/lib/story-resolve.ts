import type { ResolverResult, MediaItem, Author, ResolveProgressCallback, InstagramContentType } from "./types.js";
import { AppError, ERRORS } from "./errors.js";
import { logger } from "./logger.js";
import { decodeHtmlEntities, redactMediaUrl } from "./text.js";
import { isPrivateOrReservedHost } from "./providers/base.js";
import {
  getInstagramSessionCookie as getInstagramCookie,
  getSessionState,
  isInstagramSessionConfigured as isInstagramCookieConfigured,
  type SessionLifecycleState,
} from "./instagram-session.js";
import {
  bodySnippet,
  buildInstagramHeaders,
  buildInstagramHtmlHeaders,
  fetchInstagramJson,
  parseJsonBigInt,
  reelsMediaUrl,
  sessionValidationError,
  storyFetchFailed,
  validateInstagramSession,
  validateSessionOwner,
  webProfileInfoUrl,
  FETCH_TIMEOUT_MS,
  MOBILE_UA,
} from "./instagram-client.js";
import { hashUrl } from "./crypto.js";
import { readBoundedInt } from "./env.js";
const HIGHLIGHT_RETRY_MAX = 3;
const HIGHLIGHT_RETRY_BASE_DELAY_MS = 800;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    // Retry backoff must never hold the process open during shutdown.
    timer.unref?.();
  });
}

async function fetchHighlightWithRetry(
  url: string,
  tag: string,
  opts: { includeCookie?: boolean; state?: StoryResolveState } = {}
): Promise<{ status: number; json: unknown | null; textSnippet: string | null }> {
  let lastResult: { status: number; json: unknown | null; textSnippet: string | null } | null = null;
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= HIGHLIGHT_RETRY_MAX; attempt++) {
    try {
      const result = await fetchJsonWithStatus(url, `${tag}_attempt${attempt}`, opts);
      // Retry on 429 and 5xx, but not on 401/403/404/410 (auth/not found are final)
      if (result.status === 429 || (result.status !== null && result.status >= 500)) {
        lastResult = result;
        if (attempt < HIGHLIGHT_RETRY_MAX) {
          const delay = HIGHLIGHT_RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1) + Math.random() * 200;
          logger.info(`[highlight-resolve] retry ${attempt}/${HIGHLIGHT_RETRY_MAX} after ${result.status}`, { tag, highlightId: url.slice(0, 60), delay: Math.round(delay) });
          await sleep(delay);
          continue;
        }
        return result;
      }
      return result;
    } catch (err) {
      lastError = err;
      if (err instanceof AppError && ["RATE_LIMITED", "FETCH_FAILED"].includes(err.code)) {
        if (attempt < HIGHLIGHT_RETRY_MAX) {
          const delay = HIGHLIGHT_RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1) + Math.random() * 200;
          logger.info(`[highlight-resolve] retry ${attempt}/${HIGHLIGHT_RETRY_MAX} after error ${err.code}`, { tag, delay: Math.round(delay) });
          await sleep(delay);
          continue;
        }
      }
      throw err;
    }
    // Small delay between retries to avoid hammering
    if (attempt < HIGHLIGHT_RETRY_MAX) await sleep(300);
  }
  if (lastResult) return lastResult;
  if (lastError) throw lastError;
  throw new AppError("FETCH_FAILED", "Story request failed during highlight-fetch: highlight request failed after bounded retries.", 502);
}

interface StoryResolveState {
  totalRequests: number;
  apiRequests: number;
  htmlRequests: number;
  saw429: boolean;
  usedAuthenticatedRequest: boolean;
  exactStoryAttempted: boolean;
  rateLimited: boolean;
  startTime: number;
  sequence: number;
  /** Set when any login-wall marker was observed (never a URL or secret). */
  sawLoginWall: boolean;
  /** Count of fetched pages that carried no story markers (empty shells). */
  emptyShellCount: number;
  /** True once the username was proven to exist (userId resolved). */
  userExists: boolean;
  /** True when any response indicated a private account. */
  privateHint: boolean;
  /** Last HTTP status of an authenticated (cookie) request, null if none yet. */
  authedStatus: number | null;
  /** Ordered strategy names attempted (for final error selection + logs). */
  strategiesTried: string[];
  /** True once the browser fallback was attempted. */
  browserAttempted: boolean;
  /**
   * Upstream Retry-After (seconds) seen on a 429, when Instagram sent one.
   * Surfaced in rate-limit errors so callers can back off instead of hammering.
   */
  upstreamRetryAfterMs: number | null;
  /** True when the optional external provider was tried but yielded nothing. */
  externalFailed: boolean;
  /** Correlates every log line of one resolve (route requestId, null in tests). */
  requestId: string | null;
  /** Last reels_media HTTP status (null when never attempted). */
  reelsStatus: number | null;
  /**
   * True when an AUTHENTICATED (session-cookie) request was answered 401/403.
   * Anonymous 401s only prove the endpoint wants a session; an authed wall
   * proves Instagram is gating THIS client — only the latter (plus 429s,
   * which abort earlier) justifies a restriction verdict.
   */
  sawAuthedWall: boolean;
  /**
   * True once Instagram demanded interactive verification (checkpoint /
   * challenge / login_required) on an authenticated request. A challenge is a
   * session verdict — it must surface as an authentication failure, never as
   * "no active Story" or a generic discovery miss.
   */
  sawChallenge: boolean;
  /** Count from the last reels_media parse (null when never parsed). */
  lastParsedCount: number | null;
  /**
   * True when a 200 JSON tray response carried neither reels_media nor reels
   * keys — the parser cannot vouch for emptiness (structure unknown), so an
   * empty result must never be reported as "no active Story".
   */
  trayStructureUnknown: boolean;
  /** Last web_profile_info HTTP status (null when never attempted). */
  webProfileStatus: number | null;
  /** Last profile-HTML fetch HTTP status (null when never attempted). */
  profileHtmlStatus: number | null;
  /**
   * Whether any session material was configured when this resolve started.
   * Decides between "proven empty" (session verified live) and "cannot rule
   * out gating" (session present but never proven) for an empty tray.
   */
  sessionWasConfigured: boolean;
  /**
   * Profile-page HTML already fetched during user lookup. Strategy B reuses
   * it instead of requesting the same page twice — one fewer Instagram hit
   * per resolve, which matters for upstream throttle budgets. Null until a
   * non-login-wall profile page has actually been read.
   */
  cachedProfileHtml: { status: number; html: string } | null;
}

export function createStoryResolveState(): StoryResolveState {
  return {
    totalRequests: 0,
    apiRequests: 0,
    htmlRequests: 0,
    saw429: false,
    usedAuthenticatedRequest: false,
    exactStoryAttempted: false,
    rateLimited: false,
    startTime: Date.now(),
    sequence: 0,
    sawLoginWall: false,
    emptyShellCount: 0,
    userExists: false,
    privateHint: false,
    authedStatus: null,
    strategiesTried: [],
    browserAttempted: false,
    cachedProfileHtml: null,
    upstreamRetryAfterMs: null,
    externalFailed: false,
    requestId: null,
    reelsStatus: null,
    lastParsedCount: null,
    trayStructureUnknown: false,
    webProfileStatus: null,
    profileHtmlStatus: null,
    sawAuthedWall: false,
    sawChallenge: false,
    sessionWasConfigured: false,
  };
}

/**
 * MIME family default from verified media kind. The /api/stream layer always
 * re-verifies the upstream Content-Type; this default only labels the family
 * the metadata already proved (video_versions ⇒ video, image-only ⇒ image).
 */
function withMimeDefault(media: MediaItem): MediaItem {
  if (!media.mimeType) {
    media.mimeType = media.type === "video" ? "video/mp4" : "image/jpeg";
  }
  return media;
}

/**
 * Media-level rejection with the responsible stage in the message. Profile
 * pictures, avatars, thumbnails and HEIC placeholders die here — the
 * FETCH_FAILED code (not "no story") tells the caller the Story pipeline
 * found bytes it refuses to mislabel.
 */
function mediaNotUsable(stage: string, detail: string): AppError {
  return new AppError("FETCH_FAILED", `Story request failed during ${stage}: ${detail}`, 404);
}

/**
 * Session verdict for [STORY] diagnostics. Names/counts only — never values.
 * "applied" means a cookie was attached; "accepted/rejected/unknown" reflects
 * what Instagram answered on authenticated requests (null = none attempted).
 */
function logStorySessionStatus(stage: string, state: StoryResolveState): void {
  // Effective lifecycle state from the shared session module (variable NAME
  // only — values never reach logs). While quarantined, configured stays
  // true but usable is false, so every consumer degrades together.
  const session = getSessionState();
  const verdict =
    state.authedStatus === null
      ? "unknown"
      : state.authedStatus === 200
        ? "accepted"
        : state.authedStatus === 401 || state.authedStatus === 403
          ? "rejected"
          : "unknown";
  logger.info("[IG_SESSION]", {
    stage,
    configured: session.configured,
    state: session.state,
    source: session.source,
    validated: session.validated,
  });
  logger.info("[STORY] session status", {
    stage,
    configured: session.configured,
    usable: session.usable,
    applied: state.usedAuthenticatedRequest,
    verdict,
  });
  logger.info("[STORY] session applied", {
    stage,
    applied: state.usedAuthenticatedRequest,
  });
}

/**
 * One-line access snapshot for restricted/rate-limited outcomes. Names and
 * counts only — never URLs, cookies, or session values.
 */
function logStoryAccess(state: StoryResolveState, status: string | null): void {
  logger.info("[STORY_ACCESS]", {
    status,
    rateLimited: state.rateLimited,
    restricted: state.sawLoginWall,
    loginWall: state.sawLoginWall,
    challenge: state.sawChallenge,
    retryAfterMs: state.upstreamRetryAfterMs,
  });
  logger.info("[STORY] rateLimited", { rateLimited: state.rateLimited });
}

/**
 * Terminal branch trace: exactly which condition ended the resolve, with the
 * route requestId for correlation. Scalars and counts only — never URLs,
 * cookies, or session values.
 */
function traceStoryError(
  state: StoryResolveState,
  input: {
    stage: string;
    errorCode: string;
    reason: string;
    httpStatus?: number | null;
    storyCount?: number | null;
    mediaCount?: number | null;
  }
): void {
  logger.info("[STORY_ERROR_TRACE]", {
    requestId: state.requestId,
    stage: input.stage,
    errorCode: input.errorCode,
    reason: input.reason,
    httpStatus: input.httpStatus ?? null,
    loginWall: state.sawLoginWall,
    challenge: state.sawChallenge,
    profileStatus: state.webProfileStatus,
    storyLookupStatus: state.reelsStatus,
    storyCount: input.storyCount ?? state.lastParsedCount,
    mediaCount: input.mediaCount ?? null,
  });
}

/**
 * The single constructor for chain-level rate-limit errors: always carries
 * the upstream Retry-After when Instagram sent one, so routes can expose it
 * instead of clients guessing a backoff.
 */
function rateLimitedError(state: StoryResolveState): AppError {
  const retryAfterSeconds =
    typeof state.upstreamRetryAfterMs === "number"
      ? Math.max(1, Math.round(state.upstreamRetryAfterMs / 1000))
      : null;
  return new AppError(
    "RATE_LIMITED",
    "Instagram is temporarily rate-limiting requests. Please try again later.",
    429,
    retryAfterSeconds !== null ? { upstreamRetryAfterSeconds: retryAfterSeconds } : undefined
  );
}

function shouldBlockApiRequest(state: StoryResolveState): boolean {
  return state.rateLimited;
}

function markRateLimited(state: StoryResolveState): void {
  state.rateLimited = true;
  state.saw429 = true;
}

function logStorySummary(state: StoryResolveState, extra?: Record<string, unknown>): void {
  logger.info("[story-resolve] request summary", {
    totalRequests: state.totalRequests,
    apiRequests: state.apiRequests,
    htmlRequests: state.htmlRequests,
    saw429: state.saw429,
    usedAuthenticatedRequest: state.usedAuthenticatedRequest,
    exactStoryAttempted: state.exactStoryAttempted,
    rateLimited: state.rateLimited,
    ...extra,
  });
}

// ---------------------------------------------------------------------------
// Server-side Instagram session + request wiring: the single shared session
// implementation lives in ./instagram-session.js and the single shared
// request client (headers, session validation, transient-only retries,
// challenge detection) lives in ./instagram-client.js. A quarantined
// (proven-dead) session reads as unconfigured, so fetch headers, the browser
// jar, and all gating flags degrade to anonymous together — one bad session
// can never poison public Story resolution, and no code path can re-attach
// it while quarantined. There is exactly one authentication implementation:
// everything below delegates to it (historic local names are kept so every
// call site is untouched).
// ---------------------------------------------------------------------------
function buildHeaders(opts: { includeCookie?: boolean; useDesktop?: boolean } = {}): Record<string, string> {
  return buildInstagramHeaders(opts);
}

function buildHtmlHeaders(useDesktop = false): Record<string, string> {
  return buildInstagramHtmlHeaders(useDesktop);
}

async function fetchJsonWithStatus(
  url: string,
  tag: string,
  opts: { includeCookie?: boolean; state?: StoryResolveState; useDesktop?: boolean } = {}
): Promise<{ status: number; json: unknown | null; textSnippet: string | null; contentType: string | null; bodyLength: number }> {
  // Rate-limit guard: do not make another API request after 429
  if (opts.state && shouldBlockApiRequest(opts.state)) {
    logger.warn(`[story-resolve] blocked API request due to prior 429`, { tag, endpoint: tag });
    throw new AppError("RATE_LIMITED", "Instagram is temporarily rate-limiting requests. Please try again later.", 429);
  }
  const seq = opts.state ? opts.state.sequence + 1 : 0;
  try {
    const result = await fetchInstagramJson(url, tag, {
      includeCookie: opts.includeCookie,
      state: opts.state,
      useDesktop: opts.useDesktop,
    });
    // Safe diagnostic log: endpoint, status, public/authenticated, sequence,
    // JSON present (values never logged). The client already emitted the
    // [STORY] Instagram response status line; this preserves the historic
    // per-request trace shape.
    logger.info(`[story-resolve] request #${seq} ${tag} status=${result.status}`, {
      endpoint: tag,
      status: result.status,
      public: !opts.includeCookie,
      authenticated: Boolean(opts.includeCookie),
      sequence: seq,
      hasJson: Boolean(result.json),
      saw429: result.status === 429,
    });
    if (result.status === 429 && opts.state) {
      logger.info("[STORY_RETRY]", {
        attempt: `api-${tag}`,
        reason: "http-429",
        willRetry: false,
        retryAfterMs: opts.state.upstreamRetryAfterMs,
      });
    }
    return result;
  } catch (err) {
    if (err instanceof AppError) {
      // Challenge demands already set state.sawChallenge inside the client
      // before throwing — nothing to record here. Every AppError propagates
      // with its own distinct code (no catch-all remapping).
      throw err;
    }
    const msg = err instanceof Error ? err.name : "fetch-failed";
    logger.warn(`[story-resolve] ${tag} fetch failed`, { error: msg, sequence: seq });
    throw storyFetchFailed(tag, `Instagram did not respond (${msg}). Please try again shortly.`);
  }
}

async function fetchHtmlWithStatus(
  url: string,
  tag: string,
  state?: StoryResolveState,
  useDesktop: boolean = false
): Promise<{ status: number | null; html: string | null; finalUrl: string | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const start = Date.now();
  const seq = state ? ++state.sequence : 0;
  if (state) {
    state.totalRequests++;
    state.htmlRequests++;
  }
  try {
    const res = await fetch(url, {
      headers: buildHtmlHeaders(useDesktop),
      signal: controller.signal,
      redirect: "follow",
    });
    const status = res.status;
    const ct = res.headers.get("content-type") || "";
    const finalUrl = res.url || url;
    const elapsed = Date.now() - start;
    if (!res.ok || (!ct.includes("text/html") && !ct.includes("application/xhtml") && !ct.includes("text/plain"))) {
      await res.body?.cancel().catch(() => {});
      logger.info(`[story-resolve] request #${seq} ${tag} status=${status}`, {
        endpoint: tag,
        status,
        public: true,
        sequence: seq,
        elapsedMs: elapsed,
        hasJson: false,
        isHtml: false,
        responseContentType: ct ? ct.split(";")[0].trim().toLowerCase() : null,
      });
      return { status, html: null, finalUrl };
    }
    const html = await res.text();
    // Per-stage diagnostics: status, duration, content type and the first 300
    // chars of the raw body. Page HTML is Instagram's response — request
    // cookies/credentials never appear here or in any log.
    logger.info("[STORY] page response", {
      endpoint: tag,
      status,
      elapsedMs: Date.now() - start,
      responseContentType: ct ? ct.split(";")[0].trim().toLowerCase() : null,
      bodySnippet: bodySnippet(html),
      bodyLength: html.length,
    });
    return { status, html, finalUrl };
  } catch (err) {
    const msg = err instanceof Error ? err.name : "fetch-failed";
    logger.warn(`[story-resolve] ${tag} html fetch failed`, { error: msg, sequence: seq });
    return { status: null, html: null, finalUrl: null };
  } finally {
    clearTimeout(timer);
  }
}

const STORY_USERNAME_RE = /^[a-zA-Z0-9._]{1,30}$/;
const STORY_RESERVED_SINGLE = new Set([
  "accounts",
  "direct",
  "explore",
  "stories",
  "story",
  "s",
  "reel",
  "reels",
  "p",
  "tv",
  "about",
  "developer",
  "embed",
]);

/**
 * A leading "@" is display decoration, never part of the username
 * (`instagram.com/@user/`, `/stories/@user/123/`). Stripped before matching
 * so pasted handle links resolve to the same user.
 */
export function stripAtPrefix(value: string): string {
  return value.startsWith("@") ? value.slice(1) : value;
}

export function parseStoryUrl(url: string): { username: string; storyId: string | null; highlightId: string | null } {
  const parsed = new URL(url);
  // Query strings (?igsh=…, ?utm_…) never identify the resource — the path
  // does. Trailing slashes produce no segments via the filter below.
  const segments = parsed.pathname.split("/").filter(Boolean);
  const first = segments[0]?.toLowerCase();
  // /stories/USERNAME/ (profile) and /stories/USERNAME/STORY_ID/ (direct),
  // plus singular /story/ variant which Instagram also serves.
  if (first === "stories" || first === "story") {
    if (segments[1]?.toLowerCase() === "highlights") {
      return { username: "", storyId: null, highlightId: segments[2] || null };
    }
    const username = stripAtPrefix(segments[1] || "");
    const storyId = segments[2] || null;
    return { username, storyId, highlightId: null };
  }
  // Bare profile URL (/USERNAME/) used for public story lookup: the single
  // segment is the username, there is never a Story ID.
  if (segments.length === 1 && !STORY_RESERVED_SINGLE.has(first ?? "")) {
    const candidate = stripAtPrefix(segments[0]);
    if (candidate && STORY_USERNAME_RE.test(candidate)) {
      return { username: candidate, storyId: null, highlightId: null };
    }
  }
  throw new AppError("UNSUPPORTED_URL", "This is not a Story URL.", 400);
}

export function extractUserIdFromWebProfileInfo(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const obj = json as Record<string, unknown>;
  const data = obj["data"] as unknown;
  if (data && typeof data === "object") {
    const user = (data as Record<string, unknown>)["user"] as unknown;
    if (user && typeof user === "object") {
      const id = (user as Record<string, unknown>)["id"];
      if (typeof id === "string" && id) return id;
      if (typeof id === "number") return String(id);
    }
  }
  const directUser = obj["user"] as unknown;
  if (directUser && typeof directUser === "object") {
    const id = (directUser as Record<string, unknown>)["id"];
    if (typeof id === "string" && id) return id;
    if (typeof id === "number") return String(id);
  }
  return null;
}

export function extractIsPrivateFromWebProfileInfo(json: unknown): boolean | null {
  if (!json || typeof json !== "object") return null;
  const obj = json as Record<string, unknown>;
  const data = obj["data"] as unknown;
  const user = data && typeof data === "object" ? (data as Record<string, unknown>)["user"] as unknown : null;
  const candidate =
    (user && typeof user === "object" ? (user as Record<string, unknown>)["is_private"] : null) ??
    (obj["user"] && typeof obj["user"] === "object"
      ? ((obj["user"] as Record<string, unknown>)["is_private"] as unknown)
      : null);
  if (typeof candidate === "boolean") return candidate;
  return null;
}

// ---------------------------------------------------------------------------
// Public fallbacks (no cookie) — HTML scraping for userId and Story media
// These are lightweight, Vercel-compatible (pure fetch + regex), and attempt
// legitimate public extraction before concluding Instagram requires auth.
// ---------------------------------------------------------------------------

function extractUserIdFromHtml(html: string): string | null {
  // Try multiple patterns Instagram embeds for public profiles
  const patterns: RegExp[] = [
    /"user_id"\s*:\s*"(\d+)"/,
    /"userId"\s*:\s*"(\d+)"/,
    /"profilePage_(\d+)"/,
    /"logging_page_id"\s*:\s*"profilePage_(\d+)"/,
    /"id"\s*:\s*"(\d+)"\s*,\s*"username"\s*:/,
    /instagram\.com\/(?:p|reel)\/[^"]*?"owner".*?"id"\s*:\s*"(\d+)"/s,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1]) return m[1];
  }
  // JSON-LD or meta: look for user id in script tags
  const scriptMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
  if (scriptMatch) {
    const inner = scriptMatch[1];
    const idMatch = inner.match(/"identifier"\s*:\s*"(\d+)"/);
    if (idMatch) return idMatch[1];
  }
  return null;
}

function looksLikeLoginWall(html: string): boolean {
  return (
    html.includes("Log in to Instagram") ||
    html.includes('name="username"') ||
    html.includes("loginForm") ||
    html.includes('"requireLogin":true') ||
    html.includes("We limit how often you can do certain things on Instagram")
  );
}

function isProfileImageUrl(url: string): boolean {
  try {
    const u = new URL(url.replace(/\\u0026/g, "&").replace(/\\\//g, "/").replace(/&amp;/g, "&"));
    const p = u.pathname.toLowerCase();
    const s = (u.search + u.hash).toLowerCase();
    if (p.includes("s150x150") || p.includes("s320x320") || p.includes("s640x640")) {
      // Story media is 1080x1920, profile is 150/320; but ensure not false positive for story thumbnails that happen to contain s150?
      // Profile shard 19 is definitive
      if (p.includes("-19/") || p.includes("profile") || p.includes("avatar")) return true;
      // Also if URL explicitly contains profile_pic
      if (p.includes("profile_pic") || p.includes("profile_picture")) return true;
      // Generic small s150/s320 without -19 still likely profile when dimensions are small
      if (s.includes("150x150") || s.includes("320x320")) return true;
    }
    if (p.includes("profile_pic") || p.includes("profile_picture") || p.includes("avatar")) return true;
    if (/\/t51\.[^/]+-19\//.test(p)) return true;
    if (u.hostname.includes("scontent") && (p.includes("/150/") || p.includes("/320/"))) return true;
    return false;
  } catch {
    return false;
  }
}

function isProbablyProfileMedia(media: MediaItem): boolean {
  if (isProfileImageUrl(media.url)) return true;
  if (media.width === 206 && media.height === 206) return true;
  if (media.type === "image" && media.width === 150 && media.height === 150) return true;
  if (media.type === "image" && media.width === 320 && media.height === 320) return true;
  // 7.6 KB avatar heuristic: very small file with small dimensions
  if (media.type === "image" && media.width && media.height && media.width <= 320 && media.height <= 320) {
    // Only reject if URL also looks like profile (to avoid rejecting small story thumbnails)
    if (isProfileImageUrl(media.url)) return true;
  }
  return false;
}

/**
 * Identify media from its leading bytes (magic/file signature), independent
 * of URL, extension, and query string. Same signature set the stream layer
 * uses, plus HEIC brands (which plain sniffers miss and browsers cannot
 * preview as video). Pure function — safe to unit test.
 */
export function detectStoryBytesContentType(bytes: Uint8Array): string | null {
  if (bytes.length >= 12) {
    const tag =
      String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]) === "ftyp"
        ? String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]).toLowerCase()
        : null;
    if (tag) {
      if (
        tag === "heic" || tag === "heix" || tag === "hevc" || tag === "hevx" ||
        tag === "heim" || tag === "heis" || tag === "hevm" || tag === "hevs" ||
        tag === "mif1" || tag === "msf1"
      ) {
        return "image/heic";
      }
      // Any other ftyp box (isom/mp41/dash/…) is an ISO-BMFF video container.
      return "video/mp4";
    }
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (bytes.length >= 6) {
    const gif = String.fromCharCode(...bytes.slice(0, 6));
    if (gif === "GIF87a" || gif === "GIF89a") return "image/gif";
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) === "RIFF" &&
    String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

/**
 * Fetch at most the first 64 KiB of a candidate and sniff its signature.
 * Single bounded request with its own short timeout; any failure returns
 * null so verification falls back to header evidence. Never used for
 * playback — only for type proof.
 */
async function sniffStoryHeadBytes(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": MOBILE_UA,
        Referer: "https://www.instagram.com/",
        Range: "bytes=0-65535",
        Accept: "*/*",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    if (!res.ok && res.status !== 206) {
      await res.body?.cancel().catch(() => {});
      return null;
    }
    const buf = new Uint8Array(await res.arrayBuffer().then((b) => b.slice(0, 65536)).catch(() => new ArrayBuffer(0)));
    await res.body?.cancel().catch(() => {});
    if (buf.length < 12) return null;
    return detectStoryBytesContentType(buf);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Verify a Story candidate against its real upstream bytes. HEAD
 * Content-Type decides when present; when it is missing or generic
 * (octet-stream), exactly one bounded ranged GET (first 64 KiB) is sniffed
 * for a magic signature instead of trusting the filename. Returns the
 * observed Content-Type (e.g. "video/mp4") so callers log and store the
 * verified MIME — or null when the upstream was unreachable (Instagram
 * sometimes blocks HEAD; profile safety already passed, so the candidate
 * stays usable but unconfirmed).
 */
async function validateStoryMedia(media: MediaItem): Promise<string | null> {
  if (isProbablyProfileMedia(media)) {
    throw mediaNotUsable("media-validation", "candidate is a profile/avatar image, not Story media.");
  }
  // SSRF guard: never probe private/reserved hosts, no matter which strategy
  // produced the candidate (external providers are not trusted with targets).
  try {
    if (isPrivateOrReservedHost(new URL(media.url).hostname.toLowerCase())) {
      logger.warn("[story-resolve] validateStoryMedia rejected unsafe host");
      throw mediaNotUsable("media-validation", "unsafe media host.");
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw mediaNotUsable("media-validation", "malformed media URL.");
  }
  // Verify Content-Type and that media is fetchable (Vercel-compatible HEAD)
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(media.url, {
      method: "HEAD",
      headers: {
        "User-Agent": MOBILE_UA,
        Referer: "https://www.instagram.com/",
        Accept: media.type === "video" ? "video/*,*/*;q=0.5" : "image/*,*/*;q=0.5",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    if (res.status === 404 || res.status === 410) {
      await res.body?.cancel().catch(() => {});
      throw new AppError("STORY_MEDIA_EXPIRED", "This Story media link has expired. Please try Get Media again.", 410);
    }
    if (res.status === 401 || res.status === 403) {
      await res.body?.cancel().catch(() => {});
      throw mediaNotUsable("media-validation", `media URL refused (HTTP ${res.status}).`);
    }
    let ct = (res.headers.get("content-type") || "").toLowerCase();
    const len = res.headers.get("content-length");
    const size = len ? parseInt(len, 10) : null;
    // Inconclusive headers (missing/generic) must not resolve to the
    // filename: sniff one bounded byte window instead. Exactly one extra
    // request, only on this path, so throttle budgets are unaffected.
    const inconclusive =
      !ct || ct.includes("application/octet-stream") || ct.includes("binary/octet-stream");
    let sniffed: string | null = null;
    if (inconclusive) {
      sniffed = await sniffStoryHeadBytes(media.url);
      if (sniffed) {
        logger.info("[story-resolve] validateStoryMedia byte-sniffed", {
          sniffed,
          cdn: redactMediaUrl(media.url),
        });
        ct = sniffed;
      }
    }
    // For video Story, must be video/* and not profile image
    if (media.type === "video" && ct && !ct.includes("video/") && !ct.includes("application/octet-stream")) {
      logger.warn("[story-resolve] validateStoryMedia Content-Type mismatch for video", { ct, cdn: redactMediaUrl(media.url) });
      throw mediaNotUsable("media-validation", "video candidate has a non-video Content-Type.");
    }
    if (media.type === "image" && ct && !ct.includes("image/") && !ct.includes("application/octet-stream")) {
      logger.warn("[story-resolve] validateStoryMedia Content-Type mismatch for image", { ct });
      throw mediaNotUsable("media-validation", "image candidate has a non-image Content-Type.");
    }
    // File size sanity: avatar is 7.6KB, story video is typically >100KB
    if (size !== null && size > 0 && size < 5000) {
      logger.warn("[story-resolve] validateStoryMedia suspicious small size", { size });
      throw mediaNotUsable("media-validation", "suspiciously small file (avatar-sized).");
    }
    // Dimensions: story video is typically 1080x1920 (9:16), not 206x206
    if (media.width && media.height && media.width <= 320 && media.height <= 320 && media.type === "video") {
      throw mediaNotUsable("media-validation", "video dimensions look like an avatar, not a Story.");
    }
    await res.body?.cancel().catch(() => {});
    // Final HTML sniff: a 200 with text/html is a login/error page, not media.
    if (ct.includes("text/html")) {
      throw mediaNotUsable("media-validation", "URL serves HTML (login/error page), not media.");
    }
    const observed = ct ? ct.split(";")[0].trim() : null;
    // [STORY] media Content-Type — observed upstream MIME (never the URL).
    logger.info("[STORY] media Content-Type", {
      contentType: observed,
      mediaType: media.type,
      width: media.width,
      height: media.height,
    });
    return observed;
  } catch (err) {
    if (err instanceof AppError) throw err;
    // Network/head failure → log but don't hard fail if media was already extracted with profile safety
    const msg = err instanceof Error ? err.name : String(err);
    if (msg === "AbortError") logger.warn("[story-resolve] validateStoryMedia timeout", { cdn: redactMediaUrl(media.url) });
    // Allow through if HEAD fails but media passed profile checks (Instagram CDN may block HEAD)
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function resolveUserIdPublic(username: string, state?: StoryResolveState): Promise<string | null> {
  if (!username) return null;
  if (state && state.rateLimited && state.htmlRequests >= 1) {
    logger.info("[story-resolve] blocked profile_html due to prior 429 and already tried HTML", { username, htmlRequests: state.htmlRequests });
    return null;
  }
  // Strategy 1: HTML scrape (no cookie) — works for public profiles without auth
  const profileUrl = `https://www.instagram.com/${encodeURIComponent(username)}/`;
  const { status, html } = await fetchHtmlWithStatus(profileUrl, "profile_html", state);
  if (state && status !== null) state.profileHtmlStatus = status;
  if (!html || !status || status >= 400) {
    logger.info("[story-resolve] profile_html not available", { username, status });
    return null;
  }
  if (looksLikeLoginWall(html)) {
    logger.info("[story-resolve] profile_html login wall", { username });
    return null;
  }
  // Cache the page for Strategy B: the same profile HTML is mined for Story
  // candidates later, and refetching it would double Instagram traffic.
  if (state && !state.cachedProfileHtml) {
    state.cachedProfileHtml = { status, html };
  }
  const id = extractUserIdFromHtml(html);
  if (id) {
    logger.info("[story-resolve] userId via html", { username, userId: id });
    return id;
  }
  logger.info("[story-resolve] userId not found in html", { username, htmlLength: html.length });
  return null;
}

async function resolveUserId(username: string, state?: StoryResolveState): Promise<string> {
  if (!username) throw new AppError("VALIDATION_ERROR", "Story username is missing in the URL.", 400);
  if (state && shouldBlockApiRequest(state)) {
    throw rateLimitedError(state);
  }

  // Attempt 1: Public API (single attempt, respects rate-limit state).
  // Username → user ID + privacy flag via the canonical API host, with the
  // existing authenticated client (X-IG-App-ID, UA, X-CSRFToken, Referer).
  const profileUrl = webProfileInfoUrl(username);
  const publicResult = await fetchJsonWithStatus(profileUrl, "web_profile_info", { includeCookie: false, state });
  if (state) state.webProfileStatus = publicResult.status;

  if (publicResult.status === 200 && publicResult.json) {
    const userId = extractUserIdFromWebProfileInfo(publicResult.json);
    if (userId) {
      logger.info("[STORY] private status", {
        username,
        isPrivate: extractIsPrivateFromWebProfileInfo(publicResult.json),
      });
      logger.info("[story-resolve] userId via public api", { username, userId });
      return userId;
    }
  }

  if (publicResult.status === 404) {
    throw new AppError("USER_NOT_FOUND", `Instagram user "@${username}" was not found.`, 404);
  }
  if (publicResult.status === 429) {
    if (state) {
      markRateLimited(state);
      // Allow single HTML fallback even after 429
      const htmlId = await resolveUserIdPublic(username, state);
      if (htmlId) return htmlId;
      logStorySummary(state, { reason: "userId_429", username });
      throw rateLimitedError(state);
    }
    throw new AppError("RATE_LIMITED", "Instagram is temporarily rate-limiting requests. Please try again later.", 429);
  }
  if (publicResult.status === 410) {
    throw new AppError("NO_STORY", "This Story has expired. Stories are only available for 24 hours.", 410);
  }

  // If public API returned 401/403 or login wall HTML, try HTML fallback before concluding auth required
  if (publicResult.status === 401 || publicResult.status === 403 || (publicResult.textSnippet && looksLikeLoginWall(publicResult.textSnippet))) {
    if (state) state.sawLoginWall = true;
    logger.info("[story-resolve] public api requires auth, trying html fallback", { username, status: publicResult.status, hasCookie: isInstagramCookieConfigured() });
    // HTML fallback is allowed even after prior 429 (state.htmlRequests <1 ensures single)
    const htmlId = await resolveUserIdPublic(username, state);
    if (htmlId) return htmlId;

    // Only try authenticated API if cookie is configured and not rate-limited
    if (isInstagramCookieConfigured() && state && !shouldBlockApiRequest(state)) {
      const authedResult = await fetchJsonWithStatus(profileUrl, "web_profile_info", { includeCookie: true, state });
      if (authedResult.status === 200 && authedResult.json) {
        const authedId = extractUserIdFromWebProfileInfo(authedResult.json);
        if (authedId) {
          logger.info("[story-resolve] userId via authed api", { username });
          return authedId;
        }
      }
      if (authedResult.status === 401 || authedResult.status === 403) {
        const isPrivate = authedResult.json ? extractIsPrivateFromWebProfileInfo(authedResult.json) : null;
        logger.info("[STORY] private status", { username, isPrivate });
        if (isPrivate === true) {
          throw new AppError("PRIVATE_ACCOUNT", "Private account — Story unavailable.", 403);
        }
        throw new AppError("SESSION_EXPIRED", "Instagram session expired or requires verification.", 401);
      }
      if (authedResult.status === 429) {
        if (state) markRateLimited(state);
        throw rateLimitedError(state!);
      }
    } else if (isInstagramCookieConfigured() && state && shouldBlockApiRequest(state)) {
      throw rateLimitedError(state);
    }

    // After HTML fallback, if still no cookie, return generic public-access error (not cookie instruction)
    throw new AppError("PRIVATE_ACCOUNT", "Private account — Story unavailable.", 403);
  }

  if (publicResult.status >= 500) {
    throw new AppError("FETCH_FAILED", `Story request failed during user-lookup: Instagram answered HTTP ${publicResult.status}. Please try again shortly.`, 502);
  }

  if (!publicResult.json) {
    const snippet = publicResult.textSnippet || "";
    if (looksLikeLoginWall(snippet)) {
      const htmlId = await resolveUserIdPublic(username, state);
      if (htmlId) return htmlId;
      throw new AppError("PRIVATE_ACCOUNT", "Private account — Story unavailable.", 403);
    }
    const htmlId = await resolveUserIdPublic(username, state);
    if (htmlId) return htmlId;
    throw new AppError("FETCH_FAILED", "Story request failed during user-lookup: Instagram returned an unexpected response while looking up the user.", 502);
  }

  const fallbackId = extractUserIdFromWebProfileInfo(publicResult.json);
  if (fallbackId) return fallbackId;

  const htmlId = await resolveUserIdPublic(username, state);
  if (htmlId) return htmlId;

  logger.warn("[story-resolve] userId not found via any public method", {
    username,
    keys: publicResult.json && typeof publicResult.json === "object" ? Object.keys(publicResult.json as Record<string, unknown>).slice(0, 8) : [],
  });
  throw new AppError("USER_NOT_FOUND", `Could not resolve Instagram user "@${username}".`, 404);
}

function bestVideoCandidate(candidates: unknown[]): { url: string; width: number | null; height: number | null } | null {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  let best: Record<string, unknown> | null = null;
  let bestArea = -1;
  for (const c of candidates) {
    if (!c || typeof c !== "object") continue;
    const url = (c as Record<string, unknown>)["url"];
    if (typeof url !== "string" || !url.startsWith("http")) continue;
    const w = (c as Record<string, unknown>)["width"];
    const h = (c as Record<string, unknown>)["height"];
    const area = typeof w === "number" && typeof h === "number" ? w * h : 0;
    if (area > bestArea) {
      bestArea = area;
      best = c as Record<string, unknown>;
    }
  }
  if (!best) return null;
  return {
    url: best["url"] as string,
    width: typeof best["width"] === "number" ? (best["width"] as number) : null,
    height: typeof best["height"] === "number" ? (best["height"] as number) : null,
  };
}

function bestImageCandidate(candidates: unknown[]): { url: string; width: number | null; height: number | null } | null {
  return bestVideoCandidate(candidates);
}

export function parseReelsMediaResponse(json: unknown): Array<Record<string, unknown>> {
  if (!json || typeof json !== "object") return [];
  const obj = json as Record<string, unknown>;
  const reelsMedia = obj["reels_media"];
  if (Array.isArray(reelsMedia)) {
    const out: Array<Record<string, unknown>> = [];
    for (const reel of reelsMedia) {
      if (!reel || typeof reel !== "object") continue;
      const items = (reel as Record<string, unknown>)["items"];
      if (Array.isArray(items)) {
        for (const it of items) if (it && typeof it === "object") out.push(it as Record<string, unknown>);
      } else if (Array.isArray((reel as Record<string, unknown>)["media"])) {
        for (const it of (reel as Record<string, unknown>)["media"] as unknown[]) if (it && typeof it === "object") out.push(it as Record<string, unknown>);
      }
    }
    if (out.length > 0) return out;
  }
  const reels = obj["reels"];
  if (reels && typeof reels === "object" && !Array.isArray(reels)) {
    const out: Array<Record<string, unknown>> = [];
    for (const v of Object.values(reels as Record<string, unknown>)) {
      if (!v || typeof v !== "object") continue;
      const items = (v as Record<string, unknown>)["items"];
      if (Array.isArray(items)) for (const it of items) if (it && typeof it === "object") out.push(it as Record<string, unknown>);
    }
    if (out.length > 0) return out;
  }
  const data = obj["data"];
  if (data && typeof data === "object") {
    const nested = parseReelsMediaResponse(data);
    if (nested.length > 0) return nested;
  }
  return [];
}

function itemMatchesStoryId(item: Record<string, unknown>, storyId: string): boolean {
  const storyIdStr = String(storyId);
  const pk = item["pk"];
  const id = item["id"];
  const code = item["code"];
  // Keep every Instagram ID as string end-to-end (BigInt-safe)
  if (pk !== undefined && pk !== null && String(pk) === storyIdStr) return true;
  if (typeof id === "string") {
    const idStr = String(id);
    if (idStr === storyIdStr) return true;
    if (idStr.startsWith(storyIdStr + "_")) return true;
    // storyId may be "pk_userId" form, compare first part
    if (storyIdStr.includes("_") && idStr === storyIdStr.split("_")[0]) return true;
    // Also handle id like "3992734228823635460_73083148841" where pk is first part
    const idFirst = idStr.split("_")[0];
    if (idFirst === storyIdStr) return true;
  }
  if (typeof code === "string" && String(code) === storyIdStr) return true;
  return false;
}

export function extractStoryMediaItem(
  item: Record<string, unknown>,
  fallbackUsername: string
): { media: MediaItem; title: string | null; author: Author } {
  const username = fallbackUsername;
  let mediaType: "video" | "image" = "image";
  let mediaUrl: string | null = null;
  let width: number | null = null;
  let height: number | null = null;
  let thumbnail: string | null = null;
  let duration: number | null = null;
  const videoVersions = item["video_versions"];
  if (Array.isArray(videoVersions) && videoVersions.length > 0) {
    const best = bestVideoCandidate(videoVersions);
    if (best) {
      // Safety: never treat profile video as story (should not happen, but guard)
      if (isProfileImageUrl(best.url)) {
        throw mediaNotUsable("media-extraction", "video candidate is a profile/avatar URL.");
      }
      mediaType = "video";
      mediaUrl = best.url;
      width = best.width;
      height = best.height;
    }
    const imageVersions2 = item["image_versions2"] as unknown;
    if (imageVersions2 && typeof imageVersions2 === "object") {
      const cands = (imageVersions2 as Record<string, unknown>)["candidates"];
      if (Array.isArray(cands)) {
        const imgBest = bestImageCandidate(cands);
        if (imgBest) thumbnail = imgBest.url;
      }
    }
    const dur = item["video_duration"];
    if (typeof dur === "number" && Number.isFinite(dur)) duration = dur;
    else if (typeof item["duration"] === "number") duration = item["duration"] as number;
  } else {
    // No video_versions — check other video indicators before treating as image (Highlight videos often use video_url/playback_url)
    let isVideo = false;
    const checkVideoFields: Array<unknown> = [
      item["video_url"],
      item["playback_url"],
      item["video_dash_manifest"],
      item["dash_manifest"],
    ];
    for (const vf of checkVideoFields) {
      if (typeof vf === "string" && vf.startsWith("http") && !isProfileImageUrl(vf)) {
        // Direct video URL field (e.g., video_url, playback_url)
        if (vf.includes(".mp4") || vf.includes("video") || vf.includes("fbcdn") || vf.includes("cdninstagram")) {
          isVideo = true;
          mediaType = "video";
          mediaUrl = vf;
          // Try to get dimensions from item if available
          width = typeof item["width"] === "number" ? (item["width"] as number) : width;
          height = typeof item["height"] === "number" ? (item["height"] as number) : height;
          break;
        }
      }
    }
    // Check media_type / is_video flags and url with mp4
    if (!mediaUrl) {
      const mediaTypeVal = item["media_type"];
      const isVideoFlag = item["is_video"] === true || item["is_video"] === 1 || mediaTypeVal === 2 || mediaTypeVal === "video" || mediaTypeVal === "VIDEO";
      if (isVideoFlag) {
        // Look for any mp4 URL in the item
        for (const key of ["url", "src", "video_url", "playback_url", "download_url"]) {
          const v = item[key];
          if (typeof v === "string" && v.includes(".mp4") && !isProfileImageUrl(v)) {
            isVideo = true;
            mediaType = "video";
            mediaUrl = v;
            break;
          }
        }
        // Also check nested video_versions alternative already handled, but check url field
        if (!mediaUrl && typeof item["url"] === "string" && item["url"].includes("cdn") && !isProfileImageUrl(item["url"] as string)) {
          // If is_video true but no mp4 found, still treat as video and try display_url as fallback? No, keep as video with display_url as thumbnail, but need actual video url
          // Don't fallback to display_url for video — keep searching
        }
      }
    }
    if (!mediaUrl) {
      // No video found — treat as image
      const imageVersions2 = item["image_versions2"] as unknown;
      if (imageVersions2 && typeof imageVersions2 === "object") {
        const cands = (imageVersions2 as Record<string, unknown>)["candidates"];
        if (Array.isArray(cands)) {
          const best = bestImageCandidate(cands);
          if (best) {
            // Validate not profile before using
            if (!isProfileImageUrl(best.url)) {
              mediaUrl = best.url;
              width = best.width;
              height = best.height;
            }
          }
        }
      }
      // Only use display_url/thumbnail_src as image media if no video was detected
      // Never use thumbnail/profile as downloadUrl when video exists — that was the bug
      if (!mediaUrl && !isVideo && typeof item["display_url"] === "string" && !isProfileImageUrl(item["display_url"] as string)) {
        mediaUrl = item["display_url"] as string;
        width = typeof item["width"] === "number" ? (item["width"] as number) : null;
        height = typeof item["height"] === "number" ? (item["height"] as number) : null;
      }
      if (!mediaUrl && !isVideo && typeof item["thumbnail_src"] === "string" && !isProfileImageUrl(item["thumbnail_src"] as string)) {
        mediaUrl = item["thumbnail_src"] as string;
      }
      if (!mediaUrl && !isVideo && typeof item["thumbnail_url"] === "string" && !isProfileImageUrl(item["thumbnail_url"] as string)) {
        mediaUrl = item["thumbnail_url"] as string;
      }
      // If we detected isVideo but still no mediaUrl, don't fall back to image thumbnail — fail instead
      if (isVideo && !mediaUrl) {
        throw mediaNotUsable("media-extraction", "video URL not found — a thumbnail would be wrong, failing instead.");
      }
    }
  }
  if (!mediaUrl) throw mediaNotUsable("media-extraction", "Instagram did not expose a downloadable media URL for this Story item.");
  // Critical safety: NEVER use profile/avatar as Story media
  if (isProfileImageUrl(mediaUrl)) {
    throw mediaNotUsable("media-extraction", "candidate is a profile/avatar URL, not Story media.");
  }
  const media: MediaItem = {
    url: mediaUrl.replace(/&amp;/g, "&"),
    type: mediaType,
    width,
    height,
    duration,
    thumbnail: thumbnail ? thumbnail.replace(/&amp;/g, "&") : null,
    format: mediaType === "video" ? "mp4" : "jpg",
  };
  if (isProbablyProfileMedia(media)) {
    throw mediaNotUsable("media-extraction", "candidate looks like profile/avatar media, not a Story.");
  }
  let title: string | null = null;
  const caption = item["caption"];
  if (caption && typeof caption === "object") {
    const text = (caption as Record<string, unknown>)["text"];
    if (typeof text === "string" && text.trim()) title = decodeHtmlEntities(text.trim());
  }
  if (!title && typeof item["accessibility_caption"] === "string") title = decodeHtmlEntities(item["accessibility_caption"] as string);
  const author: Author = { username, displayName: null };
  const user = item["user"];
  if (user && typeof user === "object") {
    const u = user as Record<string, unknown>;
    if (typeof u["username"] === "string") author.username = u["username"] as string;
    if (typeof u["full_name"] === "string") author.displayName = decodeHtmlEntities(u["full_name"] as string);
  }
  return { media, title, author };
}

// Try to extract story media directly from HTML without API (public fallback)
// CRITICAL: Never return profile/avatar as Story media — and for exact Story ID, ONLY return media associated with THAT ID
function extractStoryMediaFromHtml(html: string, storyId: string | null): MediaItem | null {
  // For exact Story, search specifically around the requested storyId (10k window) — do NOT blindly take first JPG/MP4 on page
  if (storyId) {
    const idx = html.indexOf(storyId);
    if (idx !== -1) {
      const snippet = html.slice(Math.max(0, idx - 10000), idx + 10000);
      // Prefer structured JSON near the ID
      const videoNear = snippet.match(/"video_versions"\s*:\s*(\[[\s\S]*?\])(?=\s*,|\s*\})/);
      if (videoNear) {
        try {
          const arr = JSON.parse(videoNear[1]);
          const best = bestVideoCandidate(arr as unknown[]);
          if (best && !isProfileImageUrl(best.url)) {
            return { url: best.url.replace(/&amp;/g, "&"), type: "video", width: best.width, height: best.height, duration: null, thumbnail: null, format: "mp4" };
          }
        } catch {}
      }
      const imageNear = snippet.match(/"image_versions2"\s*:\s*\{\s*"candidates"\s*:\s*(\[[^\]]*\])/);
      if (imageNear) {
        try {
          const arr = JSON.parse(imageNear[1]);
          const best = bestImageCandidate(arr as unknown[]);
          if (best && !isProfileImageUrl(best.url)) {
            return { url: best.url.replace(/&amp;/g, "&"), type: "image", width: best.width, height: best.height, duration: null, thumbnail: null, format: "jpg" };
          }
        } catch {}
      }
      const vMatch = snippet.match(/https?:\/\/[^"']*\.mp4[^"']*/i);
      if (vMatch) {
        const url = vMatch[0].replace(/\\u0026/g, "&").replace(/\\\//g, "/").replace(/&amp;/g, "&");
        if (!isProfileImageUrl(url)) return { url, type: "video", width: null, height: null, duration: null, thumbnail: null, format: "mp4" };
      }
      const iMatch = snippet.match(/https?:\/\/[^"']*scontent[^"']*\.jpe?g[^"']*/i);
      if (iMatch) {
        const url = iMatch[0].replace(/\\u0026/g, "&").replace(/\\\//g, "/").replace(/&amp;/g, "&");
        if (!isProfileImageUrl(url)) return { url, type: "image", width: null, height: null, duration: null, thumbnail: null, format: "jpg" };
      }
      // storyId found but no media near it → do NOT fall back to generic first JPG/MP4 (would be wrong Story or profile)
      return null;
    }
    // storyId not in HTML at all → cannot safely extract exact Story via generic fallback
    return null;
  }

  // No storyId (username-only list case): generic extraction is allowed (used for Highlights fallback where we need any media)
  const videoMatch = html.match(/"video_versions"\s*:\s*(\[[\s\S]*?\])/);
  if (videoMatch) {
    try {
      const arr = JSON.parse(videoMatch[1]);
      const best = bestVideoCandidate(arr as unknown[]);
      if (best && !isProfileImageUrl(best.url)) return { url: best.url.replace(/&amp;/g, "&"), type: "video", width: best.width, height: best.height, duration: null, thumbnail: null, format: "mp4" };
    } catch {}
  }
  const imageMatch = html.match(/"image_versions2"\s*:\s*\{\s*"candidates"\s*:\s*(\[[^\]]*\])/);
  if (imageMatch) {
    try {
      const arr = JSON.parse(imageMatch[1]);
      const best = bestImageCandidate(arr as unknown[]);
      if (best && !isProfileImageUrl(best.url)) return { url: best.url.replace(/&amp;/g, "&"), type: "image", width: best.width, height: best.height, duration: null, thumbnail: null, format: "jpg" };
    } catch {}
  }
  const mp4Match = html.match(/https?:\/\/[^"']*?scontent[^"']*?\.mp4[^"']*/i);
  if (mp4Match) {
    const url = mp4Match[0].replace(/\\u0026/g, "&").replace(/\\\//g, "/").replace(/&amp;/g, "&");
    if (!isProfileImageUrl(url)) return { url, type: "video", width: null, height: null, duration: null, thumbnail: null, format: "mp4" };
  }
  const jpgMatch = html.match(/https?:\/\/[^"']*?scontent[^"']*?\.jpe?g[^"']*/i);
  if (jpgMatch) {
    const url = jpgMatch[0].replace(/\\u0026/g, "&").replace(/\\\//g, "/").replace(/&amp;/g, "&");
    if (!isProfileImageUrl(url)) return { url, type: "image", width: null, height: null, duration: null, thumbnail: null, format: "jpg" };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Strategy B/C: evidence-scored Story discovery from page/network data.
// A candidate is only usable when it carries at least one piece of Story
// evidence (story-structure context, reels/tray relationship, or 9:16 story
// dimensions) — never "first video/image found". Profile media, DASH
// segments, ads and unrelated CDN bytes are rejected before scoring.
// ---------------------------------------------------------------------------

export interface StoryScoredCandidate {
  url: string;
  type: "video" | "image";
  width: number | null;
  height: number | null;
  /** Why this candidate is believed to be Story media (evidence names). */
  evidence: string[];
  /** Higher wins; video outranks image at equal evidence. */
  score: number;
  // ── Provenance: where this candidate came from and what it is ──
  /** True when extracted from a video_versions block (never a thumbnail). */
  fromVideoVersions: boolean;
  /** True when captured from an intercepted video network response. */
  interceptedAsVideo: boolean;
  /** True when the URL is a thumbnail/poster/cover derivative. */
  isThumbnail: boolean;
  /** True for transcoded derivatives (HEIC transforms, dst-jpg rewrites). */
  isDerivative: boolean;
  /** Upstream Content-Type observed during verification (null until probed). */
  observedMime: string | null;
  /** Upstream Content-Length observed during verification (null if unknown). */
  contentLength: number | null;
  /** True once verification proved this candidate playable. */
  verified: boolean;
}

const STORY_CONTEXT_RE =
  /reels_media|reel_ids|story_tray|tray|story_viewer|viewer|story_bloks|bloks|reels_tray|highlights?/i;
const NEXT_DATA_RE =
  /<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i;
const RSC_PAYLOAD_RE =
  /self\.__next_f\.push\(\s*\[\s*1\s*,\s*"([\s\S]*?)"\s*\]\s*\)/gi;
const CDN_MEDIA_RE =
  /https?:\\?\/\\?\/[^"'\\\s]*?(?:cdninstagram|fbcdn|scontent)[^"'\\\s]*?\.(?:mp4|jpe?g)(?:[^"'\\\s]*)?/gi;

function cleanCdnUrl(raw: string): string {
  return raw.replace(/\\u0026/g, "&").replace(/\\\//g, "/").replace(/&amp;/g, "&");
}

function isDashSegmentLike(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.includes(".m4s") ||
    lower.includes(".mpd") ||
    lower.includes("dash") ||
    /seg-?\d+/.test(lower) ||
    /range=\d+-\d+/.test(lower) ||
    lower.includes("bytestart")
  );
}

/**
 * HEIC/HEIF transform URLs (e.g. `...heic?stp=dst-jpg...`) are Instagram image
 * transforms browsers cannot preview as video and often not even as images.
 * They are never a Story video — demote heavily so they only win when no
 * other representation exists.
 */
function isHeicLike(url: string): boolean {
  const path = url.split("?")[0].toLowerCase();
  return path.endsWith(".heic") || path.endsWith(".heif") || path.includes(".heic");
}

function isNineBySixteen(width: number | null, height: number | null): boolean {
  if (typeof width !== "number" || typeof height !== "number" || width <= 0 || height <= 0) return false;
  const ratio = width / height;
  return ratio > 0.45 && ratio < 0.68 && height >= 1000;
}

/**
 * Tight Story-tray markers. Unlike the broad page-level context check, these
 * only match actual tray/reels structures — a post-grid `image_versions2`
 * block must never earn Story evidence merely for existing.
 */
const STORY_TRAY_RE = /story_tray|reels_media|reel_ids|story_viewer/i;

/**
 * Internal Story media classification. Metadata and verified HTTP headers
 * decide — never the filename, extension, or CDN query string.
 *
 * - STORY_VIDEO: video_versions metadata or a verified video/* Content-Type.
 * - STORY_IMAGE: verified image/* Content-Type (any image family, incl. HEIC).
 * - STORY_UNKNOWN: an unverified derivative/thumbnail with no authoritative
 *   signal. Callers must keep searching, never ship it as the Story.
 */
export type StoryMediaKind = "STORY_VIDEO" | "STORY_IMAGE" | "STORY_UNKNOWN";

export function classifyStoryMediaKind(input: {
  fromVideoVersions: boolean;
  observedMime: string | null;
  kind: "video" | "image";
  isDerivative: boolean;
}): StoryMediaKind {
  const mime = (input.observedMime || "").toLowerCase();
  // Verified Content-Type always wins over every other signal.
  if (mime.startsWith("video/")) return "STORY_VIDEO";
  if (mime.startsWith("image/")) return "STORY_IMAGE";
  // Authoritative metadata without a probe yet.
  if (input.fromVideoVersions) return "STORY_VIDEO";
  // An unverified derivative proves nothing about the Story — not even when
  // its own filename looks like an image.
  if (input.isDerivative) return "STORY_UNKNOWN";
  return input.kind === "video" ? "STORY_VIDEO" : "STORY_IMAGE";
}

/**
 * True for image aspects no Story uses (3:4 iPhone shots, 1:1, 4:5, landscape).
 * Stories are 9:16; a 3:4 HEIC rendition is a post image, never Story media.
 * Videos are exempt (container dimensions vary; verification decides).
 */
function isNonStoryAspect(width: number | null, height: number | null): boolean {
  if (typeof width !== "number" || typeof height !== "number" || width <= 0 || height <= 0) return false;
  const ratio = width / height;
  return ratio > 0.7 || ratio < 0.4;
}

/**
 * Score one media URL found in page/network data. Returns null when the URL
 * must be rejected outright (profile, DASH segment, tiny rendition, or no
 * Story evidence at all). Pure function — safe to unit test.
 */
export function scoreStoryCandidate(
  rawUrl: string,
  context: string,
  opts: { width?: number | null; height?: number | null; kind?: "video" | "image" } = {}
): StoryScoredCandidate | null {
  const url = cleanCdnUrl(rawUrl);
  if (!/^https?:\/\//i.test(url)) return null;
  if (isProfileImageUrl(url)) return null;
  if (isDashSegmentLike(url)) return null;
  const width = opts.width ?? null;
  const height = opts.height ?? null;
  // Tiny renditions are avatars/thumbnails, never Story media.
  if (
    typeof width === "number" &&
    typeof height === "number" &&
    width <= 320 &&
    height <= 320
  ) {
    return null;
  }
  const kind: "video" | "image" =
    opts.kind ?? (/\.mp4/i.test(url.split("?")[0]) ? "video" : "image");
  const evidence: string[] = [];
  let score = 0;
  // Tray proximity is the only strong page signal. Note: bare
  // `image_versions2` is deliberately NOT scored — the extraction sites are
  // defined by that keyword, so counting it would let every post-grid image
  // award itself Story evidence (the exact HEIC-poster bug).
  if (STORY_TRAY_RE.test(context)) {
    evidence.push("story-context");
    score += 4;
  }
  if (/"reels"|"items"|video_versions/.test(context)) {
    evidence.push("reels-structure");
    score += 1;
  }
  if (isNineBySixteen(width, height)) {
    evidence.push("story-dimensions");
    score += 2;
  }
  if (kind === "image" && isNonStoryAspect(width, height)) {
    // 3:4 / 1:1 / 4:5 / landscape images are posts, never Stories.
    evidence.push("non-story-aspect");
    score -= 4;
  }
  if (kind === "video") {
    evidence.push("playable-video");
    score += 1;
  }
  // Page candidates must be tied to Story tray structures. Dimensions,
  // generic JSON keywords, or a bare video hint alone are not enough — that
  // is how post-grid images and clip cover frames became "Story media".
  if (!evidence.includes("story-context")) return null;
  const heic = kind === "image" && isHeicLike(url);
  if (heic) {
    // Preview-hostile transform: keep as last resort only.
    evidence.push("heic-penalty");
    score -= 5;
  }
  // Weak/negative totals (post-grid images, penalized transforms) never qualify.
  if (score < 1) return null;
  return {
    url,
    type: kind,
    width,
    height,
    evidence,
    score,
    fromVideoVersions: false,
    interceptedAsVideo: false,
    isThumbnail: heic,
    isDerivative: heic,
    observedMime: null,
    contentLength: null,
    verified: false,
  };
}

export interface StoryHtmlDiscovery {
  candidates: StoryScoredCandidate[];
  /** Distinct video/image counts for diagnostics. */
  videoCount: number;
  imageCount: number;
  /** True when the page carried any story markers at all. */
  storyMarkersFound: boolean;
  /** True when the page looks like an empty shell (no markers, no JSON). */
  emptyShell: boolean;
  /**
   * True when the page shows video evidence (video_versions blocks,
   * is_video/media_type flags, playback URLs) even if no scored video
   * candidate resulted. An image found on such a page is likely just the
   * video's poster — callers must prefer the browser fallback over it.
   */
  videoEvidencePresent: boolean;
  /** URLs seen but rejected by scoring (profile/DASH/evidence/score). */
  rejectedCount: number;
}

const VIDEO_EVIDENCE_RE =
  /video_versions|video_url|playback_url|playable_url|"is_video"\s*:\s*true|"media_type"\s*:\s*2|dash_manifest/i;
const STORY_MARKER_RE = /story_tray|reels_media|reel_ids|story_viewer/gi;

/**
 * Video evidence counts only near Story structures (tray/reels markers).
 * A video POST in the profile grid also emits video JSON — without this
 * window, any profile with a video post would wrongly veto a genuine
 * image Story found on the same page.
 */
function hasStoryScopedVideoEvidence(html: string): boolean {
  STORY_MARKER_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  let checked = 0;
  while ((m = STORY_MARKER_RE.exec(html)) !== null && checked < 20) {
    checked++;
    const at = m.index ?? 0;
    const window = html.slice(Math.max(0, at - 8000), at + 8000);
    VIDEO_EVIDENCE_RE.lastIndex = 0;
    if (VIDEO_EVIDENCE_RE.test(window)) return true;
  }
  return false;
}

/**
 * Discover Story candidates from a fetched page: embedded
 * video_versions/image_versions2 JSON, __NEXT_DATA__, RSC payloads, then raw
 * CDN URLs — each scored for Story evidence. Pure apart from no I/O.
 */
export function extractStoryCandidatesFromHtml(
  html: string,
  _username: string
): StoryHtmlDiscovery {
  const candidates: StoryScoredCandidate[] = [];
  const seen = new Set<string>();
  let rejectedCount = 0;
  const push = (c: StoryScoredCandidate | null): void => {
    if (!c) {
      rejectedCount++;
      return;
    }
    if (seen.has(c.url)) return;
    if (candidates.length >= 20) return;
    seen.add(c.url);
    candidates.push(c);
  };
  const storyMarkersFound =
    STORY_CONTEXT_RE.test(html) ||
    html.includes("video_versions") ||
    html.includes("image_versions2");

  // 1. Structured video_versions / image_versions2 blocks with local context.
  const vvRe = /"video_versions"\s*:\s*(\[[\s\S]*?\])(?=\s*,|\s*\})/g;
  let m: RegExpExecArray | null;
  while ((m = vvRe.exec(html)) !== null) {
    const at = m.index ?? 0;
    const context = html.slice(Math.max(0, at - 2000), at + 2000);
    try {
      const arr = JSON.parse(m[1]) as unknown[];
      for (const c of arr) {
        if (!c || typeof c !== "object") continue;
        const r = c as Record<string, unknown>;
        if (typeof r["url"] !== "string") continue;
        const scored = scoreStoryCandidate(r["url"], context, {
          width: typeof r["width"] === "number" ? (r["width"] as number) : null,
          height: typeof r["height"] === "number" ? (r["height"] as number) : null,
          kind: "video",
        });
        // A video_versions entry is authoritative video metadata — never a
        // thumbnail, whatever its filename looks like.
        if (scored) scored.fromVideoVersions = true;
        push(scored);
      }
    } catch {
      /* malformed block — next */
    }
    if (candidates.length >= 20) break;
  }
  const ivRe = /"image_versions2"\s*:\s*\{\s*"candidates"\s*:\s*(\[[^\]]*\])/g;
  while ((m = ivRe.exec(html)) !== null) {
    const at = m.index ?? 0;
    const context = html.slice(Math.max(0, at - 2000), at + 2000);
    try {
      const arr = JSON.parse(m[1]) as unknown[];
      for (const c of arr) {
        if (!c || typeof c !== "object") continue;
        const r = c as Record<string, unknown>;
        if (typeof r["url"] !== "string") continue;
        push(
          scoreStoryCandidate(r["url"], context, {
            width: typeof r["width"] === "number" ? (r["width"] as number) : null,
            height: typeof r["height"] === "number" ? (r["height"] as number) : null,
            kind: "image",
          })
        );
      }
    } catch {
      /* malformed block — next */
    }
    if (candidates.length >= 20) break;
  }

  // 2. __NEXT_DATA__ payload — walk it for reels/tray structures.
  const nextData = html.match(NEXT_DATA_RE);
  if (nextData) {
    try {
      const parsed = parseJsonBigInt(nextData[1]);
      const items = parseReelsMediaResponse(parsed);
      for (const item of items) {
        try {
          const { media } = extractStoryMediaItem(item, "");
          if (media.type !== "video" && media.type !== "image") continue;
          push(
            scoreStoryCandidate(media.url, "reels_media __NEXT_DATA__ reels items", {
              width: media.width,
              height: media.height,
              kind: media.type,
            })
          );
        } catch {
          /* item without usable media */
        }
      }
    } catch {
      /* unparsable — fall through to RSC/raw */
    }
  }

  // 3. RSC/Next flight payloads — scan text chunks for CDN media with context.
  if (candidates.length === 0) {
    RSC_PAYLOAD_RE.lastIndex = 0;
    let rsc: RegExpExecArray | null;
    let chunks = 0;
    while ((rsc = RSC_PAYLOAD_RE.exec(html)) !== null && chunks < 10) {
      chunks++;
      const chunk = rsc[1];
      CDN_MEDIA_RE.lastIndex = 0;
      let cm: RegExpExecArray | null;
      while ((cm = CDN_MEDIA_RE.exec(chunk)) !== null) {
        const at = cm.index ?? 0;
        push(scoreStoryCandidate(cm[0], chunk.slice(Math.max(0, at - 500), at + 500)));
        if (candidates.length >= 20) break;
      }
      if (candidates.length >= 20) break;
    }
  }

  // 4. Raw CDN URLs across the whole page (weakest — still requires evidence).
  if (candidates.length === 0) {
    CDN_MEDIA_RE.lastIndex = 0;
    let cm: RegExpExecArray | null;
    while ((cm = CDN_MEDIA_RE.exec(html)) !== null) {
      const at = cm.index ?? 0;
      push(
        scoreStoryCandidate(cm[0], html.slice(Math.max(0, at - 2000), at + 2000))
      );
      if (candidates.length >= 20) break;
    }
  }

  // Best-first: highest score, video before image at ties.
  candidates.sort((a, b) => b.score - a.score || (a.type === b.type ? 0 : a.type === "video" ? -1 : 1));
  const videoCount = candidates.filter((c) => c.type === "video").length;
  const imageCount = candidates.length - videoCount;
  const emptyShell =
    !storyMarkersFound && candidates.length === 0 && !looksLikeLoginWall(html);
  const videoEvidencePresent =
    videoCount > 0 || hasStoryScopedVideoEvidence(html);
  return { candidates, videoCount, imageCount, storyMarkersFound, emptyShell, videoEvidencePresent, rejectedCount };
}

/**
 * Final error for an exhausted profile-URL chain. Never claims "no Story
 * exists" when the resolver merely failed to discover media. Pure selection
 * over recorded signals — safe to unit test.
 */
export function finalProfileError(
  username: string,
  state: Pick<
    StoryResolveState,
    | "privateHint"
    | "sawLoginWall"
    | "sawAuthedWall"
    | "authedStatus"
    | "emptyShellCount"
    | "strategiesTried"
    | "userExists"
    | "requestId"
    | "webProfileStatus"
    | "reelsStatus"
    | "lastParsedCount"
    | "sessionWasConfigured"
  > & {
    sawExpiredMedia?: boolean;
    sawInvalidCandidates?: boolean;
    externalFailed?: boolean;
    trayStructureUnknown?: boolean;
    rateLimited?: boolean;
    sawChallenge?: boolean;
    upstreamRetryAfterMs?: number | null;
  }
): AppError {
  // Rate-limiting and challenge/session verdicts are NEVER "no active Story":
  // they prove Instagram gated the request, not that the tray is empty.
  if (state.rateLimited) {
    const retryAfterSeconds =
      typeof state.upstreamRetryAfterMs === "number"
        ? Math.max(1, Math.round(state.upstreamRetryAfterMs / 1000))
        : null;
    return new AppError(
      "RATE_LIMITED",
      "Instagram is temporarily rate-limiting requests. Please try again later.",
      429,
      retryAfterSeconds !== null ? { upstreamRetryAfterSeconds: retryAfterSeconds } : undefined
    );
  }
  if (state.sawChallenge) {
    return new AppError(
      "SESSION_EXPIRED",
      "Instagram asked for verification for this session (challenge required). The server session needs to be refreshed.",
      401
    );
  }
  if (state.privateHint) {
    return new AppError(
      "PRIVATE_ACCOUNT",
      "Private account — Story unavailable.",
      403
    );
  }
  if (state.sawExpiredMedia) {
    return new AppError(
      "STORY_MEDIA_EXPIRED",
      "This Story media link has expired. Please try Get Media again.",
      410
    );
  }
  if (state.sawInvalidCandidates) {
    return new AppError(
      "FETCH_FAILED",
      "Story request failed during media-validation: Story data was found, but the media could not be verified for playback.",
      502
    );
  }
  // Restriction requires gating evidence against OUR session — an anonymous
  // 401 only proves the endpoint wants auth (expected), while a clean
  // authenticated empty tray is positive evidence of no active Story.
  // An authenticated 401/403 proves the CONFIGURED session is dead — that is a
  // credential verdict, not content evidence. It outranks tray emptiness but
  // is reported as auth failure, never as "restricted" or "no story".
  const sessionDead = state.sawAuthedWall === true && state.authedStatus !== 200;
  if (sessionDead && state.strategiesTried.length > 0) {
    return new AppError(
      "SESSION_EXPIRED",
      "Instagram session expired or requires verification.",
      401
    );
  }
  // The lookup itself never resolved the user behind a wall (nothing
  // authenticated to contradict it).
  const lookupBlocked = state.sawLoginWall && !state.userExists;
  const worked = state.strategiesTried.length > 0 && state.emptyShellCount === 0;
  if (worked && lookupBlocked) {
    // Gated lookup with no session proof: a configured session means the
    // wall is a credential verdict (SESSION_EXPIRED); anonymous runs get a
    // stage-tagged fetch failure — never "no story".
    if (state.sessionWasConfigured) {
      return new AppError(
        "SESSION_EXPIRED",
        "Instagram session expired or requires verification.",
        401
      );
    }
    return new AppError(
      "FETCH_FAILED",
      "Story request failed during user-lookup: Instagram restricted automated access to this Story. Please try again later.",
      403
    );
  }
  if (state.emptyShellCount > 0 && !state.userExists) {
    return new AppError(
      "FETCH_FAILED",
      "Story request failed during page-fetch: Instagram returned an empty Story page without media. Please try again shortly.",
      503
    );
  }
  if (state.trayStructureUnknown) {
    return new AppError(
      "FETCH_FAILED",
      "Story request failed during tray-parse: Instagram returned an unexpected Story format. Please try again shortly.",
      502
    );
  }
  // FALSE-NEGATIVE PROTECTION: an empty tray becomes NO_STORY ONLY after
  // every check passes — verified-live session (or a purely anonymous run
  // whose public chain completed ungated), resolved user, non-private
  // account, successful requests, no rate-limit/challenge/auth walls, and a
  // recognized (parseable) tray structure. Anything else maps to its own
  // code above and can never fall through to "no story".
  const sessionLive = state.authedStatus === 200;
  if (state.userExists && (sessionLive || !state.sessionWasConfigured)) {
    return new AppError(
      "NO_STORY",
      `The account "@${username}" has no active public Story right now. Stories expire after 24 hours.`,
      404
    );
  }
  if (state.userExists && state.sessionWasConfigured && !sessionLive) {
    return new AppError(
      "SESSION_EXPIRED",
      "Instagram session expired or requires verification.",
      401
    );
  }
  if (state.externalFailed) {
    return new AppError(
      "FETCH_FAILED",
      "Story request failed during external-provider: the Story provider could not return media. Please try again shortly.",
      502
    );
  }
  return new AppError(
    "FETCH_FAILED",
    "Story request failed during media-discovery: a Story may exist, but its media could not be discovered. Please try again shortly.",
    502
  );
}

// ---------------------------------------------------------------------------
// Direct Story ID resolution - preserves BOTH username + storyId, never
// converts to username-only lookup. Tries Instagram media info endpoints that
// accept the exact Story PK, then falls back to story page HTML.
// ---------------------------------------------------------------------------
function parseDirectStoryInfoResponse(json: unknown): Record<string, unknown> | null {
  if (!json || typeof json !== "object") return null;
  const obj = json as Record<string, unknown>;
  // Shape: { items: [{pk, video_versions, ...}] }
  const items = obj["items"];
  if (Array.isArray(items) && items.length > 0) {
    const first = items[0];
    if (first && typeof first === "object") return first as Record<string, unknown>;
  }
  // Shape: { media: {...} }
  const media = obj["media"];
  if (media && typeof media === "object") return media as Record<string, unknown>;
  // Shape: { data: { xdt_api__v1__media__shortcode__web_info: {...} } } unlikely
  // Shape: { status: "ok", items: [...] } already handled
  // If response is itself a media object with video_versions
  if ("video_versions" in obj || "image_versions2" in obj) return obj;
  return null;
}

async function fetchDirectStoryInfo(storyId: string, state?: StoryResolveState): Promise<Record<string, unknown> | null> {
  if (state && shouldBlockApiRequest(state)) {
    logger.warn("[story-resolve] blocked direct story API due to prior 429", { storyId, sequence: state.sequence });
    throw new AppError("RATE_LIMITED", "Instagram is temporarily rate-limiting requests. Please try again later.", 429);
  }
  const url = `https://www.instagram.com/api/v1/media/${encodeURIComponent(storyId)}/info/`;
  state && (state.exactStoryAttempted = true);

  // Try public first (even if cookie exists) — only use authenticated as fallback if public requires auth
  const publicResult = await fetchJsonWithStatus(url, "direct_story_public", { includeCookie: false, state });
  if (publicResult.status === 200 && publicResult.json) {
    const item = parseDirectStoryInfoResponse(publicResult.json);
    if (item) {
      const testMedia = (() => {
        try {
          const { media } = extractStoryMediaItem(item, "");
          return media;
        } catch {
          return null;
        }
      })();
      if (testMedia && isProbablyProfileMedia(testMedia)) {
        logger.warn("[story-resolve] direct story public returned profile media, rejecting", { storyId });
      } else {
        logger.info("[story-resolve] direct story public success (exact ID)", { endpoint: url, hasVideo: Boolean(item["video_versions"]), storyId });
        return item;
      }
    }
  }
  if (publicResult.status === 401 || publicResult.status === 403 || (publicResult.textSnippet && looksLikeLoginWall(publicResult.textSnippet))) {
    logger.info("[story-resolve] direct story public requires auth, trying authenticated fallback", { storyId, status: publicResult.status, hasCookie: isInstagramCookieConfigured() });
    if (isInstagramCookieConfigured() && state && !shouldBlockApiRequest(state)) {
      if (state) state.usedAuthenticatedRequest = true;
      const authedResult = await fetchJsonWithStatus(url, "direct_story_authed", { includeCookie: true, state });
      if (authedResult.status === 200 && authedResult.json) {
        const item = parseDirectStoryInfoResponse(authedResult.json);
        if (item) {
          const testMedia = (() => {
            try {
              const { media } = extractStoryMediaItem(item, "");
              return media;
            } catch {
              return null;
            }
          })();
          if (testMedia && isProbablyProfileMedia(testMedia)) {
            logger.warn("[story-resolve] direct story authed returned profile media, rejecting", { storyId });
            return null;
          }
          logger.info("[story-resolve] direct story authed success (exact ID)", { endpoint: url, hasVideo: Boolean(item["video_versions"]), storyId });
          return item;
        }
      }
      if (authedResult.status === 401 || authedResult.status === 403) {
        throw new AppError("SESSION_EXPIRED", "Instagram session expired or requires verification.", 401);
      }
      if (authedResult.status === 429) {
        if (state) {
          markRateLimited(state);
          logStorySummary(state, { endpoint: url, storyId, reason: "direct_story_authed_429" });
        }
        throw new AppError("RATE_LIMITED", "Instagram is temporarily rate-limiting requests. Please try again later.", 429);
      }
      if (authedResult.status === 404) {
        logger.info("[story-resolve] direct story authed 404, will try other exact methods", { storyId });
        return null;
      }
      if (authedResult.status === 410) {
        logger.info("[story-resolve] direct story authed 410 expired, will try other exact methods", { storyId });
        return null;
      }
    } else if (!isInstagramCookieConfigured()) {
      logger.info("[story-resolve] direct story public requires auth, no server session configured — will try HTML", { storyId });
    }
    return null;
  }
  if (publicResult.status === 404) {
    logger.info("[story-resolve] direct story public 404, will try other exact methods", { storyId, status: publicResult.status });
    return null;
  }
  if (publicResult.status === 429) {
    if (state) {
      markRateLimited(state);
      logStorySummary(state, { endpoint: url, storyId, reason: "direct_story_429" });
    }
    logger.info("[story-resolve] direct story public 429, will try HTML fallback once", { storyId });
    return null;
  }
  if (publicResult.status === 410) {
    logger.info("[story-resolve] direct story public 410 expired, will try other exact methods before declaring expired", { storyId });
    return null;
  }
  if (publicResult.textSnippet && looksLikeLoginWall(publicResult.textSnippet)) {
    logger.info("[story-resolve] direct story public login wall, will try HTML", { storyId, hasCookie: isInstagramCookieConfigured() });
    // If cookie exists, try authed as fallback for login wall
    if (isInstagramCookieConfigured() && state && !shouldBlockApiRequest(state)) {
      if (state) state.usedAuthenticatedRequest = true;
      const authedResult = await fetchJsonWithStatus(url, "direct_story_authed", { includeCookie: true, state });
      if (authedResult.status === 200 && authedResult.json) {
        const item = parseDirectStoryInfoResponse(authedResult.json);
        if (item) {
          logger.info("[story-resolve] direct story authed success after login wall", { storyId });
          return item;
        }
      }
      if (authedResult.status === 401 || authedResult.status === 403) {
        throw new AppError("SESSION_EXPIRED", "Instagram session expired or requires verification.", 401);
      }
      if (authedResult.status === 429) {
        if (state) markRateLimited(state);
        throw new AppError("RATE_LIMITED", "Instagram is temporarily rate-limiting requests. Please try again later.", 429);
      }
    }
    return null;
  }
  if (publicResult.status >= 500) {
    logger.info("[story-resolve] direct story public provider error, will try other exact methods", { storyId, status: publicResult.status });
    return null;
  }
  return null;
}

async function fetchReelsMedia(
  userId: string,
  storyIdForHtmlFallback: string | null = null,
  storyUrlForFallback: string | null = null,
  state?: StoryResolveState
): Promise<Array<Record<string, unknown>>> {
  if (state && shouldBlockApiRequest(state)) {
    logger.warn("[story-resolve] blocked reels_media API due to prior 429", { userId, sequence: state.sequence });
    throw rateLimitedError(state);
  }
  const reelsUrl = reelsMediaUrl(userId);
  const useCookie = isInstagramCookieConfigured();
  if (useCookie && state) state.usedAuthenticatedRequest = true;
  const tag = useCookie ? "reels_media_authed" : "reels_media_public";
  const result = await fetchJsonWithStatus(reelsUrl, tag, { includeCookie: useCookie, state });
  if (state) state.reelsStatus = result.status;

  if (result.status === 200 && result.json) {
    const items = parseReelsMediaResponse(result.json);
    logger.info("[story-resolve] reels_media parsed", { itemCount: items.length, usedCookie: useCookie });
    if (state) {
      state.lastParsedCount = items.length;
      // Valid 200 + recognizable keys + zero items = genuinely empty tray.
      // Valid 200 WITHOUT tray keys = unknown structure: the parser cannot
      // vouch for emptiness, so this must never become NO_ACTIVE_PUBLIC_STORY.
      const obj = result.json as Record<string, unknown>;
      if (!("reels_media" in obj) && !("reels" in obj)) {
        state.trayStructureUnknown = true;
      }
    }
    // HTTP 200 with zero parsed items is an EMPTY TRAY, never evidence of
    // throttling — the chain continues to page/browser strategies.
    const videos = items.filter((it) => Array.isArray(it["video_versions"]) && (it["video_versions"] as unknown[]).length > 0).length;
    logger.info("[STORY_MEDIA]", {
      lookupStatus: result.status,
      responseContentType: result.contentType,
      responseBodySize: result.bodyLength,
      rawStoryCount: Array.isArray((result.json as Record<string, unknown>)["reels_media"])
        ? ((result.json as Record<string, unknown>)["reels_media"] as unknown[]).length
        : 0,
      parsedStoryCount: items.length,
      activeStoryCount: items.length,
      videos,
      images: items.length - videos,
      rejectedCount: 0,
      rejectionReasons: null,
    });
    if (items.length > 0) return items;
    return items;
  }

  if (result.status === 404) {
    throw new AppError("NO_STORY", "Story not found. It may have been deleted or never existed.", 404);
  }
  if (result.status === 410) {
    throw new AppError("NO_STORY", "This Story has expired. Stories are only available for 24 hours.", 410);
  }
  if (result.status === 429) {
    if (state) {
      markRateLimited(state);
      logStorySummary(state, { endpoint: reelsUrl, reason: "reels_media_429" });
      // Allow single HTML fallback even after 429 (non-API)
      if (storyUrlForFallback && state.htmlRequests < 1) {
        const { html } = await fetchHtmlWithStatus(storyUrlForFallback, "story_page_html", state);
        if (html && !looksLikeLoginWall(html)) {
          const media = extractStoryMediaFromHtml(html, storyIdForHtmlFallback);
          if (media) {
            logger.info("[story-resolve] story media via html fallback after 429", { mediaType: media.type });
            return [
              {
                pk: storyIdForHtmlFallback || "html",
                id: storyIdForHtmlFallback || "html",
                video_versions: media.type === "video" ? [{ url: media.url, width: media.width, height: media.height }] : [],
                image_versions2: media.type === "image" ? { candidates: [{ url: media.url, width: media.width, height: media.height }] } : { candidates: [] },
              },
            ];
          }
        }
      }
      if (state) throw rateLimitedError(state);
    }
    throw new AppError("RATE_LIMITED", "Instagram is temporarily rate-limiting requests. Please try again later.", 429);
  }
  if (result.status === 401 || result.status === 403) {
    if (state) state.sawLoginWall = true;
    if (useCookie) {
      throw new AppError("SESSION_EXPIRED", "Instagram session expired or requires verification.", 401);
    }
    // No cookie and 401/403 → try single HTML fallback before giving up
    if (storyUrlForFallback && state && state.htmlRequests < 1) {
      const { html } = await fetchHtmlWithStatus(storyUrlForFallback, "story_page_html", state);
      if (html && !looksLikeLoginWall(html)) {
        const media = extractStoryMediaFromHtml(html, storyIdForHtmlFallback);
        if (media) {
          logger.info("[story-resolve] story media via html fallback (public)", { mediaType: media.type });
          return [
            {
              pk: storyIdForHtmlFallback || "html",
              id: storyIdForHtmlFallback || "html",
              video_versions: media.type === "video" ? [{ url: media.url, width: media.width, height: media.height }] : [],
              image_versions2: media.type === "image" ? { candidates: [{ url: media.url, width: media.width, height: media.height }] } : { candidates: [] },
            },
          ];
        }
      }
    }
    throw new AppError("PRIVATE_ACCOUNT", "Private account — Story unavailable.", 403);
  }

  if (result.status !== null && result.status >= 500) {
    throw new AppError("FETCH_FAILED", `Story request failed during story-tray: Instagram answered HTTP ${result.status}. Please try again shortly.`, 502);
  }

  if (!result.json) {
    const snippet = result.textSnippet || "";
    if (looksLikeLoginWall(snippet)) {
      throw new AppError("CONTENT_UNAVAILABLE", "Instagram did not make this Story publicly accessible to the downloader.", 403);
    }
    throw new AppError("FETCH_FAILED", "Story request failed during story-tray: Instagram returned an unexpected Story response.", 502);
  }

  const items = parseReelsMediaResponse(result.json);
  logger.info("[story-resolve] reels_media fallback parsed", { itemCount: items.length, usedCookie: useCookie });
  return items;
}

async function resolveHighlightById(highlightId: string, originalUrl: string, state?: StoryResolveState): Promise<ResolverResult> {
  if (state && shouldBlockApiRequest(state)) {
    throw new AppError("RATE_LIMITED", "Instagram is temporarily rate-limiting requests. Please try again later.", 429);
  }

  const logHighlight = (msg: string, extra: Record<string, unknown> = {}) => {
    logger.info(`[highlight-resolve] ${msg}`, { highlightId, ...extra, hasCookie: isInstagramCookieConfigured(), rateLimited: state?.rateLimited ?? false });
  };

  logHighlight("highlight resolve started", { originalUrl: originalUrl.slice(0, 80), highlightReelId: `highlight:${highlightId}` });

  // Build ordered list of Highlight page URLs to try (public HTML)
  const highlightPageUrls = [
    `https://www.instagram.com/stories/highlights/${encodeURIComponent(highlightId)}/`,
    `https://www.instagram.com/stories/highlights/${encodeURIComponent(highlightId)}`,
    originalUrl,
  ];

  // Strategy 1: Try Highlight page HTML (public, no API) — often contains highlight items even when reels_media is empty
  // TEMP DEBUG: log exact URL, method, headers (names only), status, content-type, first 1000 chars
  for (const pageUrl of highlightPageUrls) {
    if (state && state.htmlRequests >= 2) break; // limit HTML requests
    try {
      // Debug: log request details before fetch (redact cookie values)
      const debugHeaders = ["User-Agent", "Accept", "Referer"];
      logger.info(`[highlight-debug] HTML request`, {
        url: pageUrl,
        method: "GET",
        headers: debugHeaders,
        highlightId,
        hasCookie: isInstagramCookieConfigured(),
      });
      const { html, status, finalUrl } = await fetchHtmlWithStatus(pageUrl, "highlight_page_html", state, true);
      // Debug: log response details (status, content-type via fetchHtml, first 1000 chars)
      const ct = html ? "text/html" : "none";
      const snippet = html ? html.slice(0, 1000).replace(/\s+/g, " ").slice(0, 1000) : "no-html";
      logger.info(`[highlight-debug] HTML response`, {
        url: pageUrl,
        finalUrl: finalUrl?.slice(0, 100),
        status,
        contentType: ct,
        htmlLength: html?.length ?? 0,
        snippet: snippet.slice(0, 1000),
        isLoginWall: html ? looksLikeLoginWall(html) : false,
      });
      if (html && status === 200 && !looksLikeLoginWall(html)) {
        // Try to extract highlight items from HTML: look for highlight-specific JSON
        const htmlItems = extractHighlightItemsFromHtml(html, highlightId);
        if (htmlItems.length > 0) {
          logHighlight("highlight page HTML success", { pageUrl: pageUrl.slice(0, 80), itemCount: htmlItems.length });
          const validated = await validateAndBuildHighlightMedia(htmlItems, originalUrl);
          if (validated) return validated;
        }
        // Fallback: generic story media extraction from HTML (handles both video/image)
        const genericMedia = extractHighlightMediaFromHtmlGeneric(html, highlightId);
        if (genericMedia.length > 0) {
          logHighlight("highlight generic HTML media success", { count: genericMedia.length });
          const validated = await validateAndBuildHighlightMedia(genericMedia, originalUrl);
          if (validated) return validated;
        }
        logHighlight("highlight page HTML no items", { pageUrl: pageUrl.slice(0, 80), htmlLength: html.length });
      } else if (html && looksLikeLoginWall(html)) {
        logHighlight("highlight page login wall", { pageUrl: pageUrl.slice(0, 80) });
      } else if (!html) {
        logHighlight("highlight page HTML empty or non-200", { pageUrl: pageUrl.slice(0, 80), status });
      }
    } catch (err) {
      logHighlight("highlight page HTML failed", { error: err instanceof Error ? err.message : String(err) });
    }
  }

  // Strategy 2: Try reels_media API (public first, then authed if configured) — exact Highlight ID
  const highlightReelId = `highlight:${highlightId}`;
  const reelsUrl = reelsMediaUrl(highlightReelId);
  const useCookie = isInstagramCookieConfigured();
  if (useCookie && state) state.usedAuthenticatedRequest = true;

  // Public attempt first (if no cookie, this is the only attempt; if cookie exists, still try public first as spec says)
  // DEBUG: log highlight reels_media request details (redact cookie values)
  const debugHighlightHeaders = ["User-Agent", "X-IG-App-ID", "X-CSRFToken", "X-Requested-With", "Referer", "Accept", "Cookie"];
  logger.info(`[highlight-debug] reels_media request`, {
    url: reelsUrl, // should be https://www.instagram.com/api/v1/feed/reels_media/?reel_ids=highlight%3A17944832396967705
    method: "GET",
    headers: debugHighlightHeaders.filter((h) => {
      if (h === "Cookie" && !isInstagramCookieConfigured()) return false;
      if (h === "X-CSRFToken" && !isInstagramCookieConfigured()) return false;
      return true;
    }),
    reelIdParam: `highlight:${highlightId}`,
    encodedParam: `highlight%3A${highlightId}`,
    hasCookie: isInstagramCookieConfigured(),
    highlightId,
  });
  const tryOrders: boolean[] = useCookie ? [false, true] : [false];
  for (const tryUseCookie of tryOrders) {
    if (state && shouldBlockApiRequest(state)) {
      throw new AppError("RATE_LIMITED", "Instagram is temporarily rate-limiting requests. Please try again later.", 429);
    }
    if (tryUseCookie && !isInstagramCookieConfigured()) continue;
    const tag = tryUseCookie ? "highlight_reels_media_authed" : "highlight_reels_media_public";
    const result = await fetchJsonWithStatus(reelsUrl, tag, { includeCookie: tryUseCookie, state, useDesktop: true });
    // DEBUG: log response details (status, content-type via result, first 1000 chars)
    const snippet = result.textSnippet ? result.textSnippet.slice(0, 1000).replace(/\s+/g, " ").slice(0, 1000) : "no-json";
    const isLoginRedirect = result.status === 302 || (result.textSnippet?.includes("/accounts/login") ?? false);
    const isRequireLogin = result.json && typeof result.json === "object" && (result.json as Record<string, unknown>)["require_login"] === true;
    logger.info(`[highlight-debug] reels_media response`, {
      tag,
      status: result.status,
      hasJson: Boolean(result.json),
      isLoginRedirect,
      isRequireLogin,
      snippet: snippet.slice(0, 1000),
      usedCookie: tryUseCookie,
      highlightId,
      reelsKey: `highlight:${highlightId}`,
    });
    let json: unknown | null = result.json;
    let status = result.status;

    if (status === 200 && json) {
      const items = parseReelsMediaResponse(json);
      if (items.length > 0) {
        logHighlight("reels_media success", { usedCookie: tryUseCookie, itemCount: items.length });
        const validated = await validateAndBuildHighlightMedia(items, originalUrl);
        if (validated) return validated;
        logHighlight("reels_media items failed validation (profile?)", { usedCookie: tryUseCookie });
        continue;
      }
      logHighlight("reels_media empty (not yet expired, will try next method)", { usedCookie: tryUseCookie, status });
      // Do NOT immediately throw expired — try next method (other tryOrder, then HTML already tried)
      continue;
    }
    if (status === 401 || status === 403 || (result.textSnippet && looksLikeLoginWall(result.textSnippet))) {
      logHighlight("reels_media auth required", { usedCookie: tryUseCookie, status });
      if (tryUseCookie) {
        throw new AppError("SESSION_EXPIRED", "Instagram session expired or requires verification.", 401);
      }
      // Public 401 with no cookie → try next (authed if available), else continue to final error
      continue;
    }
    if (status === 404) {
      // Highlight genuinely not found at this endpoint — try next tryOrder before giving up
      logHighlight("reels_media 404", { usedCookie: tryUseCookie });
      continue;
    }
    if (status === 429) {
      if (state) {
        markRateLimited(state);
        logStorySummary(state, { endpoint: reelsUrl, reason: "highlight_reels_media_429", highlightId });
      }
      throw new AppError("RATE_LIMITED", "Instagram is temporarily rate-limiting requests. Please try again later.", 429);
    }
    if (status === 410) {
      throw new AppError("STORY_EXPIRED", "This Highlight has expired.", 410);
    }
    if (!json) {
      if (result.textSnippet && looksLikeLoginWall(result.textSnippet)) {
        logHighlight("reels_media login wall no json", { usedCookie: tryUseCookie });
        continue;
      }
      logHighlight("reels_media no json", { usedCookie: tryUseCookie, status });
      continue;
    }
  }

  // Strategy 3: If server-side session is configured, try authenticated highlight fetch as final fallback
  if (useCookie && state && !shouldBlockApiRequest(state)) {
    try {
      const authedResult = await fetchJsonWithStatus(reelsUrl, "highlight_reels_media_authed_final", { includeCookie: true, state, useDesktop: true });
      if (authedResult.status === 200 && authedResult.json) {
        const items = parseReelsMediaResponse(authedResult.json);
        if (items.length > 0) {
          logHighlight("reels_media authed final success", { itemCount: items.length });
          const validated = await validateAndBuildHighlightMedia(items, originalUrl);
          if (validated) return validated;
        }
      }
      if (authedResult.status === 401 || authedResult.status === 403) {
        throw new AppError("SESSION_EXPIRED", "Instagram session expired or requires verification.", 401);
      }
      if (authedResult.status === 429) {
        if (state) markRateLimited(state);
        throw new AppError("RATE_LIMITED", "Instagram is temporarily rate-limiting requests. Please try again later.", 429);
      }
    } catch (err) {
      if (err instanceof AppError && ["SESSION_EXPIRED", "RATE_LIMITED", "STORY_EXPIRED"].includes(err.code)) throw err;
      logHighlight("authed final fallback failed", { error: err instanceof Error ? err.message : String(err) });
    }
  }

  // After all strategies tried, determine accurate error — do NOT call valid Highlight "expired" just because one reels_media returned []
  logHighlight("all Highlight strategies failed", { totalRequests: state?.totalRequests ?? 0, apiRequests: state?.apiRequests ?? 0, htmlRequests: state?.htmlRequests ?? 0, saw429: state?.saw429 ?? false });
  // Distinguish 404 vs 429 vs auth vs genuine not found
  if (state?.saw429) {
    throw new AppError("RATE_LIMITED", "Instagram is temporarily rate-limiting requests. Please try again later.", 429);
  }
  throw new AppError("STORY_NOT_FOUND", "Highlight not found. It may have been removed, is private, or Instagram did not expose it.", 404);
}

function extractHighlightItemsFromHtml(html: string, highlightId: string): Array<Record<string, unknown>> {
  const items: Array<Record<string, unknown>> = [];
  // Instagram embeds highlights as "highlight_reels": [{"id":"highlight:ID","items":[...]}] or "reels":{"highlight:ID":{items:[...]}}
  // Try to locate the highlight block specifically
  const patterns = [
    new RegExp(`"id"\\s*:\\s*"highlight:${highlightId}"[\\s\\S]{0,8000}"items"\\s*:\\s*\\[`, "i"),
    new RegExp(`"highlight:${highlightId}"[\\s\\S]{0,8000}"items"\\s*:\\s*\\[`, "i"),
    new RegExp(`"reels"\\s*:\\s*\\{[\\s\\S]{0,3000}"highlight:${highlightId}"`, "i"),
  ];
  for (const pat of patterns) {
    const m = html.match(pat);
    if (m && m.index !== undefined) {
      const startIdx = m.index + m[0].length - 1; // at '['
      const block = extractBalancedArray(html, startIdx);
      if (block) {
        try {
          const parsed = JSON.parse(block) as unknown[];
          for (const it of parsed) {
            if (it && typeof it === "object") items.push(it as Record<string, unknown>);
          }
          if (items.length > 0) return items;
        } catch {
          // Fallback to snippet extraction
        }
      }
    }
  }
  // Fallback: snippet around highlightId (25k window) and extract via robust JSON
  const idx = html.indexOf(highlightId);
  if (idx !== -1) {
    const snippet = html.slice(Math.max(0, idx - 15000), idx + 25000);
    const snippetItems = extractItemsFromSnippet(snippet);
    if (snippetItems.length > 0) return snippetItems;
    // Last fallback: try to find any video_versions/image_versions2 in snippet and build synthetic items
    const vRegex = /"video_versions"\s*:\s*(\[[\s\S]*?\])(?=\s*,|\s*\})/g;
    let vm: RegExpExecArray | null;
    while ((vm = vRegex.exec(snippet)) !== null) {
      try {
        const cands = JSON.parse(vm[1]) as unknown[];
        const best = bestVideoCandidate(cands as unknown[]);
        if (best && !isProfileImageUrl(best.url)) {
          items.push({
            pk: `highlight_${highlightId}_v_${items.length}`,
            id: `highlight_${highlightId}_v_${items.length}`,
            is_video: true,
            media_type: 2,
            video_versions: [{ url: best.url, width: best.width, height: best.height }],
            image_versions2: { candidates: [] },
          } as unknown as Record<string, unknown>);
        }
      } catch {}
    }
    if (items.length > 0) return items;
  }
  return items;
}

function extractBalancedArray(text: string, openIdx: number): string | null {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = openIdx; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) return text.slice(openIdx, i + 1);
    }
  }
  return null;
}

function extractItemsFromSnippet(snippet: string): Array<Record<string, unknown>> {
  const items: Array<Record<string, unknown>> = [];
  // Find balanced JSON objects that contain video_versions or image_versions2 and extract them as items
  // Use a simple state machine to extract top-level objects in the snippet's items array context
  // For now, delegate to generic extractor which already handles Highlight HTML robustly
  return items;
}

function extractHighlightMediaFromHtmlGeneric(html: string, highlightId: string): Array<Record<string, unknown>> {
  // Generic highlight media extraction: search for all CDN media near highlightId or globally, but validate
  const results: Array<Record<string, unknown>> = [];
  // Use the same story HTML extraction but collect ALL valid media (not just first) for Highlights (which have multiple items)
  // We will extract via regex for video_versions and image_versions2 globally, then filter profile images
  const videoRegex = /"video_versions"\s*:\s*(\[[\s\S]*?\])(?=\s*,|\s*\})/g;
  const imageRegex = /"image_versions2"\s*:\s*\{\s*"candidates"\s*:\s*(\[[^\]]*\])/g;
  let videoMatch: RegExpExecArray | null;
  const seenUrls = new Set<string>();
  while ((videoMatch = videoRegex.exec(html)) !== null) {
    try {
      const arrText = videoMatch[1];
      const candidates = JSON.parse(arrText) as unknown[];
      const best = bestVideoCandidate(candidates as unknown[]);
      if (best && !isProfileImageUrl(best.url) && !seenUrls.has(best.url)) {
        seenUrls.add(best.url);
        results.push({
          pk: `highlight_${highlightId}_v_${results.length}`,
          id: `highlight_${highlightId}_v_${results.length}`,
          video_versions: [{ url: best.url, width: best.width, height: best.height }],
          image_versions2: { candidates: [] },
        } as unknown as Record<string, unknown>);
      }
    } catch {}
    if (results.length >= 20) break; // limit
  }
  // For Highlights, collect ALL image candidates (mixed video+image highlights)
  const imageCandidates: Array<{ url: string; width: number | null; height: number | null }> = [];
  let imageMatch: RegExpExecArray | null;
  while ((imageMatch = imageRegex.exec(html)) !== null) {
    try {
      const arrText = imageMatch[1];
      const candidates = JSON.parse(arrText) as unknown[];
      for (const c of candidates as Array<Record<string, unknown>>) {
        const url = c["url"] as unknown;
        if (typeof url === "string" && !isProfileImageUrl(url) && !seenUrls.has(url)) {
          seenUrls.add(url);
          const w = typeof c["width"] === "number" ? (c["width"] as number) : null;
          const h = typeof c["height"] === "number" ? (c["height"] as number) : null;
          if (w === 150 && h === 150) continue;
          if (w === 206 && h === 206) continue;
          if (w === 320 && h === 320 && url.includes("s320x320")) continue;
          imageCandidates.push({ url, width: w, height: h });
        }
      }
    } catch {}
    if (imageCandidates.length >= 20) break;
  }
  // Add image candidates as separate items (Highlights are multi-item, keep all)
  for (const img of imageCandidates) {
    if (results.length >= 20) break;
    // Deduplicate by URL already handled via seenUrls, so just push
    results.push({
      pk: `highlight_${highlightId}_i_${results.length}`,
      id: `highlight_${highlightId}_i_${results.length}`,
      video_versions: [],
      image_versions2: { candidates: [{ url: img.url, width: img.width, height: img.height }] },
    } as unknown as Record<string, unknown>);
  }
  // If still no results, try to use the single-item extractor as fallback (for single-item highlights)
  if (results.length === 0) {
    const single = extractStoryMediaFromHtml(html, highlightId);
    if (single && !isProbablyProfileMedia(single)) {
      results.push({
        pk: highlightId,
        id: highlightId,
        video_versions: single.type === "video" ? [{ url: single.url, width: single.width, height: single.height }] : [],
        image_versions2: single.type === "image" ? { candidates: [{ url: single.url, width: single.width, height: single.height }] } : { candidates: [] },
      } as unknown as Record<string, unknown>);
    }
  }
  return results;
}

async function validateAndBuildHighlightMedia(items: Array<Record<string, unknown>>, originalUrl: string): Promise<ResolverResult | null> {
  const media: MediaItem[] = [];
  let title: string | null = null;
  let author: Author | null = null;
  let thumbnail: string | null = null;
  for (const item of items) {
    try {
      const extracted = extractStoryMediaItem(item as Record<string, unknown>, "");
      // Validate: reject profile/avatar, validate HEAD where possible
      if (isProbablyProfileMedia(extracted.media)) {
        logger.info("[highlight-resolve] rejected profile media in highlight", { cdn: redactMediaUrl(extracted.media.url) });
        continue;
      }
      // Validate URL before adding (HEAD check, but allow on failure)
      try {
        await validateStoryMedia(extracted.media);
      } catch (err) {
        if (err instanceof AppError && err.code === "FETCH_FAILED") {
          logger.info("[highlight-resolve] highlight media failed validation (profile?)", { cdn: redactMediaUrl(extracted.media.url) });
          continue;
        }
        throw err;
      }
      media.push(extracted.media);
      if (!title && extracted.title) title = extracted.title;
      if (!author && extracted.author.username) author = extracted.author;
      if (!thumbnail && extracted.media.thumbnail) thumbnail = extracted.media.thumbnail;
      else if (!thumbnail && extracted.media.type === "image") thumbnail = extracted.media.url;
    } catch (err) {
      if (err instanceof AppError && err.code === "FETCH_FAILED") continue;
      logger.info("[highlight-resolve] highlight item extraction failed", { error: err instanceof Error ? err.message : String(err) });
    }
  }
  if (media.length === 0) return null;
  return {
    type: "HIGHLIGHT",
    sourceUrl: originalUrl,
    thumbnail: thumbnail || media[0]?.thumbnail || media[0]?.url || null,
    title,
    author,
    media,
  };
}

async function resolveShortLink(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      headers: buildHtmlHeaders(),
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timer);
    await res.body?.cancel().catch(() => {});
    const finalUrl = res.url;
    if (finalUrl && finalUrl !== url) return finalUrl;
    const loc = res.headers.get("location");
    if (loc) {
      try {
        return new URL(loc, url).toString();
      } catch {
        return null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

// Maximum extra page fetches for Strategy B (story page + profile page).
// Bounded so one resolve can never fan out into page scraping.
const STORY_PAGES_MAX_HTML = 2;

/**
 * Hard budgets for one Story resolve. The chain is strictly finite: at most
 * three Instagram extraction attempts (API tray, pages, browser), one
 * optional external call, bounded per-type verification, and at most two
 * network retries for the same media request (single HEAD probe, no
 * refetch loop). Regression tests pin these caps.
 */
export const STORY_BUDGETS = {
  maxExtractionAttempts: 3,
  maxHtmlPages: STORY_PAGES_MAX_HTML,
  maxVerifyCandidatesPerType: 5,
  maxExternalCalls: 1,
  maxHighlightRetries: HIGHLIGHT_RETRY_MAX,
  maxNetworkRetriesPerRequest: 1,
  /** Hard wall-clock budget for one Story resolve (route timeout owns the rest). */
  maxResolveMs: 30_000,
} as const;

/**
 * Story-scoped deadline: no Story resolve may run past 30s of its own work.
 * Checked at strategy boundaries (never mid-byte) so a slow-but-working
 * resolve ends in an explicit stage-tagged timeout error instead of a stuck
 * UI or a misleading "no story".
 */
function checkStoryDeadline(start: number, stage = "story-resolve"): void {
  if (Date.now() - start > STORY_BUDGETS.maxResolveMs) {
    throw storyFetchFailed(stage, `timed out after ${STORY_BUDGETS.maxResolveMs}ms budget`, 504);
  }
}

interface StoryPageMedia {
  media: MediaItem[];
  title: string | null;
  author: Author | null;
  thumbnail: string | null;
}

/**
 * Strategy B: fetch the public story page AND the public profile page, then
 * run evidence-scored discovery over each. Both pages are tried because
 * Instagram exposes tray data on either one depending on rollout. Returns the
 * verified media set, or null when neither page yielded verifiable Story
 * media. Never throws for discovery misses (only rate-limit aborts).
 */
async function resolveViaStoryPagesHtml(
  username: string,
  storyUrl: string,
  state: StoryResolveState,
  onProgress?: ResolveProgressCallback
): Promise<StoryPageMedia | null> {
  const targets = [
    { kind: "story", url: `https://www.instagram.com/stories/${encodeURIComponent(username)}/` },
    { kind: "profile", url: `https://www.instagram.com/${encodeURIComponent(username)}/` },
  ];
  // Prefer the caller's normalized story URL first when it matches.
  try {
    const normalized = new URL(storyUrl);
    if (normalized.pathname.toLowerCase().startsWith("/stories/")) {
      targets[0] = { kind: "story", url: storyUrl };
    }
  } catch {
    /* keep defaults */
  }
  let pagesTried = 0;
  for (const target of targets) {
    if (pagesTried >= STORY_PAGES_MAX_HTML) break;
    logger.info("[STORY] profile navigation", { page: target.kind });
    logger.info("[STORY] story navigation", { page: target.kind });
    pagesTried++;
    // Reuse the profile page already read during user lookup: same bytes,
    // zero new Instagram requests.
    let html: string | null;
    let status: number | null;
    if (target.kind === "profile" && state.cachedProfileHtml) {
      ({ html, status } = state.cachedProfileHtml);
      logger.info("[STORY] profile-html-reused", { status });
    } else {
      if (state.htmlRequests >= 4) {
        logger.info("[STORY] strategy failed", { strategy: "pages-html", reason: "html-budget-exhausted" });
        break;
      }
      const fetched = await fetchHtmlWithStatus(target.url, `story_${target.kind}_page`, state);
      html = fetched.html;
      status = fetched.status;
    }
    if (!html || status === null || status >= 400) {
      logger.info("[STORY] strategy failed", { strategy: `pages-html-${target.kind}`, reason: `http-${status ?? "none"}` });
      if (status === 404) state.privateHint = state.privateHint || false;
      continue;
    }
    if (looksLikeLoginWall(html)) {
      state.sawLoginWall = true;
      logger.info("[STORY] strategy failed", { strategy: `pages-html-${target.kind}`, reason: "login-wall" });
      continue;
    }
    const discovery = extractStoryCandidatesFromHtml(html, username);
    logger.info("[STORY] embedded data candidates", {
      page: target.kind,
      candidates: discovery.candidates.length,
      storyMarkers: discovery.storyMarkersFound,
    });
    logger.info("[STORY] network responses captured", { page: target.kind, note: "fetch-path-no-browser" });
    if (discovery.emptyShell) {
      state.emptyShellCount++;
      logger.info("[STORY] strategy failed", { strategy: `pages-html-${target.kind}`, reason: "empty-shell" });
      continue;
    }
    logger.info("[STORY] story candidates discovered", {
      page: target.kind,
      count: discovery.candidates.length,
    });
    logger.info("[STORY] video candidates", { page: target.kind, count: discovery.videoCount });
    logger.info("[STORY] image candidates", { page: target.kind, count: discovery.imageCount });
    if (discovery.candidates.length === 0) {
      logger.info("[STORY] strategy failed", { strategy: `pages-html-${target.kind}`, reason: "no-candidates" });
      continue;
    }
    // Video-first selection: a verified video always beats an image poster.
    // Images on a page WITH video evidence are likely just posters — they
    // must not win; the browser fallback (network capture) gets its chance.
    const allVideos = discovery.candidates.filter((c) => c.type === "video");
    const allImages = discovery.candidates.filter((c) => c.type === "image");
    const videos = allVideos.slice(0, 5);
    const images = allImages.slice(0, 5);
    for (const candidate of discovery.candidates.slice(0, 8)) {
      logger.info("[STORY] candidate discovered", {
        page: target.kind,
        candidateType: candidate.type,
        width: candidate.width,
        height: candidate.height,
        source: redactMediaUrl(candidate.url).split("/")[0],
        score: candidate.score,
      });
    }
    logger.info("[STORY] candidates summary", {
      page: target.kind,
      videos: allVideos.length,
      images: allImages.length,
      rejected: discovery.rejectedCount,
    });
    const verifyCandidate = async (
      candidate: StoryScoredCandidate
    ): Promise<MediaItem | null> => {
      logger.info("[STORY][CANDIDATE]", {
        page: target.kind,
        type: candidate.type,
        source: redactMediaUrl(candidate.url).split("/")[0],
        mimeType: null,
        width: candidate.width,
        height: candidate.height,
        hasAudio: null,
        isThumbnail: candidate.isThumbnail,
        isImageDerivative: candidate.isDerivative,
        fromVideoVersions: candidate.fromVideoVersions,
        verified: false,
      });
      logger.info("[STORY] candidate type", { page: target.kind, candidateType: candidate.type });
      logger.info("[STORY] candidate width", { page: target.kind, width: candidate.width });
      logger.info("[STORY] candidate height", { page: target.kind, height: candidate.height });
      logger.info("[STORY] candidate source", {
        page: target.kind,
        source: redactMediaUrl(candidate.url).split("/")[0],
      });
      logger.info("[STORY] candidate score", {
        page: target.kind,
        score: candidate.score,
        evidence: candidate.evidence.join(","),
      });
      const synthetic = {
        pk: `page-${target.kind}`,
        id: `page-${target.kind}`,
        video_versions:
          candidate.type === "video"
            ? [{ url: candidate.url, width: candidate.width, height: candidate.height }]
            : [],
        image_versions2:
          candidate.type === "image"
            ? { candidates: [{ url: candidate.url, width: candidate.width, height: candidate.height }] }
            : { candidates: [] },
        user: { username },
      } as unknown as Record<string, unknown>;
      try {
        const extracted = extractStoryMediaItem(synthetic, username);
        const observedMime = await validateStoryMedia(extracted.media);
        const mediaKind = classifyStoryMediaKind({
          fromVideoVersions: candidate.fromVideoVersions,
          observedMime,
          kind: extracted.media.type === "video" ? "video" : "image",
          isDerivative: candidate.isDerivative,
        });
        if (mediaKind === "STORY_UNKNOWN") {
          // An unverified derivative proves nothing — never ship it as the Story.
          logger.info("[STORY] candidate verified", {
            page: target.kind,
            verified: false,
            reason: "unknown-media-type",
          });
          return null;
        }
        const mimeType =
          observedMime ?? (extracted.media.type === "video" ? "video/mp4" : "image/jpeg");
        logger.info("[STORY] candidate mime", { page: target.kind, mime: mimeType });
        candidate.verified = true;
        candidate.observedMime = mimeType;
        extracted.media.mimeType = mimeType;
        logger.info("[STORY][CANDIDATE]", {
          page: target.kind,
          type: extracted.media.type,
          source: redactMediaUrl(extracted.media.url).split("/")[0],
          mimeType,
          width: extracted.media.width,
          height: extracted.media.height,
          hasAudio: null,
          isThumbnail: candidate.isThumbnail,
          isImageDerivative: candidate.isDerivative,
          fromVideoVersions: candidate.fromVideoVersions,
          verified: true,
        });
        logger.info("[STORY] candidate verified", { page: target.kind, verified: true });
        return extracted.media;
      } catch (err) {
        if (err instanceof AppError && err.code === "STORY_MEDIA_EXPIRED") throw err;
        const reason =
          err instanceof AppError && err.code === "FETCH_FAILED"
            ? candidate.isThumbnail || candidate.isDerivative
              ? "thumbnail"
              : "invalid-content-type"
            : err instanceof AppError
              ? err.code
              : "failed-probe";
        logger.info("[STORY] candidate verified", { page: target.kind, verified: false, reason });
        return null;
      }
    };
    // Pass 1: every video candidate, best first — first verified video wins.
    let invalidVideoCount = 0;
    for (const candidate of videos) {
      const verified = await verifyCandidate(candidate);
      if (verified) {
        logger.info("[STORY][SELECTION]", {
          page: target.kind,
          totalCandidates: discovery.candidates.length,
          videoCandidates: allVideos.length,
          imageCandidates: allImages.length,
          rejectedCandidates: discovery.rejectedCount,
          selectedType: "VIDEO",
          selectedMimeType: verified.mimeType ?? "video/mp4",
          selectedSource: redactMediaUrl(verified.url).split("/")[0],
          selectedWidth: verified.width,
          selectedHeight: verified.height,
        });
        logger.info("[STORY] selected media", {
          page: target.kind,
          type: "VIDEO",
          mimeType: verified.mimeType ?? "video/mp4",
          width: verified.width,
          height: verified.height,
          verified: true,
        });
        onProgress?.(85, "Validating media");
        return {
          media: [verified],
          title: null,
          author: { username, displayName: null },
          thumbnail: verified.thumbnail ?? null,
        };
      }
      invalidVideoCount++;
    }
    if (invalidVideoCount > 0) {
      // Video evidence existed but no playable video verified: the poster
      // image must not masquerade as the Story — let the browser try.
      logger.info("[STORY] strategy failed", {
        strategy: `pages-html-${target.kind}`,
        reason: "video-unverifiable-try-browser",
      });
      continue;
    }
    // Pass 2: no video candidates at all.
    if (discovery.videoEvidencePresent) {
      // The page insists video exists somewhere (player flags, playback
      // URLs) but static HTML carries only the poster. Returning the poster
      // here is exactly the JPG-instead-of-video bug — fall through.
      logger.info("[STORY] strategy failed", {
        strategy: `pages-html-${target.kind}`,
        reason: "image-only-with-video-evidence",
      });
      continue;
    }
    let invalidImageCount = 0;
    for (const candidate of images) {
      const verified = await verifyCandidate(candidate);
      if (verified) {
        logger.info("[STORY][SELECTION]", {
          page: target.kind,
          totalCandidates: discovery.candidates.length,
          videoCandidates: allVideos.length,
          imageCandidates: allImages.length,
          rejectedCandidates: discovery.rejectedCount,
          selectedType: "IMAGE",
          selectedMimeType: verified.mimeType ?? "image/jpeg",
          selectedSource: redactMediaUrl(verified.url).split("/")[0],
          selectedWidth: verified.width,
          selectedHeight: verified.height,
        });
        logger.info("[STORY] selected media", {
          page: target.kind,
          type: "IMAGE",
          mimeType: verified.mimeType ?? "image/jpeg",
          width: verified.width,
          height: verified.height,
          verified: true,
        });
        onProgress?.(85, "Validating media");
        return {
          media: [verified],
          title: null,
          author: { username, displayName: null },
          thumbnail: verified.type === "image" ? verified.url : (verified.thumbnail ?? null),
        };
      }
      invalidImageCount++;
    }
    if (invalidImageCount > 0) {
      throw new AppError(
        "FETCH_FAILED",
        "Story data was found, but the media could not be verified for playback.",
        502
      );
    }
  }
  return null;
}

/**
 * Optional Story provider fallback mode (STORY_PROVIDER). `puppeteer` keeps
 * the built-in chain only; `external` uses a configured upstream for Stories;
 * `auto` (default) tries the built-in chain first and calls the external
 * provider exactly once when it is configured and the built-in chain found
 * nothing. Never required for Reel/Post behavior.
 */
export function storyProviderMode(): "puppeteer" | "external" | "auto" {
  const v = (process.env.STORY_PROVIDER || "auto").trim().toLowerCase();
  if (v === "external") return "external";
  if (v === "puppeteer") return "puppeteer";
  return "auto";
}

function externalStoryCredentials(): { apiUrl: string; apiKey: string } | null {
  const apiUrl = (process.env.STORY_PROVIDER_URL || process.env.PROVIDER_API_URL || "").trim();
  const apiKey = (process.env.STORY_PROVIDER_API_KEY || process.env.PROVIDER_API_KEY || "").trim();
  if (!apiUrl || !apiKey) return null;
  return { apiUrl, apiKey };
}

/**
 * True when a dedicated Story provider should run BEFORE the scrape chain:
 * any mode except explicit puppeteer-only, with credentials present. Pure
 * (env read only, no secrets returned) so Try-Again/retry paths and tests
 * share one decision point instead of re-deriving it.
 */
export function shouldTryExternalFirst(): boolean {
  return storyProviderMode() !== "puppeteer" && externalStoryCredentials() !== null;
}

/**
 * Strategy D: optional external Story provider, called AT MOST once per
 * resolve and only when configured. Its response is normalized into the same
 * StoryMedia shape and passed through the same profile/verification filters —
 * an external thumbnail can never outrank a verified video either.
 */
async function resolveViaExternalStoryFallback(
  url: string,
  classification: string,
  state: StoryResolveState,
  onProgress?: ResolveProgressCallback,
  progressAtStart = 75
): Promise<ResolverResult | null> {
  const mode = storyProviderMode();
  if (mode === "puppeteer") {
    logger.info("[STORY] fallback strategy", { next: "external-skipped", reason: "mode-puppeteer" });
    return null;
  }
  const creds = externalStoryCredentials();
  if (!creds) {
    logger.info("[STORY] fallback strategy", { next: "external-skipped", reason: "not-configured" });
    return null;
  }
  if (state.rateLimited) {
    logger.info("[STORY] strategy failed", { strategy: "external", reason: "rate-limited-skip" });
    return null;
  }
  state.strategiesTried.push("external");
  logger.info("[STORY] provider", { mode, backend: "external-once" });
  onProgress?.(progressAtStart, "Trying Story provider");
  try {
    const { ExternalProvider } = await import("./providers/external.js");
    const provider = new ExternalProvider(creds.apiUrl, creds.apiKey);
    const result = await provider.resolve(url);
    const ordered = [...(result.media || [])].sort((a, b) =>
      a.type === b.type ? 0 : a.type === "video" ? -1 : 1
    );
    logger.info("[STORY] candidates summary", {
      via: "external",
      videos: ordered.filter((m) => m.type === "video").length,
      images: ordered.filter((m) => m.type === "image").length,
      rejected: 0,
    });
    // Same poster rule as the browser fallback: external media without tray
    // authority may only contribute video, never a primary image.
    const verified: MediaItem[] = [];
    let externalImageCount = 0;
    for (const item of ordered.slice(0, 3)) {
      if (isProbablyProfileMedia(item)) continue;
      if (item.type !== "video") {
        externalImageCount++;
        continue;
      }
      try {
        const mime = await validateStoryMedia({ ...item });
        if (mime) item.mimeType = mime;
        withMimeDefault(item);
        verified.push(item);
      } catch (err) {
        if (err instanceof AppError && err.code === "STORY_MEDIA_EXPIRED") throw err;
        logger.info("[STORY] strategy failed", {
          strategy: "external-verify",
          reason: err instanceof AppError ? err.code : "invalid",
        });
      }
      if (verified.length > 0) break;
    }
    if (verified.length === 0) {
      state.externalFailed = true;
      logger.info("[STORY] strategy failed", {
        strategy: "external",
        reason: externalImageCount > 0 ? "image-only-poster-refused" : "all-invalid",
      });
      return null;
    }
    const type: InstagramContentType =
      (classification === "STORY_PROFILE" || classification === "STORY") &&
      (result.type === "UNKNOWN" || result.type === "POST")
        ? "STORY"
        : result.type;
    logger.info("[STORY] selected media", {
      via: "external",
      type: verified[0].type === "video" ? "VIDEO" : "IMAGE",
      mimeType: verified[0].mimeType ?? (verified[0].type === "video" ? "video/mp4" : "image/jpeg"),
      width: verified[0].width,
      height: verified[0].height,
      verified: true,
    });
    logger.info("[STORY] Resolution completed", { via: "external", mediaCount: verified.length });
    return { ...result, type, media: verified };
  } catch (err) {
    if (err instanceof AppError) {
      if (err.code === "RATE_LIMITED") throw err;
      if (err.code === "STORY_MEDIA_EXPIRED") throw err;
      state.externalFailed = true;
      logger.info("[STORY] strategy failed", { strategy: "external", reason: err.code });
      return null;
    }
    state.externalFailed = true;
    logger.info("[STORY] strategy failed", {
      strategy: "external",
      reason: err instanceof Error ? err.name : "unknown",
    });
    return null;
  }
}

/**
 * Strategy C: delegate to the existing Puppeteer provider (browser +
 * network interception + hydration + verification). Reuses the shared
 * browser pool, session cookies and candidate pipeline — no second browser
 * system. Skipped for mock/placeholder providers (tests stay deterministic)
 * and degrades gracefully when no browser is available (serverless).
 */
/**
 * Minimum useful browser window. Below this the pass is skipped outright —
 * launching Chromium for a shorter slice wastes the timeout budget that the
 * terminal strategies still need.
 */
const MIN_BROWSER_SLICE_MS = 10_000;

async function resolveViaBrowserFallback(
  url: string,
  classification: string,
  state: StoryResolveState,
  onProgress?: ResolveProgressCallback,
  deadlineAt?: number
): Promise<ResolverResult | null> {
  const providerName = process.env.RESOLVER_PROVIDER || "placeholder";
  if (providerName === "mock" || providerName === "placeholder") {
    logger.info("[STORY] fallback strategy", { next: "browser-skipped", reason: `provider-${providerName}` });
    return null;
  }
  if (providerName !== "puppeteer" && providerName !== "external") {
    logger.info("[STORY] fallback strategy", { next: "browser-skipped", reason: `provider-${providerName}` });
    return null;
  }
  // Never hammer Instagram after a throttle: the browser pass is the most
  // expensive strategy and stays skipped once rate-limited.
  if (state.rateLimited) {
    logger.info("[STORY] strategy failed", { strategy: "browser", reason: "rate-limited-skip" });
    return null;
  }
  // Time-box the browser pass inside the story deadline: it receives at most
  // the remaining budget so a gated page can never burn the whole resolve
  // and trip the deadline mid-flight. The provider observes the signal and
  // tears down its page/listeners; expiry here is a strategy miss, not an
  // error the user ever sees as a timeout.
  const budgetMs =
    typeof deadlineAt === "number" ? deadlineAt - Date.now() : STORY_BUDGETS.maxResolveMs;
  if (budgetMs < MIN_BROWSER_SLICE_MS) {
    logger.info("[STORY] strategy failed", {
      strategy: "browser",
      reason: "deadline-too-tight",
      budgetMs,
    });
    return null;
  }
  state.browserAttempted = true;
  state.strategiesTried.push("browser");
  logStorySessionStatus("browser-fallback", state);
  logger.info("[STORY] fallback strategy", { next: "browser", classification, budgetMs });
  onProgress?.(70, "Opening Instagram in browser");
  const browserController = new AbortController();
  const browserTimer = setTimeout(() => browserController.abort(), budgetMs);
  // Timer must never hold the process open on its own.
  browserTimer.unref?.();
  try {
    const { PuppeteerProvider } = await import("./providers/puppeteer.js");
    const provider = new PuppeteerProvider();
    const result = await provider.resolve(url, onProgress, { signal: browserController.signal });
    logger.info("[STORY] network responses captured", { via: "browser", mediaCount: result.media.length });
    if (!result.media || result.media.length === 0) {
      logger.info("[STORY] strategy failed", { strategy: "browser", reason: "no-media" });
      return null;
    }
    // Story-filter the browser result: video first, drop profile impostors.
    // A video representation always outranks an image poster of the same item.
    const ordered = [...result.media].sort((a, b) =>
      a.type === b.type ? 0 : a.type === "video" ? -1 : 1
    );
    logger.info("[STORY] candidates summary", {
      via: "browser",
      videos: ordered.filter((m) => m.type === "video").length,
      images: ordered.filter((m) => m.type === "image").length,
      rejected: result.media.length - ordered.slice(0, 5).length,
    });
    // The browser pass runs only after authoritative strategies found no
    // tray media — so a browser-only IMAGE is a poster/cover frame, not the
    // Story (genuine image Stories resolve via reels/pages). Only verified
    // VIDEO may be returned from this fallback; anything else continues the
    // chain to an honest error instead of a mislabeled JPG.
    const verified: MediaItem[] = [];
    let browserImageCount = 0;
    for (const item of ordered.slice(0, 5)) {
      logger.info("[STORY] candidate discovered", {
        via: "browser",
        candidateType: item.type,
        width: item.width,
        height: item.height,
        source: redactMediaUrl(item.url).split("/")[0],
        score: item.type === "video" ? 10 : 1,
      });
      if (isProbablyProfileMedia(item)) {
        logger.info("[STORY] strategy failed", { strategy: "browser-filter", reason: "profile-media" });
        continue;
      }
      if (item.type !== "video") {
        browserImageCount++;
        logger.info("[STORY] strategy failed", { strategy: "browser-filter", reason: "poster-not-primary" });
        continue;
      }
      try {
        const mime = await validateStoryMedia({ ...item });
        if (mime) item.mimeType = mime;
        withMimeDefault(item);
        logger.info("[STORY] candidate verified", { via: "browser", verified: true });
        verified.push(item);
      } catch (err) {
        if (err instanceof AppError && err.code === "STORY_MEDIA_EXPIRED") throw err;
        const reason =
          err instanceof AppError && err.code === "FETCH_FAILED"
            ? "invalid-content-type"
            : err instanceof AppError
              ? err.code
              : "failed-probe";
        logger.info("[STORY] candidate verified", { via: "browser", verified: false, reason });
      }
      if (verified.length > 0) break;
    }
    if (verified.length === 0) {
      logger.info("[STORY] strategy failed", {
        strategy: "browser",
        reason: browserImageCount > 0 ? "image-only-poster-refused" : "all-invalid",
      });
      return null;
    }
    const type: InstagramContentType =
      classification === "STORY_PROFILE" && (result.type === "UNKNOWN" || result.type === "POST")
        ? "STORY"
        : result.type;
    logger.info("[STORY][SELECTION]", {
      via: "browser",
      totalCandidates: result.media.length,
      videoCandidates: ordered.filter((m) => m.type === "video").length,
      imageCandidates: ordered.filter((m) => m.type === "image").length,
      rejectedCandidates: 0,
      selectedType: verified[0].type === "video" ? "VIDEO" : "IMAGE",
      selectedMimeType: verified[0].mimeType ?? (verified[0].type === "video" ? "video/mp4" : "image/jpeg"),
      selectedSource: redactMediaUrl(verified[0].url).split("/")[0],
      selectedWidth: verified[0].width,
      selectedHeight: verified[0].height,
    });
    logger.info("[STORY] selected media", {
      via: "browser",
      type: verified[0].type === "video" ? "VIDEO" : "IMAGE",
      mimeType: verified[0].mimeType ?? (verified[0].type === "video" ? "video/mp4" : "image/jpeg"),
      width: verified[0].width,
      height: verified[0].height,
      verified: true,
    });
    logger.info("[STORY] Resolution completed", { via: "browser", mediaCount: verified.length });
    return { ...result, type, media: verified };
  } catch (err) {
    if (err instanceof AppError) {
      if (err.code === "RATE_LIMITED") throw err;
      if (err.code === "STORY_MEDIA_EXPIRED") throw err;
      logger.info("[STORY] strategy failed", { strategy: "browser", reason: err.code });
      return null;
    }
    // Includes our own budget abort: the slice ran out, never a user-facing
    // timeout — the chain still has terminal strategies after this.
    logger.info("[STORY] strategy failed", {
      strategy: "browser",
      reason: err instanceof Error ? err.name : "unknown",
    });
    return null;
  } finally {
    clearTimeout(browserTimer);
  }
}

/**
 * Story metadata/media cache: resolved Story results stay valid for minutes
 * (Stories live 24h; CDN URLs minutes), so repeated requests must not hit
 * Instagram again. Bounded 5–10 minutes (default 6) with oldest-eviction —
 * separate from the short shared resolve cache so non-Story TTLs are
 * untouched. Keyed by URL hash (never the URL itself in the key store).
 */
const STORY_CACHE_TTL_MS = readBoundedInt("STORY_CACHE_TTL_MS", 360_000, 300_000, 600_000);
const STORY_CACHE_MAX_ENTRIES = 200;
const storyCache = new Map<string, { result: ResolverResult; createdAt: number }>();

function getStoryCachedResult(url: string): ResolverResult | null {
  const entry = storyCache.get(hashUrl(url));
  if (!entry) return null;
  if (Date.now() - entry.createdAt > STORY_CACHE_TTL_MS) {
    storyCache.delete(hashUrl(url));
    return null;
  }
  return entry.result;
}

function setStoryCachedResult(url: string, result: ResolverResult): void {
  if (storyCache.size >= STORY_CACHE_MAX_ENTRIES) {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [key, entry] of storyCache) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }
    if (oldestKey) storyCache.delete(oldestKey);
  }
  storyCache.set(hashUrl(url), { result, createdAt: Date.now() });
}

/** Test-only: drop every story-cache entry so cache assertions are independent. */
export function clearStoryCacheForTests(): void {
  storyCache.clear();
}

/**
 * Monotonic progress for one Story extraction: strategy fallbacks legitimately
 * emit lower stage values after a higher one (e.g. external 75 → browser 70
 * → list 30), which must never rewind the UI (the 75% → 35% loop). Only
 * non-decreasing values pass; equal values still update stage text. A
 * genuinely new extraction gets a fresh wrapper, so progress restarts only
 * then — never mid-request.
 */
export function createStoryMonotonicProgress(
  onProgress?: ResolveProgressCallback
): ResolveProgressCallback {
  let max = -1;
  return (progress: number, stage: string) => {
    if (!Number.isFinite(progress) || progress < max) return;
    max = progress;
    onProgress?.(progress, stage);
  };
}

export async function resolveStoryUrl(
  url: string,
  onProgress?: ResolveProgressCallback,
  opts?: { requestId?: string; bypassCache?: boolean }
): Promise<ResolverResult> {
  const start = Date.now();
  const requestId = opts?.requestId ?? null;
  let path = "";
  try {
    path = new URL(url).pathname.slice(0, 80);
  } catch {
    path = url.slice(0, 80);
  }
  logger.info("[STORY_START]", { requestId, path, username: null, storyId: null });
  // Stale-media recovery bypasses both caches so a known-bad signed CDN URL is
  // replaced instead of re-served; the fresh result re-warms both below.
  if (opts?.bypassCache) {
    storyCache.delete(hashUrl(url));
  } else {
    const cached = getStoryCachedResult(url);
    if (cached) {
      logger.info("[STORY] cache hit", { requestId });
      onProgress?.(90, "Cached result found");
      return cached;
    }
  }
  try {
    // Exactly ONE active extraction per call: the inner chain's stage values
    // are gated to non-decreasing here, so fallback strategies can never
    // rewind progress mid-request.
    const emitProgress = createStoryMonotonicProgress(onProgress);
    const result = await resolveStoryUrlInner(url, emitProgress, opts);
    setStoryCachedResult(url, result);
    logger.info("[STORY_COMPLETE]", { requestId, success: true, durationMs: Date.now() - start });
    return result;
  } catch (err) {
    const code = err instanceof AppError ? err.code : "TEMPORARY_ERROR";
    const retryable = err instanceof AppError ? Boolean(ERRORS[code]?.retryable) : true;
    logger.info("[STORY_ERROR]", {
      requestId,
      code,
      reason: err instanceof Error ? err.message.slice(0, 160) : "unknown",
      retryable,
      durationMs: Date.now() - start,
    });
    if (code === "SESSION_EXPIRED") {
      // Operator alert: the server-side Instagram session needs fresh
      // cookies. Names and counts only — never cookie values.
      logger.error("[STORY] ACTION REQUIRED: Instagram session expired or needs verification.", {
        requestId,
        sessionSource: getSessionState().source,
        hint: "Refresh INSTAGRAM_COOKIE/INSTAGRAM_SESSIONID server-side and restart the backend.",
      });
    }
    throw err;
  }
}

async function resolveStoryUrlInner(
  url: string,
  onProgress?: ResolveProgressCallback,
  opts?: { requestId?: string; bypassCache?: boolean }
): Promise<ResolverResult> {
  const start = Date.now();
  const state = createStoryResolveState();
  state.requestId = opts?.requestId ?? null;
  logger.info("[STORY] Input URL", { input: url.slice(0, 120) });
  let parsed = parseStoryUrl(url);
  if (!parsed.username && parsed.storyId && url.includes("/s/")) {
    const final = await resolveShortLink(url);
    if (final) {
      try {
        parsed = parseStoryUrl(final);
        logger.info("[story-resolve] short link resolved", { original: url.slice(0, 80), final: final.slice(0, 80) });
      } catch {}
    }
  }
  const { username, storyId, highlightId } = parsed;
  const classification = highlightId ? "HIGHLIGHT" : storyId ? "STORY" : "STORY_PROFILE";
  logger.info(`[STORY] URL classified as ${classification}`, {
    username: username || null,
    storyId: storyId || null,
    highlightId: highlightId || null,
  });
  logger.info("[STORY] Username extracted", { username: username || null });
  logger.info("[STORY] Story ID", { storyId: storyId || null });
  logger.info("[STORY] Resolver selected", { resolver: "resolveStoryUrl" });
  logger.info("[story-resolve] received Story URL", {
    normalizedUrl: url.slice(0, 100),
    username: username || null,
    storyId: storyId || null,
    highlightId: highlightId || null,
    classification,
    extractor: "story-api-public-first",
    hasCookie: Boolean(getInstagramCookie()),
    attemptedPublic: true,
  });
  onProgress?.(10, "Story link validated");
  if (highlightId) {
    onProgress?.(25, "Resolving Highlight");
    const result = await resolveHighlightById(highlightId, url, state);
    onProgress?.(85, "Highlight media extracted");
    logger.info("[story-resolve] Highlight resolved", {
      mediaCount: result.media.length,
      hasVideo: result.media.some((m) => m.type === "video"),
      duration: Date.now() - start,
      extractor: "story-api",
      publicAttempt: true,
    });
    return result;
  }
  if (!username) throw new AppError("VALIDATION_ERROR", "Story username is missing in the URL.", 400);
  if (!storyId) {
    // ── STORY_PROFILE chain: A (reels_media API) → B (story+profile pages)
    // → C (browser fallback) → accurate final error. A 401 on one endpoint
    // never terminates the chain; only rate-limit aborts it.
    logger.info("[story-resolve] storyId missing, fetching all stories for user", { username, hasCookie: isInstagramCookieConfigured() });
    logger.info("[STORY] External resolution started", { username });
    logger.info("[STORY] provider", { mode: storyProviderMode() });
    state.sessionWasConfigured = getSessionState().configured;
    logStorySessionStatus("profile-start", state);
    // Session validation FIRST with a lightweight authenticated call to the
    // session-owner endpoint — before any username lookup or Story fetch. An
    // invalid session stops here with SESSION_EXPIRED (no fallback chain
    // burning budget on a dead identity); rate-limiting stops with
    // RATE_LIMITED. An "ok" proof skips the tray probe below (one fewer
    // Instagram request); inconclusive verdicts fall through to it.
    onProgress?.(15, "Validating session");
    {
      const quick = await validateSessionOwner(state);
      if (quick.status === "login_required" && quick.challenge) state.sawChallenge = true;
      const quickError = sessionValidationError(quick);
      if (quickError) {
        logger.info("[STORY] session-live", { live: false, validation: quick.status, lifecycle: getSessionState().state });
        logStorySessionStatus("quick-validation", state);
        throw quickError;
      }
      if (quick.status === "ok") {
        logger.info("[STORY] session-live", { live: true, validation: quick.status, lifecycle: getSessionState().state });
        logStorySessionStatus("quick-validation", state);
      }
    }
    onProgress?.(20, "Resolving username");
    let userId: string | null = null;
    try {
      userId = await resolveUserId(username, state);
      state.userExists = true;
      logger.info("[STORY] profileId", { userId });
      logStorySessionStatus("user-resolved", state);
      onProgress?.(30, "User ID resolved");
    } catch (err) {
      if (err instanceof AppError) {
        if (err.code === "USER_NOT_FOUND") {
          logger.info("[STORY] strategy failed", { strategy: "user-lookup", reason: "profile-not-found" });
          logger.info("[STORY] final failure reason", { code: "USER_NOT_FOUND" });
          throw err;
        }
        if (err.code === "PRIVATE_ACCOUNT") {
          state.privateHint = true;
          logger.info("[STORY] final failure reason", { code: "PRIVATE_ACCOUNT" });
          throw err;
        }
        if (err.code === "RATE_LIMITED") throw err;
        if (err.code === "NO_STORY") throw err;
        logger.info("[STORY] strategy failed", { strategy: "user-lookup", reason: err.code });
      } else {
        logger.info("[STORY] strategy failed", { strategy: "user-lookup", reason: "unknown" });
      }
      // userId stays null: Strategies B/C need only the username, not the ID.
    }
    logger.info("[STORY_PROFILE]", {
      webProfileStatus: state.webProfileStatus,
      profileHtmlStatus: state.profileHtmlStatus,
      userId: userId ?? null,
    });

    // Tray-family session proof (second phase; the owner probe above already
    // fail-fasted dead sessions): an empty reels_media tray is only evidence
    // of "no story" when the configured session actually works for Story
    // reads. Skipped when the owner probe already proved liveness
    // (authedStatus 200), when no session is configured, when quarantined,
    // or when a verdict already exists.
    if (userId && isInstagramCookieConfigured() && state.authedStatus === null) {
      // Validated against the target tray (same endpoint family as the
      // extraction below), so the verdict is load-bearing for Stories.
      onProgress?.(31, "Validating session");
      const validation = await validateInstagramSession({ userId, state });
      const live = validation.status === "ok";
      if (validation.status === "login_required") state.sawChallenge = true;
      if (validation.status === "rate_limited") {
        markRateLimited(state);
        throw rateLimitedError(state);
      }
      const lifecycle: SessionLifecycleState = getSessionState().state;
      logger.info("[STORY] session-live", {
        live,
        validation: validation.status,
        lifecycle,
      });
      logStorySessionStatus("session-check", state);
      // NOTE: no throw for expired/challenge here by design — the probe
      // already quarantined a 401/403 session, and getInstagramCookie() now
      // resolves empty for it, so every strategy below transparently runs
      // anonymous. The recorded verdicts (sawAuthedWall/sawChallenge) drive
      // the honest final error instead of "no active Story".
    }

    // Strategy P: dedicated external Story provider FIRST when configured.
    // A verified hit returns immediately and the scrape chain never runs;
    // any miss falls through to it with externalFailed recorded, so the
    // final verdict still rests on full evidence — never on the provider
    // having been skipped or having failed alone.
    if (shouldTryExternalFirst()) {
      checkStoryDeadline(start, "external-first");
      logger.info("[STORY] fallback strategy", { next: "external-first" });
      onProgress?.(32, "Trying Story provider");
      try {
        const externalFirst = await resolveViaExternalStoryFallback(
          url,
          "STORY_PROFILE",
          state,
          onProgress,
          32
        );
        if (externalFirst && externalFirst.media.length > 0) {
          onProgress?.(85, "Validating media");
          logger.info("[STORY] previewReady", { ready: true });
          logger.info("[STORY] downloadReady", { ready: true });
          return externalFirst;
        }
      } catch (err) {
        if (err instanceof AppError && (err.code === "RATE_LIMITED" || err.code === "STORY_MEDIA_EXPIRED")) throw err;
        logger.info("[STORY] strategy failed", { strategy: "external-first", reason: err instanceof AppError ? err.code : "unknown" });
      }
    }

    // Strategy A: reels_media API (when the user ID is known).
    if (userId) {
      state.strategiesTried.push("reels_media");
      onProgress?.(40, "Fetching Story");
      try {
        const items = await fetchReelsMedia(userId, null, url, state);
        logger.info("[STORY] Media candidates found", { count: items.length, via: "reels_media" });
        if (items.length > 0) {
          const media: MediaItem[] = [];
          let title: string | null = null;
          let author: Author | null = null;
          let thumbnail: string | null = null;
          for (const item of items) {
            try {
              const extracted = extractStoryMediaItem(item, username);
              media.push(extracted.media);
              if (!title && extracted.title) title = extracted.title;
              if (!author && extracted.author.username) author = extracted.author;
              if (!thumbnail && extracted.media.thumbnail) thumbnail = extracted.media.thumbnail;
              else if (!thumbnail && extracted.media.type === "image") thumbnail = extracted.media.url;
            } catch {}
          }
          logger.info("[STORY] Valid media candidates", { count: media.length, via: "reels_media" });
          logger.info("[STORY] candidates summary", {
            via: "reels_media",
            videos: media.filter((m) => m.type === "video").length,
            images: media.filter((m) => m.type === "image").length,
            rejected: 0,
          });
          if (media.length > 0) {
            // Video representations first: the UI opens on items[0], and a
            // video must never hide behind its own poster image.
            media.sort((a, b) => (a.type === b.type ? 0 : a.type === "video" ? -1 : 1));
            for (const m of media) withMimeDefault(m);
            const first = media[0];
            const firstThumbnail =
              first.thumbnail ?? (first.type === "image" ? first.url : null);
            thumbnail = firstThumbnail ?? thumbnail;
            logger.info("[STORY][SELECTION]", {
              via: "reels_media",
              totalCandidates: items.length,
              videoCandidates: media.filter((m) => m.type === "video").length,
              imageCandidates: media.filter((m) => m.type === "image").length,
              rejectedCandidates: items.length - media.length,
              selectedType: first.type === "video" ? "VIDEO" : "IMAGE",
              selectedMimeType: first.mimeType ?? (first.type === "video" ? "video/mp4" : "image/jpeg"),
              selectedSource: redactMediaUrl(first.url).split("/")[0],
              selectedWidth: first.width,
              selectedHeight: first.height,
            });
            logger.info("[STORY] selected media", {
              via: "reels_media",
              type: first.type === "video" ? "VIDEO" : "IMAGE",
              mimeType: first.mimeType ?? (first.type === "video" ? "video/mp4" : "image/jpeg"),
              width: first.width,
              height: first.height,
              verified: true,
            });
            logger.info("[story-resolve] Story list resolved (no ID) public", { mediaCount: media.length, duration: Date.now() - start, extractor: "story-api", publicAttempt: true });
            onProgress?.(85, "Validating media");
            logger.info("[STORY] Resolution completed", { mediaCount: media.length, via: "reels_media" });
            logger.info("[STORY] previewReady", { ready: true });
            logger.info("[STORY] downloadReady", { ready: true });
            return {
              type: "STORY",
              sourceUrl: url,
              thumbnail: thumbnail || media[0]?.thumbnail || media[0]?.url || null,
              title,
              author,
              media,
            };
          }
          logger.info("[STORY] strategy failed", { strategy: "reels_media", reason: "all-invalid" });
          logger.info("[STORY] final failure reason", { code: "FETCH_FAILED" });
          throw new AppError(
            "FETCH_FAILED",
            "Story request failed during media-validation: Story data was found, but the media could not be verified for playback.",
            502
          );
        }
        logger.info("[STORY] strategy failed", { strategy: "reels_media", reason: "empty-tray" });
      } catch (err) {
        if (err instanceof AppError) {
          if (err.code === "RATE_LIMITED") throw err;
          if (err.code === "FETCH_FAILED") throw err;
          if (err.code === "PRIVATE_ACCOUNT") {
            state.privateHint = true;
            logger.info("[STORY] final failure reason", { code: "PRIVATE_ACCOUNT" });
            throw err;
          }
          if (err.code === "SESSION_EXPIRED") {
            logger.info("[STORY] strategy failed", { strategy: "reels_media", reason: "session-rejected" });
            logStorySessionStatus("reels-media-rejected", state);
          } else {
            logger.info("[STORY] strategy failed", { strategy: "reels_media", reason: err.code });
          }
        } else {
          logger.info("[STORY] strategy failed", { strategy: "reels_media", reason: "unknown" });
        }
      }
    } else {
      logger.info("[STORY] strategy failed", { strategy: "reels_media", reason: "no-user-id" });
    }

    // Strategy B: public story + profile pages with evidence-scored discovery.
    checkStoryDeadline(start, "pages-html");
    state.strategiesTried.push("pages-html");
    logger.info("[STORY] fallback strategy", { next: "pages-html" });
    onProgress?.(55, "Fetching Story");
    try {
      const pages = await resolveViaStoryPagesHtml(username, url, state, onProgress);
      if (pages && pages.media.length > 0) {
        logger.info("[STORY] Valid media candidates", { count: pages.media.length, via: "pages-html" });
        logger.info("[STORY] Selected media", { count: pages.media.length, firstType: pages.media[0]?.type ?? null });
        onProgress?.(85, "Validating media");
        logger.info("[STORY] Resolution completed", { mediaCount: pages.media.length, via: "pages-html" });
        return {
          type: "STORY",
          sourceUrl: url,
          thumbnail: pages.thumbnail,
          title: pages.title,
          author: pages.author,
          media: pages.media,
        };
      }
      logger.info("[STORY] strategy failed", { strategy: "pages-html", reason: "no-verified-media" });
    } catch (err) {
      if (err instanceof AppError) {
        if (err.code === "RATE_LIMITED" || err.code === "STORY_MEDIA_EXPIRED") throw err;
        if (err.code === "FETCH_FAILED") throw err;
        logger.info("[STORY] strategy failed", { strategy: "pages-html", reason: err.code });
      } else {
        logger.info("[STORY] strategy failed", { strategy: "pages-html", reason: "unknown" });
      }
    }

    // Strategy C: Puppeteer browser fallback (network capture + hydration).
    // Skipped outright after a throttle — the browser pass is the most
    // expensive strategy and must never hammer a throttled upstream.
    checkStoryDeadline(start, "browser-fallback");
    if (!state.rateLimited) {
      logger.info("[STORY] fallback strategy", { next: "browser" });
      onProgress?.(70, "Opening Instagram in browser");
      try {
        const browserResult = await resolveViaBrowserFallback(
          url,
          "STORY_PROFILE",
          state,
          onProgress,
          start + STORY_BUDGETS.maxResolveMs
        );
        if (browserResult && browserResult.media.length > 0) {
          onProgress?.(85, "Validating media");
          logger.info("[STORY] previewReady", { ready: true });
          logger.info("[STORY] downloadReady", { ready: true });
          return browserResult;
        }
      } catch (err) {
        if (err instanceof AppError && (err.code === "RATE_LIMITED" || err.code === "STORY_MEDIA_EXPIRED")) throw err;
        logger.info("[STORY] strategy failed", { strategy: "browser-chain", reason: err instanceof AppError ? err.code : "unknown" });
      }
    } else {
      logger.info("[STORY] strategy failed", { strategy: "browser", reason: "rate-limited-skip" });
    }

    // Strategy D: optional external provider, exactly once when configured.
    checkStoryDeadline(start, "external-provider");
    logger.info("[STORY] fallback strategy", { next: "external" });
    try {
      const externalResult = await resolveViaExternalStoryFallback(url, "STORY_PROFILE", state, onProgress);
      if (externalResult && externalResult.media.length > 0) {
        onProgress?.(85, "Validating media");
        logger.info("[STORY] previewReady", { ready: true });
        logger.info("[STORY] downloadReady", { ready: true });
        return externalResult;
      }
    } catch (err) {
      if (err instanceof AppError && (err.code === "RATE_LIMITED" || err.code === "STORY_MEDIA_EXPIRED")) throw err;
      logger.info("[STORY] strategy failed", { strategy: "external-chain", reason: err instanceof AppError ? err.code : "unknown" });
    }

    const final = finalProfileError(username, state);
    logStoryAccess(state, final.code);
    traceStoryError(state, {
      stage: "profile-chain-exhausted",
      errorCode: final.code,
      reason: "all-strategies-exhausted",
      httpStatus: state.reelsStatus,
      storyCount: state.lastParsedCount,
      mediaCount: 0,
    });
    logger.info("[STORY] final failure reason", { code: final.code });
    logStorySummary(state, { reason: "profile-chain-exhausted", finalCode: final.code });
    throw final;
  }

  // ── Direct Story URL: preserve BOTH username + storyId, never downgrade to username-only ──
  // Public extraction first, server-side session only if Instagram requires auth
  onProgress?.(20, "Resolving exact Story");
  logger.info("[story-resolve] attempting direct Story ID resolution", { username, storyId, normalizedUrl: url.slice(0, 100), extractor: "direct-story-id", hasCookie: isInstagramCookieConfigured() });
  state.sessionWasConfigured = getSessionState().configured;
  logStorySessionStatus("direct-start", state);

  // Session validation FIRST with the lightweight session-owner call: an
  // invalid session stops here with SESSION_EXPIRED (no fallback chain on a
  // dead identity); rate-limiting stops with RATE_LIMITED.
  if (isInstagramCookieConfigured() && state.authedStatus === null) {
    onProgress?.(21, "Validating session");
    const directValidation = await validateSessionOwner(state);
    if (directValidation.status === "login_required" && directValidation.challenge) {
      state.sawChallenge = true;
    }
    const directError = sessionValidationError(directValidation);
    if (directError) {
      logger.info("[STORY] session-live", {
        live: false,
        validation: directValidation.status,
        lifecycle: getSessionState().state,
      });
      logStorySessionStatus("direct-session-check", state);
      throw directError;
    }
    logger.info("[STORY] session-live", {
      live: directValidation.status === "ok",
      validation: directValidation.status,
      lifecycle: getSessionState().state,
    });
    logStorySessionStatus("direct-session-check", state);
  }

  // Strategy P: dedicated external provider first when configured; the
  // exact-ID scrape attempts below remain the fallback.
  if (shouldTryExternalFirst()) {
    checkStoryDeadline(start, "external-first");
    logger.info("[STORY] fallback strategy", { next: "external-first", storyId });
    try {
      const externalFirst = await resolveViaExternalStoryFallback(url, "STORY", state, onProgress, 25);
      if (externalFirst && externalFirst.media.length > 0) {
        onProgress?.(85, "Validating media");
        logger.info("[STORY] previewReady", { ready: true });
        logger.info("[STORY] downloadReady", { ready: true });
        return externalFirst;
      }
    } catch (err) {
      if (err instanceof AppError && (err.code === "RATE_LIMITED" || err.code === "STORY_MEDIA_EXPIRED")) throw err;
      logger.info("[STORY] strategy failed", { strategy: "external-first", reason: err instanceof AppError ? err.code : "unknown" });
    }
  }

  // Attempt 1: Direct media info by Story ID (most precise, uses server-side session)
  // Controlled: single API request, public if no cookie, authed if cookie, no cascade after 429
  onProgress?.(35, "Fetching Story");
  try {
    const directItem = await fetchDirectStoryInfo(storyId, state);
    if (directItem) {
      const itemUser = directItem["user"] as unknown;
      if (itemUser && typeof itemUser === "object") {
        const fetchedUsername = (itemUser as Record<string, unknown>)["username"];
        if (typeof fetchedUsername === "string" && fetchedUsername.toLowerCase() !== username.toLowerCase()) {
          logger.warn("[story-resolve] direct story username mismatch", { requested: username, fetched: fetchedUsername, storyId });
        }
      }
      const { media, title, author } = extractStoryMediaItem(directItem, username);
      // Validate actual media is video/image, not profile, and playable
      const directMime = await validateStoryMedia(media);
      if (directMime) media.mimeType = directMime;
      withMimeDefault(media);
      onProgress?.(85, "Validating media");
      logger.info("[story-resolve] Story resolved via direct ID (exact, authenticated)", {
        mediaType: media.type,
        mimeType: media.type === "video" ? "video/mp4" : "image/jpeg",
        width: media.width,
        height: media.height,
        hasThumbnail: Boolean(media.thumbnail),
        duration: Date.now() - start,
        extractor: "direct-story-id",
        authenticated: true,
      });
      return {
        type: "STORY",
        sourceUrl: url,
        thumbnail: media.thumbnail || (media.type === "image" ? media.url : null),
        title,
        author: author.username ? author : { username, displayName: null },
        media: [media],
      };
    }
  } catch (err) {
    if (err instanceof AppError) {
      // Map to accurate categories, never conflate. Stage-tagged FETCH_FAILED
      // errors pass through untouched (their messages name the failed stage).
      if (["INSTAGRAM_AUTH_NOT_CONFIGURED", "SESSION_EXPIRED", "NO_STORY", "PRIVATE_ACCOUNT", "FETCH_FAILED", "RATE_LIMITED", "USER_NOT_FOUND"].includes(err.code)) throw err;
      if (["PROVIDER_RATE_LIMITED", "RATE_LIMITED"].includes(err.code)) throw new AppError("RATE_LIMITED", "Instagram is rate-limiting requests. Please try again shortly.", 429);
      if (err.code === "CONTENT_NOT_FOUND") throw new AppError("NO_STORY", `Story ${storyId} not found for "@${username}". It may have been deleted or never existed.`, 404);
      if (err.code === "CONTENT_UNAVAILABLE" || err.code === "UPSTREAM_FORBIDDEN") {
        logger.info("[story-resolve] direct Story ID not publicly accessible, will try HTML", { storyId, username });
        // Do not throw INSTAGRAM_AUTH_NOT_CONFIGURED here — allow public HTML fallback first
      } else {
        logger.info("[story-resolve] direct Story ID attempt failed, trying page HTML", { storyId, error: err instanceof Error ? err.message : String(err) });
      }
    } else {
      logger.info("[story-resolve] direct Story ID attempt failed, trying page HTML", { storyId, error: err instanceof Error ? err.message : String(err) });
    }
  }

  // Attempt 2: Direct story page HTML (public, preserves exact ID) — allowed once even after 429
  onProgress?.(50, "Fetching Story");
  try {
    const { html } = await fetchHtmlWithStatus(url, "direct_story_page", state);
    if (html && !looksLikeLoginWall(html)) {
      const htmlMedia = extractStoryMediaFromHtml(html, storyId);
      if (htmlMedia) {
        // Verify the HTML actually contained the requested storyId context
        const hasIdContext = html.includes(storyId);
        logger.info("[story-resolve] story page HTML media extracted", { storyId, hasIdContext, mediaType: htmlMedia.type });
        const synthetic = {
          pk: storyId,
          id: storyId,
          video_versions: htmlMedia.type === "video" ? [{ url: htmlMedia.url, width: htmlMedia.width, height: htmlMedia.height }] : [],
          image_versions2: htmlMedia.type === "image" ? { candidates: [{ url: htmlMedia.url, width: htmlMedia.width, height: htmlMedia.height }] } : { candidates: [] },
          user: { username },
        } as unknown as Record<string, unknown>;
        const { media, title, author } = extractStoryMediaItem(synthetic, username);
        // Exact-ID HTML media is unverified until probed: a poster near the
        // ID must never ship as the Story without a Content-Type check.
        const observedMime = await validateStoryMedia(media);
        if (observedMime) media.mimeType = observedMime;
        withMimeDefault(media);
        onProgress?.(85, "Validating media");
        logger.info("[STORY][SELECTION]", {
          via: "direct-html",
          totalCandidates: 1,
          videoCandidates: media.type === "video" ? 1 : 0,
          imageCandidates: media.type === "image" ? 1 : 0,
          rejectedCandidates: 0,
          selectedType: media.type === "video" ? "VIDEO" : "IMAGE",
          selectedMimeType: media.mimeType ?? (media.type === "video" ? "video/mp4" : "image/jpeg"),
          selectedSource: redactMediaUrl(media.url).split("/")[0],
          selectedWidth: media.width,
          selectedHeight: media.height,
        });
        logger.info("[story-resolve] Story resolved via page HTML (exact)", { mediaType: media.type, duration: Date.now() - start });
        return {
          type: "STORY",
          sourceUrl: url,
          thumbnail: media.thumbnail || (media.type === "image" ? media.url : null),
          title,
          author,
          media: [media],
        };
      }
    } else if (html && looksLikeLoginWall(html)) {
      state.sawLoginWall = true;
      logger.info("[story-resolve] direct story page is login wall, will try username list", { storyId, username, hasCookie: isInstagramCookieConfigured() });
      // Do not throw yet — allow fallback to username list, which will give accurate auth-required vs expired
    }
  } catch (err) {
    if (err instanceof AppError) {
      // Preserve distinct auth errors, but allow fallback for generic public failures
      if (["INSTAGRAM_AUTH_NOT_CONFIGURED", "SESSION_EXPIRED", "PRIVATE_ACCOUNT"].includes(err.code)) throw err;
    }
    logger.info("[story-resolve] direct story page HTML attempt failed, falling back to list", { storyId, error: err instanceof Error ? err.message : String(err) });
  }

  // Attempt 2b: Puppeteer browser fallback for the exact Story URL (network
  // capture + hydration). Only after exact fetch attempts, before the tray.
  checkStoryDeadline(start, "browser-exact");
  if (!state.rateLimited) {
    logger.info("[STORY] fallback strategy", { next: "browser-exact", storyId });
    onProgress?.(60, "Discovering Story data");
    try {
      const browserResult = await resolveViaBrowserFallback(
        url,
        "STORY",
        state,
        onProgress,
        start + STORY_BUDGETS.maxResolveMs
      );
      if (browserResult && browserResult.media.length > 0) {
        onProgress?.(85, "Validating media");
        logger.info("[story-resolve] Story resolved via browser fallback (exact page)", {
          mediaType: browserResult.media[0].type,
          duration: Date.now() - start,
        });
        return browserResult;
      }
    } catch (err) {
      if (err instanceof AppError && (err.code === "RATE_LIMITED" || err.code === "STORY_MEDIA_EXPIRED")) throw err;
      logger.info("[STORY] strategy failed", { strategy: "browser-exact", reason: err instanceof AppError ? err.code : "unknown" });
    }
  }

  // Attempt 3: Fallback to username Story list (only after exact attempts)
  // Controlled: do not make another API request if already rate-limited
  if (state.rateLimited) {
    logger.info("[story-resolve] request summary", {
      totalRequests: state.totalRequests,
      apiRequests: state.apiRequests,
      htmlRequests: state.htmlRequests,
      saw429: state.saw429,
      usedAuthenticatedRequest: state.usedAuthenticatedRequest,
      exactStoryAttempted: state.exactStoryAttempted,
    });
    throw new AppError("RATE_LIMITED", "Instagram is temporarily rate-limiting requests. Please try again later.", 429);
  }
  logger.info("[story-resolve] falling back to username Story list for direct URL", { username, storyId, hasCookie: isInstagramCookieConfigured(), rateLimited: state.rateLimited });
  checkStoryDeadline(start, "username-list-fallback");
  onProgress?.(70, "Resolving username");
  const userId = await resolveUserId(username, state);
  onProgress?.(78, "Fetching Story");
  const items = await fetchReelsMedia(userId, storyId, url, state);
  if (items.length === 0) {
    // NO_STORY only with a verified-valid session (or an anonymous run whose
    // public chain completed ungated) and a recognized empty tray — never on
    // gating or parse evidence.
    if (state.trayStructureUnknown) {
      traceStoryError(state, {
        stage: "direct-tray-empty",
        errorCode: "FETCH_FAILED",
        reason: "unknown-tray-structure",
        httpStatus: state.reelsStatus,
        storyCount: 0,
        mediaCount: 0,
      });
      throw new AppError("FETCH_FAILED", "Story request failed during tray-parse: Instagram returned an unexpected Story format.", 502);
    }
    const directSessionLive = state.authedStatus === 200;
    traceStoryError(state, {
      stage: "direct-tray-empty",
      errorCode: directSessionLive || !state.sessionWasConfigured ? "NO_STORY" : "SESSION_EXPIRED",
      reason: "empty-tray",
      httpStatus: state.reelsStatus,
      storyCount: 0,
      mediaCount: 0,
    });
    if (directSessionLive || !state.sessionWasConfigured) {
      throw new AppError("NO_STORY", `Story ${storyId} not found for "@${username}". It may have been deleted, never existed, or expired after 24 hours.`, 404);
    }
    throw new AppError("SESSION_EXPIRED", "Instagram session expired or requires verification.", 401);
  }
  const matched = items.find((it) => itemMatchesStoryId(it, storyId));
  if (matched) {
    const { media, title, author } = extractStoryMediaItem(matched, username);
    const observedMime = await validateStoryMedia(media);
    if (observedMime) media.mimeType = observedMime;
    withMimeDefault(media);
    onProgress?.(85, "Validating media");
    logger.info("[story-resolve] Story resolved via list fallback (exact match)", { mediaType: media.type, hasThumbnail: Boolean(media.thumbnail), duration: Date.now() - start, extractor: "story-api-fallback", publicAttempt: true });
    return {
      type: "STORY",
      sourceUrl: url,
      thumbnail: media.thumbnail || (media.type === "image" ? media.url : null),
      title,
      author,
      media: [media],
    };
  }
  logger.warn("[story-resolve] storyId not found even in fallback list", {
    requestedId: storyId,
    availableIds: items.slice(0, 5).map((it) => String(it["pk"] ?? it["id"] ?? "")).join(","),
    itemCount: items.length,
    extractor: "story-api-fallback",
    publicAttempt: true,
  });
  // Attempt 4: optional external provider, exactly once when configured.
  if (!state.rateLimited) {
    try {
      const externalResult = await resolveViaExternalStoryFallback(url, "STORY", state, onProgress, 80);
      if (externalResult && externalResult.media.length > 0) {
        onProgress?.(85, "Validating media");
        return externalResult;
      }
    } catch (err) {
      if (err instanceof AppError && (err.code === "RATE_LIMITED" || err.code === "STORY_MEDIA_EXPIRED")) throw err;
      logger.info("[STORY] strategy failed", { strategy: "external-exact", reason: err instanceof AppError ? err.code : "unknown" });
    }
  }
  // Distinguish exact-ID failure from generic list empty
  traceStoryError(state, {
    stage: "direct-id-unmatched",
    errorCode: "CONTENT_NOT_FOUND",
    reason: "story-id-absent-from-tray",
    httpStatus: state.reelsStatus,
    storyCount: items.length,
    mediaCount: 0,
  });
  throw new AppError("CONTENT_NOT_FOUND", `Story ${storyId} not found for "@${username}". It may have expired after 24 hours, been deleted, or is not publicly accessible.`, 404);
}

export function isStoryOrHighlightUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const rawSegments = parsed.pathname.split("/").filter(Boolean);
    const segments = rawSegments.map((s) => s.toLowerCase());
    if (segments[0] === "stories" || segments[0] === "story" || segments[0] === "s") return true;
    // Bare profile URL (/USERNAME/) routes to the Story resolver's public
    // username-list branch. Reserved/system single segments never qualify.
    if (rawSegments.length === 1) {
      const candidate = rawSegments[0];
      if (!STORY_RESERVED_SINGLE.has(candidate.toLowerCase()) && STORY_USERNAME_RE.test(candidate)) {
        return true;
      }
    }
    return false;
  } catch {
    return url.includes("/stories/") || url.includes("/story/") || url.includes("/s/");
  }
}
