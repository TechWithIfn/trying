import { AppError, ERRORS } from "../errors.js";
import { readPositiveInt } from "../env.js";
import { logger } from "../logger.js";
import type { Author, ErrorCode, ResolveDiagnostics } from "../types.js";
import type { ParsedYouTubeUrl } from "../validators/youtube-url.js";
import { YOUTUBE_AUDIO_OPTIONS, type YouTubeAudioOption } from "./audio.js";
import {
  runYtDlp,
  YtDlpAbortedError,
  YtDlpNotAvailableError,
  YtDlpProcessError,
} from "./ytdlp.js";

/** Qualities the page offers when the video exposes them. */
export const YOUTUBE_QUALITY_TARGETS = [1080, 720, 480, 240, 144] as const;

/**
 * A video-only stream the downloader will pair with `audioFormat`. When
 * `hasAudio` is true the stream already carries its own audio and no merge is
 * needed.
 */
export interface YtFormat {
  formatId: string;
  height: number | null;
  fps: number | null;
  ext: string;
  vcodec: string;
  acodec: string;
  tbr: number | null;
  hasAudio: boolean;
}

export interface YouTubeSelection {
  height: number;
  format: YtFormat;
  needsAudio: boolean;
}

export interface YouTubeQuality {
  height: number;
  label: string;
  fps: number | null;
}

export interface YouTubeProbe {
  videoId: string;
  sourceUrl: string;
  title: string;
  channel: string | null;
  channelId: string | null;
  author: Author | null;
  thumbnail: string;
  durationSeconds: number;
  qualities: YouTubeQuality[];
  selections: Map<number, YouTubeSelection>;
  audioFormat: YtFormat | null;
  audioAvailable: boolean;
}

interface RawFormat {
  format_id?: unknown;
  height?: unknown;
  fps?: unknown;
  ext?: unknown;
  vcodec?: unknown;
  acodec?: unknown;
  tbr?: unknown;
  abr?: unknown;
  protocol?: unknown;
}

interface RawYouTubeJson {
  _type?: unknown;
  id?: unknown;
  title?: unknown;
  channel?: unknown;
  uploader?: unknown;
  uploader_id?: unknown;
  channel_id?: unknown;
  duration?: unknown;
  live_status?: unknown;
  is_live?: unknown;
  availability?: unknown;
  age_limit?: unknown;
  formats?: unknown;
}

function verdict(code: ErrorCode, details: ResolveDiagnostics, message?: string): AppError {
  return new AppError(code, message ?? ERRORS[code].message, ERRORS[code].status, details);
}

function text(value: unknown, max = 300): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return cleaned ? cleaned.slice(0, max) : null;
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function rawFormat(value: unknown): YtFormat | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as RawFormat;
  const formatId = text(raw.format_id, 80);
  if (!formatId) return null;
  const vcodec = text(raw.vcodec, 80) ?? "none";
  const acodec = text(raw.acodec, 80) ?? "none";
  const height = num(raw.height);
  const fps = num(raw.fps);
  return {
    formatId,
    height: height && height > 0 ? Math.round(height) : null,
    fps: fps && fps > 0 ? Math.round(fps) : null,
    ext: (text(raw.ext, 16) ?? "").toLowerCase(),
    vcodec: vcodec.toLowerCase(),
    acodec: acodec.toLowerCase(),
    tbr: num(raw.tbr) ?? num(raw.abr),
    hasAudio: acodec !== "none",
  };
}

function isVideoFormat(format: YtFormat): boolean {
  return format.vcodec !== "none";
}

function isAudioOnly(format: YtFormat): boolean {
  return format.vcodec === "none" && format.acodec !== "none";
}

