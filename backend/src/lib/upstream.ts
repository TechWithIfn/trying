/**
 * Upstream failure signals extracted from extractor diagnostics.
 *
 * yt-dlp (used by the Facebook and Threads routes) reports upstream HTTP
 * problems in its stderr, for example:
 *   "ERROR: Unable to download webpage: HTTP Error 403: Forbidden"
 *   "ERROR: HTTP Error 429: Too Many Requests"
 *
 * We only ever read the status and host — never forward command output to a
 * client, and never log the full URL (post IDs are public, query tokens are
 * not). This keeps "the platform is blocking us" distinguishable from
 * "that post is private" in both logs and user-facing messages.
 */
export interface UpstreamSignal {
  /** HTTP status the platform returned, when the extractor reported one. */
  httpStatus: number | null;
  /** Hostname of the page being extracted (no path, no query). */
  host: string | null;
  /** 401/403: the platform is refusing this server's requests. */
  blocked: boolean;
  /** 429: explicit rate limiting. */
  rateLimited: boolean;
}

const HTTP_STATUS_PATTERN = /(?:http error|status(?: code)?)[: ]+(\d{3})/i;

export function hostOfUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).hostname.toLowerCase() || null;
  } catch {
    return null;
  }
}

export function readUpstreamSignal(
  stderr: string,
  sourceUrl: string | null | undefined
): UpstreamSignal {
  const match = HTTP_STATUS_PATTERN.exec(stderr);
  const status = match ? Number(match[1]) : null;
  const httpStatus = status !== null && status >= 100 && status <= 599 ? status : null;
  return {
    httpStatus,
    host: hostOfUrl(sourceUrl),
    blocked: httpStatus === 401 || httpStatus === 403,
    rateLimited: httpStatus === 429,
  };
}

/** One-line, secret-free outcome record shared by every platform route. */
export function describeUpstreamFailure(
  platform: string,
  requestId: string,
  signal: UpstreamSignal,
  durationMs: number,
  code: string
): Record<string, unknown> {
  return {
    platform,
    requestId,
    host: signal.host,
    upstreamStatus: signal.httpStatus,
    blocked: signal.blocked,
    rateLimited: signal.rateLimited,
    code,
    durationMs,
  };
}
