import type {
  ErrorCode,
  InstagramContentType,
  MediaItem,
  ResolveDiagnostics,
  ResolverResult,
} from "./types.js";
import { logger } from "./logger.js";
import { readBoundedInt } from "./env.js";
import { getYtDlpPath, isYtDlpAvailable, runYtDlp, isRetryableYtDlpError } from "./ytdlp.js";
import {
  collectEmbedCandidates,
  selectReelVideo,
  type ExtractedMedia,
} from "./providers/puppeteer.js";

/**
 * Public (logged-out) Instagram extraction.
 *
 * Why this exists: plain browser scraping of a Reel can return HTTP 200 with a
 * media-less page shell while the same Reel is perfectly downloadable through
 * yt-dlp's public Instagram extractor. yt-dlp is therefore the primary method,
 * the public page HTML is inspected for access-wall evidence, and Instagram's
 * public embed endpoint is the last fallback. Nothing here logs in, uses
 * cookies, or attempts to defeat a restriction: a positive restriction verdict
 * is reported as a specific, non-retryable error instead.
 */

const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/** Total budget for the public chain, kept below the route timeout. */
const PUBLIC_EXTRACT_TIMEOUT_MS = readBoundedInt(
  "PUBLIC_EXTRACT_TIMEOUT_MS",
  10_000,
  2_000,
  30_000
);

const YTDLP_FIRST_TIMEOUT_MS = 6_500;
const YTDLP_RETRY_TIMEOUT_MS = 3_000;
const YTDLP_READY_BUDGET_MS = 3_000;
const PAGE_TIMEOUT_MS = 4_500;
const EMBED_TIMEOUT_MS = 3_500;

export type PublicRestriction =
  | "restricted"
  | "not-found"
  | "login-required"
  | "region-blocked"
  | "unavailable"
  | null;

export type PublicMethod = "yt-dlp" | "html" | "embed";

export interface PublicPageInspection {
  hasVideoVersions: boolean;
  hasVideoUrl: boolean;
  hasDashManifest: boolean;
  loginWall: boolean;
  consentWall: boolean;
  challenge: boolean;
  errorPage: boolean;
  failureReason: string | null;
  restrictedAge: number | null;
  pageType: string | null;
  restriction: PublicRestriction;
}

/**
 * Inspect a public Instagram HTML document for media markers and access-wall
 * evidence. Pure and side-effect free so it can be unit tested against real
 * captured shells. `finalPath` (when known) distinguishes a real login-page
 * redirect from a page that merely mentions logging in.
 */
