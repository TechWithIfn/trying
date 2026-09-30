import type {
  ResolverResult,
  MediaItem,
  InstagramContentType,
  Author,
  ResolveProgressCallback,
  ResolveCallOptions,
  ResolveDiagnostics,
} from "../types.js";
import { BaseProvider, isCdnMediaHost, isPrivateOrReservedHost } from "./base.js";
import { createError, isConnectionLostError, isTimeoutError, AppError } from "../errors.js";
import { logger } from "../logger.js";
import { decodeHtmlEntities } from "../text.js";
import { readBoundedInt } from "../env.js";
import {
  getInstagramSessionCookie,
  isInstagramSessionConfigured,
  parseSessionCookies,
} from "../instagram-session.js";
import { isDraining, registerCleanup } from "../shutdown.js";
import { getGate } from "../capacity.js";
import type { Lease } from "../capacity.js";
import { inc } from "../metrics.js";

/** Abort reasons. Distinct objects so callers can tell the cases apart. */
const DEADLINE_REASON = { kind: "resolve-deadline" } as const;
const CLIENT_GONE_REASON = { kind: "client-gone" } as const;

let pptr: typeof import("puppeteer") | null = null;

async function getPuppeteer() {
  if (!pptr) {
    pptr = await import("puppeteer");
  }
  return pptr;
}

/**
 * Serverless detection: Vercel sets VERCEL=1 automatically. PUPPETEER_RUNTIME
 * allows an explicit override ("serverless" | "local"); otherwise auto-detect.
 */
export function isServerlessRuntime(): boolean {
  const override = (process.env.PUPPETEER_RUNTIME || "").toLowerCase();
  if (override === "serverless") return true;
  if (override === "local") return false;
  return Boolean(process.env.VERCEL);
}

const NAVIGATION_TIMEOUT_MS = 15_000;
const DATA_WAIT_TIMEOUT_MS = 5_000;

/**
 * Bounded page concurrency lives in the central capacity registry
 * (`getGate("puppeteer")`), which reads MAX_CONCURRENT_PAGES /
 * PUPPETEER_QUEUE_WAIT_MS / PUPPETEER_STALE_MS. See acquirePageSlot().
 */

/** Hard ceiling on one browser resolve, independent of any inner timeout. */
const RESOLVE_DEADLINE_MS = readBoundedInt("PUPPETEER_RESOLVE_DEADLINE_MS", 45_000, 5_000, 300_000);

/** How long to wait for a free page slot before refusing the resolve. */
const PAGE_SLOT_QUEUE_MS = readBoundedInt("PUPPETEER_QUEUE_WAIT_MS", 8_000, 0, 60_000);

/** How long an idle browser is kept warm before it is closed to free memory. */
const BROWSER_IDLE_TTL_MS = readBoundedInt("PUPPETEER_BROWSER_IDLE_TTL_MS", 120_000, 10_000, 900_000);

/**
 * Never buffer more than this from a single intercepted API response. A real
 * media payload is tens of KB; a 4 MB ceiling is generous and keeps one odd
 * response from turning into a memory spike.
 */
const MAX_INTERCEPT_BODY_BYTES = readBoundedInt(
  "PUPPETEER_MAX_INTERCEPT_BODY_BYTES",
  4 * 1024 * 1024,
  64 * 1024,
  32 * 1024 * 1024
);

/**
 * Third-party surfaces Instagram loads that are never a media source: pixel/
 * analytics beacons, tag managers, ad SDKs. Blocking them removes real bytes
 * and background work without touching any Instagram or fbcdn host, so media
 * extraction is unaffected.
 */
const UNNECESSARY_RESOURCE_RE =
  /googletagmanager|google-analytics|analytics\.js|\/gpt\/|doubleclick|facebook\.net\/tr|connect\.facebook|adservice\.google|pagead2\.googlesyndication|hotjar|mixpanel|amplitude|bugsnag|sentry\.io|\/rsrc\.php|\/z\.gif|\/px\.gif/i;

/** Hosts that serve media or media metadata must never be blocked. */
const MEDIA_HOST_RE = /(^|\.)(fbcdn\.net|cdninstagram\.com|instagram\.com|facebook\.com|fb\.com)$/i;

export function isUnnecessaryResource(url: string, resourceType: string): boolean {
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    return false;
  }
  // Media-bearing hosts are never blocked, whatever the path looks like.
  if (MEDIA_HOST_RE.test(host)) return false;
  if (resourceType === "font" || resourceType === "stylesheet") return true;
  return UNNECESSARY_RESOURCE_RE.test(url);
}

/**
 * Only Instagram's own API surfaces can carry media JSON. Buffering every JSON
 * response on the page (feature flags, manifests, static config) cost time and
 * memory on each resolve for no extraction value.
 */
const MEDIA_API_PATH_RE = /(\/api\/|\/graphql|web\/api\/v1)/i;

export function isMediaBearingApiUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  if (!MEDIA_HOST_RE.test(parsed.hostname)) return false;
  return MEDIA_API_PATH_RE.test(parsed.pathname);
}

const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
// Desktop Chrome identity. Instagram's web document only carries the real
// media graph for a desktop browser (see the navigation identity note in
// PuppeteerProvider.resolveInternal); a mobile/app identity gets a
// video-stripped page.
const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
const IG_APP_ID = "936619743392459";

export type CandidateSource =
  | "network-video-response"
  | "api-json"
  | "video-graph"
  | "dom"
  | "rendered-html"
  | "prefetch-og"
  | "prefetch-embed"
  | "embed-html";

export interface ExtractedMedia {
  url: string;
  type: "video" | "image";
  width: number | null;
  height: number | null;
  /**
   * Where this candidate was first captured. The network layer's own
   * video response (`network-video-response`) is the authoritative
   * media-type signal: it means Chromium already received video bytes
   * (resourceType "media" or a video/* content-type, HTTP 200/206) for
   * this exact URL, so the final assembly may trust it even when a
   * follow-up server-side probe cannot re-fetch the bytes.
   */
  source?: CandidateSource;
  /** Response Content-Type observed at capture time (lowercased, may include params). */
  capturedContentType?: string | null;
  /** Puppeteer resourceType observed at capture time (e.g. "media"). */
  capturedResourceType?: string | null;
  /** HTTP status observed at capture time (200/206 for a real delivery). */
  capturedStatus?: number | null;
}

/** Log-safe hostname (no query, no tokens, no cookies). Null when unparsable. */
function hostnameOf(raw: string): string | null {
  try {
    return new URL(raw).hostname.toLowerCase() || null;
  } catch {
    return null;
  }
}

function unescapeInstagramString(s: string): string {
  return s
    .replace(/\\u0026/g, "&")
    .replace(/\\\//g, "/")
    .replace(/\\u003C/g, "<")
    .replace(/\\u003E/g, ">")
    .replace(/\\u0022/g, '"')
    .replace(/\\u0027/g, "'")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    // Page HTML/JSON embeds URLs with &amp; entities (e.g. "...?a=1&amp;b=2").
    // Decode to the real query separator or the CDN signature breaks.
    .replace(/&amp;/g, "&");
}

/**
 * Instagram embeds its media graph inside the document as JSON with escaped
 * slashes (`https:\/\/cdn…\/video.mp4?...`) and sometimes escaped query
 * separators (`\u0026`). Raw URL patterns therefore never matched the
 * progressive MP4 entries in `video_versions`, so a Reel that clearly
 * contained video data extracted zero videos and failed honestly but
 * uselessly. Scanning a normalized copy makes the real URLs visible; the
 * originals are untouched, and every returned URL still goes through
 * `unescapeInstagramString` + the CDN allowlist.
 */
function normalizeEmbeddedJson(text: string): string {
  return text
    .replace(/\\\//g, "/")
    .replace(/\\u0026/gi, "&")
    .replace(/\\u002F/gi, "/")
    .replace(/\\u003D/gi, "=")
    .replace(/\\u003A/gi, ":");
}

/**
 * Structured `video_versions` extraction. Each entry is a flat JSON object
 * with the progressive MP4 URL plus the real width/height, so the highest
 * quality variant can be preferred instead of an arbitrary regex hit. This
 * is the media graph Instagram ships with every Reel/video post.
 */
export function extractVideoVersions(text: string): ExtractedMedia[] {
  const out: ExtractedMedia[] = [];
  const normalized = normalizeEmbeddedJson(text);
  for (const match of normalized.matchAll(/"video_versions"\s*:\s*\[([^\]]{1,40000})\]/g)) {
    for (const obj of match[1].matchAll(/\{[^{}]*\}/g)) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(obj[0]);
      } catch {
        continue;
      }
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) continue;
      const record = parsed as Record<string, unknown>;
      const url = typeof record.url === "string" ? unescapeInstagramString(record.url) : null;
      if (!url || !url.startsWith("http")) continue;
      out.push({
        url,
        type: "video",
        width: typeof record.width === "number" ? record.width : null,
        height: typeof record.height === "number" ? record.height : null,
      });
    }
  }
  return out;
}

/**
 * Browser-side inspection: extract direct video elements, meta og:video,
 * and script snippets that contain media graph payloads (video_versions,
 * dash_manifest, playback_url, mp4 URLs).
 */
const EXTRACT_VIDEO_GRAPH_FN = `
(function() {
  try {
    var out = { domVideos: [], scripts: [] };
    var videos = document.querySelectorAll('video');
    for (var i = 0; i < videos.length; i++) {
      var v = videos[i];
      var src = v.getAttribute('src');
      if (src && src.indexOf('http') === 0) out.domVideos.push(src);
      var currentSrc = v.currentSrc;
      if (currentSrc && currentSrc.indexOf('http') === 0 && currentSrc !== src) {
        out.domVideos.push(currentSrc);
      }
      var sources = v.querySelectorAll('source');
      for (var j = 0; j < sources.length; j++) {
        var sSrc = sources[j].getAttribute('src');
        if (sSrc && sSrc.indexOf('http') === 0) out.domVideos.push(sSrc);
      }
    }
    var ogVideo = document.querySelector('meta[property="og:video"]');
    if (ogVideo) {
      var c = ogVideo.getAttribute('content');
      if (c && c.indexOf('http') === 0) out.domVideos.push(c);
    }
    var scripts = document.querySelectorAll('script');
    for (var k = 0; k < scripts.length && out.scripts.length < 10; k++) {
      var text = scripts[k].textContent || '';
      if (
        text.indexOf('video_versions') !== -1 ||
        text.indexOf('dash_manifest') !== -1 ||
        text.indexOf('playback_url') !== -1 ||
        text.indexOf('playable_url') !== -1 ||
        text.indexOf('video_url') !== -1 ||
        (text.indexOf('.mp4') !== -1 && (text.indexOf('fbcdn') !== -1 || text.indexOf('cdninstagram') !== -1))
      ) {
        out.scripts.push(text);
      }
    }
    return out;
  } catch (e) {
    return { domVideos: [], scripts: [] };
  }
})()
`;


export function extractMediaFromJson(text: string): ExtractedMedia[] {
  const media: ExtractedMedia[] = [];
  const seen = new Set<string>();

  const add = (url: string, type: "video" | "image") => {
    const clean = unescapeInstagramString(url);
    if (!clean || seen.has(clean) || !clean.startsWith("http")) return;
    seen.add(clean);
    media.push({ url: clean, type, width: null, height: null });
  };

  // Real media graph first: `video_versions` carries the progressive MP4
  // URLs with true dimensions (see extractVideoVersions).
  for (const item of extractVideoVersions(text)) {
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    media.push(item);
  }

  // Scan a slash-normalized copy so escaped URLs ("https:\/\/…") are visible
  // to the patterns below.
  const scan = normalizeEmbeddedJson(text);

  for (const m of scan.matchAll(/"video_url"\s*:\s*"([^"]+)"/g)) {
    add(m[1], "video");
  }
  for (const m of scan.matchAll(/"playback_url"\s*:\s*"([^"]+)"/g)) {
    add(m[1], "video");
  }
  for (const m of scan.matchAll(/"url"\s*:\s*"(https?:[^"]*?\.mp4[^"]*?)"/g)) {
    add(m[1], "video");
  }
  for (const m of scan.matchAll(/"browser_native_(?:hd|sd)_url"\s*:\s*"([^"]+)"/g)) {
    add(m[1], "video");
  }
  for (const m of scan.matchAll(/<BaseURL>([^<]+\.mp4[^<]*)<\/BaseURL>/gi)) {
    add(m[1], "video");
  }
  for (const m of scan.matchAll(/(https?:\/\/[^"'\s<>\\]*?(?:fbcdn|cdninstagram)[^"'\s<>\\]*?\.mp4[^"'\s<>\\]*)/gi)) {
    add(m[1], "video");
  }
  for (const m of scan.matchAll(/"display_url"\s*:\s*"([^"]+)"/g)) {
    add(m[1], "image");
  }
  for (const m of scan.matchAll(/"thumbnail_src"\s*:\s*"([^"]+)"/g)) {
    add(m[1], "image");
  }

  return media;
}

export interface SidecarPage {
  items: ExtractedMedia[];
  hasMore: boolean;
  endCursor: string | null;
}

/**
 * Structured carousel extraction: parse Instagram API JSON (`edge_sidecar_to_children`
 * edges or `carousel_media` children) instead of regex-scraping URLs. Returns
 * every child in order with real per-slide dimensions, plus pagination state
 * (`page_info.has_next_page` / `end_cursor`) so callers can follow the cursor
 * until the complete collection is retrieved. Never throws; unparseable input
 * yields an empty page. Video slides contribute their playable URL (posters
 * are kept as separate image entries, matching the regex path's behavior).
 */
export function extractSidecarFromJson(text: string): SidecarPage {
  let root: unknown;
  try {
    root = JSON.parse(text);
  } catch {
    return { items: [], hasMore: false, endCursor: null };
  }
  return parseSidecarRoot(root);
}

/** Walk a parsed Instagram API object for sidecar/carousel children. */
function parseSidecarRoot(root: unknown): SidecarPage {
  const items: ExtractedMedia[] = [];
  const seen = new Set<string>();
  let hasMore = false;
  let endCursor: string | null = null;

  const push = (url: unknown, type: "video" | "image", w: unknown, h: unknown): void => {
    if (typeof url !== "string") return;
    const clean = unescapeInstagramString(url);
    if (!clean.startsWith("http") || seen.has(clean)) return;
    seen.add(clean);
    items.push({
      url: clean,
      type,
      width: typeof w === "number" && w > 0 ? w : null,
      height: typeof h === "number" && h > 0 ? h : null,
    });
  };

  const visitEdgeNode = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    const n = node as Record<string, unknown>;
    const dims = n["dimensions"];
    const w = dims && typeof dims === "object" ? (dims as Record<string, unknown>)["width"] : n["width"];
    const h = dims && typeof dims === "object" ? (dims as Record<string, unknown>)["height"] : n["height"];
    if (n["is_video"] === true && typeof n["video_url"] === "string") {
      push(n["video_url"], "video", w, h);
    }
    push(n["display_url"] ?? n["display_src"], "image", w, h);
  };

  const bestByArea = (cands: unknown[]): Record<string, unknown> | null => {
    let best: Record<string, unknown> | null = null;
    let bestArea = -1;
    for (const cd of cands) {
      if (!cd || typeof cd !== "object") continue;
      const cc = cd as Record<string, unknown>;
      if (typeof cc["url"] !== "string") continue;
      const area =
        typeof cc["width"] === "number" && typeof cc["height"] === "number"
          ? (cc["width"] as number) * (cc["height"] as number)
          : 0;
      if (area > bestArea) {
        bestArea = area;
        best = cc;
      }
    }
    return best;
  };

  const visitCarouselChild = (child: unknown): void => {
    if (!child || typeof child !== "object") return;
    const c = child as Record<string, unknown>;
    const vids = c["video_versions"];
    if (Array.isArray(vids) && vids.length > 0) {
      const best = bestByArea(vids);
      if (best) {
        push(best["url"], "video", best["width"], best["height"]);
        push(c["display_url"] ?? c["display_src"], "image", best["width"], best["height"]);
        return;
      }
    }
    const iv2 = c["image_versions2"];
    const cands =
      iv2 && typeof iv2 === "object" && Array.isArray((iv2 as Record<string, unknown>)["candidates"])
        ? ((iv2 as Record<string, unknown>)["candidates"] as unknown[])
        : [];
    const best = bestByArea(cands);
    if (best) {
      push(best["url"], "image", best["width"], best["height"]);
    } else {
      push(c["display_url"] ?? c["display_src"], "image", c["width"], c["height"]);
    }
  };

  const walk = (node: unknown, depth: number): void => {
    if (!node || typeof node !== "object" || depth > 14) return;
    if (Array.isArray(node)) {
      for (const el of node) walk(el, depth + 1);
      return;
    }
    const rec = node as Record<string, unknown>;
    const sidecar = rec["edge_sidecar_to_children"];
    if (sidecar && typeof sidecar === "object" && !Array.isArray(sidecar)) {
      const sc = sidecar as Record<string, unknown>;
      if (Array.isArray(sc["edges"])) {
        for (const e of sc["edges"] as unknown[]) {
          const en = (e as Record<string, unknown> | null)?.["node"];
          visitEdgeNode(en);
        }
      }
      const pi = sc["page_info"];
      if (pi && typeof pi === "object" && !Array.isArray(pi)) {
        const pir = pi as Record<string, unknown>;
        if (pir["has_next_page"] === true) {
          hasMore = true;
          if (typeof pir["end_cursor"] === "string" && pir["end_cursor"]) {
            endCursor = pir["end_cursor"] as string;
          }
        }
      }
      for (const [k, v] of Object.entries(rec)) {
        if (k === "edge_sidecar_to_children" || k === "carousel_media") continue;
        walk(v, depth + 1);
      }
      return;
    }
    if (Array.isArray(rec["carousel_media"])) {
      for (const child of rec["carousel_media"] as unknown[]) visitCarouselChild(child);
      for (const [k, v] of Object.entries(rec)) {
        if (k === "carousel_media" || k === "edge_sidecar_to_children") continue;
        walk(v, depth + 1);
      }
      return;
    }
    for (const v of Object.values(rec)) walk(v, depth + 1);
  };

  walk(root, 0);
  return { items, hasMore, endCursor };
}

