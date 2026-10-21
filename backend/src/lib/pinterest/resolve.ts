import { logger } from "../logger.js";
import { AppError, createError, isNetworkError, isTimeoutError } from "../errors.js";
import { validateProxyUrl } from "../media-proxy.js";
import { isPinterestPageHost } from "../validators/pinterest-url.js";
import { readPositiveInt } from "../env.js";
import type { Author, MediaItem, ResolveCallOptions, ResolveProgressCallback, ResolverResult } from "../types.js";

/**
 * Pinterest pin resolution (pure HTTP).
 *
 * Pinterest pin pages are server-rendered for crawlers, but they NO LONGER
 * emit the anonymous `PinResource/get` XHR the previous implementation waited
 * on (verified live 2026-10: a direct PinResource call is 403 and the browser
 * never fires it). Waiting for it burned the whole request budget and surfaced
 * as "Pinterest did not respond in time".
 *
 * The same public pin data is available in the initial HTML — exactly what a
 * crawler or a visitor's first paint receives — from two trustworthy sources:
 *   1. `<script type="application/ld+json">` SEO blocks (VideoObject with the
 *      progressive `contentUrl` MP4, SocialMediaPosting/Recipe with the pin's
 *      own `image`).
 *   2. Pinterest's SSR "relay completed request" scripts, which register the
 *      `v3GetPinQueryv2` response (renditions + cover) as an inline JSON object
 *      anchored to the pin's `entityId`.
 *
 * Resolution therefore needs no browser, no cookies and no login: one bounded
 * HTTP GET, parsed locally. Raw-HTML regex scanning is deliberately NOT used to
 * discover media — a site-wide CSS/sprite blob matches `i.pinimg.com/originals`
 * on every page and would fabricate a wrong URL.
 */

/** Per-attempt upstream timeout for the pin page + its media verification. */
const FETCH_TIMEOUT_MS = readPositiveInt("PINTEREST_FETCH_TIMEOUT_MS", 8_000);
/**
 * Total time budget across all page-fetch attempts. Without this, three slow
 * attempts could occupy 3× the per-attempt timeout and look like a hang.
 */
const FETCH_BUDGET_MS = readPositiveInt("PINTEREST_FETCH_BUDGET_MS", 12_000);
/** Hard ceiling on the buffered HTML (real pin pages are ~1.5 MB of markup). */
const MAX_HTML_BYTES = 8 * 1024 * 1024;
const MAX_REDIRECTS = 5;
/** 1 attempt + 2 bounded retries for transient failures only. */
const MAX_ATTEMPTS = 3;
const RETRY_BASE_MS = 400;
const RETRY_CAP_MS = 4_000;
/** How many leading candidates a single content-type probe may reject. */
const VERIFY_LIMIT = 3;
const MAX_DESCRIPTION_LEN = 200;
const RELAY_SCAN_WINDOW = 400_000;

const PIN_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const PIN_HEADERS: Record<string, string> = {
  "user-agent": PIN_UA,
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9",
  "cache-control": "no-cache",
  pragma: "no-cache",
};

export interface ExtractedPinPayload {
  videos: MediaItem[];
  images: MediaItem[];
  /**
   * Progressive MP4s derived from an HLS-only rendition. They are unverified
   * and are only used when the normal video candidates fail verification.
   */
  fallbackVideos: MediaItem[];
  thumbnail: string | null;
  title: string | null;
  author: Author | null;
  /** True when the payload explicitly describes a deleted/missing pin. */
  notFound: boolean;
}

interface RawImageSize {
  url?: unknown;
  width?: unknown;
  height?: unknown;
}

interface RawVideoRendition {
  url?: unknown;
  width?: unknown;
  height?: unknown;
  duration?: unknown;
  contentType?: unknown;
}

export type PinterestExpected = "video" | "image" | "any";

function emptyExtraction(): ExtractedPinPayload {
  return {
    videos: [],
    images: [],
    fallbackVideos: [],
    thumbnail: null,
    title: null,
    author: null,
    notFound: false,
  };
}

function safePinimgUrl(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 8192) return null;
  const decoded = raw.includes("&amp;") ? raw.split("&amp;").join("&") : raw;
  const validation = validateProxyUrl(decoded);
  return validation.ok ? validation.value.url : null;
}

