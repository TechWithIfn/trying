/**
 * Story pipeline tests: the complete Instagram Story flow.
 *
 * Covers: valid public video/image Stories, expired sessions, private
 * accounts, empty trays, rate limits, challenge/auth failures, duplicate
 * retry prevention (transient-only bounded retries), progress reset
 * prevention (monotonic progress), story metadata caching, and the media
 * proxy download path. Secrets are asserted by shape only — never logged.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  clearStoryCacheForTests,
  createStoryMonotonicProgress,
  createStoryResolveState,
  finalProfileError,
  parseReelsMediaResponse,
  parseStoryUrl,
  resolveStoryUrl,
  stripAtPrefix,
} from "@/lib/story-resolve.js";
import { validateInstagramUrl } from "@/lib/validators/instagram-url.js";
import {
  buildInstagramHeaders,
  extractSessionOwnerId,
  fetchInstagramJson,
  isChallengeResponse,
  isTransientInstagramStatus,
  sessionValidationError,
  validateInstagramSession,
  validateSessionOwner,
  webProfileInfoUrl,
} from "@/lib/instagram-client.js";
import {
  getInstagramCsrfToken,
  getInstagramDsUserId,
  getInstagramSessionCookie,
  isInstagramSessionConfigured,
  sessionEnvPresence,
} from "@/lib/instagram-session.js";
import { validateProxyUrl } from "@/lib/media-proxy.js";
import { AppError } from "@/lib/errors.js";

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

function jsonResponse(body: unknown, status: number, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...extraHeaders },
  });
}

const STORY_VIDEO_URL =
  "https://scontent.cdninstagram.com/v/t51.29345-15/12345_67890.mp4?stp=dst&oh=abc";
const STORY_IMAGE_URL =
  "https://scontent.cdninstagram.com/v/t51.29345-15/12345_67890.jpg?stp=dst&oh=abc";

function reelsMediaResponse(items: unknown[]): Response {
  return jsonResponse({ reels_media: [{ items }], status: "ok" }, 200);
}

function videoItem() {
  return {
    pk: "111",
    id: "111_222",
    video_versions: [{ url: STORY_VIDEO_URL, width: 1080, height: 1920 }],
    image_versions2: { candidates: [{ url: STORY_IMAGE_URL, width: 1080, height: 1920 }] },
    video_duration: 7.5,
    user: { username: "storyuser", full_name: "Story User" },
  };
}

function imageItem() {
  return {
    pk: "112",
    id: "112_222",
    image_versions2: { candidates: [{ url: STORY_IMAGE_URL, width: 1080, height: 1920 }] },
    user: { username: "storyuser", full_name: "Story User" },
  };
}

/**
 * Route stubbed Instagram traffic: profile lookup + reels tray. Factories
 * build a FRESH Response per call — a reused Response has a consumed body
 * and would fake failures on repeat/bypassCache resolutions.
 */
function stubInstagram(profile: () => Response, tray: () => Response, onFetch?: (url: string) => void) {
  return vi.stubGlobal(
    "fetch",
    (async (input: unknown) => {
      const url = String(input);
      onFetch?.(url);
      if (url.includes("web_profile_info")) return profile();
      if (url.includes("reels_media")) return tray();
      return new Response("not found", { status: 404 });
    }) as never
  );
}

const PUBLIC_PROFILE = () =>
  jsonResponse({ data: { user: { id: "222", username: "storyuser", is_private: false } } }, 200);

