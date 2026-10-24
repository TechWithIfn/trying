import { describe, it, expect } from "vitest";
import { buildYouTubeDownloadArgs } from "@/lib/youtube/download";
import type { YouTubeProbe, YouTubeSelection } from "@/lib/youtube/resolve";

const VIDEO = {
  formatId: "269",
  height: 144,
  fps: 30,
  ext: "mp4",
  vcodec: "avc1.4d400c",
  acodec: "none",
  tbr: 169,
  hasAudio: false,
};

const AUDIO = {
  formatId: "140",
  height: null,
  fps: null,
  ext: "m4a",
  vcodec: "none",
  acodec: "mp4a.40.2",
  tbr: 129,
  hasAudio: false,
};

function probe(): YouTubeProbe {
  return {
    videoId: "aqz-KE-bpKQ",
    sourceUrl: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
    title: "Big Buck Bunny",
    channel: "Blender",
    channelId: "UCSMOQeBJ2RAnuFungnQOxLg",
    author: null,
    thumbnail: "https://i.ytimg.com/vi/aqz-KE-bpKQ/hqdefault.jpg",
    durationSeconds: 635,
    qualities: [{ height: 144, label: "144p", fps: 30 }],
    selections: new Map<number, YouTubeSelection>([
      [144, { height: 144, format: VIDEO, needsAudio: true }],
    ]),
    audioFormat: AUDIO,
    audioAvailable: true,
  };
}

const FFMPEG = "C:\\ffmpeg\\ffmpeg.exe";
const OUTPUT = "C:\\tmp\\media.mp4";

describe("buildYouTubeDownloadArgs", () => {
  it("appends the canonical source URL and pairs video with audio for MP4", () => {
    const args = buildYouTubeDownloadArgs(
      { probe: probe(), format: "mp4", selection: probe().selections.get(144), timeoutMs: 1000 },
      FFMPEG,
      OUTPUT
    );

    expect(args[args.length - 1]).toBe("https://www.youtube.com/watch?v=aqz-KE-bpKQ");
    expect(args).toContain("269+140");
    expect(args).toContain("--merge-output-format");
    expect(args).toContain(OUTPUT);
  });

  it("appends the source URL and requests MP3 extraction at the chosen bitrate", () => {
    const args = buildYouTubeDownloadArgs(
      { probe: probe(), format: "mp3", audioBitrate: 320, timeoutMs: 1000 },
      FFMPEG,
      "C:\\tmp\\media.mp3"
    );

    expect(args[args.length - 1]).toBe("https://www.youtube.com/watch?v=aqz-KE-bpKQ");
    expect(args).toContain("-x");
    expect(args).toContain("mp3");
    expect(args).toContain("--audio-quality");
    expect(args).toContain("320K");
    expect(args).toContain("bestaudio/best");
  });

  it("requests a real M4A/AAC output at 128 kbps", () => {
    const args = buildYouTubeDownloadArgs(
      { probe: probe(), format: "m4a", audioBitrate: 128, timeoutMs: 1000 },
      FFMPEG,
      "C:\\tmp\\media.m4a"
    );

    expect(args).toContain("--audio-format");
    expect(args).toContain("m4a");
    expect(args).toContain("--audio-quality");
    expect(args).toContain("128K");
    expect(args[args.length - 1]).toBe("https://www.youtube.com/watch?v=aqz-KE-bpKQ");
  });

  it("rejects an unsupported format/bitrate combination", () => {
    try {
      buildYouTubeDownloadArgs(
        { probe: probe(), format: "m4a", audioBitrate: 320, timeoutMs: 1000 },
        FFMPEG,
        "C:\\tmp\\media.m4a"
      );
      throw new Error("expected an error");
    } catch (error) {
      expect(error).toMatchObject({ code: "YOUTUBE_CONVERSION_FAILED" });
    }
  });

  it("uses a combined stream without merging when it already has audio", () => {
    const combined = { ...VIDEO, formatId: "18", acodec: "mp4a.40.2", hasAudio: true };
    const args = buildYouTubeDownloadArgs(
      {
        probe: probe(),
        format: "mp4",
        selection: { height: 144, format: combined, needsAudio: false },
        timeoutMs: 1000,
      },
      FFMPEG,
      OUTPUT
    );

    expect(args).toContain("18");
    expect(args).not.toContain("18+140");
  });
});
