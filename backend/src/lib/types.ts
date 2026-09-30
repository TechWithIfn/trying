export type InstagramContentType =
  | "REEL"
  | "POST"
  | "CAROUSEL"
  | "STORY"
  | "HIGHLIGHT"
  | "VIDEO"
  | "PHOTO"
  | "AUDIO"
  | "UNKNOWN";

export interface Author {
  username: string | null;
  displayName: string | null;
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
  /**
   * Separate audio rendition for a split-track video (Instagram Reels publish
   * a video-only MP4 plus its own audio-only MP4). Null when the video already
   * carries its own audio track.
   */
  audioUrl?: string | null;
}

export interface ResolvedMedia {
  type: InstagramContentType;
  sourceUrl: string;
  thumbnail: string | null;
  title: string | null;
  author: Author | null;
  media: MediaItem[];
  mediaId?: string;
  /** 0-based carousel start slide from `?img_index=` (null when absent). */
  startIndex: number | null;
}

export interface ResolveRequest {
  url: string;
}

export interface ResolveSuccessResponse {
  success: true;
  data: ResolvedMedia;
}

/**
 * Safe per-request stage diagnostics attached to resolve failures.
 * Scalars, booleans, counts and stage names ONLY — never cookies, session
 * tokens, API keys, Authorization values, signed media URLs, or query
 * strings. Lets production failures name their exact internal stage without
 * log access. Ignored by the frontend (it renders code/message only).
 */
export interface ResolveDiagnostics {
  requestId?: string;
  build?: string;
  provider?: string;
  runtime?: string;
  stage?: string;
  pageStatus?: number | null;
  loginWall?: boolean;
  challenge?: boolean;
  interceptedMediaCount?: number;
  interceptedMediaTypes?: string[];
  videoCandidateCount?: number;
  videoGraphFound?: boolean;
  hydrationEntered?: boolean;
  hydrationDurationMs?: number;
  extractionAttempts?: string[];
  normalizedMediaCount?: number;
  normalizedMediaTypes?: string[];
  totalDurationMs?: number;
  /** Post-validation video counts for the final assembly stage. */
  validVideoCandidateCount?: number;
  rejectedCandidateCount?: number;
  /**
   * Top rejection reasons with counts (e.g. { "probe-failed": 12,
   * "expired-or-forbidden": 8 }). Keys are machine-readable reason slugs
   * only — never URLs, queries, or secrets.
   */
  rejectionReasons?: Record<string, number>;
  /** Where the returned video was first captured (e.g. network-video-response). */
  selectedCandidateSource?: string | null;
  /** Hostname of the returned media URL (no query, no tokens). */
  selectedMediaHost?: string | null;
  /** Candidates proven by an active probe vs trusted network capture. */
  verifiedByProbeCount?: number;
  trustedCaptureCount?: number;
  /** Audio-route stage where a failure occurred (never a URL or secret). */
  audioStage?: string;
  /** Audio-route failure category (never a URL or secret). */
  audioFailure?: "timeout" | "network" | "cancelled" | "transcode" | "unknown";
  /**
   * Upstream `Retry-After` (seconds) Instagram sent with a 429, when one was
   * present. Lets routes answer a genuine throttle with the same backoff.
   */
  upstreamRetryAfterSeconds?: number | null;
  /** Browser document navigation HTTP status (null = navigation failed). */
  docStatus?: number | null;
  /** Final document hostname behind redirects (no query, no tokens). */
  docFinalHost?: string | null;
  /** Final document pathname behind redirects (no query, no tokens). */
  docFinalPath?: string | null;
  /**
   * Whether page HTML shows the server-side session as accepted (true),
   * rejected (false), or carries no verdict (null — never decide on null).
   */
  sessionAccepted?: boolean | null;
}

export interface ResolveErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    retryable: boolean;
    diagnostics?: ResolveDiagnostics;
  };
}

export type ResolveResponse = ResolveSuccessResponse | ResolveErrorResponse;

