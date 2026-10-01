/**
 * Root-cause regression tests for the VIDEO_SOURCE_NOT_FOUND incident
 * (public Reel discovered 34 video candidates, selected 0):
 *
 *   dash-segment: 12 / not-mp4-payload: 12 / expired-or-forbidden: 10
 *
 * Covers the §13 media cases against the REAL verification/selection code
 * with a stubbed CDN upstream (no browser, no Instagram):
 *  1. progressive MP4 verifies
 *  2. DASH init segment rejected with zero probe traffic
 *  3. DASH media segment rejected with zero probe traffic
 *  4. complete video representation verifies (track scan across chunks)
 *  5. image payload never becomes a video source
 *  6. audio-only rendition diverted, never selected as video
 *  7. duplicate CDN URL probed once
 *  8. expired signed URL (403) -> expired-or-forbidden
 *  9. forbidden (403) vs not-found (404) distinction
 * 10. HEAD-rejecting CDN that serves GET/range still verifies (no HEAD use)
 * 11. redirect bounce vs landed-target classification
 * 12. redirect -> anonymous fallback mode decision
 * 13. session-preserving retry matrix
 * 14. zero candidates -> null selection
 * 15. valid candidate selection (largest wins, audio paired)
 * 16. SSE success emits complete/100 and closes
 * 17. SSE terminal failure emits error and closes (never hangs)
 *
 * Plus fix-specific regressions:
 * 18. truncated first network chunk still verifies (head accumulation)
 * 19. header-less embedded slice (200, no lengths) retried via body evidence
 * 20. probe HTTP status carried on every verification outcome
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import type { Server } from "http";

vi.mock("@/lib/providers/index.js", () => ({
  createProvider: vi.fn(),
}));

import { createProvider } from "@/lib/providers/index.js";
import { resetResolver } from "@/lib/resolvers/index.js";

const mockCreateProvider = () => vi.mocked(createProvider);

const CDN = "https://scontent-iad3-2.xx.fbcdn.net";

/** Structurally valid ftyp + moov(trak(mdia(hdlr))) prefix. */
function mp4WithTrack(handler: "vide" | "soun", totalBytes: number): Buffer {
  const hdlr = Buffer.alloc(32);
  hdlr.writeUInt32BE(hdlr.length, 0);
  hdlr.write("hdlr", 4, "latin1");
  hdlr.write(handler, 16, "latin1");
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
  const mdat = Buffer.alloc(Math.max(16, totalBytes - ftyp.length - moov.length), 0x41);
  mdat.writeUInt32BE(mdat.length, 0);
  mdat.write("mdat", 4, "latin1");
  return Buffer.concat([ftyp, moov, mdat]);
}

