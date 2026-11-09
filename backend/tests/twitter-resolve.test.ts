import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const runYtDlpMock = vi.hoisted(() => vi.fn());

vi.mock("../src/lib/youtube/ytdlp.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/youtube/ytdlp.js")>();
  return { ...actual, runYtDlp: runYtDlpMock };
});

import {
  mapYtDlpFailure,
  hasOnlyHlsFormats,
  normalizeTweetText,
  pickProgressiveCandidates,
  pickThumbnail,
  resolveTwitterMediaUrl,
  resolveTwitterPost,
  TwitterResolveError,
  type TwitterYtInfo,
} from "../src/lib/twitter/resolve.js";
import { YtDlpProcessError } from "../src/lib/youtube/ytdlp.js";

const POST_URL = "https://x.com/dhruv_rathee/status/2119404709513408949";
const VIDEO_URL =
  "https://video.twimg.com/amplify_video/2119404206096367619/vid/avc1/2160x3840/clip.mp4?tag=29";
const THUMB_URL =
  "https://pbs.twimg.com/amplify_video_thumb/2119404206096367619/img/poster.jpg?name=orig";

function okProbe(): Response {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ "content-type": "video/mp4" }),
    body: null,
  } as unknown as Response;
}

function statusProbe(status: number): Response {
  return {
    ok: false,
    status,
    headers: new Headers({ "content-type": "text/html" }),
    body: null,
  } as unknown as Response;
}

function mockExtraction(info: TwitterYtInfo): void {
  runYtDlpMock.mockResolvedValue({ stdout: JSON.stringify(info), stderr: "" });
}

const baseInfo: TwitterYtInfo = {
  id: "2119404206096367619",
  extractor_key: "Twitter",
  uploader: "Dhruv Rathee",
  uploader_id: "dhruv_rathee",
  description: "Good will always win over evil. Happy Diwali https://t.co/igBYPtVAYM",
  title: "Dhruv Rathee - Good will always win over evil. Happy Diwali",
  duration: 49.866,
  thumbnail: THUMB_URL,
  formats: [
    {
      url: VIDEO_URL,
      ext: "mp4",
      protocol: "https",
      width: 2160,
      height: 3840,
      tbr: 14517,
    },
    {
      url: "https://video.twimg.com/amplify_video/1/pl/mp4a/32000/audio.m3u8",
      ext: "mp4",
      protocol: "m3u8_native",
      vcodec: "none",
    },
  ],
};

describe("pickProgressiveCandidates", () => {
  it("keeps only https MP4 renditions on the Twitter CDN, best first", () => {
    const candidates = pickProgressiveCandidates({
      formats: [
        {
          url: "https://video.twimg.com/a/480x852/low.mp4?tag=29",
          ext: "mp4",
          protocol: "https",
          width: 480,
          height: 852,
        },
        {
          url: "https://video.twimg.com/a/1080x1920/high.mp4?tag=29",
          ext: "mp4",
          protocol: "https",
          width: 1080,
          height: 1920,
        },
        {
          url: "https://video.twimg.com/a/pl/master.m3u8?tag=29",
          ext: "mp4",
          protocol: "m3u8_native",
        },
        // Wrong/foreign hosts and plain http must never be selected.
        { url: "https://evil.example.com/a.mp4", ext: "mp4", protocol: "https" },
        { url: "https://video.twimg.com.attacker.net/a.mp4", ext: "mp4", protocol: "https" },
        { url: "http://video.twimg.com/a/1x1/x.mp4", ext: "mp4", protocol: "http" },
        { url: "https://video.twimg.com/a/clip.webm", ext: "webm", protocol: "https" },
      ],
    });

    expect(candidates.map((c) => c.url)).toEqual([
      "https://video.twimg.com/a/1080x1920/high.mp4?tag=29",
      "https://video.twimg.com/a/480x852/low.mp4?tag=29",
    ]);
  });

  it("accepts the single top-level rendition when formats is absent", () => {
    const candidates = pickProgressiveCandidates({
      url: VIDEO_URL,
      ext: "mp4",
      protocol: "https",
      width: 720,
      height: 1280,
    });
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({ width: 720, height: 1280 });
  });
});