/** Higher is better. H.264/MP4 wins for device compatibility. */
function videoScore(format: YtFormat): number {
  let score = 0;
  if (format.vcodec.startsWith("avc1") || format.vcodec.startsWith("h264")) score += 400;
  else if (format.vcodec.startsWith("av01")) score += 300;
  else if (format.vcodec.startsWith("vp9") || format.vcodec.startsWith("vp09") || format.vcodec.startsWith("vp0")) score += 200;
  else if (format.vcodec !== "none") score += 100;
  if (format.ext === "mp4") score += 40;
  // Prefer a dedicated video stream when one exists (usually the better
  // rendition); a combined stream avoids a merge when it is the only option.
  if (!format.hasAudio) score += 10;
  score += Math.min(format.tbr ?? 0, 2000) / 1000;
  return score;
}

function audioScore(format: YtFormat): number {
  let score = 0;
  if (format.acodec.startsWith("mp4a")) score += 300;
  else if (format.acodec.startsWith("opus")) score += 200;
  else score += 100;
  if (format.ext === "m4a") score += 40;
  score += Math.min(format.tbr ?? 0, 500) / 100;
  return score;
}

function chooseBest<T>(items: T[], score: (item: T) => number): T | null {
  let best: T | null = null;
  let bestScore = -Infinity;
  for (const item of items) {
    const value = score(item);
    if (value > bestScore) {
      best = item;
      bestScore = value;
    }
  }
  return best;
}

/**
 * Build the download plan from the formats yt-dlp reported.
 *
 * Only heights with a real video stream are exposed, and a quality is only
 * offered when the resulting file can include audio (either the chosen stream
 * carries it, or a separate audio-only stream exists to merge).
 */
export function selectYouTubeFormats(
  formats: YtFormat[],
  targets: readonly number[] = YOUTUBE_QUALITY_TARGETS
): {
  selections: Map<number, YouTubeSelection>;
  qualities: YouTubeQuality[];
  audioFormat: YtFormat | null;
  audioAvailable: boolean;
} {
  const videoFormats = formats.filter(isVideoFormat);
  const audioFormat = chooseBest(formats.filter(isAudioOnly), audioScore);
  const anyCombined = videoFormats.some((format) => format.hasAudio);
  const audioAvailable = Boolean(audioFormat) || anyCombined;

  const byHeight = new Map<number, YtFormat[]>();
  for (const format of videoFormats) {
    if (format.height === null) continue;
    const list = byHeight.get(format.height) ?? [];
    list.push(format);
    byHeight.set(format.height, list);
  }

  const selections = new Map<number, YouTubeSelection>();
  const qualities: YouTubeQuality[] = [];

  const addQuality = (height: number): void => {
    const candidates = byHeight.get(height) ?? [];
    let chosen = chooseBest(candidates, videoScore);
    if (!chosen) return;
    let needsAudio = !chosen.hasAudio;
    // With no separate audio stream, a combined rendition is the only way to
    // produce a file with sound at this height.
    if (needsAudio && !audioFormat) {
      chosen = chooseBest(candidates.filter((format) => format.hasAudio), videoScore);
      needsAudio = false;
    }
    if (!chosen) return;
    selections.set(height, { height, format: chosen, needsAudio });
    qualities.push({ height, label: `${height}p`, fps: chosen.fps });
  };

  for (const height of targets) addQuality(height);

  // A video that exposes none of the standard heights still gets an honest
  // list of whatever it actually has, rather than a dead-end page.
  if (qualities.length === 0) {
    const heights = [...byHeight.keys()].sort((a, b) => b - a).slice(0, 6);
    for (const height of heights) addQuality(height);
    qualities.sort((a, b) => b.height - a.height);
  }

  return { selections, qualities, audioFormat, audioAvailable };
}

/**
 * Map yt-dlp's JSON payload to the metadata the page needs. Throws an
 * `AppError` with a specific verdict for live/unavailable videos and for
 * payloads with no usable video stream.
 */
