import { appendFileSync, existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { getInstagramSessionCookie } from "./instagram-session.js";
import { canonicalReelUrl } from "./validators/instagram-url.js";
import { logger } from "./logger.js";
import { getFfmpegPath, isFfmpegAvailable } from "./ffmpeg.js";
import {
  getYtDlpVersion,
  runYtDlp,
  YtDlpAbortedError,
  YtDlpNotAvailableError,
  YtDlpProcessError,
} from "./ytdlp.js";
import type { ErrorCode, InstagramContentType, MediaItem, ResolverResult, ResolveProgressCallback } from "./types.js";

const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
const IG_APP_ID = "936619743392459";
const ERROR_LOG = join(tmpdir(), "downloadit-instagram-ytdlp.log");
/** Public reel used only to see whether cookies and this network still work. */
export const KNOWN_PUBLIC_REEL = "https://www.instagram.com/reel/DH56yy7p3lZ/";

export type ReelFailureKind = "login" | "rate-limit" | "private" | "unavailable" | "ip-block" | "other";

export interface ReelFailure {
  kind: ReelFailureKind;
  code: ErrorCode;
  statusCode: number;
  message: string;
  retryable: boolean;
}

interface FormatRow {
  url?: string;
  vcodec?: string;
  acodec?: string;
  ext?: string;
  width?: number | null;
  height?: number | null;
  filesize?: number | null;
  filesize_approx?: number | null;
  tbr?: number | null;
}

export interface SelectedReelMedia {
  url: string;
  audioUrl: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  size: number | null;
  ext: string | null;
}

let warnedMissingCookies = false;
let loggedEngine = false;
let queue: Promise<void> = Promise.resolve();
let lastDownloadAt = 0;
let knownGoodOk = false;
let knownGoodBlocked = false;

export function instagramYtDlpErrorLogPath(): string {
  return ERROR_LOG;
}

/** This process is a cloud host when the platform sets one of these. */
export function instagramRuntimeHost(): "cloud" | "local" {
  if (
    process.env.VERCEL ||
    process.env.VERCEL_ENV ||
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.RENDER ||
    process.env.FLY_APP_NAME ||
    process.env.AWS_EXECUTION_ENV ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.K_SERVICE ||
    process.env.DYNO
  ) {
    return "cloud";
  }
  return "local";
}

function logEngineOnce(): void {
  if (loggedEngine) return;
  loggedEngine = true;
  const proxy = proxyUrl();
  let proxyHost: string | null = null;
  if (proxy) {
    try {
      proxyHost = new URL(proxy).hostname;
    } catch {
      proxyHost = null;
    }
  }
  logger.info("[INSTAGRAM] reel engine", {
    ytDlpVersion: getYtDlpVersion(),
    host: instagramRuntimeHost(),
    cookiesFileConfigured: Boolean(cookieFilePath()),
    proxyConfigured: Boolean(proxy),
    proxyHost,
    errorLog: ERROR_LOG,
  });
}

/**
 * Netscape rows for yt-dlp from a Cookie header. Names are checked; values
 * are copied through and never logged.
 */
export function netscapeFromCookieHeader(header: string): string | null {
  const lines = ["# Netscape HTTP Cookie File"];
  for (const part of header.split(";")) {
    const piece = part.trim();
    const eq = piece.indexOf("=");
    if (eq <= 0) continue;
    const name = piece.slice(0, eq).trim();
    const value = piece.slice(eq + 1).trim();
    if (!/^[A-Za-z0-9_-]+$/.test(name) || !value || /[\r\n\t]/.test(value)) continue;
    lines.push(`.instagram.com\tTRUE\t/\tTRUE\t0\t${name}\t${value}`);
  }
  const text = `${lines.join("\n")}\n`;
  return inspectNetscapeCookieText(text) === "invalid" ? null : text;
}

let materializedCookiePath: string | null | undefined;

function writeCookieJar(text: string): string | null {
  if (inspectNetscapeCookieText(text) === "invalid") return null;
  const path = join(tmpdir(), "downloadit-instagram-cookies.txt");
  try {
    writeFileSync(path, text.endsWith("\n") ? text : `${text}\n`, { mode: 0o600 });
    return path;
  } catch {
    return null;
  }
}

/** Netscape jar carried in the environment, for hosts with no cookie file. */
function cookieTextFromEnv(): string | null {
  const encoded = process.env.INSTAGRAM_COOKIES_B64?.trim() ?? "";
  if (encoded) {
    try {
      const text = Buffer.from(encoded, "base64").toString("utf8");
      if (text.includes("sessionid")) return text;
    } catch {
      return null;
    }
  }
  const raw = process.env.INSTAGRAM_COOKIES ?? "";
  if (raw.includes("sessionid") && raw.includes("\t")) return raw.replace(/\\n/g, "\n");
  return null;
}

function materializeCookies(): string | null {
  if (materializedCookiePath !== undefined) return materializedCookiePath;
  const fromEnv = cookieTextFromEnv();
  if (fromEnv) {
    materializedCookiePath = writeCookieJar(fromEnv);
    return materializedCookiePath;
  }
  const header = getInstagramSessionCookie();
  const text = header ? netscapeFromCookieHeader(header) : null;
  materializedCookiePath = text ? writeCookieJar(text) : null;
  return materializedCookiePath;
}

/**
 * Netscape cookie file for yt-dlp. A real INSTAGRAM_COOKIES_FILE wins.
 * On a serverless host that path does not exist, so the configured session
 * (or INSTAGRAM_COOKIES_B64) is written to a temp jar. Values are never logged.
 */
export function cookieFilePath(): string | null {
  const raw = process.env.INSTAGRAM_COOKIES_FILE?.trim() ?? "";
  if (raw && !raw.includes("\r") && !raw.includes("\n")) {
    try {
      if (existsSync(raw) && statSync(raw).isFile()) return raw;
    } catch {
      /* missing file falls through to the session already configured in env */
    }
  }
  const relativeCandidates = [
    join(process.cwd(), ".cookies", "instagram.txt"),
    join(process.cwd(), "backend", ".cookies", "instagram.txt"),
  ];
  for (const candidate of relativeCandidates) {
    try {
      if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
    } catch {
      /* try next */
    }
  }
  return materializeCookies();
}

function warnIfCookiesMissing(): void {
  if (cookieFilePath()) return;
  if (warnedMissingCookies) return;
  warnedMissingCookies = true;
  const configured = Boolean(
    process.env.INSTAGRAM_COOKIES_FILE?.trim() ||
      process.env.INSTAGRAM_COOKIES_B64?.trim() ||
      process.env.INSTAGRAM_COOKIES?.trim()
  );
  logger.warn("[INSTAGRAM] no cookies file", {
    configured,
    detail: configured
      ? "Instagram cookies are configured but could not be read. Trying this reel without cookies."
      : "No Instagram cookie file or session is configured. Trying this reel without cookies.",
  });
}

export function proxyUrl(): string | null {
  const raw = process.env.PROXY_URL?.trim() ?? "";
  if (!raw || /[\s\r\n]/.test(raw)) return null;
  try {
    const parsed = new URL(raw);
    if (!["http:", "https:", "socks4:", "socks5:", "socks5h:"].includes(parsed.protocol)) return null;
    return raw;
  } catch {
    return null;
  }
}

function hasVideo(format: FormatRow): boolean {
  return Boolean(format.vcodec && format.vcodec !== "none" && format.url);
}

function hasAudio(format: FormatRow): boolean {
  return Boolean(format.acodec && format.acodec !== "none" && format.url);
}

function rank(format: FormatRow): number {
  const height = typeof format.height === "number" ? format.height : 0;
  const bitrate = typeof format.tbr === "number" ? format.tbr : 0;
  return height * 1000 + bitrate;
}

/**
 * Pick a playable reel. A file longer than a minute is kept. A combined
 * video+audio file wins; otherwise the best picture is paired with the best
 * separate audio track so ffmpeg can merge them at download time.
 */
export function selectInstagramReelMedia(
  formats: FormatRow[],
  duration: number | null
): SelectedReelMedia | null {
  const rows = formats.filter((format) => typeof format.url === "string" && format.url.startsWith("http"));
  const combined = rows.filter((format) => hasVideo(format) && hasAudio(format)).sort((a, b) => rank(b) - rank(a));
  const winner = combined[0];
  if (winner?.url) {
    return {
      url: winner.url,
      audioUrl: null,
      width: typeof winner.width === "number" ? winner.width : null,
      height: typeof winner.height === "number" ? winner.height : null,
      duration,
      size: winner.filesize ?? winner.filesize_approx ?? null,
      ext: winner.ext ?? "mp4",
    };
  }
  const video = rows.filter(hasVideo).sort((a, b) => rank(b) - rank(a))[0];
  if (!video?.url) return null;
  const audio = rows.filter((format) => hasAudio(format) && !hasVideo(format)).sort((a, b) => rank(b) - rank(a))[0];
  return {
    url: video.url,
    audioUrl: audio?.url ?? null,
    width: typeof video.width === "number" ? video.width : null,
    height: typeof video.height === "number" ? video.height : null,
    duration,
    size: video.filesize ?? video.filesize_approx ?? null,
    ext: video.ext ?? "mp4",
  };
}

const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

function isImageRef(ext?: string | null, url?: string | null): boolean {
  const kind = (ext ?? "").toLowerCase().split("?")[0];
  if (IMAGE_EXT.has(kind)) return true;
  return Boolean(url && /\.(jpe?g|png|webp|gif)(?:$|\?)/i.test(url));
}

/**
 * Netscape cookie jar check. Reads names and expiry timestamps only.
 * Cookie values never leave this function.
 */
export function inspectNetscapeCookieText(text: string, nowSec = Math.floor(Date.now() / 1000)): "ok" | "expired" | "invalid" {
  let sawSession = false;
  let expired = false;
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const cols = trimmed.split("\t");
    if (cols.length < 7) continue;
    if (cols[5]?.trim().toLowerCase() !== "sessionid") continue;
    sawSession = true;
    const expiry = Number(cols[4]);
    if (Number.isFinite(expiry) && expiry > 0 && expiry < nowSec) expired = true;
  }
  if (!sawSession) return "invalid";
  if (expired) return "expired";
  return "ok";
}

