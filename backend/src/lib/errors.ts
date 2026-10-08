import type { ErrorCode, ResolveDiagnostics, ResolveErrorResponse } from "./types.js";

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: ResolveDiagnostics;

  constructor(code: ErrorCode, message: string, statusCode: number = 400, details?: ResolveDiagnostics) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  toResponse(): ResolveErrorResponse {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        retryable: ERRORS[this.code].retryable,
        ...(this.details ? { diagnostics: { ...this.details } } : {}),
      },
    };
  }
}

/**
 * Merge request-level diagnostics (requestId/build/provider/duration) into an
 * already-built error response WITHOUT overwriting provider stage fields.
 * Only scalar-safe fields are accepted by the ResolveDiagnostics type, so no
 * secret can pass through here even by mistake.
 */
export function withRequestDiagnostics(
  response: ResolveErrorResponse,
  extra: ResolveDiagnostics
): ResolveErrorResponse {
  response.error.diagnostics = { ...extra, ...response.error.diagnostics };
  return response;
}

export const ERRORS: Record<ErrorCode, { message: string; status: number; retryable: boolean }> = {
  INVALID_URL: {
    message: "The URL provided is not a valid Instagram link.",
    status: 400,
    retryable: false,
  },
  UNSUPPORTED_URL: {
    message: "This Instagram URL pattern is not yet supported.",
    status: 400,
    retryable: false,
  },
  CONTENT_NOT_FOUND: {
    message:
      "That link doesn't appear to be available right now. It may have been deleted or made private.",
    status: 404,
    retryable: false,
  },
  CONTENT_UNAVAILABLE: {
    message:
      "This content is currently unavailable. It may be restricted or temporarily inaccessible.",
    status: 404,
    retryable: true,
  },
  MEDIA_URL_EXPIRED: {
    message: "Media link expired. Please try Get Media again.",
    status: 410,
    retryable: true,
  },
  MEDIA_DOWNLOAD_FAILED: {
    message: "The media could not be downloaded.",
    status: 502,
    retryable: true,
  },
  UPSTREAM_FORBIDDEN: {
    message: "The media server refused the request.",
    status: 403,
    retryable: false,
  },
  UPSTREAM_NOT_FOUND: {
    message: "The media was not found on the media server.",
    status: 404,
    retryable: false,
  },
  UNSUPPORTED_CONTENT: {
    message: "This type of Instagram link isn't supported yet.",
    status: 400,
    retryable: false,
  },
  RESOLVER_ERROR: {
    message: "Something went wrong while fetching the media. Please try again.",
    status: 502,
    retryable: true,
  },
  RESOLVER_TIMEOUT: {
    message: "The media took too long to process. Please try again.",
    status: 504,
    retryable: true,
  },
  RESOLVER_FAILED: {
    message: "The media could not be resolved. Please try again.",
    status: 502,
    retryable: true,
  },
  AUDIO_UNAVAILABLE: {
    message: "Audio extraction is currently unavailable. Please try again.",
    status: 502,
    retryable: true,
  },
  AUDIO_NO_SOURCE: {
    message:
      "This Instagram audio page does not expose a downloadable audio source to anonymous requests. Instagram restricts direct audio access — try pasting a public Reel that uses this sound instead.",
    status: 502,
    retryable: false,
  },
  SERVER_OVERLOADED: {
    message: "Downloadit is busy right now. Please try again shortly.",
    status: 503,
    retryable: true,
  },
  CAPACITY_EXHAUSTED: {
    message:
      "Downloadit is at capacity for this operation right now. Please try again in a few seconds.",
    status: 503,
    retryable: true,
  },
  SERVER_SHUTTING_DOWN: {
    message: "Downloadit is restarting. Please try again in a few seconds.",
    status: 503,
    retryable: true,
  },
  RATE_LIMITED: {
    message: "Too many requests. Please wait a moment before trying again.",
    status: 429,
    retryable: true,
  },
  TEMPORARY_ERROR: {
    message: "A temporary issue occurred. Please try again shortly.",
    status: 503,
    retryable: true,
  },
  PROVIDER_UNAVAILABLE: {
    message: "The media resolution service is currently unavailable.",
    status: 503,
    retryable: true,
  },
  PROVIDER_NOT_CONFIGURED: {
    message:
      "The media service is not configured yet. Please try again later.",
    status: 503,
    retryable: false,
  },
  PROVIDER_TIMEOUT: {
    message:
      "The request took too long. The content may be temporarily unavailable.",
    status: 504,
    retryable: true,
  },
  PROVIDER_RATE_LIMITED: {
    message:
      "The media service is receiving too many requests. Please try again shortly.",
    status: 429,
    retryable: true,
  },
  INVALID_PROVIDER_RESPONSE: {
    message:
      "Received an unexpected response from the media service. Please try again.",
    status: 502,
    retryable: true,
  },
  VALIDATION_ERROR: {
    message: "The request could not be validated. Please check your input.",
    status: 400,
    retryable: false,
  },
  REQUEST_TOO_LARGE: {
    message: "The request is too large to process.",
    status: 413,
    retryable: false,
  },
  VIDEO_SOURCE_NOT_FOUND: {
    message:
      "The video for this Reel could not be loaded. Instagram may be restricting automated access right now. Please try again shortly.",
    status: 502,
    retryable: true,
  },
  STORY_SOURCE_UNAVAILABLE: {
    message: "Instagram did not expose a downloadable story source to this backend.",
    status: 502,
    retryable: false,
  },
  STORY_MEDIA_NOT_FOUND: {
    message: "The actual Story media could not be resolved.",
    status: 404,
    retryable: false,
  },
  INSTAGRAM_AUTH_NOT_CONFIGURED: {
    message: "Instagram Story extraction requires a configured server-side session.",
    status: 503,
    retryable: false,
  },
  INSTAGRAM_AUTH_INVALID: {
    message: "Instagram session expired or requires verification.",
    status: 401,
    retryable: false,
  },
  /**
   * Story-pipeline verdicts. The Story resolver maps every terminal failure
   * to exactly one of these six codes (plus the freshness codes
   * MEDIA_URL_EXPIRED/STORY_MEDIA_EXPIRED, which drive the preview retry
   * protocol rather than reporting verdicts):
   * - SESSION_EXPIRED: login_required/401/403/checkpoint/challenge — never
   *   reported as "no story".
   * - USER_NOT_FOUND: the profile/user lookup missed.
   * - PRIVATE_ACCOUNT: is_private or an authenticated-only wall for the user.
   * - RATE_LIMITED: genuine upstream 429s (carries upstreamRetryAfterSeconds).
   * - FETCH_FAILED: network/timeout/parse/provider failures; the message
   *   always names the stage that failed.
   * - NO_STORY: ONLY when the session is verified valid (or no session is
   *   configured and the public chain completed ungated) AND the tray is
   *   truly empty with a recognized structure.
   */
  SESSION_EXPIRED: {
    message: "Instagram session expired or requires verification.",
    status: 401,
    retryable: false,
  },
  USER_NOT_FOUND: {
    message: "That Instagram profile was not found. Check the username and try again.",
    status: 404,
    retryable: false,
  },
  PRIVATE_ACCOUNT: {
    message: "Private account — Story unavailable.",
    status: 403,
    retryable: false,
  },
  FETCH_FAILED: {
    message: "Story request failed.",
    status: 502,
    retryable: true,
  },
  NO_STORY: {
    message: "This account has no active public Story right now. Stories expire after 24 hours.",
    status: 404,
    retryable: false,
  },
  /**
   * The session was accepted (verified-live) yet the story endpoints returned
   * no media. Identity proven, data withheld-or-absent: absence is
   * unprovable here, so this never claims "no Story" — it reports exactly
   * what happened.
   */
  INSTAGRAM_AUTH_EMPTY_RESPONSE: {
    message: "Instagram accepted the authenticated request but returned no Story media. The Story may not exist, or access may be limited for this session.",
    status: 502,
    retryable: false,
  },
  INSTAGRAM_CHALLENGE: {
    message: "Instagram asked for verification for this session (challenge required). The server session needs to be refreshed.",
    status: 401,
    retryable: false,
  },
  /**
   * Anonymous-only evidence is never sufficient to declare absence: Instagram
   * serves datacenter/anonymous clients empty trays and shells even when it
   * answers HTTP 200, so an empty result without a verified-live session
   * means "cannot determine", never "no Story". Emitted only after the full
   * public chain (plus the external provider when configured) found nothing.
   */
  STORY_PROVIDER_REQUIRED: {
    message: "Instagram is not returning Story media to this server. Configure a supported Story provider to resolve public Stories.",
    status: 502,
    retryable: false,
  },
  STORY_NOT_FOUND: {
    message: "Story not found. It may have been deleted or never existed.",
    status: 404,
    retryable: false,
  },
  STORY_EXPIRED: {
    message: "This Story has expired. Stories are only available for 24 hours.",
    status: 410,
    retryable: false,
  },
  STORY_PRIVATE: {
    message: "Private account — Story unavailable.",
    status: 403,
    retryable: false,
  },
  STORY_PROFILE_NOT_FOUND: {
    message: "That Instagram profile was not found. Check the username and try again.",
    status: 404,
    retryable: false,
  },
  STORY_NOT_ACTIVE: {
    message: "This account has no active public Story right now. Stories expire after 24 hours.",
    status: 404,
    retryable: false,
  },
  STORY_MEDIA_NOT_DISCOVERED: {
    message: "A Story may exist, but its media could not be discovered. Please try again shortly.",
    status: 502,
    retryable: true,
  },
  STORY_MEDIA_DISCOVERED_BUT_INVALID: {
    message: "Story data was found, but the media could not be verified for playback.",
    status: 502,
    retryable: false,
  },
  STORY_MEDIA_EXPIRED: {
    message: "This Story media link has expired. Please try Get Media again.",
    status: 410,
    retryable: true,
  },
  INSTAGRAM_STORY_ACCESS_RESTRICTED: {
    message: "Instagram restricted automated access to this Story. Please try again shortly.",
    status: 403,
    retryable: true,
  },
  INSTAGRAM_EMPTY_STORY_SHELL: {
    message: "Instagram returned an empty Story page without media. Please try again shortly.",
    status: 503,
    retryable: true,
  },
  STORY_RESTRICTED: {
    message: "Instagram restricted automated access to this Story. Please try again later.",
    status: 403,
    retryable: true,
  },
  NO_ACTIVE_PUBLIC_STORY: {
    message: "This account has no active public Story right now. Stories expire after 24 hours.",
    status: 404,
    retryable: false,
  },
  STORY_RESOLUTION_TIMEOUT: {
    message: "Instagram took too long to return the Story. Please try again.",
    status: 504,
    retryable: true,
  },
  STORY_PROVIDER_FAILED: {
    message: "The Story provider could not return media. Please try again shortly.",
    status: 502,
    retryable: true,
  },
  STORY_PARSE_FAILED: {
    message: "Instagram returned an unexpected Story format. Please try again shortly.",
    status: 502,
    retryable: false,
  },
  INSTAGRAM_LOGIN_REQUIRED: {
    message: "Instagram requires authentication to view this Story. The server session is not verified for this content.",
    status: 401,
    retryable: false,
  },
  INSTAGRAM_RATE_LIMITED: {
    message: "Instagram is rate-limiting requests. Please try again shortly.",
    status: 429,
    retryable: true,
  },
  INSTAGRAM_PROVIDER_ERROR: {
    message: "Instagram provider error. Please try again shortly.",
    status: 502,
    retryable: true,
  },
  EMPTY_INSTAGRAM_SHELL: {
    message: "Instagram returned an empty page without playable media. Please try again shortly.",
    status: 503,
    retryable: true,
  },
  STREAM_TIMEOUT: {
    message: "The media stream took too long to start. Please try again.",
    status: 504,
    retryable: true,
  },
};

