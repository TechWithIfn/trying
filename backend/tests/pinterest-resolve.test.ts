import { describe, it, expect } from "vitest";
import {
  extractPinMedia,
  extractPinMediaFromHtml,
  collectVideoRenditions,
  classifyPinPageText,
  parseLdJsonBlocks,
  parseOgMeta,
  extractRelayPinPayload,
} from "@/lib/pinterest/resolve";

const IMG = "https://i.pinimg.com";
const VID = "https://v1.pinimg.com";

describe("classifyPinPageText", () => {
  it("detects deleted/missing pins", () => {
    expect(classifyPinPageText("Sorry! We couldn't find this pin")).toBe("not-found");
    expect(classifyPinPageText("This Pin is not available")).toBe("not-found");
    expect(classifyPinPageText("Pin not found")).toBe("not-found");
  });

  it("detects login/age/region walls", () => {
    expect(classifyPinPageText("Log in to continue to Pinterest")).toBe("restricted");
    expect(classifyPinPageText("Sign up to see this Pin")).toBe("restricted");
    expect(classifyPinPageText("This content is age-restricted")).toBe("restricted");
  });

  it("returns null for a normal pin page", () => {
    expect(classifyPinPageText("Summer garden ideas — 245 saves · 32 comments")).toBeNull();
    expect(classifyPinPageText("")).toBeNull();
  });
});

describe("collectVideoRenditions", () => {
  it("flattens videos.video_list", () => {
    const renditions = collectVideoRenditions({
      videos: {
        video_list: {
          v_720p: { url: `${VID}/videos/mc/720p/abc.mp4`, width: 720, height: 1280 },
          v_360p: { url: `${VID}/videos/mc/360p/abc.mp4`, width: 360, height: 640 },
        },
      },
    });
    expect(renditions).toHaveLength(2);
  });

  it("flattens multi-video videos_extension", () => {
    const renditions = collectVideoRenditions({
      videos: {
        videos_extension: [
          { video_list: { v_720p: { url: `${VID}/videos/mc/720p/a.mp4` } } },
          { video_list: { v_720p: { url: `${VID}/videos/mc/720p/b.mp4` } } },
        ],
      },
    });
    expect(renditions).toHaveLength(2);
    expect(renditions.map((r) => r.url)).toEqual([
      `${VID}/videos/mc/720p/a.mp4`,
      `${VID}/videos/mc/720p/b.mp4`,
    ]);
  });

  it("deduplicates identical rendition URLs", () => {
    const renditions = collectVideoRenditions({
      videos: {
        video_list: { v_720p: { url: `${VID}/videos/mc/720p/abc.mp4` } },
        videos_extension: [{ video_list: { v_720p: { url: `${VID}/videos/mc/720p/abc.mp4` } } }],
      },
    });
    expect(renditions).toHaveLength(1);
  });

  it("returns an empty list when there are no videos", () => {
    expect(collectVideoRenditions({})).toHaveLength(0);
    expect(collectVideoRenditions({ videos: {} })).toHaveLength(0);
    expect(collectVideoRenditions({ videos: { video_list: null } })).toHaveLength(0);
  });

  it("flattens story/carousel videoDataV2 quality maps without collecting covers", () => {
    const renditions = collectVideoRenditions({
      videoDataV2: {
        videoList720P: {
          v720P: {
            url: `${VID}/videos/iht/720p/story.mp4`,
            width: 1080,
            height: 1920,
            thumbnail: { url: `${IMG}/videos/thumbnails/story.jpg` },
          },
        },
        videoList: {
          vHLSV3MOBILE: { url: `${VID}/videos/iht/hls/story.m3u8` },
        },
        videoListMobile: {
          v720P: { url: `${VID}/videos/iht/720p/story-mobile.mp4` },
        },
      },
    });
    expect(renditions.map((r) => r.url)).toEqual([
      `${VID}/videos/iht/720p/story.mp4`,
      `${VID}/videos/iht/hls/story.m3u8`,
      `${VID}/videos/iht/720p/story-mobile.mp4`,
    ]);
    expect(renditions[0].height).toBe(1920);
  });
});