describe("story session env (dedicated service-account, backend only)", () => {
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

  it("composes SESSIONID + CSRFTOKEN + DS_USER_ID into one cookie", () => {
    process.env.INSTAGRAM_SESSIONID = "abc123sessionvalue";
    process.env.INSTAGRAM_CSRFTOKEN = "csrf-token-value";
    process.env.INSTAGRAM_DS_USER_ID = "999";
    const cookie = getInstagramSessionCookie();
    expect(cookie).toContain("sessionid=abc123sessionvalue");
    expect(cookie).toContain("csrftoken=csrf-token-value");
    expect(cookie).toContain("ds_user_id=999");
    expect(isInstagramSessionConfigured()).toBe(true);
  });

  it("exposes csrf token and viewer id for headers without logging values", () => {
    process.env.INSTAGRAM_SESSIONID = "abc123sessionvalue";
    process.env.CSRFTOKEN = "csrf-token-value";
    process.env.DS_USER_ID = "999";
    expect(getInstagramCsrfToken()).toBe("csrf-token-value");
    expect(getInstagramDsUserId()).toBe("999");
  });

  it("builds one realistic header set (UA, App-ID, CSRF, Referer)", () => {
    process.env.INSTAGRAM_SESSIONID = "abc123sessionvalue";
    process.env.INSTAGRAM_CSRFTOKEN = "csrf-token-value";
    const headers = buildInstagramHeaders({ includeCookie: true });
    expect(headers["User-Agent"]).toContain("Mozilla");
    expect(headers["X-IG-App-ID"]).toBeTruthy();
    expect(headers["X-CSRFToken"]).toBe("csrf-token-value");
    expect(headers.Referer).toContain("instagram.com");
    expect(headers.Cookie).toContain("sessionid=");
  });

  it("attaches no Cookie without a session (anonymous unchanged)", () => {
    const headers = buildInstagramHeaders({ includeCookie: true });
    expect(headers.Cookie).toBeUndefined();
    expect(headers["X-CSRFToken"]).toBeUndefined();
  });

  it("reports session material presence as booleans only (never values)", () => {
    expect(sessionEnvPresence()).toEqual({ sessionid: false, csrftoken: false, ds_user_id: false });
    process.env.INSTAGRAM_SESSIONID = "presence-session-value";
    process.env.INSTAGRAM_CSRFTOKEN = "presence-csrf-value";
    process.env.INSTAGRAM_DS_USER_ID = "presence-ds-value";
    expect(sessionEnvPresence()).toEqual({ sessionid: true, csrftoken: true, ds_user_id: true });
    const cookie = getInstagramSessionCookie() ?? "";
    expect(cookie).toContain("sessionid=presence-session-value");
    expect(cookie).toContain("csrftoken=presence-csrf-value");
    expect(cookie).toContain("ds_user_id=presence-ds-value");
    const headers = buildInstagramHeaders({ includeCookie: true });
    expect(headers["X-IG-App-ID"]).toBe("936619743392459");
    expect(headers["X-CSRFToken"]).toBe("presence-csrf-value");
    expect(headers.Cookie).toContain("ds_user_id=presence-ds-value");
  });
});