function toNumber(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Pinterest reports some durations in milliseconds (relay `video_list`) and
 * others as ISO-8601 seconds (`ld+json`). Normalize the millisecond form so a
 * 7.2 s video never renders as 7200.
 */
function normalizeDuration(value: unknown): number | null {
  const n = toNumber(value);
  if (n === null) return null;
  return n >= 1000 ? Math.round((n / 1000) * 10) / 10 : n;
}

function parseIsoDuration(value: unknown): number | null {
  if (typeof value === "number") return normalizeDuration(value);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  const m = /^P(?:(\d+(?:\.\d+)?)D)?T?(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?$/i.exec(trimmed);
  if (!m || trimmed.toUpperCase() === "P") {
    const n = Number(trimmed);
    return Number.isFinite(n) ? normalizeDuration(n) : null;
  }
  const total =
    Number(m[1] ?? 0) * 86_400 +
    Number(m[2] ?? 0) * 3_600 +
    Number(m[3] ?? 0) * 60 +
    Number(m[4] ?? 0);
  return total > 0 ? Math.round(total * 10) / 10 : null;
}

/** `"1080 px"` / `1080` / `"1080"` → 1080; invalid → null. */
function parsePx(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
  if (typeof value === "string") {
    const m = /(\d+)/.exec(value);
    if (m) {
      const n = Number(m[1]);
      return n > 0 ? n : null;
    }
  }
  return null;
}

function cleanTitle(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_DESCRIPTION_LEN);
}

function extensionOf(url: string, allowed: string[]): string | null {
  const match = /\.([a-z0-9]{2,4})(\?|$)/i.exec(url);
  if (!match) return null;
  const ext = match[1].toLowerCase();
  return allowed.includes(ext) ? ext : null;
}

function imageItem(url: string, width: number | null, height: number | null): MediaItem {
  return {
    url,
    type: "image",
    width: width || null,
    height: height || null,
    duration: null,
    thumbnail: null,
    format: extensionOf(url, ["jpg", "jpeg", "png", "webp", "gif"]) ?? "jpg",
    mimeType: null,
  };
}

function pickLargestImage(images: RawImageSize): { url: string; width: number; height: number } | null {
  let best: { url: string; width: number; height: number } | null = null;
  for (const size of Object.values(images)) {
    if (!size || typeof size !== "object") continue;
    const url = safePinimgUrl(size.url);
    if (!url) continue;
    const width = toNumber(size.width) ?? 0;
    const height = toNumber(size.height) ?? 0;
    if (!best || width > best.width || (width === best.width && height > best.height)) {
      best = { url, width, height };
    }
  }
  return best;
}

function smallestImage(images: RawImageSize): string | null {
  let best: { url: string; width: number } | null = null;
  for (const size of Object.values(images)) {
    if (!size || typeof size !== "object") continue;
    const url = safePinimgUrl(size.url);
    if (!url) continue;
    const width = toNumber(size.width) ?? Number.MAX_SAFE_INTEGER;
    if (!best || width < best.width) best = { url, width };
  }
  return best?.url ?? null;
}

/**
 * Video metadata is not always nested under `videos`. Pinterest has used
 * `video_list`, `videoList`, `videoUrls`, direct `video_url`/`videoUrl`, and —
 * on story/carousel blocks — `videoDataV2` maps such as `videoList720P`,
 * `videoListMobile`, `v_hlsv4_video_list`, etc. Match all of those spellings
 * (including quality-suffixed variants) while ignoring unrelated fields like
 * `videoStatus` or `videoId`.
 */
const VIDEO_FIELD_RE =
  /^(?:videos?|video(?:List|Url|Urls|Version|Versions|Data|Rendition|Renditions|Extension|Extensions|Format|Formats|Source|Sources)\w*|videos(?:List|Url|Urls|Version|Versions|Data|Rendition|Renditions|Extension|Extensions|Format|Formats|Source|Sources)\w*|video_(?:list|urls?|versions?|data|renditions?|extensions?|formats?|sources?)\w*|videos_(?:list|urls?|versions?|data|extensions?|formats?)\w*|v_hls\w*|renditions?|playlists?)$/i;

/**
 * Metadata stored beside a rendition URL. These are never additional video
 * resources, so the flattening walk does not descend into them (a thumbnail
 * must not become a second "video" candidate).
 */
const NON_VIDEO_PROP_RE =
  /^(?:url|thumbnail|thumbnails|thumb|poster|preview|previewImage|cover|coverImage|image|images|imageUrl|avatar|pinner|author|board|music|audio|captions?|captionsUrls|contentType|mimeType|duration|width|height|size|format|__typename|id|name|title|description|text|seo\w*)$/i;

function isVideoFieldKey(key: string): boolean {
  return VIDEO_FIELD_RE.test(key);
}

/**
 * Flatten every video rendition found on a payload or entity.
 *
 * Supported shapes include the classic `videos.video_list`, the multi-video
 * `videos_extension[].video_list`, the modern v3 `videos.videoList` map and
 * `videos.videoUrls` array, top-level/direct `video_list`, `videoList`,
 * `video_url`, `videoUrl`, or `video` fields, and story/carousel
 * `videoDataV2` quality maps. Arrays of video entities are traversed too.
 * Only URLs are deduplicated; a richer rendition object wins over a bare URL
 * string regardless of field order.
 */
export function collectVideoRenditions(payload: Record<string, any>): RawVideoRendition[] {
  const out: RawVideoRendition[] = [];
  const indexByUrl = new Map<string, number>();

  const richness = (r: RawVideoRendition): number => {
    let score = 0;
    if (r.width !== undefined && r.width !== null) score++;
    if (r.height !== undefined && r.height !== null) score++;
    if (r.duration !== undefined && r.duration !== null) score++;
    if (typeof r.contentType === "string" && r.contentType.length > 0) score++;
    return score;
  };
  const add = (rendition: RawVideoRendition): void => {
    if (typeof rendition.url !== "string" || !/^https?:\/\//i.test(rendition.url)) return;
    const existing = indexByUrl.get(rendition.url);
    if (existing === undefined) {
      indexByUrl.set(rendition.url, out.length);
      out.push(rendition);
      return;
    }
    // A bare URL can be seen before the richer rendition object. Keep the
    // richer metadata regardless of field order.
    if (richness(rendition) > richness(out[existing])) out[existing] = rendition;
  };

  /**
   * Once inside a recognized video field every descendant is a candidate
   * rendition or a map keyed by quality name (v720P, vHLSV3MOBILE, ...).
   * Metadata keys are skipped so a poster URL is never collected as a video.
   */
  const visitVideoValue = (value: unknown, depth: number): void => {
    if (value === null || value === undefined || depth > 8) return;
    if (typeof value === "string") {
      add({ url: value });
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) visitVideoValue(item, depth + 1);
      return;
    }
    if (typeof value !== "object") return;

    const entity = value as Record<string, any>;
    if (typeof entity.url === "string") add(entity as RawVideoRendition);
    for (const [key, child] of Object.entries(entity)) {
      if (NON_VIDEO_PROP_RE.test(key)) continue;
      visitVideoValue(child, depth + 1);
    }
  };

  for (const [key, value] of Object.entries(payload)) {
    if (isVideoFieldKey(key)) visitVideoValue(value, 0);
  }
  return out;
}

/** HEVC/H.265 renditions play in few browsers — used only as a last resort. */
const HEVC_RE = /hevc|h265/i;

const IMAGE_EXTENSION_RE = /\.(jpe?g|png|webp|gif|avif|bmp|svg|ico)(?:$|\/)/i;
const MANIFEST_EXTENSION_RE = /\.(m3u8|mpd|m4s|ts)(?:$|\/)/i;

function urlPath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url.replace(/[?#].*$/, "");
  }
}

function isMp4Rendition(r: RawVideoRendition): boolean {
  const url = typeof r.url === "string" ? r.url.trim() : "";
  if (!url) return false;
  const ct = typeof r.contentType === "string" ? r.contentType.toLowerCase() : "";
  const path = urlPath(url).toLowerCase();

  // A poster/thumbnail is never a video, even when a payload incorrectly
  // lists it beside MP4 renditions. Reject image MIME types and image paths
  // before any positive video check.
  if (ct.startsWith("image/") || /(?:jpeg|png|webp|gif|avif)/.test(ct)) return false;
  if (IMAGE_EXTENSION_RE.test(path) || /\/thumbnails?\//.test(path)) return false;
  // Manifests are not downloadable files. Their segments must never be
  // returned as the video either.
  if (ct.includes("m3u8") || ct.includes("dash") || ct.includes("json")) return false;
  if (MANIFEST_EXTENSION_RE.test(path)) return false;
  if (ct.includes("mp4")) return true;
  if (/\.mp4$/i.test(path)) return true;
  // Legacy Pinterest progressive renditions (v_360p/v_720p) usually have no
  // extension. Accept them only on a real video route; an extensionless image
  // URL must not become a fake video.
  if (/hls|dash|h265/i.test(url)) return false;
  return /\/videos?\//i.test(path);
}

/**
 * The modern v3 pin object carries images as flat `images_<size>` props
 * (`images_orig`, `images_736x`, …) whose values are `{url, width, height}`
 * (or a bare URL string). Normalize them into the map shape the picker uses.
 */
function flatImageMap(payload: Record<string, any>): Record<string, RawImageSize> {
  const out: Record<string, RawImageSize> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (!/^images?_\w+/i.test(key)) continue;
    if (typeof value === "string") {
      out[key] = { url: value, ...dimsFromKey(key) };
    } else if (value && typeof value === "object") {
      const entry = value as RawImageSize;
      if (typeof entry.url !== "string") continue;
      const dims = dimsFromKey(key);
      out[key] = {
        url: entry.url,
        width: toNumber(entry.width) ?? dims.width,
        height: toNumber(entry.height) ?? dims.height,
      };
    }
  }
  return out;
}

/** `images_orig` → very large; `images_736x` → 736; `images_600x315` → 600×315. */
function dimsFromKey(key: string): { width: number | null; height: number | null } {
  if (/_orig$/i.test(key)) return { width: Number.MAX_SAFE_INTEGER, height: Number.MAX_SAFE_INTEGER };
  const m = /_(\d+)x(\d*)/.exec(key);
  if (!m) return { width: null, height: null };
  return { width: Number(m[1]), height: m[2] ? Number(m[2]) : null };
}

/** Largest image carried directly or nested on a carousel slide / story block. */
function imageFromEntity(entity: Record<string, any>): { url: string; width: number; height: number } | null {
  const direct = safePinimgUrl(entity.url);
  if (direct) {
    return {
      url: direct,
      width: toNumber(entity.width) ?? 0,
      height: toNumber(entity.height) ?? 0,
    };
  }
  const map: RawImageSize = {
    ...flatImageMap(entity),
    ...(entity.images && typeof entity.images === "object" && !Array.isArray(entity.images)
      ? (entity.images as RawImageSize)
      : {}),
  };
  const fromMap = pickLargestImage(map);
  if (fromMap) return fromMap;
  for (const key of ["image", "media", "cover"]) {
    const inner = entity[key];
    if (inner && typeof inner === "object" && !Array.isArray(inner)) {
      const found = imageFromEntity(inner as Record<string, any>);
      if (found) return found;
    }
  }
  return null;
}

/** Progressive MP4s carried directly or nested on a carousel slide / story block. */
function videosFromEntity(entity: Record<string, any>, thumbnail: string | null): MediaItem[] {
  const out: MediaItem[] = [];
  const push = (url: unknown, width: unknown, height: unknown, duration: unknown, contentType?: unknown): void => {
    const safe = safePinimgUrl(url);
    if (!safe || out.some((item) => item.url === safe)) return;
    if (!isMp4Rendition({ url: safe, contentType })) return;
    out.push({
      url: safe,
      type: "video",
      width: toNumber(width),
      height: toNumber(height),
      duration: normalizeDuration(duration),
      thumbnail,
      format: "mp4",
      mimeType: "video/mp4",
    });
  };
  // The entity itself may carry `videos`, a top-level `video_list`/`videoList`,
  // direct video URL fields (snake_case and camelCase), or — on story/carousel
  // slides — nested block objects such as `videoDataV2`.
  const sources: Record<string, any>[] = [entity];
  if (Array.isArray(entity.blocks)) {
    for (const block of entity.blocks) {
      if (block && typeof block === "object") sources.push(block as Record<string, any>);
    }
  }
  for (const source of sources) {
    for (const rendition of collectVideoRenditions(source)) {
      push(rendition.url, rendition.width, rendition.height, rendition.duration, rendition.contentType);
    }
  }
  push(entity.video_url ?? entity.videoUrl, entity.video_width ?? entity.videoWidth, entity.video_height ?? entity.videoHeight, entity.duration);
  if (typeof entity.video === "string") {
    push(entity.video, entity.video_width ?? entity.videoWidth, entity.video_height ?? entity.videoHeight, entity.duration);
  } else if (entity.video && typeof entity.video === "object" && !Array.isArray(entity.video)) {
    const video = entity.video as Record<string, any>;
    push(video.url ?? video.video_url ?? video.videoUrl, video.width, video.height, video.duration);
  }
  return out;
}

/** Slides of a modern `carouselData` pin (camelCase relay payload). */
function carouselEntities(payload: Record<string, any>): Record<string, any>[] {
  const data = payload.carouselData ?? payload.carousel_data;
  if (!data) return [];
  const list = Array.isArray(data) ? data : data.slides ?? data.cards ?? data.items ?? data.pages;
  if (!Array.isArray(list)) return [];
  return list.filter((item): item is Record<string, any> => Boolean(item) && typeof item === "object");
}

/**
 * Pinterest's modern `videos` object can carry only an HLS manifest while the
 * same asset is also exposed as a progressive `expMp4` sibling. When the
 * LD+JSON VideoObject is absent, derive that sibling from the manifest path
 * (and its declared width) so Auto Detect still has a video candidate. The
 * derived URL is never trusted on its own: the normal HEAD/Range verification
 * step drops it when it is missing or serves a non-video response.
 */
const IHT_HLS_RE = /\/videos\/iht\/hls\/((?:[0-9a-f]{2}\/){3})([0-9a-f]{32})\.m3u8$/i;

function expMp4FromHls(rawUrl: unknown, width: unknown): string | null {
  const url = safePinimgUrl(rawUrl);
  const w = toNumber(width);
  if (!url || !w) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const match = IHT_HLS_RE.exec(parsed.pathname);
  if (!match) return null;
  return `${parsed.origin}/videos/iht/expMp4/${match[1]}${match[2]}_${Math.round(w)}w.mp4`;
}

/**
 * Collect progressive siblings for HLS-only relay/LD metadata. This runs at
 * the HTML-composition layer because LD+JSON and the relay are both needed;
 * `extractPinMedia` itself stays a pure, non-speculative mapper.
 */
export function deriveExpMp4Videos(
  relay: Record<string, any> | null,
  blocks: Record<string, any>[],
  thumbnail: string | null,
  existing: Set<string> = new Set()
): MediaItem[] {
  const out: MediaItem[] = [];
  const seen = new Set(existing);

  const add = (rawUrl: unknown, width: unknown, height: unknown, duration: unknown): void => {
    const url = expMp4FromHls(rawUrl, width);
    if (!url || seen.has(url)) return;
    seen.add(url);
    out.push({
      url,
      type: "video",
      width: toNumber(width),
      height: toNumber(height),
      duration: normalizeDuration(duration),
      thumbnail,
      format: "mp4",
      mimeType: "video/mp4",
    });
  };

  const addEntity = (entity: Record<string, any>): void => {
    const sources: Record<string, any>[] = [entity];
    if (Array.isArray(entity.blocks)) {
      for (const block of entity.blocks) {
        if (block && typeof block === "object") sources.push(block as Record<string, any>);
      }
    }
    for (const source of sources) {
      for (const rendition of collectVideoRenditions(source)) {
        add(rendition.url, rendition.width, rendition.height, rendition.duration);
      }
    }
  };

  if (relay) {
    for (const rendition of collectVideoRenditions(relay)) {
      add(rendition.url, rendition.width, rendition.height, rendition.duration);
    }
    for (const entity of carouselEntities(relay)) addEntity(entity);
    const storyData = relay.story_pin_data ?? relay.storyPinData;
    const pages = Array.isArray(storyData?.pages) ? storyData.pages : [];
    for (const page of pages) {
      if (page && typeof page === "object") addEntity(page as Record<string, any>);
    }
  }

  // LD+JSON normally points at the MP4 directly; handle variants that expose
  // an HLS `contentUrl` alongside width/height instead.
  for (const block of blocks) {
    if (!block || typeof block !== "object") continue;
    for (const source of collectLdVideoSources(block)) {
      add(source.url, source.width, source.height, source.duration);
    }
  }

  out.sort((a, b) => (b.height ?? 0) - (a.height ?? 0) || (b.width ?? 0) - (a.width ?? 0));
  return out;
}

/**
 * Pure extraction: map one legacy/relay pin payload to normalized media items.
 * Every URL passes the shared CDN/SSRF allowlist before it is returned —
 * a payload that points anywhere else is silently dropped, never trusted.
 */
export function extractPinMedia(payload: Record<string, any>): ExtractedPinPayload {
  const media: MediaItem[] = [];
  const images: MediaItem[] = [];
  let thumbnail: string | null = null;
  let notFound = false;

  if (!payload || typeof payload !== "object") return emptyExtraction();

  if (payload.error || payload.errorCode) notFound = true;

  const rawImages: RawImageSize = {
    ...flatImageMap(payload),
    ...((payload.images ?? {}) as RawImageSize),
  };
  const largest = pickLargestImage(rawImages);
  thumbnail = smallestImage(rawImages) ?? largest?.url ?? null;

  if (largest) {
    images.push(imageItem(largest.url, largest.width, largest.height));
  }

  // Multi-image pins: each aggregated child carries its own images map.
  const aggregated = payload.aggregated_pin_data ?? payload.aggregatedPinData;
  const aggregatedPins = Array.isArray(aggregated?.aggregated_pins)
    ? aggregated.aggregated_pins
    : Array.isArray(aggregated?.aggregatedPins)
      ? aggregated.aggregatedPins
      : Array.isArray(aggregated?.pins)
        ? aggregated.pins
        : [];
  for (const child of aggregatedPins) {
    if (!child || typeof child !== "object") continue;
    const childLargest = imageFromEntity(child as Record<string, any>);
    if (!childLargest) continue;
    if (images.some((m) => imageIdentity(m.url) === imageIdentity(childLargest.url))) continue;
    images.push(imageItem(childLargest.url, childLargest.width, childLargest.height));
  }

  // Modern carousel pins carry their slides under `carouselData` (camelCase).
  for (const entity of carouselEntities(payload)) {
    const found = imageFromEntity(entity);
    if (found && !images.some((m) => imageIdentity(m.url) === imageIdentity(found.url))) {
      images.push(imageItem(found.url, found.width, found.height));
    }
    for (const video of videosFromEntity(entity, thumbnail)) {
      if (!media.some((m) => m.url === video.url)) media.push(video);
    }
  }

  // Story pins: per-page image or video (snake_case and camelCase relay keys).
  const storyData = payload.story_pin_data ?? payload.storyPinData;
  const storyPages = Array.isArray(storyData?.pages) ? storyData.pages : [];
  for (const page of storyPages) {
    if (!page || typeof page !== "object") continue;
    const p = page as Record<string, any>;
    const pageVideos = videosFromEntity(p, thumbnail);
    const entities: Record<string, any>[] = [
      p,
      ...(Array.isArray(p.blocks)
        ? p.blocks.filter((block: unknown): block is Record<string, any> => Boolean(block) && typeof block === "object")
        : []),
    ];
    for (const entity of entities) {
      const videos = entity === p ? pageVideos : videosFromEntity(entity, thumbnail);
      for (const video of videos) {
        if (!media.some((m) => m.url === video.url)) media.push(video);
      }
    }
    // A video page's still is a cover, not an image slide.
    if (pageVideos.length > 0) continue;
    // Story pages carry a single image OBJECT {url,width,height}, not a
    // size map keyed by rendition name.
    const found = imageFromEntity(p);
    if (found && !images.some((m) => imageIdentity(m.url) === imageIdentity(found.url))) {
      images.push(imageItem(found.url, found.width, found.height));
    }
  }

  // Progressive MP4 renditions, highest quality first. HLS/DASH-only pins
  // yield no downloadable mp4 — reported honestly as no-video, never a fake.
  const rootVideoWidth = toNumber(payload.video_width ?? payload.videoWidth);
  const rootVideoHeight = toNumber(payload.video_height ?? payload.videoHeight);
  const rootDuration = normalizeDuration(payload.video_duration ?? payload.videoDuration ?? payload.duration);
  const renditions = collectVideoRenditions(payload)
    .filter(isMp4Rendition)
    .map((r) => ({
      url: safePinimgUrl(r.url),
      width: toNumber(r.width) ?? rootVideoWidth,
      height: toNumber(r.height) ?? rootVideoHeight,
      duration: normalizeDuration(r.duration) ?? rootDuration,
    }))
    .filter(
      (r): r is { url: string; width: number | null; height: number | null; duration: number | null } =>
        typeof r.url === "string"
    );
  renditions.sort((a, b) => (b.height ?? 0) - (a.height ?? 0) || (b.width ?? 0) - (a.width ?? 0));
  // Prefer browser-universal H.264; only fall back to HEVC/H.265 renditions
  // (and Pinterest's `_tN` HEVC preview clips) when no H.264 MP4 exists.
  const progressive = renditions.some((r) => !HEVC_RE.test(r.url))
    ? renditions.filter((r) => !HEVC_RE.test(r.url))
    : renditions;
  for (const r of progressive) {
    if (media.some((m) => m.url === r.url)) continue;
    media.push({
      url: r.url,
      type: "video",
      width: r.width,
      height: r.height,
      duration: r.duration,
      thumbnail: thumbnail,
      format: "mp4",
      mimeType: "video/mp4",
    });
  }

  const authorRaw = payload.pinner ?? payload.native_creator ?? payload.nativeCreator ?? null;
  const author: Author | null =
    authorRaw && typeof authorRaw === "object"
      ? {
          username: typeof authorRaw.username === "string" ? authorRaw.username.slice(0, 64) : null,
          displayName:
            typeof authorRaw.full_name === "string"
              ? authorRaw.full_name.slice(0, 80)
              : typeof authorRaw.full_name === "object" && authorRaw.full_name !== null
                ? String((authorRaw.full_name as { text?: unknown }).text ?? "").slice(0, 80) || null
                : null,
        }
      : null;

  return {
    videos: media,
    images,
    fallbackVideos: [],
    thumbnail,
    title:
      cleanTitle(payload.grid_title) ??
      cleanTitle(payload.gridTitle) ??
      cleanTitle(payload.title) ??
      cleanTitle(payload.seoTitle) ??
      cleanTitle(payload.description),
    author,
    notFound,
  };
}

/** Parse every `<script type="application/ld+json">` block; bad blocks are skipped. */
export function parseLdJsonBlocks(html: string): Record<string, any>[] {
  const out: Record<string, any>[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const push = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    const block = value as Record<string, any>;
    // `@graph` wraps the interesting entities in an array; the wrapper itself
    // carries no media, so flatten it instead of losing the pin data.
    if (Array.isArray(block["@graph"])) {
      for (const item of block["@graph"]) push(item);
      return;
    }
    out.push(block);
  };
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const item of parsed) push(item);
      } else {
        push(parsed);
      }
    } catch {
      /* one malformed block must never break extraction */
    }
  }
  return out;
}