/** Extract a `{...}` balanced block starting at `openIdx`, honoring `\` escapes. */
function extractBalancedJson(text: string, openIdx: number, maxLen = 2_000_000): string | null {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = openIdx; i < text.length && i - openIdx < maxLen; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(openIdx, i + 1);
    }
  }
  return null;
}

/**
 * Complete carousel extraction from Instagram's public post embed endpoint
 * (`/p/<shortcode>/embed/`), whose `gql_data.shortcode_media` carries the
 * FULL `edge_sidecar_to_children` collection (all slides, in order, with
 * dimensions) — unlike the main page, which only exposes the first slides
 * anonymously. Tries progressive unescape levels since the blob is embedded
 * at varying depths; returns an empty page when unusable. Never throws.
 */
/** Collect nested JSON-string values that themselves carry sidecar data. */
function collectSidecarStrings(node: unknown, out: string[], depth = 0): void {
  if (node == null || depth > 8) return;
  if (typeof node === "string") {
    if (node.includes("edge_sidecar_to_children") || node.includes("carousel_media")) {
      out.push(node);
    }
    return;
  }
  if (Array.isArray(node)) {
    for (const el of node) collectSidecarStrings(el, out, depth + 1);
    return;
  }
  if (typeof node === "object") {
    for (const v of Object.values(node as Record<string, unknown>)) {
      collectSidecarStrings(v, out, depth + 1);
    }
  }
}

/**
 * Parse the longest valid JSON prefix: on "Unexpected non-whitespace after
 * JSON at position N", the input slice [0, N) is complete — retry with it.
 * Bounded and strictly shrinking, so it always terminates.
 */
function tryParseJsonPrefix(text: string): unknown | null {
  let slice = text;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return JSON.parse(slice);
    } catch (e) {
      const m = /position (\d+)/.exec(e instanceof Error ? e.message : "");
      if (!m) return null;
      const pos = parseInt(m[1], 10);
      if (!(pos > 0) || pos >= slice.length) return null;
      slice = slice.slice(0, pos);
    }
  }
  return null;
}