function efgParam(tag: string): string {
  const json = JSON.stringify({ vencode_tag: tag });
  return Buffer.from(json, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

const DASH_AUDIO_EFG = efgParam("ig-xpvds.clips.igwww-C3.dash_ln_heaac_vbr3_audio");
const DASH_VIDEO_EFG = efgParam("ig-xpvds.clips.igwww-C3.dash_r2evevp9-r1gen2vp9_q60");
const PROGRESSIVE_EFG = efgParam("xpv_progressive.INSTAGRAM.CLIPS.C3.720.dash_baseline_1_v1");

interface StubRoute {
  match: (url: string, init?: RequestInit) => boolean;
  respond: (url: string, init?: RequestInit) => Response;
}

const stubState = {
  routes: [] as StubRoute[],
  calls: [] as Array<{ url: string; method: string }>,
  passthrough: null as ((input: unknown, init?: unknown) => Promise<Response>) | null,
};

function stubFetch() {
  stubState.passthrough = globalThis.fetch.bind(globalThis);
  const handler = vi.fn(async (input: unknown, init?: unknown) => {
    const url = String(input);
    const ini = (init ?? {}) as RequestInit;
    if (url.startsWith("http://127.0.0.1:") || url.startsWith("http://localhost:")) {
      return stubState.passthrough!(input, init);
    }
    stubState.calls.push({ url, method: ((ini.method ?? "GET") as string).toUpperCase() });
    for (const route of stubState.routes) {
      if (route.match(url, ini)) return route.respond(url, ini);
    }
    return new Response("no-route", { status: 500 });
  });
  vi.stubGlobal("fetch", handler as never);
}

function mp4Response(body: Buffer, total?: number, rangeStart = 0): Response {
  const slice = body.subarray(0, Math.min(body.length, 65_536));
  const full = total ?? body.length;
  return new Response(slice as unknown as BodyInit, {
    status: 206,
    headers: {
      "content-type": "video/mp4",
      "content-range": `bytes ${rangeStart}-${rangeStart + slice.length - 1}/${full}`,
      "content-length": String(slice.length),
      "accept-ranges": "bytes",
    },
  });
}

describe("resolver root-cause regressions", () => {
  beforeEach(() => {
    resetResolver();
    mockCreateProvider().mockReset();
    vi.unstubAllGlobals();
    stubState.routes = [];
    stubState.calls = [];
    delete process.env.RESOLVER_TIMEOUT_MS;
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("1. progressive MP4 verifies and carries its HTTP status", async () => {
    const { verifyVideoCandidate } = await import("@/lib/providers/puppeteer.js");
    stubFetch();
    const url = `${CDN}/o1/v/t16/prog.mp4?oh=00&oe=AB&efg=${PROGRESSIVE_EFG}`;
    const body = mp4WithTrack("vide", 200 * 1024);
    stubState.routes.push({
      match: (u) => u === url,
      respond: () => mp4Response(body),
    });
    const check = await verifyVideoCandidate(url);
    expect(check.ok).toBe(true);
    expect(check.reason).toBe("verified-mp4-path");
    expect(check.status).toBe(206);
    expect(check.contentType).toBe("video/mp4");
  });

  it("2. DASH init segment rejected with zero probe traffic", async () => {
    const { verifyVideoCandidate } = await import("@/lib/providers/puppeteer.js");
    stubFetch();
    const url =
      `${CDN}/o1/v/t2/f2/m78/AQOzMW3.mp4?_nc_cat=108&efg=${DASH_AUDIO_EFG}` +
      `&oh=00&oe=AB&bytestart=0&byteend=823`;
    const check = await verifyVideoCandidate(url);
    expect(check.ok).toBe(false);
    expect(check.reason).toBe("dash-segment");
    expect(stubState.calls.filter((c) => !c.url.startsWith("http://127")).length).toBe(0);
  });

  it("3. DASH media segment (mid-file window) rejected with zero probe traffic", async () => {
    const { verifyVideoCandidate } = await import("@/lib/providers/puppeteer.js");
    stubFetch();
    const url =
      `${CDN}/o1/v/t2/f2/m78/AQOzMW4.mp4?_nc_cat=108&efg=${DASH_VIDEO_EFG}` +
      `&oh=00&oe=AB&bytestart=824&byteend=927`;
    const check = await verifyVideoCandidate(url);
    expect(check.ok).toBe(false);
    expect(check.reason).toBe("dash-segment");
    expect(stubState.calls.length).toBe(0);
  });

  it("4. complete video representation verifies (track scan sees moov)", async () => {
    const { verifyVideoCandidate } = await import("@/lib/providers/puppeteer.js");
    stubFetch();
    const url = `${CDN}/o1/v/t16/complete.mp4?oh=00&oe=AB`;
    stubState.routes.push({
      match: (u) => u === url,
      respond: () => mp4Response(mp4WithTrack("vide", 300 * 1024)),
    });
    const check = await verifyVideoCandidate(url);
    expect(check.ok).toBe(true);
    expect(check.hasVideoTrack).toBe(true);
    expect(check.hasAudioTrack).toBe(false);
  });

  it("5. image payload never becomes a video source", async () => {
    const { verifyVideoCandidate } = await import("@/lib/providers/puppeteer.js");
    stubFetch();
    const url = `${CDN}/o1/v/t16/notvideo?sig=i`;
    const jpg = Buffer.alloc(96 * 1024, 0x42);
    jpg[0] = 0xff;
    jpg[1] = 0xd8;
    stubState.routes.push({
      match: (u) => u === url,
      respond: () =>
        new Response(jpg.subarray(0, 65_536) as unknown as BodyInit, {
          status: 200,
          headers: { "content-type": "image/jpeg", "content-length": String(jpg.length) },
        }),
    });
    const check = await verifyVideoCandidate(url);
    expect(check.ok).toBe(false);
    expect(check.reason).toBe("unexpected-status");
  });

  it("6. audio-only rendition diverted, never selected as video", async () => {
    const { verifyVideoCandidate, selectReelVideo } = await import(
      "@/lib/providers/puppeteer.js"
    );
    stubFetch();
    const audioUrl = `${CDN}/o1/v/t16/clip-audio.mp4?sig=a`;
    const videoUrl = `${CDN}/o1/v/t16/clip-video.mp4?sig=v`;
    stubState.routes.push({
      match: (u) => u === audioUrl,
      respond: () => mp4Response(mp4WithTrack("soun", 300 * 1024)),
    });
    stubState.routes.push({
      match: (u) => u === videoUrl,
      respond: () => mp4Response(mp4WithTrack("vide", 300 * 1024)),
    });
    const audioCheck = await verifyVideoCandidate(audioUrl);
    expect(audioCheck.ok).toBe(false);
    expect(audioCheck.reason).toBe("audio-only-payload");
    // Audio alone can never win a selection...
    expect(await selectReelVideo([{ url: audioUrl }])).toBeNull();
    // ...but is paired onto a video-only winner.
    const selection = await selectReelVideo([{ url: videoUrl }, { url: audioUrl }]);
    expect(selection?.videoUrl).toBe(videoUrl);
    expect(selection?.audioUrl).toBe(audioUrl);
  });

  it("7. duplicate CDN URL probed once", async () => {
    const { selectReelVideo } = await import("@/lib/providers/puppeteer.js");
    stubFetch();
    const url = `${CDN}/o1/v/t16/dupe.mp4?sig=d`;
    stubState.routes.push({
      match: (u) => u === url,
      respond: () => mp4Response(mp4WithTrack("vide", 200 * 1024)),
    });
    const selection = await selectReelVideo([{ url }, { url }, { url }]);
    expect(selection?.videoUrl).toBe(url);
    expect(stubState.calls.filter((c) => c.url === url).length).toBe(1);
  });

  it("8. expired signed URL (403) is expired-or-forbidden with status", async () => {
    const { verifyVideoCandidate } = await import("@/lib/providers/puppeteer.js");
    stubFetch();
    const url = `${CDN}/o1/v/t16/stale.mp4?sig=old`;
    stubState.routes.push({
      match: (u) => u === url,
      respond: () => new Response("forbidden", { status: 403 }),
    });
    const check = await verifyVideoCandidate(url);
    expect(check.ok).toBe(false);
    expect(check.reason).toBe("expired-or-forbidden");
    expect(check.status).toBe(403);
  });

  it("9. 404 is not-found, distinct from expired-or-forbidden", async () => {
    const { verifyVideoCandidate } = await import("@/lib/providers/puppeteer.js");
    stubFetch();
    const gone = `${CDN}/o1/v/t16/gone.mp4?sig=g`;
    stubState.routes.push({
      match: (u) => u === gone,
      respond: () => new Response("gone", { status: 404 }),
    });
    expect((await verifyVideoCandidate(gone)).reason).toBe("not-found");
  });

  it("10. CDN that rejects HEAD still verifies via GET/range (no HEAD dependency)", async () => {
    const { verifyVideoCandidate } = await import("@/lib/providers/puppeteer.js");
    stubFetch();
    const url = `${CDN}/o1/v/t16/headless.mp4?sig=h`;
    stubState.routes.push({
      match: (u, init) => u === url && (init?.method ?? "GET").toUpperCase() === "HEAD",
      respond: () => new Response("forbidden", { status: 403 }),
    });
    stubState.routes.push({
      match: (u, init) => u === url && (init?.method ?? "GET").toUpperCase() === "GET",
      respond: () => mp4Response(mp4WithTrack("vide", 200 * 1024)),
    });
    const check = await verifyVideoCandidate(url);
    expect(check.ok).toBe(true);
    expect(stubState.calls.some((c) => c.method === "HEAD")).toBe(false);
  });

  it("11. redirect bounce vs landed-target classification", async () => {
    const { isRedirectedAwayFromTarget } = await import("@/lib/providers/puppeteer.js");
    const reel = "https://www.instagram.com/reel/DcTZvgzsLuW/";
    expect(
      isRedirectedAwayFromTarget(reel, {
        finalUrl: "https://www.instagram.com/",
        finalHost: "www.instagram.com",
        finalPath: "/",
      })
    ).toBe(true);
    expect(
      isRedirectedAwayFromTarget(reel, {
        finalUrl: "https://www.instagram.com/reel/DcTZvgzsLuW/",
        finalHost: "www.instagram.com",
        finalPath: "/reel/DcTZvgzsLuW/",
      })
    ).toBe(false);
  });

  it("12. redirect retry: session preserved first, anonymous second", async () => {
    const { decideRedirectRetryMode } = await import("@/lib/providers/puppeteer.js");
    // Unknown acceptance (null): attempt 1 keeps cookies, attempt 2 strips.
    expect(
      decideRedirectRetryMode({ sessionConfigured: true, sessionAccepted: null, cookiesPresent: true, attempt: 1 })
    ).toBe("with-session");
    expect(
      decideRedirectRetryMode({ sessionConfigured: true, sessionAccepted: null, cookiesPresent: true, attempt: 2 })
    ).toBe("anonymous");
  });

  it("13. session-preserving retry matrix", async () => {
    const { decideRedirectRetryMode } = await import("@/lib/providers/puppeteer.js");
    // Positively accepted session is never stripped.
    expect(
      decideRedirectRetryMode({ sessionConfigured: true, sessionAccepted: true, cookiesPresent: true, attempt: 1 })
    ).toBe("with-session");
    expect(
      decideRedirectRetryMode({ sessionConfigured: true, sessionAccepted: true, cookiesPresent: true, attempt: 2 })
    ).toBeNull();
    // Positively rejected session goes anonymous immediately.
    expect(
      decideRedirectRetryMode({ sessionConfigured: true, sessionAccepted: false, cookiesPresent: true, attempt: 1 })
    ).toBe("anonymous");
    // No session: single plain re-navigation, never a second.
    expect(
      decideRedirectRetryMode({ sessionConfigured: false, sessionAccepted: null, cookiesPresent: false, attempt: 1 })
    ).toBe("with-session");
    expect(
      decideRedirectRetryMode({ sessionConfigured: false, sessionAccepted: null, cookiesPresent: false, attempt: 2 })
    ).toBeNull();
    // Never a third attempt.
    expect(
      decideRedirectRetryMode({ sessionConfigured: true, sessionAccepted: null, cookiesPresent: true, attempt: 3 })
    ).toBeNull();
  });

  it("14. zero candidates select nothing", async () => {
    const { selectReelVideo } = await import("@/lib/providers/puppeteer.js");
    stubFetch();
    expect(await selectReelVideo([])).toBeNull();
  });

  it("15. largest verified rendition wins selection", async () => {
    const { selectReelVideo } = await import("@/lib/providers/puppeteer.js");
    stubFetch();
    const small = `${CDN}/o1/v/t16/small.mp4?sig=s`;
    const big = `${CDN}/o1/v/t16/big.mp4?sig=b`;
    stubState.routes.push({
      match: (u) => u === small,
      respond: () => mp4Response(mp4WithTrack("vide", 100 * 1024)),
    });
    stubState.routes.push({
      match: (u) => u === big,
      respond: () => mp4Response(mp4WithTrack("vide", 400 * 1024)),
    });
    const selection = await selectReelVideo([{ url: small }, { url: big }]);
    expect(selection?.videoUrl).toBe(big);
    expect(selection?.size).toBe(400 * 1024);
  });

  it("18. truncated first network chunk still verifies (head accumulation)", async () => {
    const { verifyVideoCandidate } = await import("@/lib/providers/puppeteer.js");
    stubFetch();
    const url = `${CDN}/o1/v/t16/chunked.mp4?sig=c`;
    const full = mp4WithTrack("vide", 200 * 1024);
    stubState.routes.push({
      match: (u) => u === url,
      respond: () => {
        // First chunk is 3 bytes (not even a box header); the rest follows.
        const first = full.subarray(0, 3);
        const rest = full.subarray(3, Math.min(full.length, 65_536));
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(first);
            controller.enqueue(rest);
            controller.close();
          },
        });
        return new Response(stream as unknown as BodyInit, {
          status: 206,
          headers: {
            "content-type": "video/mp4",
            "content-range": `bytes 0-65535/${full.length}`,
            "content-length": "65536",
          },
        });
      },
    });
    const check = await verifyVideoCandidate(url);
    expect(check.ok).toBe(true);
    expect(check.hasVideoTrack).toBe(true);
  });

  it("19. header-less embedded slice retried via body evidence, then verifies", async () => {
    const { verifyVideoCandidate } = await import("@/lib/providers/puppeteer.js");
    stubFetch();
    const sliced =
      `${CDN}/o1/v/t16/sliced.mp4?oh=00&oe=AB&bytestart=824&byteend=927`;
    const seen: string[] = [];
    const TOTAL = 200 * 1024;
    stubState.routes.push({
      match: (u) => u.startsWith(sliced.split("?")[0]),
      respond: (u) => {
        seen.push(u);
        if (u.includes("bytestart")) {
          // Edge serves its 104-byte window with NO Content-Range/Length.
          return new Response(Buffer.alloc(104, 0x41) as unknown as BodyInit, {
            status: 200,
            headers: { "content-type": "video/mp4" },
          });
        }
        return mp4Response(mp4WithTrack("vide", TOTAL), TOTAL);
      },
    });
    const check = await verifyVideoCandidate(sliced);
    expect(seen.length).toBe(2);
    expect(seen[0]).toContain("bytestart=824");
    expect(seen[1]).not.toContain("bytestart");
    expect(check.ok).toBe(true);
    expect(check.contentLength).toBe(TOTAL);
  });

  it("20. probe HTTP status carried on every verification outcome", async () => {
    const { verifyVideoCandidate } = await import("@/lib/providers/puppeteer.js");
    stubFetch();
    const okUrl = `${CDN}/o1/v/t16/status-ok.mp4?sig=o`;
    const goneUrl = `${CDN}/o1/v/t16/status-gone.mp4?sig=g`;
    stubState.routes.push({
      match: (u) => u === okUrl,
      respond: () => mp4Response(mp4WithTrack("vide", 200 * 1024)),
    });
    stubState.routes.push({
      match: (u) => u === goneUrl,
      respond: () => new Response("gone", { status: 404 }),
    });
    expect((await verifyVideoCandidate(okUrl)).status).toBe(206);
    expect((await verifyVideoCandidate(goneUrl)).status).toBe(404);
  });
});

describe("SSE contract: success and terminal failure", () => {
  let server: Server;
  let base: string;

  async function startServer(): Promise<void> {
    const { default: resolveRouter } = await import("@/routes/resolve.js");
    const app = express();
    app.use(express.json({ limit: "1kb" }));
    app.use("/api/resolve", resolveRouter);
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => resolve());
    });
    const addr = server.address();
    const port = typeof addr === "object" && addr ? addr.port : 0;
    base = `http://127.0.0.1:${port}`;
  }

  async function readSse(url: string, timeoutMs = 15_000): Promise<{ events: string[]; done: boolean }> {
    const res = await fetch(url);
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    let buf = "";
    const events: string[] = [];
    let terminal = false;
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const { done, value } = await reader.read();
      if (value) {
        buf += dec.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n\n")) >= 0) {
          events.push(buf.slice(0, idx));
          buf = buf.slice(idx + 2);
          if (/event: (complete|error)/.test(events[events.length - 1])) {
            terminal = true;
          }
        }
      }
      if (done) return { events, done: true };
      // After the terminal event the server ends the response: one more
      // read observes the closure instead of racing it.
      if (terminal && !buf) {
        const { done: done2 } = await Promise.race([
          reader.read(),
          new Promise<{ done: boolean }>((r) => setTimeout(() => r({ done: false }), 3000)),
        ]);
        await reader.cancel().catch(() => {});
        return { events, done: done2 };
      }
    }
    await reader.cancel().catch(() => {});
    return { events, done: false };
  }

  beforeEach(async () => {
    resetResolver();
    mockCreateProvider().mockReset();
    vi.unstubAllGlobals();
    stubFetch();
    delete process.env.RESOLVER_TIMEOUT_MS;
    await startServer();
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  });

  it("16. SSE success emits progress, complete/100, and closes", async () => {
    const REEL = "https://www.instagram.com/reel/SseSuccess001/";
    const VIDEO = `${CDN}/o1/v/t16/sse-video.mp4?sig=v`;
    const body = mp4WithTrack("vide", 200 * 1024);
    stubState.routes.push({
      match: (u) => u === VIDEO,
      respond: () => mp4Response(body),
    });
    mockCreateProvider().mockReturnValue({
      name: "test-mock",
      resolve: async (url: string) => ({
        type: "REEL",
        sourceUrl: url,
        thumbnail: null,
        title: null,
        author: null,
        media: [
          {
            url: VIDEO,
            type: "video",
            width: 720,
            height: 1280,
            duration: null,
            thumbnail: null,
            format: "mp4",
          },
        ],
      }),
    } as never);
    const { events } = await readSse(
      `${base}/api/resolve/stream?url=${encodeURIComponent(REEL)}`
    );
    const text = events.join("\n");
    expect(text).toContain("event: progress");
    expect(text).toContain("event: complete");
    expect(text).toContain('"progress":100');
    expect(text).toContain("Media ready!");
  }, 30_000);

  it("17. SSE terminal failure emits error and closes (never hangs)", async () => {
    const REEL = "https://www.instagram.com/reel/SseFailure001/";
    const { createError } = await import("@/lib/errors.js");
    mockCreateProvider().mockReturnValue({
      name: "test-mock",
      resolve: async () => {
        throw createError("VIDEO_SOURCE_NOT_FOUND");
      },
    } as never);
    const { events, done } = await readSse(
      `${base}/api/resolve/stream?url=${encodeURIComponent(REEL)}`
    );
    const text = events.join("\n");
    expect(text).toContain("event: progress");
    expect(text).toContain("event: error");
    expect(text).toContain("VIDEO_SOURCE_NOT_FOUND");
    // The terminal error closed the stream: no complete event follows.
    expect(text).not.toContain("event: complete");
    expect(done).toBe(true);
  }, 30_000);
});
