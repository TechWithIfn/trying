/**
 * YouTube URL validation.
 *
 * Only the four public video URL shapes the downloader supports are accepted.
 * Everything else — channels, playlists, search pages, `/live/`, short links
 * from other services, non-YouTube hosts, credentials or custom ports — is
 * rejected before any yt-dlp work starts.
 *
 * The canonical URL is rebuilt from the validated 11-character video id, so
 * the value handed to yt-dlp can never carry arbitrary query strings, path
 * traversal or a different host (SSRF protection).
 */

const ALLOWED_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

export type YouTubeUrlKind = "watch" | "short" | "shorts" | "embed";

export interface ParsedYouTubeUrl {
  videoId: string;
  /** Canonical `https://www.youtube.com/watch?v=<id>` used for all work. */
  normalized: string;
  kind: YouTubeUrlKind;
}

export interface YouTubeUrlValidation {
  valid: boolean;
  error?: string;
  parsed?: ParsedYouTubeUrl;
}

function parseVideoId(value: string | null): string | null {
  if (!value) return null;
  return VIDEO_ID_RE.test(value) ? value : null;
}

export function validateYouTubeUrl(raw: unknown): YouTubeUrlValidation {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return { valid: false, error: "No URL provided." };
  }

  const trimmed = raw.trim();
  if (trimmed.length > 2048) {
    return { valid: false, error: "URL is too long." };
  }

  if (/^(javascript|data|blob|vbscript|file|ftp):/i.test(trimmed)) {
    return { valid: false, error: "Invalid URL scheme." };
  }

  // Accept a copied bare link (`youtu.be/...`) as well as a full URL.
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed.replace(/^\/+/, "")}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { valid: false, error: "Malformed URL." };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { valid: false, error: "Only HTTP and HTTPS URLs are supported." };
  }
  if (parsed.username || parsed.password) {
    return { valid: false, error: "Invalid URL format." };
  }
  if (parsed.port) {
    return { valid: false, error: "Invalid URL format." };
  }

  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
  if (!ALLOWED_HOSTS.has(hostname)) {
    return { valid: false, error: "This is not a YouTube URL." };
  }

  const segments = parsed.pathname.split("/").filter(Boolean);
  let videoId: string | null = null;
  let kind: YouTubeUrlKind | null = null;

  if (hostname === "youtu.be" || hostname === "www.youtu.be") {
    if (segments.length === 1) {
      videoId = parseVideoId(segments[0]);
      kind = "short";
    }
  } else if (segments.length === 1 && segments[0].toLowerCase() === "watch") {
    videoId = parseVideoId(parsed.searchParams.get("v"));
    kind = "watch";
  } else if (
    segments.length === 2 &&
    (segments[0].toLowerCase() === "shorts" || segments[0].toLowerCase() === "embed")
  ) {
    videoId = parseVideoId(segments[1]);
    kind = segments[0].toLowerCase() as YouTubeUrlKind;
  }

  if (!videoId || !kind) {
    return {
      valid: false,
      error: "Unsupported YouTube URL. Use a video, Shorts, embed, or youtu.be link.",
    };
  }

  return {
    valid: true,
    parsed: {
      videoId,
      normalized: `https://www.youtube.com/watch?v=${videoId}`,
      kind,
    },
  };
}
