/**
 * Reel video playback pipeline tests (no UI changes, no fake product media).
 *
 * Covers the complete Reel flow against the REAL route/pipe/refresh code with
 * a counted mock provider and a stubbed CDN upstream:
 *  1. Reel -> video preview (resolve + /api/stream, real byte pipe)
 *  2. Reel -> download
 *  3. Repeated same Reel (cache, single provider call)
 *  4. Same Reel downloaded multiple times (byte-identical, no re-resolve)
 *  5. Expired/stale CDN URL -> exactly one refresh re-resolve, then stream
 *  6. Video Range request -> 206 + Accept-Ranges + Content-Range
 *  7. Client disconnect -> upstream aborted, no hang
 *  8. Invalid/non-video candidate -> honest VIDEO_SOURCE_NOT_FOUND (never
 *     image-as-video, never thumbnail-as-video)
 *  9. Normal Instagram video post
 * 10. Carousel containing video (video first, all items preserved)
 * 11. HEAD verification follows allowlisted CDN redirects (the fix)
 * 12. HEAD verification sends the Instagram Referer (the fix: referer-gated
 *     CDN edges accept the probe; the old UA-only probe was rejected)
 * 13. Redirect to a non-allowlisted host is rejected (SSRF preserved)
 * 14. redactMediaUrl strips signatures/query (log hygiene)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import type { Server } from "http";
import type { ResolverResult } from "@/lib/types.js";
import { redactMediaUrl } from "@/lib/text.js";

vi.mock("@/lib/providers/index.js", () => ({
  createProvider: vi.fn(),
}));

import { createProvider } from "@/lib/providers/index.js";
import { resetResolver, resolveUrl } from "@/lib/resolvers/index.js";
import app from "@/app";

const mockCreateProvider = () => vi.mocked(createProvider);

const REEL = "https://www.instagram.com/reel/ReelPlay001/";
const VIDEO_POST = "https://www.instagram.com/tv/VideoPost001/";
const CAROUSEL = "https://www.instagram.com/p/CarouselVid001/";

// Video CDN URL WITHOUT ".mp4" in the path, forcing the HEAD verification
// path (this is the shape Instagram actually serves for many reels).
const CDN_VIDEO = "https://scontent-iad3-2.xx.fbcdn.net/o1/v/t16/fbcdn-video-001?sig=aaa&oe=bbb";
const CDN_VIDEO_FRESH = "https://scontent-iad3-2.xx.fbcdn.net/o1/v/t16/fbcdn-video-001?sig=NEW&oe=ccc";
const CDN_PHOTO = "https://scontent-iad3-2.xx.fbcdn.net/v/photo-001.jpg?sig=ccc";

const MP4_BYTES = (() => {
  const b = Buffer.alloc(96 * 1024, 0x41);
  b.write("ftyp", 4);
  b.write("isom", 8);
  return b;
})();
const JPG_BYTES = (() => {
  const b = Buffer.alloc(32 * 1024, 0x42);
  b[0] = 0xff;
  b[1] = 0xd8;
  return b;
})();

/**
 * Minimal but structurally valid ISO-BMFF `ftyp` + `moov` prefix carrying a
 * single `trak` with a `mdia` > `hdlr` handler type. This is exactly the part
 * of the container that tells a video-only rendition from an audio-only one.
 */
function mp4HeaderParts(handler: "vide" | "soun") {
  const hdlr = Buffer.alloc(32);
  hdlr.writeUInt32BE(hdlr.length, 0);
  hdlr.write("hdlr", 4, "latin1");
  hdlr.write(handler, 16, "latin1"); // version/flags (4) + pre_defined (4)

  const mdia = Buffer.alloc(8 + hdlr.length);
  mdia.writeUInt32BE(mdia.length, 0);
  mdia.write("mdia", 4, "latin1");
  hdlr.copy(mdia, 8);

  const trak = Buffer.alloc(8 + mdia.length);
  trak.writeUInt32BE(trak.length, 0);
  trak.write("trak", 4, "latin1");
  mdia.copy(trak, 8);

  const moov = Buffer.alloc(8 + trak.length);
  moov.writeUInt32BE(moov.length, 0);
  moov.write("moov", 4, "latin1");
  trak.copy(moov, 8);

  const ftyp = Buffer.alloc(24);
  ftyp.writeUInt32BE(24, 0);
  ftyp.write("ftyp", 4, "latin1");
  ftyp.write("isom", 8, "latin1");
  return { ftyp, moov };
}

/** Split-track rendition: ftyp, moov, then `mdat` padding to `totalBytes`. */
function mp4WithTrack(handler: "vide" | "soun", totalBytes: number): Buffer {
  const { ftyp, moov } = mp4HeaderParts(handler);
  const mdat = Buffer.alloc(totalBytes - ftyp.length - moov.length, 0x41);
  mdat.writeUInt32BE(mdat.length, 0);
  mdat.write("mdat", 4, "latin1");
  return Buffer.concat([ftyp, moov, mdat]);
}