export type ErrorCode =
  | "INVALID_URL"
  | "UNSUPPORTED_URL"
  | "CONTENT_NOT_FOUND"
  | "CONTENT_UNAVAILABLE"
  | "MEDIA_URL_EXPIRED"
  | "MEDIA_DOWNLOAD_FAILED"
  | "UPSTREAM_FORBIDDEN"
  | "UPSTREAM_NOT_FOUND"
  | "UNSUPPORTED_CONTENT"
  | "RESOLVER_ERROR"
  | "AUDIO_NO_SOURCE"
  | "RESOLVER_TIMEOUT"
  | "RESOLVER_FAILED"
  | "AUDIO_UNAVAILABLE"
  | "SERVER_OVERLOADED"
  | "CAPACITY_EXHAUSTED"
  | "SERVER_SHUTTING_DOWN"
  | "RATE_LIMITED"
  | "TEMPORARY_ERROR"
  | "PROVIDER_UNAVAILABLE"
  | "PROVIDER_NOT_CONFIGURED"
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_RATE_LIMITED"
  | "INVALID_PROVIDER_RESPONSE"
  | "VALIDATION_ERROR"
  | "REQUEST_TOO_LARGE"
  | "VIDEO_SOURCE_NOT_FOUND"
  | "STORY_SOURCE_UNAVAILABLE"
  | "STORY_MEDIA_NOT_FOUND"
  | "INSTAGRAM_AUTH_NOT_CONFIGURED"
  | "INSTAGRAM_AUTH_INVALID"
  | "STORY_NOT_FOUND"
  | "STORY_EXPIRED"
  | "STORY_PRIVATE"
  | "INSTAGRAM_RATE_LIMITED"
  | "INSTAGRAM_PROVIDER_ERROR"
  | "EMPTY_INSTAGRAM_SHELL";

export interface ResolverResult {
  type: InstagramContentType;
  sourceUrl: string;
  thumbnail: string | null;
  title: string | null;
  author: Author | null;
  media: MediaItem[];
}

export interface ResolveCallOptions {
  /**
   * Cancellation for the provider operation (client disconnect / shutdown).
   * A provider must stop its expensive work when this aborts. Optional so
   * existing providers stay source-compatible.
   */
  signal?: AbortSignal;
}

export interface InstagramResolver {
  name: string;
  resolve(
    url: string,
    onProgress?: ResolveProgressCallback,
    options?: ResolveCallOptions
  ): Promise<ResolverResult>;
}

/**
 * Optional progress hook for resolvers. Emitted only when a backend stage
 * has ACTUALLY completed — never synthesized on a timer.
 */
export type ResolveProgressCallback = (progress: number, stage: string) => void;

export interface TempStoreEntry {
  id: string;
  media: MediaItem[];
  type?: InstagramContentType;
  createdAt: number;
  /** Last read/write touch — protects active downloads from eviction. */
  lastAccessAt?: number;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

/** Per-workload concurrency state, surfaced by the readiness endpoint. */
export interface WorkloadCapacity {
  name: string;
  limit: number;
  inFlight: number;
  queued: number;
  peak: number;
  admitted: number;
  rejected: number;
  reclaimed: number;
  utilization: number;
}

/** Full capacity picture for one process, surfaced by the readiness endpoint. */
export interface CapacitySnapshot {
  workloads: WorkloadCapacity[];
  memory: {
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
  };
  draining: boolean;
  uptimeSeconds: number;
}

/**
 * Per-worker resolver state for the 3-worker load manager. Counts and
 * percentages only — never URLs, cookies, session data, or internal
 * handles — so it is safe to expose on the /capacity debug endpoint.
 */
export interface ResolverWorkerSnapshot {
  id: number;
  /** Eligible for new work right now (healthy, or cooldown elapsed). */
  healthy: boolean;
  /** Cooldown elapsed after a crash; next admission is a half-open trial. */
  recovering: boolean;
  active: number;
  queued: number;
  /** Max concurrent jobs on this worker. */
  capacity: number;
  maxQueue: number;
  /** 0–100, computed from real active + queued work. */
  loadPct: number;
  admitted: number;
  completed: number;
  failed: number;
  rejected: number;
  reclaimed: number;
  consecutiveFailures: number;
  lastCompletedAt: number | null;
}

/** Sanitized resolver-pool picture for one process. */
export interface ResolverPoolSnapshot {
  workerCount: number;
  loadThreshold: number;
  draining: boolean;
  workers: ResolverWorkerSnapshot[];
  totalActive: number;
  totalQueued: number;
  totalCapacity: number;
}

export interface LoggerContext {
  requestId?: string;
  url?: string;
  duration?: number;
  [key: string]: unknown;
}

export interface ExternalProviderResponse {
  success: boolean;
  data?: {
    type?: string;
    shortcode?: string;
    caption?: string;
    author?: {
      username?: string;
      display_name?: string;
    };
    thumbnail?: string;
    media?: Array<{
      url: string;
      type?: "image" | "video" | "audio" | string;
      width?: number;
      height?: number;
      duration?: number;
      size?: number;
      format?: string;
      thumbnail?: string;
    }>;
  };
  error?: {
    code?: string;
    message?: string;
  };
}