describe("extractPinMedia — video pin", () => {
  const videoPayload = {
    grid_title: "DIY desk lamp",
    description: "A minimal desk lamp build",
    pinner: { username: "maker_one", full_name: "Maker One" },
    images: {
      orig: { url: `${IMG}/originals/aa/bb/cc.jpg`, width: 1000, height: 1500 },
      "736x": { url: `${IMG}/736x/aa/bb/cc.jpg`, width: 736, height: 1104 },
      "236x": { url: `${IMG}/236x/aa/bb/cc.jpg`, width: 236, height: 354 },
    },
    videos: {
      video_list: {
        v_720p: {
          url: `${VID}/videos/mc/720p/lamp.mp4`,
          width: 720,
          height: 1280,
          duration: 14.5,
          contentType: "video/mp4",
        },
        v_360p: {
          url: `${VID}/videos/mc/360p/lamp.mp4`,
          width: 360,
          height: 640,
          duration: 14.5,
          contentType: "video/mp4",
        },
      },
    },
  };

  it("extracts videos highest quality first with poster thumbnail", () => {
    const extracted = extractPinMedia(videoPayload);
    expect(extracted.videos).toHaveLength(2);
    expect(extracted.videos[0].url).toBe(`${VID}/videos/mc/720p/lamp.mp4`);
    expect(extracted.videos[0].height).toBe(1280);
    expect(extracted.videos[0].duration).toBe(14.5);
    expect(extracted.videos[0].format).toBe("mp4");
    // Poster is the smallest real image (cheap thumbnail for the player).
    expect(extracted.thumbnail).toBe(`${IMG}/236x/aa/bb/cc.jpg`);
  });

  it("extracts the cover image as an image item", () => {
    const extracted = extractPinMedia(videoPayload);
    expect(extracted.images).toHaveLength(1);
    expect(extracted.images[0].url).toBe(`${IMG}/originals/aa/bb/cc.jpg`);
  });

  it("normalizes author and title", () => {
    const extracted = extractPinMedia(videoPayload);
    expect(extracted.title).toBe("DIY desk lamp");
    expect(extracted.author).toEqual({ username: "maker_one", displayName: "Maker One" });
  });

  it("prefers orig over 736x as the image item", () => {
    const extracted = extractPinMedia(videoPayload);
    expect(extracted.images[0].width).toBe(1000);
  });
});

describe("extractPinMedia — image pin", () => {
  it("extracts a single image and no videos", () => {
    const extracted = extractPinMedia({
      grid_title: "Sourdough crumb",
      images: {
        orig: { url: `${IMG}/originals/11/22/33.jpg`, width: 2000, height: 1333 },
        "736x": { url: `${IMG}/736x/11/22/33.jpg`, width: 736, height: 491 },
      },
    });
    expect(extracted.images).toHaveLength(1);
    expect(extracted.images[0].url).toBe(`${IMG}/originals/11/22/33.jpg`);
    expect(extracted.videos).toHaveLength(0);
    expect(extracted.title).toBe("Sourdough crumb");
  });

  it("extracts multiple images from aggregated_pin_data (multi-image pin)", () => {
    const extracted = extractPinMedia({
      images: { orig: { url: `${IMG}/originals/11/22/33.jpg`, width: 1000, height: 800 } },
      aggregated_pin_data: {
        aggregated_pins: [
          { images: { orig: { url: `${IMG}/originals/44/55/66.jpg`, width: 1000, height: 800 } } },
          { images: { orig: { url: `${IMG}/originals/77/88/99.jpg`, width: 1000, height: 800 } } },
          // Duplicate of the parent image — must not double-count.
          { images: { orig: { url: `${IMG}/originals/11/22/33.jpg`, width: 1000, height: 800 } } },
        ],
      },
    });
    expect(extracted.images).toHaveLength(3);
  });
});

describe("extractPinMedia — story pins", () => {
  it("extracts per-page video and image assets", () => {
    const extracted = extractPinMedia({
      story_pin_data: {
        pages: [
          { video_url: `${VID}/videos/mc/720p/story.mp4`, video_width: 720, video_height: 1280, duration: 8 },
          { image: { url: `${IMG}/originals/aa/story.jpg`, width: 720, height: 1280 } },
        ],
      },
    });
    expect(extracted.videos).toHaveLength(1);
    expect(extracted.videos[0].url).toBe(`${VID}/videos/mc/720p/story.mp4`);
    expect(extracted.images).toHaveLength(1);
    expect(extracted.images[0].url).toBe(`${IMG}/originals/aa/story.jpg`);
  });

  it("extracts a video from story block videoDataV2 when relay videos is null", () => {
    const extracted = extractPinMedia({
      videos: null,
      storyPinData: {
        pages: [
          {
            blocks: [
              {
                image: { url: `${IMG}/originals/aa/bb/cover.jpg`, width: 1080, height: 1920 },
                videoDataV2: {
                  videoList720P: {
                    v720P: {
                      url: `${VID}/videos/iht/720p/story.mp4`,
                      width: 1080,
                      height: 1920,
                      duration: 6400,
                    },
                  },
                },
              },
            ],
          },
        ],
      },
    });
    expect(extracted.videos.map((v) => v.url)).toEqual([`${VID}/videos/iht/720p/story.mp4`]);
    expect(extracted.videos[0].height).toBe(1920);
    expect(extracted.videos[0].duration).toBe(6.4);
    // The page still is the video cover, not a separate image slide.
    expect(extracted.images).toHaveLength(0);
  });

  it("treats a carousel slide with videoDataV2 as a video, not a photo carousel", () => {
    const extracted = extractPinMedia({
      carouselData: {
        slides: [
          {
            images_orig: { url: `${IMG}/originals/aa/bb/cover.jpg`, width: 1080, height: 1920 },
            videoDataV2: {
              videoList720P: { v720P: { url: `${VID}/videos/iht/720p/slide.mp4`, width: 1080, height: 1920 } },
            },
          },
        ],
      },
    });
    expect(extracted.videos.map((v) => v.url)).toEqual([`${VID}/videos/iht/720p/slide.mp4`]);
  });
});

