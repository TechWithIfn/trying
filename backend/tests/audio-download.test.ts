/**
 * /api/audio source-download regression tests (backend-only, no UI change).
 *
 * The reported production symptom was a bare `502 AUDIO_UNAVAILABLE` for a
 * Reel whose resolve had already succeeded. The download stage had three
 * defects that all collapsed into that one opaque code:
 *
 *  1. A single-shot fetch with none of the stale-URL recovery `/api/stream`
 *     already performs, so a rotated/expired CDN signature was terminal.
 *  2. A body cut short mid-transfer (serverless egress reset) rethrew out of
 *     the pipe and landed in the generic handler, which mapped it to
 *     AUDIO_UNAVAILABLE - implying a decode problem when it was a transport
 *     problem.
 *  3. Only `bytes === 0` was rejected, so a TRUNCATED but non-empty file was
 *     written to disk and handed to FFmpeg, which then failed on bytes that
 *     were never a complete video.
 *
 * These tests use the direct-MP3 passthrough (an `audio` media item served
 * with `audio/mpeg`), so the download/validation logic is exercised end to end
 * without depending on an FFmpeg child process.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Server } from "http";

const { resolveMock } = vi.hoisted(() => ({ resolveMock: vi.fn() }));

vi.mock("@/lib/resolvers/index", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, resolveUrl: resolveMock };
});

import app from "@/app";
import { selectAudioSource } from "@/routes/audio";

const MP3_SIZE = 64 * 1024;
const MP3 = (() => {
  const b = Buffer.alloc(MP3_SIZE);
  b.write("ID3", 0, "ascii");
  for (let i = 10; i < b.length; i++) b[i] = i % 251;
  return b;
})();

// Public (non-private) host, so SSRF validation is satisfied exactly as it is
// for a real Instagram CDN asset.
const CDN = "https://scontent-ord5-2.xx.fbcdn.net/audio/abcdef1234.mp3?_nc_cat=101&_nc_sid=abc123";
const SOURCE = "https://www.instagram.com/reel/ReelAudioDownload001/";

type StubMode = "complete" | "truncated" | "reset" | "http-error";

const stub = {
  mode: "complete" as StubMode,
  attempts: 0,
  /** Attempt numbers (1-based) that should answer with a clean full body. */
  succeedOn: [] as number[],
};

function mp3Response() {
  return new Response(MP3 as unknown as BodyInit, {
    status: 200,
    headers: { "content-type": "audio/mpeg", "content-length": String(MP3_SIZE) },
  });
}

/** Advertises the full length but ends the body early (clean, short read). */
function truncatedResponse() {
  const cut = Math.floor(MP3_SIZE / 2);
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(MP3.subarray(0, cut)));
      controller.close();
    },
  });
  return new Response(stream as unknown as BodyInit, {
    status: 200,
    headers: { "content-type": "audio/mpeg", "content-length": String(MP3_SIZE) },
  });
}

/** Transfers some bytes, then the connection is reset mid-body. */
function resetResponse() {
  const cut = Math.floor(MP3_SIZE / 3);
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(MP3.subarray(0, cut)));
      controller.error(new Error("read ECONNRESET"));
    },
  });
  return new Response(stream as unknown as BodyInit, {
    status: 200,
    headers: { "content-type": "audio/mpeg", "content-length": String(MP3_SIZE) },
  });
}

function installFetchStub() {
  const realFetch = globalThis.fetch.bind(globalThis);
  vi.stubGlobal("fetch", async (input: unknown, init?: unknown) => {
    const url = String(input);
    if (url.startsWith("http://127.0.0.1:") || url.startsWith("http://localhost:")) {
      return realFetch(input as string, init as RequestInit);
    }
    if (!url.startsWith(CDN.split("?")[0])) {
      return new Response("unexpected upstream", { status: 500 });
    }
    stub.attempts += 1;
    const attempt = stub.attempts;
    if (stub.succeedOn.includes(attempt)) return mp3Response();
    switch (stub.mode) {
      case "truncated":
        return truncatedResponse();
      case "reset":
        return resetResponse();
      case "http-error":
        return new Response("upstream busy", { status: 503 });
      default:
        return mp3Response();
    }
  });
}

function startServer(): Promise<{ server: Server; base: string }> {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
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

function postOnce(base: string) {
  return fetch(`${base}/api/audio`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: SOURCE }),
  });
}

/**
 * POST /api/audio, tolerating the per-IP admission cap.
 *
 * The per-IP audio cap is 1 by design, and it is released in the request's
 * `finally`. A client can therefore receive the response body and immediately
 * issue the next request while the previous handler is still tearing down its
 * temp dir, which is admission control working correctly, not the behaviour
 * under test. Retry briefly on 503 so the download assertions stay meaningful.
 */
async function post(base: string): Promise<Response> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const res = await postOnce(base);
    if (res.status !== 503) return res;
    await res.body?.cancel();
    await new Promise((r) => setTimeout(r, 50));
  }
  return postOnce(base);
}