export function parseYouTubeProbe(
  payload: unknown,
  parsed: ParsedYouTubeUrl,
  requestId?: string
): YouTubeProbe {
  if (!payload || typeof payload !== "object") {
    throw verdict("YOUTUBE_UPSTREAM_ERROR", {
      provider: "youtube-yt-dlp",
      stage: "parse",
      requestId,
      youtubeVideoId: parsed.videoId,
    });
  }

  const data = payload as RawYouTubeJson;
  if (data._type === "playlist") {
    throw verdict(
      "YOUTUBE_UPSTREAM_ERROR",
      {
        provider: "youtube-yt-dlp",
        stage: "parse",
        requestId,
        youtubeVideoId: parsed.videoId,
      },
      "YouTube returned a playlist instead of a single video."
    );
  }

  const liveStatus = text(data.live_status, 40)?.toLowerCase() ?? "";
  if (data.is_live === true || liveStatus === "is_live" || liveStatus === "is_upcoming") {
    throw verdict("YOUTUBE_LIVE_UNSUPPORTED", {
      provider: "youtube-yt-dlp",
      stage: "parse",
      requestId,
      youtubeVideoId: parsed.videoId,
    });
  }

  const availability = text(data.availability, 40)?.toLowerCase() ?? "";
  if (
    availability === "private" ||
    availability === "premium_only" ||
    availability === "subscriber_only" ||
    availability === "needs_auth"
  ) {
    throw verdict("YOUTUBE_VIDEO_UNAVAILABLE", {
      provider: "youtube-yt-dlp",
      stage: "parse",
      requestId,
      youtubeVideoId: parsed.videoId,
    });
  }

  const ageLimit = num(data.age_limit) ?? 0;
  const formatsRaw = Array.isArray(data.formats) ? data.formats : [];
  const formats = formatsRaw.map(rawFormat).filter((format): format is YtFormat => format !== null);
  const { selections, qualities, audioFormat, audioAvailable } = selectYouTubeFormats(formats);

  if (qualities.length === 0) {
    if (ageLimit > 0) {
      throw verdict("YOUTUBE_AGE_RESTRICTED", {
        provider: "youtube-yt-dlp",
        stage: "formats",
        requestId,
        youtubeVideoId: parsed.videoId,
      });
    }
    throw verdict(
      "YOUTUBE_UPSTREAM_ERROR",
      {
        provider: "youtube-yt-dlp",
        stage: "formats",
        requestId,
        youtubeVideoId: parsed.videoId,
      },
      "YouTube did not return any downloadable video formats for this link."
    );
  }

  const duration = num(data.duration) ?? 0;
  const channel = text(data.channel, 200) ?? text(data.uploader, 200);
  const channelId = text(data.channel_id, 64) ?? text(data.uploader_id, 64);
  const videoId = text(data.id, 32) ?? parsed.videoId;

  return {
    videoId,
    sourceUrl: parsed.normalized,
    title: text(data.title, 300) ?? "YouTube video",
    channel,
    channelId,
    author:
      channel || channelId
        ? { username: channelId, displayName: channel ?? channelId }
        : null,
    thumbnail: `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`,
    durationSeconds: duration > 0 ? Math.round(duration) : 0,
    qualities,
    selections,
    audioFormat,
    audioAvailable,
  };
}

const PROBE_CACHE_TTL_MS = 5 * 60 * 1000;
const PROBE_CACHE_MAX = 200;
const probeCache = new Map<string, { probe: YouTubeProbe; expiresAt: number }>();

export function invalidateYouTubeProbe(sourceUrl: string): void {
  probeCache.delete(sourceUrl);
}

/** Test-only: drop cached probe results. */
export function resetYouTubeProbeCacheForTests(): void {
  probeCache.clear();
}

function cacheGet(sourceUrl: string): YouTubeProbe | null {
  const entry = probeCache.get(sourceUrl);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    probeCache.delete(sourceUrl);
    return null;
  }
  return entry.probe;
}