describe("extractPinMedia — safety & edge cases", () => {
  it("drops media URLs on non-allowlisted hosts (never trusted)", () => {
    const extracted = extractPinMedia({
      images: { orig: { url: "https://evil.example.com/photo.jpg", width: 1000, height: 800 } },
      videos: {
        video_list: { v_720p: { url: "http://evil.example.com/video.mp4", width: 720, height: 1280 } },
      },
    });
    expect(extracted.images).toHaveLength(0);
    expect(extracted.videos).toHaveLength(0);
    expect(extracted.thumbnail).toBeNull();
  });

  it("drops HLS-only renditions (no fake mp4)", () => {
    const extracted = extractPinMedia({
      videos: {
        video_list: {
          v_hls_360: { url: `${VID}/videos/mc/hls/abc.m3u8`, width: 360, height: 640, contentType: "application/x-mpegURL" },
        },
      },
      images: { orig: { url: `${IMG}/originals/aa/bb/cc.jpg`, width: 1000, height: 1500 } },
    });
    expect(extracted.videos).toHaveLength(0);
    expect(extracted.images).toHaveLength(1);
  });

  it("returns an empty result for a null/empty payload", () => {
    const empty = extractPinMedia({});
    expect(empty.videos).toHaveLength(0);
    expect(empty.images).toHaveLength(0);
    expect(empty.thumbnail).toBeNull();
    expect(empty.notFound).toBe(false);

    const junk = extractPinMedia(null as unknown as Record<string, unknown>);
    expect(junk.videos).toHaveLength(0);
  });

  it("flags payload-level error markers as notFound", () => {
    expect(extractPinMedia({ error: "Pin not found" }).notFound).toBe(true);
    expect(extractPinMedia({ errorCode: 404 }).notFound).toBe(true);
    expect(extractPinMedia({ images: {} }).notFound).toBe(false);
  });

  it("truncates very long titles", () => {
    const extracted = extractPinMedia({
      grid_title: "x".repeat(500),
      images: { orig: { url: `${IMG}/originals/aa/bb/cc.jpg`, width: 100, height: 100 } },
    });
    expect(extracted.title?.length).toBe(200);
  });

  it("decodes HTML-escaped ampersands in media URLs", () => {
    const extracted = extractPinMedia({
      images: { orig: { url: `${IMG}/originals/aa/bb/cc.jpg?x=1&amp;y=2`, width: 100, height: 100 } },
    });
    expect(extracted.images[0].url).toContain("&y=2");
    expect(extracted.images[0].url).not.toContain("&amp;");
  });
});

describe("collectVideoRenditions — modern v3 shape", () => {
  it("flattens videos.videoList and videos.videoUrls", () => {
    const renditions = collectVideoRenditions({
      videos: {
        videoList: { v720P: { url: `${VID}/videos/iht/720p/a.mp4`, width: 1080, height: 1920 } },
        videoUrls: [`${VID}/videos/iht/720p/a.mp4`, `${VID}/videos/iht/hls/a.m3u8`],
      },
    });
    expect(renditions.map((r) => r.url)).toEqual([
      `${VID}/videos/iht/720p/a.mp4`,
      `${VID}/videos/iht/hls/a.m3u8`,
    ]);
  });
});

