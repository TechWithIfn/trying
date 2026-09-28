/**
 * Read a positive integer from the environment.
 * Returns `fallback` for missing, non-numeric, or non-positive values so a
 * misconfigured dashboard variable can never disable a safety limit.
 */
export function readPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = parseInt(raw, 10);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

/**
 * Read a non-negative integer from the environment (0 = "disabled/off" is a
 * meaningful, intentional value here, unlike in `readPositiveInt`).
 * Returns `fallback` for missing, non-numeric or negative values.
 */
export function readNonNegativeInt(name: string, fallback: number, max?: number): number {
  const raw = process.env[name];
  if (!raw) return cap(fallback, max);
  const value = parseInt(raw, 10);
  if (!Number.isSafeInteger(value) || value < 0) return cap(fallback, max);
  return cap(value, max);
}

function cap(value: number, max?: number): number {
  return max === undefined ? value : Math.min(value, max);
}

/**
 * Safe build identifier for diagnostics (proves which code an instance runs).
 * Set BUILD_VERSION=<git SHA> at deploy time; Vercel injects
 * VERCEL_GIT_COMMIT_SHA automatically. Never a secret — safe to expose.
 */
export function getBuildVersion(): string {
  return process.env.BUILD_VERSION || process.env.VERCEL_GIT_COMMIT_SHA || "dev";
}

const KNOWN_PROVIDERS = ["placeholder", "mock", "external", "puppeteer"] as const;

/**
 * Startup environment validation. PURE: returns warning strings, never throws
 * and never includes secret values (variable names only). A missing Instagram
 * session or placeholder provider degrades resolution but must NEVER crash
 * the backend — /api/health stays answerable and /ready reports booleans.
 *
 * Provider/credential rules enforced here:
 * - `puppeteer` needs NOTHING else (PROVIDER_API_URL/KEY are external-only).
 * - `external` requires PROVIDER_API_URL + PROVIDER_API_KEY.
 * - `mock` is dev/test only and must never be used as a production fallback.
 */
export function validateServerEnv(): { ok: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const provider = process.env.RESOLVER_PROVIDER || "placeholder";

  if (!(KNOWN_PROVIDERS as readonly string[]).includes(provider)) {
    warnings.push(
      `RESOLVER_PROVIDER has an unknown value; falling back to "placeholder" (all resolves will return PROVIDER_NOT_CONFIGURED).`
    );
  }
  if (provider === "placeholder") {
    warnings.push(
      `RESOLVER_PROVIDER is not set (using "placeholder"): all resolves will return PROVIDER_NOT_CONFIGURED. Set RESOLVER_PROVIDER=puppeteer (or external with credentials).`
    );
  }
  if (provider === "mock") {
    warnings.push(
      `RESOLVER_PROVIDER=mock is a dev/test provider and must never be used as a production fallback.`
    );
  }
  if (provider === "external") {
    if (!process.env.PROVIDER_API_URL || !process.env.PROVIDER_API_KEY) {
      warnings.push(
        `RESOLVER_PROVIDER=external requires PROVIDER_API_URL and PROVIDER_API_KEY; without them all resolves return PROVIDER_NOT_CONFIGURED.`
      );
    }
  }
  // NOTE: RESOLVER_PROVIDER=puppeteer intentionally requires no API
  // credentials — do not add PROVIDER_API_URL/KEY requirements here.

  if (!process.env.CORS_ORIGIN) {
    warnings.push(
      `CORS_ORIGIN is not set: CORS fails closed and browsers cannot call the API cross-origin. Set it to the exact frontend origin (no trailing slash).`
    );
  }

  const sessionSources = [
    "INSTAGRAM_COOKIE",
    "IG_COOKIE",
    "INSTAGRAM_COOKIE_STRING",
    "INSTAGRAM_SESSION_COOKIE",
    "INSTAGRAM_SESSIONID",
    "IG_SESSIONID",
    "INSTAGRAM_SESSION_ID",
    "SESSIONID",
  ];
  const hasSession = sessionSources.some((name) => {
    const raw = process.env[name];
    return Boolean(raw && raw.trim().length > 0);
  });
  if (!hasSession) {
    warnings.push(
      `No Instagram session configured (info): anonymous resolution works from residential IPs, but datacenter-hosted backends get video-stripped pages and Reels fail with VIDEO_SOURCE_NOT_FOUND. Set INSTAGRAM_SESSIONID server-side to fix.`
    );
  }

  return { ok: true, warnings };
}

/**
 * Read an integer and clamp it into [min, max]. Used for resource limits so a
 * fat-fingered dashboard value (e.g. `MAX_CONCURRENT_PAGES=1000000`) can never
 * turn a bounded resource into an unbounded one.
 */
export function readBoundedInt(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  if (!raw) return Math.min(Math.max(fallback, min), max);
  const value = parseInt(raw, 10);
  if (!Number.isSafeInteger(value)) return Math.min(Math.max(fallback, min), max);
  return Math.min(Math.max(value, min), max);
}