describe("story session validation verdicts", () => {
  beforeEach(() => {
    savedEnv = {};
    for (const key of SESSION_KEYS) savedEnv[key] = process.env[key];
    clearSessionEnv();
    vi.unstubAllGlobals();
  });
  afterEach(() => {
    for (const key of SESSION_KEYS) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
    vi.unstubAllGlobals();
  });

  it("reports unconfigured with no session", async () => {
    expect(await validateInstagramSession()).toEqual({ status: "unconfigured" });
  });

  it("reports ok only for 200 WITH real user data", async () => {
    process.env.INSTAGRAM_SESSIONID = "live-session-value";
    vi.stubGlobal("fetch", (async () =>
      jsonResponse({ data: { user: { id: "1", username: "instagram" } } }, 200)) as never);
    expect(await validateInstagramSession()).toEqual({ status: "ok" });
  });

  it("reports unknown for 200-{} (never marks a dead session live)", async () => {
    process.env.INSTAGRAM_SESSIONID = "dead-session-value";
    vi.stubGlobal("fetch", (async () => jsonResponse({}, 200)) as never);
    expect(await validateInstagramSession()).toEqual({ status: "unknown" });
  });

  it("reports unknown for a lookup-endpoint 403 (endpoint gating, not session proof)", async () => {
    // web_profile_info gates datacenter clients even while the SAME session
    // is accepted for Story trays (observed live) — its plain 401 must never
    // masquerade as a dead session. Story endpoints judge (see tray tests).
    process.env.INSTAGRAM_SESSIONID = "gated-lookup-session-value";
    vi.stubGlobal("fetch", (async () => jsonResponse({ message: "error" }, 403)) as never);
    expect(await validateInstagramSession()).toEqual({ status: "unknown" });
    expect(sessionValidationError({ status: "expired_invalid" })?.code).toBe("SESSION_EXPIRED");
  });

  it("reports ok for a tray probe accepted for Story reads (even when empty)", async () => {
    process.env.INSTAGRAM_SESSIONID = "tray-ok-session-value";
    vi.stubGlobal(
      "fetch",
      (async () => jsonResponse({ reels_media: [], status: "ok" }, 200)) as never
    );
    expect(await validateInstagramSession({ userId: "12345" })).toEqual({ status: "ok" });
  });

  it("reports expired_invalid for a tray-endpoint 401 and quarantines the session", async () => {
    process.env.INSTAGRAM_SESSIONID = "tray-dead-session-value";
    vi.stubGlobal("fetch", (async () => jsonResponse({ message: "error" }, 401)) as never);
    expect(await validateInstagramSession({ userId: "12345" })).toEqual({ status: "expired_invalid" });
    // A Story endpoint rejected THIS session: it is quarantined process-wide
    // so no later request re-attaches it (anonymous path continues).
    expect(isInstagramSessionConfigured()).toBe(false);
  });

  it("reports login_required for login_required bodies", async () => {
    process.env.INSTAGRAM_SESSIONID = "gated-session-value";
    vi.stubGlobal(
      "fetch",
      (async () => jsonResponse({ message: "login_required" }, 403)) as never
    );
    const verdict = await validateInstagramSession();
    expect(verdict).toEqual({ status: "login_required", challenge: false });
  });

  it("reports challenge for checkpoint/challenge payloads", async () => {
    process.env.INSTAGRAM_SESSIONID = "challenged-session-value";
    vi.stubGlobal(
      "fetch",
      (async () => jsonResponse({ message: "challenge_required", checkpoint_url: "/x/" }, 400)) as never
    );
    const verdict = await validateInstagramSession();
    expect(verdict).toEqual({ status: "login_required", challenge: true });
    const err = sessionValidationError(verdict);
    expect(err?.code).toBe("SESSION_EXPIRED");
    expect(err?.message).toMatch(/challenge/i);
  });

  it("reports rate_limited for 429 (never retries into a ban)", async () => {
    process.env.INSTAGRAM_SESSIONID = "throttled-session-value";
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      (async () => {
        calls++;
        return jsonResponse({}, 429);
      }) as never
    );
    expect(await validateInstagramSession()).toEqual({ status: "rate_limited" });
    expect(calls).toBe(1);
  });
});

