export const PRODUCTION_API_BASE = "https://backend-chi-orpin-90.vercel.app";
const LOCAL_API_BASE = "http://localhost:3001";

function pointsAtLocalhost(value: string): boolean {
  return /^(https?:\/\/)?(localhost|127\.0\.0\.1|\[::1\])([:/]|$)/i.test(value);
}

export function getApiBase(): string {
  const configured = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
  // Explicit non-localhost env always wins (allows staging / custom backends).
  if (configured && !pointsAtLocalhost(configured)) {
    return configured;
  }
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const isLocalHost = host === "localhost" || host === "127.0.0.1" || host === "[::1]";
    // Local dev keeps using localhost (from env or default).
    if (isLocalHost) {
      return configured || LOCAL_API_BASE;
    }
    // Production host: a localhost build-time value (local .env is never
    // deployed) would resolve to the viewer's own machine and fail. The
    // frontend has no /api routes — the backend lives on a separate domain —
    // so fall back to the production backend instead of same-origin.
    if (pointsAtLocalhost(configured)) {
      console.warn(
        "[Downloadit] NEXT_PUBLIC_API_BASE_URL points at localhost on a production host; using production backend instead."
      );
    }
    return PRODUCTION_API_BASE;
  }
  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_API_BASE;
  }
  return (configured || LOCAL_API_BASE).replace(/\/+$/, "");
}

export interface MediaItem {
  url: string;
  type: "image" | "video" | "audio";
  width: number | null;
  height: number | null;
  duration: number | null;
  size?: number | null;
  thumbnail: string | null;
  format: string | null;
  /** Verified upstream MIME observed by the resolver (e.g. "video/mp4"). */
  mimeType?: string | null;
  /** Separate audio rendition for split-track videos (Instagram Reels). */
  audioUrl?: string | null;
}

export interface Author {
  username: string | null;
  displayName: string | null;
}

export interface ResolveData {
  type: string;
  sourceUrl: string;
  thumbnail: string | null;
  title: string | null;
  author: Author | null;
  media: MediaItem[];
  mediaId?: string;
  /** 0-based carousel start slide from `?img_index=` (null when absent). */
  startIndex?: number | null;
}

export interface ResolveSuccess {
  success: true;
  data: ResolveData;
}

export interface ResolveError {
  success: false;
  error: { code: string; message: string };
}

export type ResolveResponse = ResolveSuccess | ResolveError;

export type ApiRequestType =
  | "resolve-post"
  | "resolve-sse"
  | "media-stream"
  | "media-download"
  | "audio-post";

export type ApiFailureCategory =
  | "network"
  | "offline"
  | "timeout"
  | "aborted"
  | "server"
  | "malformed-response";

export interface ApiFailureDiagnostic {
  requestType: ApiRequestType;
  backendHost: string;
  configuredHost: string | null;
  usedProductionFallback: boolean;
  status: number | null;
  category: ApiFailureCategory;
}

function hostOf(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).hostname.toLowerCase() || null;
  } catch {
    return null;
  }
}

function failureMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof DOMException !== "undefined" && error instanceof DOMException) return error.message;
  return "";
}

/**
 * True when the browser itself reports no connectivity. Checked first by the
 * resolve flow: submitting or retrying while offline must create zero API
 * requests instead of a doomed SSE + POST pair.
 */