export interface OgMeta {
  image: string | null;
  video: string | null;
  title: string | null;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#38;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** Open-graph fallbacks, used only when structured data is missing. */
export function parseOgMeta(html: string): OgMeta {
  const get = (prop: string): string | null => {
    const forward = new RegExp(
      `<meta[^>]+(?:property|name)=["']${prop}["'][^>]*\\bcontent=["']([^"']+)["']`,
      "i"
    );
    const f = forward.exec(html);
    if (f) return decodeEntities(f[1]);
    const reverse = new RegExp(
      `<meta[^>]+\\bcontent=["']([^"']+)["'][^>]*(?:property|name)=["']${prop}["']`,
      "i"
    );
    const r = reverse.exec(html);
    return r ? decodeEntities(r[1]) : null;
  };
  return {
    image: get("og:image") ?? get("twitter:image"),
    video: get("og:video:secure_url") ?? get("og:video:url") ?? get("og:video"),
    title: get("og:title") ?? get("twitter:title"),
  };
}

/** Scan from a `{` to its matching `}` while respecting JSON strings. */
function sliceBalancedJson(text: string, start: number): string | null {
  if (text[start] !== "{") return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function tryParseJson(text: string): Record<string, any> | null {
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, any>) : null;
  } catch {
    return null;
  }
}