export function inspectPublicPage(
  html: string | null | undefined,
  opts?: { finalPath?: string | null }
): PublicPageInspection {
  const text = typeof html === "string" ? html : "";
  const finalPath = opts?.finalPath ?? "";

  const hasVideoVersions = /"video_versions"\s*:\s*\[/i.test(text);
  const hasVideoUrl =
    /"(?:video_url|playable_url|progressive_download_url|contentUrl|playback_url)"\s*:\s*"/i.test(text);
  const hasDashManifest = /(?:dash_manifest|<MPD[\s>]|"manifest_url"\s*:\s*"https?:)/i.test(text);
  const hasMedia = hasVideoVersions || hasVideoUrl || hasDashManifest;

  const failureReason = text.match(/"failure_reason"\s*:\s*"([^"]{1,80})"/i)?.[1] ?? null;
  const ageMatch = text.match(/"restricted_age"\s*:\s*(\d{1,3})/i);
  const restrictedAge = ageMatch ? Number.parseInt(ageMatch[1], 10) : null;
  const pageType = text.match(/"page_type"\s*:\s*"([^"]{1,40})"/i)?.[1] ?? null;

  // Only the structured shell marker counts: generic pages can mention
  // "httpErrorPage" inside scripts without being an error document.
  const errorPage = /"pageID"\s*:\s*"httpErrorPage"/i.test(text);
  // Strong login markers only: a healthy post page mentions "log in" in its
  // chrome, so a bare phrase is never enough.
  const loginWall =
    /^\/(?:accounts\/)?login\/?$/i.test(finalPath) ||
    /name=["']username["']/i.test(text) ||
    /id=["']loginForm["']/i.test(text) ||
    /"requireLogin"\s*:\s*true/i.test(text);
  const consentWall = /"consent_required"\s*:\s*true|consent_required/i.test(text);
  const challenge =
    /suspicious activity|verify your identity|"challenge_required"\s*:\s*true/i.test(text);

  const reason = (failureReason ?? "").toUpperCase();
  let restriction: PublicRestriction = null;
  if (!hasMedia) {
    if (restrictedAge !== null || /^(?:MA|AGE|AGE_RESTRICTED|RESTRICTED|PRIVATE|SENSITIVE)$/.test(reason)) {
      restriction = "restricted";
    } else if (
      /^(?:NF|NOT_FOUND|DELETED|REMOVED|404)$/.test(reason) ||
      /sorry,? this page isn't available|this page isn't available|post (?:is )?no longer available|may have been removed|content (?:is )?no longer available/i.test(
        text
      )
    ) {
      restriction = "not-found";
    } else if (
      /REGION|GEO|COUNTRY|LOCATION/.test(reason) ||
      /not available in your (?:country|region|location)|isn't available in your (?:country|region|location)|can't be viewed in your (?:country|region|location)/i.test(
        text
      )
    ) {
      restriction = "region-blocked";
    } else if (/LOGIN|AUTH/.test(reason) || loginWall) {
      restriction = "login-required";
    } else if (/UNAVAILABLE|ERROR|FAIL/.test(reason) || errorPage) {
      restriction = "unavailable";
    }
  }

  return {
    hasVideoVersions,
    hasVideoUrl,
    hasDashManifest,
    loginWall,
    consentWall,
    challenge,
    errorPage,
    failureReason,
    restrictedAge,
    pageType,
    restriction,
  };
}

/** Map a confident restriction verdict to the public error code. */
export function restrictionToErrorCode(restriction: PublicRestriction): ErrorCode | null {
  switch (restriction) {
    case "restricted":
    case "login-required":
      return "INSTAGRAM_CONTENT_RESTRICTED";
    case "not-found":
      return "INSTAGRAM_CONTENT_NOT_FOUND";
    case "region-blocked":
      return "INSTAGRAM_REGION_BLOCKED";
    default:
      return null;
  }
}

export interface YtDlpFormatLike {
  format_id?: string | null;
  url?: string | null;
  ext?: string | null;
  width?: number | null;
  height?: number | null;
  vcodec?: string | null;
  acodec?: string | null;
  video_ext?: string | null;
  audio_ext?: string | null;
  format_note?: string | null;
  tbr?: number | null;
  abr?: number | null;
  filesize?: number | null;
  filesize_approx?: number | null;
}

export interface YtDlpThumbnailLike {
  url?: string | null;
  width?: number | null;
  height?: number | null;
}

export interface YtDlpInfoLike {
  id?: string | null;
  title?: string | null;
  description?: string | null;
  uploader?: string | null;
  uploader_id?: string | null;
  channel?: string | null;
  thumbnail?: string | null;
  thumbnails?: YtDlpThumbnailLike[] | null;
  duration?: number | null;
  width?: number | null;
  height?: number | null;
  ext?: string | null;
  url?: string | null;
  formats?: YtDlpFormatLike[] | null;
  entries?: YtDlpInfoLike[] | null;
  _type?: string | null;
}

export interface SelectedPublicMedia {
  videoUrl: string;
  audioUrl: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  size: number | null;
  format: string | null;
  /** True when this is already a combined video+audio rendition. */
  combined: boolean;
  source: "progressive" | "dash" | "direct";
}

function isHttpUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value) && value.length <= 8192;
}

function hasCodec(value: string | null | undefined): value is string {
  return typeof value === "string" && value.length > 0 && value.toLowerCase() !== "none";
}

function formatArea(format: YtDlpFormatLike): number {
  const w = typeof format.width === "number" && format.width > 0 ? format.width : 0;
  const h = typeof format.height === "number" && format.height > 0 ? format.height : 0;
  return w * h;
}