export function classifyInstagramYtDlpError(
  stderr: string,
  host: "cloud" | "local",
  hint: "restricted" | "public" | "unknown" = "unknown"
): ReelFailure {
  const text = stderr.toLowerCase();
  if (/cookies are no longer valid|fresh cookies|login required|log in to instagram|login_required|checkpoint required/.test(text)) {
    return {
      kind: "login",
      code: "INSTAGRAM_LOGIN_REQUIRED",
      statusCode: 401,
      message: "Cookies expired/invalid — please re-export",
      retryable: false,
    };
  }
  if (/rate[- ]?limit|too many requests|try again later|http error 429\b|please wait a few minutes/.test(text)) {
    return {
      kind: "rate-limit",
      code: "INSTAGRAM_RATE_LIMITED",
      statusCode: 429,
      message: "Rate limited — try again later",
      retryable: true,
    };
  }
  if (/private account|this account is private|video is private/.test(text)) {
    return {
      kind: "private",
      code: "CONTENT_UNAVAILABLE",
      statusCode: 404,
      message: "This reel is private or restricted, so it can't be downloaded",
      retryable: false,
    };
  }
  if (
    hint === "restricted" ||
    /age[- ]?restrict|people under 13|geoblock|not available in your (country|region)|region[- ]blocked|deleted|restricted video|content is unavailable|isn't available|video unavailable|requested content is not available/.test(
      text
    )
  ) {
    return {
      kind: "unavailable",
      code: "CONTENT_UNAVAILABLE",
      statusCode: 404,
      message: "This reel is private or restricted, so it can't be downloaded",
      retryable: false,
    };
  }
  const blockedStatus = /http error 403\b|http error 401\b|empty media response|no video formats|unable to extract/.test(text);
  if (blockedStatus && (knownGoodBlocked || (host === "cloud" && hint === "public"))) {
    return {
      kind: "ip-block",
      code: "UPSTREAM_FORBIDDEN",
      statusCode: 403,
      message: "Direct media stream temporarily unavailable",
      retryable: false,
    };
  }
  if (blockedStatus) {
    return {
      kind: "ip-block",
      code: "UPSTREAM_FORBIDDEN",
      statusCode: 403,
      message: "Direct media stream temporarily unavailable",
      retryable: host !== "cloud",
    };
  }
  return {
    kind: "other",
    code: "RESOLVER_FAILED",
    statusCode: 502,
    message: "Instagram did not return a playable video for this reel. Please try again.",
    retryable: true,
  };
}

