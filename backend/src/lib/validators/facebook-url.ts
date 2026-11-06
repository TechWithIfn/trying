const FACEBOOK_HOSTS = new Set(["facebook.com", "www.facebook.com", "m.facebook.com", "fb.watch"]);

export interface ParsedFacebookUrl {
  normalized: string;
  hostname: string;
  pathname: string;
}

export function validateFacebookUrl(raw: unknown): {
  valid: boolean;
  error?: string;
  parsed?: ParsedFacebookUrl;
} {
  if (typeof raw !== "string" || raw.trim().length === 0) return { valid: false, error: "No URL provided." };
  const value = raw.trim();
  if (value.length > 2048) return { valid: false, error: "URL is too long." };
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { valid: false, error: "Malformed URL." };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { valid: false, error: "Only HTTP and HTTPS URLs are supported." };
  }
  if (url.username || url.password) return { valid: false, error: "Invalid URL format." };
  const hostname = url.hostname.toLowerCase();
  if (!FACEBOOK_HOSTS.has(hostname) && !hostname.endsWith(".facebook.com")) {
    return { valid: false, error: "This is not a Facebook URL." };
  }
  if (url.pathname === "/" && !url.search) return { valid: false, error: "A Facebook video URL is required." };
  url.protocol = "https:";
  return { valid: true, parsed: { normalized: url.toString(), hostname, pathname: url.pathname } };
}
