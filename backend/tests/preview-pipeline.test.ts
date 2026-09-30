/**
 * Media preview/playback pipeline tests (task-focused, backend-only).
 *
 * Verifies the COMPLETE Reel preview path against the REAL route/pipe code
 * with a stubbed Instagram CDN upstream:
 *
 *  A. 200 upstream video (no Range -> 200 full body)
 *  B. 206 upstream video (Range -> 206 + matching Content-Range/Length)
 *  C. Range seek request returns exactly the requested window
 *  D. Missing Range -> 200 full body (never a 206)
 *  E. Invalid Content-Range (206 without Content-Range) is never forwarded:
 *     the backend recovers and answers a correct 206 for the browser's range
 *  F. Expired CDN URL (403) -> honest 410 MEDIA_URL_EXPIRED (retryable)
 *  G. 403 upstream maps to expired-media (covered with F, asserted payload)
 *  H. 404 upstream maps to expired-media
 *  I. Valid *.cdninstagram.com URL (full _nc_* signed shape) is allowed and
 *     its query params reach upstream byte-identical
 *  J. Extension-less valid CDN URL: video/mp4 AND application/octet-stream
 *     upstreams both reach <video> as video/mp4 with playable (ftyp) bytes
 *  K. Rejected localhost/private/blob:/data:/javascript: URLs (SSRF gate kept)
 *  L. POST /api/resolve with { refresh: true } bypasses the stale cache entry
 *     (a retry after an expired URL resolves freshly instead of reusing it)
 *  +. Unknown-total 200 upstream + Range -> full 200 (never malformed
 *     `bytes 0-/*`), empty upstream body -> 502 MEDIA_DOWNLOAD_FAILED (never
 *     the generic "currently unavailable"), WebP photo streams as image/webp,
 *     and an end-to-end resolve -> fresh CDN URL -> Range 206 -> ftyp bytes
 *     verification of the production-style flow.
 *
 * Byte patterns (not uniform fills) prove returned slices are exactly the
 * requested windows, starting with the real `ftyp` box <video> needs.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import type { Server } from "http";

vi.mock("@/lib/providers/index.js", () => ({
  createProvider: vi.fn(),
}));

import { createProvider } from "@/lib/providers/index.js";
import { resetResolver } from "@/lib/resolvers/index.js";
import app from "@/app";

const mockCreateProvider = () => vi.mocked(createProvider);

const TOTAL = 200 * 1024;
const MP4 = (() => {
  const b = Buffer.alloc(TOTAL);
  for (let i = 0; i < b.length; i++) b[i] = i % 251;
  b.write("ftyp", 4);
  b.write("isom", 8);
  return b;
})();

const WEBP = (() => {
  const b = Buffer.alloc(4096, 0x07);
  b.write("RIFF", 0);
  b.writeUInt32LE(4088, 4);
  b.write("WEBP", 8);
  return b;
})();

// Realistic signed Instagram CDN video URL shape (*.cdninstagram.com .mp4,
// full _nc_* / efg / oh / oe suite, no bytestart/byteend window).
const CDN_MP4 =
  "https://scontent-iad3-1.cdninstagram.com/v/t16/abc123XYZ.mp4" +
  "?_nc_cat=101&_nc_sid=abc123&_nc_ht=scontent-iad3-1.cdninstagram.com&_nc_ohc=xyz123" +
  "&efg=eyJ2IjoxfQ%3D%3D&ccb=11-4&oh=00a1b2c3&oe=6ABCDEF&_nc_vs=abc001";
// Extension-less video rendition (no .mp4 anywhere in the URL).
const CDN_EXTLESS =
  "https://scontent-ord5-2.xx.fbcdn.net/o1/v/t16/clipNoExtAbC12?sig=aaa111&oe=bbb222&_nc_cat=105&_nc_sid=def456";
const SOURCE = "https://www.instagram.com/reel/PreviewPipe001/";

type CdnMode =
  | "honor"
  | "octet"
  | "no-cr-206"
  | "expired403"
  | "expired404"
  | "html"
  | "empty"
  | "webp"
  | "no-length-200"
  | "ignore-range";

const stubPolicy = {
  mode: "honor" as CdnMode,
  lastUpstreamUrl: "",
  lastUpstreamRange: null as string | null,
};

function sliceResponse(start: number, end: number, contentType: string) {
  const slice = MP4.subarray(start, end + 1);
  return new Response(slice as unknown as BodyInit, {
    status: 206,
    headers: {
      "content-type": contentType,
      "content-range": `bytes ${start}-${end}/${TOTAL}`,
      "content-length": String(slice.length),
      "accept-ranges": "bytes",
    },
  });
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
    stubPolicy.lastUpstreamUrl = url;
    stubPolicy.lastUpstreamRange = headers.get("range");

    if (method === "HEAD") {
      return new Response(null, {
        status: 200,
        headers: { "content-type": "video/mp4", "content-length": String(TOTAL) },
      });
    }

    if (stubPolicy.mode === "expired403") {
      return new Response("blocked", { status: 403, headers: { "content-type": "text/plain" } });
    }
    if (stubPolicy.mode === "expired404") {
      return new Response("gone", { status: 404, headers: { "content-type": "text/plain" } });
    }
    if (stubPolicy.mode === "html") {
      return new Response("<html><body>login required</body></html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    }
    if (stubPolicy.mode === "empty") {
      return new Response(null, {
        status: 200,
        headers: { "content-type": "video/mp4", "content-length": "100" },
      });
    }
    if (stubPolicy.mode === "webp") {
      return new Response(WEBP as unknown as BodyInit, {
        status: 200,
        headers: { "content-type": "image/webp", "content-length": String(WEBP.length) },
      });
    }
    if (stubPolicy.mode === "no-length-200") {
      // Chunked-style upstream: 200 with NO content-length (stream body so
      // undici cannot synthesize one).
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(MP4 as unknown as Uint8Array);
          controller.close();
        },
      });
      return new Response(stream as unknown as BodyInit, {
        status: 200,
        headers: { "content-type": "video/mp4" },
      });
    }

    if (stubPolicy.mode === "ignore-range") {
      // Edge ignores Range entirely: always the full 200 object. The proxy
      // must slice the browser's window itself with exact headers/bytes.
      return new Response(MP4 as unknown as BodyInit, {
        status: 200,
        headers: {
          "content-type": "video/mp4",
          "content-length": String(TOTAL),
          "accept-ranges": "bytes",
        },
      });
    }

    const ct = stubPolicy.mode === "octet" ? "application/octet-stream" : "video/mp4";
    const range = headers.get("range");

    if (stubPolicy.mode === "no-cr-206" && range) {
      // Malformed upstream: 206 WITHOUT Content-Range. Must never be
      // forwarded as-is.
      const slice = MP4.subarray(0, 512);
      return new Response(slice as unknown as BodyInit, {
        status: 206,
        headers: { "content-type": ct, "content-length": String(slice.length) },
      });
    }

    if (range) {
      const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
      if (m) {
        const start = m[1] === "" ? 0 : parseInt(m[1], 10);
        const end = m[2] === "" ? TOTAL - 1 : Math.min(parseInt(m[2], 10), TOTAL - 1);
        if (start >= TOTAL) return new Response("unsatisfiable", { status: 416 });
        return sliceResponse(start, end, ct);
      }
    }
    return new Response(MP4 as unknown as BodyInit, {
      status: 200,
      headers: {
        "content-type": ct,
        "content-length": String(TOTAL),
        "accept-ranges": "bytes",
      },
    });
  });
  vi.stubGlobal("fetch", handler as never);
}

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

const streamUrl = (mediaUrl: string, extra = "") =>
  `/api/stream?url=${encodeURIComponent(mediaUrl)}&source=${encodeURIComponent(SOURCE)}${extra}`;

describe("media preview/playback pipeline", () => {
  beforeEach(() => {
    resetResolver();
    mockCreateProvider().mockReset();
    vi.unstubAllGlobals();
    stubPolicy.mode = "honor";
    stubPolicy.lastUpstreamUrl = "";
    stubPolicy.lastUpstreamRange = null;
    stubUpstreamFetch();
    delete process.env.RESOLVER_TIMEOUT_MS;
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("A. no Range -> 200 full video with length (cdninstagram.com host)", async () => {
    const { server, base } = await startServer(app);
    try {
      const res = await fetch(`${base}${streamUrl(CDN_MP4)}`);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("video/mp4");
      expect(res.headers.get("accept-ranges")).toBe("bytes");
      expect(res.headers.get("content-length")).toBe(String(TOTAL));
      const bytes = Buffer.from(await res.arrayBuffer());
      expect(bytes.length).toBe(TOTAL);
      expect(bytes.subarray(4, 8).toString()).toBe("ftyp");
    } finally {
      await closeServer(server);
    }
  });

  it("B. Range bytes=0-1023 -> 206 with exact Content-Range/Length and ftyp head", async () => {
    const { server, base } = await startServer(app);
    try {
      const res = await fetch(`${base}${streamUrl(CDN_MP4)}`, {
        headers: { Range: "bytes=0-1023" },
      });
      expect(res.status).toBe(206);
      expect(res.headers.get("content-type")).toBe("video/mp4");
      expect(res.headers.get("accept-ranges")).toBe("bytes");
      expect(res.headers.get("content-range")).toBe(`bytes 0-1023/${TOTAL}`);
      expect(res.headers.get("content-length")).toBe("1024");
      const bytes = Buffer.from(await res.arrayBuffer());
      expect(bytes.length).toBe(1024);
      expect(bytes.equals(MP4.subarray(0, 1024))).toBe(true);
      expect(bytes.subarray(4, 8).toString()).toBe("ftyp");
    } finally {
      await closeServer(server);
    }
  });

  it("C. seek range returns exactly the requested window", async () => {
    const { server, base } = await startServer(app);
    try {
      const res = await fetch(`${base}${streamUrl(CDN_MP4)}`, {
        headers: { Range: "bytes=100000-101023" },
      });
      expect(res.status).toBe(206);
      expect(res.headers.get("content-range")).toBe(`bytes 100000-101023/${TOTAL}`);
      expect(res.headers.get("content-length")).toBe("1024");
      const bytes = Buffer.from(await res.arrayBuffer());
      expect(bytes.equals(MP4.subarray(100000, 101024))).toBe(true);
    } finally {
      await closeServer(server);
    }
  });

  it("D. missing Range is never answered as 206", async () => {
    const { server, base } = await startServer(app);
    try {
      const res = await fetch(`${base}${streamUrl(CDN_MP4)}`);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-range")).toBeNull();
    } finally {
      await closeServer(server);
    }
  });

  it("E. 206 without Content-Range is never forwarded: recovered to a correct 206", async () => {
    stubPolicy.mode = "no-cr-206";
    const { server, base } = await startServer(app);
    try {
      const res = await fetch(`${base}${streamUrl(CDN_MP4)}`, {
        headers: { Range: "bytes=0-1023" },
      });
      expect(res.status).toBe(206);
      expect(res.headers.get("content-range")).toBe(`bytes 0-1023/${TOTAL}`);
      expect(res.headers.get("content-length")).toBe("1024");
      const bytes = Buffer.from(await res.arrayBuffer());
      expect(bytes.equals(MP4.subarray(0, 1024))).toBe(true);
      expect(bytes.subarray(4, 8).toString()).toBe("ftyp");
    } finally {
      await closeServer(server);
    }
  });

  it("F+G. expired CDN URL (403) -> honest 410 MEDIA_URL_EXPIRED, retryable", async () => {
    stubPolicy.mode = "expired403";
    const { server, base } = await startServer(app);
    try {
      const res = await fetch(`${base}${streamUrl(CDN_MP4)}`);
      expect(res.status).toBe(410);
      const body = (await res.json()) as {
        success: boolean;
        error: { code: string; retryable: boolean };
      };
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("MEDIA_URL_EXPIRED");
      expect(body.error.retryable).toBe(true);
    } finally {
      await closeServer(server);
    }
  });

  it("H. 404 upstream -> 410 MEDIA_URL_EXPIRED (never generic 404 text)", async () => {
    stubPolicy.mode = "expired404";
    const { server, base } = await startServer(app);
    try {
      const res = await fetch(`${base}${streamUrl(CDN_MP4)}`);
      expect(res.status).toBe(410);
      const body = (await res.json()) as { success: boolean; error: { code: string } };
      expect(body.error.code).toBe("MEDIA_URL_EXPIRED");
    } finally {
      await closeServer(server);
    }
  });

  it("I. cdninstagram.com URL allowed; signed query reaches upstream byte-identical; source page never fetched as media", async () => {
    const { server, base } = await startServer(app);
    try {
      const res = await fetch(`${base}${streamUrl(CDN_MP4)}`, {
        headers: { Range: "bytes=0-1023" },
      });
      expect(res.status).toBe(206);
      const upstream = new URL(stubPolicy.lastUpstreamUrl);
      expect(upstream.hostname).toBe("scontent-iad3-1.cdninstagram.com");
      const original = new URL(CDN_MP4);
      for (const key of ["_nc_cat", "_nc_sid", "_nc_ht", "_nc_ohc", "efg", "ccb", "oh", "oe", "_nc_vs"]) {
        expect(upstream.searchParams.get(key)).toBe(original.searchParams.get(key));
      }
      // The `source` (Instagram Reel page) is context only: the media fetch
      // went to the exact CDN host/path, never to the www.instagram.com page.
      expect(upstream.hostname).not.toBe("www.instagram.com");
      expect(upstream.pathname).toBe(new URL(CDN_MP4).pathname);
      expect(stubPolicy.lastUpstreamRange).toBe("bytes=0-1023");
    } finally {
      await closeServer(server);
    }
  });

  it("J. extension-less CDN URL + octet-stream upstream still reaches <video> as playable video/mp4", async () => {
    stubPolicy.mode = "octet";
    const { server, base } = await startServer(app);
    try {
      expect(CDN_EXTLESS).not.toContain(".mp4");
      const ranged = await fetch(`${base}${streamUrl(CDN_EXTLESS)}`, {
        headers: { Range: "bytes=0-1023" },
      });
      expect(ranged.status).toBe(206);
      expect(ranged.headers.get("content-type")).toBe("video/mp4");
      expect(ranged.headers.get("content-range")).toBe(`bytes 0-1023/${TOTAL}`);
      const head = Buffer.from(await ranged.arrayBuffer());
      expect(head.length).toBe(1024);
      expect(head.subarray(4, 8).toString()).toBe("ftyp");

      const full = await fetch(`${base}${streamUrl(CDN_EXTLESS)}`);
      expect(full.status).toBe(200);
      expect(full.headers.get("content-type")).toBe("video/mp4");
      const bytes = Buffer.from(await full.arrayBuffer());
      expect(bytes.length).toBe(TOTAL);
      expect(bytes.subarray(4, 8).toString()).toBe("ftyp");
    } finally {
      await closeServer(server);
    }
  });

  it("J2. extension-less CDN URL + video/mp4 upstream stays video/mp4", async () => {
    const { server, base } = await startServer(app);
    try {
      const res = await fetch(`${base}${streamUrl(CDN_EXTLESS)}`, {
        headers: { Range: "bytes=0-1023" },
      });
      expect(res.status).toBe(206);
      expect(res.headers.get("content-type")).toBe("video/mp4");
    } finally {
      await closeServer(server);
    }
  });

  it("K. untrusted URLs rejected: localhost/private/blob:/data:/javascript:/evil host", async () => {
    const { server, base } = await startServer(app);
    try {
      const cases: Array<[string, number]> = [
        ["http://127.0.0.1/video.mp4", 400],
        ["https://localhost/video.mp4", 403],
        ["https://10.0.0.1/video.mp4", 403],
        ["https://192.168.1.10/video.mp4", 403],
        ["blob:https://example.com/abc", 400],
        ["data:video/mp4;base64,AAAA", 400],
        ["javascript:alert(1)", 400],
        ["https://evil.example.com/x.mp4", 403],
        ["http://scontent-iad3-1.cdninstagram.com/v/x.mp4", 400],
      ];
      for (const [raw, status] of cases) {
        const res = await fetch(`${base}/api/stream?url=${encodeURIComponent(raw)}`);
        expect(res.status).toBe(status);
      }
      const missing = await fetch(`${base}/api/stream`);
      expect(missing.status).toBe(400);
    } finally {
      await closeServer(server);
    }
  });

  it("L. POST { refresh: true } bypasses the stale cache entry (retry resolves freshly)", async () => {
    const URL = "https://www.instagram.com/reel/RefreshBypass001/";
    const STALE = "https://scontent-iad3-2.xx.fbcdn.net/o1/v/t16/stale-clip?sig=old";
    const FRESH = "https://scontent-iad3-2.xx.fbcdn.net/o1/v/t16/fresh-clip?sig=new";
    const item = (url: string) => ({
      url,
      type: "video" as const,
      width: 1080,
      height: 1920,
      duration: 12,
      size: TOTAL,
      thumbnail: null,
      format: "mp4",
    });
    let providerCalls = 0;
    mockCreateProvider().mockReturnValue({
      name: "test-mock",
      resolve: async (resolvedUrl: string) => {
        providerCalls++;
        return {
          type: "REEL",
          sourceUrl: resolvedUrl,
          thumbnail: null,
          title: null,
          author: null,
          media: [item(providerCalls === 1 ? STALE : FRESH)],
        };
      },
    } as never);
    const { server, base } = await startServer(app);
    try {
      const post = (refresh?: boolean) =>
        fetch(`${base}/api/resolve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(refresh ? { url: URL, refresh: true } : { url: URL }),
        });
      const first = await post();
      expect(first.status).toBe(200);
      const firstBody = (await first.json()) as { success: boolean; data: { media: Array<{ url: string }> } };
      expect(firstBody.data.media[0].url).toBe(STALE);

      // Plain repeat is served from cache (no new provider work)...
      const cached = await post();
      expect(cached.status).toBe(200);
      expect(providerCalls).toBe(1);

      // ...while the stale-recovery retry resolves freshly exactly once.
      const refreshed = await post(true);
      expect(refreshed.status).toBe(200);
      const refreshedBody = (await refreshed.json()) as {
        success: boolean;
        data: { media: Array<{ url: string }> };
      };
      expect(refreshedBody.data.media[0].url).toBe(FRESH);
      expect(providerCalls).toBe(2);
    } finally {
      await closeServer(server);
    }
  });

  it("range-ignoring upstream -> proxy slices exact 206 windows (incl. tiny Safari-style probe)", async () => {
    stubPolicy.mode = "ignore-range";
    const { server, base } = await startServer(app);
    try {
      const window = await fetch(`${base}${streamUrl(CDN_MP4)}`, {
        headers: { Range: "bytes=0-1023" },
      });
      expect(window.status).toBe(206);
      expect(window.headers.get("content-type")).toBe("video/mp4");
      expect(window.headers.get("content-range")).toBe(`bytes 0-1023/${TOTAL}`);
      expect(window.headers.get("content-length")).toBe("1024");
      const windowBytes = Buffer.from(await window.arrayBuffer());
      expect(windowBytes.length).toBe(1024);
      expect(windowBytes.equals(MP4.subarray(0, 1024))).toBe(true);

      const probe = await fetch(`${base}${streamUrl(CDN_MP4)}`, {
        headers: { Range: "bytes=0-1" },
      });
      expect(probe.status).toBe(206);
      expect(probe.headers.get("content-range")).toBe(`bytes 0-1/${TOTAL}`);
      expect(probe.headers.get("content-length")).toBe("2");
      expect(Buffer.from(await probe.arrayBuffer()).length).toBe(2);

      const seek = await fetch(`${base}${streamUrl(CDN_MP4)}`, {
        headers: { Range: "bytes=100000-101023" },
      });
      expect(seek.status).toBe(206);
      expect(seek.headers.get("content-range")).toBe(`bytes 100000-101023/${TOTAL}`);
      expect(Buffer.from(await seek.arrayBuffer()).equals(MP4.subarray(100000, 101024))).toBe(true);
    } finally {
      await closeServer(server);
    }
  });

  it("unknown-total 200 upstream + Range -> full 200 (never malformed bytes 0-/*)", async () => {
    stubPolicy.mode = "no-length-200";
    const { server, base } = await startServer(app);
    try {
      const res = await fetch(`${base}${streamUrl(CDN_MP4)}`, {
        headers: { Range: "bytes=0-1023" },
      });
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("video/mp4");
      expect(res.headers.get("content-range")).toBeNull();
      const bytes = Buffer.from(await res.arrayBuffer());
      expect(bytes.length).toBe(TOTAL);
      expect(bytes.subarray(4, 8).toString()).toBe("ftyp");
    } finally {
      await closeServer(server);
    }
  });

  it("empty upstream body -> 502 MEDIA_DOWNLOAD_FAILED (not generic unavailable)", async () => {
    stubPolicy.mode = "empty";
    const { server, base } = await startServer(app);
    try {
      const res = await fetch(`${base}${streamUrl(CDN_MP4)}`);
      expect(res.status).toBe(502);
      const body = (await res.json()) as { success: boolean; error: { code: string } };
      expect(body.error.code).toBe("MEDIA_DOWNLOAD_FAILED");
    } finally {
      await closeServer(server);
    }
  });

  it("HTML masquerading as video -> 410 MEDIA_URL_EXPIRED, never forwarded bytes", async () => {
    stubPolicy.mode = "html";
    const { server, base } = await startServer(app);
    try {
      const res = await fetch(`${base}${streamUrl(CDN_MP4)}`, {
        headers: { Range: "bytes=0-1023" },
      });
      expect(res.status).toBe(410);
      const body = (await res.json()) as { success: boolean; error: { code: string } };
      expect(body.error.code).toBe("MEDIA_URL_EXPIRED");
    } finally {
      await closeServer(server);
    }
  });

  it("WebP photo streams as image/webp (validation accepts real image bytes)", async () => {
    stubPolicy.mode = "webp";
    const photo = "https://scontent-ord5-2.xx.fbcdn.net/v/photo-webp-001?sig=p";
    const { server, base } = await startServer(app);
    try {
      const res = await fetch(`${base}${streamUrl(photo)}`);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("image/webp");
      const bytes = Buffer.from(await res.arrayBuffer());
      expect(bytes.length).toBe(WEBP.length);
      expect(bytes.subarray(0, 4).toString()).toBe("RIFF");
    } finally {
      await closeServer(server);
    }
  });

  it("end-to-end: resolve -> fresh CDN URL -> Range 206 -> playable ftyp bytes", async () => {
    const URL = "https://www.instagram.com/reel/E2EPreview001/";
    mockCreateProvider().mockReturnValue({
      name: "test-mock",
      resolve: async (resolvedUrl: string) => ({
        type: "REEL",
        sourceUrl: resolvedUrl,
        thumbnail: null,
        title: null,
        author: { username: "someone", displayName: null },
        media: [
          {
            url: CDN_MP4,
            type: "video" as const,
            width: null,
            height: null,
            duration: null,
            size: TOTAL,
            thumbnail: null,
            format: "mp4",
          },
        ],
      }),
    } as never);
    const { server, base } = await startServer(app);
    try {
      // 1. Resolve the Reel (metadata may legitimately miss width/duration).
      const resolved = await fetch(`${base}/api/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: URL }),
      });
      expect(resolved.status).toBe(200);
      const resolvedBody = (await resolved.json()) as {
        success: boolean;
        data: { media: Array<{ url: string; type: string }>; sourceUrl: string };
      };
      expect(resolvedBody.success).toBe(true);
      const mediaUrl = resolvedBody.data.media[0].url;
      expect(mediaUrl).toBe(CDN_MP4);

      // 2. Preview the FRESH media URL through /api/stream with a browser
      // Range request, exactly like <video preload="metadata"> does.
      const preview = await fetch(
        `${base}/api/stream?url=${encodeURIComponent(mediaUrl)}&source=${encodeURIComponent(
          resolvedBody.data.sourceUrl
        )}`,
        { headers: { Range: "bytes=0-1023" } }
      );
      expect(preview.status).toBe(206);
      expect(preview.headers.get("content-type")).toBe("video/mp4");
      expect(preview.headers.get("accept-ranges")).toBe("bytes");
      expect(preview.headers.get("content-range")).toBe(`bytes 0-1023/${TOTAL}`);
      expect(preview.headers.get("content-length")).toBe("1024");

      // 3. The bytes are really the MP4 head (ftyp), not an error page slice.
      const bytes = Buffer.from(await preview.arrayBuffer());
      expect(bytes.length).toBe(1024);
      expect(bytes.equals(MP4.subarray(0, 1024))).toBe(true);
      expect(bytes.subarray(4, 8).toString()).toBe("ftyp");
    } finally {
      await closeServer(server);
    }
  });
});