/**
 * Library-level errors that carry a `code` property but are NOT AppErrors —
 * Puppeteer's ProtocolError/ConnectionClosedError, undici/DNS errors, Node
 * socket errors, etc. Routing must map these to an honest error code instead
 * of letting them fall through to the generic TEMPORARY_ERROR (which is what
 * made a stale-browser failure look like an unexplained "temporary issue").
 */
const CONNECTION_LOST_RE =
  /connection closed|target closed|session closed|browser has disconnected|page crashed|protocol error|websocket is not open/i;

const TIMEOUT_RE = /^(abort|aborterror|timeouterror|timeout)$/i;

const TIMEOUT_MESSAGE_RE =
  /\b(timeout|timed out|page-body-timeout|the operation was aborted|aborted)\b/i;

const NETWORK_MESSAGE_RE =
  /\b(fetch failed|econnreset|econnrefused|enotfound|eai_again|socket hang up|other side closed|network error|getaddrinfo|undici)\b/i;

/** True when the error means the browser/CDP transport died (stale handle). */
export function isConnectionLostError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : String(error);
  if (name === "ConnectionClosedError" || name === "ProtocolError") return true;
  return CONNECTION_LOST_RE.test(message);
}

/** True when the error is an abort/timeout from an external request. */
export function isTimeoutError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : String(error);
  if (TIMEOUT_RE.test(name)) return true;
  return TIMEOUT_MESSAGE_RE.test(message);
}

