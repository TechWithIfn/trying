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
  | "audio-post"
  | "pinterest-resolve"
  | "pinterest-sse"
  | "youtube-resolve"
  | "youtube-download";

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
function openResolveStream(streamUrl: string, handlers: ResolveStreamHandlers): ResolveStreamHandle {
  const es = new EventSource(streamUrl);
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

export function startResolveStream(url: string, handlers: ResolveStreamHandlers): ResolveStreamHandle {
  return openResolveStream(`${getApiBase()}/api/resolve/stream?url=${encodeURIComponent(url)}`, handlers);
}

/**
 * Pin media the caller expects. "any" lets the backend auto-detect whether the
 * pin carries a video or an image (and answer with whichever it actually has);
 * "video"/"image" are strict manual overrides that fail honestly when the pin
 * does not carry that media type.
 */
export type PinterestKind = "video" | "image" | "any";

/**
 * Client-side Pinterest URL shape check (mirrors the backend validator). This
 * only gates the submit button and gives an instant message; the backend
 * re-validates every URL authoritatively before any browser work starts.
 */
export function isValidPinterestUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  const host = parsed.hostname.toLowerCase();
  if (host === "pin.it" || host === "www.pin.it") return true;
  return /^(?:[a-z0-9-]+\.)*pinterest\.(?:com|[a-z]{2}|co\.[a-z]{2}|com\.[a-z]{2})$/.test(host);
}

/**
 * Opens the Pinterest resolve SSE stream. Same single-use / supersede
 * contract as {@link startResolveStream}; `kind` selects the pin media the
 * caller expects ("video", "image", or "any" for automatic detection) so the
 * backend can answer honestly when the pin does not carry that media type.
 */
export function startPinterestResolveStream(
  url: string,
  kind: PinterestKind,
  handlers: ResolveStreamHandlers
): ResolveStreamHandle {
  return openResolveStream(
    `${getApiBase()}/api/pinterest/resolve/stream?url=${encodeURIComponent(url)}&kind=${kind}&_=${Date.now()}`,
    handlers
  );
}

/**
 * Plain-POST fallback for the Pinterest stream (used only when the SSE
 * transport drops without a server verdict — same policy as the Instagram
 * flow). Resolves to the honest backend verdict on every failure path.
 */
export async function resolvePinterestUrl(
  url: string,
  kind: PinterestKind,
  signal?: AbortSignal
): Promise<ResolveResponse> {
  const requestUrl = `${getApiBase()}/api/pinterest/resolve`;
  let response: Response;
  try {
    response = await fetch(requestUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, kind }),
      cache: "no-store",
      signal,
    });
  } catch (error) {
    logApiFailure({ requestType: "pinterest-resolve", requestUrl, status: null, error });
    throw error;
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    if (isResolveResponse(body) && !body.success) {
      logApiFailure({
        requestType: "pinterest-resolve",
        requestUrl,
        status: response.status,
        error: new Error(`pinterest-resolve-${body.error.code}`),
      });
      return body;
    }
    logApiFailure({
      requestType: "pinterest-resolve",
      requestUrl,
      status: response.status,
      error: new Error("pinterest-resolve-malformed-response"),
      category: "malformed-response",
    });
    return { success: false, error: { code: "TEMPORARY_ERROR", message: "The server returned an unexpected response." } };
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    logApiFailure({
      requestType: "pinterest-resolve",
      requestUrl,
      status: response.status,
      error,
      category: "malformed-response",
    });
    return { success: false, error: { code: "TEMPORARY_ERROR", message: "The server returned an unexpected response." } };
  }
  if (!isResolveResponse(body)) {
    logApiFailure({
      requestType: "pinterest-resolve",
      requestUrl,
      status: response.status,
      error: new Error("pinterest-resolve-malformed-response"),
      category: "malformed-response",
    });
    return { success: false, error: { code: "TEMPORARY_ERROR", message: "The server returned an unexpected response." } };
  }
  return body;
}

/* -------------------------------------------------------------------------- */
/* YouTube                                                                     */
/* -------------------------------------------------------------------------- */