describe("story session-owner probe (fail-fast validation)", () => {
  beforeEach(() => {
    savedEnv = {};
    for (const key of SESSION_KEYS) savedEnv[key] = process.env[key];
    clearSessionEnv();
    vi.unstubAllGlobals();
  });
  afterEach(() => {
    for (const key of SESSION_KEYS) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
    vi.unstubAllGlobals();
  });

  it("extracts the owner id from current_user shapes", () => {
    expect(extractSessionOwnerId({ user: { pk: "123" } })).toBe("123");
    expect(extractSessionOwnerId({ user: { id: 456 } })).toBe("456");
    expect(extractSessionOwnerId({ data: { user: { id: "789" } } })).toBe("789");
    expect(extractSessionOwnerId({})).toBeNull();
    expect(extractSessionOwnerId(null)).toBeNull();
  });

  it("reports ok for 200 with an owner record", async () => {
    process.env.INSTAGRAM_SESSIONID = "owner-ok-session";
    vi.stubGlobal(
      "fetch",
      (async () => jsonResponse({ status: "ok", user: { pk: "321", username: "owner" } }, 200)) as never
    );
    expect(await validateSessionOwner()).toEqual({ status: "ok" });
  });

  it("reports login_required for owner 401 (fail-fast, maps to SESSION_EXPIRED)", async () => {
    process.env.INSTAGRAM_SESSIONID = "owner-dead-session";
    vi.stubGlobal("fetch", (async () => jsonResponse({ message: "login required" }, 401)) as never);
    // "login required" text without challenge markers on the owner endpoint
    // is still a dead session (authoritative endpoint).
    expect(await validateSessionOwner()).toEqual({ status: "login_required", challenge: false });
    expect(sessionValidationError({ status: "login_required", challenge: false })?.code).toBe("SESSION_EXPIRED");
  });

  it("reports expired_invalid for a bare owner 403", async () => {
    process.env.INSTAGRAM_SESSIONID = "owner-403-session";
    vi.stubGlobal("fetch", (async () => jsonResponse({ message: "forbidden" }, 403)) as never);
    expect(await validateSessionOwner()).toEqual({ status: "expired_invalid" });
  });

  it("flags owner checkpoint payloads as challenge", async () => {
    process.env.INSTAGRAM_SESSIONID = "owner-challenge-session";
    vi.stubGlobal(
      "fetch",
      (async () => jsonResponse({ message: "checkpoint_required", checkpoint_url: "/x/" }, 400)) as never
    );
    expect(await validateSessionOwner()).toEqual({ status: "login_required", challenge: true });
  });

  it("reports rate_limited for owner 429", async () => {
    process.env.INSTAGRAM_SESSIONID = "owner-throttled-session";
    vi.stubGlobal("fetch", (async () => jsonResponse({}, 429)) as never);
    expect(await validateSessionOwner()).toEqual({ status: "rate_limited" });
  });

  it("reports unknown for 200 without owner data (never verifies on bare 200)", async () => {
    process.env.INSTAGRAM_SESSIONID = "owner-bare-session";
    vi.stubGlobal("fetch", (async () => jsonResponse({}, 200)) as never);
    expect(await validateSessionOwner()).toEqual({ status: "unknown" });
  });
});

describe("story challenge detection", () => {
  it("flags checkpoint/challenge/login_required signals", () => {
    expect(isChallengeResponse(400, '{"message":"challenge_required"}', { message: "challenge_required" })).toBe(true);
    expect(isChallengeResponse(403, "checkpoint_required, verify your account", {})).toBe(true);
    expect(isChallengeResponse(200, "suspicious login attempt, verification needed", {})).toBe(true);
  });

  it("ignores ordinary media payloads", () => {
    expect(isChallengeResponse(200, '{"reels_media":[]}', { reels_media: [] })).toBe(false);
    expect(isChallengeResponse(404, "not found", null)).toBe(false);
  });

  it("treats only 5xx as transient (never 401/403/404/410)", () => {
    expect(isTransientInstagramStatus(500)).toBe(true);
    expect(isTransientInstagramStatus(503)).toBe(true);
    expect(isTransientInstagramStatus(401)).toBe(false);
    expect(isTransientInstagramStatus(403)).toBe(false);
    expect(isTransientInstagramStatus(404)).toBe(false);
    expect(isTransientInstagramStatus(410)).toBe(false);
    expect(isTransientInstagramStatus(429)).toBe(false);
  });
});

