import { describe, it, expect, afterEach } from "vitest";
import { validateInstagramUrl } from "@/lib/validators/instagram-url";
import { ERRORS } from "@/lib/errors";
import {
  scoreStoryCandidate,
  extractStoryCandidatesFromHtml,
  extractUserIdFromWebProfileInfo,
  finalProfileError,
  createStoryResolveState,
  storyProviderMode,
  shouldTryExternalFirst,
  classifyStoryMediaKind,
  detectStoryBytesContentType,
  parseReelsMediaResponse,
  STORY_BUDGETS,
} from "@/lib/story-resolve";

const VIDEO_URL =
  "https://scontent.cdninstagram.com/v/t51.29345-15/12345_67890.mp4?stp=dst";
const IMAGE_URL =
  "https://scontent.cdninstagram.com/v/t51.29345-15/12345_67890.jpg?stp=dst";

describe("story profile URL classification", () => {
  it("accepts /stories/USERNAME/ as STORY_PROFILE", () => {
    const result = validateInstagramUrl("https://www.instagram.com/stories/codedsoul_05/");
    expect(result.valid).toBe(true);
    expect(result.parsed?.contentType).toBe("STORY_PROFILE");
    expect(result.parsed?.storyUsername).toBe("codedsoul_05");
    expect(result.parsed?.storyId).toBeNull();
  });

  it("accepts /stories/USERNAME/STORY_ID/ as STORY", () => {
    const result = validateInstagramUrl(
      "https://www.instagram.com/stories/codedsoul_05/1234567890123456789/"
    );
    expect(result.valid).toBe(true);
    expect(result.parsed?.contentType).toBe("STORY");
    expect(result.parsed?.storyUsername).toBe("codedsoul_05");
    expect(result.parsed?.storyId).toBe("1234567890123456789");
  });

  it("accepts singular /story/USERNAME/STORY_ID/ as STORY", () => {
    const result = validateInstagramUrl("https://www.instagram.com/story/someuser/12345/");
    expect(result.valid).toBe(true);
    expect(result.parsed?.contentType).toBe("STORY");
    expect(result.parsed?.storyUsername).toBe("someuser");
  });

  it("still rejects non-Instagram URLs", () => {
    const result = validateInstagramUrl("https://www.google.com/p/ABC/");
    expect(result.valid).toBe(false);
  });

  it("still rejects unsupported Instagram paths", () => {
    const result = validateInstagramUrl("https://www.instagram.com/direct/inbox/");
    expect(result.valid).toBe(false);
  });
});

describe("scoreStoryCandidate evidence filtering", () => {
  it("keeps a story-context video with evidence", () => {
    const c = scoreStoryCandidate(VIDEO_URL, '"reels_media" items video_versions', { kind: "video" });
    expect(c).not.toBeNull();
    expect(c?.type).toBe("video");
    expect(c?.evidence.length).toBeGreaterThan(0);
  });

  it("keeps a story-context image", () => {
    const c = scoreStoryCandidate(IMAGE_URL, '"story_tray" image_versions2', { kind: "image" });
    expect(c).not.toBeNull();
    expect(c?.type).toBe("image");
  });

  it("rejects unrelated CDN media with no story evidence", () => {
    const c = scoreStoryCandidate(IMAGE_URL, "some random page footer text", { kind: "image" });
    expect(c).toBeNull();
  });

  it("rejects profile/avatar URLs even with story words nearby", () => {
    const c = scoreStoryCandidate(
      "https://scontent.cdninstagram.com/v/t51.2885-19/avatar_s150x150.jpg",
      '"story_tray" profile picture',
      { kind: "image" }
    );
    expect(c).toBeNull();
  });

  it("rejects DASH segments", () => {
    const c = scoreStoryCandidate(
      "https://scontent.cdninstagram.com/v/seg-12.m4s?bytestart=0",
      '"reels_media" dash manifest',
      { kind: "video" }
    );
    expect(c).toBeNull();
  });

  it("rejects tiny avatar-size renditions", () => {
    const c = scoreStoryCandidate(IMAGE_URL, '"reels_media" items', {
      kind: "image",
      width: 150,
      height: 150,
    });
    expect(c).toBeNull();
  });

  it("prefers video over image at equal evidence (sort check)", () => {
    const v = scoreStoryCandidate(VIDEO_URL, '"reels_media"', { kind: "video" });
    const i = scoreStoryCandidate(IMAGE_URL, '"reels_media"', { kind: "image" });
    expect(v && i && v.score).toBeGreaterThan(i.score);
  });
});

