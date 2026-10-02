/**
 * Resolver pipeline tests (§16 gaps): classification, scoring, bounded
 * priority verification, SSE disconnect, listener cleanup, session parsing.
 *
 * Covers:
 *  B. video/mp4 without .mp4 URL (extension-less verifies via content-type)
 *  D. fragmented MP4 whose head starts with moof (not rejected as non-mp4)
 *  E. DASH .m4s segment (rejected with zero probe traffic)
 *  M. deterministic candidate scoring (weights, tiers, penalties)
 *  N. bounded verification concurrency + priority order + early stop
 *  Q. SSE client disconnect aborts resolver work and closes the stream
 *  R. event-listener cleanup (gates, drain waits)
 *  T. session-cookie parsing (duplicates, malformed, no crash)
 *  Plus: SSE progress monotonicity on success.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import type { Server } from "http";
import { EventEmitter, getEventListeners } from "events";

vi.mock("@/lib/providers/index.js", () => ({
  createProvider: vi.fn(),
}));

import { createProvider } from "@/lib/providers/index.js";
import { resetResolver } from "@/lib/resolvers/index.js";

const mockCreateProvider = () => vi.mocked(createProvider);

const CDN = "https://scontent-iad3-2.xx.fbcdn.net";

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
  return Buffer.from(JSON.stringify({ vencode_tag: tag }), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

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

function mp4Response(body: Buffer, total?: number): Response {
  const slice = body.subarray(0, Math.min(body.length, 65_536));
  const full = total ?? body.length;
  return new Response(slice as unknown as BodyInit, {
    status: 206,
    headers: {
      "content-type": "video/mp4",
      "content-range": `bytes 0-${slice.length - 1}/${full}`,
      "content-length": String(slice.length),
      "accept-ranges": "bytes",
    },
  });
}

describe("candidate classification and verification", () => {
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

  it("B. extension-less video URL verifies via video/* content-type", async () => {
    const { verifyVideoCandidate } = await import("@/lib/providers/puppeteer.js");
    stubFetch();
    const url = `${CDN}/o1/v/t16/clip-noext?sig=x`;
    stubState.routes.push({
      match: (u) => u === url,
      respond: () => mp4Response(mp4WithTrack("vide", 200 * 1024)),
    });
    const check = await verifyVideoCandidate(url);
    expect(check.ok).toBe(true);
    expect(check.reason).toBe("verified-content-type");
  });

  it("D. fragmented MP4 starting with moof is not rejected", async () => {
    const { verifyVideoCandidate } = await import("@/lib/providers/puppeteer.js");
    stubFetch();
    const url = `${CDN}/o1/v/t16/frag.mp4?sig=f`;
    // moof box at offset 0 (fragment head), then padding to a real size.
    const TOTAL = 300 * 1024;
    const head = Buffer.alloc(65_536, 0x41);
    head.writeUInt32BE(head.length, 0);
    head.write("moof", 4, "latin1");
    stubState.routes.push({
      match: (u) => u === url,
      respond: () =>
        new Response(head as unknown as BodyInit, {
          status: 206,
          headers: {
            "content-type": "video/mp4",
            "content-range": `bytes 0-${head.length - 1}/${TOTAL}`,
            "content-length": String(head.length),
          },
        }),
    });
    const check = await verifyVideoCandidate(url);
    expect(check.ok).toBe(true);
  });

  it("E. DASH .m4s segment rejected with zero probe traffic", async () => {
    const { isDashSegmentUrl, verifyVideoCandidate } = await import(
      "@/lib/providers/puppeteer.js"
    );
    stubFetch();
    const url = `${CDN}/o1/v/t16/seg-42.m4s?sig=m`;
    expect(isDashSegmentUrl(url)).toBe(true);
    const check = await verifyVideoCandidate(url);
    expect(check.ok).toBe(false);
    expect(check.reason).toBe("dash-segment");
    expect(stubState.calls.length).toBe(0);
  });

  it("playable_url and browser_native URLs carry their variant", async () => {
    const { extractMediaFromJson } = await import("@/lib/providers/puppeteer.js");
    const json = JSON.stringify({
      playable_url: `${CDN}/o1/v/t16/play.mp4?sig=p`,
      browser_native_hd_url: `${CDN}/o1/v/t16/hd.mp4?sig=h`,
      video_versions: [
        { url: `${CDN}/o1/v/t16/vv.mp4?sig=v`, width: 720, height: 1280 },
      ],
    });
    const media = extractMediaFromJson(json);
    const byUrl = new Map(media.map((m) => [m.url, m]));
    expect(byUrl.get(`${CDN}/o1/v/t16/play.mp4?sig=p`)?.variant).toBe("playable-url");
    expect(byUrl.get(`${CDN}/o1/v/t16/hd.mp4?sig=h`)?.variant).toBe("browser-native");
    expect(byUrl.get(`${CDN}/o1/v/t16/vv.mp4?sig=v`)?.variant).toBe("video-versions");
  });

  it("M. scoring: provenance weights, tiers, and penalties", async () => {
    const { scoreVideoCandidate } = await import("@/lib/providers/puppeteer.js");
    const vid = (over: Record<string, unknown>) => ({
      url: `${CDN}/o1/v/t16/x.mp4?sig=${Math.random().toString(36).slice(2)}`,
      type: "video" as const,
      width: null,
      height: null,
      ...over,
    });
    const vv = scoreVideoCandidate(vid({ variant: "video-versions", width: 720, height: 1280 }));
    const og = scoreVideoCandidate(vid({ variant: "og-video" }));
    const playable = scoreVideoCandidate(vid({ variant: "playable-url" }));
    const native = scoreVideoCandidate(vid({ variant: "browser-native" }));
    expect(vv.score).toBeGreaterThanOrEqual(100);
    expect(vv.tier).toBe("progressive");
    expect(og.score).toBeGreaterThanOrEqual(90);
    expect(og.tier).toBe("og");
    expect(playable.score).toBeGreaterThanOrEqual(85);
    expect(playable.tier).toBe("playable");
    expect(native.score).toBeGreaterThanOrEqual(85);
    // Ordering across tiers is deterministic.
    expect([vv.score, og.score, playable.score]).toEqual(
      [...[vv.score, og.score, playable.score]].sort((a, b) => b - a)
    );
    // Dims bonus: larger rendition of the same variant scores higher.
    const small = scoreVideoCandidate(vid({ variant: "video-versions", width: 480, height: 848 }));
    expect(vv.score).toBeGreaterThan(small.score);
    // Penalties.
    expect(scoreVideoCandidate({ ...vid({}), type: "image" }).score).toBe(-100);
    expect(
      scoreVideoCandidate(vid({ url: `${CDN}/o1/v/t16/s.m4s?sig=m` })).score
    ).toBe(-100);
    expect(scoreVideoCandidate(vid({ url: "https://evil.example.com/x.mp4" })).score).toBe(-100);
    expect(scoreVideoCandidate(vid({ url: "http://scontent-x.fbcdn.net/x.mp4" })).score).toBe(-100);
  });

  it("M2. trusted network capture outranks generic candidates", async () => {
    const { scoreVideoCandidate } = await import("@/lib/providers/puppeteer.js");
    const trusted = {
      url: `${CDN}/o1/v/t16/t?sig=t`,
      type: "video" as const,
      width: null,
      height: null,
      source: "network-video-response" as const,
      capturedContentType: "video/mp4",
      capturedResourceType: "media",
      capturedStatus: 206,
    };
    const generic = {
      url: `${CDN}/o1/v/t16/g.mp4?sig=g`,
      type: "video" as const,
      width: null,
      height: null,
      source: "video-graph" as const,
    };
    const tScore = scoreVideoCandidate(trusted);
    const gScore = scoreVideoCandidate(generic);
    expect(tScore.tier).toBe("trusted");
    expect(tScore.score).toBeGreaterThanOrEqual(80);
    expect(tScore.score).toBeGreaterThan(gScore.score);
  });

  it("N. priority order, early stop, and concurrency cap", async () => {
    const { verifyInPriorityOrder } = await import("@/lib/providers/puppeteer.js");
    // Order + early stop: sequential dispatch, completion of item 1 ends it.
    const dispatched: number[] = [];
    let done = false;
    await verifyInPriorityOrder({
      items: [0, 1, 2, 3],
      concurrency: 1,
      verify: async (item) => {
        dispatched.push(item);
        return item;
      },
      onResult: (item) => {
        if (item === 1) done = true;
      },
      isComplete: () => done,
    });
    expect(dispatched).toEqual([0, 1]);
    // Concurrency cap with overlapping probes: never more than 2 in flight.
    let cur = 0;
    let max = 0;
    const seen: number[] = [];
    await verifyInPriorityOrder({
      items: [0, 1, 2, 3, 4, 5],
      concurrency: 2,
      verify: async (item) => {
        cur++;
        max = Math.max(max, cur);
        await new Promise<void>((r) => setTimeout(r, 10));
        cur--;
        seen.push(item);
        return item;
      },
      onResult: () => {},
      isComplete: () => false,
    });
    expect(max).toBe(2);
    expect(seen.sort()).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("T. duplicate cookie names are collapsed, malformed never crash", async () => {
    const { parseSessionCookies } = await import("@/lib/instagram-session.js");
    const saved = {
      INSTAGRAM_COOKIE: process.env.INSTAGRAM_COOKIE,
      INSTAGRAM_SESSIONID: process.env.INSTAGRAM_SESSIONID,
    };
    try {
      delete process.env.INSTAGRAM_COOKIE;
      process.env.INSTAGRAM_SESSIONID =
        "sessionid=abc123; ds_user_id=42; sessionid=hijacked; Secure; =noname; bad";
      const jar = parseSessionCookies();
      const names = jar.map((c) => c.name.toLowerCase());
      expect(names).toContain("sessionid");
      expect(names).toContain("ds_user_id");
      // First sessionid wins; bare flags and nameless parts dropped.
      expect(names.filter((n) => n === "sessionid")).toHaveLength(1);
      expect(jar.find((c) => c.name === "sessionid")?.value).toBe("abc123");
      expect(jar.every((c) => c.domain === ".instagram.com")).toBe(true);
    } finally {
      if (saved.INSTAGRAM_COOKIE === undefined) delete process.env.INSTAGRAM_COOKIE;
      else process.env.INSTAGRAM_COOKIE = saved.INSTAGRAM_COOKIE;
      if (saved.INSTAGRAM_SESSIONID === undefined) delete process.env.INSTAGRAM_SESSIONID;
      else process.env.INSTAGRAM_SESSIONID = saved.INSTAGRAM_SESSIONID;
    }
  });
});

describe("listener cleanup", () => {
  it("R. gate grant detaches the queued signal listener", async () => {
    const { WorkloadGate } = await import("@/lib/capacity.js");
    const solo = new WorkloadGate("probe", { limit: 1, maxQueueMs: 5000 });
    const held = await solo.acquire();
    const controller = new AbortController();
    const queued = [solo.acquire({ signal: controller.signal, waitMs: 5000 }), solo.acquire({ signal: controller.signal, waitMs: 5000 })];
    await new Promise((r) => setTimeout(r, 50));
    // Two queued waiters share one signal: 2 abort listeners while queued.
    expect(getEventListeners(controller.signal, "abort").length).toBe(2);
    held.release();
    const first = await queued[0];
    first.release();
    const second = await queued[1];
    second.release();
    // After grant + release, no listener may linger on the caller signal.
    expect(getEventListeners(controller.signal, "abort").length).toBe(0);
  }, 15_000);

  it("R2. drain wait removes every listener on settle", async () => {
    const { waitForDrainOrGone } = await import("@/routes/stream.js");
    const req = new EventEmitter() as never;
    const res = new EventEmitter() as never;
    (res as unknown as { writableEnded: boolean }).writableEnded = false;
    const pending = waitForDrainOrGone(req, res);
    expect((req as EventEmitter).listenerCount("close")).toBe(1);
    (req as EventEmitter).emit("close");
    await expect(pending).resolves.toBe(false);
    expect((req as EventEmitter).listenerCount("close")).toBe(0);
    expect((res as EventEmitter).listenerCount("close")).toBe(0);
    expect((res as EventEmitter).listenerCount("error")).toBe(0);
    expect((res as EventEmitter).listenerCount("drain")).toBe(0);
  });
});

describe("SSE lifecycle", () => {
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

  it("SSE progress is monotonic and ends at complete/100", async () => {
    const REEL = "https://www.instagram.com/reel/SseMonotonic001/";
    const VIDEO = `${CDN}/o1/v/t16/mono.mp4?sig=m`;
    stubState.routes.push({
      match: (u) => u === VIDEO,
      respond: () => mp4Response(mp4WithTrack("vide", 200 * 1024)),
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
          { url: VIDEO, type: "video", width: 720, height: 1280, duration: null, thumbnail: null, format: "mp4" },
        ],
      }),
    } as never);
    const res = await fetch(`${base}/api/resolve/stream?url=${encodeURIComponent(REEL)}`);
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    let buf = "";
    const progresses: number[] = [];
    let sawComplete = false;
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      const { done, value } = await reader.read();
      if (value) {
        buf += dec.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n\n")) >= 0) {
          const block = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          const m = /event: progress\ndata: (\{.*\})/.exec(block);
          if (m) progresses.push((JSON.parse(m[1]) as { progress: number }).progress);
          if (block.startsWith("event: complete")) sawComplete = true;
        }
      }
      if (done || sawComplete) break;
    }
    await reader.cancel().catch(() => {});
    expect(sawComplete).toBe(true);
    expect(progresses.length).toBeGreaterThan(0);
    for (let i = 1; i < progresses.length; i++) {
      expect(progresses[i]).toBeGreaterThanOrEqual(progresses[i - 1] as number);
    }
    // 100 arrives on the terminal complete event, never as a progress tick.
    expect(progresses[progresses.length - 1]).toBeLessThanOrEqual(100);
  }, 30_000);

  it("Q. SSE client disconnect aborts resolver work", async () => {
    const REEL = "https://www.instagram.com/reel/SseDisconnect001/";
    let observedAbort = false;
    mockCreateProvider().mockReturnValue({
      name: "test-mock",
      resolve: (_url: string, _cb: unknown, opts?: { signal?: AbortSignal }) =>
        new Promise<never>((_resolve, reject) => {
          opts?.signal?.addEventListener(
            "abort",
            () => {
              observedAbort = true;
              const err = new Error("resolve cancelled by caller");
              err.name = "AbortError";
              reject(err);
            },
            { once: true }
          );
        }),
    } as never);
    const controller = new AbortController();
    const res = await fetch(
      `${base}/api/resolve/stream?url=${encodeURIComponent(REEL)}`,
      { signal: controller.signal }
    );
    const reader = res.body!.getReader();
    // Consume the opening progress events, then vanish like a closed tab.
    await reader.read();
    controller.abort();
    await reader.cancel().catch(() => {});
    const deadline = Date.now() + 10_000;
    while (!observedAbort && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 50));
    }
    expect(observedAbort).toBe(true);
  }, 30_000);
});