describe("/api/audio source download", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    stub.mode = "complete";
    stub.attempts = 0;
    stub.succeedOn = [];
    installFetchStub();
    resolveMock.mockReset();
    resolveMock.mockResolvedValue({
      type: "AUDIO",
      sourceUrl: SOURCE,
      thumbnail: null,
      title: null,
      author: null,
      media: [{ url: CDN, type: "audio", width: null, height: null, duration: null, size: MP3_SIZE, thumbnail: null, format: "mp3" }],
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("1. complete source -> 200 audio/mpeg passthrough with the exact bytes", async () => {
    const { server, base } = await startServer();
    try {
      const res = await post(base);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("audio/mpeg");
      const bytes = Buffer.from(await res.arrayBuffer());
      expect(bytes.equals(MP3)).toBe(true);
      expect(stub.attempts).toBe(1);
    } finally {
      await closeServer(server);
    }
  });

  it("2. truncated body is retried, then reported as a download failure (not AUDIO_UNAVAILABLE)", async () => {
    stub.mode = "truncated";
    const { server, base } = await startServer();
    try {
      const res = await post(base);
      expect(res.status).toBe(502);
      const body = (await res.json()) as { error: { code: string } };
      // Truthful code: the source could not be downloaded. AUDIO_UNAVAILABLE
      // would wrongly imply a working download that failed to transcode.
      expect(body.error.code).toBe("MEDIA_DOWNLOAD_FAILED");
      // Bounded: exactly the two configured attempts, never an open loop.
      expect(stub.attempts).toBe(2);
    } finally {
      await closeServer(server);
    }
  });

  it("3. mid-body connection reset is retried, then reported as a download failure", async () => {
    stub.mode = "reset";
    const { server, base } = await startServer();
    try {
      const res = await post(base);
      expect(res.status).toBe(502);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe("MEDIA_DOWNLOAD_FAILED");
      expect(stub.attempts).toBe(2);
    } finally {
      await closeServer(server);
    }
  });

  it("4. a transient first failure recovers and serves the audio", async () => {
    stub.mode = "truncated";
    stub.succeedOn = [2];
    const { server, base } = await startServer();
    try {
      const res = await post(base);
      expect(res.status).toBe(200);
      const bytes = Buffer.from(await res.arrayBuffer());
      expect(bytes.equals(MP3)).toBe(true);
      expect(stub.attempts).toBe(2);
    } finally {
      await closeServer(server);
    }
  });

  it("5. a retryable upstream 5xx is retried before failing", async () => {
    stub.mode = "http-error";
    const { server, base } = await startServer();
    try {
      const res = await post(base);
      expect(res.status).toBe(502);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe("CONTENT_UNAVAILABLE");
      expect(stub.attempts).toBe(2);
    } finally {
      await closeServer(server);
    }
  });

  it("6. resolver failure surfaces its own code, never AUDIO_UNAVAILABLE", async () => {
    // The resolver throws a typed AppError; the audio route must propagate that
    // code rather than flattening every failure into AUDIO_UNAVAILABLE.
    const { createError } = await import("@/lib/errors");
    resolveMock.mockRejectedValue(createError("VIDEO_SOURCE_NOT_FOUND"));
    const { server, base } = await startServer();
    try {
      const res = await post(base);
      expect(res.status).not.toBe(200);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe("VIDEO_SOURCE_NOT_FOUND");
      // The resolver failing means nothing was ever downloaded.
      expect(stub.attempts).toBe(0);
    } finally {
      await closeServer(server);
    }
  });

  it("7. a silent first video does not become the extraction source when paired audio exists (unit)", () => {
    // Production's first rendition for the reported Reel was a valid video-only
    // MP4. Selecting it for extraction sent a file with no audio stream to
    // FFmpeg, producing a bare 502. The paired rendition is the same clip's
    // sound and must be selected instead.
    const silentVideo = "https://scontent-ord5-2.xx.fbcdn.net/o1/v/t16/silent-video.mp4?sig=silent";
    const pairedAudio = "https://scontent-ord5-2.xx.fbcdn.net/o1/v/t16/paired-audio.mp4?sig=paired";
    const selection = selectAudioSource([
      {
        url: silentVideo,
        type: "video",
        width: 720,
        height: 1280,
        duration: 10,
        size: 959159,
        thumbnail: null,
        format: "mp4",
        audioUrl: pairedAudio,
      },
    ]);
    expect(selection?.item.url).toBe(silentVideo);
    expect(selection?.sourceUrl).toBe(pairedAudio);
    expect(selection?.usePairedAudio).toBe(true);
  });

  it("8. an unknown failure reports its safe audio stage instead of a bare 502", async () => {
    resolveMock.mockRejectedValueOnce(new Error("synthetic failure"));
    const { server, base } = await startServer();
    try {
      const res = await post(base);
      expect(res.status).toBe(502);
      const body = (await res.json()) as {
        error: { code: string; diagnostics?: Record<string, unknown> };
      };
      expect(body.error.code).toBe("AUDIO_UNAVAILABLE");
      expect(body.error.diagnostics).toMatchObject({
        audioStage: "resolve",
        audioFailure: "unknown",
      });
    } finally {
      await closeServer(server);
    }
  });
});
