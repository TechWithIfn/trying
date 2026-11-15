import { createWriteStream } from "fs";
import { mkdtemp, rm, stat } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { Readable, Transform } from "stream";
import { pipeline } from "stream/promises";
import type { ErrorCode } from "./types.js";
import { readBoundedInt } from "./env.js";
import { logger } from "./logger.js";
import { resolveFfmpegPath, runFfmpeg, FfmpegAbortedError } from "./ffmpeg.js";

/**
 * Merge a split Instagram video+audio pair (DASH) into one MP4.
 *
 * Instagram publishes higher-resolution Reels only as separate DASH video and
 * audio representations. Downloads must therefore fetch both and mux them.
 * The merge is deliberately disk-backed with hard bounds: the buffered runner
 * cannot hold a 100 MB video in memory, and a temp directory is cleaned up on
 * every success, failure, timeout and client disconnect.
 */

export type MediaMergeErrorCode =
  | "MEDIA_MERGE_UNAVAILABLE"
  | "MEDIA_MERGE_FAILED"
  | "REQUEST_TOO_LARGE"
  | "MEDIA_URL_EXPIRED";

export class MediaMergeError extends Error {
  readonly code: MediaMergeErrorCode;
  constructor(code: MediaMergeErrorCode, message?: string) {
    super(message ?? code);
    this.name = "MediaMergeError";
    this.code = code;
  }
}

const MAX_INPUT_BYTES = readBoundedInt(
  "MAX_MERGE_INPUT_BYTES",
  100 * 1024 * 1024,
  1 * 1024 * 1024,
  500 * 1024 * 1024
);
const MAX_OUTPUT_BYTES = readBoundedInt(
  "MAX_MERGE_OUTPUT_BYTES",
  200 * 1024 * 1024,
  1 * 1024 * 1024,
  1024 * 1024 * 1024
);
const MAX_TOTAL_MS = readBoundedInt("MEDIA_MERGE_TIMEOUT_MS", 45_000, 5_000, 300_000);
const MAX_INPUT_DOWNLOAD_MS = 25_000;

const MERGE_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export interface MergeDashInput {
  videoUrl: string;
  audioUrl: string;
  signal?: AbortSignal;
  requestId?: string;
}

export interface MergedMedia {
  /** Absolute path to the muxed MP4 inside a private temp directory. */
  filePath: string;
  sizeBytes: number;
  /** Remove the temp directory. Idempotent and never throws. */
  cleanup(): Promise<void>;
}

/**
 * Pure argument builder (unit-testable without FFmpeg).
 * Streams are copied, never re-encoded, so a long Reel merges in seconds.
 */
export function buildMergeArgs(videoPath: string, audioPath: string, outputPath: string): string[] {
  return [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    videoPath,
    "-i",
    audioPath,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c:v",
    "copy",
    "-c:a",
    "copy",
    "-movflags",
    "+faststart",
    "-f",
    "mp4",
    outputPath,
  ];
}

function linkSignals(signal: AbortSignal | undefined, timeoutMs: number): AbortSignal {
  const timeout = AbortSignal.timeout(Math.max(1, timeoutMs));
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}

/** Fetch one rendition into a temp file, refusing to exceed the byte cap. */
async function downloadToFile(
  url: string,
  filePath: string,
  opts: { signal?: AbortSignal; timeoutMs: number; maxBytes: number }
): Promise<number> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "User-Agent": MERGE_UA,
        Accept: "*/*",
        Referer: "https://www.instagram.com/",
      },
      redirect: "follow",
      signal: linkSignals(opts.signal, opts.timeoutMs),
    });
  } catch (error) {
    if (opts.signal?.aborted) throw error;
    if (isAbortError(error)) throw new MediaMergeError("MEDIA_MERGE_FAILED");
    throw new MediaMergeError("MEDIA_MERGE_FAILED");
  }

  if (!response.ok || !response.body) {
    await response.body?.cancel().catch(() => {});
    if (response.status === 401 || response.status === 403 || response.status === 404) {
      throw new MediaMergeError("MEDIA_URL_EXPIRED");
    }
    throw new MediaMergeError("MEDIA_MERGE_FAILED");
  }

  const declared = Number.parseInt(response.headers.get("content-length") ?? "", 10);
  if (Number.isSafeInteger(declared) && declared > opts.maxBytes) {
    await response.body.cancel().catch(() => {});
    throw new MediaMergeError("REQUEST_TOO_LARGE");
  }

  let bytes = 0;
  const limiter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      bytes += chunk.length;
      if (bytes > opts.maxBytes) {
        callback(new MediaMergeError("REQUEST_TOO_LARGE"));
        return;
      }
      callback(null, chunk);
    },
  });

  try {
    await pipeline(
      Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]),
      limiter,
      createWriteStream(filePath)
    );
  } catch (error) {
    if (opts.signal?.aborted) throw error;
    if (error instanceof MediaMergeError) throw error;
    if (isAbortError(error)) throw new MediaMergeError("MEDIA_MERGE_FAILED");
    throw new MediaMergeError("MEDIA_MERGE_FAILED");
  }
  return bytes;
}

