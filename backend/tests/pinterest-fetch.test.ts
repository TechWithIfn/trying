import { describe, it, expect, vi, afterEach } from "vitest";
import { resolvePinterestPin } from "@/lib/pinterest/resolve";

/**
 * Deterministic coverage for the failure paths that cannot be forced against
 * the live site: bounded retries for transient upstream failures, Retry-After
 * honoring, no-retry on permanent verdicts, timeouts, and redirect safety.
 * `fetch` is stubbed; no real network is touched.
 */

const PIN = "https://www.pinterest.com/pin/1234567890123456789/";
const PIN_HTML =
  `<script type="application/ld+json">{"@type":"VideoObject","name":"x","contentUrl":"https://v1.pinimg.com/videos/mc/720p/a.mp4"}</script>`;

const html = (body: string, status = 200): Response =>
  new Response(body, { status, headers: { "content-type": "text/html" } });

const IMAGE_HTML =
  `<script type="application/ld+json">{"@type":"SocialMediaPosting","name":"Photo","image":"https://i.pinimg.com/originals/aa/bb/cc.jpg"}</script>`;
const VIDEO_HTML =
  `<script type="application/ld+json">{"@type":"VideoObject","name":"Clip","contentUrl":"https://v1.pinimg.com/videos/mc/720p/a.mp4"}</script>`;

function relayHtml(payload: Record<string, unknown>): string {
  const data = JSON.stringify({ entityId: "1234567890123456789", ...payload });
  return `<script>window.__PWS_RELAY_REGISTER_COMPLETED_REQUEST__("%7B%22queryID%22%3A%22x%22%7D", ${data})</script>`;
}

/** Stub fetch so the pin page returns `page` and every media probe succeeds. */
function stubPinPage(page: string): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (String(url).includes("/pin/")) return html(page);
      const type = String(url).includes("v1.pinimg.com") ? "video/mp4" : "image/jpeg";
      return new Response(null, { status: 206, headers: { "content-type": type } });
    })
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("resolvePinterestPin — media kind dispatch", () => {
  it("resolves an image pin as PHOTO in image mode", async () => {
    stubPinPage(IMAGE_HTML);
    const result = await resolvePinterestPin(PIN, "image");
    expect(result.type).toBe("PHOTO");
    expect(result.media).toHaveLength(1);
    expect(result.media[0].type).toBe("image");
  });

  it("resolves a video pin as VIDEO in video mode", async () => {
    stubPinPage(VIDEO_HTML);
    const result = await resolvePinterestPin(PIN, "video");
    expect(result.type).toBe("VIDEO");
    expect(result.media.map((m) => m.type)).toEqual(["video"]);
  });

  it("image mode on a video-only pin reports PINTEREST_NO_IMAGE, never PINTEREST_NO_VIDEO", async () => {
    stubPinPage(VIDEO_HTML);
    await expect(resolvePinterestPin(PIN, "image")).rejects.toMatchObject({
      code: "PINTEREST_NO_IMAGE",
    });
  });

  it("video mode on an image-only pin reports PINTEREST_NO_VIDEO", async () => {
    stubPinPage(IMAGE_HTML);
    await expect(resolvePinterestPin(PIN, "video")).rejects.toMatchObject({
      code: "PINTEREST_NO_VIDEO",
    });
  });

  it("image mode on a pin with both media returns only the image", async () => {
    stubPinPage(
      relayHtml({
        images_orig: { url: "https://i.pinimg.com/originals/aa/bb/cc.jpg" },
        videos: { videoUrls: ["https://v1.pinimg.com/videos/mc/720p/a.mp4"] },
      })
    );
    const result = await resolvePinterestPin(PIN, "image");
    expect(result.type).toBe("PHOTO");
    expect(result.media.map((m) => m.type)).toEqual(["image"]);
  });

  it("auto mode prefers the video when both media exist", async () => {
    stubPinPage(
      relayHtml({
        images_orig: { url: "https://i.pinimg.com/originals/aa/bb/cc.jpg" },
        videos: { videoUrls: ["https://v1.pinimg.com/videos/mc/720p/a.mp4"] },
      })
    );
    const result = await resolvePinterestPin(PIN, "any");
    expect(result.type).toBe("VIDEO");
    expect(result.media.map((m) => m.type)).toEqual(["video"]);
  });

  it("resolves a carousel pin as CAROUSEL with one item per unique slide", async () => {
    stubPinPage(
      relayHtml({
        carouselData: {
          slides: [
            { images_orig: { url: "https://i.pinimg.com/originals/aa/bb/one.webp" } },
            { images_orig: { url: "https://i.pinimg.com/originals/cc/dd/two.webp" } },
            // Same photo as slide 1 at a different size/format.
            { images_orig: { url: "https://i.pinimg.com/736x/aa/bb/one.jpg" } },
          ],
        },
      })
    );
    const result = await resolvePinterestPin(PIN, "image");
    expect(result.type).toBe("CAROUSEL");
    expect(result.media).toHaveLength(2);
    expect(result.media.every((m) => m.type === "image")).toBe(true);
  });
});

