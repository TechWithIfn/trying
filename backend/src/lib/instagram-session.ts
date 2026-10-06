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

/**
 * Dedicated service-account CSRF token sources (server-side ONLY).
 * Instagram's web API expects `X-CSRFToken` alongside `sessionid`. When the
 * full cookie string already carries `csrftoken`, these are ignored; when
 * only a bare SESSIONID is configured, the token here is composed into the
 * outgoing `Cookie` header and `X-CSRFToken` request header. Names only ever
 * leave this module — values are never logged, returned to clients, or
 * exposed via health/diagnostics.
 */
const CSRF_TOKEN_SOURCES = [
  "INSTAGRAM_CSRFTOKEN",
  "IG_CSRFTOKEN",
  "CSRFTOKEN",
  "INSTAGRAM_CSRF_TOKEN",
] as const;

/**
 * Dedicated service-account user-id sources (server-side ONLY). `ds_user_id`
 * identifies the viewer account that owns the session. Same composition and
 * secrecy rules as the CSRF token above.
 */
const DS_USER_ID_SOURCES = [
  "INSTAGRAM_DS_USER_ID",
  "IG_DS_USER_ID",
  "DS_USER_ID",
  "INSTAGRAM_DS_USERID",
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
 * Single-token sanitizer for the dedicated single-value variables
 * (SESSIONID/CSRFTOKEN/DS_USER_ID and friends). Operators often paste a
 * cookie-jar fragment (`abc123; Path=/`, `abc123 Secure`) or a trailing
 * comment into these — everything from the first `;` or whitespace is a
 * cookie attribute, never part of the token, and forwarding it corrupts the
 * outgoing Cookie header (Instagram then 401s a perfectly valid session).
 * Full cookie strings keep their own parsing and never pass through here.
 */
function sanitizeSingleToken(value: string): string {
  const token = value.split(/[;\s]/, 1)[0].trim();
  return token;
}

/**
 * Session-ID value sanitizer that preserves a full pasted jar: when the
 * value already carries companion cookies (`csrftoken=`, `ds_user_id=`) it
 * is kept whole; otherwise a single token with pasted attributes
 * (`abc; Path=/`) is trimmed to the token.
 */
function sanitizeSessionIdValue(value: string): string {
  const lower = value.toLowerCase();
  if (lower.includes("csrftoken=") || lower.includes("ds_user_id=")) return value;
  return sanitizeSingleToken(value);
}

/**
 * Restore a URL-encoded sessionid to the form browsers actually send
 * (`629…:N2K…:15:AY…`, literal colons). Operators often paste the value from
 * a cookie export/URL where colons arrive as `%3A`; forwarding the encoded
 * form makes Instagram reject an otherwise valid session while every
 * presence check still reports "configured". Only decodes when the result
 * has the sessionid shape, otherwise returns the input untouched. Pure.
 */
export function normalizeSessionIdValue(raw: string): string {
  const value = raw.trim();
  if (!/%[0-9a-fA-F]{2}/.test(value)) return value;
  try {
    const decoded = decodeURIComponent(value);
    if (/^\d+:[^:]+:\d+:.+/.test(decoded)) return decoded;
  } catch {
    /* malformed escape — keep the original */
  }
  return value;
}

/**
 * The raw configured session material (un-normalized), with the selecting
 * variable name. Names only — values never leave this module except through
 * the cookie accessors below, and are never logged.
 */
function rawSessionMaterial(): { raw: string; source: string } | null {
  for (const name of [...SESSION_COOKIE_SOURCES, ...SESSION_ID_SOURCES]) {
    const raw = process.env[name];
    if (raw && raw.trim().length > 0) return { raw: raw.trim(), source: name };
  }
  return null;
}

/** Raw CSRF token value from the environment, or null when unset. Never logged. */
function rawCsrfToken(): string | null {
  for (const name of CSRF_TOKEN_SOURCES) {
    const raw = process.env[name];
    if (raw && raw.trim().length > 0) {
      const token = sanitizeSingleToken(normalizeConfiguredCookie(raw));
      if (token) return token;
    }
  }
  return null;
}

/** Raw ds_user_id value from the environment, or null when unset. Never logged. */
function rawDsUserId(): string | null {
  for (const name of DS_USER_ID_SOURCES) {
    const raw = process.env[name];
    if (raw && raw.trim().length > 0) {
      const token = sanitizeSingleToken(normalizeConfiguredCookie(raw));
      if (token) return token;
    }
  }
  return null;
}

/**
 * Names of every environment variable this module reads. Exported for
 * diagnostics/docs only — values never leave this module except through the
 * cookie accessors below.
 */
export const SESSION_ENV_NAMES = [
  ...SESSION_COOKIE_SOURCES,
  ...SESSION_ID_SOURCES,
  ...CSRF_TOKEN_SOURCES,
  ...DS_USER_ID_SOURCES,
] as const;

function hasAnyConfigured(names: readonly string[]): boolean {
  return names.some((name) => {
    const raw = process.env[name];
    return Boolean(raw && raw.trim().length > 0);
  });
}

/**
 * Presence flags for the three session materials (booleans ONLY — values
 * never leave this module). Safe for diagnostics responses and logs:
 * proves which parts of the server session are configured without exposing
 * a single secret character.
 */
export function sessionEnvPresence(): { sessionid: boolean; csrftoken: boolean; ds_user_id: boolean } {
  return {
    sessionid: hasAnyConfigured([...SESSION_COOKIE_SOURCES, ...SESSION_ID_SOURCES]),
    csrftoken:
      hasAnyConfigured(CSRF_TOKEN_SOURCES) ||
      (getInstagramSessionCookie()?.includes("csrftoken=") ?? false),
    ds_user_id:
      hasAnyConfigured(DS_USER_ID_SOURCES) ||
      (getInstagramSessionCookie()?.includes("ds_user_id=") ?? false),
  };
}

function envLength(name: string): { defined: boolean; length: number } {
  const raw = process.env[name];
  if (!raw || raw.trim().length === 0) return { defined: false, length: 0 };
  return { defined: true, length: raw.trim().length };
}

/**
 * Request-time session material diagnostics for IG_SESSIONID /
 * IG_CSRFTOKEN / IG_DS_USER_ID: defined-ness and value LENGTHS only — never
 * values. Logged on every session validation so a "session expired" verdict
 * can be told apart from "variable unset" or "variable mangled" without
 * exposing secrets. Lengths reveal shape problems (empty, truncated) while
 * leaking nothing usable.
 */
export function sessionEnvDiag(): {
  IG_SESSIONID: { defined: boolean; length: number };
  IG_CSRFTOKEN: { defined: boolean; length: number };
  IG_DS_USER_ID: { defined: boolean; length: number };
  selectedSource: string | null;
} {
  return {
    IG_SESSIONID: envLength("IG_SESSIONID"),
    IG_CSRFTOKEN: envLength("IG_CSRFTOKEN"),
    IG_DS_USER_ID: envLength("IG_DS_USER_ID"),
    selectedSource: getSessionState().source,
  };
}

/**
 * Which session sources hold a NON-EMPTY value right now (names only).
 * Multiple distinct sources with different values mean the winner (first in
 * precedence order) may not be the fresh one the operator just set — the
 * startup check warns about exactly that.
 */
export function configuredSessionSources(): { name: string }[] {
  const out: { name: string }[] = [];
  for (const name of SESSION_ENV_NAMES) {
    const raw = process.env[name];
    if (raw && raw.trim().length > 0) out.push({ name });
  }
  return out;
}

/**
 * Names of the session materials missing for a complete authenticated
 * identity: `sessionid` is mandatory; `csrftoken` is required by Instagram's
 * web API (a bare sessionid is 401'd); `ds_user_id` identifies the viewer
 * account. Empty when the composed cookie carries all three (whether from
 * dedicated variables or a full cookie string).
 */
export function missingSessionMaterials(): string[] {
  const missing: string[] = [];
  const cookie = getInstagramSessionCookie();
  if (!cookie || !cookie.includes("sessionid=")) {
    missing.push("sessionid");
    return missing;
  }
  if (!cookie.includes("csrftoken=")) missing.push("csrftoken");
  if (!cookie.includes("ds_user_id=")) missing.push("ds_user_id");
  return missing;
}

/** How long a proven-dead session stays unused before anonymous-only mode ends. */
export const SESSION_INVALID_COOLDOWN_MS = 5 * 60 * 1000;

let quarantinedRaw: string | null = null;
let quarantineUntil = 0;
let liveRaw: string | null = null;

/**
 * Quarantine the currently configured session: proven invalid (authenticated
 * 401/403), so stop attaching it. Anonymous/public discovery continues
 * unaffected. The quarantine lifts automatically after the cooldown or the
 * moment the configured value changes (session refresh without restart).
 */
export function markSessionInvalid(): void {
  const current = rawSessionMaterial();
  if (!current) return;
  quarantinedRaw = current.raw;
  quarantineUntil = Date.now() + SESSION_INVALID_COOLDOWN_MS;
  liveRaw = null;
}

/** Record that the configured session was accepted (authenticated 200). */
export function noteSessionLive(): void {
  const current = rawSessionMaterial();
  if (!current) return;
  liveRaw = current.raw;
  quarantinedRaw = null;
  quarantineUntil = 0;
}

function quarantineActive(): boolean {
  if (!quarantinedRaw) return false;
  const current = rawSessionMaterial();
  if (!current || current.raw !== quarantinedRaw) {
    // Credentials rotated (or removed): release, re-evaluate from scratch.
    quarantinedRaw = null;
    quarantineUntil = 0;
    return false;
  }
  if (Date.now() >= quarantineUntil) {
    quarantinedRaw = null;
    return false;
  }
  return true;
}

export type SessionLifecycleState = "UNCONFIGURED" | "CONFIGURED_UNKNOWN" | "VALID" | "INVALID";

/**
 * Server-side session state for safe diagnostics. `source` is the variable
 * NAME only. `usable` is false while quarantined, so every consumer
 * (fetch headers, browser jar, gating flags) degrades to anonymous together.
 */
export function getSessionState(): {
  configured: boolean;
  usable: boolean;
  state: SessionLifecycleState;
  source: string | null;
  validated: boolean;
} {
  const current = rawSessionMaterial();
  if (!current) {
    return { configured: false, usable: false, state: "UNCONFIGURED", source: null, validated: false };
  }
  if (quarantineActive()) {
    return { configured: true, usable: false, state: "INVALID", source: current.source, validated: false };
  }
  if (liveRaw !== null && current.raw === liveRaw) {
    return { configured: true, usable: true, state: "VALID", source: current.source, validated: true };
  }
  return { configured: true, usable: true, state: "CONFIGURED_UNKNOWN", source: current.source, validated: false };
}

/**
 * Raw `Cookie` header value from the environment, or undefined when no
 * session is configured. Accepts a full cookie string (`a=b; c=d`) or a bare
 * sessionid (wrapped to `sessionid=<value>`), mirroring the Story resolver's
 * semantics so one env var serves every resolver. Returns undefined while
 * the session is quarantined, so a dead session can never be re-attached.
 */
/**
 * Append companion service-account cookies (`csrftoken`, `ds_user_id`) from
 * their dedicated env vars when the base cookie does not already carry them.
 * Pure string composition — values are never logged.
 */
function withCompanionCookies(base: string): string {
  let out = base;
  const lower = `;${out.toLowerCase()};`;
  const csrf = rawCsrfToken();
  if (csrf && !lower.includes(";csrftoken=") && !hasHeaderInjection(csrf)) {
    out += `; csrftoken=${csrf}`;
  }
  const dsUserId = rawDsUserId();
  if (dsUserId && !lower.includes(";ds_user_id=") && !hasHeaderInjection(dsUserId)) {
    out += `; ds_user_id=${dsUserId}`;
  }
  return out;
}

export function getInstagramSessionCookie(): string | undefined {
  if (quarantineActive()) return undefined;
  for (const name of SESSION_COOKIE_SOURCES) {
    const raw = process.env[name];
    if (raw && raw.trim().length > 0) {
      const value = normalizeConfiguredCookie(raw);
      if (hasHeaderInjection(value)) return undefined;
      return withCompanionCookies(value);
    }
  }
  for (const name of SESSION_ID_SOURCES) {
    const raw = process.env[name];
    if (raw && raw.trim().length > 0) {
      const value = normalizeConfiguredCookie(raw);
      if (hasHeaderInjection(value)) return undefined;
      if (value.includes("=")) {
        // Explicit `sessionid=<value>` form: decode an encoded value part.
        const eq = value.indexOf("=");
        const cname = value.slice(0, eq).trim().toLowerCase();
        const cvalue = value.slice(eq + 1).trim();
        if (cname === "sessionid" && cvalue) {
          return withCompanionCookies(`sessionid=${normalizeSessionIdValue(sanitizeSessionIdValue(cvalue))}`);
        }
        return withCompanionCookies(value);
      }
      return withCompanionCookies(`sessionid=${normalizeSessionIdValue(sanitizeSessionIdValue(value))}`);
    }
  }
  return undefined;
}

/**
 * CSRF token for the `X-CSRFToken` request header: parsed from the composed
 * session cookie (full-string and composed forms), or from the dedicated
 * CSRF env vars as a last resort. Returns null when unknown — callers omit
 * the header instead of sending a wrong one. The value itself is never logged.
 */
export function getInstagramCsrfToken(): string | null {
  const cookie = getInstagramSessionCookie();
  if (cookie) {
    const match = cookie.match(/csrftoken=([^;]+)/);
    if (match) return match[1];
  }
  return rawCsrfToken();
}

/**
 * Service-account viewer id (`ds_user_id`) from the composed session cookie
 * or its dedicated env vars. Null when unknown. Never logged.
 */
export function getInstagramDsUserId(): string | null {
  const cookie = getInstagramSessionCookie();
  if (cookie) {
    const match = cookie.match(/ds_user_id=([^;]+)/);
    if (match) return match[1];
  }
  return rawDsUserId();
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
  const seenNames = new Set<string>();
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
    // First occurrence wins: a duplicated name would otherwise install the
    // cookie twice and leave the browser jar ambiguous.
    if (seenNames.has(name.toLowerCase())) continue;
    seenNames.add(name.toLowerCase());
    // The browser jar must carry the exact bytes a browser would send:
    // decode a URL-encoded sessionid so Puppeteer navigations authenticate.
    const finalValue = name.toLowerCase() === "sessionid" ? normalizeSessionIdValue(value) : value;
    out.push({ name, value: finalValue, domain: ".instagram.com" });
  }
  return out;
}
