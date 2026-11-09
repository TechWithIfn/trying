import { logger } from "../logger.js";
import { redactMediaUrl } from "../text.js";
import { isCdnMediaHost, isPrivateOrReservedHost } from "../providers/base.js";
import { validateTwitterUrl } from "../validators/twitter-url.js";
import {
  runYtDlp,
  YtDlpAbortedError,
  YtDlpProcessError,
} from "../youtube/ytdlp.js";

/**
 * Twitter/X extraction with yt-dlp.
 *
 * The extractor is the source of truth for a public post: it resolves the
 * tweet, enumerates the real media renditions and supplies the metadata. This
 * module only turns that data into the app's ResolvedMedia shape and proves
 * that the selected progressive MP4 is actually fetchable before anything is
 * reported as a success.
 *
 * Two rules matter for correctness:
 *  1. A media URL is never fabricated. When yt-dlp cannot find a video, when
 *     only HLS renditions exist (browsers cannot play a bare m3u8 in a
 *     <video> element) or when the CDN rejects the URL, the caller gets a
 *     typed failure instead of a success with a dead URL.
 *  2. Only progressive https MP4 renditions are surfaced. Twitter also
 *     publishes m3u8 variants, but those need a player/remux layer; selecting
 *     one would make Preview and Download fail even though extraction
 *     "succeeded".
 */

export type TwitterMediaType = "video";

export interface TwitterMediaItem {
  url: string;
  type: TwitterMediaType;
  width: number | null;
  height: number | null;
  duration: number | null;
  size: number | null;
  thumbnail: string | null;
  format: string;
  mimeType: string;
}

export interface TwitterResolveResult {
  type: "VIDEO" | "CAROUSEL";
  sourceUrl: string;
  thumbnail: string | null;
  title: string | null;
  description: string | null;
  author: { username: string | null; displayName: string | null } | null;
  media: TwitterMediaItem[];
  /** The POST id (not the internal video id), matching the user's URL. */
  mediaId: string;
}

export type TwitterResolveErrorCode =
  | "TWITTER_INVALID_URL"
  | "TWITTER_CONTENT_UNAVAILABLE"
  | "TWITTER_NO_VIDEO"
  | "TWITTER_HLS_ONLY"
  | "TWITTER_MEDIA_UNAVAILABLE"
  | "TWITTER_RATE_LIMITED"
  | "TWITTER_RESOLVE_TIMEOUT"
  | "TWITTER_RESOLVE_FAILED";

export class TwitterResolveError extends Error {
  readonly code: TwitterResolveErrorCode;
  readonly status: number;

  constructor(code: TwitterResolveErrorCode, message: string, status: number) {
    super(message);
    this.name = "TwitterResolveError";
    this.code = code;
    this.status = status;
  }
}

/** Shape of the fields we consume from `yt-dlp --dump-single-json`. */
export interface TwitterYtFormat {
  url?: unknown;
  ext?: unknown;
  protocol?: unknown;
  width?: unknown;
  height?: unknown;
  tbr?: unknown;
  filesize?: unknown;
  filesize_approx?: unknown;
  format_id?: unknown;
  vcodec?: unknown;
  acodec?: unknown;
}

export interface TwitterYtInfo {
  _type?: unknown;
  id?: unknown;
  display_id?: unknown;
  title?: unknown;
  description?: unknown;
  uploader?: unknown;
  uploader_id?: unknown;
  thumbnail?: unknown;
  thumbnails?: unknown;
  duration?: unknown;
  width?: unknown;
  height?: unknown;
  url?: unknown;
  ext?: unknown;
  protocol?: unknown;
  formats?: unknown;
  entries?: unknown;
  extractor?: unknown;
  extractor_key?: unknown;
  webpage_url?: unknown;
}

export interface TwitterCandidate {
  url: string;
  width: number | null;
  height: number | null;
  tbr: number | null;
  size: number | null;
}

