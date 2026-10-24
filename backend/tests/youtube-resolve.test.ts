import { describe, it, expect } from "vitest";
import {
  classifyYtDlpFailure,
  parseYouTubeProbe,
  selectYouTubeFormats,
  selectionForQuality,
  toResolveData,
  type YtFormat,
} from "@/lib/youtube/resolve";
import { YtDlpAbortedError, YtDlpProcessError } from "@/lib/youtube/ytdlp";

const ID = "jNQXAC9IVRw";
const PARSED = {
  videoId: ID,
  normalized: `https://www.youtube.com/watch?v=${ID}`,
  kind: "watch" as const,
};

function fmt(overrides: Partial<YtFormat> & { formatId: string }): YtFormat {
  return {
    height: null,
    fps: 30,
    ext: "mp4",
    vcodec: "avc1.640028",
    acodec: "none",
    tbr: 1000,
    hasAudio: false,
    ...overrides,
  };
}

const AUDIO = fmt({ formatId: "140", ext: "m4a", vcodec: "none", acodec: "mp4a.40.2", tbr: 128 });

function thrownCode(fn: () => unknown): string | undefined {
  try {
    fn();
    return undefined;
  } catch (error) {
    return (error as { code?: string }).code;
  }
}

describe("selectYouTubeFormats", () => {
  it("offers only the exact target heights and picks the best stream", () => {
    const result = selectYouTubeFormats([
      fmt({ formatId: "137", height: 1080, tbr: 4000 }),
      fmt({ formatId: "136", height: 720, tbr: 2000 }),
      fmt({ formatId: "18", height: 360, vcodec: "avc1.42001E", acodec: "mp4a.40.2", tbr: 500, hasAudio: true }),
      AUDIO,
    ]);

    expect(result.qualities.map((q) => q.height)).toEqual([1080, 720]);
    expect(result.selections.get(1080)?.format.formatId).toBe("137");
    expect(result.selections.get(1080)?.needsAudio).toBe(true);
    expect(result.audioFormat?.formatId).toBe("140");
    expect(result.audioAvailable).toBe(true);
  });

  it("prefers H.264 MP4 over a higher-bitrate VP9 rendition", () => {
    const result = selectYouTubeFormats([
      fmt({ formatId: "vp9", height: 1080, ext: "webm", vcodec: "vp9", tbr: 6000 }),
      fmt({ formatId: "h264", height: 1080, ext: "mp4", vcodec: "avc1.640028", tbr: 3000 }),
      AUDIO,
    ]);
    expect(result.selections.get(1080)?.format.formatId).toBe("h264");
  });

  it("falls back to a combined stream when no audio-only stream exists", () => {
    const result = selectYouTubeFormats([
      fmt({
        formatId: "22",
        height: 720,
        vcodec: "avc1.64001F",
        acodec: "mp4a.40.2",
        hasAudio: true,
        tbr: 1500,
      }),
    ]);
    expect(result.qualities.map((q) => q.height)).toEqual([720]);
    expect(result.selections.get(720)?.needsAudio).toBe(false);
    expect(result.audioAvailable).toBe(true);
  });

  it("reports no qualities when video-only streams cannot be paired with audio", () => {
    const result = selectYouTubeFormats([fmt({ formatId: "137", height: 1080 })]);
    expect(result.qualities).toEqual([]);
    expect(result.selections.size).toBe(0);
    expect(result.audioFormat).toBeNull();
    expect(result.audioAvailable).toBe(false);
  });

  it("falls back to real non-standard heights instead of an empty page", () => {
    const result = selectYouTubeFormats([
      fmt({ formatId: "v360", height: 360 }),
      AUDIO,
    ]);
    expect(result.qualities.map((q) => q.height)).toEqual([360]);
    expect(result.qualities[0].label).toBe("360p");
  });
});