describe("collectVideoRenditions - direct and top-level shapes", () => {
  it("flattens top-level video_list and videoList maps", () => {
    const renditions = collectVideoRenditions({
      video_list: { v720P: { url: `${VID}/videos/mc/720p/one.mp4`, width: 720, height: 1280 } },
      videoList: { v540P: { url: `${VID}/videos/mc/540p/two.mp4`, width: 540, height: 960 } },
    });
    expect(renditions.map((r) => r.url)).toEqual([
      `${VID}/videos/mc/720p/one.mp4`,
      `${VID}/videos/mc/540p/two.mp4`,
    ]);
  });

  it("flattens direct video_url, videoUrls, and video entities", () => {
    const renditions = collectVideoRenditions({
      video_url: `${VID}/videos/mc/720p/direct.mp4`,
      videoUrls: [`${VID}/videos/mc/540p/list.mp4`],
      video: [{ url: `${VID}/videos/mc/360p/entity.mp4`, width: 360, height: 640 }],
    });
    expect(renditions.map((r) => r.url)).toEqual([
      `${VID}/videos/mc/720p/direct.mp4`,
      `${VID}/videos/mc/540p/list.mp4`,
      `${VID}/videos/mc/360p/entity.mp4`,
    ]);
  });

  it("reads a top-level camelCase videosExtension array", () => {
    const renditions = collectVideoRenditions({
      videosExtension: [
        { video_list: { v720P: { url: `${VID}/videos/mc/720p/a.mp4` } } },
        { videoList: { v540P: { url: `${VID}/videos/mc/540p/b.mp4` } } },
      ],
    });
    expect(renditions.map((r) => r.url)).toEqual([
      `${VID}/videos/mc/720p/a.mp4`,
      `${VID}/videos/mc/540p/b.mp4`,
    ]);
  });

  it("reads videos_extension arrays nested on an entity", () => {
    const renditions = collectVideoRenditions({
      videos: {
        videos_extension: [
          { video_list: { v720P: { url: `${VID}/videos/mc/720p/a.mp4` } } },
          { videoList: { v540P: { url: `${VID}/videos/mc/540p/b.mp4` } } },
        ],
      },
    });
    expect(renditions.map((r) => r.url)).toEqual([
      `${VID}/videos/mc/720p/a.mp4`,
      `${VID}/videos/mc/540p/b.mp4`,
    ]);
  });
});

describe("extractPinMedia — video metadata variants and thumbnail safety", () => {
  it("extracts a video from a top-level video_url field", () => {
    const extracted = extractPinMedia({
      video_url: `${VID}/videos/mc/720p/top-level.mp4`,
      video_width: 720,
      video_height: 1280,
      duration: 12,
    });
    expect(extracted.videos).toHaveLength(1);
    expect(extracted.videos[0].url).toBe(`${VID}/videos/mc/720p/top-level.mp4`);
    expect(extracted.videos[0].width).toBe(720);
    expect(extracted.videos[0].duration).toBe(12);
  });

  it("accepts an extensionless legacy video route", () => {
    const extracted = extractPinMedia({
      video_url: `${VID}/videos/mc/720p/legacy-rendition`,
    });
    expect(extracted.videos.map((v) => v.url)).toEqual([`${VID}/videos/mc/720p/legacy-rendition`]);
  });

  it("rejects an extensionless non-video path", () => {
    const extracted = extractPinMedia({
      video_url: `${IMG}/originals/aa/bb/not-a-video`,
    });
    expect(extracted.videos).toHaveLength(0);
  });

  it("never treats a poster/thumbnail as a video rendition", () => {
    const extracted = extractPinMedia({
      images_orig: { url: `${IMG}/originals/aa/bb/poster.jpg`, width: 1000, height: 1500 },
      videos: {
        videoUrls: [
          `${IMG}/videos/thumbnails/originals/aa/bb/poster.0000000.jpg`,
          `${VID}/videos/mc/720p/real.mp4`,
        ],
      },
    });
    expect(extracted.videos.map((v) => v.url)).toEqual([`${VID}/videos/mc/720p/real.mp4`]);
    expect(extracted.images).toHaveLength(1);
  });

  it("rejects an image content type even on a video-shaped URL", () => {
    const extracted = extractPinMedia({
      videos: {
        videoList: {
          v720P: {
            url: `${VID}/videos/mc/720p/preview`,
            contentType: "image/jpeg",
            width: 1080,
            height: 1920,
          },
        },
      },
    });
    expect(extracted.videos).toHaveLength(0);
  });

  it("extracts multiple video entities from a video array", () => {
    const extracted = extractPinMedia({
      video: [
        { url: `${VID}/videos/mc/720p/a.mp4`, width: 720, height: 1280 },
        { url: `${VID}/videos/mc/540p/b.mp4`, width: 540, height: 960 },
      ],
    });
    expect(extracted.videos.map((v) => v.url)).toEqual([
      `${VID}/videos/mc/720p/a.mp4`,
      `${VID}/videos/mc/540p/b.mp4`,
    ]);
  });
});

