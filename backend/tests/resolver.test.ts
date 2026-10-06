import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resolveUrl, resetResolver, normalizeResultType, createMonotonicProgress } from "@/lib/resolvers";
import type { ResolverResult, MediaItem } from "@/lib/types";

const originalEnv = process.env;

beforeEach(() => {
  vi.resetModules();
  process.env = { ...originalEnv };
  resetResolver();
});

afterEach(() => {
  process.env = originalEnv;
  resetResolver();
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
});