function positiveInt(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function positiveNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function candidateScore(candidate: TwitterCandidate): number {
  const area = (candidate.width ?? 0) * (candidate.height ?? 0);
  return area * 1000 + (candidate.tbr ?? 0);
}

/**
 * Progressive HTTPS MP4 renditions from a yt-dlp info object, best first.
 *
 * m3u8/HLS variants are deliberately excluded: they are not directly
 * playable by a browser <video> element and the proxy does not remux, so
 * selecting one would be a fabricated success. Rows without width/height are
 * still accepted (metadata is sometimes sparse) and sorted last.
 */
export function pickProgressiveCandidates(info: TwitterYtInfo): TwitterCandidate[] {
  const rows: TwitterYtFormat[] = Array.isArray(info.formats)
    ? (info.formats as TwitterYtFormat[])
    : [];
  // A single-media response can carry the chosen rendition at the top level.
  if (typeof info.url === "string" && info.url.length > 0) {
    rows.push({
      url: info.url,
      ext: info.ext,
      protocol: info.protocol,
      width: info.width,
      height: info.height,
    });
  }

  const seen = new Set<string>();
  const candidates: TwitterCandidate[] = [];
  for (const row of rows) {
    if (!row || typeof row.url !== "string" || row.url.length === 0) continue;
    if (seen.has(row.url)) continue;
    seen.add(row.url);

    const protocol = typeof row.protocol === "string" ? row.protocol.toLowerCase() : "";
    // `m3u8`, `m3u8_native`, `hls` ... are player-dependent, skip them.
    if (protocol.includes("m3u8") || protocol.includes("hls")) continue;
    const ext = typeof row.ext === "string" ? row.ext.toLowerCase() : "";
    if (ext && ext !== "mp4") continue;

    let parsed: URL;
    try {
      parsed = new URL(row.url);
    } catch {
      continue;
    }
    if (parsed.protocol !== "https:") continue;
    if (isPrivateOrReservedHost(parsed.hostname)) continue;
    if (!isCdnMediaHost(parsed.hostname)) continue;

    candidates.push({
      url: row.url,
      width: positiveInt(row.width) ?? positiveInt(info.width),
      height: positiveInt(row.height) ?? positiveInt(info.height),
      tbr: positiveNumber(row.tbr),
      size: positiveInt(row.filesize) ?? positiveInt(row.filesize_approx),
    });
  }

  return candidates.sort((a, b) => candidateScore(b) - candidateScore(a));
}

/** Whether an info object only exposes HLS renditions (not playable directly). */
export function hasOnlyHlsFormats(info: TwitterYtInfo): boolean {
  const rows = Array.isArray(info.formats) ? (info.formats as TwitterYtFormat[]) : [];
  if (rows.length === 0) return false;
  let sawHls = false;
  for (const row of rows) {
    if (!row || typeof row.url !== "string" || row.url.length === 0) continue;
    const protocol = typeof row.protocol === "string" ? row.protocol.toLowerCase() : "";
    const isHls = protocol.includes("m3u8") || protocol.includes("hls");
    if (isHls) sawHls = true;
    // A single progressive MP4 is enough to avoid the HLS-only verdict.
    if (!isHls && (typeof row.ext !== "string" || row.ext.toLowerCase() === "mp4")) {
      return false;
    }
  }
  return sawHls;
}

/** Largest poster offered by yt-dlp, preferring pbs.twimg.com. */
export function pickThumbnail(info: TwitterYtInfo): string | null {
  const rows = Array.isArray(info.thumbnails) ? info.thumbnails : [];
  let best: { url: string; area: number } | null = null;
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const candidate = row as { url?: unknown; width?: unknown; height?: unknown };
    if (typeof candidate.url !== "string" || candidate.url.length === 0) continue;
    try {
      const parsed = new URL(candidate.url);
      if (parsed.protocol !== "https:" || !isCdnMediaHost(parsed.hostname)) continue;
    } catch {
      continue;
    }
    const area = (positiveInt(candidate.width) ?? 0) * (positiveInt(candidate.height) ?? 0);
    if (!best || area > best.area) best = { url: candidate.url, area };
  }
  if (best) return best.url;

  if (typeof info.thumbnail === "string" && info.thumbnail.length > 0) {
    try {
      const parsed = new URL(info.thumbnail);
      if (parsed.protocol === "https:" && isCdnMediaHost(parsed.hostname)) {
        return info.thumbnail;
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

/**
 * The real post text. yt-dlp's `description` is the caption; `title` is
 * normally "<author> - <caption>". Strip that author prefix from BOTH fields
 * and drop the trailing t.co self-link (it is a redirect, not part of the text).
 */
export function normalizeTweetText(info: TwitterYtInfo): string | null {
  const description = typeof info.description === "string" ? info.description : "";
  const title = typeof info.title === "string" ? info.title : "";
  const uploader = typeof info.uploader === "string" ? info.uploader : "";
  const uploaderId = typeof info.uploader_id === "string" ? info.uploader_id.replace(/^@+/, "") : "";

  // Pick the best raw text: prefer description (caption only), fall back to title
  // which often has the form "<displayName> - <caption>" or "@<id> - <caption>".
  let text = description.trim() || title.trim();
  if (!text) return null;

  // Strip author prefix from title regardless of whether description was present.
  // yt-dlp's title field is reliably "<Uploader> - <caption>", so we always
  // strip it to avoid "Dhruv Rathee - Good will always…" appearing as the
  // description even when description already contains the pure caption.
  if (uploader && text.startsWith(`${uploader} - `)) {
    text = text.slice(uploader.length + 3).trim();
  } else if (uploaderId && text.startsWith(`@${uploaderId} - `)) {
    text = text.slice(uploaderId.length + 4).trim();
  } else if (uploaderId && text.startsWith(`${uploaderId} - `)) {
    text = text.slice(uploaderId.length + 3).trim();
  }

  // Drop trailing t.co short-links (they are redirects appended by Twitter,
  // not part of the user's post text).
  text = text.replace(/\s*https?:\/\/t\.co\/\S+\s*$/i, "").trim();
  return text || null;
}

function metadataOf(
  info: TwitterYtInfo,
  fallback: { thumbnail: string | null; author: TwitterResolveResult["author"]; title: string | null }
): {
  thumbnail: string | null;
  author: TwitterResolveResult["author"];
  title: string | null;
} {
  const thumbnail = pickThumbnail(info) ?? fallback.thumbnail;
  const username =
    typeof info.uploader_id === "string" && info.uploader_id.length > 0
      ? info.uploader_id.replace(/^@+/, "")
      : fallback.author?.username ?? null;
  const displayName =
    typeof info.uploader === "string" && info.uploader.length > 0
      ? info.uploader
      : fallback.author?.displayName ?? null;
  const title = normalizeTweetText(info) ?? fallback.title;
  return {
    thumbnail,
    title,
    author: username || displayName ? { username, displayName } : null,
  };
}

function infoEntries(info: TwitterYtInfo): TwitterYtInfo[] {
  const isPlaylist = info._type === "playlist" || Array.isArray(info.entries);
  if (!isPlaylist || !Array.isArray(info.entries)) return [info];
  const entries = (info.entries as TwitterYtInfo[]).filter(
    (entry) => entry && typeof entry === "object"
  );
  return entries.length > 0 ? entries : [info];
}

async function probeMediaUrl(
  url: string,
  signal?: AbortSignal
): Promise<{ ok: boolean; status: number | null; contentType: string | null }> {
  const timeout = AbortSignal.timeout(10_000);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
    Accept: "video/mp4,video/*;q=0.9,*/*;q=0.5",
  };

  const attempt = async (method: "HEAD" | "GET"): Promise<Response | null> => {
    try {
      return await fetch(url, { method, headers, signal: combined });
    } catch {
      return null;
    }
  };

  let response = await attempt("HEAD");
  // Some CDN edges answer HEAD with 405/501 even when the object is fine.
  if (response && (response.status === 405 || response.status === 501)) {
    await response.body?.cancel().catch(() => {});
    response = await attempt("GET");
  }
  if (!response) return { ok: false, status: null, contentType: null };

  const status = response.status;
  const contentType = response.headers.get("content-type");
  await response.body?.cancel().catch(() => {});

  if (!response.ok) return { ok: false, status, contentType };
  if (contentType && !/^video\//i.test(contentType) && !/octet-stream/i.test(contentType)) {
    return { ok: false, status, contentType };
  }
  return { ok: true, status, contentType };
}

export function mapYtDlpFailure(error: unknown): TwitterResolveError {
  if (error instanceof TwitterResolveError) return error;
  if (error instanceof YtDlpAbortedError) {
    return new TwitterResolveError(
      "TWITTER_RESOLVE_TIMEOUT",
      "Twitter/X did not respond in time. Please try again.",
      504
    );
  }

  const text =
    error instanceof YtDlpProcessError
      ? `${error.message}\n${error.stderr}`
      : error instanceof Error
        ? error.message
        : "unknown";
  const lower = text.toLowerCase();

  if (/http error 429|too many requests|rate.?limit/.test(lower)) {
    return new TwitterResolveError(
      "TWITTER_RATE_LIMITED",
      "Twitter/X is rate limiting requests right now. Please try again shortly.",
      429
    );
  }
  if (/login required|log in|private|protected|not available|does not exist|suspended/.test(lower)) {
    return new TwitterResolveError(
      "TWITTER_CONTENT_UNAVAILABLE",
      "This Twitter/X post is unavailable, private, or requires access.",
      404
    );
  }
  if (/no video|no video formats|there is no video|requested format is not available/.test(lower)) {
    return new TwitterResolveError(
      "TWITTER_NO_VIDEO",
      "This Twitter/X post does not contain a downloadable video, or it is no longer available.",
      422
    );
  }
  if (/timed out|timeout|network|connection|unable to download|fetch failed/.test(lower)) {
    return new TwitterResolveError(
      "TWITTER_RESOLVE_TIMEOUT",
      "Twitter/X did not respond in time. Please try again.",
      504
    );
  }
  return new TwitterResolveError(
    "TWITTER_RESOLVE_FAILED",
    "Twitter/X did not provide a public downloadable video.",
    422
  );
}

export interface ResolveTwitterOptions {
  signal?: AbortSignal;
  requestId?: string;
  timeoutMs?: number;
  /** Used only in logs (e.g. "resolve" | "refresh"). */
  purpose?: string;
}

const DEFAULT_TIMEOUT_MS = 45_000;
/** Never probe more than this many renditions before declaring failure. */
const MAX_PROBES = 4;
/**
 * Preferred height for the preview rendition (the one mounted in <video>).
 * 720p streams fast enough for instant browser decode; the full-resolution
 * candidate is still exposed so the download endpoint can offer it.
 * We pick the best candidate whose shorter dimension is ≤ this cap.
 */
const PREVIEW_MAX_HEIGHT = 1280;

/**
 * Resolve a public Twitter/X post to one or more progressive MP4 renditions.
 * Throws TwitterResolveError on any failure — never returns a fake URL.
 */
export async function resolveTwitterPost(
  rawUrl: string,
  options: ResolveTwitterOptions = {}
): Promise<TwitterResolveResult> {
  const startedAt = Date.now();
  const requestId = options.requestId ?? null;
  const checked = validateTwitterUrl(rawUrl);
  if (!checked.valid || !checked.parsed) {
    throw new TwitterResolveError(
      "TWITTER_INVALID_URL",
      checked.valid ? "Invalid Twitter/X URL." : checked.error,
      400
    );
  }
  const { normalized, postId } = checked.parsed;

  logger.info("[TWITTER] extraction started", {
    requestId,
    purpose: options.purpose ?? "resolve",
    postId,
    host: checked.parsed.hostname,
  });

  const extractorStart = Date.now();
  let stdout: string;
  try {
    const run = await runYtDlp(
      [
        "--skip-download",
        "--dump-single-json",
        "--no-warnings",
        "--no-playlist",
        "--socket-timeout", "10",
        normalized,
      ],
      { timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS, signal: options.signal }
    );
    stdout = run.stdout;
  } catch (error) {
    const mapped = mapYtDlpFailure(error);
    logger.warn("[TWITTER] extraction failed", {
      requestId,
      postId,
      category: mapped.code,
      durationMs: Date.now() - startedAt,
    });
    throw mapped;
  }

  let info: TwitterYtInfo;
  try {
    info = JSON.parse(stdout) as TwitterYtInfo;
  } catch {
    logger.warn("[TWITTER] extractor returned unparsable JSON", {
      requestId,
      postId,
      durationMs: Date.now() - startedAt,
    });
    throw new TwitterResolveError(
      "TWITTER_RESOLVE_FAILED",
      "Twitter/X returned an unexpected response. Please try again.",
      502
    );
  }

  logger.info("[TWITTER] extractor selected", {
    requestId,
    postId,
    extractor: typeof info.extractor_key === "string" ? info.extractor_key : "Twitter",
    type: typeof info._type === "string" ? info._type : "video",
    playlistEntries: Array.isArray(info.entries) ? info.entries.length : 0,
    formatCount: Array.isArray(info.formats) ? info.formats.length : 0,
    durationMs: Date.now() - extractorStart,
  });

  const parentThumbnail = pickThumbnail(info);
  const parentAuthor: TwitterResolveResult["author"] =
    typeof info.uploader_id === "string" || typeof info.uploader === "string"
      ? {
          username: typeof info.uploader_id === "string" ? info.uploader_id : null,
          displayName: typeof info.uploader === "string" ? info.uploader : null,
        }
      : null;
  const parentTitle = normalizeTweetText(info);

  const entries = infoEntries(info);
  const media: TwitterMediaItem[] = [];
  const entryMeta = { thumbnail: parentThumbnail, author: parentAuthor, title: parentTitle };

  for (const entry of entries) {
    const meta = metadataOf(entry, entryMeta);
    entryMeta.thumbnail = meta.thumbnail;
    entryMeta.author = meta.author;
    entryMeta.title = meta.title;

    const candidates = pickProgressiveCandidates(entry);
    if (candidates.length === 0) {
      if (hasOnlyHlsFormats(entry)) {
        logger.warn("[TWITTER] only HLS renditions available", {
          requestId,
          postId,
          entryId: typeof entry.id === "string" ? entry.id : null,
        });
        throw new TwitterResolveError(
          "TWITTER_HLS_ONLY",
          "This Twitter/X video is only available as an HLS stream, which cannot be played or saved directly. Please try another post.",
          422
        );
      }
      continue;
    }

    logger.info("[TWITTER] metadata received", {
      requestId,
      postId,
      entryId: typeof entry.id === "string" ? entry.id : null,
      title: meta.title ? meta.title.slice(0, 80) : null,
      username: meta.author?.username ?? null,
      durationSeconds: positiveNumber(entry.duration),
      thumbnail: meta.thumbnail ? redactMediaUrl(meta.thumbnail) : null,
      formats: candidates.slice(0, 6).map((c) => ({
        width: c.width,
        height: c.height,
        tbr: c.tbr,
      })),
    });
    logger.info("[TWITTER] thumbnail selected", {
      requestId,
      postId,
      hasThumbnail: Boolean(meta.thumbnail),
      host: meta.thumbnail ? redactMediaUrl(meta.thumbnail) : null,
    });

    let selected: TwitterCandidate | null = null;
    const probeCount = Math.min(candidates.length, MAX_PROBES);

    // Pick a preview-optimised candidate: prefer the best rendition whose
    // larger dimension is ≤ PREVIEW_MAX_HEIGHT (720p portrait = 1280px tall).
    // If none fits in that budget, fall back to the smallest available so the
    // browser can decode it without stalling. All candidates remain available
    // for direct download via the /api/download endpoint.
    const previewCandidates = candidates.filter(
      (c) => (c.height ?? Infinity) <= PREVIEW_MAX_HEIGHT || (c.width ?? Infinity) <= PREVIEW_MAX_HEIGHT
    );
    const orderedForProbe = previewCandidates.length > 0
      ? [...previewCandidates, ...candidates.filter((c) => !previewCandidates.includes(c))]
      : candidates;
    const probeTargets = orderedForProbe.slice(0, probeCount);

    // Probe all candidates simultaneously so we do not block on slow HEAD
    // requests in series. We still need ONE valid URL, so we race them and
    // keep the winner that is earliest in our priority order.
    const probeResults = await Promise.all(
      probeTargets.map((candidate) =>
        probeMediaUrl(candidate.url, options.signal).then((probe) => ({ candidate, probe }))
      )
    );
    for (let i = 0; i < probeResults.length; i += 1) {
      const { candidate, probe } = probeResults[i];
      logger.info("[TWITTER] media URL validation", {
        requestId,
        postId,
        candidate: i + 1,
        of: probeTargets.length,
        url: redactMediaUrl(candidate.url),
        ok: probe.ok,
        status: probe.status,
        contentType: probe.contentType,
        height: candidate.height,
        width: candidate.width,
      });
      if (probe.ok && !selected) {
        selected = candidate;
      }
    }

    if (!selected) {
      logger.warn("[TWITTER] every extracted rendition failed validation", {
        requestId,
        postId,
        probed: probeCount,
      });
      throw new TwitterResolveError(
        "TWITTER_MEDIA_UNAVAILABLE",
        "Twitter/X returned a video link that is no longer available. Please try again.",
        502
      );
    }

    media.push({
      url: selected.url,
      type: "video",
      width: selected.width,
      height: selected.height,
      duration: positiveNumber(entry.duration) ?? positiveNumber(info.duration),
      size: selected.size,
      thumbnail: meta.thumbnail,
      format: "mp4",
      mimeType: "video/mp4",
    });
  }

  if (media.length === 0) {
    logger.warn("[TWITTER] no downloadable video in post", { requestId, postId });
    throw new TwitterResolveError(
      "TWITTER_NO_VIDEO",
      "This Twitter/X post does not contain a downloadable video, or it is no longer available.",
      422
    );
  }

  const finalMeta = metadataOf(entries[0], {
    thumbnail: parentThumbnail,
    author: parentAuthor,
    title: parentTitle,
  });

  logger.info("[TWITTER] extraction completed", {
    requestId,
    postId,
    type: media.length > 1 ? "CAROUSEL" : "VIDEO",
    mediaCount: media.length,
    streamHost: new URL(media[0].url).hostname,
    durationMs: Date.now() - startedAt,
  });

  return {
    type: media.length > 1 ? "CAROUSEL" : "VIDEO",
    sourceUrl: normalized,
    thumbnail: finalMeta.thumbnail,
    title: finalMeta.title,
    description: finalMeta.title,
    author: finalMeta.author,
    media,
    mediaId: postId,
  };
}

/**
 * Fresh media URL for a stale/expired proxy request. Supports the download and
 * stream routes' one-shot recovery: re-run extraction, validate the new URL
 * and hand back only a rendition that just passed the CDN probe.
 */
export async function resolveTwitterMediaUrl(
  rawUrl: string,
  options: Omit<ResolveTwitterOptions, "purpose"> = {}
): Promise<string> {
  const result = await resolveTwitterPost(rawUrl, { ...options, purpose: "refresh" });
  const fresh = result.media.find((item) => item.type === "video");
  if (!fresh) {
    throw new TwitterResolveError(
      "TWITTER_MEDIA_UNAVAILABLE",
      "Could not refresh this Twitter/X video.",
      502
    );
  }
  return fresh.url;
}