describe("story transient-only bounded retries", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retries a 5xx once, then succeeds (exactly 2 upstream calls)", async () => {
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      (async () => {
        calls++;
        if (calls === 1) return jsonResponse({ error: "boom" }, 500);
        return jsonResponse({ data: { user: { id: "1" } } }, 200);
      }) as never
    );
    const result = await fetchInstagramJson("https://www.instagram.com/api/v1/x/", "retry-once");
    expect(result.status).toBe(200);
    expect(calls).toBe(2);
  });

  it("never retries 401/403 (final verdict, 1 call)", async () => {
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      (async () => {
        calls++;
        return jsonResponse({ message: "denied" }, 403);
      }) as never
    );
    const state = createStoryResolveState();
    const result = await fetchInstagramJson("https://www.instagram.com/api/v1/x/", "no-retry-auth", {
      includeCookie: false,
      state,
    });
    expect(result.status).toBe(403);
    expect(calls).toBe(1);
  });

  it("throws LOGIN_REQUIRED once for challenge (records sawChallenge, no retry)", async () => {
    process.env.INSTAGRAM_SESSIONID = "challenged-retry-value";
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      (async () => {
        calls++;
        return jsonResponse({ message: "challenge_required" }, 400);
      }) as never
    );
    const state = createStoryResolveState();
    await expect(
      fetchInstagramJson("https://www.instagram.com/api/v1/x/", "no-retry-challenge", {
        includeCookie: true,
        state,
      })
    ).rejects.toMatchObject({ code: "SESSION_EXPIRED" });
    expect(calls).toBe(1);
    expect(state.sawChallenge).toBe(true);
    delete process.env.INSTAGRAM_SESSIONID;
  });

  it("gives up after the bound on persistent transport failure", async () => {
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      (async () => {
        calls++;
        throw new TypeError("fetch failed");
      }) as never
    );
    await expect(fetchInstagramJson("https://www.instagram.com/api/v1/x/", "retry-bound")).rejects.toMatchObject({
      code: "FETCH_FAILED",
    });
    // initial attempt + exactly one bounded retry
    expect(calls).toBe(2);
  });
});

describe("story final errors never masquerade", () => {
  const base = {
    privateHint: false,
    sawLoginWall: false,
    sawAuthedWall: false,
    authedStatus: null as number | null,
    emptyShellCount: 0,
    strategiesTried: ["reels_media"] as string[],
    userExists: true,
    requestId: null,
    webProfileStatus: 200 as number | null,
    reelsStatus: 200 as number | null,
    lastParsedCount: 0 as number | null,
    sessionWasConfigured: true,
  };

  it("rate limit outranks empty tray (never NO_STORY)", () => {
    const err = finalProfileError("storyuser", { ...base, rateLimited: true });
    expect(err.code).toBe("RATE_LIMITED");
    expect(err.statusCode).toBe(429);
  });

  it("challenge outranks empty tray (verification, not absence)", () => {
    const err = finalProfileError("storyuser", { ...base, sawChallenge: true });
    expect(err.code).toBe("SESSION_EXPIRED");
    expect(err.message).toMatch(/challenge/i);
  });

  it("private account stays private", () => {
    const err = finalProfileError("storyuser", { ...base, privateHint: true });
    expect(err.code).toBe("PRIVATE_ACCOUNT");
  });
});