function formatBitrate(format: YtDlpFormatLike): number {
  return (
    (typeof format.tbr === "number" && format.tbr > 0 ? format.tbr : 0) ||
    (typeof format.abr === "number" && format.abr > 0 ? format.abr : 0)
  );
}

function formatSize(format: YtDlpFormatLike): number | null {
  if (typeof format.filesize === "number" && format.filesize > 0) return format.filesize;
  if (typeof format.filesize_approx === "number" && format.filesize_approx > 0) {
    return format.filesize_approx;
  }
  return null;
}

function formatOrdinal(format: YtDlpFormatLike): number {
  const value = Number.parseInt(format.format_id ?? "", 10);
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
}

/**
 * Pick the best public rendition from yt-dlp's format list.
 *
 * Rules:
 *  - a combined (video+audio) progressive MP4 is preferred while the best DASH
 *    video is below 720p, because it needs no merge and plays everywhere;
 *  - at 720p+ (or when no progressive exists) the highest-resolution DASH video
 *    is paired with the best DASH audio, and the download route merges them;
 *  - an audio-only format is never selected as the video.
 */
export function selectYtDlpMedia(info: YtDlpInfoLike | null | undefined): SelectedPublicMedia | null {
  if (!info) return null;
  const formats = Array.isArray(info.formats) ? info.formats : [];

  const progressive: YtDlpFormatLike[] = [];
  const dashVideos: YtDlpFormatLike[] = [];
  const dashAudios: YtDlpFormatLike[] = [];

  for (const format of formats) {
    if (!format || !isHttpUrl(format.url)) continue;
    const isDash =
      /^dash-/i.test(format.format_id ?? "") || /dash/i.test(format.format_note ?? "");
    const video = hasCodec(format.vcodec) && format.vcodec.toLowerCase() !== "none";
    const audio = hasCodec(format.acodec) && format.acodec.toLowerCase() !== "none";
    const videoExt = (format.video_ext ?? "").toLowerCase();
    const audioExt = (format.audio_ext ?? "").toLowerCase();
    const unknownCodecs = !hasCodec(format.vcodec) && !hasCodec(format.acodec);
    // Instagram's progressive MP4s are reported without codec metadata but do
    // carry both tracks; DASH representations always carry a codec.
    const combined =
      (video && audio) ||
      (unknownCodecs && !isDash && (format.ext === "mp4" || videoExt === "mp4"));

    if (combined && !isDash) {
      progressive.push(format);
      continue;
    }
    if (video && !audio && formatArea(format) > 0) {
      dashVideos.push(format);
      continue;
    }
    if (audio && !video && (audioExt !== "none" || hasCodec(format.acodec))) {
      dashAudios.push(format);
    }
  }

  progressive.sort((a, b) => formatOrdinal(a) - formatOrdinal(b));
  dashVideos.sort(
    (a, b) => formatArea(b) - formatArea(a) || formatBitrate(b) - formatBitrate(a)
  );
  dashAudios.sort(
    (a, b) =>
      (formatBitrate(b) - formatBitrate(a)) || (formatSize(b) ?? 0) - (formatSize(a) ?? 0)
  );

  const bestDash = dashVideos[0] ?? null;
  const bestAudio = dashAudios[0] ?? null;
  const bestProgressive = progressive[0] ?? null;
  const dashHeight =
    bestDash && typeof bestDash.height === "number" && bestDash.height > 0
      ? bestDash.height
      : 0;

  if (bestProgressive && (!bestDash || dashHeight < 720)) {
    return progressiveSelection(bestProgressive);
  }

  if (bestDash) {
    return {
      videoUrl: bestDash.url as string,
      audioUrl: isHttpUrl(bestAudio?.url) ? (bestAudio!.url as string) : null,
      width: typeof bestDash.width === "number" && bestDash.width > 0 ? bestDash.width : null,
      height: dashHeight > 0 ? dashHeight : null,
      duration: null,
      size: formatSize(bestDash),
      format: dashHeight > 0 ? `${dashHeight}p` : (bestDash.ext ?? "mp4"),
      combined: false,
      source: "dash",
    };
  }

  if (bestProgressive) return progressiveSelection(bestProgressive);

  // A direct top-level URL (single-format response without a formats list).
  // Image entries also carry a top-level `url`; only media containers may use
  // this path (images are handled separately by buildPublicResult).
  if (
    isHttpUrl(info.url) &&
    !/\.(?:jpe?g|png|webp|heic|avif)(?:\?|$)/i.test(info.url) &&
    (!info.ext || /^(?:mp4|webm|mov|m4v|mkv)$/i.test(info.ext))
  ) {
    return {
      videoUrl: info.url,
      audioUrl: null,
      width: typeof info.width === "number" && info.width > 0 ? info.width : null,
      height: typeof info.height === "number" && info.height > 0 ? info.height : null,
      duration: typeof info.duration === "number" && info.duration > 0 ? info.duration : null,
      size: null,
      format: info.ext ?? "mp4",
      combined: true,
      source: "direct",
    };
  }

  return null;
}