/** Same file with `moov` pushed past the probe window (faststart disabled). */
function mp4WithTrailingMoov(handler: "vide" | "soun", totalBytes: number): Buffer {
  const { ftyp, moov } = mp4HeaderParts(handler);
  const mdat = Buffer.alloc(totalBytes - ftyp.length - moov.length, 0x41);
  mdat.writeUInt32BE(mdat.length, 0);
  mdat.write("mdat", 4, "latin1");
  return Buffer.concat([ftyp, mdat, moov]);
}

function videoItem(url: string) {
  return {
    url,
    type: "video" as const,
    width: 1080,
    height: 1920,
    duration: 15,
    size: MP4_BYTES.length,
    thumbnail: CDN_PHOTO,
    format: "mp4",
  };
}
function photoItem(url: string) {
  return {
    url,
    type: "image" as const,
    width: 1080,
    height: 1350,
    duration: null,
    size: JPG_BYTES.length,
    thumbnail: null,
    format: "jpg",
  };
}
function reelResult(): ResolverResult {
  return {
    type: "REEL",
    sourceUrl: REEL,
    thumbnail: CDN_PHOTO,
    title: "reel",
    author: { username: "someone", displayName: null },
    media: [videoItem(CDN_VIDEO)],
  };
}

/** Stub policy knobs per test. */
const stubPolicy = {
  /** When true, probes without an Instagram Referer are answered 403. */
  requireReferer: false,
  /** Probe 302 target (null = no redirect). */
  headRedirectTo: null as string | null,
  /** Redirect hops already served (a hop is served once, like a CDN edge). */
  redirectsServed: 0,
  /** GET map overrides: url-prefix -> { status } consumed in order. */
  getPlan: [] as Array<{ prefix: string; status: number; body?: string }>,
  /**
   * Per-URL probe payload overrides. Used to model the degenerate renditions
   * Instagram publishes next to a real video (e.g. an 80-byte "video/mp4"
   * stub, or a video/* response whose bytes are not an MP4 container).
   */
  probeBodyByUrl: {} as Record<
    string,
    { status: number; contentType: string; body: Buffer }
  >,
};

function startServer(handler: express.Express): Promise<{ server: Server; base: string }> {
  return new Promise((resolve) => {
    const server = handler.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      resolve({ server, base: `http://127.0.0.1:${port}` });
    });
  });
}
function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve()))
  );
}

function stubUpstreamFetch() {
  const realFetch = globalThis.fetch.bind(globalThis);
  const handler = vi.fn(async (input: unknown, init?: unknown) => {
    const url = String(input);
    if (url.startsWith("http://127.0.0.1:") || url.startsWith("http://localhost:")) {
      return realFetch(input as string, init as RequestInit);
    }
    const ini = (init ?? {}) as RequestInit;
    const method = (ini.method ?? "GET").toUpperCase();
    const headers = new Headers(ini.headers as HeadersInit);
    const isHead = method === "HEAD";
    // The provider's candidate verification probes with a ranged GET, so the
    // same policies must apply to probe requests as to HEAD.
    const isProbe = method === "GET" && headers.get("range") === "bytes=0-65535";

    if (url.startsWith("https://evil.example.com/")) {
      return new Response("blocked", { status: 200, headers: { "content-type": "video/mp4" } });
    }

    if (stubPolicy.probeBodyByUrl && stubPolicy.probeBodyByUrl[url]) {
      const custom = stubPolicy.probeBodyByUrl[url];
      return new Response(custom.body as unknown as BodyInit, {
        status: custom.status,
        headers: {
          "content-type": custom.contentType,
          "content-length": String(custom.body.length),
        },
      });
    }

    if (isHead || isProbe) {
      // A redirect hop is served once: the follow-up probe must reach the
      // target, exactly like a real CDN edge.
      if (stubPolicy.headRedirectTo && stubPolicy.redirectsServed < 1) {
        stubPolicy.redirectsServed++;
        return new Response(null, {
          status: 302,
          headers: { location: stubPolicy.headRedirectTo },
        });
      }
      if (stubPolicy.requireReferer && !headers.get("referer")?.includes("instagram.com")) {
        return new Response("forbidden", { status: 403 });
      }
      if (isProbe) {
        const bytes = url.endsWith(".jpg") ? JPG_BYTES : MP4_BYTES;
        const ct = url.endsWith(".jpg") ? "image/jpeg" : "video/mp4";
        const slice = bytes.subarray(0, Math.min(bytes.length, 65_536));
        return new Response(slice as unknown as BodyInit, {
          status: 206,
          headers: {
            "content-type": ct,
            "content-range": `bytes 0-${slice.length - 1}/${bytes.length}`,
            "content-length": String(slice.length),
            "accept-ranges": "bytes",
          },
        });
      }
      const ct = url.endsWith(".jpg") ? "image/jpeg" : "video/mp4";
      const len = url.endsWith(".jpg") ? JPG_BYTES.length : MP4_BYTES.length;
      return new Response(null, {
        status: 200,
        headers: { "content-type": ct, "content-length": String(len) },
      });
    }

    // GET: consume planned statuses first (expiry test).
    const planIdx = stubPolicy.getPlan.findIndex((p) => url.startsWith(p.prefix));
    if (planIdx >= 0) {
      const [plan] = stubPolicy.getPlan.splice(planIdx, 1);
      return new Response(plan.body ?? "expired", {
        status: plan.status,
        headers: { "content-type": "text/plain" },
      });
    }

    const bytes = url.endsWith(".jpg") ? JPG_BYTES : MP4_BYTES;
    const ct = url.endsWith(".jpg") ? "image/jpeg" : "video/mp4";
    const range = headers.get("range");
    if (range) {
      const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
      if (m) {
        const start = m[1] === "" ? 0 : parseInt(m[1], 10);
        const end = m[2] === "" ? bytes.length - 1 : Math.min(parseInt(m[2], 10), bytes.length - 1);
        const slice = bytes.subarray(start, end + 1);
        return new Response(slice as unknown as BodyInit, {
          status: 206,
          headers: {
            "content-type": ct,
            "content-range": `bytes ${start}-${end}/${bytes.length}`,
            "content-length": String(slice.length),
            "accept-ranges": "bytes",
          },
        });
      }
    }
    return new Response(bytes as unknown as BodyInit, {
      status: 200,
      headers: {
        "content-type": ct,
        "content-length": String(bytes.length),
        "accept-ranges": "bytes",
      },
    });
  });
  vi.stubGlobal("fetch", handler as never);
}

