/**
 * /api/audio end-to-end transcode tests with the REAL FFmpeg binary.
 *
 * Proves the actual production pipeline instead of the message:
 *  1. A Reel video WITH an audio track extracts to a playable MP3 (200,
 *     audio/mpeg, correct disposition, non-empty bytes).
 *  2. A genuinely SILENT video fails honestly (AUDIO_UNAVAILABLE with
 *     transcode-stage diagnostics) instead of hanging, leaking, or
 *     pretending success.
 *
 * Fixtures are synthesized with the repo's own ffmpeg-static binary
 * (testsrc video +/- sine audio), so no network and no committed binaries.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import type { Server } from "http";
import { execFile } from "child_process";
import { mkdtemp, readFile, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

const { resolveMock } = vi.hoisted(() => ({ resolveMock: vi.fn() }));

vi.mock("@/lib/resolvers/index", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, resolveUrl: resolveMock };
});

import app from "@/app";
import { getFfmpegPath } from "@/lib/ffmpeg.js";

const SOURCE = "https://www.instagram.com/reel/ReelTranscode001/";
const CDN_VIDEO = "https://scontent-ord5-2.xx.fbcdn.net/o1/v/t16/transcode-clip.mp4?sig=t";

let workDir = "";
let withAudioBytes: Buffer | null = null;
let silentBytes: Buffer | null = null;
let currentFixture: Buffer | null = null;

function runExe(exe: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(exe, args, { timeout: 60_000 }, (err) => {
      if (err) reject(err);
      else resolve();
    });
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

async function postAudio(base: string): Promise<Response> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const res = await fetch(`${base}/api/audio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: SOURCE }),
    });
    if (res.status !== 503) return res;
    await res.body?.cancel();
    await new Promise((r) => setTimeout(r, 50));
  }
  return fetch(`${base}/api/audio`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: SOURCE }),
  });
}

describe("/api/audio real transcode", () => {
  beforeAll(async () => {
    const ffmpeg = getFfmpegPath();
    if (!ffmpeg) throw new Error("FFmpeg binary missing: cannot build fixtures");
    workDir = await mkdtemp(join(tmpdir(), "downloadit-test-fixture-"));
    const withAudio = join(workDir, "with-audio.mp4");
    const silent = join(workDir, "silent.mp4");
    await runExe(ffmpeg, [
      "-y",
      "-f", "lavfi", "-i", "testsrc=size=128x128:rate=10:duration=1",
      "-f", "lavfi", "-i", "sine=frequency=440:duration=1",
      "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac",
      withAudio,
    ]);
    await runExe(ffmpeg, [
      "-y",
      "-f", "lavfi", "-i", "testsrc=size=128x128:rate=10:duration=1",
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-an",
      silent,
    ]);
    withAudioBytes = await readFile(withAudio);
    silentBytes = await readFile(silent);
    expect(withAudioBytes.length).toBeGreaterThan(10_000);
    expect(silentBytes.length).toBeGreaterThan(1_000);

    const realFetch = globalThis.fetch.bind(globalThis);
    vi.stubGlobal("fetch", async (input: unknown, init?: unknown) => {
      const url = String(input);
      if (url.startsWith("http://127.0.0.1:") || url.startsWith("http://localhost:")) {
        return realFetch(input as string, init as RequestInit);
      }
      if (url.startsWith(CDN_VIDEO) && currentFixture) {
        const bytes = currentFixture;
        return new Response(bytes as unknown as BodyInit, {
          status: 200,
          headers: {
            "content-type": "video/mp4",
            "content-length": String(bytes.length),
          },
        });
      }
      return new Response("unexpected upstream", { status: 500 });
    });

    resolveMock.mockResolvedValue({
      type: "REEL",
      sourceUrl: SOURCE,
      thumbnail: null,
      title: null,
      author: { username: "someone", displayName: null },
      media: [
        {
          url: CDN_VIDEO,
          type: "video",
          width: 128,
          height: 128,
          duration: 1,
          size: null,
          thumbnail: null,
          format: "mp4",
        },
      ],
    });
  }, 90_000);

  afterAll(async () => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    if (workDir) await rm(workDir, { recursive: true, force: true });
  });

  it("extracts a real MP3 from a video that has an audio track", async () => {
    currentFixture = withAudioBytes;
    const { server, base } = await startServer();
    try {
      const res = await postAudio(base);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("audio/mpeg");
      expect(res.headers.get("content-disposition")).toContain(".mp3");
      const bytes = Buffer.from(await res.arrayBuffer());
      // A 1s 192k MP3 is tens of KB: proves FFmpeg really decoded audio.
      expect(bytes.length).toBeGreaterThan(5_000);
    } finally {
      await closeServer(server);
    }
  }, 60_000);

  it("fails honestly (never fake audio) for a genuinely silent video", async () => {
    currentFixture = silentBytes;
    const { server, base } = await startServer();
    try {
      const res = await postAudio(base);
      expect(res.status).toBe(502);
      const body = (await res.json()) as {
        error: { code: string; diagnostics?: Record<string, unknown> };
      };
      expect(body.error.code).toBe("AUDIO_UNAVAILABLE");
      expect(body.error.diagnostics).toMatchObject({
        audioStage: "transcode",
        audioFailure: "transcode",
      });
    } finally {
      await closeServer(server);
    }
  }, 60_000);
});