/**
 * Extract the pin's SSR payload from Pinterest's relay registration scripts
 * (`window.__PWS_RELAY_REGISTER_COMPLETED_REQUEST__(... )`), anchored to the
 * requested pin's `entityId` so a recommended/related pin is never returned.
 */
const RELAY_MEDIA_KEYS = new Set([
  "images",
  "videos",
  "images_orig",
  "carouselData",
  "carousel_data",
  "storyPinData",
  "story_pin_data",
  "aggregatedPinData",
  "aggregated_pin_data",
  "video_list",
  "videoList",
  "videoUrls",
  "video_urls",
  "video_url",
  "videoUrl",
  "video",
]);

/** True when the parsed object itself carries the pin's media fields. */
function hasRelayMediaFields(value: Record<string, any>): boolean {
  return Object.keys(value).some((key) => RELAY_MEDIA_KEYS.has(key) || isVideoFieldKey(key));
}

export function extractRelayPinPayload(html: string, pinId: string | null): Record<string, any> | null {
  if (!pinId) return null;
  const marker = "__PWS_RELAY_REGISTER_COMPLETED_REQUEST__(";
  // Pinterest emits compact JSON, but accept whitespace and unquoted ids too
  // so a serializer change does not silently disable relay extraction.
  const escapedId = pinId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const needleRe = new RegExp(`"entityId"\\s*:\\s*"?${escapedId}"?(?=\\s*[,}])`);
  let searchFrom = 0;
  while (true) {
    const idx = html.indexOf(marker, searchFrom);
    if (idx === -1) return null;
    searchFrom = idx + marker.length;
    const segment = html.slice(idx + marker.length, Math.min(html.length, idx + marker.length + RELAY_SCAN_WINDOW));
    const match = needleRe.exec(segment);
    const at = match ? match.index : -1;
    if (at === -1) continue;
    let brace = segment.lastIndexOf("{", at);
    while (brace !== -1) {
      const slice = sliceBalancedJson(segment, brace);
      if (slice && brace + slice.length > at) {
        const parsed = tryParseJson(slice);
        if (parsed && hasRelayMediaFields(parsed)) {
          return parsed;
        }
      }
      brace = segment.lastIndexOf("{", brace - 1);
    }
  }
}