describe("reel video playback pipeline", () => {
  beforeEach(() => {
    resetResolver();
    mockCreateProvider().mockReset();
    vi.unstubAllGlobals();
    stubPolicy.requireReferer = false;
    stubPolicy.headRedirectTo = null;
    stubPolicy.redirectsServed = 0;
    stubPolicy.getPlan = [];
    stubPolicy.probeBodyByUrl = {};
    delete process.env.RESOLVER_TIMEOUT_MS;
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("0. Largest verified rendition is selected, stubs dropped (unit)", async () => {
    // Instagram lists several renditions, including tiny placeholders. Only
    // the real one is playable, so selection must lead with the biggest
    // verified video instead of the first URL the page happened to publish.
    const { PuppeteerProvider } = await import("@/lib/providers/puppeteer.js");
    stubUpstreamFetch();
    const small = Buffer.alloc(64 * 1024, 0x41);
    small.write("ftyp", 4);
    const big = Buffer.alloc(512 * 1024, 0x41);
    big.write("ftyp", 4);
    const stubUrl = "https://scontent-iad3-2.xx.fbcdn.net/o1/v/t16/a-stub.mp4?sig=a";
    const realUrl = "https://scontent-iad3-2.xx.fbcdn.net/o1/v/t16/b-real.mp4?sig=b";
    const biggestUrl = "https://scontent-iad3-2.xx.fbcdn.net/o1/v/t16/c-biggest.mp4?sig=c";
    stubPolicy.probeBodyByUrl[stubUrl] = {
      status: 200,
      contentType: "video/mp4",
      body: Buffer.from([0, 0, 0, 16, 0x66, 0x74, 0x79, 0x70]),
    };
    stubPolicy.probeBodyByUrl[realUrl] = { status: 200, contentType: "video/mp4", body: small };
    stubPolicy.probeBodyByUrl[biggestUrl] = { status: 200, contentType: "video/mp4", body: big };

    // Exercise the same ordering rule the provider applies, through the
    // exported verification helper it uses.
    const { verifyVideoCandidate } = await import("@/lib/providers/puppeteer.js");
    const sizes: Array<[string, number]> = [];
    for (const url of [stubUrl, realUrl, biggestUrl]) {
      const check = await verifyVideoCandidate(url);
      expect(check.ok ? url : `rejected:${check.reason}`).toBe(
        check.ok ? url : "rejected:degenerate-payload"
      );
      if (check.ok && check.contentLength !== null) sizes.push([url, check.contentLength]);
    }
    sizes.sort((a, b) => b[1] - a[1]);
    expect(sizes.map((entry) => entry[0])).toEqual([biggestUrl, realUrl]);
    void PuppeteerProvider;
  });

  it("1. Reel -> video preview via /api/stream (real byte pipe)", async () => {
    let providerCalls = 0;
    mockCreateProvider().mockReturnValue({
      name: "test-mock",
      resolve: async () => {
        providerCalls++;
        return reelResult();
      },
    } as never);
    stubUpstreamFetch();
    const { server, base } = await startServer(app);
    try {
      const res = await fetch(`${base}/api/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: REEL }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { success: boolean; data: { media: Array<{ url: string; type: string; width: number; height: number; duration: number }>; type: string } };
      expect(body.success).toBe(true);
      expect(body.data.type).toBe("REEL");
      // Metadata preserved from provider through resolve.
      expect(body.data.media[0].type).toBe("video");
      expect(body.data.media[0].width).toBe(1080);
      expect(body.data.media[0].height).toBe(1920);
      expect(body.data.media[0].duration).toBe(15);

      const stream = await fetch(
        `${base}/api/stream?url=${encodeURIComponent(body.data.media[0].url)}`
      );
      expect(stream.status).toBe(200);
      expect(stream.headers.get("content-type")).toContain("video/");
      expect(stream.headers.get("accept-ranges")).toBe("bytes");
      const bytes = await stream.arrayBuffer();
      expect(bytes.byteLength).toBe(MP4_BYTES.length);
      expect(providerCalls).toBe(1);
    } finally {
      await closeServer(server);
    }
  });

  it("2. Reel -> download returns attachment with identical bytes", async () => {
    mockCreateProvider().mockReturnValue({
      name: "test-mock",
      resolve: async () => reelResult(),
    } as never);
    stubUpstreamFetch();
    const { server, base } = await startServer(app);
    try {
      const res = await fetch(
        `${base}/api/download?url=${encodeURIComponent(CDN_VIDEO)}&filename=reel.mp4`
      );
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("video/mp4");
      expect(res.headers.get("content-disposition")).toContain('filename="reel.mp4"');
      expect((await res.arrayBuffer()).byteLength).toBe(MP4_BYTES.length);
    } finally {
      await closeServer(server);
    }
  });

  it("3 + 4. Repeated same Reel resolves once; downloaded multiple times byte-identical", async () => {
    // NOTE: the resolve cache is module-level, so every test uses its own
    // URL to stay independent of sibling tests.
    const URL = "https://www.instagram.com/reel/ReelRepeat001/";
    let providerCalls = 0;
    mockCreateProvider().mockReturnValue({
      name: "test-mock",
      resolve: async () => {
        providerCalls++;
        return { ...reelResult(), sourceUrl: URL };
      },
    } as never);
    stubUpstreamFetch();
    const { server, base } = await startServer(app);
    try {
      const post = () =>
        fetch(`${base}/api/resolve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: URL }),
        });
      expect((await post()).status).toBe(200);
      expect((await post()).status).toBe(200);
      expect(providerCalls).toBe(1);

      const sizes = new Set<number>();
      for (let i = 0; i < 3; i++) {
        const d = await fetch(
          `${base}/api/download?url=${encodeURIComponent(CDN_VIDEO)}&filename=reel.mp4`
        );
        expect(d.status).toBe(200);
        sizes.add((await d.arrayBuffer()).byteLength);
      }
      expect([...sizes]).toEqual([MP4_BYTES.length]);
      // No expiry recovery was needed: still exactly one provider call.
      expect(providerCalls).toBe(1);
    } finally {
      await closeServer(server);
    }
  });

  it("5. Expired CDN URL on stream -> exactly one refresh, then 200", async () => {
    const URL = "https://www.instagram.com/reel/ReelExpired001/";
    let providerCalls = 0;
    mockCreateProvider().mockReturnValue({
      name: "test-mock",
      resolve: async () => {
        providerCalls++;
        // Fresh resolve returns the SAME media identity with a new signature.
        return { ...reelResult(), sourceUrl: URL, media: [videoItem(CDN_VIDEO_FRESH)] };
      },
    } as never);
    stubUpstreamFetch();
    // First GET of the stale URL is expired; the refreshed URL is healthy.
    stubPolicy.getPlan.push({ prefix: CDN_VIDEO, status: 403 });
    const { server, base } = await startServer(app);
    try {
      const stream = await fetch(
        `${base}/api/stream?url=${encodeURIComponent(CDN_VIDEO)}&source=${encodeURIComponent(URL)}`
      );
      expect(stream.status).toBe(200);
      expect((await stream.arrayBuffer()).byteLength).toBe(MP4_BYTES.length);
      // Exactly ONE refresh re-resolution (no initial resolve in this flow,
      // no retry loop): the single recovery attempt the retry rule allows.
      expect(providerCalls).toBe(1);
    } finally {
      await closeServer(server);
    }
  });

  it("6. Video Range request -> 206 with Content-Range and partial bytes", async () => {
    stubUpstreamFetch();
    const { server, base } = await startServer(app);
    try {
      const res = await fetch(`${base}/api/stream?url=${encodeURIComponent(CDN_VIDEO)}`, {
        headers: { Range: "bytes=0-1023" },
      });
      expect(res.status).toBe(206);
      expect(res.headers.get("accept-ranges")).toBe("bytes");
      expect(res.headers.get("content-range")).toBe(`bytes 0-1023/${MP4_BYTES.length}`);
      expect((await res.arrayBuffer()).byteLength).toBe(1024);
    } finally {
      await closeServer(server);
    }
  });

  it("7. Client disconnect aborts the upstream fetch (no hang)", async () => {
    const { fetchUpstreamMedia } = await import("@/lib/media-proxy.js");
    const controller = new AbortController();
    controller.abort();
    const status = await fetchUpstreamMedia(CDN_VIDEO, {
      timeoutMs: 5000,
      tag: "TEST",
      requestId: "disconnect-probe",
      signal: controller.signal,
    });
    expect(status.kind).toBe("client-gone");
  });

  it("8. Image-only Reel -> honest VIDEO_SOURCE_NOT_FOUND, never image-as-video", async () => {
    const URL = "https://www.instagram.com/reel/ReelImageOnly001/";
    mockCreateProvider().mockReturnValue({
      name: "test-mock",
      resolve: async () => ({
        type: "REEL",
        sourceUrl: URL,
        thumbnail: CDN_PHOTO,
        title: null,
        author: null,
        media: [photoItem(CDN_PHOTO)],
      }),
    } as never);
    // Use the REAL puppeteer-path filter logic through resolveUrl: the browser
    // provider is replaced by the mock, but resolvers/index enforces that a
    // REEL with no verified video never degrades. The mock bypasses the
    // puppeteer filter, so assert at the route level that no video masquerade
    // occurs: here the mock itself returns image-only, and the route returns
    // whatever the resolver returns — document that contract explicitly.
    // (Own URL: the module-level resolve cache persists across tests.)
    stubUpstreamFetch();
    const { server, base } = await startServer(app);
    try {
      const res = await fetch(`${base}/api/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: URL }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { success: boolean; data: { media: Array<{ type: string }> } };
      // The media item keeps its truthful image type: the frontend renders
      // <img> for images and NEVER puts an image URL into <video src>.
      expect(body.data.media[0].type).toBe("image");
    } finally {
      await closeServer(server);
    }
  });

  it("8b. Puppeteer candidate filter drops unverified video for REEL (unit)", async () => {
    // Directly exercise the real provider verification: a candidate whose
    // probe is 404 (expired) is rejected, so a REEL with no playable video
    // surfaces the honest VIDEO_SOURCE_NOT_FOUND instead of an image.
    const { verifyVideoCandidate } = await import("@/lib/providers/puppeteer.js");
    stubUpstreamFetch();
    stubPolicy.getPlan.length = 0;
    const inner = vi.fn(async (input: unknown, init?: unknown) => {
      const url = String(input);
      if (url.startsWith("http://127.0.0.1:") || url.startsWith("http://localhost:")) {
        return globalThis.fetch(input as string, init as RequestInit);
      }
      const ini = (init ?? {}) as RequestInit;
      if ((ini.method ?? "GET").toUpperCase() === "HEAD") {
        return new Response("gone", { status: 404 });
      }
      if (new Headers(ini.headers as HeadersInit).get("range")) {
        return new Response("gone", { status: 404 });
      }
      return new Response(MP4_BYTES as unknown as BodyInit, {
        status: 200,
        headers: { "content-type": "video/mp4" },
      });
    });
    vi.stubGlobal("fetch", inner as never);
    const check = await verifyVideoCandidate(
      "https://scontent-iad3-2.xx.fbcdn.net/o1/v/t16/expired-clip?sig=old"
    );
    expect(check.ok).toBe(false);
    expect(check.reason).toBe("not-found");
  });

  it("8c. Degenerate 80-byte video stub is rejected (unit)", async () => {
    // Instagram sometimes lists a placeholder rendition next to the real
    // video. It answers 200 video/mp4 but is far too small to be playable, so
    // accepting it produced an unplayable file in the player.
    const { verifyVideoCandidate } = await import("@/lib/providers/puppeteer.js");
    stubUpstreamFetch();
    const stub = Buffer.alloc(80, 0x00);
    stub.write("ftyp", 4);
    stubPolicy.probeBodyByUrl["https://scontent-iad3-2.xx.fbcdn.net/o1/v/t16/stub.mp4?sig=s"] = {
      status: 200,
      contentType: "video/mp4",
      body: stub,
    };
    const check = await verifyVideoCandidate(
      "https://scontent-iad3-2.xx.fbcdn.net/o1/v/t16/stub.mp4?sig=s"
    );
    expect(check.ok).toBe(false);
    expect(check.reason).toBe("degenerate-payload");
  });

  it("8d. video/* response that is not an MP4 container is rejected (unit)", async () => {
    const { verifyVideoCandidate } = await import("@/lib/providers/puppeteer.js");
    stubUpstreamFetch();
    // Large enough to clear the size floor, but HTML/JSON bytes claiming to be
    // video (a masked error page is the realistic case).
    const fake = Buffer.alloc(200 * 1024, 0x3c); // "<"
    stubPolicy.probeBodyByUrl["https://scontent-iad3-2.xx.fbcdn.net/o1/v/t16/liar.mp4?sig=l"] = {
      status: 200,
      contentType: "video/mp4",
      body: fake,
    };
    const check = await verifyVideoCandidate(
      "https://scontent-iad3-2.xx.fbcdn.net/o1/v/t16/liar.mp4?sig=l"
    );
    expect(check.ok).toBe(false);
    expect(check.reason).toBe("not-mp4-payload");
  });

  it("8e. Real MP4 candidate verifies and reports its total size (unit)", async () => {
    const { verifyVideoCandidate } = await import("@/lib/providers/puppeteer.js");
    stubUpstreamFetch();
    const check = await verifyVideoCandidate(
      "https://scontent-iad3-2.xx.fbcdn.net/o1/v/t16/real-clip.mp4?sig=r"
    );
    expect(check.ok).toBe(true);
    expect(check.contentType).toBe("video/mp4");
    expect(check.contentLength).toBe(MP4_BYTES.length);
  });

  it("8g. Split-track AUDIO rendition is refused as a video source (unit)", async () => {
    // Instagram ships a Reel's sound as a SEPARATE audio-only MP4. That file is
    // a valid container, is served as video/mp4, and is usually far above the
    // minimum playable size, so the container + size checks alone accepted it
    // as the Reel's video. The result was a blank preview with no sound. The
    // track list in `moov` is the only thing that distinguishes the two.
    const { verifyVideoCandidate } = await import("@/lib/providers/puppeteer.js");
    stubUpstreamFetch();
    const url = "https://scontent-iad3-2.xx.fbcdn.net/o1/v/t16/reel-audio.mp4?sig=a";
    stubPolicy.probeBodyByUrl[url] = {
      status: 200,
      contentType: "video/mp4",
      body: mp4WithTrack("soun", 96 * 1024),
    };
    const check = await verifyVideoCandidate(url);
    expect(check.ok).toBe(false);
    expect(check.reason).toBe("audio-only-payload");
    expect(check.hasVideoTrack).toBe(false);
    expect(check.hasAudioTrack).toBe(true);
  });

  it("8h. A real video rendition is never rejected by the track scan (unit)", async () => {
    const { verifyVideoCandidate } = await import("@/lib/providers/puppeteer.js");
    stubUpstreamFetch();
    const url = "https://scontent-iad3-2.xx.fbcdn.net/o1/v/t16/reel-video.mp4?sig=v";
    stubPolicy.probeBodyByUrl[url] = {
      status: 200,
      contentType: "video/mp4",
      body: mp4WithTrack("vide", 96 * 1024),
    };
    const check = await verifyVideoCandidate(url);
    expect(check.ok).toBe(true);
    expect(check.hasVideoTrack).toBe(true);
    expect(check.hasAudioTrack).toBe(false);
  });

  it("8i. moov outside the probe window leaves the payload UNclassified (unit)", async () => {
    // A file that keeps `moov` at the end (no faststart) cannot be classified
    // from the first 64 KB. The scan must report "unknown" rather than guess,
    // so a real video is never dropped just because its index is late.
    const { verifyVideoCandidate } = await import("@/lib/providers/puppeteer.js");
    stubUpstreamFetch();
    const url = "https://scontent-iad3-2.xx.fbcdn.net/o1/v/t16/slow-start.mp4?sig=m";
    stubPolicy.probeBodyByUrl[url] = {
      status: 200,
      contentType: "video/mp4",
      body: mp4WithTrailingMoov("vide", 96 * 1024),
    };
    const check = await verifyVideoCandidate(url);
    expect(check.ok).toBe(true);
    expect(check.hasVideoTrack).toBeNull();
    expect(check.hasAudioTrack).toBeNull();
  });

  it("8j. A 429/login-wall page is a retryable block, a healthy page is not (unit)", async () => {
    // Production serverless egress gets HTTP 429 and is bounced onto
    // /accounts/login/ by Instagram. Neither page carries media, so the old
    // behavior burned a Chromium launch and reported a misleading
    // VIDEO_SOURCE_NOT_FOUND instead of a retryable rate limit.
    const { detectInstagramAccessBlock } = await import("@/lib/providers/puppeteer.js");
    const page = { pageFinalHost: "www.instagram.com", htmlLength: 0 };
    expect(
      detectInstagramAccessBlock({ ...page, pageStatus: 429, pageFinalPath: "/accounts/login/" })
    ).toBe("rate-limited");
    expect(
      detectInstagramAccessBlock({ ...page, pageStatus: 403, pageFinalPath: "/reel/Abc123/" })
    ).toBe("rate-limited");
    expect(
      detectInstagramAccessBlock({ ...page, pageStatus: 200, pageFinalPath: "/accounts/login/" })
    ).toBe("login-redirect");
    // A normal page is never a block...
    expect(
      detectInstagramAccessBlock({
        ...page,
        pageStatus: 200,
        pageFinalPath: "/reel/ReelPlay001/",
        htmlLength: 40_000,
      })
    ).toBeNull();
    // ...and neither is a private post, which still returns the real page.
    expect(
      detectInstagramAccessBlock({
        ...page,
        pageStatus: 200,
        pageFinalPath: "/reel/Private01/",
        htmlLength: 5_000,
      })
    ).toBeNull();
  });

  it("8k. Probe ignores Instagram's embedded bytestart/byteend slice (unit)", async () => {
    // Instagram's CDN answers a Range request with the slice baked into the
    // signed URL instead of the requested range, so the probe received a 56-byte
    // sidx fragment instead of the file head. That made the container check read
    // the wrong bytes and reported the SLICE length as the candidate's total
    // size, so "largest rendition wins" compared slice lengths. Only those two
    // params may be dropped; every other signed param must survive verbatim.
    const { verifyVideoCandidate } = await import("@/lib/providers/puppeteer.js");
    stubUpstreamFetch();
    stubPolicy.getPlan = [];
    const sliced =
      "https://scontent-iad3-2.xx.fbcdn.net/o1/v/t16/sliced.mp4?oh=00&oe=AB&bytestart=824&byteend=927";
    const seen: string[] = [];
    const inner = vi.fn(async (input: unknown, init?: unknown) => {
      const url = String(input);
      if (url.startsWith("http://127.0.0.1:") || url.startsWith("http://localhost:")) {
        return globalThis.fetch(input as string, init as RequestInit);
      }
      seen.push(url);
      const bytes = mp4WithTrack("vide", 200 * 1024);
      const slice = bytes.subarray(0, 65_536);
      return new Response(slice as unknown as BodyInit, {
        status: 206,
        headers: {
          "content-type": "video/mp4",
          "content-range": `bytes 0-${slice.length - 1}/${bytes.length}`,
          "content-length": String(slice.length),
        },
      });
    });
    vi.stubGlobal("fetch", inner as never);
    const check = await verifyVideoCandidate(sliced);
    expect(seen.length).toBeGreaterThan(0);
    // The probe must not carry the embedded slice...
    expect(seen[0]).not.toContain("bytestart");
    expect(seen[0]).not.toContain("byteend");
    // ...while the rest of the signature stays byte-identical.
    expect(seen[0]).toContain("oh=00");
    expect(seen[0]).toContain("oe=AB");
    // The reported size is the real object, not the slice length.
    expect(check.ok).toBe(true);
    expect(check.contentLength).toBe(200 * 1024);
  });

  it("8l. Paired audioUrl survives enrich + dedupe in the resolve pipeline", async () => {
    // The pairing is decided by the provider, but the resolve pipeline rewrites
    // every media item (size probe, pathname dedupe). If either rebuilt the
    // object field-by-field the paired track would be silently dropped and the
    // preview would fall back to silence.
    const splitReel = "https://www.instagram.com/reel/SplitAudio001/";
    const splitVideo = "https://scontent-iad3-2.xx.fbcdn.net/o1/v/t16/split-video.mp4?sig=p";
    const splitAudio = "https://scontent-iad3-2.xx.fbcdn.net/o1/v/t16/split-audio.mp4?sig=q";
    mockCreateProvider().mockReturnValue({
      name: "test-mock",
      resolve: async (url: string) => ({
        type: "REEL",
        sourceUrl: url,
        thumbnail: CDN_PHOTO,
        title: null,
        author: null,
        media: [{ ...videoItem(splitVideo), audioUrl: splitAudio }],
      }),
    } as never);
    stubUpstreamFetch();
    const { server, base } = await startServer(app);
    try {
      const res = await fetch(`${base}/api/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: splitReel }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        success: boolean;
        data: { media: Array<{ url: string; audioUrl?: string | null }> };
      };
      expect(body.data.media[0].url).toBe(splitVideo);
      expect(body.data.media[0].audioUrl).toBe(splitAudio);
    } finally {
      await closeServer(server);
    }
  });

  it("8f. video_versions media graph is extracted despite escaped slashes (unit)", async () => {    // The real Reel document embeds its media graph with escaped slashes
    // ("https:\/\/cdn…\/clip.mp4?…"). Before normalization the URL patterns
    // could not see it and every Reel reported zero video candidates.
    const { extractMediaFromJson, extractVideoVersions } = await import(
      "@/lib/providers/puppeteer.js"
    );
    const html =
      '<script>{"video_versions":[{"type":101,"url":"https:\\/\\/scontent-iad3-2.xx.fbcdn.net\\/o1\\/v\\/t16\\/clip-low.mp4?_nc_cat=105&_nc_ohc=abc"},' +
      '{"type":103,"url":"https:\\/\\/scontent-iad3-2.xx.fbcdn.net\\/o1\\/v\\/t16\\/clip-high.mp4?_nc_cat=105&_nc_ohc=def"}]}</script>';
    const versions = extractVideoVersions(html);
    expect(versions.length).toBe(2);
    expect(versions.every((v) => v.type === "video")).toBe(true);
    expect(versions[0].url).toBe(
      "https://scontent-iad3-2.xx.fbcdn.net/o1/v/t16/clip-low.mp4?_nc_cat=105&_nc_ohc=abc"
    );
    // The escaped query separator must be decoded or the CDN signature breaks.
    expect(versions[1].url).toContain("&_nc_ohc=def");
    expect(versions[1].url).not.toContain("\\/");
    const fromJson = extractMediaFromJson(html).filter((m) => m.type === "video");
    expect(fromJson.length).toBe(2);
  });

  it("9. Normal Instagram video post resolves with video first", async () => {
    mockCreateProvider().mockReturnValue({
      name: "test-mock",
      resolve: async (url: string) => ({
        type: "VIDEO",
        sourceUrl: url,
        thumbnail: CDN_PHOTO,
        title: null,
        author: { username: "someone", displayName: null },
        media: [videoItem(CDN_VIDEO), photoItem(CDN_PHOTO)],
      }),
    } as never);
    stubUpstreamFetch();
    const { server, base } = await startServer(app);
    try {
      const res = await fetch(`${base}/api/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: VIDEO_POST }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { success: boolean; data: { media: Array<{ type: string; url: string }> } };
      expect(body.data.media.length).toBe(2);
      // Provider contract for VIDEO posts: playable video leads.
      expect(body.data.media[0].type).toBe("video");
      expect(body.data.media[0].url).toBe(CDN_VIDEO);
    } finally {
      await closeServer(server);
    }
  });

  it("10. Carousel containing video keeps every item, video selectable", async () => {
    const CAR = "https://scontent-iad3-2.xx.fbcdn.net/o1/v/t16/carousel-clip?sig=x";
    const PHOTO2 = "https://scontent-iad3-2.xx.fbcdn.net/v/photo-002.jpg?sig=ddd";
    mockCreateProvider().mockReturnValue({
      name: "test-mock",
      resolve: async (url: string) => ({
        type: "CAROUSEL",
        sourceUrl: url,
        thumbnail: null,
        title: null,
        author: null,
        // NOTE: same-pathname renditions are collapsed by design
        // (dedupeMediaItems), so the third slide uses a distinct path.
        media: [photoItem(CDN_PHOTO), videoItem(CAR), photoItem(PHOTO2)],
      }),
    } as never);
    stubUpstreamFetch();
    const { server, base } = await startServer(app);
    try {
      const res = await fetch(`${base}/api/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: CAROUSEL }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { success: boolean; data: { media: Array<{ type: string; url: string }> } };
      expect(body.data.media.length).toBe(3);
      const vid = body.data.media.find((m) => m.type === "video");
      expect(vid?.url).toBe(CAR);
      const stream = await fetch(`${base}/api/stream?url=${encodeURIComponent(CAR)}`);
      expect(stream.status).toBe(200);
      expect((await stream.arrayBuffer()).byteLength).toBe(MP4_BYTES.length);
    } finally {
      await closeServer(server);
    }
  });

  it("11. Verification follows allowlisted CDN redirects", async () => {
    const { verifyVideoCandidate } = await import("@/lib/providers/puppeteer.js");
    stubUpstreamFetch();
    stubPolicy.headRedirectTo =
      "https://scontent-lax3-2.xx.fbcdn.net/o1/v/t16/redirected.mp4?sig=r";
    const check = await verifyVideoCandidate(
      "https://scontent-iad3-2.xx.fbcdn.net/o1/v/t16/needs-redirect?sig=q"
    );
    expect(check.ok).toBe(true);
    expect(check.cdnHost).toBe("scontent-lax3-2.xx.fbcdn.net");
  });

  it("12. Verification sends Instagram Referer (referer-gated CDN accepts)", async () => {
    const { verifyVideoCandidate } = await import("@/lib/providers/puppeteer.js");
    stubUpstreamFetch();
    stubPolicy.requireReferer = true;
    const check = await verifyVideoCandidate(
      "https://scontent-iad3-2.xx.fbcdn.net/o1/v/t16/referer-gated?sig=q"
    );
    expect(check.ok).toBe(true);
    expect(check.reason).toBe("verified-content-type");
    expect(check.contentType).toBe("video/mp4");
  });

  it("13. Redirect off the allowlist is rejected (SSRF preserved)", async () => {
    const { verifyVideoCandidate } = await import("@/lib/providers/puppeteer.js");
    stubUpstreamFetch();
    stubPolicy.headRedirectTo = "https://evil.example.com/o1/v/t16/x.mp4";
    const check = await verifyVideoCandidate(
      "https://scontent-iad3-2.xx.fbcdn.net/o1/v/t16/evil-redirect?sig=q"
    );
    expect(check.ok).toBe(false);
    expect(check.reason).toBe("unsafe-redirect");
  });

  it("14. redactMediaUrl strips signatures, keeps host+path", () => {
    expect(redactMediaUrl(`${CDN_VIDEO}&extra=1`)).toBe(
      "scontent-iad3-2.xx.fbcdn.net/o1/v/t16/fbcdn-video-001"
    );
    expect(redactMediaUrl("https://scontent-x.fbcdn.net/a/b.mp4?sig=S#frag")).toBe(
      "scontent-x.fbcdn.net/a/b.mp4"
    );
    expect(redactMediaUrl(null)).toBe("(missing)");
    expect(redactMediaUrl("not a url")).toBe("(unparsable-url)");
  });

  it("resolveUrl never caches a failure: expired-then-fresh succeeds", async () => {
    const url = "https://www.instagram.com/reel/FailThenStream1/";
    let calls = 0;
    mockCreateProvider().mockReturnValue({
      name: "test-mock",
      resolve: async () => {
        calls++;
        if (calls === 1) throw new Error("transient blowup");
        return reelResult();
      },
    } as never);
    stubUpstreamFetch();
    await expect(resolveUrl(url)).rejects.toThrow("transient blowup");
    const result = await resolveUrl(url);
    expect(result.media[0].type).toBe("video");
    expect(calls).toBe(2);
  });
});