export type YouTubeFormat = "mp4" | "mp3" | "m4a";

export type YouTubeAudioFormat = "mp3" | "m4a";

export interface YouTubeAudioOption {
  format: YouTubeAudioFormat;
  bitrateKbps: number;
  label: string;
}

export interface YouTubeQuality {
  height: number;
  label: string;
  fps: number | null;
}

export interface YouTubeResolveData {
  type: "VIDEO";
  videoId: string;
  sourceUrl: string;
  title: string;
  author: Author | null;
  thumbnail: string;
  duration: number | null;
  qualities: YouTubeQuality[];
  audioAvailable: boolean;
  /** Only options the backend can actually encode are returned. */
  audioOptions?: YouTubeAudioOption[];
}

export interface YouTubeResolveSuccess {
  success: true;
  data: YouTubeResolveData;
}

export interface YouTubeError {
  code: string;
  message: string;
  retryable?: boolean;
  diagnostics?: { availableQualities?: number[] };
}

export type YouTubeResolveResponse =
  | YouTubeResolveSuccess
  | { success: false; error: YouTubeError };

const YOUTUBE_VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

/**
 * Client-side mirror of the backend validator. Instant feedback only — the
 * backend re-validates every URL before any yt-dlp work starts.
 */
export function isValidYouTubeUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  if (/^(javascript|data|blob|vbscript|file|ftp):/i.test(trimmed)) return false;
  let parsed: URL;
  try {
    parsed =
      /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? new URL(trimmed) : new URL(`https://${trimmed}`);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  if (parsed.username || parsed.password || parsed.port) return false;
  const host = parsed.hostname.toLowerCase().replace(/\.$/, "");
  if (!YOUTUBE_HOSTS.has(host)) return false;

  const segments = parsed.pathname.split("/").filter(Boolean);
  if (host === "youtu.be" || host === "www.youtu.be") {
    return segments.length === 1 && YOUTUBE_VIDEO_ID_RE.test(segments[0]);
  }
  if (segments.length === 1 && segments[0].toLowerCase() === "watch") {
    const id = parsed.searchParams.get("v");
    return Boolean(id && YOUTUBE_VIDEO_ID_RE.test(id));
  }
  return (
    segments.length === 2 &&
    (segments[0].toLowerCase() === "shorts" || segments[0].toLowerCase() === "embed") &&
    YOUTUBE_VIDEO_ID_RE.test(segments[1])
  );
}

function isYouTubeErrorBody(value: unknown): value is { success: false; error: YouTubeError } {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { success?: unknown; error?: unknown };
  if (candidate.success !== false) return false;
  const error = candidate.error as { code?: unknown; message?: unknown } | null;
  return (
    typeof error === "object" &&
    error !== null &&
    typeof error.code === "string" &&
    typeof error.message === "string"
  );
}

function isYouTubeResolveSuccess(value: unknown): value is YouTubeResolveSuccess {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { success?: unknown; data?: unknown };
  if (candidate.success !== true) return false;
  const data = candidate.data as { type?: unknown; videoId?: unknown; qualities?: unknown } | null;
  return (
    typeof data === "object" &&
    data !== null &&
    data.type === "VIDEO" &&
    typeof data.videoId === "string" &&
    Array.isArray(data.qualities)
  );
}

export async function resolveYouTubeUrl(
  url: string,
  signal?: AbortSignal
): Promise<YouTubeResolveResponse> {
  const requestUrl = `${getApiBase()}/api/youtube/resolve`;
  let response: Response;
  try {
    response = await fetch(requestUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
      cache: "no-store",
      signal,
    });
  } catch (error) {
    logApiFailure({ requestType: "youtube-resolve", requestUrl, status: null, error });
    throw error;
  }

  const body = await response.json().catch(() => null);
  if (isYouTubeResolveSuccess(body)) return body;
  if (isYouTubeErrorBody(body)) {
    logApiFailure({
      requestType: "youtube-resolve",
      requestUrl,
      status: response.status,
      error: new Error(`youtube-resolve-${body.error.code}`),
    });
    return body;
  }

  logApiFailure({
    requestType: "youtube-resolve",
    requestUrl,
    status: response.status,
    error: new Error("youtube-resolve-malformed-response"),
    category: "malformed-response",
  });
  return {
    success: false,
    error: { code: "TEMPORARY_ERROR", message: "The server returned an unexpected response." },
  };
}

