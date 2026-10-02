/**
 * Regression tests for the rate-limit / Reel-audio / audio-extraction fixes.
 *
 * 1. Only a genuine upstream 429 is throttling (403 is not rate limiting).
 * 2. `Retry-After` parsing is bounded and never NaN/negative/unbounded.
 * 3. A duplicate resolve that joins in-flight work consumes no quota and
 *    starts no second provider call (one user action = one Instagram request).
 * 4. Ranked fast-path selection (selectReelVideo) prefers combined video+audio,
 *    pairs split audio, never selects audio-only or DASH segments as video,
 *    and stays bounded.
 * 5. `ffmpeg -i` output parsing detects a missing audio track without a binary.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import type { Server } from "http";
import type { ResolverResult } from "@/lib/types.js";

vi.mock("@/lib/providers/index.js", () => ({
  createProvider: vi.fn(),
}));

import { createProvider } from "@/lib/providers/index.js";
import {
  parseRetryAfterSeconds,
  selectReelVideo,
  isDashSegmentUrl,
  verifyVideoCandidate,
  isTrustedNetworkCapture,
  extractDashVideoRepresentations,
} from "@/lib/providers/puppeteer.js";
import { ffmpegOutputHasAudio } from "@/lib/ffmpeg.js";

// Exact DASH audio-init URL shape from the production failure (Sep 2026):
// efg vencode_tag "...dash_ln_heaac_vbr3_audio", duration_s 40,
// bytestart=0&byteend=823 (824-byte init segment). Served as "video" it
// produced duration 00:40 + Resolution Unknown + a player stuck mid-playback.
const DASH_AUDIO_INIT =
  "https://scontent-iad3-1.cdninstagram.com/o1/v/t2/f2/m78/AQOzMW3-i8udvfTyaAO8LpmVsC6MQLRDvW0HIX0ZT8FMj0DXfon0lQ6RB72IDKkt_oEEAP4hFR6dRjvuBRuRoBTVSG0lqjMn5cdgQdc.mp4?_nc_cat=108&_nc_sid=9ca052&_nc_ht=scontent-iad3-1.cdninstagram.com&efg=eyJ2ZW5jb2RlX3RhZyI6ImlnLXhwdmRzLmNsaXBzLmlnd3d3LUMzLmRhc2hfbG5faGVhYWNfdmJyM19hdWRpbyIsInZpZGVvX2lkIjpudWxsLCJvaWxfdXJsZ2VuX2FwcF9pZCI6OTM2NjE5NzQzMzkyNDU5LCJjbGllbnRfbmFtZSI6ImlnIiwieHB2X2Fzc2V0X2lkIjo0NDUyMDgzMDkxNzMxODU1LCJhc3NldF9hZ2VfZGF5cyI6MCwidmlfdXNlY2FzZV9pZCI6MTAwOTksImR1cmF0aW9uX3MiOjQwLCJiaXRyYXRlIjo3MjI5NCwidXJsZ2VuX3NvdXJjZSI6Ind3dyJ9&oh=00_AQMzEj6Nc4OsO7D6SmTZbv3QrvsDNE9EJz9kmNb820mQ7g&oe=6ABE9505&bytestart=0&byteend=823";

const JOIN_URL = "https://www.instagram.com/reel/JoinQuota001/";
const OTHER_URL = "https://www.instagram.com/reel/JoinQuota002/";
const CDN_VIDEO = "https://scontent-iad3-2.xx.fbcdn.net/o1/v/t16/join-video.mp4?sig=j";

function reelResult(url: string): ResolverResult {
  return {
    type: "REEL",
    sourceUrl: url,
    thumbnail: null,
    title: null,
    author: null,
    media: [
      {
        url: CDN_VIDEO,
        type: "video",
        width: 720,
        height: 1280,
        duration: 10,
        size: 959159,
        thumbnail: null,
        format: "mp4",
      },
    ],
  };
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

/**
 * Minimal ISO-BMFF ftyp + moov prefix carrying one trak per handler type
 * (`vide` and/or `soun`). Mirrors exactly the container part the track scan
 * uses to tell a combined file from a video-only or audio-only rendition.
 */
