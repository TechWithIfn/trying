import { describe, it, expect, vi, afterEach } from "vitest";
import { ExternalProvider } from "@/lib/providers/external";

function mockFetch(data: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  });
}

describe("ExternalProvider", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("sends correct request to provider", async () => {
    const fetchMock = mockFetch({
      success: true,
      data: {
        type: "REEL",
        media: [{ url: "https://cdn.example.com/video.mp4", type: "video" }],
      },
    });
    global.fetch = fetchMock;

    const provider = new ExternalProvider(
      "https://api.example.com/resolve",
      "test-key"
    );
    await provider.resolve("https://www.instagram.com/reel/Cxyz123/");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/resolve",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer test-key",
        }),
        body: JSON.stringify({
          url: "https://www.instagram.com/reel/Cxyz123/",
        }),
      })
    );
  });

  it("normalizes reel response", async () => {
    global.fetch = mockFetch({
      success: true,
      data: {
        type: "reel",
        caption: "Test reel caption",
        author: { username: "testuser", display_name: "Test User" },
        thumbnail: "https://cdn.example.com/thumb.jpg",
        media: [
          {
            url: "https://cdn.example.com/video.mp4",
            type: "video",
            width: 1080,
            height: 1920,
            duration: 15,
            format: "mp4",
          },
        ],
      },
    });

    const provider = new ExternalProvider(
      "https://api.example.com/resolve",
      "test-key"
    );
    const result = await provider.resolve(
      "https://www.instagram.com/reel/Cxyz123/"
    );

    expect(result.type).toBe("REEL");
    expect(result.title).toBe("Test reel caption");
    expect(result.author?.username).toBe("testuser");
    expect(result.author?.displayName).toBe("Test User");
    expect(result.thumbnail).toBe("https://cdn.example.com/thumb.jpg");
    expect(result.media).toHaveLength(1);
    expect(result.media[0].url).toBe("https://cdn.example.com/video.mp4");
    expect(result.media[0].type).toBe("video");
    expect(result.media[0].width).toBe(1080);
    expect(result.media[0].height).toBe(1920);
    expect(result.media[0].duration).toBe(15);
    expect(result.media[0].format).toBe("mp4");
  });

  it("normalizes carousel response with multiple items", async () => {
    global.fetch = mockFetch({
      success: true,
      data: {
        type: "POST",
        media: [
          { url: "https://cdn.example.com/1.jpg", type: "image" },
          { url: "https://cdn.example.com/2.jpg", type: "image" },
          { url: "https://cdn.example.com/3.jpg", type: "image" },
        ],
      },
    });

    const provider = new ExternalProvider(
      "https://api.example.com/resolve",
      "test-key"
    );
    const result = await provider.resolve(
      "https://www.instagram.com/p/Cxyz123/"
    );

    expect(result.type).toBe("POST");
    expect(result.media).toHaveLength(3);
    expect(result.media[0].type).toBe("image");
    expect(result.media[1].type).toBe("image");
    expect(result.media[2].type).toBe("image");
  });

  it("preserves a direct authorized audio source", async () => {
    global.fetch = mockFetch({
      success: true,
      data: {
        type: "AUDIO",
        media: [{ url: "https://audio.example.com/source.m4a", type: "audio", duration: 12.5 }],
      },
    });

    const provider = new ExternalProvider(
      "https://api.example.com/resolve",
      "test-key"
    );
    const result = await provider.resolve(
      "https://www.instagram.com/reels/audio/123456789/"
    );

    expect(result.type).toBe("AUDIO");
    expect(result.media[0].type).toBe("audio");
    expect(result.media[0].format).toBe("mp3");
    expect(result.media[0].duration).toBe(12.5);
  });

  it("rejects unsafe media URLs (localhost)", async () => {
    global.fetch = mockFetch({
      success: true,
      data: {
        type: "POST",
        media: [{ url: "http://localhost:3000/secret", type: "image" }],
      },
    });

    const provider = new ExternalProvider(
      "https://api.example.com/resolve",
      "test-key"
    );
    await expect(
      provider.resolve("https://www.instagram.com/p/Cxyz123/")
    ).rejects.toThrow();
  });

  it("rejects unsafe media URLs (private IP)", async () => {
    global.fetch = mockFetch({
      success: true,
      data: {
        type: "POST",
        media: [{ url: "http://192.168.1.1/secret", type: "image" }],
      },
    });

    const provider = new ExternalProvider(
      "https://api.example.com/resolve",
      "test-key"
    );
    await expect(
      provider.resolve("https://www.instagram.com/p/Cxyz123/")
    ).rejects.toThrow();
  });

  it("rejects unsafe media URLs (link-local)", async () => {
    global.fetch = mockFetch({
      success: true,
      data: {
        type: "POST",
        media: [{ url: "http://169.254.169.254/metadata", type: "image" }],
      },
    });

    const provider = new ExternalProvider(
      "https://api.example.com/resolve",
      "test-key"
    );
    await expect(
      provider.resolve("https://www.instagram.com/p/Cxyz123/")
    ).rejects.toThrow();
  });

  it("rejects unsafe media URLs (cloud metadata)", async () => {
    global.fetch = mockFetch({
      success: true,
      data: {
        type: "POST",
        media: [{ url: "http://metadata.google.internal/computeMetadata/v1", type: "image" }],
      },
    });

    const provider = new ExternalProvider(
      "https://api.example.com/resolve",
      "test-key"
    );
    await expect(
      provider.resolve("https://www.instagram.com/p/Cxyz123/")
    ).rejects.toThrow();
  });

  it("rejects javascript: media URLs", async () => {
    global.fetch = mockFetch({
      success: true,
      data: {
        type: "POST",
        media: [{ url: "javascript:alert(1)", type: "image" }],
      },
    });

    const provider = new ExternalProvider(
      "https://api.example.com/resolve",
      "test-key"
    );
    await expect(
      provider.resolve("https://www.instagram.com/p/Cxyz123/")
    ).rejects.toThrow();
  });

  it("handles provider 401/403", async () => {
    global.fetch = mockFetch({ error: "unauthorized" }, 401);

    const provider = new ExternalProvider(
      "https://api.example.com/resolve",
      "bad-key"
    );
    await expect(
      provider.resolve("https://www.instagram.com/p/Cxyz123/")
    ).rejects.toThrow();
  });

  it("handles provider 429", async () => {
    global.fetch = mockFetch({ error: "rate limited" }, 429);

    const provider = new ExternalProvider(
      "https://api.example.com/resolve",
      "test-key"
    );
    await expect(
      provider.resolve("https://www.instagram.com/p/Cxyz123/")
    ).rejects.toThrow();
  });

  it("handles provider 404", async () => {
    global.fetch = mockFetch({ error: "not found" }, 404);

    const provider = new ExternalProvider(
      "https://api.example.com/resolve",
      "test-key"
    );
    await expect(
      provider.resolve("https://www.instagram.com/p/Cxyz123/")
    ).rejects.toThrow();
  });

  it("handles malformed JSON response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.reject(new Error("invalid json")),
    });

    const provider = new ExternalProvider(
      "https://api.example.com/resolve",
      "test-key"
    );
    await expect(
      provider.resolve("https://www.instagram.com/p/Cxyz123/")
    ).rejects.toThrow();
  });

  it("handles empty media array", async () => {
    global.fetch = mockFetch({
      success: true,
      data: { type: "POST", media: [] },
    });

    const provider = new ExternalProvider(
      "https://api.example.com/resolve",
      "test-key"
    );
    await expect(
      provider.resolve("https://www.instagram.com/p/Cxyz123/")
    ).rejects.toThrow();
  });

  it("handles provider timeout", async () => {
    global.fetch = vi.fn().mockImplementation(
      () =>
        new Promise((_, reject) => {
          setTimeout(
            () => reject(new DOMException("Aborted", "AbortError")),
            50
          );
        })
    );

    const provider = new ExternalProvider(
      "https://api.example.com/resolve",
      "test-key"
    );
    await expect(
      provider.resolve("https://www.instagram.com/p/Cxyz123/")
    ).rejects.toThrow();
  });

  it("filters out items with missing URLs", async () => {
    global.fetch = mockFetch({
      success: true,
      data: {
        type: "POST",
        media: [
          { url: "https://cdn.example.com/1.jpg", type: "image" },
          { url: "", type: "image" },
          { type: "image" },
        ],
      },
    });

    const provider = new ExternalProvider(
      "https://api.example.com/resolve",
      "test-key"
    );
    const result = await provider.resolve(
      "https://www.instagram.com/p/Cxyz123/"
    );
    expect(result.media).toHaveLength(1);
  });

  it("handles missing author gracefully", async () => {
    global.fetch = mockFetch({
      success: true,
      data: {
        type: "POST",
        media: [{ url: "https://cdn.example.com/1.jpg", type: "image" }],
      },
    });

    const provider = new ExternalProvider(
      "https://api.example.com/resolve",
      "test-key"
    );
    const result = await provider.resolve(
      "https://www.instagram.com/p/Cxyz123/"
    );
    expect(result.author).toBeNull();
  });

  it("resolveStoryUrl uses GET ?handle= with Bearer auth and no body", async () => {
    const fetchMock = mockFetch({ data: { items: [] } });
    global.fetch = fetchMock;

    const provider = new ExternalProvider(
      "https://api.profilequery.com/v1/profile/stories",
      "story-key"
    );
    await expect(
      provider.resolveStoryUrl("https://www.instagram.com/stories/someuser/", "someuser")
    ).rejects.toMatchObject({ code: "CONTENT_UNAVAILABLE" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.profilequery.com/v1/profile/stories?handle=someuser",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ Authorization: "Bearer story-key" }),
      })
    );
    const [, init] = fetchMock.mock.calls[0] as [string, { body?: unknown }];
    expect(init.body).toBeUndefined();
  });

  it("normalizeStoryItems maps video and photo items, skipping media-less entries", async () => {
    global.fetch = mockFetch({
      data: {
        items: [
          { id: "1", shortcode: "A", type: "video", video_url: "https://cdn.example.com/s1.mp4", image_url: "https://cdn.example.com/s1.jpg", video_duration: 7 },
          { id: "2", shortcode: "B", type: "photo", image_url: "https://cdn.example.com/s2.jpg" },
          { id: "3", shortcode: "C", type: "video" },
        ],
      },
    });
    const provider = new ExternalProvider(
      "https://api.profilequery.com/v1/profile/stories",
      "story-key"
    );
    const result = await provider.resolveStoryUrl("https://www.instagram.com/stories/someuser/", "someuser");
    expect(result.type).toBe("STORY");
    expect(result.media).toHaveLength(2);
    expect(result.media[0]).toMatchObject({ type: "video", url: "https://cdn.example.com/s1.mp4", thumbnail: "https://cdn.example.com/s1.jpg" });
    expect(result.media[1]).toMatchObject({ type: "image", url: "https://cdn.example.com/s2.jpg" });
    expect(result.author?.username).toBe("someuser");
  });

  it("prefers the video rendition over a photo label (story with music)", async () => {
    global.fetch = mockFetch({
      data: {
        items: [
          { id: "1", shortcode: "A", type: "image", video_url: "https://cdn.example.com/music.mp4", image_url: "https://cdn.example.com/music.jpg" },
        ],
      },
    });
    const provider = new ExternalProvider(
      "https://api.profilequery.com/v1/profile/stories",
      "story-key"
    );
    const result = await provider.resolveStoryUrl("https://www.instagram.com/stories/someuser/", "someuser");
    expect(result.media).toHaveLength(1);
    expect(result.media[0]).toMatchObject({
      type: "video",
      url: "https://cdn.example.com/music.mp4",
      format: "mp4",
    });
    expect(result.media[0].url).not.toContain(".jpg");
  });

  it.each([
    [401, "PROVIDER_NOT_CONFIGURED"],
    [404, "CONTENT_NOT_FOUND"],
    [429, "PROVIDER_RATE_LIMITED"],
  ])("resolveStoryUrl maps HTTP %i to %s", async (status, code) => {
    global.fetch = mockFetch({}, status);
    const provider = new ExternalProvider(
      "https://api.profilequery.com/v1/profile/stories",
      "story-key"
    );
    await expect(
      provider.resolveStoryUrl("https://www.instagram.com/stories/someuser/", "someuser")
    ).rejects.toMatchObject({ code });
  });

  it("handles missing optional fields", async () => {
    global.fetch = mockFetch({
      success: true,
      data: {
        type: "POST",
        media: [{ url: "https://cdn.example.com/1.jpg" }],
      },
    });

    const provider = new ExternalProvider(
      "https://api.example.com/resolve",
      "test-key"
    );
    const result = await provider.resolve(
      "https://www.instagram.com/p/Cxyz123/"
    );
    expect(result.media[0].width).toBeNull();
    expect(result.media[0].height).toBeNull();
    expect(result.media[0].duration).toBeNull();
    expect(result.media[0].format).toBeNull();
    expect(result.media[0].thumbnail).toBeNull();
  });

  it.each([
    ["video_url", { video_url: "https://cdn.example.com/v.mp4", type: "video" }],
    ["image_url", { image_url: "https://cdn.example.com/i.jpg", type: "image" }],
    ["media_url", { media_url: "https://cdn.example.com/m.mp4", type: "video" }],
    ["thumbnail_url", { url: "https://cdn.example.com/m.mp4", type: "video", thumbnail_url: "https://cdn.example.com/t.jpg" }],
  ])("accepts the %s provider dialect", async (_name, item) => {
    global.fetch = mockFetch({ success: true, data: { type: "STORY", media: [item] } });
    const provider = new ExternalProvider("https://api.example.com/resolve", "test-key");
    const result = await provider.resolve("https://www.instagram.com/stories/someuser/");
    expect(result.media).toHaveLength(1);
    expect(result.media[0].url).toMatch(/^https:\/\/cdn\.example\.com\//);
  });

  it("accepts video_versions / image_versions2 candidates", async () => {
    global.fetch = mockFetch({
      success: true,
      data: {
        type: "STORY",
        media: [
          { video_versions: [{ url: "https://cdn.example.com/v.mp4", width: 1080, height: 1920 }] },
          { image_versions2: { candidates: [{ url: "https://cdn.example.com/i.jpg" }] } },
        ],
      },
    });
    const provider = new ExternalProvider("https://api.example.com/resolve", "test-key");
    const result = await provider.resolve("https://www.instagram.com/stories/someuser/");
    expect(result.media).toHaveLength(2);
  });

  it("skips unsafe URLs and fails only when nothing valid remains", async () => {
    global.fetch = mockFetch({
      success: true,
      data: { type: "STORY", media: [{ url: "javascript:alert(1)" }, { url: "https://169.254.169.254/x" }] },
    });
    const provider = new ExternalProvider("https://api.example.com/resolve", "test-key");
    await expect(provider.resolve("https://www.instagram.com/stories/someuser/")).rejects.toMatchObject({
      code: "CONTENT_UNAVAILABLE",
    });
  });

  it.each([
    [{ code: "not_found" }, "CONTENT_NOT_FOUND"],
    [{ code: "media_expired" }, "STORY_EXPIRED"],
    [{ code: "private_account" }, "PRIVATE_ACCOUNT"],
    [{ code: "rate_limited" }, "PROVIDER_RATE_LIMITED"],
    [{ code: "mystery" }, "CONTENT_UNAVAILABLE"],
    [{ message: "Story is gone" }, "STORY_EXPIRED"],
    [{ code: "not_found", reason: "private_account" }, "PRIVATE_ACCOUNT"],
    [{ code: "not_found", reason: "no_public_data" }, "CONTENT_NOT_FOUND"],
    [{ code: "insufficient_credits" }, "PROVIDER_UNAVAILABLE"],
    [{ code: "upstream_error" }, "PROVIDER_UNAVAILABLE"],
    [{ code: "upstream_timeout" }, "PROVIDER_TIMEOUT"],
  ])("maps provider failure %p to %s", async (error, code) => {
    global.fetch = mockFetch({ success: false, error });
    const provider = new ExternalProvider("https://api.example.com/resolve", "test-key");
    await expect(provider.resolve("https://www.instagram.com/stories/someuser/")).rejects.toMatchObject({
      code,
    });
  });
});
