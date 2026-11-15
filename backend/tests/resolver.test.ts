import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resolveUrl, resetResolver, normalizeResultType, createMonotonicProgress } from "@/lib/resolvers";
import { createProvider } from "@/lib/providers/index.js";
import { tryInstagramPublicExtraction } from "@/lib/instagram-public.js";
import { AppError } from "@/lib/errors.js";
import { MockProvider } from "@/lib/providers/mock.js";
import type { ResolverResult, MediaItem } from "@/lib/types";

/**
 * Providers are replaced so a restricted-content test can inject a resolver
 * whose name is NOT "mock" (the public extractor is intentionally skipped for
 * mock-like providers). The real MockProvider still backs the mock-provider
 * tests; every other provider name throws unless a test installs its own.
 */
vi.mock("@/lib/providers/index.js", () => ({
  createProvider: vi.fn(),
}));
vi.mock("@/lib/instagram-public.js", () => ({
  tryInstagramPublicExtraction: vi.fn(),
}));

const SESSION_KEYS = [
  "INSTAGRAM_COOKIE",
  "INSTAGRAM_SESSIONID",
  "INSTAGRAM_CSRFTOKEN",
  "INSTAGRAM_DS_USER_ID",
] as const;

function defaultCreateProvider() {
  if ((process.env.RESOLVER_PROVIDER ?? "") === "mock") return new MockProvider();
  throw new Error("PROVIDER_NOT_CONFIGURED");
}

const RESTRICTED_DIAGNOSTICS = {
  publicMethod: "html" as const,
  publicPageStatus: 200,
  publicPageBytes: 500_000,
  publicRestriction: "restricted" as const,
  publicFailureReason: "MA",
  publicRestrictedAge: 13,
};

function restrictedOutcome() {
  return {
    result: null,
    verdict: "INSTAGRAM_CONTENT_RESTRICTED" as const,
    diagnostics: RESTRICTED_DIAGNOSTICS,
  };
}

function mediaResult(url: string): ResolverResult {
  return {
    type: "REEL",
    sourceUrl: url,
    thumbnail: null,
    title: null,
    author: { username: "someone", displayName: null },
    media: [
      {
        url: "https://scontent.cdninstagram.com/v/reel.mp4",
        type: "video",
        width: 1080,
        height: 1920,
        duration: 10,
        size: 1000,
        thumbnail: null,
        format: "mp4",
      },
    ],
  };
}

const originalEnv = process.env;

beforeEach(() => {
  vi.resetModules();
  process.env = { ...originalEnv };
  resetResolver();
  vi.mocked(createProvider).mockReset();
  vi.mocked(createProvider).mockImplementation(defaultCreateProvider);
  vi.mocked(tryInstagramPublicExtraction).mockReset();
  vi.mocked(tryInstagramPublicExtraction).mockResolvedValue(restrictedOutcome());
});

afterEach(() => {
  process.env = originalEnv;
  resetResolver();
  vi.mocked(createProvider).mockReset();
  vi.mocked(tryInstagramPublicExtraction).mockReset();
});