interface LdJsonMedia {
  videos: MediaItem[];
  images: MediaItem[];
  thumbnail: string | null;
  title: string | null;
  author: Author | null;
}

function collectImageUrls(value: unknown, out: string[]): void {
  if (typeof value === "string") {
    out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectImageUrls(item, out);
    return;
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.url === "string") out.push(obj.url);
  }
}

function authorFromLd(raw: unknown): Author | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, any>;
  const displayName = typeof obj.name === "string" ? obj.name.slice(0, 80) : null;
  const url = typeof obj.url === "string" ? obj.url : typeof obj["@id"] === "string" ? obj["@id"] : null;
  let username: string | null = null;
  if (url) {
    const m = /\/([A-Za-z0-9_.-]{2,64})\/?$/.exec(url);
    if (m) username = m[1];
  }
  if (!displayName && !username) return null;
  return { username, displayName };
}

/**
 * Site-scaffolding structured-data types that appear on EVERY Pinterest page
 * (nav, search, publisher metadata). Ignoring them keeps a non-pin page — e.g.
 * an unexpanded short link that lands on the home page — from contributing a
 * logo/promo image as if it were the pin's media.
 */
const SITE_LD_TYPE_RE =
  /^(Organization|WebSite|WebPage|BreadcrumbList|SiteNavigationElement|ItemList|CollectionPage|SearchAction|Person|Corporation|LocalBusiness)$/i;

function ldTypeOf(block: Record<string, any>): string {
  const type = block["@type"];
  return Array.isArray(type) ? type.join(",") : typeof type === "string" ? type : "";
}

/** A block is pin content unless it declares a known site-scaffolding type. */
function isPinLdBlock(block: Record<string, any>): boolean {
  const type = ldTypeOf(block);
  return type === "" || !SITE_LD_TYPE_RE.test(type);
}

interface LdVideoSource {
  url: string;
  contentType: unknown;
  width: unknown;
  height: unknown;
  duration: unknown;
  thumbnail: unknown;
}

/**
 * VideoObject content is normally `contentUrl`, but some Pinterest variants
 * nest it under `video`/`media` or use `videoUrl`/`video_url`. Only explicit
 * video/media properties are followed — a generic `url` on the outer
 * SocialMediaPosting block is the pin page, not a media file.
 */
function collectLdVideoSources(block: Record<string, any>): LdVideoSource[] {
  const out: LdVideoSource[] = [];
  const seen = new Set<string>();
  const add = (rawUrl: unknown, source: Record<string, any>): void => {
    const url = safePinimgUrl(rawUrl);
    if (!url || seen.has(url)) return;
    seen.add(url);
    out.push({
      url,
      contentType: source.contentType ?? block.contentType,
      width: source.width ?? block.width,
      height: source.height ?? block.height,
      duration: source.duration ?? block.duration,
      thumbnail: source.thumbnailUrl ?? block.thumbnailUrl,
    });
  };
  const walk = (value: unknown, depth: number): void => {
    if (value === null || value === undefined || depth > 3) return;
    if (typeof value === "string") {
      add(value, {});
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) walk(item, depth + 1);
      return;
    }
    if (typeof value !== "object") return;
    const obj = value as Record<string, any>;
    add(obj.contentUrl, obj);
    add(obj.videoUrl, obj);
    add(obj.video_url, obj);
    // Nested media objects may use a plain `url`; the outer block's own
    // `url` is deliberately not considered a media candidate.
    if (depth > 0) add(obj.url, obj);
    for (const key of ["video", "media", "encoding"]) walk(obj[key], depth + 1);
  };

  add(block.contentUrl, block);
  add(block.videoUrl, block);
  add(block.video_url, block);
  for (const key of ["video", "media", "encoding"]) walk(block[key], 1);
  return out;
}