describe("extractPinMedia — modern v3 pin object", () => {
  it("reads flat images_* props, camelCase title, and normalizes ms duration", () => {
    const extracted = extractPinMedia({
      gridTitle: "Easy Way to Create Video Pins",
      images_orig: { __typename: "ImageDetails", url: `${IMG}/originals/e6/b0/bc/e6b0bcfec14585c7753389172d1af1c6.jpg` },
      images_736x: { url: `${IMG}/736x/e6/b0/bc/e6b0bcfec14585c7753389172d1af1c6.jpg`, width: 736, height: 1308 },
      videos: {
        videoUrls: [
          `${VID}/videos/iht/720p/13/00/77/abc.mp4`,
          `${VID}/videos/iht/hls/13/00/77/abc.m3u8`,
          `${VID}/videos/iht/h265/13/00/77/abc.mpd`,
        ],
        videoList: {
          v720P: { url: `${VID}/videos/iht/720p/13/00/77/abc.mp4`, width: 1080, height: 1920, duration: 7200 },
        },
      },
    });
    expect(extracted.images).toHaveLength(1);
    expect(extracted.images[0].url).toBe(`${IMG}/originals/e6/b0/bc/e6b0bcfec14585c7753389172d1af1c6.jpg`);
    // HLS/DASH manifests are filtered out; only the progressive MP4 survives.
    expect(extracted.videos).toHaveLength(1);
    expect(extracted.videos[0].url).toBe(`${VID}/videos/iht/720p/13/00/77/abc.mp4`);
    expect(extracted.videos[0].duration).toBe(7.2);
    expect(extracted.title).toBe("Easy Way to Create Video Pins");
  });

  it("prefers H.264 renditions over HEVC preview clips", () => {
    const extracted = extractPinMedia({
      videos: {
        videoUrls: [
          `${VID}/videos/iht/hevcMp4V2/61/1b/ad/abc_t2.mp4`,
          `${VID}/videos/mc/720p/61/1b/ad/abc.mp4`,
        ],
      },
    });
    expect(extracted.videos.map((v) => v.url)).toEqual([`${VID}/videos/mc/720p/61/1b/ad/abc.mp4`]);
  });
});

describe("extractPinMedia — camelCase relay shapes", () => {
  it("extracts every slide from carouselData.slides (images_* props)", () => {
    const extracted = extractPinMedia({
      carouselData: {
        slides: [
          { images_orig: { url: `${IMG}/originals/11/22/aa.webp`, width: 1000, height: 1500 } },
          { images_orig: { url: `${IMG}/originals/33/44/bb.webp`, width: 1000, height: 1500 } },
        ],
      },
    });
    expect(extracted.images.map((i) => i.url)).toEqual([
      `${IMG}/originals/11/22/aa.webp`,
      `${IMG}/originals/33/44/bb.webp`,
    ]);
    expect(extracted.videos).toHaveLength(0);
  });

  it("extracts carousel slides nested under image/media", () => {
    const extracted = extractPinMedia({
      carouselData: {
        cards: [
          { image: { images_orig: { url: `${IMG}/originals/66/77/cc.jpg`, width: 800, height: 1200 } } },
          { media: { url: `${IMG}/736x/88/99/dd.jpg`, width: 736, height: 1104 } },
        ],
      },
    });
    expect(extracted.images.map((i) => i.url)).toEqual([
      `${IMG}/originals/66/77/cc.jpg`,
      `${IMG}/736x/88/99/dd.jpg`,
    ]);
  });

  it("counts one slide when the same photo appears as webp and jpg", () => {
    const extracted = extractPinMedia({
      carouselData: {
        slides: [
          { images_orig: { url: `${IMG}/originals/aa/bb/same.webp` } },
          { images_orig: { url: `${IMG}/736x/aa/bb/same.jpg` } },
        ],
      },
    });
    expect(extracted.images).toHaveLength(1);
  });

  it("reads camelCase aggregatedPinData and storyPinData", () => {
    const aggregated = extractPinMedia({
      aggregatedPinData: {
        aggregatedPins: [
          { images: { orig: { url: `${IMG}/originals/11/11/a.jpg`, width: 900, height: 900 } } },
          { images: { orig: { url: `${IMG}/originals/22/22/b.jpg`, width: 900, height: 900 } } },
        ],
      },
    });
    expect(aggregated.images).toHaveLength(2);

    const story = extractPinMedia({
      storyPinData: {
        pages: [
          { videoUrl: `${VID}/videos/mc/720p/story.mp4`, videoWidth: 720, videoHeight: 1280, duration: 8 },
          { image: { url: `${IMG}/originals/aa/story.jpg`, width: 720, height: 1280 } },
        ],
      },
    });
    expect(story.videos.map((v) => v.url)).toEqual([`${VID}/videos/mc/720p/story.mp4`]);
    expect(story.images.map((i) => i.url)).toEqual([`${IMG}/originals/aa/story.jpg`]);
  });
});