describe("resolveUrl", () => {
  it("resolves via mock provider", async () => {
    process.env.RESOLVER_PROVIDER = "mock";
    const result = await resolveUrl(
      "https://www.instagram.com/reel/Cxyz123/"
    );
    expect(result.type).toBe("REEL");
    expect(result.media.length).toBeGreaterThanOrEqual(1);
  });

  it("throws for not-configured provider", async () => {
    delete process.env.RESOLVER_PROVIDER;
    await expect(
      resolveUrl("https://www.instagram.com/p/NOTCONFIGURED123/")
    ).rejects.toThrow();
  });

  it("keeps a complete 11-item carousel intact (never truncated)", () => {
    const media: MediaItem[] = Array.from({ length: 11 }, (_, i) => ({
      url: `https://scontent.cdninstagram.com/v/slide${i + 1}.jpg?x=${i}`,
      type: "image" as const,
      width: 1080,
      height: 1350,
      duration: null,
      thumbnail: null,
      format: "jpg",
    }));
    const base: ResolverResult = {
      type: "POST",
      sourceUrl: "https://www.instagram.com/p/CAROUSEL11/",
      thumbnail: null,
      title: null,
      author: null,
      media,
    };
    const out = normalizeResultType(base);
    expect(out.type).toBe("CAROUSEL");
    expect(out.media).toHaveLength(11);
    expect(out.media[0].url).toContain("slide1.jpg");
    expect(out.media[10].url).toContain("slide11.jpg");
  });

  it("keeps a single-item post as POST (no carousel UI)", () => {
    const base: ResolverResult = {
      type: "POST",
      sourceUrl: "https://www.instagram.com/p/SINGLE1/",
      thumbnail: null,
      title: null,
      author: null,
      media: [
        {
          url: "https://scontent.cdninstagram.com/v/only.jpg",
          type: "image",
          width: 1080,
          height: 1080,
          duration: null,
          thumbnail: null,
          format: "jpg",
        },
      ],
    };
    const out = normalizeResultType(base);
    expect(out.type).toBe("POST");
    expect(out.media).toHaveLength(1);
  });

  it("caches identical URLs", async () => {
    process.env.RESOLVER_PROVIDER = "mock";
    const url = "https://www.instagram.com/p/CACHE123/";
    const result1 = await resolveUrl(url);
    const result2 = await resolveUrl(url);
    expect(result1).toBe(result2);
  });

  it("coalesced joiner emits no progress (never rewinds the owner UI)", async () => {
    process.env.RESOLVER_PROVIDER = "mock";
    const url = "https://www.instagram.com/p/COALESCE123/";
    const ownerProgress: number[] = [];
    const joinerProgress: number[] = [];
    // No await between the two calls: the second must observe the first as
    // in-flight and subscribe to its result without emitting progress.
    const p1 = resolveUrl(url, (p) => {
      ownerProgress.push(p);
    });
    const p2 = resolveUrl(url, (p) => {
      joinerProgress.push(p);
    });
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r2).toEqual(r1);
    expect(joinerProgress).toEqual([]);
  });

  it("createMonotonicProgress drops rollbacks but keeps repeats", () => {
    const seen: Array<[number, string]> = [];
    const emit = createMonotonicProgress((p, s) => {
      seen.push([p, s]);
    });
    for (const [p, s] of [
      [0, "a"],
      [10, "b"],
      [10, "c"],
      [70, "d"],
      [30, "stale-joiner"],
      [70, "e"],
      [100, "f"],
    ] as Array<[number, string]>) {
      emit(p, s);
    }
    expect(seen.map(([p]) => p)).toEqual([0, 10, 10, 70, 70, 100]);
    expect(seen.map(([, s]) => s)).not.toContain("stale-joiner");
  });

  it("createMonotonicProgress ignores non-finite values", () => {
    const seen: number[] = [];
    const emit = createMonotonicProgress((p) => {
      seen.push(p);
    });
    emit(Number.NaN, "x");
    emit(50, "y");
    expect(seen).toEqual([50]);
  });

  describe("restricted content with a configured session", () => {
    function clearSessionEnv() {
      for (const key of SESSION_KEYS) delete process.env[key];
    }

    it("returns the restriction verdict without a session and never calls the provider", async () => {
      clearSessionEnv();
      process.env.RESOLVER_PROVIDER = "puppeteer-test";
      const provider = { name: "puppeteer-test", resolve: vi.fn() };
      vi.mocked(createProvider).mockReturnValue(provider as never);

      await expect(
        resolveUrl("https://www.instagram.com/reel/RestrictedNoSession/")
      ).rejects.toMatchObject({ code: "INSTAGRAM_CONTENT_RESTRICTED" });
      expect(provider.resolve).not.toHaveBeenCalled();
    });

    it("keeps the fast verdict when the configured session is incomplete", async () => {
      clearSessionEnv();
      process.env.RESOLVER_PROVIDER = "puppeteer-test";
      process.env.INSTAGRAM_SESSIONID = "bare-session-id";
      const provider = { name: "puppeteer-test", resolve: vi.fn() };
      vi.mocked(createProvider).mockReturnValue(provider as never);

      await expect(
        resolveUrl("https://www.instagram.com/reel/RestrictedPartialSession/")
      ).rejects.toMatchObject({ code: "INSTAGRAM_CONTENT_RESTRICTED" });
      expect(provider.resolve).not.toHaveBeenCalled();
    });

    it("lets a complete session attempt the restricted content", async () => {
      clearSessionEnv();
      process.env.RESOLVER_PROVIDER = "puppeteer-test";
      process.env.INSTAGRAM_COOKIE = "sessionid=abc123; csrftoken=xyz; ds_user_id=1";
      const url = "https://www.instagram.com/reel/RestrictedCompleteSession/";
      const provider = {
        name: "puppeteer-test",
        resolve: vi.fn(async () => mediaResult(url)),
      };
      vi.mocked(createProvider).mockReturnValue(provider as never);

      const result = await resolveUrl(url);
      expect(provider.resolve).toHaveBeenCalledTimes(1);
      expect(result.media).toHaveLength(1);
    });

    it("surfaces the restriction verdict when the session attempt yields no media", async () => {
      clearSessionEnv();
      process.env.RESOLVER_PROVIDER = "puppeteer-test";
      process.env.INSTAGRAM_COOKIE = "sessionid=abc123; csrftoken=xyz; ds_user_id=1";
      const provider = {
        name: "puppeteer-test",
        resolve: vi.fn(async () => {
          throw new AppError("VIDEO_SOURCE_NOT_FOUND", "no media", 404);
        }),
      };
      vi.mocked(createProvider).mockReturnValue(provider as never);

      await expect(
        resolveUrl("https://www.instagram.com/reel/RestrictedEmptySession/")
      ).rejects.toMatchObject({
        code: "INSTAGRAM_CONTENT_RESTRICTED",
        details: expect.objectContaining({
          publicFailureReason: "MA",
          publicRestrictedAge: 13,
        }),
      });
      expect(provider.resolve).toHaveBeenCalledTimes(1);
    });

    it("propagates a stale-session error instead of masking it as restricted", async () => {
      clearSessionEnv();
      process.env.RESOLVER_PROVIDER = "puppeteer-test";
      process.env.INSTAGRAM_COOKIE = "sessionid=abc123; csrftoken=xyz; ds_user_id=1";
      const provider = {
        name: "puppeteer-test",
        resolve: vi.fn(async () => {
          throw new AppError("INSTAGRAM_AUTH_INVALID", "session rejected", 401);
        }),
      };
      vi.mocked(createProvider).mockReturnValue(provider as never);

      await expect(
        resolveUrl("https://www.instagram.com/reel/RestrictedStaleSession/")
      ).rejects.toMatchObject({ code: "INSTAGRAM_AUTH_INVALID" });
    });
  });
});
