import { execFile } from "child_process";
import { mkdtemp, rm, stat } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { getFfmpegPath } from "../ffmpeg.js";
import { AppError, ERRORS } from "../errors.js";
import { readBoundedInt } from "../env.js";
import { logger } from "../logger.js";
import { classifyYtDlpFailure, type YouTubeProbe, type YouTubeSelection } from "./resolve.js";
import { runYtDlp } from "./ytdlp.js";
import {
  DEFAULT_YOUTUBE_AUDIO_OPTION,
  findYouTubeAudioOption,
  isYouTubeAudioFormat,
  type YouTubeAudioFormat,
} from "./audio.js";

export type YouTubeDownloadFormat = "mp4" | YouTubeAudioFormat;

export interface DownloadYouTubeOptions {
  probe: YouTubeProbe;
  format: YouTubeDownloadFormat;
  /** Required for MP4; ignored for audio formats. */
  selection?: YouTubeSelection;
  /** Selected audio bitrate; unsupported combinations are rejected. */
  audioBitrate?: number;
  timeoutMs: number;
  signal?: AbortSignal;
  requestId?: string;
}

export interface DownloadedYouTubeFile {
  filePath: string;
  sizeBytes: number;
  /** Caller-owned temp directory; remove it after the response finishes. */
  tempDir: string;
}

function maxOutputBytes(): number {
  return readBoundedInt("YOUTUBE_MAX_OUTPUT_BYTES", 512 * 1024 * 1024, 1024 * 1024, 4 * 1024 * 1024 * 1024);
}

function verdict(code: "YOUTUBE_CONVERSION_FAILED" | "YOUTUBE_AUDIO_UNAVAILABLE", probe: YouTubeProbe, stage: string, requestId?: string): AppError {
  return new AppError(code, ERRORS[code].message, ERRORS[code].status, {
    provider: "youtube-yt-dlp",
    stage,
    requestId,
    youtubeVideoId: probe.videoId,
    youtubeStage: stage,
  });
}

function formatSelector(options: DownloadYouTubeOptions): string {
  if (options.format !== "mp4") return "bestaudio/best";
  const selection = options.selection;
  if (!selection) throw verdict("YOUTUBE_CONVERSION_FAILED", options.probe, "select", options.requestId);
  if (!selection.needsAudio) return selection.format.formatId;
  const audio = options.probe.audioFormat;
  if (!audio) throw verdict("YOUTUBE_AUDIO_UNAVAILABLE", options.probe, "select", options.requestId);
  return `${selection.format.formatId}+${audio.formatId}`;
}

export function buildYouTubeDownloadArgs(
  options: DownloadYouTubeOptions,
  ffmpeg: string,
  outputPath: string
): string[] {
  const common = [
    "--no-playlist",
    "--no-warnings",
    "--no-progress",
    "--max-filesize",
    String(maxOutputBytes()),
    "--ffmpeg-location",
    ffmpeg,
    "-f",
    formatSelector(options),
    "-o",
    outputPath,
  ];

  if (isYouTubeAudioFormat(options.format)) {
    const bitrate = options.audioBitrate ?? DEFAULT_YOUTUBE_AUDIO_OPTION.bitrateKbps;
    const audioOption = findYouTubeAudioOption(options.format, bitrate);
    if (!audioOption) {
      throw verdict("YOUTUBE_CONVERSION_FAILED", options.probe, "audio", options.requestId);
    }
    return [
      "-x",
      "--audio-format",
      audioOption.format,
      "--audio-quality",
      `${audioOption.bitrateKbps}K`,
      ...common,
      options.probe.sourceUrl,
    ];
  }
  return ["--merge-output-format", "mp4", ...common, options.probe.sourceUrl];
}

interface StreamInfo {
  hasVideo: boolean;
  hasAudio: boolean;
}

/**
 * ffmpeg with only `-i` exits non-zero ("At least one output file must be
 * specified"), but its stderr still describes every stream. Read the probe
 * outcome from stderr instead of treating the exit code as a failure.
 */