export function isBrowserOffline(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

/**
 * Browser/network transport failure (ERR_INTERNET_DISCONNECTED,
 * ERR_NETWORK_CHANGED, ERR_CONNECTION_RESET/ABORTED, TypeError: Failed to
 * fetch, NetworkError, ...). This is CLIENT_NETWORK_ERROR: it must never be
 * rendered as an Instagram rate limit, content verdict, or resolver failure.
 * Deliberately excludes AbortError — our own supersede/unmount abort is
 * lifecycle, not a network failure.
 */
export function isNetworkFailure(error: unknown): boolean {
  if (isBrowserOffline()) return true;
  const message = failureMessage(error);
  if (!message) return false;
  return /failed to fetch|networkerror|network request failed|err_internet_disconnected|err_network_changed|err_connection_reset|err_connection_aborted|err_connection_closed|err_connection_refused|err_name_not_resolved|connection reset|load failed|fetch failed/i.test(
    message
  );
}

function failureCategory(status: number | null, error: unknown): ApiFailureCategory {
  if (status !== null) return "server";
  if (error instanceof DOMException && error.name === "TimeoutError") return "timeout";
  if (error instanceof DOMException && error.name === "AbortError") return "aborted";
  const message = failureMessage(error);
  if (/play\(\) request was interrupted|not allowed|autoplay/i.test(message)) return "aborted";
  if (/timeout|timed out|deadline exceeded/i.test(message)) return "timeout";
  if (isBrowserOffline()) return "offline";
  if (isNetworkFailure(error)) return "network";
  return "network";
}

/**
 * Safe failure telemetry for production connection diagnosis.
 *
 * Only the API endpoint path, backend/configured hosts, HTTP status, and a
 * failure category are logged. Query strings are never logged because stream
 * and download URLs contain signed Instagram CDN URLs.
 */
export function logApiFailure(input: {
  requestType: ApiRequestType;
  requestUrl: string;
  status: number | null;
  error: unknown;
  category?: ApiFailureCategory;
}): ApiFailureDiagnostic {
  let endpoint = "(invalid-request-url)";
  try {
    endpoint = new URL(input.requestUrl).pathname || "/";
  } catch {
    /* keep the placeholder */
  }
  const configured = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
  const isBrowser = typeof window !== "undefined";
  const browserHost = isBrowser ? window.location.hostname : null;
  const browserIsLocalHost =
    browserHost === "localhost" || browserHost === "127.0.0.1" || browserHost === "[::1]";
  const diagnostic: ApiFailureDiagnostic = {
    requestType: input.requestType,
    backendHost: hostOf(getApiBase()) ?? "(unknown-backend-host)",
    configuredHost: configured ? hostOf(configured) : null,
    usedProductionFallback:
      isBrowser && !browserIsLocalHost && configured ? pointsAtLocalhost(configured) : false,
    status: input.status,
    category: input.category ?? failureCategory(input.status, input.error),
  };
  console.warn("[Downloadit API] request failed", {
    requestType: diagnostic.requestType,
    endpoint,
    backendHost: diagnostic.backendHost,
    configuredHost: diagnostic.configuredHost,
    usedProductionFallback: diagnostic.usedProductionFallback,
    status: diagnostic.status,
    category: diagnostic.category,
  });
  return diagnostic;
}

export function isResolveResponse(value: unknown): value is ResolveResponse {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as {
    success?: unknown;
    data?: unknown;
    error?: unknown;
  };
  if (candidate.success === true) {
    const data = candidate.data as { media?: unknown } | null;
    return typeof data === "object" && data !== null && Array.isArray(data.media);
  }
  if (candidate.success === false) {
    const error = candidate.error as { code?: unknown; message?: unknown } | null;
    return (
      typeof error === "object" &&
      error !== null &&
      typeof error.code === "string" &&
      typeof error.message === "string"
    );
  }
  return false;
}

export interface ResolveRequestOptions {
  /**
   * Stale-media recovery: bypass the server's resolved-URL cache and resolve
   * freshly. The preview layer sets this ONLY for its single automatic retry
   * after the backend answered 410 MEDIA_URL_EXPIRED — never for initial
   * resolves — so a retry cannot reuse the same expired signed CDN URL.
   */
  refresh?: boolean;
}

export async function resolveInstagramUrl(
  url: string,
  signal?: AbortSignal,
  opts?: ResolveRequestOptions
): Promise<ResolveResponse> {
  const requestUrl = `${getApiBase()}/api/resolve`;
  let response: Response;
  try {
    response = await fetch(requestUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts?.refresh === true ? { url, refresh: true } : { url }),
      signal,
    });
  } catch (error) {
    logApiFailure({ requestType: "resolve-post", requestUrl, status: null, error });
    throw error;
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    if (isResolveResponse(body) && !body.success) {
      logApiFailure({
        requestType: "resolve-post",
        requestUrl,
        status: response.status,
        error: new Error(`resolve-post-${body.error.code}`),
      });
      return body;
    }
    logApiFailure({
      requestType: "resolve-post",
      requestUrl,
      status: response.status,
      error: new Error("resolve-post-malformed-response"),
      category: "malformed-response",
    });
    return { success: false, error: { code: "TEMPORARY_ERROR", message: "The server returned an unexpected response." } };
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    logApiFailure({
      requestType: "resolve-post",
      requestUrl,
      status: response.status,
      error,
      category: "malformed-response",
    });
    return { success: false, error: { code: "TEMPORARY_ERROR", message: "The server returned an unexpected response." } };
  }
  if (!isResolveResponse(body)) {
    logApiFailure({
      requestType: "resolve-post",
      requestUrl,
      status: response.status,
      error: new Error("resolve-post-malformed-response"),
      category: "malformed-response",
    });
    return { success: false, error: { code: "TEMPORARY_ERROR", message: "The server returned an unexpected response." } };
  }
  return body;
}