function progressiveSelection(format: YtDlpFormatLike): SelectedPublicMedia {
  return {
    videoUrl: format.url as string,
    audioUrl: null,
    width: typeof format.width === "number" && format.width > 0 ? format.width : null,
    height: typeof format.height === "number" && format.height > 0 ? format.height : null,
    duration: null,
    size: formatSize(format),
    format: format.ext ?? "mp4",
    combined: true,
    source: "progressive",
  };
}

/** Best thumbnail URL from yt-dlp's thumbnail list. */
export function bestYtDlpThumbnail(info: YtDlpInfoLike | null | undefined): string | null {
  if (!info) return null;
  if (isHttpUrl(info.thumbnail)) return info.thumbnail;
  const thumbnails = Array.isArray(info.thumbnails) ? info.thumbnails : [];
  let best: YtDlpThumbnailLike | null = null;
  let bestArea = -1;
  for (const thumbnail of thumbnails) {
    if (!thumbnail || !isHttpUrl(thumbnail.url)) continue;
    const area =
      (typeof thumbnail.width === "number" ? thumbnail.width : 0) *
      (typeof thumbnail.height === "number" ? thumbnail.height : 0);
    if (area > bestArea) {
      bestArea = area;
      best = thumbnail;
    }
  }
  return best?.url ?? null;
}

/** Content type from a canonical Instagram content URL. */
export function contentTypeForUrl(sourceUrl: string): InstagramContentType {
  try {
    const path = new URL(sourceUrl).pathname.toLowerCase();
    if (path.startsWith("/reel/") || (path.startsWith("/reels/") && !path.startsWith("/reels/audio"))) {
      return "REEL";
    }
    if (path.startsWith("/tv/")) return "VIDEO";
    if (path.startsWith("/p/")) return "POST";
  } catch {
    /* fall through */
  }
  return "UNKNOWN";
}

function authorFromInfo(info: YtDlpInfoLike | null | undefined): ResolverResult["author"] {
  if (!info) return null;
  const username =
    (typeof info.channel === "string" && info.channel.trim()) ||
    (typeof info.uploader === "string" && info.uploader.trim()) ||
    null;
  const displayName =
    (typeof info.uploader === "string" && info.uploader.trim()) || username || null;
  if (!username && !displayName) return null;
  return {
    username: username ? username.slice(0, 80) : null,
    displayName: displayName ? displayName.slice(0, 120) : null,
  };
}

function titleFromInfo(info: YtDlpInfoLike | null | undefined): string | null {
  if (!info) return null;
  const direct = typeof info.title === "string" ? info.title.trim() : "";
  if (direct) return direct.slice(0, 300);
  const description = typeof info.description === "string" ? info.description.trim() : "";
  if (description) return description.split(/\r?\n/)[0].slice(0, 300);
  return null;
}

function imageFromEntry(entry: YtDlpInfoLike): MediaItem | null {
  if (!isHttpUrl(entry.url)) return null;
  if (!/\.(?:jpe?g|png|webp|heic|avif)(?:\?|$)/i.test(entry.url)) return null;
  return {
    url: entry.url,
    type: "image",
    width: typeof entry.width === "number" && entry.width > 0 ? entry.width : null,
    height: typeof entry.height === "number" && entry.height > 0 ? entry.height : null,
    duration: null,
    size: null,
    thumbnail: entry.url,
    format: entry.ext ?? "jpg",
    audioUrl: null,
  };
}