describe("resolvePinterestPin — Auto Detect", () => {
  it("classifies an image-only pin as PHOTO", async () => {
    stubPinPage(IMAGE_HTML);
    const result = await resolvePinterestPin(PIN, "any");
    expect(result.type).toBe("PHOTO");
    expect(result.media.map((m) => m.type)).toEqual(["image"]);
  });

  it("classifies a multi-image pin as CAROUSEL", async () => {
    stubPinPage(
      relayHtml({
        carouselData: {
          slides: [
            { images_orig: { url: "https://i.pinimg.com/originals/aa/bb/one.webp" } },
            { images_orig: { url: "https://i.pinimg.com/originals/cc/dd/two.webp" } },
          ],
        },
      })
    );
    const result = await resolvePinterestPin(PIN, "any");
    expect(result.type).toBe("CAROUSEL");
    expect(result.media).toHaveLength(2);
  });

  it("classifies a video pin with a thumbnail as VIDEO (never the thumbnail)", async () => {
    stubPinPage(
      relayHtml({
        images_orig: { url: "https://i.pinimg.com/originals/aa/bb/poster.jpg", width: 1000, height: 1500 },
        images_236x: { url: "https://i.pinimg.com/236x/aa/bb/poster.jpg", width: 236, height: 354 },
        videos: { videoUrls: ["https://v1.pinimg.com/videos/mc/720p/clip.mp4"] },
      })
    );
    const result = await resolvePinterestPin(PIN, "any");
    expect(result.type).toBe("VIDEO");
    expect(result.media.map((m) => m.type)).toEqual(["video"]);
    expect(result.thumbnail).toBe("https://i.pinimg.com/236x/aa/bb/poster.jpg");
  });

  it("auto-detects a video carried only in a top-level video_list", async () => {
    stubPinPage(
      relayHtml({
        images_orig: { url: "https://i.pinimg.com/originals/aa/bb/poster.jpg", width: 1000, height: 1500 },
        video_list: {
          v720P: {
            url: "https://v1.pinimg.com/videos/mc/720p/clip.mp4",
            width: 720,
            height: 1280,
            contentType: "video/mp4",
          },
        },
      })
    );
    const result = await resolvePinterestPin(PIN, "any");
    expect(result.type).toBe("VIDEO");
    expect(result.media.map((m) => m.url)).toEqual(["https://v1.pinimg.com/videos/mc/720p/clip.mp4"]);
    expect(result.media[0].height).toBe(1280);
    expect(result.thumbnail).toBe("https://i.pinimg.com/originals/aa/bb/poster.jpg");
  });

  it("never classifies a thumbnail listed as a video candidate as VIDEO", async () => {
    stubPinPage(
      relayHtml({
        images_orig: { url: "https://i.pinimg.com/originals/aa/bb/poster.jpg" },
        videos: {
          videoUrls: ["https://i.pinimg.com/videos/thumbnails/originals/aa/bb/poster.0000000.jpg"],
        },
      })
    );
    await expect(resolvePinterestPin(PIN, "video")).rejects.toMatchObject({ code: "PINTEREST_NO_VIDEO" });
  });

  it("falls back to images when the only video candidate is not media", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("/pin/")) {
          return html(
            relayHtml({
              images_orig: { url: "https://i.pinimg.com/originals/aa/bb/real.jpg" },
              videos: { videoUrls: ["https://v1.pinimg.com/videos/mc/720p/fake.mp4"] },
            })
          );
        }
        if (String(url).includes("v1.pinimg.com")) return html("<html>not media</html>");
        return new Response(null, { status: 206, headers: { "content-type": "image/jpeg" } });
      })
    );
    const result = await resolvePinterestPin(PIN, "any");
    expect(result.type).toBe("PHOTO");
    expect(result.media.map((m) => m.type)).toEqual(["image"]);
  });
});