describe("story resolve: video and image media", () => {
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

  it("resolves a video Story with mp4 metadata (type STORY, 9:16)", async () => {
    stubInstagram(PUBLIC_PROFILE, () => reelsMediaResponse([videoItem()]));
    const result = await resolveStoryUrl("https://www.instagram.com/stories/storyuser/");
    expect(result.type).toBe("STORY");
    expect(result.media).toHaveLength(1);
    const first = result.media[0];
    expect(first.type).toBe("video");
    expect(first.format).toBe("mp4");
    expect(first.url).toContain(".mp4");
    expect(first.width).toBe(1080);
    expect(first.height).toBe(1920);
    expect(result.author?.username).toBe("storyuser");
    expect(typeof result.thumbnail).toBe("string");
  });

  it("resolves an image Story with image media only (never a profile pic)", async () => {
    stubInstagram(PUBLIC_PROFILE, () => reelsMediaResponse([imageItem()]));
    const result = await resolveStoryUrl("https://www.instagram.com/stories/imageuser/");
    expect(result.type).toBe("STORY");
    const first = result.media[0];
    expect(first.type).toBe("image");
    expect(first.url).toContain(".jpg");
    expect(first.url).not.toMatch(/profile|avatar|s150x150/);
  });

  it("reports NO_STORY only for a proven-live empty tray", async () => {
    process.env.INSTAGRAM_SESSIONID = "proven-live-session";
    // Session-owner probe proves the session live; the target tray is
    // genuinely empty.
    vi.stubGlobal(
      "fetch",
      (async (input: unknown) => {
        const url = String(input);
        if (url.includes("accounts/current_user")) {
          return jsonResponse({ status: "ok", user: { pk: "999", username: "serviceaccount" } }, 200);
        }
        if (url.includes("web_profile_info")) return PUBLIC_PROFILE();
        if (url.includes("reels_media")) return reelsMediaResponse([]);
        if (url.includes("/stories/") || url.includes("instagram.com/storyuser")) {
          return new Response("<html><body>empty</body></html>", {
            status: 200,
            headers: { "content-type": "text/html" },
          });
        }
        if (url.includes("instagram.com/")) {
          return new Response("<html><body>empty</body></html>", {
            status: 200,
            headers: { "content-type": "text/html" },
          });
        }
        return new Response("not found", { status: 404 });
      }) as never
    );
    // Browser fallback would need Chromium — disable via puppeteer provider
    // guard by leaving RESOLVER_PROVIDER unset (placeholder skips browser).
    await expect(resolveStoryUrl("https://www.instagram.com/stories/emptystoryuser/")).rejects.toMatchObject({
      code: "NO_STORY",
    });
  }, 30_000);
});

describe("story progress never rewinds mid-request", () => {
  it("drops backwards values, keeps stage updates on repeats", () => {
    const seen: Array<[number, string]> = [];
    const emit = createStoryMonotonicProgress((p, s) => seen.push([p, s]));
    emit(10, "validated");
    emit(75, "provider");
    emit(35, "late straggler");
    emit(70, "older stage");
    emit(75, "provider again");
    emit(85, "verifying");
    expect(seen.map(([p]) => p)).toEqual([10, 75, 75, 85]);
  });
});

describe("story metadata cache (5–10 min, no repeat Instagram hits)", () => {
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

  it("serves repeats from cache; bypassCache forces a fresh extraction", async () => {
    let calls = 0;
    stubInstagram(PUBLIC_PROFILE, () => reelsMediaResponse([videoItem()]), () => calls++);
    const url = "https://www.instagram.com/stories/cacheduser/";
    const first = await resolveStoryUrl(url);
    expect(first.media).toHaveLength(1);
    const afterFirst = calls;
    expect(afterFirst).toBeGreaterThan(0);

    const second = await resolveStoryUrl(url);
    expect(second.media[0].url).toBe(first.media[0].url);
    expect(calls).toBe(afterFirst);

    await resolveStoryUrl(url, undefined, { bypassCache: true });
    expect(calls).toBeGreaterThan(afterFirst);
  });
});

describe("story response shapes (both tray structures)", () => {
  const item = {
    pk: "777",
    video_versions: [{ url: STORY_VIDEO_URL, width: 1080, height: 1920 }],
  };

  it("parses reels_media[0].items", () => {
    expect(parseReelsMediaResponse({ reels_media: [{ items: [item] }] })).toHaveLength(1);
  });

  it('parses reels["<USER_ID>"].items', () => {
    expect(parseReelsMediaResponse({ reels: { 222: { items: [item] } } })).toHaveLength(1);
  });

  it("never mistakes an unknown structure for an empty tray", () => {
    expect(parseReelsMediaResponse({ status: "ok", something_else: true })).toHaveLength(0);
  });

  it("builds user lookup on the canonical API host", () => {
    expect(webProfileInfoUrl("someuser")).toBe(
      "https://i.instagram.com/api/v1/users/web_profile_info/?username=someuser"
    );
  });
});

