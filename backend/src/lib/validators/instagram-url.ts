import { logger } from "../logger.js";

const ALLOWED_HOSTS = ["www.instagram.com", "instagram.com", "m.instagram.com"];

const UNSUPPORTED_PATHS = ["/accounts/login", "/accounts/signup"];

const TRACKING_PARAMS = new Set([
  "igsh",
  "igshid",
  "ig_cache_key",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
  "feature",
  "stkn",
]);

export interface ParsedInstagramUrl {
  normalized: string;
  hostname: string;
  pathname: string;
  contentType: string | null;
  shortcode: string | null;
  storyUsername: string | null;
  storyId: string | null;
  highlightId: string | null;
  /**
   * 0-based carousel start slide from `?img_index=N` (Instagram numbers
   * slides from 1). Null when absent/invalid. View-state only: stripped from
   * the normalized URL so identical posts share one cache entry.
   */
  slideIndex: number | null;
  /** Instagram audio ID from `/reels/audio/<id>/` (null otherwise). */
  audioId: string | null;
}

export function validateInstagramUrl(raw: string): {
  valid: boolean;
  error?: string;
  parsed?: ParsedInstagramUrl;
} {
  if (!raw || typeof raw !== "string") {
    return { valid: false, error: "No URL provided." };
  }

  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: "URL is empty." };
  }

  if (trimmed.length > 2048) {
    return { valid: false, error: "URL is too long." };
  }

  if (/^(javascript|data|blob|vbscript):/i.test(trimmed)) {
    return { valid: false, error: "Invalid URL scheme." };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: "Malformed URL." };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { valid: false, error: "Only HTTP and HTTPS URLs are supported." };
  }

  if (parsed.username || parsed.password) {
    return { valid: false, error: "Invalid URL format." };
  }

  if (!ALLOWED_HOSTS.includes(parsed.hostname.toLowerCase())) {
    return { valid: false, error: "This is not an Instagram URL." };
  }

  const pathLower = parsed.pathname.toLowerCase();

  for (const unsupported of UNSUPPORTED_PATHS) {
    if (pathLower.startsWith(unsupported)) {
      return {
        valid: false,
        error: "This URL type is not supported for download.",
      };
    }
  }

  const contentType = detectContentTypeFromPath(parsed.pathname);
  if (contentType === null) {
    return {
      valid: false,
      error:
        "This Instagram URL pattern is not supported. Try a link to a post, reel, story, or video.",
    };
  }

  // Story-specific routing diagnostics (no cookies/secrets — URL + classification only).
  if (contentType === "STORY" || contentType === "STORY_PROFILE" || contentType === "HIGHLIGHT") {
    const diagSegments = parsed.pathname.split("/").filter(Boolean);
    logger.info("[STORY] Input URL", { input: trimmed.slice(0, 120) });
    logger.info("[STORY] URL classified as " + contentType, {
      pathname: parsed.pathname.slice(0, 120),
      segments: diagSegments.length,
    });
    logger.info("[STORY] Username extracted", {
      username: extractStoryUsername(parsed.pathname),
    });
    logger.info("[STORY] Story ID", { storyId: extractStoryId(parsed.pathname) });
    logger.info("[STORY] Resolver selected", { resolver: "resolveStoryUrl" });
  }

  const cleaned = cleanUrl(parsed);

  return {
    valid: true,
    parsed: {
      normalized: cleaned.href,
      hostname: parsed.hostname.toLowerCase(),
      pathname: parsed.pathname,
      contentType,
      shortcode: extractShortcode(parsed.pathname),
      storyUsername: extractStoryUsername(parsed.pathname),
      storyId: extractStoryId(parsed.pathname),
      highlightId: extractHighlightId(parsed.pathname),
      slideIndex: extractSlideIndex(parsed.searchParams),
      audioId: extractAudioId(parsed.pathname),
    },
  };
}

/**
 * Instagram usernames: 1-30 chars, letters/numbers/periods/underscores.
 * Used to distinguish a real `/stories/USERNAME/` profile URL (and a bare
 * `/USERNAME/` profile URL) from reserved/system paths.
 */
function isValidInstagramUsername(value: string | undefined | null): boolean {
  if (!value) return false;
  return /^[a-zA-Z0-9._]{1,30}$/.test(value);
}

/**
 * A pasted handle link (`/@user/`, `/stories/@user/…`) carries display
 * decoration that is never part of the username. Stripped before matching so
 * it resolves to the same user as the canonical URL.
 */
function stripAtPrefix(value: string): string {
  return value.startsWith("@") ? value.slice(1) : value;
}

/**
 * Single-segment paths that are NEVER a bare profile username, even if they
 * match the username character set (system/reserved routes).
 */
const RESERVED_PROFILE_SEGMENTS = new Set([
  "accounts",
  "direct",
  "explore",
  "stories",
  "story",
  "s",
  "reel",
  "reels",
  "p",
  "tv",
  "about",
  "developer",
  "embed",
]);

