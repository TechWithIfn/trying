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

export type ApiFailureCategory = "network" | "timeout" | "aborted" | "server" | "malformed-response";

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

function failureCategory(status: number | null, error: unknown): ApiFailureCategory {
  if (status !== null) return "server";
  if (error instanceof DOMException && error.name === "TimeoutError") return "timeout";
  if (error instanceof DOMException && error.name === "AbortError") return "aborted";
  const message = failureMessage(error);
  if (/play\(\) request was interrupted|not allowed|autoplay/i.test(message)) return "aborted";
  if (/timeout|timed out|deadline exceeded/i.test(message)) return "timeout";
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

export async function resolveInstagramUrl(url: string, signal?: AbortSignal): Promise<ResolveResponse> {
  const requestUrl = `${getApiBase()}/api/resolve`;
  let response: Response;
  try {
    response = await fetch(requestUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
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
 */
export function startResolveStream(url: string, handlers: ResolveStreamHandlers): ResolveStreamHandle {
  const es = new EventSource(`${getApiBase()}/api/resolve/stream?url=${encodeURIComponent(url)}`);
  let closed = false;
  const close = () => {
    if (!closed) {
      closed = true;
      es.close();
    }
  };
  const transportError = () => {
    close();
    if (handlers.onTransportError) {
      handlers.onTransportError();
      return;
    }
    handlers.onError({ code: "TEMPORARY_ERROR", message: "Connection to the server was lost." });
  };

  es.addEventListener("progress", (e) => {
    try {
      const data = JSON.parse((e as MessageEvent).data) as { progress?: unknown; stage?: unknown };
      if (typeof data.progress === "number") {
        handlers.onProgress(data.progress, typeof data.stage === "string" ? data.stage : "");
      }
    } catch {
      /* ignore malformed tick */
    }
  });

  es.addEventListener("complete", (e) => {
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

export function getDownloadUrl(mediaUrl: string, filename: string, sourceUrl?: string): string {
  const base = `${getApiBase()}/api/download?url=${encodeURIComponent(mediaUrl)}&filename=${encodeURIComponent(filename)}`;
  return sourceUrl ? `${base}&source=${encodeURIComponent(sourceUrl)}` : base;
}