export function getYouTubeDownloadUrl(
  url: string,
  format: YouTubeFormat,
  quality?: number,
  bitrateKbps?: number
): string {
  const params = new URLSearchParams({ url, format });
  if (format === "mp4" && quality) params.set("quality", String(quality));
  if (format !== "mp4" && bitrateKbps) params.set("bitrate", String(bitrateKbps));
  return `${getApiBase()}/api/youtube/download?${params.toString()}`;
}

export interface YouTubeDownloadProgress {
  loaded: number;
  total: number | null;
}

export type YouTubeDownloadResult =
  | { ok: true; blob: Blob }
  | { ok: false; error: YouTubeError };

/**
 * Download the prepared file through fetch so the UI can show REAL byte
 * progress and only claim success after the complete file has arrived. The
 * backend prepares (downloads, merges, converts) before sending the body, so a
 * non-2xx response is always an honest JSON error.
 */
export async function downloadYouTubeFile(options: {
  url: string;
  format: YouTubeFormat;
  quality?: number;
  bitrateKbps?: number;
  signal?: AbortSignal;
  onProgress?: (progress: YouTubeDownloadProgress) => void;
}): Promise<YouTubeDownloadResult> {
  const requestUrl = getYouTubeDownloadUrl(
    options.url,
    options.format,
    options.quality,
    options.bitrateKbps
  );
  let response: Response;
  try {
    response = await fetch(requestUrl, { cache: "no-store", signal: options.signal });
  } catch (error) {
    logApiFailure({ requestType: "youtube-download", requestUrl, status: null, error });
    throw error;
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    if (isYouTubeErrorBody(body)) {
      logApiFailure({
        requestType: "youtube-download",
        requestUrl,
        status: response.status,
        error: new Error(`youtube-download-${body.error.code}`),
      });
      return { ok: false, error: body.error };
    }
    logApiFailure({
      requestType: "youtube-download",
      requestUrl,
      status: response.status,
      error: new Error("youtube-download-malformed-response"),
      category: "malformed-response",
    });
    return {
      ok: false,
      error: { code: "TEMPORARY_ERROR", message: "The server returned an unexpected response." },
    };
  }

  const header = Number(response.headers.get("content-length"));
  const total = Number.isFinite(header) && header > 0 ? header : null;
  const type =
    response.headers.get("content-type") ||
    (options.format === "m4a" ? "audio/mp4" : options.format === "mp3" ? "audio/mpeg" : "video/mp4");

  if (!response.body) {
    const blob = await response.blob();
    options.onProgress?.({ loaded: blob.size, total: total ?? blob.size });
    return { ok: true, blob };
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        loaded += value.byteLength;
        options.onProgress?.({ loaded, total });
      }
    }
  } catch (error) {
    try {
      await reader.cancel();
    } catch {
      /* already cancelled */
    }
    logApiFailure({ requestType: "youtube-download", requestUrl, status: 200, error });
    throw error;
  }

  if (total !== null && loaded !== total) {
    logApiFailure({
      requestType: "youtube-download",
      requestUrl,
      status: 200,
      error: new Error("youtube-download-truncated"),
    });
    return {
      ok: false,
      error: {
        code: "TEMPORARY_ERROR",
        message: "The download ended before the whole file arrived. Please try again.",
      },
    };
  }

  options.onProgress?.({ loaded, total: total ?? loaded });
  return { ok: true, blob: new Blob(chunks as BlobPart[], { type }) };
}

export function getStreamUrl(mediaUrl: string, sourceUrl?: string): string {
  const base = `${getApiBase()}/api/stream?url=${encodeURIComponent(mediaUrl)}`;
  return sourceUrl ? `${base}&source=${encodeURIComponent(sourceUrl)}` : base;
}