function extractLdJsonMedia(blocks: Record<string, any>[]): LdJsonMedia {
  const videos: MediaItem[] = [];
  const images: MediaItem[] = [];
  let thumbnail: string | null = null;
  let title: string | null = null;
  let author: Author | null = null;

  for (const block of blocks) {
    if (!block || typeof block !== "object") continue;
    if (!isPinLdBlock(block)) continue;
    title ??= cleanTitle(block.name) ?? cleanTitle(block.headline);
    author ??= authorFromLd(block.author) ?? authorFromLd(block.creator);

    const thumb = safePinimgUrl(block.thumbnailUrl);
    if (thumb && !thumbnail) thumbnail = thumb;
    // Only progressive MP4s are usable. An HLS/DASH manifest (or any
    // extension-less non-mp4) is NOT a downloadable file; returning it would
    // mount a manifest into <video> and surface "Preview unavailable" for a
    // pin that does have a real MP4 rendition elsewhere in the payload. Apply
    // the same rendition filter the relay path already uses.
    for (const source of collectLdVideoSources(block)) {
      if (!isMp4Rendition({ url: source.url, contentType: source.contentType })) continue;
      const videoThumb = safePinimgUrl(source.thumbnail) ?? thumb;
      if (videoThumb && !thumbnail) thumbnail = videoThumb;
      if (videos.some((item) => item.url === source.url)) continue;
      videos.push({
        url: source.url,
        type: "video",
        width: parsePx(source.width),
        height: parsePx(source.height),
        duration: parseIsoDuration(source.duration),
        thumbnail: videoThumb,
        format: "mp4",
        mimeType: "video/mp4",
      });
    }

    const rawImages: string[] = [];
    collectImageUrls(block.image, rawImages);
    for (const candidate of rawImages) {
      const url = safePinimgUrl(candidate);
      if (!url || images.some((m) => m.url === url)) continue;
      images.push(imageItem(url, parsePx(block.width), parsePx(block.height)));
    }
  }

  return { videos, images, thumbnail, title, author };
}

/**
 * Pinterest serves one image at many sizes under `/originals`, `/736x`,
 * `/564x`… and in more than one container format (`.jpg`, `.webp`). Identity is
 * the path after that size segment with the extension removed, so the same
 * photo is never returned twice at two different sizes or formats.
 */
function imageIdentity(url: string): string {
  const bare = url.replace(/[?#].*$/, "");
  return bare
    .replace(/^(https?:\/\/i\.pinimg\.com)\/(?:originals|\d+x\d*)\//i, "$1/")
    .replace(/\.[a-z0-9]{2,4}$/i, "");
}

/** Full-size `originals` wins; otherwise the widest rendition. */
function imageScore(item: MediaItem): number {
  if (/\/originals\//i.test(item.url)) return Number.MAX_SAFE_INTEGER;
  return item.width ?? 0;
}

function bestImage(a: MediaItem, b: MediaItem): MediaItem {
  return imageScore(b) > imageScore(a) ? b : a;
}

function dedupeVideos(list: MediaItem[]): MediaItem[] {
  const seen = new Set<string>();
  const out: MediaItem[] = [];
  for (const item of list) {
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    out.push(item);
  }
  out.sort((a, b) => (b.height ?? 0) - (a.height ?? 0) || (b.width ?? 0) - (a.width ?? 0));
  return out;
}

/**
 * Compose an honest payload from the pin page's structured data only:
 * ld+json (authoritative for the target pin) + the entityId-anchored relay
 * payload (extra renditions/cover) + open-graph as a last-resort image.
 * `aggregated*` recommendation feeds are intentionally ignored here.
 */
export function extractPinMediaFromHtml(
  html: string,
  pinId: string | null,
  precomputedBlocks?: Record<string, any>[]
): ExtractedPinPayload {
  const blocks = precomputedBlocks ?? parseLdJsonBlocks(html);
  const fromLd = extractLdJsonMedia(blocks);
  const relay = extractRelayPinPayload(html, pinId);
  const fromRelay = relay ? extractPinMedia(relay) : emptyExtraction();
  const og = parseOgMeta(html);

  const videos = dedupeVideos([...fromLd.videos, ...fromRelay.videos]);

  const byIdentity = new Map<string, MediaItem>();
  for (const item of [...fromLd.images, ...fromRelay.images]) {
    const key = imageIdentity(item.url);
    const existing = byIdentity.get(key);
    byIdentity.set(key, existing ? bestImage(existing, item) : item);
  }
  const images: MediaItem[] = [...byIdentity.values()];

  let thumbnail = fromLd.thumbnail ?? fromRelay.thumbnail;
  if (images.length === 0) {
    const ogImage = safePinimgUrl(og.image);
    if (ogImage) images.push(imageItem(ogImage, null, null));
    else if (thumbnail) images.push(imageItem(thumbnail, null, null));
  }
  if (!thumbnail && images.length > 0) thumbnail = images[0].url;

  const fallbackVideos = deriveExpMp4Videos(
    relay,
    blocks,
    thumbnail,
    new Set(videos.map((video) => video.url))
  );

  return {
    videos,
    images,
    fallbackVideos,
    thumbnail,
    title: fromLd.title ?? fromRelay.title ?? cleanTitle(og.title),
    author: fromLd.author ?? fromRelay.author,
    notFound: fromRelay.notFound,
  };
}

/** Body-level markers Pinterest serves for deleted / private / blocked pins. */
const NOT_FOUND_RE = /couldn'?t find this pin|pin not found|this pin is not available|sorry!?\s*we couldn/i;
const RESTRICTED_RE = /log in to continue|sign up to (continue|see)|create (a )?free account|age-restricted|not available in your (country|region)/i;

export function classifyPinPageText(text: string): "not-found" | "restricted" | null {
  if (NOT_FOUND_RE.test(text)) return "not-found";
  if (RESTRICTED_RE.test(text)) return "restricted";
  return null;
}

/** Any Pinterest page host plus its short-link domain — nothing else. */
function isAllowedPinHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return isPinterestPageHost(h) || h === "pin.it" || h === "www.pin.it";
}

function pinIdFromUrl(url: string | null): string | null {
  if (!url) return null;
  const m = /\/pin\/(\d{5,25})(?:\/|$)/.exec(url);
  return m ? m[1] : null;
}

function parseRetryAfter(raw: string | null): number | null {
  if (!raw) return null;
  const seconds = Number(raw.trim());
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, RETRY_CAP_MS);
  const date = Date.parse(raw);
  if (Number.isFinite(date)) return Math.min(Math.max(date - Date.now(), 0), RETRY_CAP_MS);
  return null;
}

function backoffMs(attempt: number): number {
  const base = Math.min(RETRY_BASE_MS * 2 ** (attempt - 1), RETRY_CAP_MS);
  return base + Math.floor(Math.random() * 150);
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(finish, ms);
    timer.unref?.();
    function finish(): void {
      clearTimeout(timer);
      signal?.removeEventListener("abort", finish);
      resolve();
    }
    signal?.addEventListener("abort", finish, { once: true });
  });
}