function videoItemFromSelection(
  selection: SelectedPublicMedia,
  info: YtDlpInfoLike,
  thumbnail: string | null
): MediaItem {
  return {
    url: selection.videoUrl,
    type: "video",
    width: selection.width,
    height: selection.height,
    duration:
      typeof info.duration === "number" && info.duration > 0
        ? info.duration
        : selection.duration,
    size: selection.size,
    thumbnail,
    format: selection.format,
    audioUrl: selection.audioUrl,
  };
}

function resultFromMedia(
  media: MediaItem[],
  sourceUrl: string,
  base: { title: string | null; author: ResolverResult["author"]; thumbnail: string | null; hasMultipleEntries?: boolean }
): ResolverResult {
  const type: InstagramContentType =
    media.length > 1 || base.hasMultipleEntries ? "CAROUSEL" : contentTypeForUrl(sourceUrl);
  return {
    type,
    sourceUrl,
    thumbnail:
      base.thumbnail ??
      media.find((item) => item.thumbnail)?.thumbnail ??
      media.find((item) => item.type === "image")?.url ??
      null,
    title: base.title,
    author: base.author,
    media,
  };
}

/**
 * Convert yt-dlp JSON into the app's resolver result. Supports both a single
 * video and multi-entry (carousel) responses. Returns null when the response
 * carries no usable media or an entry cannot be mapped (caller falls back).
 */
export function buildPublicResult(
  info: YtDlpInfoLike | null | undefined,
  sourceUrl: string
): ResolverResult | null {
  if (!info) return null;

  const entries = Array.isArray(info.entries) ? info.entries.filter(Boolean) : [];
  if (entries.length > 0) {
    const media: MediaItem[] = [];
    for (const entry of entries) {
      const selection = selectYtDlpMedia(entry);
      if (selection) {
        media.push(videoItemFromSelection(selection, entry, bestYtDlpThumbnail(entry)));
        continue;
      }
      const image = imageFromEntry(entry);
      if (image) {
        media.push(image);
        continue;
      }
      // A partial carousel is worse than falling back to the browser provider.
      return null;
    }
    if (media.length === 0) return null;
    return resultFromMedia(media, sourceUrl, {
      title: titleFromInfo(info),
      author: authorFromInfo(info),
      thumbnail: bestYtDlpThumbnail(info),
      hasMultipleEntries: true,
    });
  }

  const selection = selectYtDlpMedia(info);
  if (!selection) return null;
  return resultFromMedia([videoItemFromSelection(selection, info, bestYtDlpThumbnail(info))], sourceUrl, {
    title: titleFromInfo(info),
    author: authorFromInfo(info),
    thumbnail: bestYtDlpThumbnail(info),
  });
}

/**
 * Build a result from HTML/embed candidates. Only used as a fallback:
 *  - a single video candidate is verified (and its split audio paired);
 *  - an image-only post/carousel is returned directly;
 *  - multiple videos are left to the browser provider, which preserves order.
 *
 * `structured` says the candidates came from a real `edge_sidecar_to_children`
 * / `carousel_media` collection. Without it a scraped page mixes the post's
 * own image with unrelated suggestion thumbnails, so only the first candidate
 * is trusted — otherwise a single photo would be reported as a carousel of
 * other people's posts.
 */
