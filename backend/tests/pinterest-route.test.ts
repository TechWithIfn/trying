import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import type { Server } from "http";
import app from "@/app";
import { resolvePinterestPin } from "@/lib/pinterest/resolve.js";
import { checkRateLimit, routeRateLimitConfig, resetRateLimitsForTests } from "@/lib/rate-limit";
import { resetGatesForTests } from "@/lib/capacity";

// The Pinterest resolver performs live upstream HTTP — too heavy and
// non-deterministic for cheap-phase route tests. It is mocked so
// admission/validation/rate-limit stay under test. Live pin resolution is
// verified separately against real pins.
vi.mock("@/lib/pinterest/resolve.js", () => ({
  resolvePinterestPin: vi.fn(async (url: string) => ({
    type: "VIDEO",
    sourceUrl: url,
    thumbnail: "https://i.pinimg.com/236x/aa/bb/cc.jpg",
    title: "Mock pin",
    author: { username: "mock", displayName: null },
    media: [
      {
        url: "https://v1.pinimg.com/videos/mc/720p/mock.mp4",
        type: "video",
        width: 720,
        height: 1280,
        duration: 10,
        thumbnail: null,
        format: "mp4",
        mimeType: "video/mp4",
      },
    ],
  })),
}));

const VALID_PIN = "https://www.pinterest.com/pin/106204676805362606/";