interface HopResult {
  status: number;
  finalUrl: string;
  res: Response;
}

function drainBody(res: Response): void {
  try {
    void res.body?.cancel().catch(() => {});
  } catch {
    /* already consumed/closed */
  }
}

/** One navigation attempt, following redirects only across Pinterest hosts. */
async function fetchHops(url: string, signal: AbortSignal): Promise<HopResult> {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let res: Response;
    try {
      res = await fetch(current, { method: "GET", redirect: "manual", signal, headers: PIN_HEADERS });
    } catch (err) {
      if (signal.aborted) throw createError("SERVER_SHUTTING_DOWN");
      throw err;
    }
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      drainBody(res);
      if (!location) return { status: res.status, finalUrl: current, res };
      let next: string;
      try {
        next = new URL(location, current).href;
      } catch {
        throw createError("PINTEREST_UPSTREAM_ERROR");
      }
      if (!isAllowedPinHost(new URL(next).hostname)) {
        logger.warn("[PINTEREST] redirect left Pinterest", { host: new URL(next).hostname });
        throw createError("PINTEREST_PIN_RESTRICTED");
      }
      current = next;
      continue;
    }
    return { status: res.status, finalUrl: current, res };
  }
  throw createError("PINTEREST_UPSTREAM_ERROR");
}

async function readBodyCapped(res: Response, max: number): Promise<string> {
  const body = res.body;
  if (!body) return "";
  const reader = body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > max) {
        try {
          await reader.cancel();
        } catch {
          /* ignore */
        }
        break;
      }
      chunks.push(Buffer.from(value));
    }
  } catch {
    /* truncated / aborted mid-body: parse whatever was buffered */
  }
  return Buffer.concat(chunks).toString("utf8");
}

interface PinPage {
  status: number;
  finalUrl: string;
  body: string;
}

/**
 * Fetch the pin page over plain HTTP with a per-attempt timeout covering both
 * headers and body, bounded redirects across Pinterest hosts, and bounded
 * retries for transient failures only (network/timeout/429/5xx) — never for
 * invalid URLs or permanent denials (4xx). Aborts stop immediately.
 */
async function fetchPinPage(url: string, externalSignal: AbortSignal | undefined, requestId?: string): Promise<PinPage> {
  let lastKind: "timeout" | "network" | "http" = "network";
  let lastStatus: number | null = null;
  const deadline = Date.now() + FETCH_BUDGET_MS;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      lastKind = "timeout";
      break;
    }
    const controller = new AbortController();
    const onExternal = (): void => controller.abort();
    if (externalSignal?.aborted) controller.abort();
    externalSignal?.addEventListener("abort", onExternal, { once: true });
    const timer = setTimeout(() => controller.abort(), Math.min(FETCH_TIMEOUT_MS, remaining));
    timer.unref?.();
    try {
      const { status, finalUrl, res } = await fetchHops(url, controller.signal);
      if (status === 429 || status >= 500) {
        const retryAfter = parseRetryAfter(res.headers.get("retry-after"));
        drainBody(res);
        lastKind = "http";
        lastStatus = status;
        if (attempt < MAX_ATTEMPTS) {
          const wait = Math.min(retryAfter ?? backoffMs(attempt), Math.max(0, deadline - Date.now()));
          logger.info("[PINTEREST] retrying after upstream error", { requestId, status, attempt, wait });
          clearTimeout(timer);
          externalSignal?.removeEventListener("abort", onExternal);
          await sleep(wait, externalSignal);
          continue;
        }
        throw createError(status === 429 ? "PINTEREST_RATE_LIMITED" : "PINTEREST_UPSTREAM_ERROR");
      }
      if (status < 200 || status >= 400) {
        drainBody(res);
        return { status, finalUrl, body: "" };
      }
      const body = await readBodyCapped(res, MAX_HTML_BYTES);
      return { status, finalUrl, body };
    } catch (err) {
      if (err instanceof AppError) throw err;
      if (externalSignal?.aborted) throw createError("SERVER_SHUTTING_DOWN");
      const timeout = isTimeoutError(err);
      const network = isNetworkError(err);
      lastKind = timeout ? "timeout" : network ? "network" : "network";
      if ((!timeout && !network) || attempt >= MAX_ATTEMPTS) {
        logger.warn("[PINTEREST] fetch failed", {
          requestId,
          attempt,
          kind: lastKind,
          error: err instanceof Error ? err.message : "unknown",
        });
        throw createError(timeout ? "PINTEREST_TIMEOUT" : "PINTEREST_UPSTREAM_ERROR");
      }
      clearTimeout(timer);
      externalSignal?.removeEventListener("abort", onExternal);
      const wait = Math.min(backoffMs(attempt), Math.max(0, deadline - Date.now()));
      await sleep(wait, externalSignal);
    } finally {
      clearTimeout(timer);
      externalSignal?.removeEventListener("abort", onExternal);
    }
  }
  if (lastKind === "timeout") throw createError("PINTEREST_TIMEOUT");
  if (lastStatus === 429) throw createError("PINTEREST_RATE_LIMITED");
  throw createError("PINTEREST_UPSTREAM_ERROR");
}

/**
 * Best-effort HEAD content-type check on a resolved media URL (Range GET only
 * when the CDN rejects HEAD). Returns false on positive proof the URL is not
 * the expected media: a web page/JSON, a missing resource, or an image served
 * where a video was promised (and vice versa). Network errors, timeouts and
 * other non-2xx responses are inconclusive and never drop a Pinterest URL.
 */
async function isLikelyMedia(
  url: string,
  expected: MediaItem["type"],
  signal?: AbortSignal
): Promise<boolean> {
  const controller = new AbortController();
  const onExternal = (): void => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", onExternal, { once: true });
  const timer = setTimeout(() => controller.abort(), 2_500);
  timer.unref?.();
  const headers = { "user-agent": PIN_UA, referer: "https://www.pinterest.com/" };
  try {
    let res: Response;
    try {
      res = await fetch(url, { method: "HEAD", redirect: "follow", signal: controller.signal, headers });
    } catch {
      return true;
    }
    if (res.status === 405 || res.status === 501) {
      drainBody(res);
      try {
        res = await fetch(url, {
          method: "GET",
          redirect: "follow",
          signal: controller.signal,
          headers: { ...headers, range: "bytes=0-0" },
        });
      } catch {
        return true;
      }
    }
    const status = res.status;
    const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
    drainBody(res);
    if (status === 404 || status === 410) return false;
    if (status < 200 || status >= 300) return true;
    if (contentType.startsWith("text/html") || contentType.includes("application/json")) return false;
    if (contentType.includes("mpegurl") || contentType.includes("dash+xml")) return false;
    if (expected === "video" && (contentType.startsWith("image/") || contentType.startsWith("audio/"))) {
      return false;
    }
    if (expected === "image" && contentType.startsWith("video/")) return false;
    return true;
  } catch {
    return true;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onExternal);
  }
}

