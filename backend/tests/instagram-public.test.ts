import { describe, it, expect } from "vitest";
import {
  buildPublicResult,
  buildResultFromCandidates,
  contentTypeForUrl,
  inspectPublicPage,
  restrictionToErrorCode,
  selectYtDlpMedia,
  type YtDlpInfoLike,
} from "../src/lib/instagram-public.js";

const CDN = "https://scontent.cdninstagram.com/v/media";

function format(overrides: Record<string, unknown>) {
  return {
    protocol: "https",
    ext: "mp4",
    video_ext: "mp4",
    audio_ext: "none",
    ...overrides,
  };
}

describe("inspectPublicPage", () => {
  it("classifies the real age/restricted error shell as restricted", () => {
    const html = `<!doctype html><html><head><script>{"pageID":"httpErrorPage","failure_reason":"MA","restricted_age":13,"page_type":"MEDIA"}</script></head><body>Error</body></html>`;
    const inspection = inspectPublicPage(html);
    expect(inspection.errorPage).toBe(true);
    expect(inspection.failureReason).toBe("MA");
    expect(inspection.restrictedAge).toBe(13);
    expect(inspection.pageType).toBe("MEDIA");
    expect(inspection.hasVideoVersions).toBe(false);
    expect(inspection.hasVideoUrl).toBe(false);
    expect(inspection.restriction).toBe("restricted");
    expect(restrictionToErrorCode(inspection.restriction)).toBe("INSTAGRAM_CONTENT_RESTRICTED");
  });

  it("never classifies a page with media markers as restricted", () => {
    const html = `{"video_versions":[{"url":"${CDN}.mp4"}],"restricted_age":13,"failure_reason":"MA"}`;
    const inspection = inspectPublicPage(html);
    expect(inspection.hasVideoVersions).toBe(true);
    expect(inspection.restriction).toBeNull();
  });

  it("detects a deleted/removed page", () => {
    const html = `{"pageID":"httpErrorPage","failure_reason":"NF"}<p>Sorry, this page isn't available.</p>`;
    const inspection = inspectPublicPage(html);
    expect(inspection.restriction).toBe("not-found");
    expect(restrictionToErrorCode(inspection.restriction)).toBe("INSTAGRAM_CONTENT_NOT_FOUND");
  });

  it("detects a region-blocked page", () => {
    const html = `<p>This content isn't available in your country.</p>`;
    const inspection = inspectPublicPage(html);
    expect(inspection.restriction).toBe("region-blocked");
    expect(restrictionToErrorCode(inspection.restriction)).toBe("INSTAGRAM_REGION_BLOCKED");
  });

  it("detects a real login redirect and a login form", () => {
    const redirect = inspectPublicPage("<html>Login</html>", { finalPath: "/accounts/login/" });
    expect(redirect.loginWall).toBe(true);
    expect(redirect.restriction).toBe("login-required");

    const form = inspectPublicPage('<form id="loginForm"><input name="username"></form>');
    expect(form.restriction).toBe("login-required");
  });

  it("returns no verdict for a healthy page without media (hydrating shell)", () => {
    const inspection = inspectPublicPage("<html><body>Instagram</body></html>");
    expect(inspection.restriction).toBeNull();
    expect(inspection.loginWall).toBe(false);
  });

  it("treats a challenge as non-verdict evidence", () => {
    const inspection = inspectPublicPage("<p>Please verify your identity to continue</p>");
    expect(inspection.challenge).toBe(true);
    expect(inspection.restriction).toBeNull();
  });
});

describe("selectYtDlpMedia", () => {
  const progressive = format({ format_id: "1", url: `${CDN}-progressive.mp4` });
  const dashAudio = format({
    format_id: "dash-1a",
    url: `${CDN}-audio.m4a`,
    ext: "m4a",
    video_ext: "none",
    audio_ext: "m4a",
    vcodec: "none",
    acodec: "mp4a.40.5",
    tbr: 58,
  });

  it("prefers progressive combined media when DASH is below 720p", () => {
    const selected = selectYtDlpMedia({
      duration: 17,
      formats: [
        dashAudio,
        progressive,
        format({
          format_id: "dash-360v",
          url: `${CDN}-360.mp4`,
          width: 360,
          height: 640,
          vcodec: "avc1.4d001e",
          acodec: "none",
          tbr: 306,
        }),
      ],
    });
    expect(selected?.videoUrl).toBe(`${CDN}-progressive.mp4`);
    expect(selected?.audioUrl).toBeNull();
    expect(selected?.combined).toBe(true);
    expect(selected?.source).toBe("progressive");
  });

  it("picks the highest DASH video and pairs the best audio at 720p+", () => {
    const selected = selectYtDlpMedia({
      formats: [
        progressive,
        dashAudio,
        format({
          format_id: "dash-720v",
          url: `${CDN}-720.mp4`,
          width: 720,
          height: 1280,
          vcodec: "vp09",
          acodec: "none",
          tbr: 500,
        }),
        format({
          format_id: "dash-1080v",
          url: `${CDN}-1080.mp4`,
          width: 1080,
          height: 1920,
          vcodec: "vp09",
          acodec: "none",
          tbr: 900,
        }),
      ],
    });
    expect(selected?.videoUrl).toBe(`${CDN}-1080.mp4`);
    expect(selected?.audioUrl).toBe(`${CDN}-audio.m4a`);
    expect(selected?.width).toBe(1080);
    expect(selected?.height).toBe(1920);
    expect(selected?.format).toBe("1920p");
    expect(selected?.combined).toBe(false);
    expect(selected?.source).toBe("dash");
  });

  it("never selects an audio-only rendition as the video", () => {
    const selected = selectYtDlpMedia({ formats: [dashAudio] });
    expect(selected).toBeNull();
  });

  it("falls back to a direct top-level URL", () => {
    const selected = selectYtDlpMedia({ url: `${CDN}.mp4`, ext: "mp4", width: 720, height: 1280 });
    expect(selected?.videoUrl).toBe(`${CDN}.mp4`);
    expect(selected?.combined).toBe(true);
    expect(selected?.source).toBe("direct");
  });

  it("returns null when there are no usable formats", () => {
    expect(selectYtDlpMedia({ formats: [] })).toBeNull();
    expect(selectYtDlpMedia(null)).toBeNull();
  });
});

