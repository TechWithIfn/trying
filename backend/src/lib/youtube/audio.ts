export type YouTubeAudioFormat = "mp3" | "m4a";

export interface YouTubeAudioOption {
  format: YouTubeAudioFormat;
  bitrateKbps: number;
  label: string;
}

/**
 * Every option is produced by an actual FFmpeg re-encode at the requested
 * bitrate. MP3 uses libmp3lame; M4A uses AAC inside an MP4/M4A container.
 */
export const YOUTUBE_AUDIO_OPTIONS: readonly YouTubeAudioOption[] = [
  { format: "mp3", bitrateKbps: 320, label: "320 kbps · MP3" },
  { format: "mp3", bitrateKbps: 256, label: "256 kbps · MP3" },
  { format: "mp3", bitrateKbps: 128, label: "128 kbps · MP3" },
  { format: "mp3", bitrateKbps: 96, label: "96 kbps · MP3" },
  { format: "mp3", bitrateKbps: 64, label: "64 kbps · MP3" },
  { format: "m4a", bitrateKbps: 128, label: "M4A · AAC 128 kbps" },
];

export const DEFAULT_YOUTUBE_AUDIO_OPTION: YouTubeAudioOption =
  YOUTUBE_AUDIO_OPTIONS.find((option) => option.format === "mp3" && option.bitrateKbps === 128) ??
  YOUTUBE_AUDIO_OPTIONS[0];

export function isYouTubeAudioFormat(value: unknown): value is YouTubeAudioFormat {
  return value === "mp3" || value === "m4a";
}

export function findYouTubeAudioOption(
  format: YouTubeAudioFormat,
  bitrateKbps: number
): YouTubeAudioOption | null {
  return (
    YOUTUBE_AUDIO_OPTIONS.find(
      (option) => option.format === format && option.bitrateKbps === bitrateKbps
    ) ?? null
  );
}

/**
 * Resolve a requested audio choice. A missing bitrate uses the default 128
 * kbps; unsupported format/bitrate combinations return null so the route can
 * reject them instead of silently producing something else.
 */
export function parseYouTubeAudioOption(
  format: YouTubeAudioFormat,
  rawBitrate: unknown
): YouTubeAudioOption | null {
  let bitrate = DEFAULT_YOUTUBE_AUDIO_OPTION.bitrateKbps;
  if (rawBitrate !== undefined && rawBitrate !== "") {
    if (typeof rawBitrate !== "string" || !/^\d{2,4}$/.test(rawBitrate)) return null;
    bitrate = Number(rawBitrate);
  }
  return findYouTubeAudioOption(format, bitrate);
}