/**
 * Story error mapping for the six pipeline verdicts (plus legacy aliases
 * from older backends, which render identically):
 * SESSION_EXPIRED / USER_NOT_FOUND / PRIVATE_ACCOUNT / RATE_LIMITED /
 * FETCH_FAILED / NO_STORY.
 *
 * An authentication / rate-limit / challenge / timeout / private / fetch
 * failure is NEVER rendered as "no active Story" — even if a backend message
 * ever regressed to one, the code-specific fallback wins for those classes.
 * When the backend message is present and honest it is shown verbatim (it
 * names the exact stage/reason); the fallbacks below only cover missing or
 * misleading text.
 */
const NO_STORY_MESSAGE_RE = /no active (public )?story/i;

export function storyErrorMessage(code: string, backendMessage?: string | null): string {
  const backend = typeof backendMessage === "string" ? backendMessage.trim() : "";
  const misleading = backend ? NO_STORY_MESSAGE_RE.test(backend) : true;
  const fallback = (text: string): string => (!misleading && backend ? backend : text);
  switch (code) {
    case "SESSION_EXPIRED":
    case "INSTAGRAM_AUTH_INVALID":
    case "INSTAGRAM_LOGIN_REQUIRED":
      // The backend only surfaces these after attempting public resolution
      // without the dead session, so the message says so: the failure is the
      // session's, and the public path was already tried. (The exact
      // Instagram response stays in server logs + diagnostics.)
      return "The configured Instagram session has expired. Public Story access was attempted without it — if this persists, the Story may be private or gone.";
    case "PRIVATE_ACCOUNT":
    case "STORY_PRIVATE":
      return fallback("Private account — Story unavailable.");
    case "RATE_LIMITED":
    case "INSTAGRAM_RATE_LIMITED":
    case "PROVIDER_RATE_LIMITED":
      return fallback("Instagram is rate-limiting requests. Please try again shortly.");
    case "USER_NOT_FOUND":
    case "STORY_PROFILE_NOT_FOUND":
      return fallback("That Instagram profile was not found. Check the username and try again.");
    case "FETCH_FAILED":
    case "STORY_MEDIA_NOT_FOUND":
    case "STORY_MEDIA_DISCOVERED_BUT_INVALID":
    case "STORY_SOURCE_UNAVAILABLE":
    case "STORY_MEDIA_NOT_DISCOVERED":
    case "STORY_PARSE_FAILED":
    case "STORY_PROVIDER_FAILED":
    case "INSTAGRAM_PROVIDER_ERROR":
    case "RESOLVER_TIMEOUT":
    case "PROVIDER_TIMEOUT":
    case "STREAM_TIMEOUT":
    case "STORY_RESOLUTION_TIMEOUT":
    case "STORY_NOT_FOUND":
    case "STORY_EXPIRED":
    case "CONTENT_NOT_FOUND":
      return fallback("The actual Story media could not be resolved.");
    case "NO_STORY":
    case "NO_ACTIVE_PUBLIC_STORY":
    case "STORY_NOT_ACTIVE":
      return backend || "This account has no active public Story right now. Stories expire after 24 hours.";
    case "INSTAGRAM_AUTH_EMPTY_RESPONSE":
      return backend || "Instagram accepted the request but returned no Story media. The Story may not exist, or access may be limited right now.";
    case "INSTAGRAM_CHALLENGE":
      return backend || "Instagram asked for verification. Please try again later.";
    case "STORY_PROVIDER_REQUIRED":
      // Fixed text: the backend emits this only after the full public chain
      // (plus any configured external provider) found nothing without a live
      // session — absence unprovable, not absence proven.
      return "Instagram is not returning Story media to this server. Configure a supported Story provider to resolve public Stories.";
    default:
      return backend || "Something went wrong while fetching the media. Please try again.";
  }
}

