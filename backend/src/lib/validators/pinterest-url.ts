/**
 * Pinterest hosts that may legitimately carry a public pin URL.
 * `pin.it` is Pinterest's own short-link domain (expanded server-side).
 * Regional mirrors (e.g. au.pinterest.com, pinterest.co.uk) serve the same
 * pin pages and are accepted so a copied regional share link works.
 */
const ALLOWED_HOSTS = new Set([
  "pinterest.com",
  "www.pinterest.com",
  "pin.it",
  "www.pin.it",
]);

/**
 * Regional Pinterest mirrors: `<cc>.pinterest.<tld>` or `pinterest.<tld>`.
 * The TLD is constrained to realistic Pinterest patterns — `com`, a 2-letter
 * ccTLD, or `co.<cc>` / `com.<cc>` — so lookalikes like `pinterest.computer`
 * or `pinterest.xyz` are rejected while every real regional mirror passes.
 */
export function isPinterestPageHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h.endsWith(".pinimg.com")) return false;
  const m = /^(?:[a-z0-9-]+\.)*pinterest\.(?:com|[a-z]{2}|co\.[a-z]{2}|com\.[a-z]{2})$/.exec(h);
  return Boolean(m);
}

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
  "epik",
  "sfo",
  "sender",
  "invite_code",
  "app_version",
  "ios",
  "android",
]);

export interface ParsedPinterestUrl {
  /** Tracking-stripped canonical URL used for resolution + cache keys. */
  normalized: string;
  hostname: string;
  pathname: string;
  /** Pin ID when the URL is a standard `/pin/<id>/` permalink, else null. */
  pinId: string | null;
  /** True for pin.it short links (or any non-/pin/ path) that need expansion. */
  isShortLink: boolean;
}

export function validatePinterestUrl(raw: string): {
  valid: boolean;
  error?: string;
  parsed?: ParsedPinterestUrl;
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

  const hostname = parsed.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.has(hostname) && !isPinterestPageHost(hostname)) {
    return { valid: false, error: "This is not a Pinterest URL." };
  }

  const pinId = extractPinId(parsed.pathname);
  const isShortLink = hostname === "pin.it" || hostname === "www.pin.it" || pinId === null;

  const cleaned = cleanUrl(parsed);

  return {
    valid: true,
    parsed: {
      normalized: cleaned.href,
      hostname,
      pathname: parsed.pathname,
      pinId,
      isShortLink,
    },
  };
}

/** `/pin/1234567890/` (and `/pin/1234567890/slug/`) → the numeric pin ID. */
function extractPinId(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length >= 2 && segments[0].toLowerCase() === "pin") {
    const candidate = segments[1];
    if (/^\d{5,25}$/.test(candidate)) return candidate;
  }
  return null;
}

function cleanUrl(url: URL): URL {
  const cleaned = new URL(url.origin + url.pathname);
  url.searchParams.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (TRACKING_PARAMS.has(lower)) return;
    cleaned.searchParams.set(key, value);
  });
  return cleaned;
}