describe("hasOnlyHlsFormats", () => {
  it("is true only when every usable rendition is HLS", () => {
    expect(
      hasOnlyHlsFormats({
        formats: [
          { url: "https://video.twimg.com/a/pl/master.m3u8", ext: "mp4", protocol: "m3u8_native" },
          { url: "https://video.twimg.com/a/pl/720.m3u8", ext: "mp4", protocol: "m3u8_native" },
        ],
      })
    ).toBe(true);
    expect(
      hasOnlyHlsFormats({
        formats: [
          { url: "https://video.twimg.com/a/pl/master.m3u8", ext: "mp4", protocol: "m3u8_native" },
          { url: VIDEO_URL, ext: "mp4", protocol: "https" },
        ],
      })
    ).toBe(false);
  });
});

describe("pickThumbnail", () => {
  it("prefers the largest Twitter CDN poster and ignores foreign hosts", () => {
    const url = pickThumbnail({
      thumbnails: [
        { url: "https://pbs.twimg.com/a/small.jpg", width: 120, height: 120 },
        { url: "https://pbs.twimg.com/a/large.jpg", width: 1200, height: 1200 },
        { url: "https://evil.example.com/a.jpg", width: 9999, height: 9999 },
      ],
    });
    expect(url).toBe("https://pbs.twimg.com/a/large.jpg");
  });

  it("falls back to the single thumbnail field", () => {
    expect(pickThumbnail({ thumbnail: THUMB_URL })).toBe(THUMB_URL);
    expect(pickThumbnail({ thumbnail: "https://evil.example.com/a.jpg" })).toBeNull();
  });
});

describe("normalizeTweetText", () => {
  it("uses the post description and drops the trailing t.co link", () => {
    expect(
      normalizeTweetText({
        description: "Real caption text https://t.co/abc123",
        title: "Author - Something else",
      })
    ).toBe("Real caption text");
  });

  it("strips the '<author> - ' prefix when only title is available", () => {
    expect(
      normalizeTweetText({ title: "Dhruv Rathee - Good will win", uploader: "Dhruv Rathee" })
    ).toBe("Good will win");
  });
});

describe("mapYtDlpFailure", () => {
  it("maps rate limiting, unavailable posts and no-video posts to honest codes", () => {
    expect(
      mapYtDlpFailure(new YtDlpProcessError("failed", "ERROR: HTTP Error 429: Too Many Requests", 1)).code
    ).toBe("TWITTER_RATE_LIMITED");
    expect(
      mapYtDlpFailure(new YtDlpProcessError("failed", "ERROR: This tweet is not available", 1)).code
    ).toBe("TWITTER_CONTENT_UNAVAILABLE");
    expect(
      mapYtDlpFailure(new YtDlpProcessError("failed", "ERROR: No video could be found in this tweet", 1)).code
    ).toBe("TWITTER_NO_VIDEO");
  });
});