export async function buildResultFromCandidates(
  candidates: ExtractedMedia[],
  sourceUrl: string,
  thumbnail: string | null,
  opts?: { structured?: boolean }
): Promise<ResolverResult | null> {
  const structured = opts?.structured ?? false;
  const usable = candidates.filter((item) => isHttpUrl(item.url));
  if (usable.length === 0) return null;
  const videos = usable.filter((item) => item.type === "video");
  const images = usable.filter((item) => item.type === "image");

  if (videos.length === 1) {
    let selection;
    try {
      selection = await selectReelVideo(videos);
    } catch {
      return null;
    }
    if (!selection) return null;
    const video: MediaItem = {
      url: selection.videoUrl,
      type: "video",
      width: selection.width,
      height: selection.height,
      duration: null,
      size: selection.size,
      thumbnail,
      format: "mp4",
      audioUrl: selection.audioUrl,
    };
    const media: MediaItem[] = [];
    for (const item of usable) {
      if (item.type === "video") {
        if (!media.some((existing) => existing.type === "video")) media.push(video);
        continue;
      }
      // A poster/thumbnail scraped next to a video is chrome, not a slide,
      // unless the source was a structured carousel that really has images.
      if (!structured) continue;
      media.push({
        url: item.url,
        type: "image",
        width: item.width,
        height: item.height,
        duration: null,
        size: null,
        thumbnail: item.url,
        format: "jpg",
        audioUrl: null,
      });
    }
    return resultFromMedia(media, sourceUrl, { title: null, author: null, thumbnail });
  }

  if (videos.length === 0 && images.length > 0) {
    const selected = structured ? images : images.slice(0, 1);
    const media: MediaItem[] = selected.map((item) => ({
      url: item.url,
      type: "image" as const,
      width: item.width,
      height: item.height,
      duration: null,
      size: null,
      thumbnail: item.url,
      format: "jpg",
      audioUrl: null,
    }));
    return resultFromMedia(media, sourceUrl, { title: null, author: null, thumbnail });
  }

  return null;
}

interface PublicPageFetch {
  html: string | null;
  status: number | null;
  bytes: number;
  contentType: string | null;
  finalPath: string | null;
  error: string | null;
}

function linkSignals(signal: AbortSignal | undefined, timeoutMs: number): AbortSignal {
  const timeout = AbortSignal.timeout(Math.max(1, timeoutMs));
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

async function fetchPublicPage(
  url: string,
  timeoutMs: number,
  signal: AbortSignal | undefined
): Promise<PublicPageFetch> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": DESKTOP_UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
      },
      redirect: "follow",
      signal: linkSignals(signal, timeoutMs),
    });
    const contentType = res.headers.get("content-type") || null;
    const finalPath = (() => {
      try {
        return new URL(res.url || url).pathname;
      } catch {
        return null;
      }
    })();
    if (!res.ok || !contentType || (!contentType.includes("text/html") && !contentType.includes("application/xhtml"))) {
      await res.body?.cancel().catch(() => {});
      return { html: null, status: res.status, bytes: 0, contentType, finalPath, error: null };
    }
    const html = await res.text();
    return {
      html,
      status: res.status,
      bytes: Buffer.byteLength(html),
      contentType,
      finalPath,
      error: null,
    };
  } catch (error) {
    return {
      html: null,
      status: null,
      bytes: 0,
      contentType: null,
      finalPath: null,
      error: error instanceof Error ? error.name : "fetch-failed",
    };
  }
}

function parseYtDlpJson(stdout: string): YtDlpInfoLike | null {
  const start = stdout.indexOf("{");
  const end = stdout.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed: unknown = JSON.parse(stdout.slice(start, end + 1));
    return parsed && typeof parsed === "object" ? (parsed as YtDlpInfoLike) : null;
  } catch {
    return null;
  }
}

/**
 * True only for a caller/client cancellation. An internal yt-dlp or fetch
 * timeout is NOT an abort of the whole public chain — it must fall through to
 * the next method (page HTML / embed / provider) instead of failing the
 * resolve with an AbortError.
 */
function isAbortError(_error: unknown, signal?: AbortSignal): boolean {
  return signal?.aborted === true;
}

async function ytDlpReady(budgetMs: number): Promise<boolean> {
  if (getYtDlpPath()) return true;
  try {
    return await Promise.race([
      isYtDlpAvailable(),
      new Promise<boolean>((resolve) => {
        const timer = setTimeout(() => resolve(false), budgetMs);
        timer.unref?.();
      }),
    ]);
  } catch {
    return false;
  }
}