describe("resolvePinterestPin — upstream resilience", () => {
  it("retries after a 429 (honoring Retry-After) and then resolves", async () => {
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        calls += 1;
        if (String(url).includes("/pin/")) {
          if (calls === 1) return new Response("", { status: 429, headers: { "retry-after": "0" } });
          return html(PIN_HTML);
        }
        return new Response(null, { status: 206, headers: { "content-type": "video/mp4" } });
      })
    );
    const result = await resolvePinterestPin(PIN, "video");
    expect(result.type).toBe("VIDEO");
    expect(calls).toBeGreaterThanOrEqual(3);
  });

  it("gives up after bounded retries on a persistent 5xx", async () => {
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        calls += 1;
        return new Response("", { status: 503 });
      })
    );
    await expect(resolvePinterestPin(PIN, "video")).rejects.toMatchObject({ code: "PINTEREST_UPSTREAM_ERROR" });
    expect(calls).toBe(3);
  });

  it("does not retry a permanent 404", async () => {
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        calls += 1;
        return new Response("", { status: 404 });
      })
    );
    await expect(resolvePinterestPin(PIN, "video")).rejects.toMatchObject({ code: "PINTEREST_PIN_NOT_FOUND" });
    expect(calls).toBe(1);
  });

  it("maps a persistent upstream timeout to PINTEREST_TIMEOUT", async () => {
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        calls += 1;
        const err = new Error("The operation was aborted.");
        err.name = "AbortError";
        throw err;
      })
    );
    await expect(resolvePinterestPin(PIN, "video")).rejects.toMatchObject({ code: "PINTEREST_TIMEOUT" });
    expect(calls).toBe(3);
  });

  it("rejects a redirect that leaves Pinterest", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 302, headers: { location: "https://evil.example.com/x" } }))
    );
    await expect(resolvePinterestPin(PIN, "video")).rejects.toMatchObject({ code: "PINTEREST_PIN_RESTRICTED" });
  });

  it("drops a media URL that serves an HTML page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("/pin/")) return html(PIN_HTML);
        return html("<html>not media</html>");
      })
    );
    await expect(resolvePinterestPin(PIN, "video")).rejects.toMatchObject({ code: "PINTEREST_PARSE_FAILED" });
  });

  it("does not return a video candidate that is actually an image", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("/pin/")) return html(VIDEO_HTML);
        return new Response(null, { status: 200, headers: { "content-type": "image/jpeg" } });
      })
    );
    await expect(resolvePinterestPin(PIN, "video")).rejects.toMatchObject({ code: "PINTEREST_PARSE_FAILED" });
  });

  it("does not return a missing video URL as a playable video", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("/pin/")) return html(VIDEO_HTML);
        return new Response(null, { status: 404, headers: { "content-type": "text/html" } });
      })
    );
    await expect(resolvePinterestPin(PIN, "video")).rejects.toMatchObject({ code: "PINTEREST_PARSE_FAILED" });
  });
});

describe("resolvePinterestPin — modern story/carousel video metadata", () => {
  it("auto-detects a story video stored only in videoDataV2", async () => {
    stubPinPage(
      relayHtml({
        images_orig: { url: "https://i.pinimg.com/originals/aa/bb/cover.jpg", width: 1080, height: 1920 },
        videos: null,
        storyPinData: {
          pages: [
            {
              blocks: [
                {
                  videoDataV2: {
                    videoList720P: {
                      v720P: {
                        url: "https://v1.pinimg.com/videos/iht/720p/story.mp4",
                        width: 1080,
                        height: 1920,
                      },
                    },
                  },
                },
              ],
            },
          ],
        },
      })
    );
    const result = await resolvePinterestPin(PIN, "any");
    expect(result.type).toBe("VIDEO");
    expect(result.media.map((m) => m.url)).toEqual(["https://v1.pinimg.com/videos/iht/720p/story.mp4"]);
  });
});