function redactErrorText(text: string): string {
  return text
    .replace(/(sessionid|csrftoken|ds_user_id|authorization)=([^;\s]+)/gi, "$1=[redacted]")
    .replace(/--cookies(?:=|\s+)\S+/gi, "--cookies [path]");
}

function writeErrorLog(text: string): void {
  try {
    appendFileSync(ERROR_LOG, `[${new Date().toISOString()}]\n${redactErrorText(text).slice(-12000)}\n`);
  } catch {
    logger.warn("[INSTAGRAM] could not write yt-dlp error log", { errorLog: ERROR_LOG });
  }
}

async function anonymousOembedState(
  pageUrl: string,
  signal?: AbortSignal
): Promise<"restricted" | "public" | "unknown"> {
  try {
    const response = await fetch(
      `https://www.instagram.com/api/v1/oembed/?url=${encodeURIComponent(pageUrl)}`,
      {
        headers: { "User-Agent": DESKTOP_UA, Accept: "application/json", "X-IG-App-ID": IG_APP_ID },
        redirect: "manual",
        signal,
      }
    );
    if (response.status === 200) {
      await response.body?.cancel().catch(() => {});
      return "public";
    }
    if (response.status !== 400) {
      await response.body?.cancel().catch(() => {});
      return "unknown";
    }
    const text = await response.text();
    if (text.length > 8000) return "unknown";
    if (/geoblock_required|People under 13|set limits on who can see|not available in your|region/i.test(text)) {
      return "restricted";
    }
    return "unknown";
  } catch {
    return "unknown";
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    timer.unref?.();
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(new YtDlpAbortedError("aborted"));
    };
    if (signal?.aborted) {
      clearTimeout(timer);
      reject(new YtDlpAbortedError("aborted"));
      return;
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

async function withDownloadSlot<T>(job: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  const run = queue.then(async () => {
    if (lastDownloadAt > 0) {
      const gap = 5000 + Math.floor(Math.random() * 5001);
      const waited = Date.now() - lastDownloadAt;
      if (waited < gap) await sleep(gap - waited, signal);
    }
    try {
      return await job();
    } finally {
      lastDownloadAt = Date.now();
    }
  });
  queue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

interface DumpNode {
  url?: string;
  duration?: number;
  width?: number;
  height?: number;
  ext?: string;
  filesize?: number;
  filesize_approx?: number;
  formats?: FormatRow[];
  requested_formats?: FormatRow[];
  thumbnail?: string;
  title?: string;
  uploader?: string;
  uploader_id?: string;
  id?: string;
  entries?: Array<DumpNode | null>;
}

function mediaFromInfo(info: DumpNode): SelectedReelMedia | null {
  const duration = typeof info.duration === "number" && info.duration > 0 ? info.duration : null;
  const requested = info.requested_formats ?? [];
  const formats = [...requested, ...(info.formats ?? [])];
  if (
    requested.length < 2 &&
    typeof info.url === "string" &&
    !isImageRef(info.ext, info.url) &&
    !formats.some((format) => format.url === info.url)
  ) {
    formats.unshift({
      url: info.url,
      ext: info.ext,
      width: info.width,
      height: info.height,
      filesize: info.filesize ?? info.filesize_approx,
      vcodec: "avc1",
      acodec: "aac",
    });
  }
  const selected = selectInstagramReelMedia(formats, duration);
  if (selected && isImageRef(selected.ext, selected.url)) return null;
  return selected;
}

function videoItem(info: DumpNode): MediaItem | null {
  const selected = mediaFromInfo(info);
  if (!selected) return null;
  return {
    url: selected.url,
    audioUrl: selected.audioUrl,
    type: "video",
    width: selected.width,
    height: selected.height,
    duration: selected.duration,
    size: selected.size,
    thumbnail: typeof info.thumbnail === "string" ? info.thumbnail : null,
    format: selected.ext ?? "mp4",
  };
}

function imageItem(info: DumpNode): MediaItem | null {
  const rows: FormatRow[] = [...(info.formats ?? [])];
  if (typeof info.url === "string") {
    rows.unshift({
      url: info.url,
      ext: info.ext,
      width: info.width,
      height: info.height,
      filesize: info.filesize ?? info.filesize_approx,
    });
  }
  const image = rows.find(
    (row) => typeof row.url === "string" && row.url.startsWith("http") && isImageRef(row.ext, row.url) && !hasVideo(row)
  );
  if (!image?.url) return null;
  return {
    url: image.url,
    type: "image",
    width: typeof image.width === "number" ? image.width : typeof info.width === "number" ? info.width : null,
    height: typeof image.height === "number" ? image.height : typeof info.height === "number" ? info.height : null,
    duration: null,
    size: image.filesize ?? image.filesize_approx ?? null,
    thumbnail: typeof info.thumbnail === "string" ? info.thumbnail : image.url,
    format: image.ext ?? "jpg",
    audioUrl: null,
  };
}

function itemsFromInfo(info: DumpNode): MediaItem[] {
  const entries = (info.entries ?? []).filter((entry): entry is DumpNode => Boolean(entry) && typeof entry === "object");
  const nodes = entries.length > 0 ? entries : [info];
  const items: MediaItem[] = [];
  for (const node of nodes) {
    const video = videoItem(node);
    if (video) {
      items.push(video);
      continue;
    }
    const image = imageItem(node);
    if (image) items.push(image);
  }
  return items;
}

function contentTypeFor(pathname: string, items: MediaItem[]): InstagramContentType {
  const head = pathname.split("/").filter(Boolean)[0]?.toLowerCase();
  if (head === "reel" || head === "reels") return "REEL";
  if (items.length > 1) return "CAROUSEL";
  if (items[0]?.type === "image") return "PHOTO";
  return "POST";
}

function slideIndexFrom(url: URL): number | null {
  const raw = url.searchParams.get("img_index");
  if (!raw) return null;
  const index = parseInt(raw, 10);
  if (!Number.isFinite(index) || index < 1 || index > 100) return null;
  return index - 1;
}

async function dumpReel(url: string, signal?: AbortSignal): Promise<{ media: MediaItem[]; info: DumpNode }> {
  warnIfCookiesMissing();
  logEngineOnce();
  const ffmpeg = (await isFfmpegAvailable()) ? getFfmpegPath() : null;
  const reel = /\/reel\//.test(url);
  const args = ["--no-warnings", "--dump-single-json", "--no-download"];
  if (reel) args.push("--no-playlist", "-f", "best[acodec!=none][vcodec!=none]/bv*+ba/b");
  else args.push("--yes-playlist");
  if (ffmpeg) args.push("--ffmpeg-location", dirname(ffmpeg));
  const cookies = cookieFilePath();
  if (cookies) args.push("--cookies", cookies);
  const proxy = proxyUrl();
  if (proxy) args.push("--proxy", proxy);
  args.push(url);
  const result = await runYtDlp(args, { timeoutMs: 60_000, signal });
  const info = JSON.parse(result.stdout) as DumpNode;
  const media = itemsFromInfo(info);
  if (media.length === 0) {
    throw new YtDlpProcessError("yt-dlp failed", "Instagram sent an empty media response", 1);
  }
  return { media, info };
}

export interface ReelResolveOutcome {
  result?: ResolverResult;
  failure?: ReelFailure;
  /** When false, the caller may try the existing public extractor. */
  terminal: boolean;
}

export async function resolveInstagramReelYtDlp(
  rawUrl: string,
  signal?: AbortSignal,
  onProgress?: ResolveProgressCallback
): Promise<ReelResolveOutcome> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { terminal: false };
  }
  const canonical = canonicalReelUrl(parsed);
  if (!canonical) return { terminal: false };
  const shortcode = canonical.pathname.split("/").filter(Boolean)[1];
  const host = instagramRuntimeHost();
  try {
    onProgress?.(25, "Analyzing Instagram post...");
    const dumped = await withDownloadSlot(async () => {
      let lastError: unknown;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          onProgress?.(50, "Extracting media streams...");
          return await dumpReel(canonical.href, signal);
        } catch (error) {
          lastError = error;
          if (error instanceof YtDlpAbortedError || error instanceof YtDlpNotAvailableError) throw error;
          const stderr = error instanceof YtDlpProcessError ? error.stderr : "";
          writeErrorLog(stderr || (error instanceof Error ? error.message : "yt-dlp failed"));
          const hint = await anonymousOembedState(canonical.href, signal);
          const failure = classifyInstagramYtDlpError(stderr, host, hint);
          logger.warn("[INSTAGRAM] yt-dlp reel failed", {
            shortcode,
            attempt,
            kind: failure.kind,
            version: getYtDlpVersion(),
            errorLog: ERROR_LOG,
          });
          if (!failure.retryable || failure.kind === "ip-block" || attempt === 2) throw error;
          await sleep(3000 * (attempt + 1), signal);
        }
      }
      throw lastError;
    }, signal);
    const media = dumped.media;
    const info = dumped.info;
    const first = media[0];
    knownGoodOk = true;
    if (canonical.href === KNOWN_PUBLIC_REEL) knownGoodBlocked = false;
    onProgress?.(80, "Optimizing media format...");
    logger.info("[INSTAGRAM] yt-dlp media resolved", {
      shortcode,
      version: getYtDlpVersion(),
      count: media.length,
      type: first?.type ?? null,
      duration: first?.duration ?? null,
      hasSeparateAudio: Boolean(first?.audioUrl),
      height: first?.height ?? null,
    });
    return {
      terminal: true,
      result: {
        type: contentTypeFor(canonical.pathname, media),
        sourceUrl: canonical.href,
        thumbnail: typeof info.thumbnail === "string" ? info.thumbnail : first?.thumbnail ?? null,
        title: typeof info.title === "string" ? info.title.slice(0, 180) : null,
        author:
          info.uploader || info.uploader_id
            ? { username: info.uploader_id ?? null, displayName: info.uploader ?? null }
            : null,
        mediaId: typeof info.id === "string" ? info.id : shortcode,
        startIndex: slideIndexFrom(parsed),
        media,
      },
    };
  } catch (error) {
    if (error instanceof YtDlpAbortedError) throw error;
    if (error instanceof YtDlpNotAvailableError) return { terminal: false };
    const stderr = error instanceof YtDlpProcessError ? error.stderr : "";
    const hint = await anonymousOembedState(canonical.href, signal);
    if (canonical.href === KNOWN_PUBLIC_REEL && /http error 403\b|http error 429\b|empty media response/i.test(stderr)) {
      knownGoodBlocked = true;
    }
    const failure = classifyInstagramYtDlpError(stderr, host, hint);
    if (failure.kind === "unavailable" || failure.kind === "private" || failure.kind === "login") {
      return { failure, terminal: true };
    }
    // IP-block / empty response should never terminate resolution — fall back to provider (Puppeteer/embed)
    if (failure.kind === "ip-block") {
      return { failure, terminal: false };
    }
    if (failure.kind === "other") return { failure, terminal: false };
    return { failure, terminal: false };
  }
}