/**
 * True only for a directly usable remote URL: a non-empty http(s) string.
 * Rejects javascript:/data:/blob: and other non-http(s) schemes so an unsafe
 * or empty value can never be mounted into a <video>/<img>. Shared by the
 * video preview source and the poster/thumbnail.
 */
export function isPlayableVideoUrl(u: unknown): u is string {
  if (typeof u !== "string") return false;
  const v = u.trim();
  if (!v) return false;
  try {
    const parsed = new URL(v);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * A poster/thumbnail is only used when it is a plausible remote image:
 * non-empty http(s) URL, never blob:/data:/javascript: and never an .mp4.
 * Query-signed CDN URLs carry no file extension, so no extension is required.
 */
export function isValidImagePoster(u: unknown): u is string {
  if (!isPlayableVideoUrl(u)) return false;
  const v = u.trim().toLowerCase();
  if (v.endsWith(".mp4") || v.includes(".mp4?") || v.includes(".mp4#")) return false;
  return true;
}

/**
 * The initial (pre-Preview) video surface: a small poster image streamed
 * through our own backend exactly like the full preview is. Returns null when
 * there is no usable thumbnail, in which case the caller shows a branded
 * fallback tile — never a huge empty player. Only the poster image is fetched;
 * the video itself is never downloaded to render the thumbnail.
 */
export function proxiedPosterUrl(
  thumbnail: string | null | undefined,
  sourceUrl?: string
): string | null {
  return isValidImagePoster(thumbnail) ? getStreamUrl(thumbnail, sourceUrl) : null;
}

/**
 * The one decision for the preview-first video surface, shared by EVERY
 * platform's result card (Instagram Reels/videos, Pinterest videos, ...).
 * `showThumbnailFirst` is the default state: a compact poster with
 * Preview + Download. `mountVideo` is true only after the user explicitly
 * opens the preview, at which point the real <video> is mounted (and only
 * then may it play). A non-video item, or a video without a playable source,
 * never gets either surface.
 */
export interface MediaPreviewPlan {
  /** A real, playable video the user can open. */
  canPreviewVideo: boolean;
  /** Render the poster/thumbnail as the initial, non-playing surface. */
  showThumbnailFirst: boolean;
  /** Mount the real <video> element (user opened the preview). */
  mountVideo: boolean;
}

export function mediaPreviewPlan(opts: {
  isVideo: boolean;
  hasPlayableVideo: boolean;
  previewOpen: boolean;
}): MediaPreviewPlan {
  const canPreviewVideo = Boolean(opts.isVideo && opts.hasPlayableVideo);
  const mountVideo = canPreviewVideo && Boolean(opts.previewOpen);
  return { canPreviewVideo, showThumbnailFirst: canPreviewVideo && !opts.previewOpen, mountVideo };
}

/**
 * What a click on a video result's media surface should do. While the compact
 * poster is showing, the whole surface (and its center Play control) opens the
 * preview and starts playback — the same action as the Preview button. Once the
 * real <video> is mounted the surface is inert (`"none"`): the native controls
 * own play/pause, so a click there must never double-toggle. Non-video and
 * unplayable items are always inert.
 */
export type MediaSurfaceAction = "open-preview" | "none";

export function mediaSurfaceAction(opts: {
  isVideo: boolean;
  hasPlayableVideo: boolean;
  previewOpen: boolean;
}): MediaSurfaceAction {
  return opts.isVideo && opts.hasPlayableVideo && !opts.previewOpen ? "open-preview" : "none";
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
 * The one definition of "currently playing" for the result card's overlay —
 * derived from the real <video>/<audio> element's own flags, never a timer.
 * `ended` counts as NOT playing, so the main Preview/Download controls return
 * when playback finishes.
 */
export function isVideoPlaying(paused: boolean, ended: boolean): boolean {
  return !paused && !ended;
}

/**
 * Shared on-video overlay state for EVERY platform's result card (Instagram
 * Reels/videos, Pinterest videos, any future video source). The overlay only
 * exists when a real, playable video preview is mounted. Before playback it
 * shows the Preview + Download pills; the instant the element reports playing
 * the Preview pill is hidden and Download collapses to a compact circular icon.
 * Paused, stopped or ended restores both. Derived purely from the element's own
 * flags — never a timer or a simulated state.
 */
export interface VideoOverlayState {
  showOverlay: boolean;
  showPreview: boolean;
  compactDownload: boolean;
}

export function videoOverlayState(opts: {
  isVideo: boolean;
  hasPlayableSrc: boolean;
  playing: boolean;
}): VideoOverlayState {
  const showOverlay = Boolean(opts.isVideo && opts.hasPlayableSrc);
  return {
    showOverlay,
    showPreview: showOverlay && !opts.playing,
    compactDownload: showOverlay && opts.playing,
  };
}

/**
 * The one decision for a genuine multi-image download. "Download all images"
 * only exists when the backend actually returned MORE THAN ONE image, so a
 * single-image post never shows a misleading multi-image action, and a mixed
 * carousel (e.g. one image + one video) never invents one or downloads the same
 * image twice.
 */
export interface ImageDownloadPlan {
  /** Number of real image items the backend returned. */
  imageCount: number;
  /** True only when a genuine multi-image set exists (>= 2 images). */
  canDownloadAll: boolean;
}

export function imageDownloadPlan(items: Array<{ type: string }> | null | undefined): ImageDownloadPlan {
  const imageCount = Array.isArray(items) ? items.filter((m) => m.type === "image").length : 0;
  return { imageCount, canDownloadAll: imageCount > 1 };
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
  const prev = items[safe];
  if (!prev) return null;
  const indexed = freshMedia[index];
  const sameType = freshMedia.filter((item) => item && item.type === prev.type);
  const cand =
    indexed?.type === prev.type
      ? indexed
      : sameType[Math.min(index, sameType.length - 1)];
  if (!cand) return null;
  if (typeof cand.url !== "string" || cand.url.length === 0) return null;
  if (cand.url === prev.url) return null;
  // Never let a recovery resolve turn a video slot into an image (or vice
  // versa), even if the fresh list has the same index. Mismatched media is an
  // honest unavailable state, not a playable result.
  if (cand.type !== prev.type) return null;
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

/**
 * Multi-image download: one ZIP from the backend. `url` is appended once per
 * image so the server can package every slide in a single attachment.
 */
export function getZipDownloadUrl(mediaUrls: string[], filename: string, sourceUrl?: string): string {
  const params = new URLSearchParams();
  for (const url of mediaUrls) params.append("url", url);
  params.set("filename", filename);
  if (sourceUrl) params.set("source", sourceUrl);
  return `${getApiBase()}/api/download/zip?${params.toString()}`;
}

/**
 * Make one filename component safe on Windows/Android/iOS: drop the reserved
 * characters and control bytes, collapse whitespace, remove trailing dots and
 * spaces, and truncate to `maxLen` Unicode code points (never splitting a
 * surrogate pair / combining mark). Returns "" when nothing usable remains so
 * the caller can substitute a fallback.
 */
export function sanitizeFilenameComponent(raw: string | null | undefined, maxLen = 100): string {
  if (typeof raw !== "string" || !raw) return "";
  let base = raw.normalize("NFC").replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, " ");
  base = base.replace(/\s+/g, " ").trim();
  base = base.replace(/[.\s]+$/, "");
  const chars = Array.from(base);
  if (chars.length > maxLen) base = chars.slice(0, maxLen).join("").trim();
  return base.replace(/[.\s]+$/, "");
}

/**
 * The download name pattern used across the tool: `Downloadit {title}.{ext}`.
 * The title prefers the original pin/post title and falls back to a media-type
 * label — never a username — so the saved file is always recognisable.
 */
export function buildDownloadFilename(opts: {
  title?: string | null;
  extension?: string | null;
  fallback?: string;
}): string {
  const title =
    sanitizeFilenameComponent(opts.title) ||
    sanitizeFilenameComponent(opts.fallback) ||
    "Media";
  const base = `Downloadit ${title}`;
  const ext = (opts.extension ?? "").replace(/^\.+/, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return ext ? `${base}.${ext}` : base;
}