describe("parseLdJsonBlocks", () => {
  it("parses blocks, expands arrays, and skips malformed JSON", () => {
    const html =
      `<script type="application/ld+json">{"@type":"VideoObject","contentUrl":"${VID}/videos/mc/720p/x.mp4"}</script>` +
      `<script type="application/ld+json">{ not json }</script>` +
      `<script type="application/ld+json">[{"@type":"A"},{"@type":"B"}]</script>`;
    const blocks = parseLdJsonBlocks(html);
    expect(blocks).toHaveLength(3);
    expect(blocks[0]["@type"]).toBe("VideoObject");
    expect(blocks[1]["@type"]).toBe("A");
    expect(blocks[2]["@type"]).toBe("B");
  });
});

describe("parseOgMeta", () => {
  it("reads og image/video/title in either attribute order and decodes entities", () => {
    const html =
      `<meta property="og:image" content="${IMG}/originals/a.jpg" />` +
      `<meta content="${VID}/videos/mc/720p/a.mp4" property="og:video:secure_url" />` +
      `<meta name="og:title" content="Hello &amp; world" />`;
    const og = parseOgMeta(html);
    expect(og.image).toBe(`${IMG}/originals/a.jpg`);
    expect(og.video).toBe(`${VID}/videos/mc/720p/a.mp4`);
    expect(og.title).toBe("Hello & world");
  });
});

function relayScript(pinId: string, image: string, video: string): string {
  const payload = JSON.stringify({
    data: {
      v3GetPinQueryv2: {
        __typename: "PinResponse",
        data: {
          entityId: pinId,
          gridTitle: "Hi",
          images_orig: { __typename: "ImageDetails", url: image },
          videos: { videoUrls: [video] },
        },
      },
    },
  });
  return `<script data-relay-completed-request="true">window.__PWS_RELAY_REGISTER_COMPLETED_REQUEST__("%7B%22queryID%22%3A%22x%22%7D", ${payload})</script>`;
}

describe("extractRelayPinPayload", () => {
  it("extracts the entityId-anchored relay payload", () => {
    const payload = extractRelayPinPayload(relayScript("123", `${IMG}/originals/a.jpg`, `${VID}/videos/iht/720p/a.mp4`), "123");
    expect(payload?.entityId).toBe("123");
    expect(payload?.videos).toBeTruthy();
  });

  it("ignores relay payloads for other pins and for a missing pin id", () => {
    const html = relayScript("123", `${IMG}/originals/a.jpg`, `${VID}/videos/iht/720p/a.mp4`);
    expect(extractRelayPinPayload(html, "999")).toBeNull();
    expect(extractRelayPinPayload(html, null)).toBeNull();
  });

  it("anchors on an entityId serialized with whitespace", () => {
    const payload = `{
      "entityId": "456",
      "images_orig": { "url": "${IMG}/originals/aa/bb/poster.jpg" },
      "storyPinData": { "pages": [{ "blocks": [{ "videoDataV2": { "videoList720P": { "v720P": { "url": "${VID}/videos/iht/720p/story.mp4" } } } }] }] }
    }`;
    const html = `<script>window.__PWS_RELAY_REGISTER_COMPLETED_REQUEST__("%7B%22queryID%22%3A%22x%22%7D", ${payload})</script>`;
    expect(extractRelayPinPayload(html, "456")?.entityId).toBe("456");
    expect(extractPinMediaFromHtml(html, "456").videos.map((v) => v.url)).toEqual([
      `${VID}/videos/iht/720p/story.mp4`,
    ]);
  });

  it("recognizes a relay payload whose only video field is top-level video_url", () => {
    const payload = JSON.stringify({
      entityId: "321",
      images_orig: { url: `${IMG}/originals/aa/bb/poster.jpg` },
      video_url: `${VID}/videos/mc/720p/direct.mp4`,
    });
    const html = `<script>window.__PWS_RELAY_REGISTER_COMPLETED_REQUEST__("%7B%22queryID%22%3A%22x%22%7D", ${payload})</script>`;
    const relay = extractRelayPinPayload(html, "321");
    expect(relay?.video_url).toBe(`${VID}/videos/mc/720p/direct.mp4`);
    expect(extractPinMediaFromHtml(html, "321").videos.map((v) => v.url)).toEqual([
      `${VID}/videos/mc/720p/direct.mp4`,
    ]);
  });
});

