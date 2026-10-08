/**
 * Session-fallback matrix: a dead optional server session must never fail a
 * public Story. Covers TEST 1/2/3/4 (resolve outcomes), cookie-shape gates,
 * terminal-verdict selection after fallback, and avatar-candidate rejection
 * (TEST 9/10). Every session value below is unique per test so the 5-minute
 * quarantine from one test can never suppress another.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  clearStoryCacheForTests,
  createStoryResolveState,
  finalProfileError,
  parseStoryUrl,
  resolveStoryUrl,
  validateStoryMedia,
} from "@/lib/story-resolve.js";
import { isInstagramSessionConfigured } from "@/lib/instagram-session.js";

const SESSION_KEYS = [
  "INSTAGRAM_COOKIE",
  "IG_COOKIE",
  "INSTAGRAM_COOKIE_STRING",
  "INSTAGRAM_SESSION_COOKIE",
  "INSTAGRAM_SESSIONID",
  "IG_SESSIONID",
  "INSTAGRAM_SESSION_ID",
  "SESSIONID",
  "INSTAGRAM_CSRFTOKEN",
  "IG_CSRFTOKEN",
  "CSRFTOKEN",
  "INSTAGRAM_CSRF_TOKEN",
  "INSTAGRAM_DS_USER_ID",
  "IG_DS_USER_ID",
  "DS_USER_ID",
  "INSTAGRAM_DS_USERID",
] as const;

let savedEnv: Record<string, string | undefined>;

function clearSessionEnv() {
  for (const key of SESSION_KEYS) delete process.env[key];
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const STORY_VIDEO_URL =
  "https://scontent.cdninstagram.com/v/t51.29345-15/12345_67890.mp4?stp=dst&oh=abc";

function videoItem() {
  return {
    pk: "111",
    id: "111_222",
    video_versions: [{ url: STORY_VIDEO_URL, width: 1080, height: 1920 }],
    image_versions2: { candidates: [] },
    video_duration: 7.5,
    user: { username: "fallbackuser", full_name: "Fallback User" },
  };
}

function reelsMediaResponse(items: unknown[]): Response {
  return jsonResponse({ reels_media: [{ items }], status: "ok" }, 200);
}

const PUBLIC_PROFILE = () =>
  jsonResponse({ data: { user: { id: "222", username: "fallbackuser", is_private: false } } }, 200);

const EMPTY_HTML = () =>
  new Response("<html><body>empty</body></html>", {
    status: 200,
    headers: { "content-type": "text/html" },
  });

describe("session fallback matrix", () => {
  beforeEach(() => {
    savedEnv = {};
    for (const key of SESSION_KEYS) savedEnv[key] = process.env[key];
    clearSessionEnv();
    clearStoryCacheForTests();
    vi.unstubAllGlobals();
  });
  afterEach(() => {
    for (const key of SESSION_KEYS) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
    vi.unstubAllGlobals();
  });

  it("TEST 1: public Story resolves with no session configured", async () => {
    vi.stubGlobal(
      "fetch",
      (async (input: unknown) => {
        const url = String(input);
        if (url.includes("web_profile_info")) return PUBLIC_PROFILE();
        if (url.includes("reels_media")) return reelsMediaResponse([videoItem()]);
        return new Response("not found", { status: 404 });
      }) as never
    );
    const result = await resolveStoryUrl("https://www.instagram.com/stories/matrixuser1/");
    expect(result.type).toBe("STORY");
    expect(result.media).toHaveLength(1);
    expect(result.media[0].url).toContain(".mp4");
  });

  it("TEST 2: public Story resolves with a valid configured session", async () => {
    process.env.INSTAGRAM_SESSIONID = "matrix-valid-session-2";
    vi.stubGlobal(
      "fetch",
      (async (input: unknown) => {
        const url = String(input);
        if (url.includes("accounts/current_user")) {
          return jsonResponse({ status: "ok", user: { pk: "999", username: "serviceaccount" } }, 200);
        }
        if (url.includes("web_profile_info")) return PUBLIC_PROFILE();
        if (url.includes("reels_media")) return reelsMediaResponse([videoItem()]);
        return new Response("not found", { status: 404 });
      }) as never
    );
    const result = await resolveStoryUrl("https://www.instagram.com/stories/matrixuser2/");
    expect(result.type).toBe("STORY");
    expect(result.media).toHaveLength(1);
  });

  it("TEST 3: public Story resolves despite an expired session (fallback, never SESSION_EXPIRED)", async () => {
    process.env.INSTAGRAM_SESSIONID = "matrix-dead-session-3";
    const authedHits: string[] = [];
    vi.stubGlobal(
      "fetch",
      (async (input: unknown, init?: unknown) => {
        const url = String(input);
        const headers = (init as { headers?: Record<string, string> } | undefined)?.headers;
        const cookie = headers?.Cookie ?? headers?.cookie ?? "";
        // The owner probe carries the dead session and must fail…
        if (url.includes("accounts/current_user")) {
          if (cookie) authedHits.push(url);
          return jsonResponse({ message: "login required", require_login: true }, 401);
        }
        // …but the public tray serves the Story to everyone.
        if (url.includes("web_profile_info")) return PUBLIC_PROFILE();
        if (url.includes("reels_media")) return reelsMediaResponse([videoItem()]);
        return new Response("not found", { status: 404 });
      }) as never
    );
    const result = await resolveStoryUrl("https://www.instagram.com/stories/matrixuser3/");
    expect(authedHits.length).toBeGreaterThan(0);
    expect(result.type).toBe("STORY");
    expect(result.media).toHaveLength(1);
    // TEST 10: the actual video file — never a JPG/avatar substitute.
    expect(result.media[0].type).toBe("video");
    expect(result.media[0].url).toContain(".mp4");
  });

  it("TEST 4: dead session + empty tray reports STORY_PROVIDER_REQUIRED (absence unprovable anonymously)", async () => {
    process.env.INSTAGRAM_SESSIONID = "matrix-dead-session-4";
    vi.stubGlobal(
      "fetch",
      (async (input: unknown) => {
        const url = String(input);
        if (url.includes("accounts/current_user")) {
          return jsonResponse({ message: "login required", require_login: true }, 401);
        }
        if (url.includes("web_profile_info")) return PUBLIC_PROFILE();
        if (url.includes("reels_media")) return reelsMediaResponse([]);
        if (url.includes("instagram.com/")) return EMPTY_HTML();
        return new Response("not found", { status: 404 });
      }) as never
    );
    await expect(
      resolveStoryUrl("https://www.instagram.com/stories/matrixuser4/")
    ).rejects.toMatchObject({ code: "STORY_PROVIDER_REQUIRED" });
  }, 30_000);
});

describe("story share shortlinks (/s/<code>)", () => {
  beforeEach(() => {
    savedEnv = {};
    for (const key of SESSION_KEYS) savedEnv[key] = process.env[key];
    clearSessionEnv();
    clearStoryCacheForTests();
    vi.unstubAllGlobals();
  });
  afterEach(() => {
    for (const key of SESSION_KEYS) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
    vi.unstubAllGlobals();
  });

  it("parses /s/ links as story identifiers instead of throwing", () => {
    expect(parseStoryUrl("https://www.instagram.com/s/AbCdEfGh/")).toEqual({
      username: "",
      storyId: "AbCdEfGh",
      highlightId: null,
    });
    expect(
      parseStoryUrl("https://www.instagram.com/s/AbCdEfGh?story_media_id=123_456")
    ).toEqual({ username: "", storyId: "AbCdEfGh", highlightId: null });
  });

  it("follows the shortlink redirect and resolves the real story", async () => {
    const redirect = {
      url: "https://www.instagram.com/shortuser/",
      headers: { get: () => null },
      body: { cancel: async () => {} },
    };
    vi.stubGlobal(
      "fetch",
      (async (input: unknown) => {
        const url = String(input);
        if (url.includes("/s/")) return redirect as never;
        if (url.includes("web_profile_info")) {
          return jsonResponse(
            { data: { user: { id: "333", username: "shortuser", is_private: false } } },
            200
          );
        }
        if (url.includes("reels_media")) return reelsMediaResponse([videoItem()]);
        return new Response("not found", { status: 404 });
      }) as never
    );
    const result = await resolveStoryUrl("https://www.instagram.com/s/AbCdEfGh?story_media_id=123_456");
    expect(result.type).toBe("STORY");
    expect(result.media).toHaveLength(1);
    expect(result.media[0].url).toContain(".mp4");
  });
});

describe("external provider story path (video + verified images)", () => {
  const PROVIDER_KEYS = ["STORY_PROVIDER_URL", "STORY_PROVIDER_API_KEY", "STORY_PROVIDER", "PROVIDER_API_URL", "PROVIDER_API_KEY"] as const;
  let savedProvider: Record<string, string | undefined>;

  beforeEach(() => {
    savedProvider = {};
    for (const key of [...SESSION_KEYS, ...PROVIDER_KEYS]) {
      savedProvider[key] = process.env[key];
      delete process.env[key];
    }
    clearStoryCacheForTests();
    vi.unstubAllGlobals();
  });
  afterEach(() => {
    for (const [key, value] of Object.entries(savedProvider)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    vi.unstubAllGlobals();
  });

  function headFor(url: string): Response {
    const ct = url.endsWith(".mp4") ? "video/mp4" : "image/jpeg";
    return new Response(null, {
      status: 200,
      headers: { "content-type": ct, "content-length": "500000" },
    });
  }

  function profileUser(username: string, id: string) {
    return new Response(
      JSON.stringify({ data: { user: { id, username, is_private: false } } }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  }

  it("returns every verified provider item, images included", async () => {
    process.env.STORY_PROVIDER_URL = "https://provider.example.test/resolve";
    process.env.STORY_PROVIDER_API_KEY = "provider-key";
    vi.stubGlobal(
      "fetch",
      (async (input: unknown) => {
        const url = String(input);
        if (url.includes("web_profile_info")) return profileUser("provideruser", "444");
        if (url.startsWith("https://provider.example.test/")) {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                items: [
                  { id: "1", shortcode: "A", type: "video", video_url: "https://cdn.example.com/story1.mp4", image_url: "https://cdn.example.com/story1.jpg", video_duration: 7 },
                  { id: "2", shortcode: "B", type: "photo", image_url: "https://cdn.example.com/story2.jpg" },
                ],
              },
            }),
            { status: 200, headers: { "content-type": "application/json" } }
          );
        }
        if (url.startsWith("https://cdn.example.com/")) return headFor(url);
        return new Response("not found", { status: 404 });
      }) as never
    );
    const result = await resolveStoryUrl("https://www.instagram.com/stories/provideruser/");
    expect(result.type).toBe("STORY");
    expect(result.media).toHaveLength(2);
    expect(result.media[0].type).toBe("video");
    expect(result.media[0].url).toContain("story1.mp4");
    expect(result.media[1].type).toBe("image");
    expect(result.media[1].url).toContain("story2.jpg");
  });

  it("refuses unverified provider media instead of succeeding", async () => {
    process.env.STORY_PROVIDER_URL = "https://provider.example.test/resolve";
    process.env.STORY_PROVIDER_API_KEY = "provider-key";
    vi.stubGlobal(
      "fetch",
      (async (input: unknown) => {
        const url = String(input);
        if (url.includes("web_profile_info")) return profileUser("brokenuser", "445");
        if (url.startsWith("https://provider.example.test/")) {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                items: [{ id: "9", type: "video", video_url: "https://cdn.example.com/broken.mp4" }],
              },
            }),
            { status: 200, headers: { "content-type": "application/json" } }
          );
        }
        // CDN refuses everything: validation must fail, never fake success.
        if (url.startsWith("https://cdn.example.com/")) {
          return new Response("gone", { status: 410 });
        }
        return new Response("not found", { status: 404 });
      }) as never
    );
    await expect(
      resolveStoryUrl("https://www.instagram.com/stories/brokenuser/")
    ).rejects.toMatchObject({ code: "STORY_MEDIA_EXPIRED" });
  });
});

describe("external handle provider end-to-end (profilequery protocol)", () => {
  const PROVIDER_KEYS = ["STORY_PROVIDER_URL", "STORY_PROVIDER_API_KEY", "STORY_PROVIDER", "PROVIDER_API_URL", "PROVIDER_API_KEY"] as const;
  let savedProvider: Record<string, string | undefined>;

  beforeEach(() => {
    savedProvider = {};
    for (const key of [...SESSION_KEYS, ...PROVIDER_KEYS]) {
      savedProvider[key] = process.env[key];
      delete process.env[key];
    }
    clearStoryCacheForTests();
    vi.unstubAllGlobals();
  });
  afterEach(() => {
    for (const [key, value] of Object.entries(savedProvider)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    vi.unstubAllGlobals();
  });

  function servedHead(url: string): Response {
    const ct = url.endsWith(".mp4") ? "video/mp4" : "image/jpeg";
    return new Response(null, {
      status: 200,
      headers: { "content-type": ct, "content-length": "500000" },
    });
  }

  it("resolves a story through GET ?handle= with verified video + image", async () => {
    process.env.STORY_PROVIDER_URL = "https://api.profilequery.com/v1/profile/stories";
    process.env.STORY_PROVIDER_API_KEY = "handle-key";
    const requested: string[] = [];
    vi.stubGlobal(
      "fetch",
      (async (input: unknown) => {
        const url = String(input);
        requested.push(url);
        if (url.startsWith("https://api.profilequery.com/")) {
          return new Response(
            JSON.stringify({
              data: {
                items: [
                  { id: "1", type: "video", video_url: "https://cdn.example.com/h1.mp4", image_url: "https://cdn.example.com/h1.jpg", video_duration: 5 },
                  { id: "2", type: "photo", image_url: "https://cdn.example.com/h2.jpg" },
                ],
              },
            }),
            { status: 200, headers: { "content-type": "application/json" } }
          );
        }
        if (url.includes("web_profile_info")) {
          return new Response(
            JSON.stringify({ data: { user: { id: "555", username: "handleuser", is_private: false } } }),
            { status: 200, headers: { "content-type": "application/json" } }
          );
        }
        if (url.startsWith("https://cdn.example.com/")) return servedHead(url);
        return new Response("not found", { status: 404 });
      }) as never
    );
    const result = await resolveStoryUrl("https://www.instagram.com/stories/handleuser/");
    expect(requested.some((u) => u.includes("?handle=handleuser"))).toBe(true);
    expect(result.type).toBe("STORY");
    expect(result.media).toHaveLength(2);
    expect(result.media[0]).toMatchObject({ type: "video", url: "https://cdn.example.com/h1.mp4" });
    expect(result.media[1]).toMatchObject({ type: "image", url: "https://cdn.example.com/h2.jpg" });
  });
});

describe("session configured gate (empty/malformed is never a session)", () => {
  beforeEach(() => {
    savedEnv = {};
    for (const key of SESSION_KEYS) savedEnv[key] = process.env[key];
    clearSessionEnv();
  });
  afterEach(() => {
    for (const key of SESSION_KEYS) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
  });

  it.each([[""], ["   "], ["csrftoken=abc123456789"], ["not-a-cookie"]])(
    "rejects %p as unconfigured",
    (value) => {
      process.env.INSTAGRAM_COOKIE = value;
      expect(isInstagramSessionConfigured()).toBe(false);
    }
  );

  it("accepts a real sessionid cookie", () => {
    process.env.INSTAGRAM_COOKIE = "sessionid=abc1234567890; csrftoken=xyz987654321";
    expect(isInstagramSessionConfigured()).toBe(true);
  });
});

describe("recognized empty public tray (positive evidence of absence)", () => {
  it("maps a recognized-but-empty public tray to STORY_PROVIDER_REQUIRED without a live session", () => {
    const state = createStoryResolveState();
    state.userExists = true;
    state.sessionWasConfigured = true;
    state.anonymousFallbackRan = false;
    state.publicTrayCheckedEmpty = true;
    state.strategiesTried = ["reels_media"];
    state.authedStatus = null;
    state.sawAuthedWall = false;
    expect(finalProfileError("trayuser", state).code).toBe("STORY_PROVIDER_REQUIRED");
  });

  it("keeps FETCH_FAILED for unknown tray structures (never NO_STORY)", () => {
    const state = createStoryResolveState();
    state.userExists = true;
    state.sessionWasConfigured = false;
    state.publicTrayCheckedEmpty = false;
    state.trayStructureUnknown = true;
    state.strategiesTried = ["reels_media"];
    expect(finalProfileError("trayuser", state).code).toBe("FETCH_FAILED");
  });
});

describe("terminal verdict after anonymous fallback", () => {
  it("maps a completed public check with an empty tray to STORY_PROVIDER_REQUIRED", () => {
    const state = createStoryResolveState();
    state.userExists = true;
    state.sessionWasConfigured = true;
    state.anonymousFallbackRan = true;
    state.strategiesTried = ["reels_media", "story-page-html"];
    state.authedStatus = 401;
    state.sawAuthedWall = false;
    expect(finalProfileError("fallbackuser", state).code).toBe("STORY_PROVIDER_REQUIRED");
  });

  it("maps a live-session empty tray to INSTAGRAM_AUTH_EMPTY_RESPONSE (accepted but empty)", () => {
    const state = createStoryResolveState();
    state.userExists = true;
    state.sessionWasConfigured = true;
    state.anonymousFallbackRan = false;
    state.publicTrayCheckedEmpty = true;
    state.strategiesTried = ["reels_media"];
    state.authedStatus = 200;
    state.sawAuthedWall = false;
    expect(finalProfileError("liveuser", state).code).toBe("INSTAGRAM_AUTH_EMPTY_RESPONSE");
  });

  it("keeps SESSION_EXPIRED when no fallback ran (control)", () => {
    const state = createStoryResolveState();
    state.userExists = true;
    state.sessionWasConfigured = true;
    state.anonymousFallbackRan = false;
    state.strategiesTried = ["reels_media"];
    state.authedStatus = 401;
    state.sawAuthedWall = true;
    expect(finalProfileError("fallbackuser", state).code).toBe("SESSION_EXPIRED");
  });
});

describe("story media validation (TEST 9)", () => {
  it("rejects avatar/profile-picture candidates instead of returning them", async () => {
    await expect(
      validateStoryMedia({
        type: "image",
        url: "https://scontent.cdninstagram.com/v/t51.29345-15/12345_profile_pic.jpg",
      } as never)
    ).rejects.toMatchObject({ code: "FETCH_FAILED" });
  });

  it("rejects avatar-sized video impostors", async () => {
    await expect(
      validateStoryMedia({
        type: "video",
        url: "https://scontent.cdninstagram.com/v/t51.29345-15/avatar_150x150.mp4",
        width: 150,
        height: 150,
      } as never)
    ).rejects.toThrow();
  });
});