function mp4WithTracks(handlers: Array<"vide" | "soun">, totalBytes: number): Buffer {
  const traks = handlers.map((handler) => {
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
    return trak;
  });
  const moovPayload = Buffer.concat(traks);
  const moov = Buffer.alloc(8 + moovPayload.length);
  moov.writeUInt32BE(moov.length, 0);
  moov.write("moov", 4, "latin1");
  moovPayload.copy(moov, 8);
  const ftyp = Buffer.alloc(24);
  ftyp.writeUInt32BE(24, 0);
  ftyp.write("ftyp", 4, "latin1");
  ftyp.write("isom", 8, "latin1");
  const head = Buffer.concat([ftyp, moov]);
  const mdat = Buffer.alloc(Math.max(0, totalBytes - head.length), 0x41);
  if (mdat.length >= 8) {
    mdat.writeUInt32BE(mdat.length, 0);
    mdat.write("mdat", 4, "latin1");
  }
  return Buffer.concat([head, mdat]);
}

function mp4WithTrack(handler: "vide" | "soun", totalBytes: number): Buffer {
  return mp4WithTracks([handler], totalBytes);
}

describe("parseRetryAfterSeconds", () => {
  it("parses delta-seconds and clamps absurd values", () => {
    expect(parseRetryAfterSeconds("30")).toBe(30);
    expect(parseRetryAfterSeconds("  45  ")).toBe(45);
    expect(parseRetryAfterSeconds("9999")).toBe(300);
  });

  it("parses HTTP dates in the future, rejects the past and garbage", () => {
    const future = new Date(Date.now() + 75_000).toUTCString();
    const backoff = parseRetryAfterSeconds(future);
    expect(backoff).not.toBeNull();
    expect(backoff as number).toBeGreaterThan(0);
    expect(backoff as number).toBeLessThanOrEqual(300);
    expect(parseRetryAfterSeconds(new Date(Date.now() - 60_000).toUTCString())).toBeNull();
    expect(parseRetryAfterSeconds("garbage")).toBeNull();
    expect(parseRetryAfterSeconds("")).toBeNull();
    expect(parseRetryAfterSeconds(null)).toBeNull();
    expect(parseRetryAfterSeconds(undefined)).toBeNull();
  });
});

describe("ffmpegOutputHasAudio", () => {
  it("detects an audio stream in ffmpeg -i output", () => {
    const out = [
      "Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'input.mp4':",
      "  Duration: 00:00:10.00, start: 0.000000, bitrate: 800 kb/s",
      "  Stream #0:0[0x1](und): Video: h264, yuv420p, 720x1280",
      "  Stream #0:1[0x2](und): Audio: aac (mp4a / 0x6134706D), 44100 Hz, stereo, fltp, 128 kb/s",
    ].join("\n");
    expect(ffmpegOutputHasAudio(out)).toBe(true);
  });

  it("reports false for video-only output, empty output, and bare mentions", () => {
    const videoOnly = [
      "Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'input.mp4':",
      "  Stream #0:0(und): Video: h264, yuv420p, 720x1280",
    ].join("\n");
    expect(ffmpegOutputHasAudio(videoOnly)).toBe(false);
    expect(ffmpegOutputHasAudio("")).toBe(false);
    expect(ffmpegOutputHasAudio("Audio: aac")).toBe(false);
  });
});

