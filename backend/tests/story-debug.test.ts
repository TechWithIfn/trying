/**
 * Protected Story debug endpoint: per-stage diagnostics without secrets.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Server } from "http";
import app from "@/app";

const SECRET = "debug-test-secret-value";

function startServer(): Promise<{ server: Server; base: string }> {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      resolve({ server, base: `http://127.0.0.1:${port}` });
    });
  });
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const VIDEO_URL = "https://scontent.cdninstagram.com/v/t51.29345-15/12345_67890.mp4?stp=dst";

describe("story debug endpoint", () => {
  let server: Server | undefined;
  let base = "";
  let savedNodeEnv: string | undefined;
  let savedDebug: string | undefined;
  let savedAllow: string | undefined;

  beforeEach(async () => {
    savedNodeEnv = process.env.NODE_ENV;
    savedDebug = process.env.DEBUG_SECRET;
    savedAllow = process.env.ALLOW_STORY_DEBUG;
    process.env.DEBUG_SECRET = SECRET;
    delete process.env.ALLOW_STORY_DEBUG;
    vi.unstubAllGlobals();
    const started = await startServer();
    server = started.server;
    base = started.base;
  });

  afterEach(async () => {
    if (server) await closeServer(server);
    server = undefined;
    vi.unstubAllGlobals();
    if (savedNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = savedNodeEnv;
    if (savedDebug === undefined) delete process.env.DEBUG_SECRET;
    else process.env.DEBUG_SECRET = savedDebug;
    if (savedAllow === undefined) delete process.env.ALLOW_STORY_DEBUG;
    else process.env.ALLOW_STORY_DEBUG = savedAllow;
  });

  // Instagram stub that leaves localhost alone: the test helper itself uses
  // global fetch to reach the ephemeral server, so instagram-only routing is
  // required — otherwise the stub answers our own HTTP calls with 404.
  const realFetch = globalThis.fetch;
  function stubInstagramOnly(handler: (url: string) => Promise<Response>): void {
    vi.stubGlobal(
      "fetch",
      (async (input: unknown, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("127.0.0.1") || url.includes("localhost")) {
          return realFetch(input as string, init);
        }
        return handler(url);
      }) as never
    );
  }

  async function debug(query: string): Promise<{ status: number; body: unknown }> {
    const res = await fetch(`${base}/api/debug/story${query}`);
    const body = await res.json().catch(() => null);
    return { status: res.status, body };
  }

  it("answers 404 in production unless explicitly enabled", async () => {
    process.env.NODE_ENV = "production";
    const disabled = await debug(`?url=${encodeURIComponent("https://www.instagram.com/stories/someuser/")}&secret=${SECRET}`);
    expect(disabled.status).toBe(404);
    process.env.ALLOW_STORY_DEBUG = "true";
    stubInstagramOnly(async () => jsonResponse({ data: { user: { id: "1" } } }, 404));
    const enabled = await debug(`?url=${encodeURIComponent("https://www.instagram.com/stories/someuser/")}&secret=${SECRET}`);
    expect(enabled.status).toBe(200);
  });

  it("rejects a wrong secret without revealing anything", async () => {
    const res = await debug(`?url=${encodeURIComponent("https://www.instagram.com/stories/someuser/")}&secret=wrong`);
    expect(res.status).toBe(403);
  });

  it("rejects non-Story URLs", async () => {
    const res = await debug(`?url=${encodeURIComponent("https://www.instagram.com/reel/Abc123/")}&secret=${SECRET}`);
    expect(res.status).toBe(400);
  });

  it("reports per-stage diagnostics without secrets", async () => {
    stubInstagramOnly(async (url: string) => {
      if (url.includes("web_profile_info")) {
        return jsonResponse({ data: { user: { id: "987", username: "someuser", is_private: false } } }, 200);
      }
      if (url.includes("reels_media")) {
        return jsonResponse(
          {
            reels_media: [
              {
                items: [
                  {
                    pk: "1",
                    video_versions: [{ url: VIDEO_URL, width: 1080, height: 1920 }],
                    image_versions2: { candidates: [] },
                    user: { username: "someuser" },
                  },
                ],
              },
            ],
          },
          200
        );
      }
      return new Response("not found", { status: 404 });
    });
    const res = await debug(`?url=${encodeURIComponent("https://www.instagram.com/stories/someuser/")}&secret=${SECRET}`);
    expect(res.status).toBe(200);
    const data = (res.body as { success: boolean; data: Record<string, unknown> }).data;
    expect(data.parsedUsername).toBe("someuser");
    expect(data.resolvedUserId).toBe(true);
    expect(data.isPrivate).toBe(false);
    expect(data.responseShape).toBe("reels_media");
    expect(data.rawItemCount).toBe(1);
    expect(data.validMediaCount).toBe(1);
    expect(data.finalMediaType).toBe("video");
    expect(data.lastError).toBeNull();
    expect(data.failedStage).toBeNull();
    // No session in this environment: presence flags are false booleans and
    // no owner probe ran.
    expect(data.envCookiesPresent).toEqual({ sessionId: false, csrfToken: false, dsUserId: false });
    expect(data.currentUserStatus).toBeNull();
    // Secrecy: presence flags are booleans (never values), the secret never
    // appears, no cookie material leaks, and no media URLs are returned.
    const raw = JSON.stringify(res.body);
    expect(raw).not.toMatch(/sessionid=/i);
    expect(raw).not.toMatch(/csrftoken=/i);
    expect(raw).not.toMatch(/ds_user_id=/i);
    expect(raw).not.toContain(SECRET);
    expect(raw).not.toMatch(/\.mp4\?/);
  });

  it("reports session materials, owner status and failed stage without values", async () => {
    process.env.INSTAGRAM_SESSIONID = "debug-session-value";
    process.env.INSTAGRAM_CSRFTOKEN = "debug-csrf-value";
    stubInstagramOnly(async (url: string) => {
      if (url.includes("accounts/current_user")) {
        return jsonResponse({ message: "login required" }, 401);
      }
      return jsonResponse({}, 404);
    });
    const res = await debug(`?url=${encodeURIComponent("https://www.instagram.com/stories/someuser/")}&secret=${SECRET}`);
    expect(res.status).toBe(200);
    const data = (res.body as { success: boolean; data: Record<string, unknown> }).data;
    expect(data.envCookiesPresent).toEqual({ sessionId: true, csrfToken: true, dsUserId: false });
    expect(data.currentUserStatus).toBe(401);
    expect(data.sessionValid).toBe(false);
    expect(data.failedStage).toBe("session-validation");
    expect(data.lastError).toMatchObject({ code: "SESSION_EXPIRED" });
    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain("debug-session-value");
    expect(raw).not.toContain("debug-csrf-value");
    expect(raw).not.toContain(SECRET);
    delete process.env.INSTAGRAM_SESSIONID;
    delete process.env.INSTAGRAM_CSRFTOKEN;
  });

  it("surfaces lookup failures as codes, never as media", async () => {
    stubInstagramOnly(async () => jsonResponse({}, 404));
    const res = await debug(`?url=${encodeURIComponent("https://www.instagram.com/stories/nouser/")}&secret=${SECRET}`);
    expect(res.status).toBe(200);
    const data = (res.body as { success: boolean; data: Record<string, unknown> }).data;
    expect(data.resolvedUserId).toBe(false);
    expect(data.validMediaCount).toBe(0);
    expect(data.finalMediaType).toBeNull();
    expect(data.lastError).toMatchObject({ code: "USER_NOT_FOUND" });
  });
});