describe("extractPinMediaFromHtml", () => {
  it("composes ld+json + relay and never touches the site-wide CSS blob", () => {
    const html =
      `<style>.x{background:url(${IMG}/originals/e6/b0/bc/e6b0bcfec14585c7753389172d1af1c6.png)}</style>` +
      `<script type="application/ld+json">{"@type":"SocialMediaPosting","headline":"Easy Video","image":"${IMG}/originals/e6/b0/bc/e6b0bcfec14585c7753389172d1af1c6.jpg"}</script>` +
      `<script type="application/ld+json">{"@type":"VideoObject","name":"Easy Video","width":"1080 px","height":"1920 px","duration":"PT7S","thumbnailUrl":"${IMG}/videos/thumbnails/originals/13/00/77/a.0000000.jpg","contentUrl":"${VID}/videos/iht/720p/13/00/77/a.mp4"}</script>` +
      relayScript("123", `${IMG}/originals/e6/b0/bc/e6b0bcfec14585c7753389172d1af1c6.jpg`, `${VID}/videos/iht/720p/13/00/77/a.mp4`);
    const extracted = extractPinMediaFromHtml(html, "123");
    expect(extracted.videos.map((v) => v.url)).toEqual([`${VID}/videos/iht/720p/13/00/77/a.mp4`]);
    expect(extracted.videos[0].duration).toBe(7);
    expect(extracted.images.map((i) => i.url)).toEqual([
      `${IMG}/originals/e6/b0/bc/e6b0bcfec14585c7753389172d1af1c6.jpg`,
    ]);
    expect(extracted.thumbnail).toBe(`${IMG}/videos/thumbnails/originals/13/00/77/a.0000000.jpg`);
    expect(extracted.title).toBe("Easy Video");
    expect(extracted.notFound).toBe(false);
  });

  it("reads a VideoObject whose contentUrl is nested under video/media", () => {
    const html =
      `<script type="application/ld+json">{"@type":"VideoObject","name":"Nested","video":{"contentUrl":"${VID}/videos/iht/720p/nested.mp4","width":1080,"height":1920}}</script>`;
    const extracted = extractPinMediaFromHtml(html, "123");
    expect(extracted.videos.map((v) => v.url)).toEqual([`${VID}/videos/iht/720p/nested.mp4`]);
    expect(extracted.videos[0].height).toBe(1920);
  });

  it("flattens @graph ld+json wrappers", () => {
    const html =
      `<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"VideoObject","name":"Graph","contentUrl":"${VID}/videos/iht/720p/graph.mp4"}]}</script>`;
    const blocks = parseLdJsonBlocks(html);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]["@type"]).toBe("VideoObject");
    expect(extractPinMediaFromHtml(html, "123").videos.map((v) => v.url)).toEqual([
      `${VID}/videos/iht/720p/graph.mp4`,
    ]);
  });

  it("resolves an image-only pin from a Recipe ld+json block", () => {
    const html = `<script type="application/ld+json">{"@type":"Recipe","name":"Chicken","image":"${IMG}/originals/0f/49/9f/a.jpg"}</script>`;
    const extracted = extractPinMediaFromHtml(html, "818529301039001810");
    expect(extracted.images.map((i) => i.url)).toEqual([`${IMG}/originals/0f/49/9f/a.jpg`]);
    expect(extracted.videos).toHaveLength(0);
    expect(extracted.notFound).toBe(false);
  });

  it("collapses the same cover image served at originals and 736x", () => {
    const html =
      `<script type="application/ld+json">{"@type":"SocialMediaPosting","image":"${IMG}/originals/aa/bb/cc.jpg"}</script>` +
      relayScript("42", `${IMG}/736x/aa/bb/cc.jpg`, `${VID}/videos/iht/720p/aa.mp4`);
    const extracted = extractPinMediaFromHtml(html, "42");
    expect(extracted.images.map((i) => i.url)).toEqual([`${IMG}/originals/aa/bb/cc.jpg`]);
  });

  it("collapses the same cover image served as webp and jpg", () => {
    const html =
      `<script type="application/ld+json">{"@type":"SocialMediaPosting","image":"${IMG}/originals/aa/bb/cc.jpg"}</script>` +
      relayScript("43", `${IMG}/originals/aa/bb/cc.webp`, `${VID}/videos/iht/720p/aa.mp4`);
    const extracted = extractPinMediaFromHtml(html, "43");
    expect(extracted.images.map((i) => i.url)).toEqual([`${IMG}/originals/aa/bb/cc.jpg`]);
  });

  it("extracts a modern carousel relay payload anchored to the pin", () => {
    const payload = JSON.stringify({
      entityId: "77",
      carouselData: {
        slides: [
          { images_orig: { url: `${IMG}/originals/aa/bb/one.webp` } },
          { images_orig: { url: `${IMG}/originals/cc/dd/two.webp` } },
        ],
      },
    });
    const html = `<script>window.__PWS_RELAY_REGISTER_COMPLETED_REQUEST__("%7B%22queryID%22%3A%22x%22%7D", ${payload})</script>`;
    const relay = extractRelayPinPayload(html, "77");
    expect(relay?.carouselData).toBeTruthy();
    const extracted = extractPinMediaFromHtml(html, "77");
    expect(extracted.images.map((i) => i.url)).toEqual([
      `${IMG}/originals/aa/bb/one.webp`,
      `${IMG}/originals/cc/dd/two.webp`,
    ]);
  });

  it("ignores site-scaffolding ld+json (Organization/WebSite) images", () => {
    const html =
      `<script type="application/ld+json">{"@type":"WebSite","image":"${IMG}/originals/logo.jpg"}</script>` +
      `<script type="application/ld+json">{"@type":"Organization","image":"${IMG}/originals/logo2.jpg"}</script>`;
    const extracted = extractPinMediaFromHtml(html, "1");
    expect(extracted.images).toHaveLength(0);
    expect(extracted.videos).toHaveLength(0);
  });

  it("returns an empty, non-notFound payload when there is no structured media", () => {
    const extracted = extractPinMediaFromHtml("<html><body>hi</body></html>", "1");
    expect(extracted.videos).toHaveLength(0);
    expect(extracted.images).toHaveLength(0);
    expect(extracted.notFound).toBe(false);
  });
});