describe("isDashSegmentUrl", () => {
  it("flags the production DASH audio-init URL and ignores progressive URLs", () => {
    expect(isDashSegmentUrl(DASH_AUDIO_INIT)).toBe(true);
    // Same shape without the dash-tagged efg is not a segment.
    expect(isDashSegmentUrl("https://scontent-iad3-1.cdninstagram.com/o1/v/t2/clip.mp4?bytestart=0&byteend=823")).toBe(
      false
    );
    // Progressive efg label is not dash.
    const progressiveEfg = Buffer.from(JSON.stringify({ vencode_tag: "progressive" })).toString("base64url");
    expect(
      isDashSegmentUrl(`https://scontent-iad3-1.cdninstagram.com/o1/v/t2/clip.mp4?efg=${progressiveEfg}`)
    ).toBe(false);
    // A DASH manifest/playback URL is not a byte-sliced fragment; it is a
    // normal media source and must not be rejected as a segment.
    const dashManifestEfg = Buffer.from(JSON.stringify({ vencode_tag: "dash_manifest" })).toString("base64url");
    expect(
      isDashSegmentUrl(`https://scontent-iad3-1.cdninstagram.com/o1/v/t2/clip.mp4?efg=${dashManifestEfg}`)
    ).toBe(false);
    expect(isDashSegmentUrl("not a url")).toBe(false);
    expect(isDashSegmentUrl("")).toBe(false);
  });

  it("verifyVideoCandidate rejects a DASH segment with zero network traffic", async () => {
    let fetchCalls = 0;
    vi.stubGlobal(
      "fetch",
      (async () => {
        fetchCalls++;
        return new Response("must never be fetched", { status: 200 });
      }) as never
    );
    try {
      const check = await verifyVideoCandidate(DASH_AUDIO_INIT);
      expect(check.ok).toBe(false);
      expect(check.reason).toBe("dash-segment");
      expect(fetchCalls).toBe(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("isTrustedNetworkCapture", () => {
  it("trusts a successful extensionless browser 206 independently of probe results", () => {
    expect(
      isTrustedNetworkCapture({
        url: "https://scontent-iad3-2.xx.fbcdn.net/o1/v/t16/clip?sig=browser",
        type: "video",
        width: null,
        height: null,
        source: "network-video-response",
        capturedContentType: "video/mp4; codecs=avc1",
        capturedResourceType: "media",
        capturedStatus: 206,
        capturedResponseHeaders: {
          "content-range": "bytes 0-65535/4000000",
          "content-length": "65536",
        },
      })
    ).toBe(true);
  });

  it("does not trust a DASH byte fragment even when Chromium delivered it", () => {
    expect(
      isTrustedNetworkCapture({
        url: DASH_AUDIO_INIT,
        type: "video",
        width: null,
        height: null,
        source: "network-video-response",
        capturedContentType: "video/mp4",
        capturedResourceType: "media",
        capturedStatus: 206,
      })
    ).toBe(false);
  });
});

describe("extractDashVideoRepresentations", () => {
  it("extracts video BaseURL values from an inline MPD and ignores audio", () => {
    const manifest =
      '{"video_dash_manifest":"<MPD><Period>' +
      '<AdaptationSet contentType=\\"audio\\"><BaseURL>https://scontent-iad3-1.cdninstagram.com/audio</BaseURL></AdaptationSet>' +
      '<AdaptationSet mimeType=\\"video/mp4\\"><Representation><BaseURL>https:\\/\\/scontent-iad3-1.cdninstagram.com\\/video?sig=v</BaseURL></Representation></AdaptationSet>' +
      '</Period></MPD>"}';
    expect(extractDashVideoRepresentations(manifest)).toEqual([
      "https://scontent-iad3-1.cdninstagram.com/video?sig=v",
    ]);
  });

  it("extracts the representation when the manifest is the only media field", async () => {
    const { extractMediaFromJson } = await import("@/lib/providers/puppeteer.js");
    const json =
      '{"video_dash_manifest":"<MPD><AdaptationSet contentType=\\"video\\">' +
      '<Representation><BaseURL>https:\\/\\/scontent-iad3-1.cdninstagram.com\\/video?sig=v</BaseURL>' +
      '</Representation></AdaptationSet></MPD>"}';
    expect(extractMediaFromJson(json)).toContainEqual({
      url: "https://scontent-iad3-1.cdninstagram.com/video?sig=v",
      type: "video",
      width: null,
      height: null,
      variant: "dash-representation",
    });
  });

  it("handles HTML-encoded MPD attributes and codec-only video adaptations", () => {
    const manifest =
      "&lt;MPD&gt;&lt;Period&gt;" +
      "&lt;AdaptationSet mimeType=&quot;audio/mp4&quot;&gt;&lt;BaseURL&gt;https://scontent-iad3-1.cdninstagram.com/audio&lt;/BaseURL&gt;&lt;/AdaptationSet&gt;" +
      "&lt;AdaptationSet codecs=&quot;avc1.640028&quot;&gt;&lt;BaseURL&gt;https://scontent-iad3-1.cdninstagram.com/video?sig=v&lt;/BaseURL&gt;&lt;/AdaptationSet&gt;" +
      "&lt;/Period&gt;&lt;/MPD&gt;";
    expect(extractDashVideoRepresentations(manifest)).toEqual([
      "https://scontent-iad3-1.cdninstagram.com/video?sig=v",
    ]);
  });
});

describe("selectReelVideo", () => {
  const VIDEO_ONLY = "https://scontent-iad3-2.xx.fbcdn.net/o1/v/t16/fast-video.mp4?sig=v";
  const PAIRED_AUDIO = "https://scontent-iad3-2.xx.fbcdn.net/o1/v/t16/fast-audio.mp4?sig=a";
  const COMBINED_SMALL = "https://scontent-iad3-2.xx.fbcdn.net/o1/v/t16/fast-combined.mp4?sig=c";
  const bodies = new Map<string, Buffer>([
    [VIDEO_ONLY, mp4WithTrack("vide", 40_960)],
    [PAIRED_AUDIO, mp4WithTrack("soun", 28_672)],
    [COMBINED_SMALL, mp4WithTracks(["vide", "soun"], 24_576)],
  ]);
  let probeCalls = 0;

  beforeEach(() => {
    probeCalls = 0;
    const realFetch = globalThis.fetch.bind(globalThis);
    vi.stubGlobal("fetch", async (input: unknown, init?: unknown) => {
      const url = String(input);
      if (url.startsWith("http://127.0.0.1:") || url.startsWith("http://localhost:")) {
        return realFetch(input as string, init as RequestInit);
      }
      const body = bodies.get(url);
      if (!body) return new Response("gone", { status: 404 });
      probeCalls++;
      const slice = body.subarray(0, Math.min(body.length, 65_536));
      return new Response(slice as unknown as BodyInit, {
        status: 206,
        headers: {
          "content-type": "video/mp4",
          "content-range": `bytes 0-${slice.length - 1}/${body.length}`,
          "content-length": String(slice.length),
        },
      });
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prefers a smaller combined rendition over a larger silent one", async () => {
    // The exact reported bug: first-verified-wins chose the big silent file
    // while the audible rendition sat later in the pool.
    const selection = await selectReelVideo([{ url: VIDEO_ONLY }, { url: COMBINED_SMALL }]);
    expect(selection?.videoUrl).toBe(COMBINED_SMALL);
    expect(selection?.combined).toBe(true);
    // A combined file needs no companion track.
    expect(selection?.audioUrl).toBeNull();
  });

  it("pairs split audio onto a video-only winner and never selects audio as video", async () => {
    const selection = await selectReelVideo([{ url: VIDEO_ONLY }, { url: PAIRED_AUDIO }]);
    expect(selection?.videoUrl).toBe(VIDEO_ONLY);
    expect(selection?.combined).toBe(false);
    expect(selection?.audioUrl).toBe(PAIRED_AUDIO);
  });

  it("returns null when no candidate verifies as video", async () => {
    const selection = await selectReelVideo([{ url: PAIRED_AUDIO }]);
    expect(selection).toBeNull();
  });

  it("is bounded: never probes more than a handful of candidates", async () => {
    const pool = Array.from({ length: 8 }, (_, i) => ({
      url: `https://scontent-iad3-2.xx.fbcdn.net/o1/v/t16/pool-${i}.mp4?sig=${i}`,
    }));
    for (const item of pool) bodies.set(item.url, mp4WithTrack("vide", 24_576));
    bodies.set(pool[7].url, mp4WithTrack("soun", 28_672));
    try {
      const selection = await selectReelVideo(pool);
      // The audio rendition sits past the probe budget: bounded work wins over
      // exhaustive search. The winner is still an honest verified video.
      expect(selection?.videoUrl).toBe(pool[0].url);
      expect(selection?.audioUrl).toBeNull();
      expect(probeCalls).toBeLessThanOrEqual(6);
    } finally {
      for (const item of pool) bodies.delete(item.url);
    }
  });

  it("never selects a DASH segment, even when it leads the pool", async () => {
    // The production failure: an 824-byte dash audio-init URL verified as
    // "video" and became the Reel source. It is now rejected pre-network, so
    // the audible rendition wins and the dash URL costs zero probes.
    const before = probeCalls;
    const selection = await selectReelVideo([{ url: DASH_AUDIO_INIT }, { url: COMBINED_SMALL }]);
    expect(selection?.videoUrl).toBe(COMBINED_SMALL);
    expect(selection?.combined).toBe(true);
    expect(probeCalls - before).toBe(1);
  });

  it("returns null when the pool holds only a DASH segment", async () => {
    // A pool of pure fragments is "no playable video" — the caller falls
    // through to the browser instead of serving an init segment as MP4.
    const selection = await selectReelVideo([{ url: DASH_AUDIO_INIT }]);
    expect(selection).toBeNull();
  });

  it("carries the winning rendition dimensions for resolve-time Resolution", async () => {
    const selection = await selectReelVideo([
      { url: VIDEO_ONLY, width: 720, height: 1280 },
    ]);
    expect(selection?.videoUrl).toBe(VIDEO_ONLY);
    expect(selection?.width).toBe(720);
    expect(selection?.height).toBe(1280);
  });
});

describe("duplicate resolve joins in-flight work without extra quota or provider calls", () => {
  let server: Server | undefined;
  let base = "";
  let releaseWork: (() => void) | undefined;

  beforeEach(() => {
    releaseWork = undefined;
  });

  afterEach(async () => {
    releaseWork?.();
    if (server) {
      await closeServer(server);
      server = undefined;
    }
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("one user action (SSE fallback pattern) costs one token and one provider call", async () => {
    vi.stubEnv("RATE_LIMIT_MAX_REQUESTS", "17");
    vi.resetModules();

    let held: Promise<ResolverResult> | null = null;
    const provider = {
      name: "mock",
      resolve: vi.fn((url: string) => {
        if (url !== JOIN_URL) return Promise.resolve(reelResult(url));
        if (!held) {
          held = new Promise<ResolverResult>((resolve) => {
            releaseWork = () => resolve(reelResult(url));
          });
        }
        return held as Promise<ResolverResult>;
      }),
    };
    vi.mocked(createProvider).mockReturnValue(provider as never);

    const { default: app } = await import("@/app");
    const started = await startServer(app);
    server = started.server;
    base = started.base;

    const post = (url: string) =>
      fetch(`${base}/api/resolve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });

    // First request starts the (held) resolution.
    const first = post(JOIN_URL);
    const deadline = Date.now() + 5000;
    while (provider.resolve.mock.calls.length === 0 && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 10));
    }
    expect(provider.resolve).toHaveBeenCalledTimes(1);

    // Second request for the SAME url (the SSE->POST fallback shape) joins it.
    const second = post(JOIN_URL);
    // Give the joiner a moment to pass admission, then release the work so
    // both requests complete from the single provider call.
    await new Promise((r) => setTimeout(r, 250));
    expect(provider.resolve).toHaveBeenCalledTimes(1);
    releaseWork?.();

    const [res1, res2] = await Promise.all([first, second]);
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    // Still exactly one Instagram-side resolution for the one user action.
    expect(provider.resolve).toHaveBeenCalledTimes(1);
    // The joiner consumed no quota: both responses show the same remainder.
    expect(res1.headers.get("x-ratelimit-remaining")).toBe("16");
    expect(res2.headers.get("x-ratelimit-remaining")).toBe("16");

    // A genuinely NEW url still consumes quota normally.
    const third = await post(OTHER_URL);
    expect(third.status).toBe(200);
    expect(third.headers.get("x-ratelimit-remaining")).toBe("15");
    expect(provider.resolve).toHaveBeenCalledTimes(2);
  }, 20_000);
});