describe("Pinterest route cheap phases", () => {
  let server: Server;
  let base: string;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => resolve());
    });
    const addr = server.address();
    const port = typeof addr === "object" && addr ? addr.port : 0;
    base = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  });

  beforeEach(() => {
    resetRateLimitsForTests();
    resetGatesForTests();
  });

  describe("POST /api/pinterest/resolve — validation", () => {
    it("rejects a missing body", async () => {
      const res = await fetch(`${base}/api/pinterest/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error?: { code?: string } };
      expect(body.error?.code).toBe("VALIDATION_ERROR");
    });

    it("rejects a non-JSON content type", async () => {
      const res = await fetch(`${base}/api/pinterest/resolve`, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "url=...",
      });
      expect(res.status).toBe(400);
    });

    it("rejects an oversized body", async () => {
      const res = await fetch(`${base}/api/pinterest/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: VALID_PIN, junk: "a".repeat(2000) }),
      });
      expect(res.status).toBe(413);
    });

    it("rejects a non-Pinterest URL with PINTEREST_INVALID_URL", async () => {
      const res = await fetch(`${base}/api/pinterest/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "https://example.com/pin/123/" }),
      });
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error?: { code?: string } };
      expect(body.error?.code).toBe("PINTEREST_INVALID_URL");
    });

    it("rejects an unknown kind with VALIDATION_ERROR", async () => {
      const res = await fetch(`${base}/api/pinterest/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: VALID_PIN, kind: "audio" }),
      });
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error?: { code?: string } };
      expect(body.error?.code).toBe("VALIDATION_ERROR");
    });

    it("attaches request diagnostics to errors", async () => {
      const res = await fetch(`${base}/api/pinterest/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "https://example.com/" }),
      });
      const body = (await res.json()) as {
        error?: { diagnostics?: { requestId?: string; provider?: string } };
      };
      expect(typeof body.error?.diagnostics?.requestId).toBe("string");
      expect(body.error?.diagnostics?.provider).toBe("pinterest-http");
    });
  });

  describe("POST /api/pinterest/resolve — success (mocked resolver)", () => {
    it("returns the normalized ResolveSuccessResponse shape", async () => {
      const res = await fetch(`${base}/api/pinterest/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: VALID_PIN, kind: "video" }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        success?: boolean;
        data?: { type?: string; mediaId?: string; startIndex?: null; media?: unknown[]; sourceUrl?: string };
      };
      expect(body.success).toBe(true);
      expect(body.data?.type).toBe("VIDEO");
      expect(typeof body.data?.mediaId).toBe("string");
      expect(body.data?.startIndex).toBeNull();
      expect(Array.isArray(body.data?.media)).toBe(true);
      expect(body.data?.sourceUrl).toBe(VALID_PIN);
    });

    it("strips tracking params from the reported sourceUrl", async () => {
      const res = await fetch(`${base}/api/pinterest/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: `${VALID_PIN}?utm_source=share&utm_medium=member` }),
      });
      const body = (await res.json()) as { data?: { sourceUrl?: string } };
      expect(body.data?.sourceUrl).toBe(VALID_PIN);
    });

    it("sends Cache-Control: no-store", async () => {
      const res = await fetch(`${base}/api/pinterest/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: VALID_PIN }),
      });
      expect(res.headers.get("Cache-Control")).toContain("no-store");
    });

    it("accepts kind=any (auto-detect) and forwards it to the resolver", async () => {
      vi.mocked(resolvePinterestPin).mockClear();
      const res = await fetch(`${base}/api/pinterest/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: VALID_PIN, kind: "any" }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { success?: boolean };
      expect(body.success).toBe(true);
      expect(vi.mocked(resolvePinterestPin)).toHaveBeenCalledTimes(1);
      expect(vi.mocked(resolvePinterestPin).mock.calls[0]?.[0]).toBe(VALID_PIN);
      expect(vi.mocked(resolvePinterestPin).mock.calls[0]?.[1]).toBe("any");
    });
  });

  describe("GET /api/pinterest/resolve/stream — validation", () => {
    it("rejects a missing url param as an error event", async () => {
      const res = await fetch(`${base}/api/pinterest/resolve/stream`);
      expect(res.headers.get("Content-Type")).toContain("text/event-stream");
      const text = await res.text();
      expect(text).toContain("event: error");
      expect(text).toContain("VALIDATION_ERROR");
    });

    it("rejects a non-Pinterest url as an error event", async () => {
      const res = await fetch(
        `${base}/api/pinterest/resolve/stream?url=${encodeURIComponent("https://example.com/x")}`
      );
      const text = await res.text();
      expect(text).toContain("event: error");
      expect(text).toContain("PINTEREST_INVALID_URL");
    });

    it("rejects an unknown kind as an error event", async () => {
      const res = await fetch(
        `${base}/api/pinterest/resolve/stream?url=${encodeURIComponent(VALID_PIN)}&kind=bogus`
      );
      const text = await res.text();
      expect(text).toContain("event: error");
      expect(text).toContain("VALIDATION_ERROR");
    });

    it("emits progress before the terminal event", async () => {
      const res = await fetch(`${base}/api/pinterest/resolve/stream?url=not-a-url`);
      const text = await res.text();
      expect(text).toContain("event: progress");
      expect(text).toContain("Request accepted");
    });

    it("delivers a complete event with media data (mocked resolver)", async () => {
      const res = await fetch(
        `${base}/api/pinterest/resolve/stream?url=${encodeURIComponent(VALID_PIN)}&kind=video`
      );
      const text = await res.text();
      expect(text).toContain("event: complete");
      expect(text).toContain("Media ready!");
      expect(text).toContain("mediaId");
      expect(text).toContain("v1.pinimg.com");
    });

    it("accepts kind=any (auto-detect) on the stream", async () => {
      const res = await fetch(
        `${base}/api/pinterest/resolve/stream?url=${encodeURIComponent(VALID_PIN)}&kind=any`
      );
      const text = await res.text();
      expect(text).toContain("event: complete");
      expect(text).toContain("Media ready!");
    });
  });

  describe("rate limiting", () => {
    it("returns 429 with Retry-After once the Pinterest budget is exhausted", async () => {
      // The resolver is mocked, so hammering the route with valid URLs is
      // cheap and exhausts the route's OWN bucket (whatever client-IP
      // formatting the platform reports) without guessing key strings.
      const config = routeRateLimitConfig("pinterest");
      let saw429 = false;
      let retryAfter: string | null = null;
      let lastCode: string | undefined;
      for (let i = 0; i < config.maxRequests + 5; i++) {
        const res = await fetch(`${base}/api/pinterest/resolve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: VALID_PIN }),
        });
        if (res.status === 429) {
          saw429 = true;
          retryAfter = res.headers.get("Retry-After");
          lastCode = ((await res.json()) as { error?: { code?: string } }).error?.code;
          break;
        }
      }
      expect(saw429).toBe(true);
      expect(retryAfter).toBeTruthy();
      expect(lastCode).toBe("RATE_LIMITED");
    });

    it("does not consume Pinterest quota for invalid URLs", async () => {
      const config = routeRateLimitConfig("pinterest");
      for (let i = 0; i < 5; i++) {
        await fetch(`${base}/api/pinterest/resolve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: "https://example.com/nope" }),
        });
      }
      const probe = checkRateLimit("pinterest-resolve:127.0.0.1", config);
      // Invalid URLs never reach the limiter, so the bucket is untouched.
      expect(probe.remaining).toBe(config.maxRequests - 1);
    });
  });
});