export function extractSidecarFromEmbedHtml(html: string): SidecarPage {
  const empty: SidecarPage = { items: [], hasMore: false, endCursor: null };
  try {
    // &quot; entities would otherwise look like raw quotes to the scanner.
    const flat = html.replace(/\\\//g, "/").replace(/&quot;/g, '\\"');
    const anchor = flat.indexOf("gql_data");
    if (anchor === -1) return empty;
    const openIdx = flat.indexOf("{", anchor);
    if (openIdx === -1) return empty;
    const block = extractBalancedJson(flat, openIdx);
    if (!block) return empty;
    // The blob may itself be escape-prefixed ({\"shortcode_media\"...}, i.e.
    // a JSON string's content rather than a standalone object). Retry the
    // whole block through progressive unescape levels; at each level also
    // probe nested JSON-string blobs in both raw and unescaped forms.
    let candidate: string = block;
    for (let pass = 0; pass < 3; pass++) {
      const root: unknown = tryParseJsonPrefix(candidate);
      if (root) {
        const direct = parseSidecarRoot(root);
        if (direct.items.length > 0) return direct;
        const nested: string[] = [];
        collectSidecarStrings(root, nested);
        for (const s of nested.slice(0, 4)) {
          for (const form of [s, s.replace(/\\"/g, '"')]) {
            const sub = tryParseJsonPrefix(form);
            if (sub) {
              const page = parseSidecarRoot(sub);
              if (page.items.length > 0) return page;
            }
          }
        }
      }
      candidate = candidate.replace(/\\"/g, '"');
    }
    return empty;
  } catch {
    return empty;
  }
}

function extractMediaFromHtml(html: string): ExtractedMedia[] {
  const media: ExtractedMedia[] = [];
  const seen = new Set<string>();

  const add = (url: string, type: "video" | "image") => {
    const clean = unescapeInstagramString(url);
    if (!clean || seen.has(clean) || !clean.startsWith("http")) return;
    seen.add(clean);
    media.push({ url: clean, type, width: null, height: null });
  };

  const addItem = (item: ExtractedMedia) => {
    if (seen.has(item.url)) return;
    seen.add(item.url);
    media.push(item);
  };

  // The rendered Reel/video document carries its media graph in
  // `video_versions` (progressive MP4 + dimensions). Read it before the
  // tag-based patterns: it is the authoritative video source.
  for (const item of extractVideoVersions(html)) addItem(item);

  // Slash-normalized copy so escaped JSON URLs are visible below.
  const scan = normalizeEmbeddedJson(html);

  for (const m of html.matchAll(
    /property=["']og:video["'][^>]*content=["']([^"']+)["']/gi
  )) {
    add(m[1], "video");
  }
  for (const m of html.matchAll(
    /content=["']([^"']+)["'][^>]*property=["']og:video["']/gi
  )) {
    add(m[1], "video");
  }
  for (const m of html.matchAll(
    /property=["']og:image["'][^>]*content=["']([^"']+)["']/gi
  )) {
    add(m[1], "image");
  }
  for (const m of html.matchAll(
    /content=["']([^"']+)["'][^>]*property=["']og:image["']/gi
  )) {
    add(m[1], "image");
  }
  for (const m of html.matchAll(
    /name=["']twitter:player:stream["'][^>]*content=["']([^"']+)["']/gi
  )) {
    add(m[1], "video");
  }
  for (const m of html.matchAll(
    /name=["']twitter:image["'][^>]*content=["']([^"']+)["']/gi
  )) {
    add(m[1], "image");
  }
  for (const m of scan.matchAll(/"video_url"\s*:\s*"([^"]+)"/g)) {
    add(m[1], "video");
  }
  // Progressive MP4 URLs in the embedded media graph (escaped slashes already
  // normalized above). This is what a Reel actually ships.
  for (const m of scan.matchAll(/"url"\s*:\s*"(https?:[^"]*?\.mp4[^"]*?)"/g)) {
    add(m[1], "video");
  }
  for (const m of scan.matchAll(/"display_url"\s*:\s*"([^"]+)"/g)) {
    add(m[1], "image");
  }
  for (const m of scan.matchAll(
    /https?:\/\/[^"'\s]*?scontent[^"'\s]*?\.(?:jpg|jpeg|png|webp)/gi
  )) {
    add(m[0], "image");
  }

  return media;
}

function extractAuthorFromHtml(html: string): Author | null {
  const usernameMatch =
    html.match(/"username"\s*:\s*"([^"]+)"/) ||
    html.match(/"owner"\s*:\s*\{[^}]*"username"\s*:\s*"([^"]+)"/);
  if (usernameMatch) {
    const displayNameMatch =
      html.match(/"full_name"\s*:\s*"([^"]+)"/) ||
      html.match(/"owner"\s*:\s*\{[^}]*"full_name"\s*:\s*"([^"]+)"/);
    return {
      username: usernameMatch[1],
      displayName: displayNameMatch ? displayNameMatch[1] : null,
    };
  }

  // Try to extract from og:title or twitter:title (format: "Name (@username) • Instagram")
  const ogTitleMatch =
    html.match(/property=["']og:title["'][^>]*content=["']([^"']+)["']/) ||
    html.match(/content=["']([^"']+)["'][^>]*property=["']og:title["']/) ||
    html.match(/name=["']twitter:title["'][^>]*content=["']([^"']+)["']/) ||
    html.match(/content=["']([^"']+)["'][^>]*name=["']twitter:title["']/);
  if (ogTitleMatch) {
    const title = unescapeInstagramString(ogTitleMatch[1]);
    const atMatch = title.match(/@([a-zA-Z0-9._]+)/);
    if (atMatch) {
      const beforeAt = title.slice(0, title.indexOf("@")).replace(/\s*[|•·]\s*$/, "").trim();
      return {
        username: atMatch[1],
        displayName: beforeAt || null,
      };
    }
  }

  // Try to extract from description (format: "... - username on date:")
  const descMatch =
    html.match(/property=["']og:description["'][^>]*content=["']([^"']+)["']/) ||
    html.match(/content=["']([^"']+)["'][^>]*property=["']og:description["']/) ||
    html.match(/name=["']description["'][^>]*content=["']([^"']+)["']/);
  if (descMatch) {
    const desc = unescapeInstagramString(descMatch[1]);
    const userMatch = desc.match(/(?:-|\u2013)\s*([a-zA-Z0-9._]+)\s+on\s+/);
    if (userMatch) {
      return { username: userMatch[1], displayName: null };
    }
  }

  return null;
}

function extractAuthorFromUrl(url: string): Author | null {
  const match = url.match(/instagram\.com\/([a-zA-Z0-9._]+)\/(?:p|reel|tv|stories)/);
  if (match && !["p", "reel", "reels", "tv", "stories", "accounts", "explore"].includes(match[1])) {
    return { username: match[1], displayName: null };
  }
  return null;
}

function extractTitleFromHtml(html: string): string | null {
  const ogTitleMatch =
    html.match(/property=["']og:title["'][^>]*content=["']([^"']+)["']/) ||
    html.match(/content=["']([^"']+)["'][^>]*property=["']og:title["']/);
  if (ogTitleMatch) return unescapeInstagramString(ogTitleMatch[1]);

  const descMatch =
    html.match(/property=["']og:description["'][^>]*content=["']([^"']+)["']/) ||
    html.match(/content=["']([^"']+)["'][^>]*property=["']og:description["']/);
  if (descMatch) return unescapeInstagramString(descMatch[1]);

  const twitterTitle =
    html.match(/name=["']twitter:title["'][^>]*content=["']([^"']+)["']/) ||
    html.match(/content=["']([^"']+)["'][^>]*name=["']twitter:title["']/);
  if (twitterTitle) return unescapeInstagramString(twitterTitle[1]);

  return null;
}

function extractDescriptionFromHtml(html: string): string | null {
  const descMatch =
    html.match(/property=["']og:description["'][^>]*content=["']([^"']+)["']/) ||
    html.match(/content=["']([^"']+)["'][^>]*property=["']og:description["']/) ||
    html.match(/name=["']description["'][^>]*content=["']([^"']+)["']/) ||
    html.match(/content=["']([^"']+)["'][^>]*name=["']description["']/);
  return descMatch ? unescapeInstagramString(descMatch[1]) : null;
}

/**
 * For Reel/Video content the playable item must win: provider responses may
 * list thumbnails/posters before the actual video. Stable sort — videos
 * first (discovery order preserved), everything else untouched. Other
 * content types keep provider order (carousels keep per-item types/order).
 */
/**
 * Ranked probe result for a Reel/video candidate.
 *
 * `combined` means the probe observed both a video and an audio track. Such a
 * file can be heard without relying on a separately paired audio rendition.
 */
export interface RankedVideoCandidate {
  item: MediaItem;
  size: number;
  combined: boolean;
}

/**
 * Prefer an audible video candidate, then the largest file.
 *
 * Instagram may publish a smaller combined video/audio rendition alongside a
 * larger video-only rendition. Silent files look better on paper but produce a
 * silent preview, so audible evidence always outranks byte count.
 */
export function compareReelVideoCandidates(a: RankedVideoCandidate, b: RankedVideoCandidate): number {
  if (a.combined !== b.combined) return a.combined ? -1 : 1;
  return b.size - a.size;
}

export function sortVideoFirst(media: MediaItem[], contentType: InstagramContentType): MediaItem[] {
  if (contentType !== "REEL" && contentType !== "VIDEO") return media;
  const videos = media.filter((m) => m.type === "video");
  if (videos.length === 0) return media;
  return [...videos, ...media.filter((m) => m.type !== "video")];
}

const FETCH_META_FN = `
(function() {
  var result = { videos: [], images: [], hasArticle: false, bodySnippet: '' };

  var videos = document.querySelectorAll('video');
  for (var i = 0; i < videos.length; i++) {
    var v = videos[i];
    var src = v.getAttribute('src');
    if (src && src.indexOf('http') === 0) result.videos.push(src);
    var sources = v.querySelectorAll('source');
    for (var j = 0; j < sources.length; j++) {
      var sSrc = sources[j].getAttribute('src');
      if (sSrc && sSrc.indexOf('http') === 0) result.videos.push(sSrc);
    }
  }

  var imgs = document.querySelectorAll('img[src]');
  for (var k = 0; k < imgs.length; k++) {
    var imgSrc = imgs[k].getAttribute('src') || '';
    if (imgSrc.indexOf('scontent') !== -1 || imgSrc.indexOf('fbcdn') !== -1 || imgSrc.indexOf('cdninstagram') !== -1) {
      if (imgSrc.indexOf('static.cdninstagram.com') === -1) {
        result.images.push(imgSrc);
      }
    }
  }

  var article = document.querySelector('article');
  result.hasArticle = !!article;

  result.bodySnippet = (document.body ? document.body.innerText || '' : '').slice(0, 500);

  return result;
})()
`;

const PAGE_STATE_FN = `
(function() {
  var title = document.title || '';
  var bodyText = document.body ? document.body.innerText || '' : '';
  return {
    title: title,
    hasUnavailableMessage:
      title.indexOf('isn\\'t available') !== -1 ||
      title.indexOf('Page Not Found') !== -1 ||
      bodyText.indexOf('isn\\'t available') !== -1 ||
      bodyText.indexOf('This page isn\\'t available') !== -1 ||
      bodyText.indexOf('The link you followed may be broken') !== -1,
    hasLoginWall:
      bodyText.indexOf('Log in to Instagram') !== -1 ||
      !!document.querySelector('input[name="username"]'),
    hasChallenge:
      bodyText.indexOf('suspicious activity') !== -1 ||
      bodyText.indexOf('verify your identity') !== -1,
  };
})()
`;

const STEALTH_FN = `
(function() {
  // Override navigator.webdriver
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

  // Override navigator.plugins
  Object.defineProperty(navigator, 'plugins', {
    get: () => [1, 2, 3, 4, 5],
  });

  // Override navigator.languages
  Object.defineProperty(navigator, 'languages', {
    get: () => ['en-US', 'en'],
  });

  // Override chrome detection
  window.chrome = { runtime: {}, loadTimes: function() { return {}; }, csi: function() { return {}; } };

  // Override permissions
  const originalQuery = window.navigator.permissions.query;
  window.navigator.permissions.query = (parameters) => (
    parameters.name === 'notifications' ?
      Promise.resolve({ state: Notification.permission }) :
      originalQuery(parameters)
  );
})()
`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function applyStealthPatches(page: any) {
  try {
    await page.evaluateOnNewDocument(STEALTH_FN);
  } catch {
    // Ignore if page is already closed
  }
}

function isTrustedCdnUrl(raw: string): boolean {
  try {
    const parsed = new URL(unescapeInstagramString(raw));
    if (parsed.protocol !== "https:") return false;
    return isCdnMediaHost(parsed.hostname);
  } catch {
    return false;
  }
}

/**
 * Machine-readable reason a candidate was dropped during normalization
 * (before any network probe). Used ONLY for safe diagnostic tallies —
 * never includes the URL, query, or any secret.
 */
export type NormalizationRejection =
  | "invalid-url"
  | "non-http-url"
  | "credential-url"
  | "localhost-or-private-url"
  | "duplicate";

export function classifyNormalizationRejection(raw: unknown): NormalizationRejection {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 8192) return "invalid-url";
  const trimmed = raw.trim();
  if (/^(javascript|data|blob|file|ftp|ws):/i.test(trimmed)) return "non-http-url";
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    // Bare blob:/data: forms that fail URL parsing are still non-http.
    if (/^(blob|data|javascript):/i.test(trimmed)) return "non-http-url";
    return "invalid-url";
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "non-http-url";
  if (parsed.username || parsed.password) return "credential-url";
  if (isPrivateOrReservedHost(parsed.hostname.toLowerCase())) return "localhost-or-private-url";
  return "invalid-url";
}

/**
 * A network-captured candidate is trusted when Chromium itself already
 * received video bytes for this exact URL: trusted CDN https host, HTTP
 * 200/206 delivery, and the authoritative signal is a video/* response
 * Content-Type or a "media" resource type. The signed query string is
 * preserved exactly (the URL is returned untouched) — only the host was
 * ever inspected.
 *
 * This deliberately does NOT require ".mp4" anywhere in the URL: Instagram
 * serves many playable renditions with extension-less paths, and the
 * response Content-Type / resource type is the authoritative media-type
 * signal, not the pathname.
 */
export function isTrustedNetworkCapture(item: ExtractedMedia): boolean {
  if (item.source !== "network-video-response") return false;
  if (item.capturedStatus !== 200 && item.capturedStatus !== 206) return false;
  let parsed: URL;
  try {
    parsed = new URL(item.url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  if (!isCdnMediaHost(parsed.hostname)) return false;
  if (isPrivateOrReservedHost(parsed.hostname.toLowerCase())) return false;
  const ct = (item.capturedContentType || "").toLowerCase();
  if (ct.startsWith("video/")) return true;
  if (item.capturedResourceType === "media") return true;
  return false;
}

/**
 * Upstream headers for CDN verification probes. Instagram's CDN edge rejects
 * (403) or deflects referer-less, UA-only probes, while the real media
 * transfer (see media-proxy UPSTREAM_HEADERS) always carries a browser
 * identity + Instagram referer. A probe MUST look like the transfer it
 * predicts, or valid videos are discarded as "not found".
 *
 * Kept local (not imported from media-proxy) to avoid a module cycle:
 * media-proxy -> resolvers -> providers/index -> this module.
 */
const VERIFY_HEADERS: Record<string, string> = {
  "User-Agent": DESKTOP_UA,
  Accept: "video/mp4,video/*;q=0.9,*/*;q=0.5",
  Referer: "https://www.instagram.com/",
  "Accept-Language": "en-US,en;q=0.9",
};

const VERIFY_TIMEOUT_MS = 5_000;
/** CDN edge redirects (region hop, signature rotation) followed per probe. */
const VERIFY_MAX_REDIRECTS = 3;
/**
 * Bytes pulled per candidate to prove it is a real video. Enough for the
 * leading ISO-BMFF box, and never the whole file.
 */
const VERIFY_PROBE_BYTES = 65_536;
/**
 * Floor for a playable Instagram video. Instagram sometimes publishes a
 * degenerate "video" candidate next to the real one (an 80-byte
 * init/placeholder MP4 that reports `video/mp4`); streaming it produces an
 * unplayable file, so anything smaller than this is treated as not-a-video.
 */
const MIN_PLAYABLE_VIDEO_BYTES = 16_384;
/**
 * Drop Instagram's embedded `bytestart`/`byteend` slice window from a CDN URL.
 *
 * Those two params tell the edge to answer with that slice INSTEAD of the
 * requested Range, so an unmodified probe received a 56-byte `sidx` fragment
 * rather than the real file head. Two things broke because of it:
 *
 *  - the container header was read from the wrong bytes, and
 *  - `Content-Length`/`Content-Range` described the slice, not the object, so
 *    the "largest rendition wins" ordering compared slice lengths.
 *
 * Every other signed param (`oh`, `oe`, `_nc_*`, `efg`) is left byte-identical,
 * matching the streaming route, which already relies on this being safe.
 * Returns the input unchanged when it carries no slice.
 */
function withoutEmbeddedByteSlice(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return rawUrl;
  }
  if (!parsed.searchParams.has("bytestart") || !parsed.searchParams.has("byteend")) {
    return rawUrl;
  }
  parsed.searchParams.delete("bytestart");
  parsed.searchParams.delete("byteend");
  return parsed.toString();
}

/** Leading ISO-BMFF box types that identify real MP4 media. */
const MP4_BOX_TYPES = ["ftyp", "styp", "moov", "moof", "sidx", "emsg", "free", "skip"] as const;

export interface VideoVerification {
  ok: boolean;
  /** Machine-readable cause for safe diagnostic tallies (never a URL). */
  reason:
    | "verified-mp4-path"
    | "verified-content-type"
    | "untrusted-host"
    | "malformed-url"
    | "expired-or-forbidden"
    | "not-found"
    | "unexpected-status"
    | "unsafe-redirect"
    | "too-many-redirects"
    | "probe-failed"
    | "degenerate-payload"
    | "not-mp4-payload"
    | "audio-only-payload";
  /** Log-safe CDN identity (host + pathname, no query). */
  cdnHost: string | null;
  contentType: string | null;
  /** Total upstream size in bytes when the CDN reported it (null = unknown). */
  contentLength: number | null;
  /**
   * Track handler types seen in the probe window. `null` means "unknown" — the
   * `moov` box was not fully inside the probe window, so the payload is NOT
   * classified and never rejected on this basis.
   */
  hasVideoTrack: boolean | null;
  hasAudioTrack: boolean | null;
}

function verifyFail(
  reason: VideoVerification["reason"],
  cdnHost: string | null = null
): VideoVerification {
  return {
    ok: false,
    reason,
    cdnHost,
    contentType: null,
    contentLength: null,
    hasVideoTrack: null,
    hasAudioTrack: null,
  };
}

/** True when the first bytes look like an ISO-BMFF (MP4) container. */
function looksLikeMp4(bytes: Uint8Array): boolean {
  if (bytes.length < 8) return false;
  const box = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]);
  return (MP4_BOX_TYPES as readonly string[]).includes(box);
}

interface Mp4Box {
  type: string;
  end: number;
  dataStart: number;
}

/**
 * Read one ISO-BMFF box header at `offset`, bounded by `limit`.
 *
 * Returns null (rather than guessing) whenever the box is truncated by the
 * probe window, malformed, or declares a 64-bit size — callers then treat the
 * track layout as unknown instead of misclassifying the payload.
 */
function readMp4Box(bytes: Uint8Array, offset: number, limit: number): Mp4Box | null {
  if (offset + 8 > limit) return null;
  const size =
    ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
  const type = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]);
  let dataStart = offset + 8;
  if (size === 1) {
    if (offset + 16 > limit) return null;
    const high =
      ((bytes[offset + 8] << 24) | (bytes[offset + 9] << 16) | (bytes[offset + 10] << 8) | bytes[offset + 11]) >>> 0;
    if (high !== 0) return null;
    const low =
      ((bytes[offset + 12] << 24) |
        (bytes[offset + 13] << 16) |
        (bytes[offset + 14] << 8) |
        bytes[offset + 15]) >>>
      0;
    dataStart = offset + 16;
    const extended = low;
    if (extended < dataStart - offset) return null;
    const end = offset + extended;
    if (end > limit) return null;
    return { type, end, dataStart };
  }
  const boxSize = size === 0 ? limit - offset : size;
  if (boxSize < dataStart - offset) return null;
  const end = offset + boxSize;
  if (end > limit) return null;
  return { type, end, dataStart };
}

/** The `hdlr` handler type of a `trak` box, or null when it is not visible. */
function mp4TrackHandler(bytes: Uint8Array, trak: Mp4Box): string | null {
  let m = trak.dataStart;
  let mdia: Mp4Box | null = null;
  while (m + 8 <= trak.end) {
    const box = readMp4Box(bytes, m, trak.end);
    if (!box) return null;
    if (box.type === "mdia") {
      mdia = box;
      break;
    }
    m = box.end;
  }
  if (!mdia) return null;
  let h = mdia.dataStart;
  while (h + 8 <= mdia.end) {
    const box = readMp4Box(bytes, h, mdia.end);
    if (!box) return null;
    if (box.type === "hdlr") {
      // version+flags (4 bytes) then pre_defined (4 bytes), then handler_type.
      const at = box.dataStart + 8;
      if (at + 4 > box.end) return null;
      return String.fromCharCode(bytes[at], bytes[at + 1], bytes[at + 2], bytes[at + 3]);
    }
    h = box.end;
  }
  return null;
}

/**
 * Report which track handler types the probe window exposes.
 *
 * Instagram publishes a Reel as SPLIT TRACKS: a video-only MP4 plus a separate
 * audio-only MP4 for the same clip. The audio file is a perfectly valid ISO-BMFF
 * container served as `video/mp4` and usually larger than the minimum playable
 * size, so container + size checks alone cannot tell the two apart — only the
 * `moov` track list can.
 *
 * Returns null when the `moov` box is not fully inside the probe window, so a
 * real video that keeps its `moov` at the end of the file is never misjudged.
 */
export function mp4TrackKinds(bytes: Uint8Array): { video: boolean; audio: boolean } | null {
  if (bytes.length < 16) return null;
  let moov: Mp4Box | null = null;
  let o = 0;
  while (o + 8 <= bytes.length) {
    const box = readMp4Box(bytes, o, bytes.length);
    if (!box) return null;
    if (box.type === "moov") {
      moov = box;
      break;
    }
    o = box.end;
  }
  if (!moov) return null;
  let video = false;
  let audio = false;
  let seen = false;
  let t = moov.dataStart;
  while (t + 8 <= moov.end) {
    const box = readMp4Box(bytes, t, moov.end);
    if (!box) break;
    if (box.type === "trak") {
      const handler = mp4TrackHandler(bytes, box);
      if (handler === "vide") {
        video = true;
        seen = true;
      } else if (handler === "soun") {
        audio = true;
        seen = true;
      }
    }
    t = box.end;
  }
  return seen ? { video, audio } : null;
}

/** Total size from `Content-Range: bytes 0-65535/1234567`, else Content-Length. */
function totalSizeFrom(response: Response): number | null {
  const range = response.headers.get("content-range");
  if (range) {
    const match = /\/(\d+)\s*$/.exec(range);
    if (match) {
      const total = Number.parseInt(match[1], 10);
      if (Number.isFinite(total) && total > 0) return total;
    }
  }
  const length = response.headers.get("content-length");
  if (length) {
    const parsed = Number.parseInt(length, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

/**
 * Confirm a candidate is a playable video source WITHOUT downloading it.
 *
 * Rules:
 * - Only https URLs on the Instagram/Facebook CDN allowlist are probed
 *   (SSRF trust gate identical to the media proxy).
 * - One bounded ranged GET (`bytes=0-65535`) is issued with the same upstream
 *   identity the stream proxy uses (UA + video Accept + Instagram Referer) and
 *   cancelled after the first chunk, so a candidate is proven real without ever
 *   buffering the video. The old probe trusted any `.mp4` path and any
 *   `video/*` header, which let Instagram's placeholder/stub renditions through
 *   and broke playback with an unplayable file.
 * - A candidate passes only when the response is 200/206, the content type is
 *   `video/*`, the payload starts with an MP4 box, and the reported total size
 *   clears MIN_PLAYABLE_VIDEO_BYTES.
 * - Up to VERIFY_MAX_REDIRECTS are followed manually, each hop re-checked
 *   against the allowlist + private-host guard, so an open-redirect on the
 *   CDN can never turn the probe into an SSRF fetch.
 * - 401/403/404/410 mean the signed URL is expired or revoked: reported as
 *   such (the stream layer owns the single re-resolve recovery), never
 *   retried here — no retry loop.
 */
export async function verifyVideoCandidate(raw: string): Promise<VideoVerification> {
  if (!isTrustedCdnUrl(raw)) return verifyFail("untrusted-host");
  let current: string;
  try {
    current = unescapeInstagramString(raw);
    // Throws on malformed input.
    new URL(current);
  } catch {
    return verifyFail("malformed-url");
  }
  current = withoutEmbeddedByteSlice(current);

  for (let hop = 0; hop <= VERIFY_MAX_REDIRECTS; hop++) {
    let parsed: URL;
    try {
      parsed = new URL(current);
    } catch {
      return verifyFail("malformed-url");
    }
    // Every hop (including the first) must stay on the trust allowlist:
    // a redirect target is attacker-influenced and re-checked from scratch.
    if (parsed.protocol !== "https:" || !isCdnMediaHost(parsed.hostname)) {
      return verifyFail("unsafe-redirect", parsed.hostname.toLowerCase());
    }
    if (isPrivateOrReservedHost(parsed.hostname.toLowerCase())) {
      return verifyFail("unsafe-redirect", parsed.hostname.toLowerCase());
    }
    const cdnHost = parsed.hostname.toLowerCase();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);
    // A probe must never keep the process alive on its own.
    timer.unref?.();
    let response: Response | null = null;
    try {
      response = await fetch(current, {
        method: "GET",
        headers: { ...VERIFY_HEADERS, Range: `bytes=0-${VERIFY_PROBE_BYTES - 1}` },
        redirect: "manual",
        signal: controller.signal,
      });
    } catch {
      clearTimeout(timer);
      return verifyFail("probe-failed", cdnHost);
    } finally {
      clearTimeout(timer);
    }

    const status = response.status;
    const contentType = (response.headers.get("content-type") || "").toLowerCase();

    if (status === 200 || status === 206) {
      // Read at most the probe window, then cancel: the point is to see the
      // container header, never to buffer the video.
      let head = new Uint8Array(0);
      try {
        const reader = response.body?.getReader();
        if (reader) {
          const first = await reader.read();
          if (first.value) head = first.value.slice(0, VERIFY_PROBE_BYTES);
          await reader.cancel().catch(() => {});
        }
      } catch {
        // Body already consumed/unavailable: fall through to the header checks.
      }
      await response.body?.cancel().catch(() => {});

      // A 200/206 that is NOT video (HTML login page, thumbnail, JSON error) is
      // precisely the "wrong media candidate" case: reject, do not degrade.
      const isVideoContentType =
        contentType.startsWith("video/") ||
        ((contentType.includes("octet-stream") || contentType === "") &&
          (head.length === 0 || looksLikeMp4(head) || /\.mp4(?:$|[?#])/i.test(parsed.pathname + parsed.search)));
      if (!isVideoContentType) {
        return verifyFail("unexpected-status", cdnHost);
      }
      const totalSize = totalSizeFrom(response);
      if (head.length > 0 && !looksLikeMp4(head)) {
        return verifyFail("not-mp4-payload", cdnHost);
      }
      // Split-track detection: a valid container with an audio track and no
      // video track is Instagram's separate audio rendition for a Reel, never a
      // playable video. Rejected as a video candidate and surfaced as the
      // paired audio track during assembly. `tracks` is null when the `moov`
      // box fell outside the probe window, which leaves this payload undecided.
      const tracks = mp4TrackKinds(head);
      const hasVideoTrack = tracks ? tracks.video : null;
      const hasAudioTrack = tracks ? tracks.audio : null;
      if (tracks && !tracks.video && tracks.audio) {
        return {
          ...verifyFail("audio-only-payload", cdnHost),
          contentType: contentType.split(";")[0] || null,
          contentLength: totalSize,
          hasVideoTrack,
          hasAudioTrack,
        };
      }
      if (totalSize !== null && totalSize < MIN_PLAYABLE_VIDEO_BYTES) {
        return verifyFail("degenerate-payload", cdnHost);
      }
      return {
        ok: true,
        reason: /\.mp4(?:$|[?#])/i.test(parsed.pathname + parsed.search)
          ? "verified-mp4-path"
          : "verified-content-type",
        cdnHost,
        contentType: contentType.split(";")[0],
        contentLength: totalSize,
        hasVideoTrack,
        hasAudioTrack,
      };
    }
    if (status >= 300 && status < 400) {
      const location = response.headers.get("location");
      if (!location) return verifyFail("unsafe-redirect", cdnHost);
      let next: string;
      try {
        next = new URL(location, current).toString();
      } catch {
        return verifyFail("unsafe-redirect", cdnHost);
      }
      if (hop === VERIFY_MAX_REDIRECTS) return verifyFail("too-many-redirects", cdnHost);
      current = next;
      continue;
    }
    if (status === 401 || status === 403 || status === 404 || status === 410) {
      return {
        ...verifyFail(status === 404 ? "not-found" : "expired-or-forbidden", cdnHost),
        contentType: contentType || null,
      };
    }
    if (status === 429) {
      return verifyFail("unexpected-status", cdnHost);
    }
    return verifyFail("unexpected-status", cdnHost);
  }
  return verifyFail("too-many-redirects");
}

async function isVerifiedVideoUrl(raw: string): Promise<boolean> {
  return (await verifyVideoCandidate(raw)).ok;
}

/**
 * Bounded number of CDN probes the no-browser fast paths may spend ranking
 * video candidates. One bounded ranged GET per candidate — never a fan-out,
 * never a loop, never a new Instagram page request (the pool is built only
 * from documents already fetched).
 */
const MAX_FASTPATH_SELECTION_PROBES = 6;

export interface ReelVideoSelection {
  videoUrl: string;
  size: number;
  /** True when the probe saw both a video and an audio track in one file. */
  combined: boolean;
  /** Same-clip split audio rendition, paired when the video is not combined. */
  audioUrl: string | null;
  probedCount: number;
}

/**
 * Ranked Reel/video candidate selection for the no-browser fast paths.
 *
 * EXACT POINT WHERE AUDIO WAS LOST: the fast paths returned the FIRST
 * verified video URL (og:video, then embed order) with no audio ranking, so a
 * video-only rendition won while an audible rendition for the same clip sat
 * later in the pool — the preview played silent behind a visible speaker
 * icon, and /api/audio received a file with no audio stream.
 *
 * Rules (same as the browser assembly, enforced here for the fast paths):
 *  - an audio-only rendition is NEVER selected as the video;
 *  - a combined (video+audio) rendition outranks a larger silent one;
 *  - otherwise the largest verified video wins, with the largest split audio
 *    rendition paired as `audioUrl` when the winner is not combined;
 *  - null when no candidate verifies (caller falls through to the browser).
 * Never throws: a probe failure just skips that candidate.
 */
export async function selectReelVideo(
  candidates: Array<{ url: string }>,
  maxProbes = MAX_FASTPATH_SELECTION_PROBES
): Promise<ReelVideoSelection | null> {
  const seen = new Set<string>();
  const videos: Array<{ url: string; size: number; combined: boolean }> = [];
  const audios: Array<{ url: string; size: number }> = [];
  let probed = 0;
  for (const candidate of candidates) {
    const raw = candidate?.url;
    if (typeof raw !== "string" || raw.length === 0 || seen.has(raw)) continue;
    seen.add(raw);
    if (probed >= maxProbes) break;
    probed++;
    let check: VideoVerification;
    try {
      check = await verifyVideoCandidate(raw);
    } catch {
      continue;
    }
    if (check.reason === "audio-only-payload") {
      audios.push({ url: raw, size: check.contentLength ?? 0 });
      continue;
    }
    if (!check.ok) continue;
    videos.push({
      url: raw,
      size: check.contentLength ?? 0,
      combined: check.hasVideoTrack === true && check.hasAudioTrack === true,
    });
  }
  if (videos.length === 0) return null;
  // Audible outranks bytes (same rule as compareReelVideoCandidates); size
  // breaks ties within each tier.
  videos.sort((a, b) => Number(b.combined) - Number(a.combined) || b.size - a.size);
  audios.sort((a, b) => b.size - a.size);
  const winner = videos[0];
  return {
    videoUrl: winner.url,
    size: winner.size,
    combined: winner.combined,
    audioUrl: !winner.combined && audios.length > 0 ? audios[0].url : null,
    probedCount: probed,
  };
}

/**
 * Merge the embed endpoint's structured sidecar items and tag-scraped media
 * into one deduplicated candidate list (first-seen order). Shared by the
 * og:video fast path and the embed fast path so both rank the same pool.
 */
function collectEmbedCandidates(embedHtml: string): ExtractedMedia[] {
  const embedSidecar = extractSidecarFromEmbedHtml(embedHtml);
  const embedMedia = extractMediaFromHtml(embedHtml);
  const combined: ExtractedMedia[] = [...embedSidecar.items];
  for (const item of embedMedia) {
    if (!combined.some((m) => m.url === item.url)) {
      combined.push(item);
    }
  }
  return combined;
}

/**
 * Plain-HTTP page fetch shared by metadata extraction and the dedicated
 * audio-page resolver. Returns raw HTML, or null on any failure.
 */
interface PageFetchResult {
  html: string | null;
  status: number | null;
  contentType: string | null;
  finalHost: string | null;
  finalPath: string | null;
  error: string | null;
  /**
   * Upstream `Retry-After` (seconds, clamped) when Instagram sent one with a
   * throttle response. Null otherwise. Lets the resolve routes answer a
   * genuine 429 with the same backoff Instagram asked for.
   */
  retryAfterSeconds: number | null;
}

/**
 * Parse an upstream `Retry-After` value (delta-seconds or HTTP-date) into a
 * bounded second count. Null when absent or unparsable — never NaN, never
 * negative, never unbounded.
 */
export function parseRetryAfterSeconds(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const delta = Number.parseInt(trimmed, 10);
  if (Number.isSafeInteger(delta) && delta >= 0) {
    return Math.min(delta, 300);
  }
  const when = Date.parse(trimmed);
  if (Number.isFinite(when)) {
    const seconds = Math.ceil((when - Date.now()) / 1000);
    if (seconds > 0) return Math.min(seconds, 300);
  }
  return null;
}

async function fetchPageSnapshot(url: string, timeoutMs = 10_000): Promise<PageFetchResult> {
  try {
    // Instagram serves anonymous clients a video-stripped page (HTTP 200 but
    // no playable video data anywhere). When the operator configured the
    // server-side viewer session, attach it so reels/videos/posts resolve
    // with real media. The secret travels only to instagram.com, is
    // CR/LF-guarded at the source, and is never logged (only a boolean).
    // Use DESKTOP_UA for Reel/Video/Post pages: Instagram's bot-detection
    // strips og:video and all playable video URLs from mobile-identity
    // responses (HTTP 200, no login-wall, but zero media). The same bisect
    // that fixed the Puppeteer navigation identity (see lines below) applies
    // here: desktop UA returns the full media document including og:video.
    // Stories stay on MOBILE_UA — they are fetched for metadata only (image
    // extraction, og:image) and their extraction path does not depend on og:video.
    const isVideoContent = /instagram\.com\/(reel|p|tv)\//i.test(url);
    const headers: Record<string, string> = {
      "User-Agent": isVideoContent ? DESKTOP_UA : MOBILE_UA,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      ...(isVideoContent ? { "Sec-Fetch-Mode": "navigate", "Sec-Fetch-Site": "none", "Sec-Fetch-User": "?1" } : {}),
    };
    const sessionCookie = getInstagramSessionCookie();
    if (sessionCookie) {
      headers.Cookie = sessionCookie;
    }
    const res = await fetch(url, {
      headers,
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
    });

    const ct = res.headers.get("content-type") || "";
    const final = new URL(res.url || url);
    const base = {
      status: res.status,
      contentType: ct || null,
      finalHost: final.hostname,
      finalPath: final.pathname,
      error: null,
      retryAfterSeconds: parseRetryAfterSeconds(res.headers.get("retry-after")),
    };
    if (!res.ok || (!ct.includes("text/html") && !ct.includes("application/xhtml"))) {
      await res.body?.cancel().catch(() => {});
      return { ...base, html: null };
    }
    let bodyTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      const bodyTimeout = new Promise<never>((_, reject) => {
        bodyTimer = setTimeout(() => reject(new Error("page-body-timeout")), timeoutMs);
      });
      const html = await Promise.race([res.text(), bodyTimeout]);
      return { ...base, html };
    } catch (error) {
      await res.body?.cancel().catch(() => {});
      return {
        ...base,
        html: null,
        error: error instanceof Error ? error.name : "page-body-failed",
      };
    } finally {
      if (bodyTimer) clearTimeout(bodyTimer);
    }
  } catch (error) {
    return {
      html: null,
      status: null,
      contentType: null,
      finalHost: null,
      finalPath: null,
      error: error instanceof Error ? error.name : "fetch-failed",
      retryAfterSeconds: null,
    };
  }
}

export async function fetchPageHtml(url: string, timeoutMs = 10_000): Promise<string | null> {
  return (await fetchPageSnapshot(url, timeoutMs)).html;
}

/**
 * Detect the anonymous-access blocks Instagram puts in front of a page fetch,
 * so a blocked request is reported honestly instead of being carried on into
 * Chromium and surfacing as a misleading "no media found".
 *
 * - HTTP 429 ONLY is the explicit throttle response (genuine rate limiting).
 *   A 403 is NOT throttling: it is Instagram refusing this client/URL
 *   (bot-defence, forbidden, revoked), and mislabelling it as a rate limit
 *   is exactly what produced false "Instagram is rate-limiting requests"
 *   errors for ordinary failures. A 403 page is left to the normal flow so it
 *   fails honestly (VIDEO_SOURCE_NOT_FOUND / CONTENT_UNAVAILABLE).
 * - A redirect onto the login route: Instagram serves the login page to
 *   gated/anonymous clients instead of the post. Only treated as a block when
 *   no usable HTML came back, so a genuine private post (which still returns
 *   the real page) is unaffected. This is a gate, not throttling, so it never
 *   maps to a rate-limit code.
 *
 * Returns a machine-readable reason, or null when the page is usable.
 */
export function detectInstagramAccessBlock(meta: {
  pageStatus: number | null;
  pageFinalPath: string | null;
  pageFinalHost: string | null;
  htmlLength: number;
}): "rate-limited" | "login-redirect" | null {
  if (meta.pageStatus === 429) return "rate-limited";
  if (
    /^\/(accounts\/)?login\/?$/i.test(meta.pageFinalPath ?? "") &&
    (meta.htmlLength === 0 || /instagram\.com$/i.test(meta.pageFinalHost ?? ""))
  ) {
    return "login-redirect";
  }
  return null;
}

function isLikelyProfileImageUrl(url: string): boolean {
  try {
    return /\/t51\.[^/]+-19\//i.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

function isLikelyStaticInstagramAssetUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase() === "static.cdninstagram.com" || parsed.pathname.startsWith("/rsrc.php");
  } catch {
    return false;
  }
}

export async function fetchMetadata(url: string): Promise<{
  ogImage: string | null;
  ogVideo: string | null;
  embeddedMedia: ExtractedMedia[];
  pageStatus: number | null;
  pageContentType: string | null;
  pageFinalHost: string | null;
  pageFinalPath: string | null;
  pageError: string | null;
  pageRetryAfterSeconds: number | null;
  htmlLength: number;
  hasChallenge: boolean;
  title: string | null;
  description: string | null;
  author: Author | null;
  loginWall: boolean;
}> {
  const empty = {
    ogImage: null,
    ogVideo: null,
    embeddedMedia: [],
    pageStatus: null,
    pageContentType: null,
    pageFinalHost: null,
    pageFinalPath: null,
    pageError: null,
    pageRetryAfterSeconds: null,
    htmlLength: 0,
    hasChallenge: false,
    title: null,
    description: null,
    author: extractAuthorFromUrl(url),
    loginWall: false,
  };
  try {
    const page = await fetchPageSnapshot(url);
    const html = page.html;
    const pageInfo = {
      pageStatus: page.status,
      pageContentType: page.contentType,
      pageFinalHost: page.finalHost,
      pageFinalPath: page.finalPath,
      pageError: page.error,
      pageRetryAfterSeconds: page.retryAfterSeconds,
      htmlLength: html?.length || 0,
    };
    if (!html) return { ...empty, ...pageInfo };

    const hasChallenge = /suspicious activity|verify your identity/i.test(html);

    // Instagram serves its login page (with ITS OWN og:image) to anonymous
    // requests for gated content. Never treat that as the post's media.
    if (
      html.includes('name="username"') ||
      html.includes("Log in to Instagram") ||
      html.includes("loginForm") ||
      html.includes('"requireLogin":true')
    ) {
      return { ...empty, ...pageInfo, hasChallenge, loginWall: true };
    }

    const ogImageMatch =
      html.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/) ||
      html.match(/content=["']([^"']+)["'][^>]*property=["']og:image["']/) ||
      html.match(/name=["']twitter:image["'][^>]*content=["']([^"']+)["']/);

    const ogVideoMatch =
      html.match(/property=["']og:video(?:_secure_url)?["'][^>]*content=["']([^"']+)["']/) ||
      html.match(/content=["']([^"']+)["'][^>]*property=["']og:video(?:_secure_url)?["']/) ||
      html.match(/name=["']twitter:player:stream["'][^>]*content=["']([^"']+)["']/);

    const rawImage = ogImageMatch ? unescapeInstagramString(ogImageMatch[1]) : null;
    let rawVideo = ogVideoMatch ? unescapeInstagramString(ogVideoMatch[1]) : null;

    // No-browser fallback scan: some pages embed video data as JSON without
    // an og:video tag. Same patterns (and CDN trust gate below) as the
    // Puppeteer interception path, so serverless resolves gain coverage.
    const embeddedMedia = extractMediaFromJson(html).filter((item) => isTrustedCdnUrl(item.url));
    if (!rawVideo) {
      for (const item of embeddedMedia) {
        if (item.type === "video") {
          rawVideo = item.url;
          break;
        }
      }
    }

    return {
      ogImage: rawImage && isTrustedCdnUrl(rawImage) ? rawImage : null,
      ogVideo: rawVideo && isTrustedCdnUrl(rawVideo) ? rawVideo : null,
      embeddedMedia,
      ...pageInfo,
      hasChallenge,
      title: extractTitleFromHtml(html),
      description: extractDescriptionFromHtml(html),
      author: extractAuthorFromHtml(html) || extractAuthorFromUrl(url),
      loginWall: false,
    };
  } catch {
    return empty;
  }
}

const SIDECAR_PAGE_TIMEOUT_MS = 8_000;
// Keep following pagination until Instagram says the collection is complete;
// the ceiling is only a defensive guard against a malformed cursor loop.
const SIDECAR_MAX_EXTRA_PAGES = 100;

/**
 * Follow a sidecar `end_cursor` with a plain-HTTP request against the same API
 * endpoint the browser used. Returns the next structured page, or null when
 * the provider refuses (login/session-gated — the caller keeps whatever was
 * already collected and logs the outcome honestly). Never throws.
 */
async function fetchSidecarPage(requestUrl: string, endCursor: string): Promise<SidecarPage | null> {
  try {
    let url = requestUrl;
    const encoded = encodeURIComponent(endCursor);
    if (/"after":"[^"]*"/.test(url)) {
      url = url.replace(/"after":"[^"]*"/, `"after":"${endCursor}"`);
    } else if (/after%22%3A%22[^&"]*/i.test(url)) {
      url = url.replace(/after%22%3A%22[^&"]*/i, `after%22%3A%22${encoded}`);
    } else if (/([?&])after=([^&]*)/.test(url)) {
      url = url.replace(/([?&])after=([^&]*)/, `$1after=${encoded}`);
    } else {
      url = `${url}${url.includes("?") ? "&" : "?"}after=${encoded}`;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SIDECAR_PAGE_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": MOBILE_UA,
          Accept: "application/json",
          "Accept-Language": "en-US,en;q=0.9",
          Referer: "https://www.instagram.com/",
          "X-IG-App-ID": "936619743392459",
        },
        redirect: "manual",
      });
      const ct = res.headers.get("content-type") || "";
      if (!res.ok || !ct.includes("json")) {
        await res.body?.cancel().catch(() => {});
        return null;
      }
      const text = await res.text();
      return extractSidecarFromJson(text);
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null;
  }
}

export class PuppeteerProvider extends BaseProvider {
  readonly name = "puppeteer";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private browser: any = null;
  private launching: Promise<void> | null = null;
  private closing = false;
  private lastUsedAt = 0;
  /** Idle timer that releases Chromium memory when traffic goes quiet. */
  private idleTimer: NodeJS.Timeout | null = null;
  /** Live page-slot leases (released in `resolveInternal`'s finally). */
  private pageSlotLeases: Lease[] = [];

  /** Is the retained browser handle still attached to a live process? */
  private isBrowserConnected(): boolean {
    const browser = this.browser;
    if (!browser) return false;
    try {
      if (typeof browser.isConnected === "function") return Boolean(browser.isConnected());
      if (typeof browser.connected === "boolean") return browser.connected;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Drop the browser handle so the next use relaunches Chromium. Used after
   * a dead-connection failure so the SAME URL works again on retry instead of
   * every future resolve failing with the stale handle.
   *
   * `resetBrowser` is now strictly serialised: a launch already in flight is
   * left to finish, and a handle installed after a reset is closed instead of
   * leaked. That removes the double-launch/orphan race.
   */
  private resetBrowser(reason: string): void {
    const had = Boolean(this.browser);
    this.browser = null;
    this.lastUsedAt = 0;
    this.clearIdleTimer();
    if (this.launching) {
      // A launch is in flight. When it settles it installs its own handle;
      // remember we want it gone so it is closed instead of retained.
      void this.launching
        .then(() => this.closeOrphanedBrowser())
        .catch(() => {});
      return;
    }
    if (had) {
      logger.warn("Puppeteer browser handle reset", { reason });
    }
  }

  /** Close a browser that was installed after a reset requested. */
  private async closeOrphanedBrowser(): Promise<void> {
    const orphan = this.browser;
    this.browser = null;
    if (!orphan) return;
    try {
      await orphan.close();
      logger.info("Puppeteer orphaned browser closed");
    } catch {
      /* already gone */
    }
  }

  private clearIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  /**
   * Chromium keeps hundreds of MB resident. When traffic goes quiet, release
   * it rather than holding that memory for the life of the process. The next
   * resolve relaunches transparently.
   */
  private scheduleIdleRelease(): void {
    this.clearIdleTimer();
    if (!this.browser || BROWSER_IDLE_TTL_MS <= 0) return;
    const timer = setTimeout(() => {
      this.idleTimer = null;
      if (this.pageSlotLeases.length > 0) {
        this.scheduleIdleRelease();
        return;
      }
      if (this.browser) {
        void this.closeBrowser("idle-timeout");
      }
    }, BROWSER_IDLE_TTL_MS);
    // Never let the idle timer hold the process open.
    timer.unref?.();
    this.idleTimer = timer;
  }

  private async closeBrowser(reason: string): Promise<void> {
    const browser = this.browser;
    this.browser = null;
    this.lastUsedAt = 0;
    this.clearIdleTimer();
    if (!browser) return;
    try {
      await browser.close();
      logger.info("Puppeteer browser closed", { reason });
    } catch (err) {
      logger.warn("Puppeteer browser close failed", {
        reason,
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  private async ensureBrowser(): Promise<void> {
    if (isDraining()) {
      throw createError("SERVER_SHUTTING_DOWN");
    }
    // A retained handle can outlive the Chromium it points at (crash, OOM
    // kill, idle teardown). Detect that up front and relaunch — otherwise
    // every resolve after the first death fails with "Connection closed.".
    if (this.browser && !this.isBrowserConnected()) {
      this.resetBrowser("stale-handle-detected");
    }
    if (this.browser) {
      this.lastUsedAt = Date.now();
      this.scheduleIdleRelease();
      return;
    }
    if (this.launching) {
      await this.launching;
      this.lastUsedAt = Date.now();
      return;
    }

    // One launch at a time per process, ever. Concurrent launches were the
    // source of duplicate Chromium processes under load.
    this.launching = (async () => {
      if (isServerlessRuntime()) {
        await this.launchServerless();
      } else {
        const p = await getPuppeteer();
        this.browser = await p.default.launch({
          headless: true,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--disable-features=VizDisplayCompositor",
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-extensions",
            "--disable-blink-features=AutomationControlled",
            // Bounded per-tab memory so one heavy page cannot balloon the
            // renderer set and OOM the instance.
            "--js-flags=--max-old-space-size=512",
            "--renderer-process-limit=2",
          ],
        });
      }
      this.lastUsedAt = Date.now();
      this.scheduleIdleRelease();

      // Apply stealth patches manually
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pages = await this.browser!.pages();
      for (const pg of pages) {
        await applyStealthPatches(pg);
      }

      logger.info("Puppeteer browser launched (stealth-patched)");
    })()
      .catch((err) => {
        // Never cache a failed launch: a rejected `launching` promise would
        // poison every later resolve. Clear it so the next attempt retries.
        this.browser = null;
        throw err;
      })
      .finally(() => {
        this.launching = null;
      });

    await this.launching;
  }

  /**
   * Open a page with ONE bounded recovery: if the connection is already dead
   * (the classic `Connection closed.` from a stale handle), relaunch the
   * browser and try once more. This keeps a dead browser from becoming a
   * user-visible failure on the very next request.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async openPageWithRecovery(): Promise<any> {
    try {
      await this.ensureBrowser();
      return await this.browser!.newPage();
    } catch (err) {
      if (!isConnectionLostError(err)) throw err;
      this.resetBrowser("newPage-failed");
      logger.warn("Puppeteer newPage hit a closed connection — relaunching once");
      await this.ensureBrowser();
      return await this.browser!.newPage();
    }
  }

  /**
   * Vercel/serverless launch path: headless-shell Chromium provided by
   * @sparticuz/chromium, driven via puppeteer-core. No locally installed
   * Chrome is used or required. The local launch path above is untouched.
   */
  private async launchServerless(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const coreMod = (await import("puppeteer-core")) as any;
    const core = coreMod.default ?? coreMod;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chromiumMod = (await import("@sparticuz/chromium")) as any;
    const chromium = chromiumMod.default ?? chromiumMod;

    // No WebGL needed for DOM/API extraction; skips swiftshader extraction.
    chromium.setGraphicsMode = false;
    const executablePath: string = await chromium.executablePath();
    const defaultArgsFn =
      typeof core.defaultArgs === "function" ? core.defaultArgs.bind(core) : null;
    const args: string[] = defaultArgsFn
      ? await defaultArgsFn({ args: chromium.args, headless: "shell" })
      : [...(chromium.args as string[])];

    this.browser = await core.launch({
      args,
      defaultViewport: { width: 375, height: 812, isMobile: true, hasTouch: true },
      executablePath,
      headless: "shell",
    });

    logger.info("Puppeteer serverless browser launched (@sparticuz/chromium)");
  }

  /**
   * Bounded browser concurrency. The central `puppeteer` workload gate is the
   * single source of truth for this ceiling (limit/queue/stale are read from the
   * same MAX_CONCURRENT_PAGES / PUPPETEER_QUEUE_WAIT_MS / PUPPETEER_STALE_MS
   * env vars) so `/api/health/capacity` reports the REAL number of in-flight
   * browser jobs instead of a parallel, invisible counter.
   *
   * Returns a lease the caller MUST release, or `null` when the queue window
   * elapsed (a controlled 503) or the caller went away.
   */
  private async acquirePageSlot(signal?: AbortSignal): Promise<Lease | null> {
    try {
      const lease = await getGate("puppeteer").acquire({ signal, waitMs: PAGE_SLOT_QUEUE_MS });
      this.pageSlotLeases.push(lease);
      return lease;
    } catch (err) {
      if (signal?.aborted) return null;
      logger.warn("Puppeteer page slot refused", {
        reason: err instanceof Error ? err.message : "unknown",
        inFlight: getGate("puppeteer").inFlight,
        limit: getGate("puppeteer").limit,
      });
      return null;
    }
  }

  /**
   * Fast path: plain-HTML metadata already yielded a direct video URL.
   * Used for Story and audio-clip recoveries, where a single verified video
   * is the whole result. REEL/VIDEO pages use the ranked selectReelVideo()
   * path instead, which compares every collected rendition for audio.
   */
  private async buildResultFromVideo(
    url: string,
    videoUrl: string,
    meta: { ogImage: string | null; title: string | null; description: string | null; author: Author | null }
  ): Promise<ResolverResult | null> {
    // Safe diagnostic: WHY a fast-path video was accepted or dropped. Only
    // the CDN host (no query/token) is logged, never the signed URL.
    const verification = await verifyVideoCandidate(videoUrl);
    if (!verification.ok) {
      logger.warn("Puppeteer fast-path video rejected, falling back to browser", {
        contentType: this.detectContentType(url),
        reason: verification.reason,
        cdnHost: verification.cdnHost,
        hasSession: isInstagramSessionConfigured(),
      });
      return null;
    }
    const contentType = this.detectContentType(url);
    const author = meta.author || extractAuthorFromUrl(url);
    const decodedAuthor: Author | null = author
      ? {
          username: author.username,
          displayName: author.displayName ? decodeHtmlEntities(author.displayName) : null,
        }
      : null;
    const rawTitle = meta.title || meta.description;
    const media: MediaItem[] = [
      {
        url: videoUrl,
        type: "video",
        width: null,
        height: null,
        duration: null,
        thumbnail: meta.ogImage,
        format: "mp4",
      },
    ];
    const combined =
      verification.hasVideoTrack === true && verification.hasAudioTrack === true;
    logger.info("Puppeteer resolve via fast metadata path (no browser)", {
      contentType,
      verifyReason: verification.reason,
      cdnHost: verification.cdnHost,
      upstreamContentType: verification.contentType,
      mediaCount: 1,
      selectedMediaType: "video",
      combined,
    });
    return {
      type: contentType,
      sourceUrl: url,
      thumbnail: meta.ogImage,
      title: rawTitle ? decodeHtmlEntities(rawTitle) : null,
      author: decodedAuthor,
      media,
    };
  }

  /**
   * Build a REEL/VIDEO result from a ranked selection. The video URL is
   * already probe-verified by selectReelVideo; the paired split audio (when
   * present) rides along as `audioUrl` so the preview plays sound through the
   * hidden companion track and /api/audio extracts the real clip audio.
   */
  private buildReelResult(
    url: string,
    selection: ReelVideoSelection,
    meta: { ogImage: string | null; title: string | null; description: string | null; author: Author | null }
  ): ResolverResult {
    const contentType = this.detectContentType(url);
    const author = meta.author || extractAuthorFromUrl(url);
    const decodedAuthor: Author | null = author
      ? {
          username: author.username,
          displayName: author.displayName ? decodeHtmlEntities(author.displayName) : null,
        }
      : null;
    const rawTitle = meta.title || meta.description;
    const media: MediaItem[] = [
      {
        url: selection.videoUrl,
        type: "video",
        width: null,
        height: null,
        duration: null,
        thumbnail: meta.ogImage,
        format: "mp4",
        ...(selection.audioUrl ? { audioUrl: selection.audioUrl } : {}),
      },
    ];
    if (!selection.combined && !selection.audioUrl) {
      // Honest signal, not an error: verified playable video, but no audible
      // rendition was found in the collected pool.
      logger.warn("Puppeteer fast-path video-only, no paired audio in pool", {
        contentType,
        probed: selection.probedCount,
      });
    } else {
      logger.info("Puppeteer fast-path audible selection", {
        contentType,
        combined: selection.combined,
        audioPaired: Boolean(selection.audioUrl),
        probed: selection.probedCount,
        selectedMediaHost: hostnameOf(selection.videoUrl),
      });
    }
    return {
      type: contentType,
      sourceUrl: url,
      thumbnail: meta.ogImage,
      title: rawTitle ? decodeHtmlEntities(rawTitle) : null,
      author: decodedAuthor,
      media,
    };
  }

  /**
   * Provider entry point.
   *
   * Adds the two guarantees the internal implementation cannot give by itself:
   *  - a HARD deadline, so a hung page/evaluate can never hold a page slot
   *    and a browser connection forever;
   *  - cancellation, so a client that disconnects (or a shutdown) stops the
   *    expensive browser work instead of finishing into the void.
   *
   * The inner work is abandoned on timeout, but its page and slot are still
   * released because the `finally` in the internal implementation runs when
   * the page/browser is torn down; the abandoned promise is explicitly
   * swallowed so it can never surface as an unhandled rejection.
   */
  async resolve(
    url: string,
    onProgress?: ResolveProgressCallback,
    options?: ResolveCallOptions
  ): Promise<ResolverResult> {
    const controller = new AbortController();
    const external = options?.signal;
    const onExternalAbort = (): void => controller.abort(CLIENT_GONE_REASON);
    external?.addEventListener("abort", onExternalAbort, { once: true });
    inc("puppeteerJobs");

    // One hard deadline per resolve. A hung page must not be able to hold a
    // browser slot (and its Chromium memory) indefinitely.
    const deadline = setTimeout(() => controller.abort(DEADLINE_REASON), RESOLVE_DEADLINE_MS);
    deadline.unref?.();

    const work = this.resolveInternal(url, onProgress, controller.signal).finally(() => {
      clearTimeout(deadline);
      external?.removeEventListener("abort", onExternalAbort);
    });

    // Fail the caller immediately on abort instead of waiting for the
    // abandoned work to unwind; the work promise is still observed so it can
    // never become an unhandled rejection.
    const guard = new Promise<never>((_, reject) => {
      controller.signal.addEventListener(
        "abort",
        () => {
          if (controller.signal.reason === DEADLINE_REASON) {
            reject(createError("PROVIDER_TIMEOUT"));
            return;
          }
          const cancelled = new Error("resolve cancelled by caller");
          cancelled.name = "AbortError";
          reject(cancelled);
        },
        { once: true }
      );
    });

    try {
      return await Promise.race([work, guard]);
    } catch (err) {
      inc("puppeteerFailures");
      throw err;
    } finally {
      void work.catch(() => {});
    }
  }

  private async resolveInternal(
    url: string,
    onProgress: ResolveProgressCallback | undefined,
    signal: AbortSignal
  ): Promise<ResolverResult> {
    const startTime = Date.now();
    const timings: Record<string, number> = {};

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let page: any;
    let slot: Lease | null = null;
    try {
      if (signal.aborted) {
        throw createError("PROVIDER_TIMEOUT");
      }
      // Step 0: Fetch metadata via plain HTTP (~1s, no browser, no bot detection)
      const metaStart = Date.now();
      // For /p/ pages the carousel fast path also needs the embed endpoint —
      // start that GET now so it overlaps the metadata page fetch instead of
      // paying for two sequential round-trips on every post resolve.
      const shortcodeMatch = /instagram\.com\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i.exec(url);
      const shortcode = shortcodeMatch?.[1];
      const embedHtmlPromise =
        shortcode
          ? fetchPageHtml(`https://www.instagram.com/p/${shortcode}/embed/`)
          : null;
      const fetchMeta = await fetchMetadata(url);
      timings.metadataMs = Date.now() - metaStart;
      onProgress?.(35, "Media source opened");

      // Stop before spending a Chromium launch (~20s) on a request Instagram has
      // already refused with an explicit 429. Only a 429 is throttling: a
      // login redirect is a gate (handled below), and any other status
      // (403/404/...) flows into the normal pipeline so it fails honestly
      // instead of masquerading as a rate limit.
      const accessBlock = detectInstagramAccessBlock(fetchMeta);
      if (accessBlock === "rate-limited") {
        const throttled = createError("INSTAGRAM_RATE_LIMITED");
        logger.warn("Puppeteer page fetch throttled by Instagram (HTTP 429)", {
          normalizedUrl: url,
          pageStatus: fetchMeta.pageStatus,
          pageFinalHost: fetchMeta.pageFinalHost,
          pageFinalPath: fetchMeta.pageFinalPath,
          htmlLength: fetchMeta.htmlLength,
          upstreamRetryAfterSeconds: fetchMeta.pageRetryAfterSeconds,
        });
        throw new AppError(throttled.code, throttled.message, throttled.statusCode, {
          provider: "puppeteer",
          runtime: isServerlessRuntime() ? "serverless" : "local",
          stage: "prefetch-throttled",
          pageStatus: fetchMeta.pageStatus,
          upstreamRetryAfterSeconds: fetchMeta.pageRetryAfterSeconds,
        });
      }
      if (accessBlock === "login-redirect") {
        // Gated, not throttled: never a rate-limit code. With a viewer session
        // the browser pass below (which sets the session cookies) may still
        // succeed, so continue. Without one the browser would only hit the
        // same wall — skip the launch and fail honestly instead.
        if (!isInstagramSessionConfigured()) {
          logger.warn("Puppeteer page fetch gated by Instagram login (no session)", {
            normalizedUrl: url,
            pageStatus: fetchMeta.pageStatus,
            pageFinalHost: fetchMeta.pageFinalHost,
            pageFinalPath: fetchMeta.pageFinalPath,
          });
          const gated = createError("CONTENT_UNAVAILABLE");
          throw new AppError(gated.code, gated.message, gated.statusCode, {
            provider: "puppeteer",
            runtime: isServerlessRuntime() ? "serverless" : "local",
            stage: "prefetch-login-gate",
            pageStatus: fetchMeta.pageStatus,
            loginWall: true,
          });
        }
        logger.info("Puppeteer page fetch hit login gate, continuing with session", {
          normalizedUrl: url,
        });
      }

      const isStory = this.detectContentType(url) === "STORY";
      const storySegments = new URL(url).pathname.split("/").filter(Boolean);
      if (isStory) {
        logger.info("Story extraction diagnostics", {
          normalizedUrl: url,
          username: storySegments[1] || null,
          storyId: storySegments[2] || null,
          pageStatus: fetchMeta.pageStatus,
          pageFinalHost: fetchMeta.pageFinalHost,
          pageFinalPath: fetchMeta.pageFinalPath,
          loginWall: fetchMeta.loginWall,
          challenge: fetchMeta.hasChallenge,
          hasOgImage: Boolean(fetchMeta.ogImage),
          hasOgVideo: Boolean(fetchMeta.ogVideo),
          embeddedMediaCount: fetchMeta.embeddedMedia.length,
          htmlLength: fetchMeta.htmlLength,
          pageError: fetchMeta.pageError,
        });
      }

      // Story pages may expose the actual item as og metadata or embedded
      // JSON. Resolve those candidates before opening a browser, while never
      // treating the story ID as a post shortcode.
      if (url.includes("/stories/") && !fetchMeta.loginWall) {
        const storyCandidate =
          (fetchMeta.ogVideo && { url: fetchMeta.ogVideo, type: "video" as const }) ||
          fetchMeta.embeddedMedia.find((item) => item.type === "video") ||
          (fetchMeta.ogImage && !isLikelyProfileImageUrl(fetchMeta.ogImage) && {
            url: fetchMeta.ogImage,
            type: "image" as const,
          }) ||
          fetchMeta.embeddedMedia.find(
            (item) => item.type === "image" && !isLikelyProfileImageUrl(item.url)
          );
        if (storyCandidate && this.validateMediaUrl(storyCandidate.url)) {
          logger.info("Puppeteer story fast path", {
            storyUrl: url,
            mediaType: storyCandidate.type,
          });
          const storyMeta = {
            ...fetchMeta,
            ogImage:
              fetchMeta.ogImage || (storyCandidate.type === "image" ? storyCandidate.url : null),
          };
          if (storyCandidate.type === "video") {
            const res = await this.buildResultFromVideo(url, storyCandidate.url, storyMeta);
            if (res) return res;
          } else {
            return this.buildResultFromMetadata(url, storyMeta);
          }
        }
      }

      // Fast path: video pages usually expose og:video in plain HTML.
      // Skips Chromium entirely when the direct video URL is already known.
      // Audio pages are included: when their sound page exposes a playable
      // source the audio flow can proceed without launching the browser.
      //
      // The pool ranks EVERY already-collected rendition (page graph plus the
      // embed document, which is already fetching in parallel — awaiting it
      // starts no new Instagram request). selectReelVideo prefers an audible
      // rendition over a larger silent one and pairs split audio, which is
      // what used to be lost when the first URL won unconditionally.
      const isVideoPage =
        url.includes("/reel/") ||
        url.includes("/reels/") ||
        url.includes("/tv/") ||
        url.includes("/reels/audio/");
      // Set once the ranked fast selection has run: the embed block below
      // must not re-probe the same pool (bounded work stays bounded).
      let fastRankedSelectionDone = false;
      if (isVideoPage && fetchMeta.ogVideo && !fetchMeta.loginWall) {
        let embedCands: ExtractedMedia[] = [];
        try {
          const earlyEmbed = embedHtmlPromise ? await embedHtmlPromise : null;
          if (earlyEmbed) embedCands = collectEmbedCandidates(earlyEmbed);
        } catch {
          // Embed fetch failed: the page-graph pool stands alone.
        }
        const pool: Array<{ url: string }> = [{ url: fetchMeta.ogVideo }];
        for (const item of [...fetchMeta.embeddedMedia, ...embedCands]) {
          if (item.type === "video") pool.push({ url: item.url });
        }
        const selection = await selectReelVideo(pool);
        fastRankedSelectionDone = true;
        if (selection) {
          const result = this.buildReelResult(url, selection, fetchMeta);
          timings.totalMs = Date.now() - startTime;
          logger.info("[resolve] fast path complete", { ...timings, mediaCount: 1 });
          return result;
        }
      }

      // Post & Reel fast path: the public embed endpoint carries the COMPLETE
      // sidecar collection and media graph, unlike the main page which only
      // exposes the first slides anonymously or strips videos.
      if (shortcode) {
        const embedStart = Date.now();
        const embedHtml = embedHtmlPromise ? await embedHtmlPromise : null;
        timings.embedMs = Date.now() - embedStart;
        if (embedHtml) {
          const combinedEmbedMedia: ExtractedMedia[] = collectEmbedCandidates(embedHtml);

          if (combinedEmbedMedia.length > 0) {
            const validEmbed: MediaItem[] = [];
            for (const item of combinedEmbedMedia) {
              if (this.validateMediaUrl(item.url)) {
                validEmbed.push({
                  url: item.url,
                  type: item.type,
                  width: item.width,
                  height: item.height,
                  duration: null,
                  thumbnail: null,
                  format: item.type === "video" ? "mp4" : null,
                });
              }
            }

            const currentType = this.detectContentType(url);
            if (currentType === "REEL" || currentType === "VIDEO") {
              if (fastRankedSelectionDone) {
                // The og:video fast path above already ranked this same pool
                // (page graph + embed candidates) and found nothing playable:
                // re-probing it would double the CDN probe traffic for zero
                // new information. Continue to the browser instead.
                logger.info("Embed candidates already ranked, continuing to browser", {
                  contentType: currentType,
                  discovered: combinedEmbedMedia.length,
                });
              } else {
                const selection = await selectReelVideo(
                  validEmbed.filter((m) => m.type === "video")
                );
                if (selection) {
                  const res = this.buildReelResult(url, selection, fetchMeta);
                  timings.totalMs = Date.now() - startTime;
                  logger.info("Puppeteer resolve via embed video fast path (no browser)", {
                    contentType: currentType,
                    shortcode,
                    mediaCount: res.media.length,
                  });
                  onProgress?.(85, "Media extracted");
                  return res;
                }
              }
            }

            if (validEmbed.length > 0 && currentType !== "REEL" && currentType !== "VIDEO") {
              const author = fetchMeta.author || extractAuthorFromUrl(url);
              const rawTitle = fetchMeta.title || fetchMeta.description;
              const decodedAuthor: Author | null = author
                ? {
                    username: author.username,
                    displayName: author.displayName
                      ? decodeHtmlEntities(author.displayName)
                      : null,
                  }
                : null;
              logger.info("Puppeteer resolve via embed sidecar (no browser)", {
                contentType: currentType,
                mediaCount: validEmbed.length,
                hasVideo: validEmbed.some((m) => m.type === "video"),
              });
              timings.totalMs = Date.now() - startTime;
              onProgress?.(85, "Media extracted");
              return {
                type: currentType,
                sourceUrl: url,
                thumbnail:
                  validEmbed.find((m) => m.type === "image")?.url ||
                  fetchMeta.ogImage ||
                  null,
                title: rawTitle ? decodeHtmlEntities(rawTitle) : null,
                author: decodedAuthor,
                media: validEmbed,
              };
            }
            logger.info("Embed html had no verified media, continuing to browser", {
              discovered: combinedEmbedMedia.length,
            });
          }
        }
      }

      const lease = await this.acquirePageSlot(signal);
      if (!lease) {
        // A caller that already went away gets a cancellation, not a lie about
        // capacity: the response is never written for them either way.
        if (signal.aborted) {
          const cancelled = new Error("resolve cancelled by caller");
          cancelled.name = "AbortError";
          throw cancelled;
        }
        throw createError("SERVER_OVERLOADED");
      }
      slot = lease;

      const browserStart = Date.now();
      try {
        await this.ensureBrowser();
      } catch (err) {
        // First-divergence context: when Chromium itself fails (common on
        // constrained serverless), the log must still show whether the
        // server-side prefetch had already failed or held video — otherwise
        // a launch failure and an Instagram restriction are indistinguishable.
        // Hostnames/booleans/counts only; never cookies, keys, or signed URLs.
        logger.error("Puppeteer BROWSER_LAUNCH_FAILED", {
          error: err instanceof Error ? err.message : String(err),
          duration: Date.now() - startTime,
          pageStatus: fetchMeta.pageStatus,
          pageFinalHost: fetchMeta.pageFinalHost,
          hasOgVideo: Boolean(fetchMeta.ogVideo),
          embeddedMediaCount: fetchMeta.embeddedMedia.length,
          htmlLength: fetchMeta.htmlLength,
          hasSession: isInstagramSessionConfigured(),
          isServerless: isServerlessRuntime(),
        });

        // If browser fails, return what we got from fetch
        if (fetchMeta.ogImage && (!isStory || !isLikelyProfileImageUrl(fetchMeta.ogImage))) {
          return this.buildResultFromMetadata(url, fetchMeta);
        }
        throw createError("PROVIDER_UNAVAILABLE");
      }
      timings.browserMs = Date.now() - browserStart;
      onProgress?.(50, "Browser ready");

      if (!this.browser) {
        if (fetchMeta.ogImage && (!isStory || !isLikelyProfileImageUrl(fetchMeta.ogImage))) {
          return this.buildResultFromMetadata(url, fetchMeta);
        }
        throw createError("PROVIDER_UNAVAILABLE");
      }

      page = await this.openPageWithRecovery();

      // Viewer session for the rendered page: without it Instagram hydrates
      // a video-stripped DOM for automated clients. Cookies are scoped to
      // .instagram.com by the parser and failures here must never fail the
      // resolve (anonymous extraction still gets its chance).
      if (isInstagramSessionConfigured()) {
        try {
          const jar = parseSessionCookies();
          if (jar.length > 0) {
            await page.setCookie(...jar);
          }
        } catch {
          /* anonymous fallback below */
        }
      }

      // Apply stealth patches to this page
      await applyStealthPatches(page);

      // Page identity for the navigation below.
      //
      // ROOT CAUSE (verified against live Instagram, not guessed): this
      // provider navigated every URL with a *mobile app* identity (iPhone UA
      // + mobile viewport + `X-IG-App-ID`). Instagram answers that identity
      // with a video-stripped document: HTTP 200, no login wall, no
      // challenge, but zero `video_versions` / `dash_manifest` /
      // `playable_url` and no `<video>` at all — which is exactly why every
      // Reel failed with VIDEO_SOURCE_NOT_FOUND.
      //
      // A controlled live bisect (same URL, same session, same stealth
      // patches) isolated the mobile identity as the decisive factor: a
      // desktop UA + viewport returned the real media (verified `video/mp4`
      // responses from the fbcdn CDN, readyState 4, 720x1280) both with and
      // without `X-IG-App-ID`, while the mobile identity stayed stripped
      // either way. The app-id header is therefore kept OFF page navigations
      // entirely — it is a client-identity signal, not something a web page
      // request should send.
      //
      // So: desktop identity for Reels/Videos/Posts (where the video lives),
      // and mobile identity is confined to Story navigations, whose
      // extraction path does not depend on the web document.
      const useDesktopIdentity = !isStory;
      if (useDesktopIdentity) {
        await page.setViewport({ width: 1280, height: 900, isMobile: false, hasTouch: false });
        await page.setUserAgent(DESKTOP_UA);
      } else {
        await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
        await page.setUserAgent(MOBILE_UA);
      }

      const extraHeaders: Record<string, string> = { "Accept-Language": "en-US,en;q=0.9" };
      if (!useDesktopIdentity) {
        extraHeaders["X-IG-App-ID"] = IG_APP_ID;
      }
      await page.setExtraHTTPHeaders(extraHeaders);

      // Counters used by both the request and response listeners below. They
      // are declared BEFORE the listeners are attached: the interception
      // handlers run on the event loop, and a listener that closed over these
      // bindings before their declaration would hit the temporal dead zone.
      let blockedRequestCount = 0;
      let jsonInspectedCount = 0;
      let jsonSkippedCount = 0;
      let jsonBytesRead = 0;
      let interceptedMediaRequestCount = 0;
      let capturedCdnMediaUrlCount = 0;

      // Block heavy resources we never need, but NEVER abort video/media
      // requests: media delivery responses (resourceType "media",
      // video/*) and <video> currentSrc are primary extraction signals.
      // Scripts/XHR/fetch stay enabled — API JSON interception depends on them.
      await page.setRequestInterception(true).catch(() => {});
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      page.on("request", (intercepted: any) => {
        try {
          const type = intercepted.resourceType();
          const target = intercepted.url();
          if (type === "media" || type === "image" || type === "video") {
            interceptedMediaRequestCount++;
          }
          if (
            (type === "image" && !isStory) ||
            type === "font" ||
            type === "stylesheet" ||
            isUnnecessaryResource(target, type)
          ) {
            blockedRequestCount++;
            intercepted.abort().catch(() => {});
          } else {
            intercepted.continue().catch(() => {});
          }
        } catch {
          try {
            intercepted.continue().catch(() => {});
          } catch {
            /* page already closed */
          }
        }
      });

      // Intercept responses to capture API data with media URLs.
      // Use a broad content check: Instagram serves media data from many
      // different API endpoints (GraphQL, web API, feed, etc.) so we must
      // check ALL JSON responses for media-related keywords.
      const interceptedMedia: ExtractedMedia[] = [];
      // Pagination state for sidecar children: when an intercepted API page
      // reports has_next_page, the cursor is followed after the browser pass.
      // Stored on a const container because TS control-flow ignores writes
      // made inside the response callback when narrowing a plain `let`.
      const sidecarState: { page: { url: string; endCursor: string } | null } = { page: null };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      page.on("response", async (res: any) => {
        try {
          const resUrl = res.url();
          const resContentType = res.headers()["content-type"] || "";

          if (resContentType.includes("json")) {
            // Only Instagram's own API surfaces carry media JSON, and buffering
            // every JSON response on the page (config blobs, feature flags,
            // manifests) wasted time and memory on every resolve. Anything
            // else is skipped, and a body over the cap is never buffered.
            if (!isMediaBearingApiUrl(resUrl)) {
              jsonSkippedCount++;
              return;
            }
            const declared = Number(res.headers()["content-length"] || "0");
            if (Number.isFinite(declared) && declared > MAX_INTERCEPT_BODY_BYTES) {
              jsonSkippedCount++;
              return;
            }
            try {
              const text = await res.text();
              jsonInspectedCount++;
              jsonBytesRead += text.length;
              if (text.length > MAX_INTERCEPT_BODY_BYTES) {
                // Defensive: a chunked response can lie about (or omit) its
                // length. Parsing a huge body would be a memory spike, so drop
                // it rather than risk the process.
                jsonSkippedCount++;
                return;
              }
              if (
                text.includes("video_url") ||
                text.includes("display_url") ||
                text.includes("image_versions") ||
                text.includes("playback_url") ||
                text.includes("edge_sidecar_to_children") ||
                text.includes("carousel_media")
              ) {
                const media = extractMediaFromJson(text);
                for (const item of media) {
                  const exists = interceptedMedia.some((m) => m.url === item.url);
                  if (!exists) interceptedMedia.push({ ...item, source: "api-json" });
                }
                // Structured pass: complete ordered children with real
                // per-slide dimensions plus pagination state.
                const sidecar = extractSidecarFromJson(text);
                for (const item of sidecar.items) {
                  const exists = interceptedMedia.some((m) => m.url === item.url);
                  if (!exists) {
                    interceptedMedia.push({ ...item, source: "api-json" });
                  } else if (item.width && item.height) {
                    // Upgrade the regex-found entry with real dimensions.
                    const prev = interceptedMedia.find((m) => m.url === item.url);
                    if (prev && (!prev.width || !prev.height)) {
                      prev.width = item.width;
                      prev.height = item.height;
                    }
                  }
                }
                if (sidecar.hasMore && sidecar.endCursor) {
                  sidecarState.page = { url: resUrl, endCursor: sidecar.endCursor };
                }
                let responseHost: string | null = null;
                try {
                  responseHost = new URL(resUrl).hostname;
                } catch {
                  responseHost = null;
                }
                logger.debug("Intercepted media from API", {
                  host: responseHost,
                  count: media.length,
                });
              }
            } catch {
              // Response body may not be available
            }
          }

          // Media-delivery diagnostics (dev only via logger.debug): surface
          // any response that looks like actual video bytes being delivered.
          // Hostname only — never query strings or tokens.
          try {
            const req = typeof res.request === "function" ? res.request() : null;
            const resourceType =
              req && typeof req.resourceType === "function" ? req.resourceType() : "unknown";
            const ctLower = resContentType.toLowerCase();
            const statusCode = typeof res.status === "function" ? res.status() : -1;
            const looksLikeMedia =
              resourceType === "media" ||
              ctLower.startsWith("video/") ||
              (isStory && ctLower.startsWith("image/") && isTrustedCdnUrl(resUrl) && !isLikelyStaticInstagramAssetUrl(resUrl)) ||
              (ctLower.includes("octet-stream") && /fbcdn|cdninstagram|scontent/i.test(resUrl));
            if (looksLikeMedia) {
              let host: string | null = null;
              try {
                host = new URL(resUrl).hostname;
              } catch {
                host = null;
              }
              logger.debug("[Downloadit Puppeteer Media Debug] media response", {
                host,
                resourceType,
                status: statusCode,
                contentType: resContentType.slice(0, 80),
              });
              if (
                isTrustedCdnUrl(resUrl) &&
                (resourceType === "media" || ctLower.startsWith("video/") || isStory) &&
                !interceptedMedia.some((m) => m.url === resUrl)
              ) {
                capturedCdnMediaUrlCount++;
                // Preserve the signed query string EXACTLY (resUrl untouched):
                // only the host/content-type/resource-type/status are recorded
                // as the authoritative media-type signal for final assembly.
                interceptedMedia.push({
                  url: resUrl,
                  type: ctLower.startsWith("video/") || resourceType === "media" ? "video" : "image",
                  width: null,
                  height: null,
                  source: "network-video-response",
                  capturedContentType: ctLower.slice(0, 80) || null,
                  capturedResourceType: resourceType || null,
                  capturedStatus: statusCode,
                });
              }
            }
          } catch {
            /* diagnostics must never break interception */
          }
        } catch {
          // Ignore response processing errors
        }
      });

      const navStart = Date.now();
      try {
        // domcontentloaded instead of networkidle2: Instagram never goes idle
        // (analytics/background polling), so networkidle would burn the full
        // timeout on nearly every request.
        await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: NAVIGATION_TIMEOUT_MS,
        });
      } catch (err) {
        logger.warn("Puppeteer PAGE_NAVIGATION_INTERRUPTED", {
          error: err instanceof Error ? err.message : String(err),
          url,
        });
      }
      timings.navigationMs = Date.now() - navStart;
      onProgress?.(65, "Page loaded");

      // Wait only for the data we actually need (video tag, article, or
      // video meta) instead of a blind multi-second sleep.
      const waitStart = Date.now();
      await page
        .waitForFunction(
          `!!document.querySelector('${isStory ? "video[src], img[src]," : "video[src],"} article, meta[property="og:video"]')`,
          { timeout: DATA_WAIT_TIMEOUT_MS }
        )
        .catch(() => {});
      timings.dataWaitMs = Date.now() - waitStart;

      // Helper: extract video candidates from current page DOM & scripts.
      // The HTML <video> element is NOT required to expose the final URL:
      // the network layer may already have captured the valid video
      // response (source "network-video-response"), which the assembly
      // stage treats as authoritative. DOM hits are tagged "dom" /
      // "video-graph" so the selected source stays diagnosable.
      const extractVideoCandidatesFromPage = async (): Promise<ExtractedMedia[]> => {
        const found: ExtractedMedia[] = [];
        try {
          const pageData = await page.evaluate(EXTRACT_VIDEO_GRAPH_FN).catch(() => null);
          if (pageData) {
            if (Array.isArray(pageData.domVideos)) {
              for (const src of pageData.domVideos) {
                if (typeof src === "string" && src.startsWith("http") && this.validateMediaUrl(src)) {
                  found.push({ url: src, type: "video", width: null, height: null, source: "dom" });
                }
              }
            }
            if (Array.isArray(pageData.scripts)) {
              for (const snippet of pageData.scripts) {
                if (typeof snippet === "string" && snippet.length > 0) {
                  const media = extractMediaFromJson(snippet);
                  for (const item of media) {
                    if (item.type === "video" && this.validateMediaUrl(item.url)) {
                      found.push({ ...item, source: "video-graph" });
                    }
                  }
                }
              }
            }
          }
        } catch {
          // Page evaluate may fail if frame detached
        }
        return found;
      };

      const hasVideoBeenExtracted = (): boolean => {
        return (
          interceptedMedia.some((m) => m.type === "video") ||
          Boolean(fetchMeta.ogVideo && this.validateMediaUrl(fetchMeta.ogVideo))
        );
      };

      // Safe stage diagnostics for failure responses: scalars/counts/stage
      // names only — never cookies, keys, or signed URLs. Lets a production
      // VIDEO_SOURCE_NOT_FOUND name its exact internal stage without log
      // access. `assembly` carries post-validation counts plus the top
      // per-candidate rejection reasons at the assembly throw site.
      const failureDiagnostics = (
        stage: string,
        normalized?: { count: number; types: string[] },
        assembly?: {
          validVideoCount?: number;
          rejectedCount?: number;
          rejectionReasons?: Record<string, number>;
          verifiedByProbe?: number;
          trustedCapture?: number;
        }
      ): ResolveDiagnostics => ({
        provider: "puppeteer",
        runtime: isServerlessRuntime() ? "serverless" : "local",
        stage,
        pageStatus: fetchMeta.pageStatus,
        loginWall: fetchMeta.loginWall,
        challenge: fetchMeta.hasChallenge,
        interceptedMediaCount: interceptedMedia.length,
        interceptedMediaTypes: [...new Set(interceptedMedia.map((m) => m.type))],
        videoCandidateCount: interceptedMedia.filter((m) => m.type === "video").length,
        videoGraphFound: hasVideoBeenExtracted(),
        hydrationEntered: "settleMs" in timings,
        hydrationDurationMs: timings.settleMs ?? 0,
        extractionAttempts: [
          "prefetch",
          ...(shortcode ? ["embed"] : []),
          ...(page ? ["browser"] : []),
        ],
        normalizedMediaCount: normalized?.count ?? 0,
        normalizedMediaTypes: normalized?.types ?? [],
        validVideoCandidateCount: assembly?.validVideoCount ?? 0,
        rejectedCandidateCount: assembly?.rejectedCount ?? 0,
        rejectionReasons: assembly?.rejectionReasons ?? {},
        verifiedByProbeCount: assembly?.verifiedByProbe ?? 0,
        trustedCaptureCount: assembly?.trustedCapture ?? 0,
        selectedCandidateSource: null,
        selectedMediaHost: null,
        totalDurationMs: Date.now() - startTime,
      });

      const videoFailure = (
        stage: string,
        normalized?: { count: number; types: string[] },
        assembly?: {
          validVideoCount?: number;
          rejectedCount?: number;
          rejectionReasons?: Record<string, number>;
          verifiedByProbe?: number;
          trustedCapture?: number;
        }
      ): AppError => {
        const err = createError("VIDEO_SOURCE_NOT_FOUND");
        return new AppError(err.code, err.message, err.statusCode, failureDiagnostics(stage, normalized, assembly));
      };

      // 1. Initial media inspection from page DOM & scripts
      const initialVideos = await extractVideoCandidatesFromPage();
      for (const item of initialVideos) {
        if (!interceptedMedia.some((m) => m.url === item.url)) {
          interceptedMedia.push(item);
        }
      }

      // 2. Bounded video graph hydration.
      // Instagram returns poster/image media before the actual video graph.
      // NEVER use interceptedMedia.length === 0 as condition: poster/image presence
      // must NOT mean video extraction is finished.
      // The condition MUST be whether an actual VIDEO candidate has been extracted.
      if (!hasVideoBeenExtracted()) {
        const settleStart = Date.now();
        const budget = readBoundedInt("PUPPETEER_VIDEO_SETTLE_MS", 12_000, 500, 30_000);
        while (Date.now() - settleStart < budget) {
          if (signal?.aborted) break;

          // Check if intercepted media received a video from network responses
          if (hasVideoBeenExtracted()) break;

          // Re-extract from hydrated page DOM and scripts
          const pageVideos = await extractVideoCandidatesFromPage();
          if (pageVideos.length > 0) {
            for (const item of pageVideos) {
              if (!interceptedMedia.some((m) => m.url === item.url)) {
                interceptedMedia.push(item);
              }
            }
            if (hasVideoBeenExtracted()) break;
          }

          await new Promise((r) => setTimeout(r, 250));
        }
        timings.settleMs = Date.now() - settleStart;
      }

      // Check page state
      const pageState = await page.evaluate(PAGE_STATE_FN).catch(() => ({
        title: "",
        hasUnavailableMessage: false,
        hasLoginWall: false,
        hasChallenge: false,
      }));

      if (pageState.hasLoginWall && !hasVideoBeenExtracted()) {
        logger.warn("Instagram login wall detected", { url });
        if (this.detectContentType(url) === "STORY") {
          logger.warn("STORY_SOURCE_UNAVAILABLE", { url, reason: "authentication-required" });
          throw createError("STORY_SOURCE_UNAVAILABLE");
        }
        if (fetchMeta.ogImage) {
          return this.buildResultFromMetadata(url, fetchMeta);
        }
        throw createError("CONTENT_UNAVAILABLE");
      }

      if (pageState.hasChallenge && !hasVideoBeenExtracted()) {
        logger.warn("Instagram challenge detected", { url });
        if (this.detectContentType(url) === "STORY") {
          logger.warn("STORY_SOURCE_UNAVAILABLE", { url, reason: "challenge-required" });
          throw createError("STORY_SOURCE_UNAVAILABLE");
        }
        if (fetchMeta.ogImage) {
          return this.buildResultFromMetadata(url, fetchMeta);
        }
        throw createError("CONTENT_UNAVAILABLE");
      }

      if (pageState.hasUnavailableMessage && !hasVideoBeenExtracted()) {
        logger.info("Instagram reports content unavailable", {
          url,
          title: pageState.title,
          hasOgVideo: Boolean(fetchMeta.ogVideo),
          hasEmbeddedVideo: fetchMeta.embeddedMedia.some((m) => m.type === "video"),
          hasSession: isInstagramSessionConfigured(),
        });
        if (this.detectContentType(url) === "STORY") {
          logger.warn("STORY_SOURCE_UNAVAILABLE", { url, reason: "instagram-reported-unavailable" });
          throw createError("STORY_SOURCE_UNAVAILABLE");
        }
        // The browser was blocked by Instagram (datacenter IP / rate-limit),
        // but the server-side prefetch (fetchMetadata) may have already
        // captured a usable video from the og:video tag or embedded JSON.
        // Seed those into interceptedMedia so the assembly pipeline below
        // can verify and return them instead of failing immediately.
        if (fetchMeta.ogVideo && this.validateMediaUrl(fetchMeta.ogVideo)) {
          if (!interceptedMedia.some((m) => m.url === fetchMeta.ogVideo)) {
            logger.info("Using og:video from prefetch as browser-fallback candidate", { url });
            interceptedMedia.push({ url: fetchMeta.ogVideo!, type: "video", width: null, height: null, source: "prefetch-og" });
          }
        }
        for (const item of fetchMeta.embeddedMedia) {
          if (item.type === "video" && this.validateMediaUrl(item.url)) {
            if (!interceptedMedia.some((m) => m.url === item.url)) {
              logger.info("Using embedded video from prefetch as browser-fallback candidate", { url });
              interceptedMedia.push({ ...item, source: "prefetch-embed" });
            }
          }
        }
        // If we still have nothing, surface an honest error.
        if (!hasVideoBeenExtracted()) {
          const notFound = createError("CONTENT_NOT_FOUND");
          throw new AppError(
            notFound.code,
            notFound.message,
            notFound.statusCode,
            failureDiagnostics("browser-blocked-no-prefetch-video")
          );
        }
        logger.info("Browser-blocked resolve: proceeding with prefetch video candidates", { url });
      }

      // Try to get additional media from the rendered DOM
      let domResult: {
        videos: string[];
        images: string[];
        hasArticle: boolean;
        bodySnippet: string;
      } = { videos: [], images: [], hasArticle: false, bodySnippet: "" };
      try {
        domResult = await page.evaluate(FETCH_META_FN);
      } catch {
        // DOM extraction failed
      }

      // Carousel expansion: post slides beyond the first lazy-load as the
      // user advances, so a single DOM snapshot undercounts multi-image
      // posts. For /p/ URLs, click the carousel "Next" control (bounded:
      // stop after the carousel reports no next control or two consecutive
      // advances with no new media, and accumulate every exposed item.
      if (url.includes("/p/")) {
        const seenDom = new Set<string>([...domResult.videos, ...domResult.images]);
        let quietClicks = 0;
        for (let step = 0; step < 100 && quietClicks < 2; step++) {
          let clicked = false;
          try {
            clicked = await page.evaluate(
              `(function(){` +
                `var btns=Array.from(document.querySelectorAll('button[aria-label="Next"]'));` +
                `if(!btns.length){btns=Array.from(document.querySelectorAll('button')).filter(function(b){return (b.getAttribute('aria-label')||'').toLowerCase().indexOf('next')!==-1;});}` +
                `for(var i=0;i<btns.length;i++){var r=btns[i].getBoundingClientRect();if(r.width>0&&r.height>0){btns[i].click();return true;}}` +
                `return false;` +
                `})()`
            );
          } catch {
            break;
          }
          if (!clicked) break;
          await new Promise((r) => setTimeout(r, 800));
          let more: { videos: string[]; images: string[] } | null = null;
          try {
            more = await page.evaluate(FETCH_META_FN);
          } catch {
            break;
          }
          if (!more) break;
          let grew = false;
          const videoSet = new Set(more.videos);
          for (const src of [...more.videos, ...more.images]) {
            if (!seenDom.has(src)) {
              seenDom.add(src);
              grew = true;
              if (videoSet.has(src)) {
                domResult.videos.push(src);
              } else {
                domResult.images.push(src);
              }
            }
          }
          if (grew) {
            quietClicks = 0;
          } else {
            quietClicks++;
          }
        }
        if (typeof timings === "object") {
          timings.carouselExpandSlides = seenDom.size;
        }
      }

      // Sidecar pagination: when the API exposed only the first page of
      // children, follow the cursor (bounded to extra pages, never a media
      // limit) so the COMPLETE collection is returned. If the provider
      // refuses, whatever was collected stands and the outcome is logged.
      const pagedMedia: ExtractedMedia[] = [];
      const pagination = sidecarState.page;
      if (pagination) {
        let cursor: string | null = pagination.endCursor;
        for (let p = 0; p < SIDECAR_MAX_EXTRA_PAGES && cursor; p++) {
          const next = await fetchSidecarPage(pagination.url, cursor);
          if (!next || next.items.length === 0) {
            logger.info("Sidecar pagination stopped", {
              page: p + 1,
              reason: next ? "empty-page" : "provider-blocked",
            });
            break;
          }
          const known = new Set([...interceptedMedia, ...pagedMedia].map((m) => m.url));
          let fresh = 0;
          for (const item of next.items) {
            if (!known.has(item.url)) {
              known.add(item.url);
              pagedMedia.push(item);
              fresh++;
            }
          }
          logger.info("Sidecar page merged", { page: p + 1, fresh, total: pagedMedia.length });
          cursor = next.hasMore ? next.endCursor : null;
        }
      }

      // Inspect actual <video> elements: currentSrc (not just the src
      // attribute) reveals blob:-based playback; poster is logged as a
      // boolean only. Hostnames only — never query strings or tokens.
      try {
        const videoDetails = (await page
          .evaluate(
            `Array.from(document.querySelectorAll("video")).slice(0, 5).map((v) => { var host = null; try { var u = new URL(v.currentSrc); host = u.protocol === "blob:" ? ("blob:" + u.hostname) : u.hostname; } catch (e) { host = null; } return { hasSrcAttr: !!v.getAttribute("src"), currentSrcHost: host, hasPoster: !!v.getAttribute("poster") }; })`
          )
          .catch(() => [])) as Array<{
          hasSrcAttr: boolean;
          currentSrcHost: string | null;
          hasPoster: boolean;
        }>;
        logger.debug("[Downloadit Puppeteer Media Debug] video elements", {
          count: videoDetails.length,
          details: videoDetails,
        });
      } catch {
        /* diagnostics must never break extraction */
      }

      // Also try to extract from rendered HTML
      let renderedHtmlMedia: ExtractedMedia[] = [];
      let renderedHtmlText = "";
      try {
        renderedHtmlText = await page.content();
        renderedHtmlMedia = extractMediaFromHtml(renderedHtmlText);
      } catch {
        // Page content not available
      }

      // Combine all sources. First-seen provenance wins, except a later
      // network-video-response upgrades a weaker earlier source (the network
      // delivery is the authoritative signal). Exact-URL duplicates are
      // dropped and counted — the signed query string is part of the identity,
      // so distinct signatures are never collapsed.
      const allMedia: ExtractedMedia[] = [];
      const seenUrls = new Set<string>();
      const normalizationRejections: Record<string, number> = {};
      let duplicateCount = 0;

      const addUnique = (item: ExtractedMedia) => {
        if (isStory && isLikelyStaticInstagramAssetUrl(item.url)) return;
        if (isStory && item.type === "image" && isLikelyProfileImageUrl(item.url)) return;
        if (seenUrls.has(item.url)) {
          duplicateCount++;
          normalizationRejections["duplicate"] = (normalizationRejections["duplicate"] ?? 0) + 1;
          const prev = allMedia.find((m) => m.url === item.url);
          if (
            prev &&
            prev.source !== "network-video-response" &&
            item.source === "network-video-response"
          ) {
            prev.source = item.source;
            prev.capturedContentType = item.capturedContentType;
            prev.capturedResourceType = item.capturedResourceType;
            prev.capturedStatus = item.capturedStatus;
            if (item.width && item.height && (!prev.width || !prev.height)) {
              prev.width = item.width;
              prev.height = item.height;
            }
          }
          return;
        }
        seenUrls.add(item.url);
        allMedia.push(item);
      };

      for (const item of interceptedMedia) addUnique(item);
      for (const item of pagedMedia) addUnique({ ...item, source: item.source ?? "api-json" });
      for (const item of renderedHtmlMedia) addUnique({ ...item, source: item.source ?? "rendered-html" });

      for (const src of domResult.videos) {
        addUnique({ url: src, type: "video", width: null, height: null, source: "dom" });
      }
      for (const src of domResult.images) {
        addUnique({ url: src, type: "image", width: null, height: null, source: "dom" });
      }

      // Server-side metadata may already hold a trusted video URL (og:video
      // or embedded page JSON). Seed it first so video posts are covered
      // even when the browser pass finds nothing new.
      if (fetchMeta.ogVideo && !seenUrls.has(fetchMeta.ogVideo)) {
        addUnique({ url: fetchMeta.ogVideo, type: "video", width: null, height: null, source: "prefetch-og" });
      }
      if (fetchMeta.ogImage && !seenUrls.has(fetchMeta.ogImage)) {
        if (!isStory || !isLikelyProfileImageUrl(fetchMeta.ogImage)) {
          addUnique({ url: fetchMeta.ogImage, type: "image", width: null, height: null, source: "prefetch-og" });
        }
      }

      logger.debug("[Downloadit Puppeteer Media Debug] candidates", {
        intercepted: interceptedMedia.length,
        paged: pagedMedia.length,
        renderedHtml: renderedHtmlMedia.length,
        domVideos: domResult.videos.length,
        domImages: domResult.images.length,
        combined: allMedia.length,
        videoCandidates: allMedia.filter((m) => m.type === "video").length,
      });

      const contentType = this.detectContentType(url);

      // Validate and filter. Reel/video pages must never degrade to a poster
      // or profile image when no playable video was exposed. Every drop is
      // tallied by machine-readable reason (never the URL) for production
      // diagnostics.
      const validMedia: MediaItem[] = [];
      const originByUrl = new Map<string, ExtractedMedia>();
      for (const item of allMedia) {
        originByUrl.set(item.url, item);
        if (this.validateMediaUrl(item.url)) {
          validMedia.push({
            url: item.url,
            type: item.type,
            width: item.width,
            height: item.height,
            duration: null,
            thumbnail:
              item.type === "video"
                ? allMedia.find((m) => m.type === "image")?.url ||
                  fetchMeta.ogImage ||
                  null
                : null,
            format: item.type === "video" ? "mp4" : null,
          });
        } else {
          const reason = classifyNormalizationRejection(item.url);
          normalizationRejections[reason] = (normalizationRejections[reason] ?? 0) + 1;
        }
      }

      // Reel/video pages accept ONLY verified playable video candidates:
      // an image/thumbnail/HTML URL must never become the video source.
      //
      // Two-tier acceptance (best first, never arbitrary):
      //   1. Probe-verified: the bounded ranged-GET confirms video/*, an MP4
      //      container header, and a non-degenerate size. Largest first.
      //   2. Trusted network capture: Chromium already received video bytes
      //      for this exact URL (resourceType "media" or video/*, HTTP
      //      200/206, trusted CDN host). Used ONLY when no probe passes —
      //      serverless egress can fail a re-probe for a URL the browser
      //      demonstrably delivered. The URL (with its signed query) is
      //      returned exactly as captured.
      //
      // Safety is unchanged: javascript:/data:/blob:/localhost/private/
      // non-http(s)/credentialed URLs never carry a trusted-capture source
      // and still fail validation; duplicates were already removed above.
      const verifyTally: Record<string, number> = {};
      const rejectionReasons: Record<string, number> = { ...normalizationRejections };
      let playableMedia: MediaItem[] = validMedia;
      let verifiedByProbeCount = 0;
      let trustedCaptureCount = 0;
      // Provenance of the finally selected video (source + host only).
      let selectedCandidateSource: string | null = null;
      if (contentType === "REEL" || contentType === "VIDEO") {
        const videoCandidates = validMedia.filter((item) => item.type === "video");
        const probePassed: RankedVideoCandidate[] = [];
        const captureFallback: Array<{ item: MediaItem; origin: ExtractedMedia }> = [];
        // Instagram split renditions: audio-only MP4s that belong to the same
        // clip. They can never be a video source, so they are diverted here
        // instead of being probed into the video tier.
        const audioOnly: Array<{ item: MediaItem; size: number }> = [];
        await Promise.all(
          videoCandidates.map(async (item) => {
            const check = await verifyVideoCandidate(item.url);
            verifyTally[check.reason] = (verifyTally[check.reason] ?? 0) + 1;
            if (check.reason === "audio-only-payload") {
              audioOnly.push({ item, size: check.contentLength ?? 0 });
              return;
            }
            if (check.ok) {
              probePassed.push({
                item,
                size: check.contentLength ?? 0,
                combined: check.hasVideoTrack === true && check.hasAudioTrack === true,
              });
              return;
            }
            const origin = originByUrl.get(item.url);
            if (origin && isTrustedNetworkCapture(origin)) {
              captureFallback.push({ item, origin });
              return;
            }
            // Rejected by both tiers: record WHY (probe reason slug).
            rejectionReasons[check.reason] = (rejectionReasons[check.reason] ?? 0) + 1;
          })
        );
        probePassed.sort(compareReelVideoCandidates);
        audioOnly.sort((a, b) => b.size - a.size);
        verifiedByProbeCount = probePassed.length;
        trustedCaptureCount = probePassed.length === 0 ? captureFallback.length : 0;
        if (probePassed.length > 0) {
          playableMedia = probePassed.map((entry) => entry.item);
          const firstOrigin = originByUrl.get(playableMedia[0].url);
          selectedCandidateSource = firstOrigin?.source ?? "probe-verified";
        } else if (captureFallback.length > 0) {
          // Discovery order preserved within the fallback tier.
          playableMedia = captureFallback.map((entry) => entry.item);
          selectedCandidateSource = captureFallback[0].origin.source ?? "network-video-response";
          logger.info("Puppeteer assembly using trusted network capture (probe passed 0)", {
            contentType,
            captureFallbackCount: captureFallback.length,
            verifyTally,
            captureHost: hostnameOf(captureFallback[0].item.url),
            captureContentType: captureFallback[0].origin.capturedContentType ?? null,
            captureResourceType: captureFallback[0].origin.capturedResourceType ?? null,
          });
        } else {
          playableMedia = [];
          selectedCandidateSource = null;
        }
        // A Reel whose video renditions all failed verification but whose audio
        // rendition passed is exactly the blank-preview bug: report the real
        // cause instead of an empty playable set.
        if (playableMedia.length === 0 && audioOnly.length > 0) {
          logger.info("Puppeteer found audio renditions but no playable video", {
            contentType,
            audioOnlyCount: audioOnly.length,
            verifyTally,
          });
        }
        // Pair the split audio rendition onto probe-verified, video-only files.
        // Every entry in playableMedia is a rendition of the SAME clip, so
        // they share one audio track; the largest is the most complete encode.
        // A combined file already contains sound: adding the companion would
        // play the same audio twice. Unverified fallback files are also left
        // alone because their track layout is unknown.
        const pairedAudio = audioOnly[0];
        if (pairedAudio && probePassed.length > 0) {
          for (const entry of probePassed) {
            if (!entry.combined && entry.item.type === "video") {
              entry.item.audioUrl = pairedAudio.item.url;
            }
          }
          logger.info("Puppeteer paired split audio rendition", {
            contentType,
            audioOnlyCount: audioOnly.length,
            pairedVideoCount: probePassed.filter((entry) => !entry.combined && entry.item.type === "video").length,
            audioCdnHost: hostnameOf(pairedAudio.item.url),
          });
        }
      } else if (validMedia.length > 0) {
        const firstOrigin = originByUrl.get(validMedia[0]?.url ?? "");
        selectedCandidateSource = firstOrigin?.source ?? null;
      }

      if (playableMedia.length === 0) {
        const rejectedVideoCount = validMedia.filter((item) => item.type === "video").length;
        logger.error("Puppeteer NO_MEDIA_FOUND", {
          url: url.slice(0, 100),
          contentType,
          isServerless: isServerlessRuntime(),
          browserLaunchStatus: this.browser ? "launched" : "not-launched",
          status: fetchMeta.pageStatus,
          finalHost: fetchMeta.pageFinalHost,
          finalPath: fetchMeta.pageFinalPath,
          htmlLength: fetchMeta.htmlLength,
          loginWall: fetchMeta.loginWall,
          challenge: fetchMeta.hasChallenge,
          ogVideoPresence: Boolean(fetchMeta.ogVideo),
          embeddedMediaCount: fetchMeta.embeddedMedia.length,
          videoCandidateCount: rejectedVideoCount,
          validVideoCandidateCount: rejectedVideoCount,
          rejectedCandidateCount: rejectedVideoCount,
          interceptedMediaCount: interceptedMedia.length,
          cdnMediaCount: capturedCdnMediaUrlCount,
          verifyTally,
          rejectionReasons,
          normalizationRejections,
          duplicateCount,
          verifiedByProbeCount,
          trustedCaptureCount,
          hasSession: isInstagramSessionConfigured(),
          domVideoCount: domResult.videos.length,
          domImageCount: domResult.images.length,
          renderedHtmlMediaCount: renderedHtmlMedia.length,
          renderedHtmlStoryMediaCount: renderedHtmlMedia.filter(
            (item) => !isStory || !isLikelyProfileImageUrl(item.url)
          ).length,
          domStoryMediaCount: isStory
            ? [...domResult.videos, ...domResult.images].filter(
                (item) => !isLikelyProfileImageUrl(item)
              ).length
            : domResult.videos.length + domResult.images.length,
          duration: Date.now() - startTime,
        });
        // A Reel/TV page with no discoverable video must NEVER degrade into
        // a fake photo result — surface an honest diagnostic error instead.
        const noVideoKind = this.detectContentType(url);
        if (noVideoKind === "AUDIO") {
          // Audio pages often link the clips using the sound instead of
          // embedding a playable video: try those before giving up.
          const clip = await this.tryResolveAudioClip(url, renderedHtmlText, fetchMeta);
          if (clip) {
            onProgress?.(85, "Audio source found");
            return clip;
          }
          throw createError("AUDIO_NO_SOURCE");
        }
        if (noVideoKind === "REEL" || noVideoKind === "VIDEO") {
          throw videoFailure(
            "assembly-no-playable-video",
            {
              count: validMedia.length,
              types: [...new Set(validMedia.map((m) => m.type))],
            },
            {
              validVideoCount: validMedia.filter((m) => m.type === "video").length,
              rejectedCount: validMedia.filter((m) => m.type === "video").length,
              rejectionReasons,
              verifiedByProbe: verifiedByProbeCount,
              trustedCapture: trustedCaptureCount,
            }
          );
        }
        if (noVideoKind === "STORY") {
          logger.warn("STORY_SOURCE_UNAVAILABLE", {
            url,
            reason: pageState.hasLoginWall
              ? "authentication-required"
              : pageState.hasChallenge
                ? "challenge-required"
                : fetchMeta.pageStatus !== 200
                  ? `instagram-page-status-${fetchMeta.pageStatus ?? "unknown"}`
                  : "no-public-media-exposed",
            interceptedMediaRequestCount,
            capturedCdnMediaUrlCount,
            renderedHtmlMediaCount: renderedHtmlMedia.length,
            embeddedMediaCount: fetchMeta.embeddedMedia.length,
          });
          throw createError("STORY_SOURCE_UNAVAILABLE");
        }
        if (fetchMeta.ogImage) {
          return this.buildResultFromMetadata(url, fetchMeta);
        }
        throw createError("CONTENT_UNAVAILABLE");
      }

      // An audio page whose media is only cover art (no playable video) must
      // never masquerade as a result: look for a linked clip first, then fail
      // honestly so the audio route never reports a confusing "no video".
      if (contentType === "AUDIO" && !validMedia.some((m) => m.type === "video")) {
        const clip = await this.tryResolveAudioClip(url, renderedHtmlText, fetchMeta);
        if (clip) {
          onProgress?.(85, "Audio source found");
          return clip;
        }
        throw createError("AUDIO_NO_SOURCE");
      }

      const orderedMedia = sortVideoFirst(playableMedia, contentType);

      const author =
        fetchMeta.author ||
        extractAuthorFromUrl(url) ||
        extractAuthorFromHtml(JSON.stringify(domResult));

      const rawTitle =
        fetchMeta.title || extractDescriptionFromHtml(JSON.stringify(domResult)) || null;
      const title = rawTitle ? decodeHtmlEntities(rawTitle) : null;
      const decodedAuthor: Author | null = author
        ? {
            username: author.username,
            displayName: author.displayName
              ? decodeHtmlEntities(author.displayName)
              : null,
          }
        : null;

      const thumbnail =
        validMedia.find((m) => m.type === "image")?.url ||
        fetchMeta.ogImage ||
        null;

      logger.info("Puppeteer resolve SUCCESS", {
        contentType,
        discovered: allMedia.length,
        invalidSkipped: allMedia.length - validMedia.length,
        returned: validMedia.length,
        finalCount: orderedMedia.length,
        hasVideo: validMedia.some((m) => m.type === "video"),
        selectedType: orderedMedia[0]?.type ?? null,
        // Production assembly diagnostics: how the playable video was proven
        // and where it came from. Host only — never query, tokens, or cookies.
        validVideoCandidateCount: validMedia.filter((m) => m.type === "video").length,
        verifiedByProbeCount,
        trustedCaptureCount,
        rejectionReasons,
        selectedCandidateSource,
        selectedMediaHost: orderedMedia[0] ? hostnameOf(orderedMedia[0].url) : null,
        verifyTally,
        duration: Date.now() - startTime,
        // Timing diagnostics: where the time actually went, so a slow resolve
        // is attributed instead of guessed.
        ...timings,
        // Resource-interception diagnostics: how much work the page was allowed
        // to do vs blocked, and how much JSON was buffered to find the media.
        interception: {
          blockedRequests: blockedRequestCount,
          mediaRequests: interceptedMediaRequestCount,
          jsonInspected: jsonInspectedCount,
          jsonSkipped: jsonSkippedCount,
          jsonKbRead: Math.round(jsonBytesRead / 1024),
          cdnMediaCaptured: capturedCdnMediaUrlCount,
        },
      });
      onProgress?.(85, "Media extracted");

      return {
        type: contentType,
        sourceUrl: url,
        thumbnail,
        title,
        author: decodedAuthor,
        media: orderedMedia,
      };
    } catch (error) {
      // Only OUR errors (createError) may propagate as-is. Puppeteer's
      // ProtocolError/ConnectionClosedError also carry a `code` property —
      // checking `"code" in error` let them escape raw and reach the route
      // as unknown failures (surfacing the generic "temporary issue").
      if (error instanceof AppError) throw error;

      logger.error("Puppeteer RESOLVER_FAILED", {
        error: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : "unknown",
        url,
        duration: Date.now() - startTime,
      });

      // A cancellation must not kill the shared browser for everyone else:
      // close this page (the `finally` below) and report a plain cancellation.
      // Only a DEADLINE means the page itself may be wedged, so that case
      // still tears the browser down.
      if (signal.aborted && !isConnectionLostError(error)) {
        if (signal.reason === DEADLINE_REASON) {
          this.resetBrowser("resolve-deadline");
          throw createError("PROVIDER_TIMEOUT");
        }
        const cancelled = new Error("resolve cancelled by caller");
        cancelled.name = "AbortError";
        throw cancelled;
      }

      if (isConnectionLostError(error)) {
        // Transport died mid-resolve: reset the handle so this URL works on
        // the next attempt instead of failing forever on a dead socket.
        this.resetBrowser("resolve-connection-lost");
        throw createError("PROVIDER_UNAVAILABLE");
      }
      if (isTimeoutError(error)) {
        throw createError("PROVIDER_TIMEOUT");
      }
      throw createError("PROVIDER_UNAVAILABLE");
    } finally {
      if (slot) {
        slot.release();
        const i = this.pageSlotLeases.indexOf(slot);
        if (i >= 0) this.pageSlotLeases.splice(i, 1);
      }
      if (page) {
        await page.close().catch(() => {});
      }
      this.lastUsedAt = Date.now();
      this.scheduleIdleRelease();
    }
  }

  /**
   * Audio-page recovery: `/reels/audio/<id>/` pages frequently contain no
   * playable video themselves but link clips using the sound. Scan the
   * rendered page for up to 2 linked reel/post shortcodes and probe each with
   * a cheap plain-HTTP metadata fetch (no extra browser work). Returns an
   * AUDIO result backed by the first clip with a trusted playable video, or
   * null when no accessible source exists. Never throws.
   */
  private async tryResolveAudioClip(
    url: string,
    renderedHtml: string,
    meta: { ogImage: string | null; title: string | null; description: string | null; author: Author | null }
  ): Promise<ResolverResult | null> {
    const codes: string[] = [];
    const seen = new Set<string>();
    try {
      const re = /\/(?:reel|reels|p)\/([A-Za-z0-9_-]{5,30})\/?/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(renderedHtml)) !== null && codes.length < 2) {
        const code = m[1];
        if (!seen.has(code) && code !== "audio") {
          seen.add(code);
          codes.push(code);
        }
      }
    } catch {
      return null;
    }

    for (const code of codes) {
      try {
        const clipMeta = await fetchMetadata(`https://www.instagram.com/reel/${code}/`);
        if (!clipMeta.ogVideo || clipMeta.loginWall) continue;
        const author = meta.author || clipMeta.author || extractAuthorFromUrl(url);
        const decodedAuthor: Author | null = author
          ? {
              username: author.username,
              displayName: author.displayName ? decodeHtmlEntities(author.displayName) : null,
            }
          : null;
        const rawTitle = meta.title || meta.description || clipMeta.title || clipMeta.description;
        logger.info("Puppeteer audio page resolved via linked clip", { code: code.slice(0, 12) });
        return {
          type: "AUDIO",
          sourceUrl: url,
          thumbnail: clipMeta.ogImage || meta.ogImage,
          title: rawTitle ? decodeHtmlEntities(rawTitle) : null,
          author: decodedAuthor,
          media: [
            {
              url: clipMeta.ogVideo,
              type: "video",
              width: null,
              height: null,
              duration: null,
              thumbnail: clipMeta.ogImage || meta.ogImage,
              format: "mp4",
            },
          ],
        };
      } catch {
        // Try the next candidate clip.
      }
    }
    return null;
  }

  private buildResultFromMetadata(
    url: string,
    meta: { ogImage: string | null; ogVideo?: string | null; title: string | null; description: string | null; author: Author | null }
  ): ResolverResult {
    const contentType = this.detectContentType(url);
    if (contentType === "AUDIO") {
      // Cover art alone is not an audio result: the audio route could only
      // fail downstream with a confusing "no video" message. Fail honestly
      // here so callers get a clear audio error instead.
      throw createError("AUDIO_NO_SOURCE");
    }
    const author = meta.author || extractAuthorFromUrl(url);

    const decodedAuthor: Author | null = author
      ? {
          username: author.username,
          displayName: author.displayName
            ? decodeHtmlEntities(author.displayName!)
            : null,
        }
      : null;
    const rawTitle = meta.title || meta.description;
    const title = rawTitle ? decodeHtmlEntities(rawTitle) : null;

    const media: MediaItem[] = [];

    // For Reel/Video: prioritize og:video (the actual playable MP4 from the
    // page meta) before the poster image. This enables a pure-prefetch fallback
    // when the headless browser is blocked by Instagram on datacenter IPs.
    if (meta.ogVideo && this.validateMediaUrl(meta.ogVideo)) {
      media.push({
        url: meta.ogVideo,
        type: "video",
        width: null,
        height: null,
        duration: null,
        thumbnail: meta.ogImage && this.validateMediaUrl(meta.ogImage) ? meta.ogImage : null,
        format: "mp4",
      });
    }

    if (meta.ogImage && this.validateMediaUrl(meta.ogImage)) {
      media.push({
        url: meta.ogImage,
        type: "image",
        width: null,
        height: null,
        duration: null,
        thumbnail: null,
        format: null,
      });
    }

    if (media.length === 0) {
      // Same honesty rule as the main path: never fake a photo for a Reel.
      const fallbackKind = this.detectContentType(url);
      if (fallbackKind === "REEL" || fallbackKind === "VIDEO") {
        const err = createError("VIDEO_SOURCE_NOT_FOUND");
        throw new AppError(err.code, err.message, err.statusCode, {
          provider: "puppeteer",
          runtime: isServerlessRuntime() ? "serverless" : "local",
          stage: "metadata-fallback-no-media",
          videoGraphFound: false,
          normalizedMediaCount: 0,
          normalizedMediaTypes: [],
        });
      }
      throw createError("CONTENT_UNAVAILABLE");
    }

    logger.info("Puppeteer resolve from metadata (no video)", {
      contentType,
      mediaCount: media.length,
    });

    return {
      type: contentType,
      sourceUrl: url,
      thumbnail: meta.ogImage,
      title,
      author: decodedAuthor,
      media,
    };
  }

  private detectContentType(url: string): InstagramContentType {
    if (url.includes("/reels/audio/")) return "AUDIO";
    if (url.includes("/reel/") || url.includes("/reels/")) return "REEL";
    if (url.includes("/stories/")) {
      if (url.includes("/highlights/")) return "HIGHLIGHT";
      return "STORY";
    }
    if (url.includes("/p/")) return "POST";
    if (url.includes("/tv/")) return "VIDEO";
    return "UNKNOWN";
  }

  /**
   * Release every browser resource. Safe to call repeatedly and during
   * shutdown: it clears the idle timer, refuses new work, waits for an
   * in-flight launch, and closes Chromium so no orphan process survives.
   */
  async close(): Promise<void> {
    this.closing = true;
    this.clearIdleTimer();
    // Wait for an in-flight launch so we close the handle it installs rather
    // than leaking a freshly spawned Chromium.
    const launching = this.launching;
    if (launching) {
      await launching.catch(() => {});
    }
    await this.closeBrowser("close-requested");
    // Release every page-slot lease so a caller blocked in the gate queue is
    // woken and refused (503) instead of waiting out the whole queue window
    // during shutdown. The gate reclaims its own counters; the provider's
    // `closing` flag stops new browser work.
    for (const lease of this.pageSlotLeases) lease.release();
    this.pageSlotLeases = [];
  }
}

// Release Chromium on graceful shutdown even when nothing calls close()
// explicitly (e.g. a long-lived server drained by SIGTERM).
registerCleanup("puppeteer-browser", async () => {
  try {
    const { getProvider } = await import("./index.js");
    const provider = getProvider() as { close?: () => Promise<void> };
    if (typeof provider.close === "function") {
      await provider.close();
    }
  } catch (err) {
    logger.warn("Puppeteer shutdown cleanup failed", {
      error: err instanceof Error ? err.message : "unknown",
    });
  }
});