export interface ResolveStreamHandlers {
  onProgress: (progress: number, stage: string) => void;
  onComplete: (data: ResolveData) => void;
  onError: (error: { code: string; message: string }) => void;
  /**
   * Transport-level failure: the stream dropped without any server payload
   * (network cut, proxy timeout, blocked EventSource). When provided, the
   * caller owns recovery (e.g. one plain POST fallback) and this function
   * reports nothing itself. Otherwise a generic connection error is sent
   * to onError.
   */
  onTransportError?: () => void;
}

export interface ResolveStreamHandle {
  close: () => void;
}

/**
 * Opens the SSE resolve stream. Every `progress` event corresponds to a
 * backend stage that has actually completed — the client never synthesizes
 * percentages. Returns a handle whose `close()` stops the stream (used for
 * superseded requests and unmount cleanup). Each stream is single-use:
 * `complete`/`error` close it automatically.
 *
 * RESOLVE RETRY POLICY (the single policy for resolve requests — nothing else
 * in the app retries a resolve):
 *  1. One SSE stream per user action. EVERY terminal path closes it first,
 *     which also stops EventSource's built-in auto-reconnect: a disconnect
 *     can never turn into a reconnect loop.
 *  2. At most ONE plain-POST fallback, via `onTransportError`, and only when
 *     the stream dropped without a server verdict.
 *  3. After that, only an explicit user retry ("Try again" → submit) starts a
 *     new job. Reconnecting (`online` event) never auto-starts one.
 * Late or repeated events after close are ignored, so the fallback — and any
 * handler — runs at most once per handle.
 */
export function startResolveStream(url: string, handlers: ResolveStreamHandlers): ResolveStreamHandle {
  const es = new EventSource(`${getApiBase()}/api/resolve/stream?url=${encodeURIComponent(url)}`);
  let closed = false;
  // Monotonic per-stream guard (mirrors the backend gate): resolver fallback
  // stages can legitimately repeat a value, but a late event from a
  // coalesced/superseded job must never rewind the UI (e.g. 75 → 35). Equal
  // values still pass so stage text keeps updating. A genuinely new
  // extraction gets a fresh handle, so progress restarts only then.
  let maxProgress = -1;
  const close = () => {
    if (!closed) {
      closed = true;
      es.close();
    }
  };
  const transportError = () => {
    if (closed) return;
    close();
    if (handlers.onTransportError) {
      handlers.onTransportError();
      return;
    }
    handlers.onError({ code: "TEMPORARY_ERROR", message: "Connection to the server was lost." });
  };

  es.addEventListener("progress", (e) => {
    if (closed) return;
    try {
      const data = JSON.parse((e as MessageEvent).data) as { progress?: unknown; stage?: unknown };
      if (typeof data.progress === "number") {
        if (!Number.isFinite(data.progress) || data.progress < maxProgress) return;
        maxProgress = data.progress;
        handlers.onProgress(data.progress, typeof data.stage === "string" ? data.stage : "");
      }
    } catch {
      /* ignore malformed tick */
    }
  });

  es.addEventListener("complete", (e) => {
    if (closed) return;
    try {
      const data = JSON.parse((e as MessageEvent).data) as { data?: ResolveData };
      if (data && data.data && Array.isArray(data.data.media)) {
        handlers.onComplete(data.data);
      } else {
        handlers.onError({ code: "TEMPORARY_ERROR", message: "The server returned an unexpected response." });
      }
    } catch {
      handlers.onError({ code: "TEMPORARY_ERROR", message: "The server returned an unexpected response." });
    }
    close();
  });

  es.addEventListener("error", (e) => {
    if (closed) return;
    const raw = (e as MessageEvent).data;
    if (typeof raw === "string" && raw) {
      try {
        const data = JSON.parse(raw) as { code?: unknown; message?: unknown };
        if (data && typeof data.code === "string") {
          handlers.onError({
            code: data.code,
            message: typeof data.message === "string" && data.message ? data.message : "Something went wrong.",
          });
          close();
          return;
        }
      } catch {
        /* fall through to transport error */
      }
    }
    // No payload means the transport itself failed (EventSource network error).
    transportError();
  });

  return { close };
}