/** True when the error is a transport/DNS/socket failure reaching an upstream. */
export function isNetworkError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = error instanceof Error ? error.name : "";
  const code = typeof (error as { code?: unknown }).code === "string" ? (error as { code: string }).code : "";
  const message = error instanceof Error ? error.message : String(error);
  if (name === "TypeError" && /fetch failed/i.test(message)) return true;
  if (code && /^(ECONNRESET|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|EPIPE|UND_ERR)/i.test(code)) return true;
  return NETWORK_MESSAGE_RE.test(message);
}

/**
 * Normalize any thrown value into an AppError so routes can answer with an
 * honest, specific code. Known shapes are mapped; genuinely unknown failures
 * fall back to `fallbackCode` (TEMPORARY_ERROR) — the ONLY case where the
 * generic message is allowed.
 *
 * The original error must still be logged by the caller: this only decides
 * what the client is told.
 */
export function toAppError(error: unknown, fallbackCode: ErrorCode = "TEMPORARY_ERROR"): AppError {
  if (error instanceof AppError) return error;

  // A string/number ErrorCode thrown directly is still a known failure.
  if (typeof error === "string" && error in ERRORS) {
    return createError(error as ErrorCode);
  }

  if (isConnectionLostError(error)) return createError("PROVIDER_UNAVAILABLE");
  if (isTimeoutError(error)) return createError("PROVIDER_TIMEOUT");
  if (isNetworkError(error)) return createError("PROVIDER_UNAVAILABLE");

  return createError(fallbackCode);
}

/** Media-transfer context: network failures read better as a download failure. */
export function toMediaAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (isTimeoutError(error)) return createError("PROVIDER_TIMEOUT");
  if (isNetworkError(error) || isConnectionLostError(error)) {
    return createError("MEDIA_DOWNLOAD_FAILED");
  }
  return toAppError(error, "MEDIA_DOWNLOAD_FAILED");
}

export function createError(code: ErrorCode): AppError {
  const { message, status } = ERRORS[code];
  return new AppError(code, message, status);
}

export function createErrorResponse(code: ErrorCode): ResolveErrorResponse {
  return createError(code).toResponse();
}
