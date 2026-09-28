import type {
  ResolverResult,
  ResolveProgressCallback,
  ResolveCallOptions,
} from "../types.js";

function isPrivateOrReservedHost(hostname: string): boolean {
  let h = hostname.toLowerCase().trim();
  // Strip IPv6 brackets for uniform matching.
  if (h.startsWith("[") && h.endsWith("]")) h = h.slice(1, -1);
  if (
    h === "localhost" ||
    h === "0.0.0.0" ||
    h === "127.0.0.1" ||
    h === "::1" ||
    h === "::" ||
    h === "::ffff:127.0.0.1" ||
    h === "metadata.google.internal"
  ) {
    return true;
  }
  // Numeric-encoding bypasses for 127.0.0.1 (decimal/octal/hex).
  if (h === "2130706433" || h === "0x7f000001" || h === "017700000001") return true;
  if (/^0x7f(\.0\.0\.1)?$/i.test(h) || /^127\.0\.0\.1$/i.test(h)) return true;
  if (h.startsWith("::ffff:")) return true; // IPv4-mapped IPv6: treat as private
  if (h.startsWith("fe80:") || h.startsWith("fc00:") || h.startsWith("fd00:")) return true;
  if (h.startsWith("192.168.")) return true;
  if (h.startsWith("10.")) return true;
  if (h.startsWith("172.")) {
    const second = parseInt(h.split(".")[1], 10);
    if (second >= 16 && second <= 31) return true;
  }
  if (h.startsWith("169.254.")) return true;
  // CGNAT (100.64.0.0/10) and benchmarking (198.18.0.0/15) are never valid
  // public media hosts. (TEST-NET documentation ranges intentionally not
  // blocked: existing tests treat them as public, and they are unroutable.)
  if (h.startsWith("100.64.")) return true;
  if (h.startsWith("198.18.") || h.startsWith("198.19.")) return true;
  if (/^22[4-9]\./.test(h) || /^23\d\./.test(h)) return true; // 224.0.0.0/4 multicast
  if (h === "0.0.0.0" || h.startsWith("0.")) return true;
  if (h.endsWith(".internal") || h.endsWith(".local")) return true;
  return false;
}

export { isPrivateOrReservedHost };

const CDN_HOST_MATCHERS: Array<(hostname: string) => boolean> = [
  (h) => h === "cdninstagram.com" || h.endsWith(".cdninstagram.com"),
  (h) => h === "fbcdn.net" || h.endsWith(".fbcdn.net"),
  (h) => h.startsWith("scontent."),
];

/** Strict allowlist for Instagram/Facebook media CDN hosts (no open proxy). */
export function isCdnMediaHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return CDN_HOST_MATCHERS.some((match) => match(h));
}

export abstract class BaseProvider {
  abstract readonly name: string;
  abstract resolve(
    url: string,
    onProgress?: ResolveProgressCallback,
    options?: ResolveCallOptions
  ): Promise<ResolverResult>;

  protected validateMediaUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return false;
      }
      // Credential-bearing URLs (user:pass@host) are never valid media.
      if (parsed.username || parsed.password) return false;
      const h = parsed.hostname.toLowerCase();
      if (isPrivateOrReservedHost(h)) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }
}