/**
 * Startup check. Confirms yt-dlp's version, then checks the Netscape cookie
 * file's session expiry without logging any cookie value. When the file looks
 * usable, one known public reel is requested with those cookies.
 */
export async function checkInstagramCookies(): Promise<void> {
  logger.info("[INSTAGRAM] yt-dlp version", { version: getYtDlpVersion(), host: instagramRuntimeHost() });
  const path = cookieFilePath();
  if (!path) {
    logger.warn("[INSTAGRAM] cookies", {
      state: "missing",
      detail: "INSTAGRAM_COOKIES_FILE is not set. Reels only your logged-in account can view need a Netscape cookies.txt from that account.",
    });
    return;
  }
  let text = "";
  try {
    text = readFileSync(path, "utf8");
  } catch {
    logger.warn("[INSTAGRAM] cookies", { state: "unreadable", detail: "Cookies expired/invalid — please re-export" });
    return;
  }
  const state = inspectNetscapeCookieText(text);
  if (state !== "ok") {
    logger.warn("[INSTAGRAM] cookies", { state, detail: "Cookies expired/invalid — please re-export" });
    return;
  }
  const outcome = await resolveInstagramReelYtDlp(KNOWN_PUBLIC_REEL);
  if (outcome.result) {
    logger.info("[INSTAGRAM] cookie check passed", { version: getYtDlpVersion(), host: instagramRuntimeHost() });
    return;
  }
  logger.warn("[INSTAGRAM] cookies", {
    state: outcome.failure?.kind === "login" ? "rejected" : "check-failed",
    detail: outcome.failure?.message ?? "Known public reel could not be read with the cookie file.",
  });
}