describe("story failures are never cached", () => {
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

  it("failed resolves hit Instagram again (no negative caching)", async () => {
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      (async () => {
        calls++;
        return jsonResponse({}, 404);
      }) as never
    );
    const url = "https://www.instagram.com/stories/ghostuser99/";
    await expect(resolveStoryUrl(url)).rejects.toMatchObject({ code: "USER_NOT_FOUND" });
    const afterFirst = calls;
    expect(afterFirst).toBeGreaterThan(0);
    await expect(resolveStoryUrl(url)).rejects.toMatchObject({ code: "USER_NOT_FOUND" });
    expect(calls).toBe(afterFirst * 2);
  });
});

describe("story URL robustness (@ handles, query params, slashes)", () => {
  it("strips a leading @ from story and profile URLs", () => {
    expect(stripAtPrefix("@someuser")).toBe("someuser");
    expect(stripAtPrefix("someuser")).toBe("someuser");
    expect(parseStoryUrl("https://www.instagram.com/stories/@someuser/").username).toBe("someuser");
    expect(parseStoryUrl("https://www.instagram.com/@someuser/").username).toBe("someuser");
  });

  it("strips query params and trailing slashes", () => {
    const parsed = parseStoryUrl("https://www.instagram.com/stories/someuser/123456/?igsh=abc123&utm_source=x");
    expect(parsed.username).toBe("someuser");
    expect(parsed.storyId).toBe("123456");
    const validated = validateInstagramUrl("https://www.instagram.com/stories/someuser/?igsh=abc123");
    expect(validated.valid).toBe(true);
    expect(validated.parsed?.storyUsername).toBe("someuser");
    expect(validated.parsed?.normalized ?? "").not.toContain("igsh");
  });

  it("accepts @ profile URLs end to end", () => {
    const validated = validateInstagramUrl("https://www.instagram.com/@someuser/");
    expect(validated.valid).toBe(true);
    expect(validated.parsed?.storyUsername).toBe("someuser");
  });
});

describe("story session fail-fast (no fallback chain on dead sessions)", () => {
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

  it("stops with SESSION_EXPIRED on an invalid session without user lookup", async () => {
    process.env.INSTAGRAM_SESSIONID = "dead-failfast-session";
    const fetched: string[] = [];
    vi.stubGlobal(
      "fetch",
      (async (input: unknown) => {
        fetched.push(String(input));
        return jsonResponse({ message: "Please wait", require_login: true }, 401);
      }) as never
    );
    await expect(
      resolveStoryUrl("https://www.instagram.com/stories/someuser/")
    ).rejects.toMatchObject({ code: "SESSION_EXPIRED" });
    // Exactly one request (the owner probe) — no user lookup, no tray fetch,
    // no page scrapes, no browser fallback on a dead identity.
    expect(fetched).toHaveLength(1);
    expect(fetched[0]).toContain("current_user");
  });
});

describe("story media proxy (frontend never touches CDN directly)", () => {
  it("accepts resolved Story CDN URLs for proxying", () => {
    expect(validateProxyUrl(STORY_VIDEO_URL).ok).toBe(true);
    expect(validateProxyUrl(STORY_IMAGE_URL).ok).toBe(true);
  });

  it("rejects non-https, credentialed, and disallowed hosts", () => {
    expect(validateProxyUrl("http://scontent.cdninstagram.com/x.mp4").ok).toBe(false);
    expect(validateProxyUrl("https://user:pass@scontent.cdninstagram.com/x.mp4").ok).toBe(false);
    expect(validateProxyUrl("https://evil.example.com/x.mp4").ok).toBe(false);
    expect(validateProxyUrl("https://127.0.0.1/x.mp4").ok).toBe(false);
  });

  it("maps AppError codes without fabricating media", () => {
    const err = new AppError("RATE_LIMITED", "throttled", 429);
    expect(err.code).toBe("RATE_LIMITED");
    expect(err.statusCode).toBe(429);
  });
});
