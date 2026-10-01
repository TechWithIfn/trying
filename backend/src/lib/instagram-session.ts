/**
 * Server-side Instagram viewer session, shared by every resolver that talks
 * to Instagram (stories/highlights historically; reels/videos/posts now too).
 *
 * WHY THIS EXISTS: an OPTIONAL extra identity for Instagram page requests.
 * Public Reels resolve without it — a desktop browser identity gets the full
 * media document (see the identity notes in providers/puppeteer.ts). A viewer
 * session only matters where Instagram gates the document, i.e. private or
 * account-restricted content, where an anonymous request gets a stripped
 * page (HTTP 200, no login-wall markers, but no playable_url/video_url/.mp4/
 * og:video anywhere in ~700KB of HTML) and resolution honestly fails with
 * VIDEO_SOURCE_NOT_FOUND.
 *
 * SECURITY RULES (all enforced here):
 *  - Server-side ONLY. Nothing in this module is importable by the frontend
 *    (backend code is never bundled client-side), and no function here logs
 *    or returns the secret alongside anything that could leak it — callers
 *    log only the boolean `isInstagramSessionConfigured()`.
 *  - Header-injection guard: any value containing CR/LF is rejected outright,
 *    so a misconfigured env var can never split an HTTP header.
 *  - Cookies are only ever attached to instagram.com requests (page fetches)
 *    or set on the .instagram.com cookie domain (Puppeteer). They are never
 *    sent to CDN hosts, the frontend, or logs.
 */

const SESSION_COOKIE_SOURCES = [
  "INSTAGRAM_COOKIE",
  "IG_COOKIE",
  "INSTAGRAM_COOKIE_STRING",
  "INSTAGRAM_SESSION_COOKIE",
] as const;

const SESSION_ID_SOURCES = [
  "INSTAGRAM_SESSIONID",
  "IG_SESSIONID",
  "INSTAGRAM_SESSION_ID",
  "SESSIONID",
] as const;

/** Maximum cookies forwarded to the browser context (sanity cap). */
const MAX_SESSION_COOKIES = 40;
/** Maximum length of a single cookie name/value (sanity cap). */
const MAX_COOKIE_PART_LENGTH = 4096;

function hasHeaderInjection(value: string): boolean {
  return value.includes("\r") || value.includes("\n");
}

function normalizeConfiguredCookie(raw: string): string {
  const value = raw.trim();
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return value.slice(1, -1).trim();
    }
  }
  return value;
}

/**
 * Raw `Cookie` header value from the environment, or undefined when no
 * session is configured. Accepts a full cookie string (`a=b; c=d`) or a bare
 * sessionid (wrapped to `sessionid=<value>`), mirroring the Story resolver's
 * semantics so one env var serves every resolver.
 */
export function getInstagramSessionCookie(): string | undefined {
  for (const name of SESSION_COOKIE_SOURCES) {
    const raw = process.env[name];
    if (raw && raw.trim().length > 0) {
      const value = normalizeConfiguredCookie(raw);
      if (hasHeaderInjection(value)) return undefined;
      return value;
    }
  }
  for (const name of SESSION_ID_SOURCES) {
    const raw = process.env[name];
    if (raw && raw.trim().length > 0) {
      const value = normalizeConfiguredCookie(raw);
      if (hasHeaderInjection(value)) return undefined;
      if (value.includes("=")) return value;
      return `sessionid=${value}`;
    }
  }
  return undefined;
}

/**
 * Boolean presence check for diagnostics. The secret itself never leaves
 * this module except through the two narrow accessors below.
 */
export function isInstagramSessionConfigured(): boolean {
  const cookie = getInstagramSessionCookie();
  return Boolean(cookie && cookie.length > 10 && cookie.includes("sessionid="));
}

export interface SessionCookie {
  name: string;
  value: string;
  domain: string;
}

/**
 * Parsed cookies for `page.setCookie(...)` on the .instagram.com domain.
 * Entries without `name=value` shape (bare flags like `Secure`), overlong
 * parts, and anything with CR/LF are dropped — a malformed env var degrades
 * to fewer cookies, never to an injection or a thrown error.
 */
export function parseSessionCookies(): SessionCookie[] {
  const cookie = getInstagramSessionCookie();
  if (!cookie) return [];
  const out: SessionCookie[] = [];
  for (const part of cookie.split(";")) {
    if (out.length >= MAX_SESSION_COOKIES) break;
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const name = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!name || !value) continue;
    if (name.length > MAX_COOKIE_PART_LENGTH || value.length > MAX_COOKIE_PART_LENGTH) continue;
    if (hasHeaderInjection(name) || hasHeaderInjection(value)) continue;
    // Cookie names are tokens: reject separators that would corrupt the jar.
    if (/[\s,;"\\]/.test(name)) continue;
    out.push({ name, value, domain: ".instagram.com" });
  }
  return out;
}