describe("buildPublicResult", () => {
  it("maps a Reel into a single video result with metadata", () => {
    const info: YtDlpInfoLike = {
      id: "ABC123",
      title: "Video by creator",
      uploader: "Creator Name",
      channel: "creator",
      thumbnail: `${CDN}-thumb.jpg`,
      formats: [
        format({ format_id: "1", url: `${CDN}-progressive.mp4` }),
        format({
          format_id: "dash-1a",
          url: `${CDN}-audio.m4a`,
          ext: "m4a",
          video_ext: "none",
          audio_ext: "m4a",
          vcodec: "none",
          acodec: "mp4a.40.5",
          tbr: 58,
        }),
        format({
          format_id: "dash-1080v",
          url: `${CDN}-1080.mp4`,
          width: 1080,
          height: 1920,
          vcodec: "vp09",
          acodec: "none",
        }),
      ],
    };
    const result = buildPublicResult(info, "https://www.instagram.com/reel/ABC123/");
    expect(result?.type).toBe("REEL");
    expect(result?.title).toBe("Video by creator");
    expect(result?.author).toEqual({ username: "creator", displayName: "Creator Name" });
    expect(result?.media).toHaveLength(1);
    expect(result?.media[0].type).toBe("video");
    expect(result?.media[0].url).toBe(`${CDN}-1080.mp4`);
    expect(result?.media[0].audioUrl).toBe(`${CDN}-audio.m4a`);
    expect(result?.media[0].height).toBe(1920);
  });

  it("maps a multi-entry carousel with images and one video", () => {
    const info: YtDlpInfoLike = {
      id: "CAR1",
      entries: [
        { url: `${CDN}-1.jpg`, ext: "jpg", width: 1080, height: 1350 },
        { url: `${CDN}-2.mp4`, ext: "mp4", formats: [format({ format_id: "1", url: `${CDN}-2.mp4` })] },
        { url: `${CDN}-3.jpg`, ext: "jpg", width: 1080, height: 1350 },
      ],
    };
    const result = buildPublicResult(info, "https://www.instagram.com/p/CAR1/");
    expect(result?.type).toBe("CAROUSEL");
    expect(result?.media.map((item) => item.type)).toEqual(["image", "video", "image"]);
    expect(result?.media[1].url).toBe(`${CDN}-2.mp4`);
  });

  it("falls back (null) when a carousel entry cannot be mapped", () => {
    const info: YtDlpInfoLike = {
      entries: [
        { url: `${CDN}-1.jpg`, ext: "jpg" },
        { title: "unmappable" },
      ],
    };
    expect(buildPublicResult(info, "https://www.instagram.com/p/CAR1/")).toBeNull();
  });

  it("classifies canonical URL content types", () => {
    expect(contentTypeForUrl("https://www.instagram.com/reel/ABC/")).toBe("REEL");
    expect(contentTypeForUrl("https://www.instagram.com/p/ABC/")).toBe("POST");
    expect(contentTypeForUrl("https://www.instagram.com/tv/ABC/")).toBe("VIDEO");
    expect(contentTypeForUrl("https://www.instagram.com/stories/a/1/")).toBe("UNKNOWN");
  });
});

describe("buildResultFromCandidates", () => {
  const pageImages = [
    { url: `${CDN}-own.heic`, type: "image" as const, width: 1080, height: 1350, source: "embed-html" as const },
    { url: `${CDN}-suggestion1.jpg`, type: "image" as const, width: 1080, height: 1350, source: "embed-html" as const },
    { url: `${CDN}-suggestion2.jpg`, type: "image" as const, width: 1080, height: 1350, source: "embed-html" as const },
  ];

  it("trusts every slide of a structured carousel", async () => {
    const result = await buildResultFromCandidates(pageImages, "https://www.instagram.com/p/CAR/", null, {
      structured: true,
    });
    expect(result?.type).toBe("CAROUSEL");
    expect(result?.media).toHaveLength(3);
  });

  it("keeps only the first scraped image when the page is not structured", async () => {
    const result = await buildResultFromCandidates(pageImages, "https://www.instagram.com/p/CAR/", null);
    expect(result?.type).toBe("POST");
    expect(result?.media.map((item) => item.url)).toEqual([`${CDN}-own.heic`]);
  });
});