function cacheSet(sourceUrl: string, probe: YouTubeProbe): void {
  if (probeCache.size >= PROBE_CACHE_MAX) {
    const now = Date.now();
    for (const [key, entry] of probeCache) {
      if (entry.expiresAt <= now) probeCache.delete(key);
    }
    while (probeCache.size >= PROBE_CACHE_MAX) {
      const oldest = probeCache.keys().next().value;
      if (typeof oldest !== "string") break;
      probeCache.delete(oldest);
    }
  }
  probeCache.set(sourceUrl, { probe, expiresAt: Date.now() + PROBE_CACHE_TTL_MS });
}

export interface ProbeYouTubeOptions {
  signal?: AbortSignal;
  timeoutMs: number;
  requestId?: string;
  /** Skip the short-lived cache (used after a stale-format failure). */
  fresh?: boolean;
}

function trimLimit(): number {
  return readPositiveInt("YOUTUBE_MAX_DURATION_SECONDS", 60 * 60);
}

/**
 * Probe a video with yt-dlp (metadata only; no media is downloaded).
 */
export async function probeYouTube(
  parsed: ParsedYouTubeUrl,
  options: ProbeYouTubeOptions
): Promise<YouTubeProbe> {
  if (!options.fresh) {
    const cached = cacheGet(parsed.normalized);
    if (cached) return cached;
  }

  const startedAt = Date.now();
  let stdout: string;
  try {
    const result = await runYtDlp(
      [
        "--dump-single-json",
        "--no-playlist",
        "--no-warnings",
        "--no-progress",
        "--skip-download",
        parsed.normalized,
      ],
      { timeoutMs: options.timeoutMs, signal: options.signal, maxBuffer: 32 * 1024 * 1024 }
    );
    stdout = result.stdout;
  } catch (error) {
    throw classifyYtDlpFailure(error, "probe", options.requestId, parsed.videoId);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(stdout);
  } catch {
    throw verdict("YOUTUBE_UPSTREAM_ERROR", {
      provider: "youtube-yt-dlp",
      stage: "parse",
      requestId: options.requestId,
      youtubeVideoId: parsed.videoId,
      totalDurationMs: Date.now() - startedAt,
    });
  }

  const probe = parseYouTubeProbe(payload, parsed, options.requestId);

  const maxDuration = trimLimit();
  if (probe.durationSeconds > maxDuration) {
    const minutes = Math.max(1, Math.round(maxDuration / 60));
    throw verdict(
      "YOUTUBE_TOO_LONG",
      {
        provider: "youtube-yt-dlp",
        stage: "duration",
        requestId: options.requestId,
        youtubeVideoId: probe.videoId,
      },
      `This YouTube video is ${Math.round(probe.durationSeconds / 60)} minutes long; this server currently supports videos up to ${minutes} minutes.`
    );
  }

  cacheSet(parsed.normalized, probe);
  logger.info("[YOUTUBE] probe complete", {
    requestId: options.requestId,
    videoId: probe.videoId,
    duration: probe.durationSeconds,
    qualities: probe.qualities.map((quality) => quality.height),
    audioAvailable: probe.audioAvailable,
    elapsedMs: Date.now() - startedAt,
  });
  return probe;
}

/**
 * Translate a yt-dlp failure into an honest, specific AppError. The raw
 * stderr is never returned to the client.
 */