function inspectStreams(filePath: string, signal?: AbortSignal): Promise<StreamInfo> {
  const ffmpeg = getFfmpegPath();
  if (!ffmpeg) return Promise.resolve({ hasVideo: false, hasAudio: false });

  return new Promise((resolve) => {
    let settled = false;
    const done = (info: StreamInfo): void => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", onAbort);
      resolve(info);
    };
    const child = execFile(
      ffmpeg,
      ["-hide_banner", "-i", filePath],
      { timeout: 20_000, maxBuffer: 2 * 1024 * 1024, windowsHide: true },
      (_error, _stdout, stderr) => {
        const output = String(stderr || "");
        done({
          hasVideo: /^\s*Stream\s+#\d+:\d+.*:\s*Video:/mi.test(output),
          hasAudio: /^\s*Stream\s+#\d+:\d+.*:\s*Audio:/mi.test(output),
        });
      }
    );
    const onAbort = (): void => {
      try {
        child.kill("SIGKILL");
      } catch {
        /* already exited */
      }
      done({ hasVideo: false, hasAudio: false });
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export async function safeRemoveDir(dir: string, requestId?: string): Promise<void> {
  try {
    await rm(dir, { recursive: true, force: true });
  } catch (error) {
    logger.warn("[YOUTUBE] temp cleanup failed", {
      requestId,
      dir,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

/**
 * Download (and when needed merge/transcode) one file into a private temp
 * directory. The caller streams it and must call `safeRemoveDir` afterwards.
 */
export async function downloadYouTubeFile(options: DownloadYouTubeOptions): Promise<DownloadedYouTubeFile> {
  const ffmpeg = getFfmpegPath();
  if (!ffmpeg) {
    throw verdict("YOUTUBE_CONVERSION_FAILED", options.probe, "ffmpeg", options.requestId);
  }

  const tempDir = await mkdtemp(join(tmpdir(), "downloadit-youtube-"));
  const extension = options.format;
  const filePath = join(tempDir, `media.${extension}`);
  const startedAt = Date.now();

  try {
    try {
      const result = await runYtDlp(buildYouTubeDownloadArgs(options, ffmpeg, filePath), {
        timeoutMs: options.timeoutMs,
        signal: options.signal,
        maxBuffer: 16 * 1024 * 1024,
      });
      if (result.stderr) {
        logger.info("[YOUTUBE] yt-dlp finished", {
          requestId: options.requestId,
          videoId: options.probe.videoId,
          format: options.format,
          elapsedMs: Date.now() - startedAt,
        });
      }
    } catch (error) {
      throw classifyYtDlpFailure(
        error,
        isYouTubeAudioFormat(options.format) ? "audio" : "download",
        options.requestId,
        options.probe.videoId
      );
    }

    let fileStat;
    try {
      fileStat = await stat(filePath);
    } catch {
      throw verdict("YOUTUBE_CONVERSION_FAILED", options.probe, "verify", options.requestId);
    }
    if (!fileStat.isFile() || fileStat.size === 0) {
      throw verdict("YOUTUBE_CONVERSION_FAILED", options.probe, "verify", options.requestId);
    }
    if (fileStat.size > maxOutputBytes()) {
      throw new AppError(
        "YOUTUBE_FILE_TOO_LARGE",
        `The prepared file is ${Math.round(fileStat.size / (1024 * 1024))} MB, which exceeds this server's limit.`,
        413,
        {
          provider: "youtube-yt-dlp",
          stage: "size",
          requestId: options.requestId,
          youtubeVideoId: options.probe.videoId,
        }
      );
    }

    const streams = await inspectStreams(filePath, options.signal);
    if (options.signal?.aborted) {
      throw new AppError("YOUTUBE_TIMEOUT", ERRORS.YOUTUBE_TIMEOUT.message, 504, {
        provider: "youtube-yt-dlp",
        stage: "verify",
        requestId: options.requestId,
        youtubeVideoId: options.probe.videoId,
      });
    }
    if (isYouTubeAudioFormat(options.format) && !streams.hasAudio) {
      throw verdict("YOUTUBE_AUDIO_UNAVAILABLE", options.probe, "verify", options.requestId);
    }
    if (options.format === "mp4" && (!streams.hasVideo || !streams.hasAudio)) {
      throw verdict("YOUTUBE_CONVERSION_FAILED", options.probe, "verify", options.requestId);
    }

    logger.info("[YOUTUBE] file ready", {
      requestId: options.requestId,
      videoId: options.probe.videoId,
      format: options.format,
      audioBitrate: isYouTubeAudioFormat(options.format) ? options.audioBitrate ?? null : null,
      height: options.selection?.height ?? null,
      bytes: fileStat.size,
    });
    return { filePath, sizeBytes: fileStat.size, tempDir };
  } catch (error) {
    await safeRemoveDir(tempDir, options.requestId);
    throw error;
  }
}