function abortReason(): Error {
  const error = new Error("Public extraction aborted");
  error.name = "AbortError";
  return error;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? abortReason());
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(signal?.reason ?? abortReason());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export interface PublicExtractionOptions {
  signal?: AbortSignal;
  requestId?: string;
  timeoutMs?: number;
}

export interface PublicExtractionOutcome {
  result: ResolverResult | null;
  /** Confident content verdict. When set the caller must NOT fall back. */
  verdict: ErrorCode | null;
  diagnostics: ResolveDiagnostics;
}

/**
 * Try the public extraction chain: yt-dlp -> page HTML -> public embed.
 * Never throws for ordinary failures (the caller falls back to the browser
 * provider); a confident restriction verdict is returned instead. Caller
 * aborts are rethrown so cancellation still stops the chain.
 */
export async function tryInstagramPublicExtraction(
  url: string,
  opts?: PublicExtractionOptions
): Promise<PublicExtractionOutcome> {
  const signal = opts?.signal;
  const totalMs = Math.max(2_000, opts?.timeoutMs ?? PUBLIC_EXTRACT_TIMEOUT_MS);
  const deadline = Date.now() + totalMs;
  const timeLeft = (): number => deadline - Date.now();
  const remaining = (cap: number): number =>
    Math.max(1_000, Math.min(cap, timeLeft()));

  const diagnostics: ResolveDiagnostics = { stage: "public-extraction" };
  const methods: PublicMethod[] = [];
  let page: PublicPageFetch | null = null;
  let inspection: PublicPageInspection | null = null;

  try {
    if (signal?.aborted) throw signal.reason ?? abortReason();

    if (await ytDlpReady(Math.min(YTDLP_READY_BUDGET_MS, remaining(YTDLP_READY_BUDGET_MS)))) {
      methods.push("yt-dlp");
      diagnostics.publicMethod = "yt-dlp";
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const attemptStartedAt = Date.now();
        try {
          const { stdout } = await runYtDlp(
            [
              "--dump-single-json",
              "--no-warnings",
              "--skip-download",
              "--no-cache-dir",
              "--socket-timeout",
              "10",
              "--retries",
              "0",
              url,
            ],
            {
              timeoutMs: remaining(attempt === 0 ? YTDLP_FIRST_TIMEOUT_MS : YTDLP_RETRY_TIMEOUT_MS),
              signal,
              maxBuffer: 16 * 1024 * 1024,
            }
          );
          const info = parseYtDlpJson(stdout);
          const result = buildPublicResult(info, url);
          if (result) {
            diagnostics.stage = "public-extracted";
            diagnostics.publicMethod = "yt-dlp";
            diagnostics.extractionAttempts = methods;
            return { result, verdict: null, diagnostics };
          }
          diagnostics.stage = "yt-dlp-no-media";
          break;
        } catch (error) {
          if (isAbortError(error, signal)) throw error;
          const retryable = isRetryableYtDlpError(error);
          diagnostics.stage = "yt-dlp-failed";
          // A slow failure was almost certainly the timeout budget itself;
          // retrying it would starve the page/embed fallback of time. Retry
          // only quick transient errors (DNS blip, refused connection).
          const failedFast = Date.now() - attemptStartedAt < 2_000;
          if (retryable && failedFast && attempt === 0 && timeLeft() > 1_500) {
            await sleep(300, signal);
            continue;
          }
          break;
        }
      }
    }

    page = await fetchPublicPage(url, remaining(PAGE_TIMEOUT_MS), signal);
    diagnostics.publicPageStatus = page.status;
    diagnostics.publicPageBytes = page.bytes;
    diagnostics.publicPageContentType = page.contentType;

    inspection = inspectPublicPage(page.html, { finalPath: page.finalPath });
    diagnostics.publicHasVideoVersions = inspection.hasVideoVersions;
    diagnostics.publicHasVideoUrl = inspection.hasVideoUrl;
    diagnostics.publicHasDashManifest = inspection.hasDashManifest;
    diagnostics.publicLoginWall = inspection.loginWall;
    diagnostics.publicConsentWall = inspection.consentWall;
    diagnostics.publicChallenge = inspection.challenge;
    diagnostics.publicFailureReason = inspection.failureReason;
    diagnostics.publicRestrictedAge = inspection.restrictedAge;
    diagnostics.publicRestriction = inspection.restriction;

    if (page.html) {
      const pageCollection = collectEmbedCandidates(page.html);
      const pageHasVideo = pageCollection.items.some((item) => item.type === "video");

      // A structured carousel or a page video is authoritative; accept it
      // before spending the embed round-trip.
      if (pageCollection.items.length > 0 && (pageCollection.structured || pageHasVideo)) {
        methods.push("html");
        diagnostics.publicMethod = "html";
        const result = await buildResultFromCandidates(
          pageCollection.items,
          url,
          ogImage(page.html),
          { structured: pageCollection.structured }
        );
        if (result) {
          diagnostics.stage = "public-extracted";
          diagnostics.extractionAttempts = methods;
          return { result, verdict: null, diagnostics };
        }
      }

      // Photo/carousel pages scraped from the main document mix the post's own
      // image with suggestion thumbnails. The public embed endpoint carries the
      // complete structured collection, so prefer it before accepting a single
      // scraped image.
      const shortcode = extractPostShortcode(url);
      if (shortcode && timeLeft() > 1_500) {
        const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
        const embed = await fetchPublicPage(embedUrl, remaining(EMBED_TIMEOUT_MS), signal);
        if (embed.html) {
          const embedCollection = collectEmbedCandidates(embed.html);
          if (embedCollection.items.length > 0) {
            methods.push("embed");
            diagnostics.publicMethod = "embed";
            const result = await buildResultFromCandidates(
              embedCollection.items,
              url,
              ogImage(embed.html),
              { structured: embedCollection.structured }
            );
            if (result) {
              diagnostics.stage = "public-extracted";
              diagnostics.extractionAttempts = methods;
              return { result, verdict: null, diagnostics };
            }
          }
        }
      }

      // Last public fallback: the first scraped page candidate only. A
      // non-structured scrape must never become a multi-item carousel.
      if (pageCollection.items.length > 0) {
        methods.push("html");
        diagnostics.publicMethod = "html";
        const result = await buildResultFromCandidates(
          pageCollection.items,
          url,
          ogImage(page.html),
          { structured: pageCollection.structured }
        );
        if (result) {
          diagnostics.stage = "public-extracted";
          diagnostics.extractionAttempts = methods;
          return { result, verdict: null, diagnostics };
        }
      }
    }

    diagnostics.stage = "public-extraction-failed";
    diagnostics.extractionAttempts = methods;
    const verdict = restrictionToErrorCode(inspection.restriction);
    logger.info("[PUBLIC] no media from public methods", {
      requestId: opts?.requestId,
      methods,
      pageStatus: page.status,
      pageBytes: page.bytes,
      contentType: page.contentType,
      hasVideoVersions: inspection.hasVideoVersions,
      hasVideoUrl: inspection.hasVideoUrl,
      hasDashManifest: inspection.hasDashManifest,
      loginWall: inspection.loginWall,
      challenge: inspection.challenge,
      restriction: inspection.restriction,
      failureReason: inspection.failureReason,
      restrictedAge: inspection.restrictedAge,
      pageType: inspection.pageType,
      verdict,
    });
    return { result: null, verdict, diagnostics };
  } catch (error) {
    if (isAbortError(error, signal)) throw error;
    diagnostics.stage = "public-extraction-error";
    logger.warn("[PUBLIC] extraction error", {
      requestId: opts?.requestId,
      error: error instanceof Error ? error.message.slice(0, 240) : "unknown",
    });
    return { result: null, verdict: null, diagnostics };
  }
}

function ogImage(html: string | null): string | null {
  if (!html) return null;
  const match =
    html.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
    html.match(/content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
  return match && isHttpUrl(match[1]) ? match[1] : null;
}

function extractPostShortcode(url: string): string | null {
  try {
    const segments = new URL(url).pathname.split("/").filter(Boolean);
    if (["p", "reel", "reels", "tv"].includes(segments[0]?.toLowerCase() ?? "")) {
      return segments[1] ?? null;
    }
  } catch {
    /* ignore */
  }
  return null;
}