export function getStreamUrl(mediaUrl: string, sourceUrl?: string): string {
  const base = `${getApiBase()}/api/stream?url=${encodeURIComponent(mediaUrl)}`;
  return sourceUrl ? `${base}&source=${encodeURIComponent(sourceUrl)}` : base;
}

/**
 * Backend error codes that prove the signed CDN URL behind a preview is
 * stale/expired (as opposed to a transient transport failure). Only these —
 * observed from a structured error payload or HTTP status — may trigger the
 * preview layer's single fresh-resolve retry. Anything else keeps the
 * bounded same-URL cache-buster and then the honest unavailable state, so a
 * broken player can never turn into a resolve loop.
 */
const EXPIRED_MEDIA_CODES = new Set(["MEDIA_URL_EXPIRED"]);

export function isExpiredMediaErrorCode(code: unknown): boolean {
  return typeof code === "string" && EXPIRED_MEDIA_CODES.has(code);
}

export function isExpiredMediaStatus(status: number | null | undefined): boolean {
  return status === 410;
}

/**
 * Strip this client's own `_retry` cache-buster from a proxied stream URL so
 * recovery bookkeeping compares the real media identity. Only the exact
 * `_retry=<digits>` parameter this app appends is removed; CDN signatures
 * embedded in `url=` are byte-identical before and after.
 */
export function stripStreamRetryParam(proxyUrl: string): string {
  return proxyUrl
    .replace(/([?&])_retry=\d+(&|$)/, (_, sep: string, rest: string) => (rest ? sep : ""))
    .replace(/[?&]$/, "");
}

/**
 * Build the refreshed media list after a stale-media recovery resolve: the
 * item at `index` takes the fresh URL (plus fresh pairing/metadata where the
 * fresh result actually provides it); every other item is untouched. Returns
 * null when there is nothing fresh to switch to (empty result, missing item,
 * or byte-identical URL), in which case the caller must show the honest
 * unavailable state instead of reloading the same expired bytes.
 */
export function refreshMediaItemUrl(
  items: MediaItem[],
  freshMedia: MediaItem[] | null | undefined,
  index: number
): MediaItem[] | null {
  if (!Array.isArray(items) || items.length === 0) return null;
  if (!Array.isArray(freshMedia) || freshMedia.length === 0) return null;
  const safe = Math.max(0, Math.min(index, items.length - 1));
  const freshSafe = Math.max(0, Math.min(index, freshMedia.length - 1));
  const prev = items[safe];
  const cand = freshMedia[freshSafe];
  if (!prev || !cand) return null;
  if (typeof cand.url !== "string" || cand.url.length === 0) return null;
  if (cand.url === prev.url) return null;
  const next = items.slice();
  next[safe] = {
    ...prev,
    url: cand.url,
    // Pairing/metadata refresh only from real values: a null in the fresh
    // result means "unknown", never "erase what the working item had".
    // The audio pairing is the exception — a stale audioUrl is worse than
    // none, so it always follows the fresh result.
    audioUrl:
      typeof cand.audioUrl === "string" && cand.audioUrl.length > 0 ? cand.audioUrl : null,
    width: typeof cand.width === "number" ? cand.width : prev.width,
    height: typeof cand.height === "number" ? cand.height : prev.height,
    duration: typeof cand.duration === "number" ? cand.duration : prev.duration,
    size: typeof cand.size === "number" ? cand.size : prev.size,
    format: typeof cand.format === "string" && cand.format.length > 0 ? cand.format : prev.format,
    thumbnail:
      typeof cand.thumbnail === "string" && cand.thumbnail.length > 0
        ? cand.thumbnail
        : prev.thumbnail,
  };
  return next;
}

export function getDownloadUrl(mediaUrl: string, filename: string, sourceUrl?: string): string {
  const base = `${getApiBase()}/api/download?url=${encodeURIComponent(mediaUrl)}&filename=${encodeURIComponent(filename)}`;
  return sourceUrl ? `${base}&source=${encodeURIComponent(sourceUrl)}` : base;
}
