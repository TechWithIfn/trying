import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkRateLimit, cleanupExpiredEntries } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows first request", () => {
    const result = checkRateLimit("test-key");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(16);
  });

  it("tracks request count", () => {
    const key = "test-count";
    for (let i = 0; i < 5; i++) {
      checkRateLimit(key);
    }
    const result = checkRateLimit(key);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(11);
  });

  it("blocks after max requests", () => {
    const key = "test-block";
    for (let i = 0; i < 17; i++) {
      checkRateLimit(key);
    }
    const result = checkRateLimit(key);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("resets after window expires", () => {
    const key = "test-reset";
    for (let i = 0; i < 17; i++) {
      checkRateLimit(key);
    }
    vi.advanceTimersByTime(61_000);
    const result = checkRateLimit(key);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(16);
  });

  it("allows different keys independently", () => {
    for (let i = 0; i < 17; i++) {
      checkRateLimit("key-a");
    }
    const resultB = checkRateLimit("key-b");
    expect(resultB.allowed).toBe(true);
  });

  it("respects custom config", () => {
    const config = { windowMs: 10_000, maxRequests: 3 };
    checkRateLimit("custom", config);
    checkRateLimit("custom", config);
    checkRateLimit("custom", config);
    const result = checkRateLimit("custom", config);
    expect(result.allowed).toBe(false);
  });
});

describe("cleanupExpiredEntries", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("removes expired entries", () => {
    checkRateLimit("cleanup-test");
    vi.advanceTimersByTime(120_000);
    cleanupExpiredEntries();
    const result = checkRateLimit("cleanup-test");
    expect(result.remaining).toBe(16);
  });

  it("peekRateLimit reads quota without consuming it", async () => {
    const { peekRateLimit, resetRateLimitsForTests } = await import("@/lib/rate-limit");
    resetRateLimitsForTests();
    const key = "peek-key";
    checkRateLimit(key);
    expect(peekRateLimit(key).remaining).toBe(16);
    // Peeking never consumes: a joiner of in-flight work costs no token.
    expect(peekRateLimit(key).remaining).toBe(16);
    expect(checkRateLimit(key).remaining).toBe(15);
    resetRateLimitsForTests();
  });
});