export function classifyYtDlpFailure(
  error: unknown,
  stage: string,
  requestId?: string,
  videoId?: string
): AppError {
  const diagnostics = {
    provider: "youtube-yt-dlp",
    stage,
    requestId,
    youtubeVideoId: videoId,
  } as const;

  if (error instanceof AppError) return error;
  if (error instanceof YtDlpAbortedError) {
    return verdict("YOUTUBE_TIMEOUT", { ...diagnostics, youtubeStage: stage });
  }
  if (error instanceof YtDlpNotAvailableError) {
    return verdict("YOUTUBE_UNAVAILABLE", { ...diagnostics, youtubeStage: stage });
  }

  const stderr = error instanceof YtDlpProcessError ? error.stderr : "";
  const message = error instanceof Error ? error.message : String(error ?? "");
  const haystack = `${message}\n${stderr}`.toLowerCase();

  if (/timed? ?out|timeout/.test(haystack)) {
    return verdict("YOUTUBE_TIMEOUT", { ...diagnostics, youtubeStage: stage });
  }
  if (/not a bot|confirm you[’']?re not a bot/.test(haystack)) {
    return verdict("YOUTUBE_BOT_CHECK", { ...diagnostics, youtubeStage: stage });
  }
  if (/age[- ]?restricted|confirm your age|inappropriate for some users/.test(haystack)) {
    return verdict("YOUTUBE_AGE_RESTRICTED", { ...diagnostics, youtubeStage: stage });
  }
  if (/\bis live\b|live event|premieres in|will begin in/.test(haystack)) {
    return verdict("YOUTUBE_LIVE_UNSUPPORTED", { ...diagnostics, youtubeStage: stage });
  }
  if (
    /private video|this video is private|members[- ]only|join this channel|premium|subscriber[- ]only|requires? payment/.test(
      haystack
    )
  ) {
    return verdict("YOUTUBE_VIDEO_UNAVAILABLE", { ...diagnostics, youtubeStage: stage });
  }
  if (
    /video unavailable|this video is not available|this video has been removed|has been removed by the uploader|does not exist|account associated with this video has been terminated|404: not found/.test(
      haystack
    )
  ) {
    return verdict("YOUTUBE_VIDEO_NOT_FOUND", { ...diagnostics, youtubeStage: stage });
  }
  if (/http error 429|too many requests|rate.?limit/.test(haystack)) {
    return verdict("YOUTUBE_RATE_LIMITED", { ...diagnostics, youtubeStage: stage });
  }
  if (/requested format is not available|no video formats found|requested quality/.test(haystack)) {
    return verdict("YOUTUBE_QUALITY_UNAVAILABLE", { ...diagnostics, youtubeStage: stage });
  }
  if (/max-filesize|larger than max-filesize|file is larger than/.test(haystack)) {
    return verdict("YOUTUBE_FILE_TOO_LARGE", { ...diagnostics, youtubeStage: stage });
  }
  if (/ffmpeg|postprocess|merging formats|conversion|unable to merge|recod/.test(haystack)) {
    return verdict("YOUTUBE_CONVERSION_FAILED", { ...diagnostics, youtubeStage: stage });
  }

  return verdict("YOUTUBE_UPSTREAM_ERROR", { ...diagnostics, youtubeStage: stage });
}

/** Public shape returned by POST /api/youtube/resolve. */
export function toResolveData(probe: YouTubeProbe): {
  type: "VIDEO";
  videoId: string;
  sourceUrl: string;
  title: string;
  author: Author | null;
  thumbnail: string;
  duration: number | null;
  qualities: YouTubeQuality[];
  audioAvailable: boolean;
  audioOptions: YouTubeAudioOption[];
} {
  return {
    type: "VIDEO",
    videoId: probe.videoId,
    sourceUrl: probe.sourceUrl,
    title: probe.title,
    author: probe.author,
    thumbnail: probe.thumbnail,
    duration: probe.durationSeconds > 0 ? probe.durationSeconds : null,
    qualities: probe.qualities,
    audioAvailable: probe.audioAvailable,
    audioOptions: probe.audioAvailable ? YOUTUBE_AUDIO_OPTIONS.map((option) => ({ ...option })) : [],
  };
}

/** Build a download plan for a requested height, or explain what is real. */
export function selectionForQuality(probe: YouTubeProbe, height: number): YouTubeSelection {
  const selection = probe.selections.get(height);
  if (selection) return selection;
  const available = probe.qualities.map((quality) => `${quality.height}p`).join(", ");
  throw verdict(
    "YOUTUBE_QUALITY_UNAVAILABLE",
    {
      provider: "youtube-yt-dlp",
      stage: "select",
      youtubeVideoId: probe.videoId,
      availableQualities: probe.qualities.map((quality) => quality.height),
    },
    available
      ? `${height}p is not available for this video. Available: ${available}.`
      : `${height}p is not available for this video.`
  );
}