function detectContentTypeFromPath(pathname: string): string | null {
  const rawSegments = pathname.split("/").filter(Boolean);
  const segments = rawSegments.map((segment) => segment.toLowerCase());

  // Public sound/audio pages (e.g. /reels/audio/<id>/) resolve to AUDIO so
  // the result UI switches to audio mode instead of treating them as Reels.
  if (segments[0] === "reels" && segments[1] === "audio") return "AUDIO";
  if (segments[0] === "reel" || segments[0] === "reels") return "REEL";
  if (segments[0] === "p") {
    if (segments.includes("carousel")) return "CAROUSEL";
    return "POST";
  }
  if (segments[0] === "tv") return "VIDEO";
  if (segments[0] === "stories" || segments[0] === "story") {
    if (segments.includes("highlights")) return "HIGHLIGHT";
    // /stories/USERNAME/ (no Story ID) is the public Stories profile page:
    // classify as STORY_PROFILE so it routes to the Story resolver's
    // username-list branch instead of failing validation.
    if (segments.length === 2) {
      if (segments[1] === "highlights") return null;
      return isValidInstagramUsername(stripAtPrefix(rawSegments[1])) ? "STORY_PROFILE" : null;
    }
    // /stories/USERNAME/STORY_ID/ is a direct Story permalink.
    if (segments.length >= 3) {
      if (rawSegments[1]?.toLowerCase() === "highlights") return "HIGHLIGHT";
      return "STORY";
    }
    return null;
  }
  // Short share links like /s/<code> that sometimes wrap story shares
  if (segments[0] === "s" && segments.length >= 2) return "STORY";
  if (segments[0] === "explore") return null;

  // Bare profile URL (e.g. /USERNAME/) used by the Story resolver for public
  // story lookup. Only a single clean username segment qualifies; anything
  // else stays unsupported so Reel/Post validation is never bypassed.
  if (rawSegments.length === 1) {
    const candidate = stripAtPrefix(rawSegments[0]);
    if (RESERVED_PROFILE_SEGMENTS.has(candidate.toLowerCase())) return null;
    return isValidInstagramUsername(candidate) ? "STORY_PROFILE" : null;
  }

  return null;
}

function extractShortcode(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  if (
    (segments[0] === "p" || segments[0] === "reel" || segments[0] === "reels" || segments[0] === "tv") &&
    segments[1]
  ) {
    return segments[1].split("/")[0];
  }
  return null;
}

function extractStoryUsername(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0]?.toLowerCase();
  if ((first === "stories" || first === "story") && segments.length >= 2 && segments[1]) {
    if (segments[1].toLowerCase() === "highlights") return null;
    const storyUser = stripAtPrefix(segments[1]);
    return isValidInstagramUsername(storyUser) ? storyUser : null;
  }
  if (first === "s" && segments.length >= 2) {
    // Short links don't encode username; return null and let resolver handle via redirect
    return null;
  }
  // Bare profile URL: the single segment IS the username.
  if (segments.length === 1) {
    const candidate = stripAtPrefix(segments[0]);
    if (RESERVED_PROFILE_SEGMENTS.has(candidate.toLowerCase())) return null;
    return isValidInstagramUsername(candidate) ? candidate : null;
  }
  return null;
}

function extractStoryId(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0]?.toLowerCase();
  if ((first === "stories" || first === "story") && segments.length >= 3 && segments[1].toLowerCase() !== "highlights") {
    return segments[2] || null;
  }
  if (first === "s" && segments.length >= 2) {
    return segments[1] || null;
  }
  return null;
}

function extractHighlightId(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0]?.toLowerCase();
  if ((first === "stories" || first === "story") && segments.some((segment) => segment.toLowerCase() === "highlights")) {
    const highlightIdx = segments.findIndex((segment) => segment.toLowerCase() === "highlights");
    return segments[highlightIdx + 1] || null;
  }
  return null;
}

export function extractAudioId(pathOrUrl: string): string | null {
  let pathname = pathOrUrl;
  try {
    pathname = new URL(pathOrUrl).pathname;
  } catch {
    // Not a full URL — treat the input as a bare pathname.
  }
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] === "reels" && segments[1] === "audio" && segments[2]) {
    return segments[2].split("?")[0].slice(0, 64) || null;
  }
  return null;
}

function extractSlideIndex(params: URLSearchParams): number | null {
  const raw = params.get("img_index");
  if (!raw) return null;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1 || n > 100) return null;
  return n - 1;
}

function cleanUrl(url: URL): URL {
  const cleaned = new URL(url.origin + url.pathname);

  url.searchParams.forEach((value, key) => {
    const lower = key.toLowerCase();
    // img_index is viewer state (which slide was open), not post identity —
    // strip it so cache keys coalesce; the parsed slideIndex carries it.
    if (lower === "img_index") return;
    if (!TRACKING_PARAMS.has(lower)) {
      cleaned.searchParams.set(key, value);
    }
  });

  return cleaned;
}
