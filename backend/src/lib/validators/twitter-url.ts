export interface ParsedTwitterUrl {
  normalized: string;
  hostname: string;
  postId: string;
}

export type TwitterUrlValidation =
  | { valid: true; parsed: ParsedTwitterUrl }
  | { valid: false; error: string };

const HOSTS = new Set(["twitter.com", "www.twitter.com", "mobile.twitter.com", "x.com", "www.x.com", "mobile.x.com"]);

export function validateTwitterUrl(value: unknown): TwitterUrlValidation {
  if (typeof value !== "string" || value.trim().length === 0) {
    return { valid: false, error: "Paste a Twitter or X post URL." };
  }
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    return { valid: false, error: "Paste a valid Twitter or X post URL." };
  }
  const hostname = parsed.hostname.toLowerCase();
  if (parsed.protocol !== "https:" || !HOSTS.has(hostname)) {
    return { valid: false, error: "Use a public twitter.com or x.com post URL." };
  }
  const match = parsed.pathname.match(/^\/[^/]+\/status\/([0-9]+)\/?$/i);
  if (!match) {
    return { valid: false, error: "Use a Twitter or X post URL containing /status/." };
  }
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  parsed.search = "";
  parsed.hash = "";
  return {
    valid: true,
    parsed: {
      normalized: parsed.toString(),
      hostname,
      postId: match[1],
    },
  };
}