describe("parseYouTubeProbe", () => {
  const payload = {
    id: ID,
    title: "  Me at the zoo  ",
    channel: "jawed",
    channel_id: "UC4QobU6STFB0P71PMvOGN5A",
    uploader_id: "@jawed",
    duration: 19,
    live_status: "not_live",
    availability: "public",
    age_limit: 0,
    formats: [
      { format_id: "137", height: 1080, fps: 30, ext: "mp4", vcodec: "avc1.640028", acodec: "none", tbr: 4000 },
      { format_id: "140", ext: "m4a", vcodec: "none", acodec: "mp4a.40.2", abr: 128 },
    ],
  };

  it("maps metadata and available qualities", () => {
    const probe = parseYouTubeProbe(payload, PARSED);
    expect(probe.videoId).toBe(ID);
    expect(probe.title).toBe("Me at the zoo");
    expect(probe.channel).toBe("jawed");
    expect(probe.durationSeconds).toBe(19);
    expect(probe.thumbnail).toBe(`https://i.ytimg.com/vi/${ID}/hqdefault.jpg`);
    expect(probe.qualities.map((q) => q.label)).toEqual(["1080p"]);
    expect(probe.audioAvailable).toBe(true);
    expect(toResolveData(probe).audioOptions.map((option) => option.label)).toEqual([
      "320 kbps · MP3",
      "256 kbps · MP3",
      "128 kbps · MP3",
      "96 kbps · MP3",
      "64 kbps · MP3",
      "M4A · AAC 128 kbps",
    ]);
  });

  it("rejects live broadcasts", () => {
    expect(
      thrownCode(() => parseYouTubeProbe({ ...payload, is_live: true, live_status: "is_live" }, PARSED))
    ).toBe("YOUTUBE_LIVE_UNSUPPORTED");
  });

  it("rejects private/premium videos", () => {
    expect(thrownCode(() => parseYouTubeProbe({ ...payload, availability: "private" }, PARSED))).toBe(
      "YOUTUBE_VIDEO_UNAVAILABLE"
    );
  });

  it("reports age restriction when no formats are exposed", () => {
    expect(
      thrownCode(() => parseYouTubeProbe({ ...payload, age_limit: 18, formats: [] }, PARSED))
    ).toBe("YOUTUBE_AGE_RESTRICTED");
  });

  it("reports an upstream error for a malformed payload", () => {
    expect(thrownCode(() => parseYouTubeProbe(null, PARSED))).toBe("YOUTUBE_UPSTREAM_ERROR");
  });
});

describe("selectionForQuality", () => {
  it("lists the real alternatives when a requested height is unavailable", () => {
    const probe = parseYouTubeProbe(
      {
        id: ID,
        formats: [
          { format_id: "136", height: 720, ext: "mp4", vcodec: "avc1", acodec: "none" },
          { format_id: "140", ext: "m4a", vcodec: "none", acodec: "mp4a" },
        ],
      },
      PARSED
    );
    try {
      selectionForQuality(probe, 1080);
      throw new Error("expected an error");
    } catch (error) {
      expect(error).toMatchObject({ code: "YOUTUBE_QUALITY_UNAVAILABLE" });
      expect((error as Error).message).toContain("Available: 720p");
    }
  });
});

describe("classifyYtDlpFailure", () => {
  const cases: Array<[string, string]> = [
    ["ERROR: Private video. Sign in if you've been granted access", "YOUTUBE_VIDEO_UNAVAILABLE"],
    ["ERROR: Sign in to confirm you're not a bot", "YOUTUBE_BOT_CHECK"],
    ["ERROR: [youtube] x: Video unavailable", "YOUTUBE_VIDEO_NOT_FOUND"],
    ["ERROR: HTTP Error 429: Too Many Requests", "YOUTUBE_RATE_LIMITED"],
    ["ERROR: Requested format is not available", "YOUTUBE_QUALITY_UNAVAILABLE"],
    ["ERROR: ffmpeg exited with code 1", "YOUTUBE_CONVERSION_FAILED"],
  ];

  it.each(cases)("maps %s", (stderr, code) => {
    const mapped = classifyYtDlpFailure(new YtDlpProcessError("yt-dlp failed", stderr, 1), "probe");
    expect(mapped.code).toBe(code);
  });

  it("maps aborts and timeouts to a retryable timeout", () => {
    const mapped = classifyYtDlpFailure(new YtDlpAbortedError("timeout"), "download");
    expect(mapped.code).toBe("YOUTUBE_TIMEOUT");
    expect(mapped.statusCode).toBe(504);
  });
});