/** Drop leading candidates only when they are positively not media (bounded). */
async function filterVerified(candidates: MediaItem[], signal?: AbortSignal): Promise<MediaItem[]> {
  let index = 0;
  const limit = Math.min(candidates.length, VERIFY_LIMIT);
  while (index < limit) {
    if (await isLikelyMedia(candidates[index].url, candidates[index].type, signal)) break;
    index++;
  }
  if (index >= limit) return [];
  return candidates.slice(index);
}

/**
 * Resolve a (validated) Pinterest pin URL into downloadable media.
 * Throws AppError with an honest code on every failure path.
 */
export async function resolvePinterestPin(
  normalizedUrl: string,
  expected: PinterestExpected,
  options?: ResolveCallOptions,
  onProgress?: ResolveProgressCallback
): Promise<ResolverResult> {
  const signal = options?.signal;
  const requestId = options?.requestId;

  const emit = (progress: number, stage: string): void => {
    onProgress?.(progress, stage);
  };

  emit(10, "Contacting Pinterest");
  const startedAt = Date.now();
  const page = await fetchPinPage(normalizedUrl, signal, requestId);
  const duration = Date.now() - startedAt;

  // The redirect chain must still be on Pinterest — never an arbitrary target.
  try {
    const host = new URL(page.finalUrl).hostname.toLowerCase();
    if (!isAllowedPinHost(host)) {
      logger.warn("[PINTEREST] final host not Pinterest", { requestId, host });
      throw createError("PINTEREST_PIN_RESTRICTED");
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
  }

  logger.info("[PINTEREST] page fetched", {
    requestId,
    status: page.status,
    finalHost: (() => {
      try {
        return new URL(page.finalUrl).hostname;
      } catch {
        return null;
      }
    })(),
    bytes: page.body.length,
    durationMs: duration,
  });

  if (page.status === 404) throw createError("PINTEREST_PIN_NOT_FOUND");
  if (page.status === 401 || page.status === 403) throw createError("PINTEREST_PIN_RESTRICTED");

  const pinId = pinIdFromUrl(page.finalUrl) ?? pinIdFromUrl(normalizedUrl);
  // A real pin page has a /pin/<id> permalink or pin-content structured data.
  // An unexpanded/expired short link can land on a generic Pinterest page —
  // refuse it instead of returning that page's scaffolding image as "the pin".
  const blocks = parseLdJsonBlocks(page.body);
  const hasPinStructure = Boolean(pinId) || blocks.some((b) => b && typeof b === "object" && ldTypeOf(b) !== "" && isPinLdBlock(b));
  if (!hasPinStructure) {
    logger.info("[PINTEREST] not a pin page", { requestId, status: page.status });
    throw createError("PINTEREST_PIN_NOT_FOUND");
  }

  emit(55, "Extracting media");
  const extractStartedAt = Date.now();
  const extracted = extractPinMediaFromHtml(page.body, pinId, blocks);
  const extractMs = Date.now() - extractStartedAt;
  if (extracted.notFound) {
    logger.info("[PINTEREST] pin not found", { requestId, status: page.status });
    throw createError("PINTEREST_PIN_NOT_FOUND");
  }

  const fallbackVideos = extracted.fallbackVideos;
  const hasMedia =
    extracted.videos.length > 0 || fallbackVideos.length > 0 || extracted.images.length > 0;
  if (!hasMedia) {
    const verdict = classifyPinPageText(page.body);
    if (verdict === "not-found") throw createError("PINTEREST_PIN_NOT_FOUND");
    if (verdict === "restricted") throw createError("PINTEREST_PIN_RESTRICTED");
    // Every real pin page ships at least one ld+json block; Pinterest's
    // "no such pin" response is a content-free app shell with none. No
    // structured data at all therefore means the pin does not exist.
    if (blocks.length === 0) throw createError("PINTEREST_PIN_NOT_FOUND");
    logger.info("[PINTEREST] page carried no media", { requestId, status: page.status });
    throw createError("PINTEREST_PARSE_FAILED");
  }

  emit(80, "Verifying media link");
  const verifyStartedAt = Date.now();

  // The derived expMp4 candidate is only probed if the normal candidates do
  // not verify, so a valid LD/relay rendition never pays for an extra request.
  let fallbackVerified: MediaItem[] | null = null;
  const verifiedFallback = async (): Promise<MediaItem[]> => {
    if (fallbackVerified !== null) return fallbackVerified;
    fallbackVerified = fallbackVideos.length > 0 ? await filterVerified(fallbackVideos, signal) : [];
    if (fallbackVerified.length > 0) {
      logger.info("[PINTEREST] using derived progressive fallback", {
        requestId,
        candidates: fallbackVideos.length,
        selected: fallbackVerified.length,
      });
    }
    return fallbackVerified;
  };

  let media: MediaItem[];
  let type: ResolverResult["type"];
  if (expected === "image") {
    if (extracted.images.length === 0) throw createError("PINTEREST_NO_IMAGE");
    const verified = await filterVerified(extracted.images, signal);
    if (verified.length === 0) throw createError("PINTEREST_PARSE_FAILED");
    media = verified;
    type = media.length > 1 ? "CAROUSEL" : "PHOTO";
  } else if (expected === "video") {
    if (extracted.videos.length === 0 && fallbackVideos.length === 0) {
      throw createError("PINTEREST_NO_VIDEO");
    }
    let verified =
      extracted.videos.length > 0 ? await filterVerified(extracted.videos, signal) : [];
    if (verified.length === 0) verified = await verifiedFallback();
    if (verified.length === 0) throw createError("PINTEREST_PARSE_FAILED");
    media = verified;
    type = "VIDEO";
  } else {
    // Auto Detect: classify from the media that actually verified. A thumbnail
    // alone never classifies as video; if every video candidate is unusable,
    // fall back to the genuine images instead of failing the whole resolve.
    let verifiedVideos =
      extracted.videos.length > 0 ? await filterVerified(extracted.videos, signal) : [];
    if (verifiedVideos.length === 0) verifiedVideos = await verifiedFallback();
    if (verifiedVideos.length > 0) {
      media = verifiedVideos;
      type = "VIDEO";
    } else {
      if (extracted.images.length === 0) throw createError("PINTEREST_PARSE_FAILED");
      const verifiedImages = await filterVerified(extracted.images, signal);
      if (verifiedImages.length === 0) throw createError("PINTEREST_PARSE_FAILED");
      media = verifiedImages;
      type = verifiedImages.length > 1 ? "CAROUSEL" : "PHOTO";
    }
  }

  emit(90, "Preparing download links");

  logger.info("[PINTEREST] resolved", {
    requestId,
    type,
    videoCount: extracted.videos.length,
    fallbackVideoCount: fallbackVideos.length,
    imageCount: extracted.images.length,
    selected: media.length,
    fetchMs: duration,
    extractMs,
    verifyMs: Date.now() - verifyStartedAt,
    totalMs: Date.now() - startedAt,
  });

  return {
    type,
    sourceUrl: normalizedUrl,
    thumbnail: extracted.thumbnail ?? (media[0]?.type === "image" ? media[0].url : null),
    title: extracted.title,
    author: extracted.author,
    media,
  };
}