describe("resolveTwitterPost", () => {
  beforeEach(() => {
    runYtDlpMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the real progressive MP4, correct metadata and the POST id", async () => {
    mockExtraction(baseInfo);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okProbe()));

    const result = await resolveTwitterPost(POST_URL);

    expect(result).toMatchObject({
      type: "VIDEO",
      sourceUrl: POST_URL,
      thumbnail: THUMB_URL,
      title: "Good will always win over evil. Happy Diwali",
      description: "Good will always win over evil. Happy Diwali",
      author: { username: "dhruv_rathee", displayName: "Dhruv Rathee" },
      // The post id from the URL, not yt-dlp's internal video id.
      mediaId: "2119404709513408949",
    });
    expect(result.media).toHaveLength(1);
    expect(result.media[0]).toMatchObject({
      url: VIDEO_URL,
      type: "video",
      width: 2160,
      height: 3840,
      duration: 49.866,
      format: "mp4",
      mimeType: "video/mp4",
    });

    // The extractor call must be a bounded dump, never a shell string.
    const [args, options] = runYtDlpMock.mock.calls[0];
    expect(args).toContain("--dump-single-json");
    expect(args).toContain(POST_URL);
    expect(options.timeoutMs).toBeGreaterThan(0);
  });

  it("returns CAROUSEL when the extractor yields multiple video entries", async () => {
    const secondUrl = "https://video.twimg.com/amplify_video/2/vid/avc1/1280x720/second.mp4?tag=29";
    mockExtraction({
      _type: "playlist",
      entries: [
        { ...baseInfo, id: "1" },
        {
          ...baseInfo,
          id: "2",
          formats: [{ url: secondUrl, ext: "mp4", protocol: "https", width: 1280, height: 720 }],
        },
      ],
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okProbe()));

    const result = await resolveTwitterPost(POST_URL);
    expect(result.type).toBe("CAROUSEL");
    expect(result.media.map((m) => m.url)).toEqual([VIDEO_URL, secondUrl]);
  });

  it("rejects HLS-only posts instead of returning a fake success", async () => {
    mockExtraction({
      ...baseInfo,
      formats: [
        {
          url: "https://video.twimg.com/amplify_video/1/pl/master.m3u8?tag=29",
          ext: "mp4",
          protocol: "m3u8_native",
        },
      ],
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okProbe()));

    await expect(resolveTwitterPost(POST_URL)).rejects.toMatchObject({
      code: "TWITTER_HLS_ONLY",
      status: 422,
    });
  });

  it("reports NO_VIDEO for image-only posts", async () => {
    mockExtraction({
      ...baseInfo,
      formats: [{ url: "https://pbs.twimg.com/media/photo.jpg", ext: "jpg" }],
      url: undefined,
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okProbe()));

    await expect(resolveTwitterPost(POST_URL)).rejects.toMatchObject({
      code: "TWITTER_NO_VIDEO",
      status: 422,
    });
  });

  it("surfaces an X GIF (looped MP4, no audio track) as a downloadable video", async () => {
    const gifUrl = "https://video.twimg.com/tweet_video/GIF123.mp4";
    mockExtraction({
      ...baseInfo,
      formats: [
        {
          url: gifUrl,
          ext: "mp4",
          protocol: "https",
          width: 600,
          height: 600,
          vcodec: "h264",
          acodec: "none",
        },
      ],
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okProbe()));

    const result = await resolveTwitterPost(POST_URL);
    expect(result.media).toHaveLength(1);
    expect(result.media[0]).toMatchObject({ url: gifUrl, type: "video", format: "mp4" });
  });

  it("reports MEDIA_UNAVAILABLE when the CDN rejects every rendition", async () => {
    mockExtraction(baseInfo);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(statusProbe(403)));

    await expect(resolveTwitterPost(POST_URL)).rejects.toBeInstanceOf(TwitterResolveError);
    await expect(resolveTwitterPost(POST_URL)).rejects.toMatchObject({
      code: "TWITTER_MEDIA_UNAVAILABLE",
      status: 502,
    });
    expect(runYtDlpMock).toHaveBeenCalledTimes(2);
  });

  it("rejects an invalid URL before ever invoking the extractor", async () => {
    await expect(resolveTwitterPost("https://example.com/user/status/1")).rejects.toMatchObject({
      code: "TWITTER_INVALID_URL",
      status: 400,
    });
    expect(runYtDlpMock).not.toHaveBeenCalled();
  });

  it("resolveTwitterMediaUrl returns the freshly validated URL", async () => {
    mockExtraction(baseInfo);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okProbe()));
    await expect(resolveTwitterMediaUrl(POST_URL)).resolves.toBe(VIDEO_URL);
  });
});