describe("extractStoryCandidatesFromHtml", () => {
  it("extracts embedded video_versions with story markers", () => {
    const html = `<html><body>"story_tray" "video_versions":[{"url":"${VIDEO_URL}","width":1080,"height":1920}]</body></html>`;
    const found = extractStoryCandidatesFromHtml(html, "someuser");
    expect(found.candidates.length).toBeGreaterThan(0);
    expect(found.videoCount).toBeGreaterThan(0);
    expect(found.storyMarkersFound).toBe(true);
    expect(found.emptyShell).toBe(false);
  });

  it("detects an empty shell (no markers, no media)", () => {
    const html = `<html><body><div id="root"></div><script src="/static/app.js"></script></body></html>`;
    const found = extractStoryCandidatesFromHtml(html, "someuser");
    expect(found.candidates).toHaveLength(0);
    expect(found.storyMarkersFound).toBe(false);
    expect(found.emptyShell).toBe(true);
  });

  it("dedupes identical CDN URLs", () => {
    const html = `<html><body>"reels_media" "video_versions":[{"url":"${VIDEO_URL}","width":1080,"height":1920}] "video_versions":[{"url":"${VIDEO_URL}","width":1080,"height":1920}]</body></html>`;
    const found = extractStoryCandidatesFromHtml(html, "someuser");
    const urls = found.candidates.map((c) => c.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("does not mistake a login wall for an empty shell", () => {
    const html = `<html><body>Log in to Instagram<form name="username"></form></body></html>`;
    const found = extractStoryCandidatesFromHtml(html, "someuser");
    expect(found.emptyShell).toBe(false);
  });
});

describe("video priority over image posters", () => {
  const PAGE_VIDEO =
    "https://scontent.cdninstagram.com/v/t51.29345-15/111_222.mp4?stp=dst";
  const PAGE_IMAGE =
    "https://scontent.cdninstagram.com/v/t51.29345-15/111_222.jpg?stp=dst-jpg_e35_tt6";

  it("ranks a video above an image with identical context", () => {
    const html =
      `<html><body>"story_tray" "video_versions":[{"url":"${PAGE_VIDEO}","width":720,"height":1280}],` +
      `"image_versions2":{"candidates":[{"url":"${PAGE_IMAGE}","width":720,"height":1280}]}</body></html>`;
    const found = extractStoryCandidatesFromHtml(html, "someuser");
    expect(found.videoCount).toBeGreaterThan(0);
    expect(found.candidates[0]?.type).toBe("video");
  });

  it("flags video evidence even when only a poster image is extractable", () => {
    const html =
      `<html><body>"story_tray" "is_video":true "media_type":2 "playback_url":"https://example.com/x"` +
      `"image_versions2":{"candidates":[{"url":"${PAGE_IMAGE}","width":1080,"height":1920}]}</body></html>`;
    const found = extractStoryCandidatesFromHtml(html, "someuser");
    expect(found.videoCount).toBe(0);
    expect(found.videoEvidencePresent).toBe(true);
  });

  it("ignores video evidence far from story structures (video post elsewhere)", () => {
    const filler = "x".repeat(20000);
    const html =
      `<html><body>"story_tray" "image_versions2":{"candidates":[{"url":"${PAGE_IMAGE}","width":1080,"height":1920}]}` +
      `${filler}"edge_owner_to_timeline_media" "video_versions":[{"url":"${PAGE_VIDEO}","width":640,"height":640}]</body></html>`;
    const found = extractStoryCandidatesFromHtml(html, "someuser");
    // The distant video_versions belongs to a grid post, not the story tray:
    // no veto, and the story-scoped image still outscores it.
    expect(found.videoEvidencePresent).toBe(false);
    expect(found.candidates.length).toBeGreaterThan(0);
    expect(found.candidates[0]?.type).toBe("image");
  });

  it("still returns a genuine image story (no video evidence anywhere)", () => {
    const html =
      `<html><body>"story_tray" "image_versions2":{"candidates":[{"url":"${PAGE_IMAGE}","width":1080,"height":1920}]}</body></html>`;
    const found = extractStoryCandidatesFromHtml(html, "someuser");
    expect(found.videoEvidencePresent).toBe(false);
    expect(found.candidates.length).toBeGreaterThan(0);
    expect(found.candidates[0]?.type).toBe("image");
  });

  it("demotes HEIC transform URLs below regular images", () => {
    const heic = scoreStoryCandidate(
      "https://scontent.cdninstagram.com/v/t51.29345-15/111.heic?stp=dst-jpg_e35_tt6",
      '"story_tray" image_versions2',
      { kind: "image", width: 1080, height: 1920 }
    );
    const jpg = scoreStoryCandidate(PAGE_IMAGE, '"story_tray" image_versions2', {
      kind: "image",
      width: 1080,
      height: 1920,
    });
    expect(heic).not.toBeNull();
    expect(jpg).not.toBeNull();
    expect(heic!.score).toBeLessThan(jpg!.score);
    expect(heic!.evidence).toContain("heic-penalty");
  });

  it("rejects post-grid HEIC images with no tray context (the poster bug)", () => {
    // Exact shape of the wrongly-selected irfan_04m candidate: a 3:4 HEIC
    // post rendition whose only "evidence" was its own image_versions2 block.
    const c = scoreStoryCandidate(
      "https://instagram.fdel93-3.fna.fbcdn.net/v/t51.82787-15/830453516_17920216380436842_4764884966635084907_n.heic?stp=dst-jpg_e35_tt6",
      '"edge_owner_to_timeline_media" "image_versions2"',
      { kind: "image", width: 1440, height: 1920 }
    );
    expect(c).toBeNull();
  });

  it("rejects 9:16 clip cover frames with no tray association", () => {
    // video_nframe_cover_frame posters are 9:16 yet belong to clips grid
    // posts — dimensions alone must never qualify page-HTML candidates.
    const c = scoreStoryCandidate(
      "https://instagram.fdel11-3.fna.fbcdn.net/v/t51.71878-15/690110757_821507470642928_n.jpg?stp=dst-jpg_e15_tt6",
      '"edge_clips_to_timeline_media" "image_versions2"',
      { kind: "image", width: 640, height: 1136 }
    );
    expect(c).toBeNull();
  });

  it("rejects square post images that only match generic items context", () => {
    const c = scoreStoryCandidate(
      "https://scontent.cdninstagram.com/v/t51.29345-15/111_222.jpg?stp=dst",
      '"items"',
      { kind: "image", width: 640, height: 640 }
    );
    expect(c).toBeNull();
  });

  it("never mistakes 1440x1920 resolution alone for image type", () => {
    const c = scoreStoryCandidate(PAGE_VIDEO, '"reels_media" video_versions', {
      kind: "video",
      width: 1440,
      height: 1920,
    });
    expect(c?.type).toBe("video");
  });
});

describe("finalProfileError accuracy", () => {
  const base = {
    privateHint: false,
    sawLoginWall: false,
    sawAuthedWall: false,
    authedStatus: null as number | null,
    emptyShellCount: 0,
    strategiesTried: [] as string[],
    userExists: false,
    requestId: null,
    webProfileStatus: null as number | null,
    reelsStatus: null as number | null,
    lastParsedCount: null as number | null,
    sessionWasConfigured: false,
  };

  it("returns PRIVATE_ACCOUNT for private accounts", () => {
    const err = finalProfileError("someuser", { ...base, privateHint: true });
    expect(err.code).toBe("PRIVATE_ACCOUNT");
    expect(err.statusCode).toBe(403);
  });

  it("returns NO_STORY when the user exists but the tray is empty", () => {
    const err = finalProfileError("someuser", {
      ...base,
      userExists: true,
      strategiesTried: ["reels_media", "pages-html"],
    });
    expect(err.code).toBe("NO_STORY");
    expect(err.message).toContain("someuser");
  });

  it("returns FETCH_FAILED (never NO_STORY) on anonymous login walls", () => {
    const err = finalProfileError("someuser", {
      ...base,
      sawLoginWall: true,
      strategiesTried: ["reels_media"],
    });
    expect(err.code).toBe("FETCH_FAILED");
  });

  it("returns NO_STORY for anonymous 401s + clean empty tray", () => {
    // The exact past over-classification: public-API 401s (endpoint wants a
    // session) must not outrank an authenticated-looking empty tray.
    const err = finalProfileError("someuser", {
      ...base,
      sawLoginWall: true,
      userExists: true,
      strategiesTried: ["reels_media", "pages-html"],
    });
    expect(err.code).toBe("NO_STORY");
  });

  it("returns SESSION_EXPIRED on authenticated walls (dead session proof)", () => {
    const err = finalProfileError("someuser", {
      ...base,
      sawLoginWall: true,
      sawAuthedWall: true,
      authedStatus: 401,
      userExists: true,
      strategiesTried: ["reels_media"],
    });
    expect(err.code).toBe("SESSION_EXPIRED");
    expect(err.statusCode).toBe(401);
  });

  it("returns NO_STORY for a proven-live empty tray", () => {
    const err = finalProfileError("someuser", {
      ...base,
      userExists: true,
      authedStatus: 200,
      sessionWasConfigured: true,
      strategiesTried: ["reels_media", "pages-html"],
    });
    expect(err.code).toBe("NO_STORY");
  });

  it("returns SESSION_EXPIRED for configured-but-unproven sessions", () => {
    const err = finalProfileError("someuser", {
      ...base,
      userExists: true,
      sessionWasConfigured: true,
      strategiesTried: ["reels_media", "pages-html"],
    });
    expect(err.code).toBe("SESSION_EXPIRED");
  });

  it("returns STORY_MEDIA_EXPIRED for expired media", () => {
    const err = finalProfileError("someuser", { ...base, sawExpiredMedia: true });
    expect(err.code).toBe("STORY_MEDIA_EXPIRED");
    expect(err.statusCode).toBe(410);
  });

  it("returns FETCH_FAILED for failed verification", () => {
    const err = finalProfileError("someuser", { ...base, sawInvalidCandidates: true });
    expect(err.code).toBe("FETCH_FAILED");
  });

  it("never claims 'no stories' when discovery merely failed", () => {
    const err = finalProfileError("someuser", { ...base, strategiesTried: ["reels_media"] });
    expect(err.code).not.toBe("CONTENT_NOT_FOUND");
    expect(err.message).not.toMatch(/no viewable stories/i);
  });

  it("returns FETCH_FAILED for unknown tray structure, not NO_STORY", () => {
    const err = finalProfileError("someuser", {
      ...base,
      userExists: true,
      strategiesTried: ["reels_media", "pages-html"],
      trayStructureUnknown: true,
    });
    expect(err.code).toBe("FETCH_FAILED");
  });
});

describe("story resolve state (duplicate-guard bookkeeping)", () => {
  it("starts with no cached profile HTML and no strategies tried", () => {
    const state = createStoryResolveState();
    expect(state.cachedProfileHtml).toBeNull();
    expect(state.strategiesTried).toEqual([]);
    expect(state.browserAttempted).toBe(false);
    expect(state.rateLimited).toBe(false);
    expect(state.sawLoginWall).toBe(false);
  });
});

describe("shouldTryExternalFirst (provider-first ordering)", () => {
  const keys = ["STORY_PROVIDER", "STORY_PROVIDER_URL", "STORY_PROVIDER_API_KEY", "PROVIDER_API_URL", "PROVIDER_API_KEY"] as const;
  const saved: Record<string, string | undefined> = {};
  const setEnv = (key: string, value: string | undefined) => {
    if (!(key in saved)) saved[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  };

  it("is false without credentials in any mode", () => {
    try {
      for (const k of keys) setEnv(k, undefined);
      process.env.STORY_PROVIDER_URL = "";
      expect(shouldTryExternalFirst()).toBe(false);
    } finally {
      for (const [k, v] of Object.entries(saved)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
  });

  it("is true in auto mode with dedicated credentials", () => {
    const prev = { ...process.env };
    try {
      process.env.STORY_PROVIDER = "auto";
      process.env.STORY_PROVIDER_URL = "https://story.example.com/resolve";
      process.env.STORY_PROVIDER_API_KEY = "key";
      expect(shouldTryExternalFirst()).toBe(true);
    } finally {
      for (const k of keys) {
        if (prev[k] === undefined) delete process.env[k];
        else process.env[k] = prev[k];
      }
    }
  });

  it("is false in puppeteer-only mode even with credentials", () => {
    const prev = { ...process.env };
    try {
      process.env.STORY_PROVIDER = "puppeteer";
      process.env.STORY_PROVIDER_URL = "https://story.example.com/resolve";
      process.env.STORY_PROVIDER_API_KEY = "key";
      expect(shouldTryExternalFirst()).toBe(false);
    } finally {
      for (const k of keys) {
        if (prev[k] === undefined) delete process.env[k];
        else process.env[k] = prev[k];
      }
    }
  });

  it("falls back to shared PROVIDER_* credentials", () => {
    const prev = { ...process.env };
    try {
      delete process.env.STORY_PROVIDER_URL;
      delete process.env.STORY_PROVIDER_API_KEY;
      process.env.STORY_PROVIDER = "auto";
      process.env.PROVIDER_API_URL = "https://shared.example.com/r";
      process.env.PROVIDER_API_KEY = "shared-key";
      expect(shouldTryExternalFirst()).toBe(true);
    } finally {
      for (const k of keys) {
        if (prev[k] === undefined) delete process.env[k];
        else process.env[k] = prev[k];
      }
      delete process.env.STORY_PROVIDER;
    }
  });
});

describe("story provider mode", () => {
  const prev = process.env.STORY_PROVIDER;
  afterEach(() => {
    if (prev === undefined) delete process.env.STORY_PROVIDER;
    else process.env.STORY_PROVIDER = prev;
  });

  it("defaults to auto", () => {
    delete process.env.STORY_PROVIDER;
    expect(storyProviderMode()).toBe("auto");
  });

  it("accepts puppeteer and external, falls back to auto otherwise", () => {
    process.env.STORY_PROVIDER = "puppeteer";
    expect(storyProviderMode()).toBe("puppeteer");
    process.env.STORY_PROVIDER = "external";
    expect(storyProviderMode()).toBe("external");
    process.env.STORY_PROVIDER = "bogus";
    expect(storyProviderMode()).toBe("auto");
  });
});

describe("classifyStoryMediaKind (metadata over filename)", () => {
  it("marks video_versions metadata as STORY_VIDEO without any probe", () => {
    expect(
      classifyStoryMediaKind({ fromVideoVersions: true, observedMime: null, kind: "video", isDerivative: false })
    ).toBe("STORY_VIDEO");
  });

  it("trusts a verified video/* Content-Type over an imagelike URL", () => {
    expect(
      classifyStoryMediaKind({ fromVideoVersions: false, observedMime: "video/mp4", kind: "video", isDerivative: false })
    ).toBe("STORY_VIDEO");
  });

  it("marks a verified image/* response as STORY_IMAGE (incl. HEIC)", () => {
    expect(
      classifyStoryMediaKind({ fromVideoVersions: false, observedMime: "image/heic", kind: "image", isDerivative: true })
    ).toBe("STORY_IMAGE");
  });

  it("marks an unverified derivative as STORY_UNKNOWN, never video", () => {
    expect(
      classifyStoryMediaKind({ fromVideoVersions: false, observedMime: null, kind: "image", isDerivative: true })
    ).toBe("STORY_UNKNOWN");
  });

  it("falls back to metadata kind when nothing else is known", () => {
    expect(
      classifyStoryMediaKind({ fromVideoVersions: false, observedMime: null, kind: "image", isDerivative: false })
    ).toBe("STORY_IMAGE");
  });
});

describe("detectStoryBytesContentType (magic bytes over filename)", () => {
  const bytes = (arr: number[]) => new Uint8Array(arr);
  const ftyp = (brand: string) => bytes([0, 0, 0, 24, 102, 116, 121, 112, ...brand.split("").map((c) => c.charCodeAt(0)), 0, 0, 0, 0]);

  it("identifies MP4 by ftyp brand even with a misleading name", () => {
    expect(detectStoryBytesContentType(ftyp("isom"))).toBe("video/mp4");
    expect(detectStoryBytesContentType(ftyp("mp41"))).toBe("video/mp4");
  });

  it("identifies HEIC brands so they are never mistaken for video", () => {
    expect(detectStoryBytesContentType(ftyp("heic"))).toBe("image/heic");
    expect(detectStoryBytesContentType(ftyp("mif1"))).toBe("image/heic");
  });

  it("identifies JPEG/PNG/GIF/WebP signatures", () => {
    expect(detectStoryBytesContentType(bytes([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe("image/jpeg");
    expect(detectStoryBytesContentType(bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]))).toBe("image/png");
    expect(detectStoryBytesContentType(bytes([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0, 0, 0]))).toBe("image/gif");
    const riff = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];
    expect(detectStoryBytesContentType(bytes(riff))).toBe("image/webp");
  });

  it("returns null for unknown bytes and short buffers", () => {
    expect(detectStoryBytesContentType(bytes([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]))).toBeNull();
    expect(detectStoryBytesContentType(bytes([0xff, 0xd8]))).toBeNull();
    expect(detectStoryBytesContentType(bytes([]))).toBeNull();
  });

  it("classifies sniffed video bytes as STORY_VIDEO regardless of URL", () => {
    expect(
      classifyStoryMediaKind({ fromVideoVersions: false, observedMime: "video/mp4", kind: "image", isDerivative: false })
    ).toBe("STORY_VIDEO");
  });
});

describe("parseReelsMediaResponse (HTTP 200 + 0 items is empty tray, not throttling)", () => {
  it("returns [] for an empty reels_media payload", () => {
    expect(parseReelsMediaResponse({ reels_media: [] })).toEqual([]);
    expect(parseReelsMediaResponse({})).toEqual([]);
    expect(parseReelsMediaResponse(null)).toEqual([]);
  });

  it("extracts items from reels_media[].items", () => {
    const json = {
      reels_media: [
        { items: [{ pk: "1", video_versions: [{ url: "https://cdn/v.mp4" }] }] },
        { items: [] },
      ],
    };
    const items = parseReelsMediaResponse(json);
    expect(items).toHaveLength(1);
    expect(items[0]["pk"]).toBe("1");
  });

  it("extracts items from nested data envelopes", () => {
    const json = { data: { reels_media: [{ items: [{ pk: "9" }] }] } };
    expect(parseReelsMediaResponse(json)).toHaveLength(1);
  });
});

describe("extractUserIdFromWebProfileInfo (liveness needs real user data)", () => {
  it("returns null for empty/garbage payloads (200-{} proves nothing)", () => {
    expect(extractUserIdFromWebProfileInfo(null)).toBeNull();
    expect(extractUserIdFromWebProfileInfo({})).toBeNull();
    expect(extractUserIdFromWebProfileInfo({ data: {} })).toBeNull();
    expect(extractUserIdFromWebProfileInfo({ status: "ok" })).toBeNull();
  });

  it("extracts string and numeric ids from known envelopes", () => {
    expect(extractUserIdFromWebProfileInfo({ data: { user: { id: "123" } } })).toBe("123");
    expect(extractUserIdFromWebProfileInfo({ data: { user: { id: 456 } } })).toBe("456");
    expect(extractUserIdFromWebProfileInfo({ user: { id: "789" } })).toBe("789");
  });
});

describe("story budgets (finite extraction, no retry storms)", () => {
  it("caps extraction attempts, pages, verifications, and external calls", () => {
    expect(STORY_BUDGETS.maxExtractionAttempts).toBeLessThanOrEqual(3);
    expect(STORY_BUDGETS.maxHtmlPages).toBeLessThanOrEqual(2);
    expect(STORY_BUDGETS.maxVerifyCandidatesPerType).toBeLessThanOrEqual(5);
    expect(STORY_BUDGETS.maxExternalCalls).toBe(1);
    expect(STORY_BUDGETS.maxNetworkRetriesPerRequest).toBeLessThanOrEqual(2);
  });
});

describe("candidate provenance", () => {
  it("marks video_versions entries as authoritative video provenance", () => {
    const html =
      `<html><body>"story_tray" "video_versions":[{"url":"https://scontent.cdninstagram.com/v/1.mp4","width":720,"height":1280}],` +
      `"image_versions2":{"candidates":[]}</body></html>`;
    const found = extractStoryCandidatesFromHtml(html, "someuser");
    const video = found.candidates.find((c) => c.type === "video");
    expect(video?.fromVideoVersions).toBe(true);
    expect(video?.isThumbnail).toBe(false);
    expect(video?.verified).toBe(false);
    expect(video?.observedMime).toBeNull();
  });
});

describe("new story error codes", () => {
  it("registers all new codes with status and retryable", () => {
    for (const code of [
      "STORY_PROFILE_NOT_FOUND",
      "STORY_NOT_ACTIVE",
      "STORY_MEDIA_NOT_DISCOVERED",
      "STORY_MEDIA_DISCOVERED_BUT_INVALID",
      "STORY_MEDIA_EXPIRED",
      "INSTAGRAM_STORY_ACCESS_RESTRICTED",
      "INSTAGRAM_EMPTY_STORY_SHELL",
      "STORY_RESTRICTED",
      "NO_ACTIVE_PUBLIC_STORY",
      "SESSION_EXPIRED",
      "USER_NOT_FOUND",
      "PRIVATE_ACCOUNT",
      "RATE_LIMITED",
      "FETCH_FAILED",
      "NO_STORY",
    ] as const) {
      expect(ERRORS[code]).toBeDefined();
      expect(ERRORS[code].message).toBeTruthy();
      expect(ERRORS[code].status).toBeGreaterThan(0);
      expect(typeof ERRORS[code].retryable).toBe("boolean");
    }
  });
});
