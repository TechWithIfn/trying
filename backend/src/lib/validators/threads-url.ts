export interface ParsedThreadsUrl {
  normalized: string;
  hostname: string;
  path: string;
}

export type ThreadsUrlValidation =
  | { valid: true; parsed: ParsedThreadsUrl }
  | { valid: false; error: string };

const HOSTS = new Set(["threads.net", "www.threads.net", "threads.com", "www.threads.com"]);

export function validateThreadsUrl(value: unknown): ThreadsUrlValidation {
  if (typeof value !== "string" || value.trim().length === 0) {
    return { valid: false, error: "Paste a Threads post URL." };
  }
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    return { valid: false, error: "Paste a valid Threads post URL." };
  }
  const hostname = parsed.hostname.toLowerCase();
  if (parsed.protocol !== "https:" || !HOSTS.has(hostname)) {
    return { valid: false, error: "Use a public threads.net or threads.com post URL." };
  }
  if (!parsed.pathname || parsed.pathname === "/" || parsed.pathname.split("/").filter(Boolean).length < 2) {
    return { valid: false, error: "Use a Threads post URL, not a profile or home page." };
  }
  parsed.search = "";
  parsed.hash = "";
  return {
    valid: true,
    parsed: { normalized: parsed.toString(), hostname, path: parsed.pathname },
  };
}
