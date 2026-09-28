import { describe, it, expect, afterEach } from "vitest";
import { getBuildVersion, readPositiveInt, validateServerEnv } from "@/lib/env";
import { checkRateLimit } from "@/lib/rate-limit";

describe("readPositiveInt", () => {
  const saved: Record<string, string | undefined> = {};

  afterEach(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  function setEnv(key: string, value: string | undefined): void {
    if (!(key in saved)) saved[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  it("falls back when missing", () => {
    setEnv("DOWNLOADIT_TEST_INT", undefined);
    expect(readPositiveInt("DOWNLOADIT_TEST_INT", 42)).toBe(42);
  });

  it("falls back on non-numeric, zero, or negative values", () => {
    setEnv("DOWNLOADIT_TEST_INT", "abc");
    expect(readPositiveInt("DOWNLOADIT_TEST_INT", 42)).toBe(42);
    setEnv("DOWNLOADIT_TEST_INT", "0");
    expect(readPositiveInt("DOWNLOADIT_TEST_INT", 42)).toBe(42);
    setEnv("DOWNLOADIT_TEST_INT", "-5");
    expect(readPositiveInt("DOWNLOADIT_TEST_INT", 42)).toBe(42);
  });

  it("reads valid values", () => {
    setEnv("DOWNLOADIT_TEST_INT", "7");
    expect(readPositiveInt("DOWNLOADIT_TEST_INT", 42)).toBe(7);
  });

  it("rate limiting honors RATE_LIMIT_MAX_REQUESTS", () => {
    setEnv("RATE_LIMIT_MAX_REQUESTS", "2");
    const key = "env-override-" + Date.now();
    expect(checkRateLimit(key).allowed).toBe(true);
    expect(checkRateLimit(key).allowed).toBe(true);
    const blocked = checkRateLimit(key);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });
});

describe("validateServerEnv", () => {
  const saved: Record<string, string | undefined> = {};
  const SESSION_VARS = [
    "INSTAGRAM_COOKIE",
    "IG_COOKIE",
    "INSTAGRAM_COOKIE_STRING",
    "INSTAGRAM_SESSION_COOKIE",
    "INSTAGRAM_SESSIONID",
    "IG_SESSIONID",
    "INSTAGRAM_SESSION_ID",
    "SESSIONID",
  ];

  function setEnv(key: string, value: string | undefined): void {
    if (!(key in saved)) saved[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  function clearSession(): void {
    for (const v of SESSION_VARS) setEnv(v, undefined);
  }

  afterEach(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("never crashes and never leaks secret values", () => {
    setEnv("RESOLVER_PROVIDER", "puppeteer");
    setEnv("CORS_ORIGIN", "https://www.downloadit.pro");
    setEnv("INSTAGRAM_SESSIONID", "secret-value-must-never-appear");
    const result = validateServerEnv();
    expect(result.ok).toBe(true);
    const raw = JSON.stringify(result);
    expect(raw).not.toContain("secret-value-must-never-appear");
  });

  it("does not require PROVIDER_API_URL/KEY for puppeteer", () => {
    setEnv("RESOLVER_PROVIDER", "puppeteer");
    setEnv("PROVIDER_API_URL", undefined);
    setEnv("PROVIDER_API_KEY", undefined);
    setEnv("CORS_ORIGIN", "https://www.downloadit.pro");
    setEnv("INSTAGRAM_SESSIONID", "x");
    const result = validateServerEnv();
    expect(result.warnings.join(" ")).not.toContain("PROVIDER_API_URL");
    expect(result.warnings.join(" ")).not.toContain("PROVIDER_API_KEY");
  });

  it("requires PROVIDER_API_URL/KEY only for external", () => {
    setEnv("RESOLVER_PROVIDER", "external");
    setEnv("PROVIDER_API_URL", undefined);
    setEnv("PROVIDER_API_KEY", undefined);
    const result = validateServerEnv();
    expect(result.warnings.join(" ")).toContain("PROVIDER_API_URL");
  });

  it("warns on placeholder provider and missing session without crashing", () => {
    setEnv("RESOLVER_PROVIDER", undefined);
    clearSession();
    const result = validateServerEnv();
    expect(result.ok).toBe(true);
    expect(result.warnings.join(" ")).toContain("placeholder");
    expect(result.warnings.join(" ")).toContain("INSTAGRAM_SESSIONID");
  });

  it("warns on unknown provider names", () => {
    setEnv("RESOLVER_PROVIDER", "magic");
    const result = validateServerEnv();
    expect(result.warnings.join(" ")).toContain("unknown");
  });
});

describe("getBuildVersion", () => {
  it("prefers BUILD_VERSION, then Vercel SHA, then dev", () => {
    const prevBuild = process.env.BUILD_VERSION;
    const prevVercel = process.env.VERCEL_GIT_COMMIT_SHA;
    try {
      process.env.BUILD_VERSION = "abc123";
      process.env.VERCEL_GIT_COMMIT_SHA = "def456";
      expect(getBuildVersion()).toBe("abc123");
      delete process.env.BUILD_VERSION;
      expect(getBuildVersion()).toBe("def456");
      delete process.env.VERCEL_GIT_COMMIT_SHA;
      expect(getBuildVersion()).toBe("dev");
    } finally {
      if (prevBuild === undefined) delete process.env.BUILD_VERSION;
      else process.env.BUILD_VERSION = prevBuild;
      if (prevVercel === undefined) delete process.env.VERCEL_GIT_COMMIT_SHA;
      else process.env.VERCEL_GIT_COMMIT_SHA = prevVercel;
    }
  });
});