const REPRO_PIN_ID = "1077204804633867988";
const REPRO_COVER = `${IMG}/originals/bb/70/2a/bb702aa2b8ba43e7960de8e6b4e98638.jpg`;
const REPRO_VIDEO_THUMB = `${IMG}/videos/thumbnails/originals/5d/e5/4a/5de54ad64980d37b3a7aa28dd0bc3d12.0000000.jpg`;
const REPRO_HLS = `${VID}/videos/iht/hls/5d/e5/4a/5de54ad64980d37b3a7aa28dd0bc3d12.m3u8`;
const REPRO_MP4 = `${VID}/videos/iht/expMp4/5d/e5/4a/5de54ad64980d37b3a7aa28dd0bc3d12_360w.mp4`;

function reproRelay(): string {
  const payload = JSON.stringify({
    entityId: REPRO_PIN_ID,
    images_orig: { url: REPRO_COVER, width: 1080, height: 1920 },
    videos: null,
    storyPinData: {
      pages: [
        {
          blocks: [
            {
              videoDataV2: {
                videoList: {
                  vHLSV3MOBILE: { url: REPRO_HLS, width: 360, height: 640, duration: 13700 },
                },
              },
            },
          ],
        },
      ],
    },
  });
  return `<script>window.__PWS_RELAY_REGISTER_COMPLETED_REQUEST__("%7B%22queryID%22%3A%22x%22%7D", ${payload})</script>`;
}

describe("Pinterest reproduction pin 1077204804633867988", () => {
  it("extracts the LD VideoObject MP4 and keeps the cover as a separate image", () => {
    const html =
      `<script type="application/ld+json">${JSON.stringify([
        { "@type": "SocialMediaPosting", name: "shayari", image: REPRO_COVER },
        {
          "@type": "VideoObject",
          name: "shayari",
          contentUrl: REPRO_MP4,
          thumbnailUrl: REPRO_VIDEO_THUMB,
          width: 360,
          height: 640,
          duration: "PT13.7S",
        },
      ])}</script>` + reproRelay();

    const extracted = extractPinMediaFromHtml(html, REPRO_PIN_ID);
    expect(extracted.videos.map((video) => video.url)).toEqual([REPRO_MP4]);
    expect(extracted.videos[0]).toMatchObject({ width: 360, height: 640, duration: 13.7 });
    expect(extracted.images.map((image) => image.url)).toEqual([REPRO_COVER]);
    expect(extracted.thumbnail).toBe(REPRO_VIDEO_THUMB);
    expect(extracted.fallbackVideos).toHaveLength(0);
  });

  it("derives the expMp4 sibling when only the relay HLS rendition is present", () => {
    const html = `<script type="application/ld+json">${JSON.stringify({
      "@type": "SocialMediaPosting",
      name: "shayari",
      image: REPRO_COVER,
    })}</script>` + reproRelay();

    const extracted = extractPinMediaFromHtml(html, REPRO_PIN_ID);
    expect(extracted.videos).toHaveLength(0);
    expect(extracted.fallbackVideos.map((video) => video.url)).toEqual([REPRO_MP4]);
    expect(extracted.fallbackVideos[0]).toMatchObject({ width: 360, height: 640, duration: 13.7 });
    expect(extracted.images.map((image) => image.url)).toEqual([REPRO_COVER]);
  });
});