function normalizeMergeError(error: unknown, signal?: AbortSignal): Error {
  if (error instanceof MediaMergeError) return error;
  if (signal?.aborted) return error instanceof Error ? error : new Error("aborted");
  if (error instanceof FfmpegAbortedError) {
    return new MediaMergeError("MEDIA_MERGE_FAILED", "FFmpeg merge timed out");
  }
  if (isAbortError(error)) return new MediaMergeError("MEDIA_MERGE_FAILED");
  return new MediaMergeError("MEDIA_MERGE_FAILED");
}

/**
 * Download both DASH renditions and mux them. Every failure is a
 * {@link MediaMergeError} with a code the route can translate; abort signals
 * are rethrown unchanged so client disconnects stay control flow.
 */
export async function mergeDashStreams(input: MergeDashInput): Promise<MergedMedia> {
  const startedAt = Date.now();
  const deadline = startedAt + MAX_TOTAL_MS;
  const timeLeft = (): number => deadline - Date.now();

  const ffmpeg = await resolveFfmpegPath();
  if (!ffmpeg) {
    logger.warn("[MERGE] ffmpeg unavailable", { requestId: input.requestId });
    throw new MediaMergeError("MEDIA_MERGE_UNAVAILABLE");
  }

  let dir: string;
  try {
    dir = await mkdtemp(join(tmpdir(), "downloadit-merge-"));
  } catch {
    throw new MediaMergeError("MEDIA_MERGE_FAILED");
  }

  const videoPath = join(dir, "video.mp4");
  const audioPath = join(dir, "audio.m4a");
  const outputPath = join(dir, "merged.mp4");
  let cleaned = false;
  const cleanup = async (): Promise<void> => {
    if (cleaned) return;
    cleaned = true;
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  };

  try {
    const inputBudget = Math.max(1_000, Math.min(MAX_INPUT_DOWNLOAD_MS, timeLeft()));
    const [videoBytes, audioBytes] = await Promise.all([
      downloadToFile(input.videoUrl, videoPath, {
        signal: input.signal,
        timeoutMs: inputBudget,
        maxBytes: MAX_INPUT_BYTES,
      }),
      downloadToFile(input.audioUrl, audioPath, {
        signal: input.signal,
        timeoutMs: inputBudget,
        maxBytes: MAX_INPUT_BYTES,
      }),
    ]);

    const ffmpegBudget = timeLeft();
    if (ffmpegBudget < 1_000) {
      throw new MediaMergeError("MEDIA_MERGE_FAILED", "merge deadline exceeded");
    }

    await runFfmpeg(buildMergeArgs(videoPath, audioPath, outputPath), ffmpegBudget, input.signal);

    const output = await stat(outputPath).catch(() => null);
    if (!output || output.size === 0) {
      throw new MediaMergeError("MEDIA_MERGE_FAILED", "empty merge output");
    }
    if (output.size > MAX_OUTPUT_BYTES) {
      throw new MediaMergeError("REQUEST_TOO_LARGE");
    }

    logger.info("[MERGE] completed", {
      requestId: input.requestId,
      videoBytes,
      audioBytes,
      outputBytes: output.size,
      durationMs: Date.now() - startedAt,
    });

    return { filePath: outputPath, sizeBytes: output.size, cleanup };
  } catch (error) {
    await cleanup();
    throw normalizeMergeError(error, input.signal);
  }
}

/** Error code type guard for routes that map merge failures to HTTP codes. */
export function isMediaMergeError(error: unknown): error is MediaMergeError {
  return error instanceof MediaMergeError;
}

/** All merge error codes are valid public ErrorCodes (type-level assertion). */
const _mergeCodesAreErrorCodes: ErrorCode[] = [
  "MEDIA_MERGE_UNAVAILABLE",
  "MEDIA_MERGE_FAILED",
  "REQUEST_TOO_LARGE",
  "MEDIA_URL_EXPIRED",
];
void _mergeCodesAreErrorCodes;
