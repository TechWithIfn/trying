/**
 * Server-side Instagram session: parsing/validation/header-wiring for the
 * Reel recovery path. Secrets are asserted by SHAPE only — values are never
 * logged here either.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getInstagramSessionCookie,
  getSessionState,
  isInstagramSessionConfigured,
  markSessionInvalid,
  normalizeSessionIdValue,
  noteSessionLive,
  parseSessionCookies,
} from "@/lib/instagram-session.js";
import { fetchMetadata } from "@/lib/providers/puppeteer.js";

const SESSION_ENV_KEYS = [
  "INSTAGRAM_COOKIE",
  "IG_COOKIE",
  "INSTAGRAM_COOKIE_STRING",
  "INSTAGRAM_SESSION_COOKIE",
  "INSTAGRAM_SESSIONID",
  "IG_SESSIONID",
  "INSTAGRAM_SESSION_ID",
  "SESSIONID",
] as const;

let savedEnv: Record<string, string | undefined>;

function clearSessionEnv() {
  for (const key of SESSION_ENV_KEYS) delete process.env[key];
}

describe("instagram session helper", () => {
  beforeEach(() => {
    savedEnv = {};
    for (const key of SESSION_ENV_KEYS) savedEnv[key] = process.env[key];
    clearSessionEnv();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    for (const key of SESSION_ENV_KEYS) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
    vi.unstubAllGlobals();
  });

  it("returns undefined when nothing is configured", () => {
    expect(getInstagramSessionCookie()).toBeUndefined();
    expect(isInstagramSessionConfigured()).toBe(false);
    expect(parseSessionCookies()).toEqual([]);
  });

  it("accepts a full cookie string from INSTAGRAM_COOKIE", () => {
    process.env.INSTAGRAM_COOKIE = "sessionid=abc123; csrftoken=xyz; ds_user_id=1";
    expect(getInstagramSessionCookie()).toBe("sessionid=abc123; csrftoken=xyz; ds_user_id=1");
    expect(isInstagramSessionConfigured()).toBe(true);
  });

  it("wraps a bare sessionid into sessionid=", () => {
    process.env.INSTAGRAM_SESSIONID = "abc123value";
    expect(getInstagramSessionCookie()).toBe("sessionid=abc123value");
    expect(isInstagramSessionConfigured()).toBe(true);
  });

  it("decodes a URL-encoded sessionid to browser form (literal colons)", () => {
    expect(normalizeSessionIdValue("62906554821%3AN2K48vJbPOdjuR%3A15%3AAYFk")).toBe(
      "62906554821:N2K48vJbPOdjuR:15:AYFk"
    );
    process.env.INSTAGRAM_SESSIONID = "62906554821%3AN2K48vJbPOdjuR%3A15%3AAYFk";
    expect(getInstagramSessionCookie()).toBe("sessionid=62906554821:N2K48vJbPOdjuR:15:AYFk");
    expect(parseSessionCookies()).toEqual([
      { name: "sessionid", value: "62906554821:N2K48vJbPOdjuR:15:AYFk", domain: ".instagram.com" },
    ]);
  });

  it("leaves plain and malformed values untouched", () => {
    expect(normalizeSessionIdValue("62906554821:N2:15:AY")).toBe("62906554821:N2:15:AY");
    expect(normalizeSessionIdValue("abc%ZZdef")).toBe("abc%ZZdef");
    expect(normalizeSessionIdValue("notasession")).toBe("notasession");
  });

  it("removes dashboard-style surrounding quotes before forwarding the cookie", () => {
    process.env.INSTAGRAM_SESSIONID = '"abc123value"';
    expect(getInstagramSessionCookie()).toBe("sessionid=abc123value");
    process.env.INSTAGRAM_COOKIE = '"sessionid=abc123; csrftoken=xyz"';
    expect(getInstagramSessionCookie()).toBe("sessionid=abc123; csrftoken=xyz");
  });

  it("prefers full cookie vars over sessionid vars", () => {
    process.env.INSTAGRAM_SESSIONID = "abc123value";
    process.env.IG_COOKIE = "sessionid=fromcookie; csrftoken=t";
    expect(getInstagramSessionCookie()).toBe("sessionid=fromcookie; csrftoken=t");
  });

  it("rejects values with CR/LF (header-injection guard)", () => {
    process.env.INSTAGRAM_COOKIE = "sessionid=abc\r\nX-Injected: 1";
    expect(getInstagramSessionCookie()).toBeUndefined();
    expect(isInstagramSessionConfigured()).toBe(false);
    expect(parseSessionCookies()).toEqual([]);
  });

  it("parses browser cookies scoped to .instagram.com, drops bare flags", () => {
    process.env.INSTAGRAM_COOKIE = "sessionid=abc123; csrftoken=xyz; Secure; ds_user_id=9";
    const jar = parseSessionCookies();
    expect(jar).toEqual([
      { name: "sessionid", value: "abc123", domain: ".instagram.com" },
      { name: "csrftoken", value: "xyz", domain: ".instagram.com" },
      { name: "ds_user_id", value: "9", domain: ".instagram.com" },
    ]);
  });

  it("drops malformed parts instead of throwing", () => {
    process.env.INSTAGRAM_COOKIE = "sessionid=ok; =noname; novalue; a=b=c";
    const jar = parseSessionCookies();
    expect(jar.map((c) => c.name)).toEqual(["sessionid", "a"]);
  });

  it("fetchMetadata attaches the session Cookie to instagram fetches", async () => {
    process.env.INSTAGRAM_COOKIE = "sessionid=abc123; csrftoken=xyz";
    const captured: Array<Record<string, string>> = [];
    vi.stubGlobal(
      "fetch",
      (async (_input: unknown, init?: unknown) => {
        captured.push({ ...((init as RequestInit | undefined)?.headers as Record<string, string>) });
        return new Response("<html></html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      }) as never
    );
    await fetchMetadata("https://www.instagram.com/reel/Abc123/");
    expect(captured.length).toBeGreaterThan(0);
    expect(captured[0].Cookie).toBe("sessionid=abc123; csrftoken=xyz");
  });

  it("fetchMetadata sends no Cookie header without a session (anonymous unchanged)", async () => {
    const captured: Array<Record<string, string>> = [];
    vi.stubGlobal(
      "fetch",
      (async (_input: unknown, init?: unknown) => {
        captured.push({ ...((init as RequestInit | undefined)?.headers as Record<string, string>) });
        return new Response("<html></html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      }) as never
    );
    await fetchMetadata("https://www.instagram.com/reel/Abc123/");
    expect(captured.length).toBeGreaterThan(0);
    for (const headers of captured) {
      expect(headers.Cookie).toBeUndefined();
    }
  });

  it("reports UNCONFIGURED lifecycle with no session", () => {
    expect(getSessionState()).toEqual({
      configured: false,
      usable: false,
      state: "UNCONFIGURED",
      source: null,
      validated: false,
    });
  });

  it("quarantines a dead session so later requests degrade to anonymous", () => {
    process.env.INSTAGRAM_SESSIONID = "62906554821:dead:15:toquarantine";
    expect(getSessionState().state).toBe("CONFIGURED_UNKNOWN");
    expect(isInstagramSessionConfigured()).toBe(true);
    markSessionInvalid();
    const quarantined = getSessionState();
    expect(quarantined.state).toBe("INVALID");
    expect(quarantined.usable).toBe(false);
    expect(quarantined.configured).toBe(true);
    expect(quarantined.source).toBe("INSTAGRAM_SESSIONID");
    // Cookie and jar both go dark: nothing can re-attach the dead value.
    expect(getInstagramSessionCookie()).toBeUndefined();
    expect(isInstagramSessionConfigured()).toBe(false);
    expect(parseSessionCookies()).toEqual([]);
  });

  it("lifts quarantine when credentials rotate (no restart needed)", () => {
    process.env.INSTAGRAM_SESSIONID = "62906554821:dead:15:toquarantine";
    markSessionInvalid();
    expect(getSessionState().state).toBe("INVALID");
    process.env.INSTAGRAM_SESSIONID = "62906554821:fresh:15:rotated";
    const after = getSessionState();
    expect(after.state).toBe("CONFIGURED_UNKNOWN");
    expect(after.usable).toBe(true);
    expect(getInstagramSessionCookie()).toContain("sessionid=");
  });

  it("marks a proven-live session VALID", () => {
    process.env.INSTAGRAM_SESSIONID = "62906554821:live:15:provenok";
    noteSessionLive();
    const live = getSessionState();
    expect(live.state).toBe("VALID");
    expect(live.validated).toBe(true);
    expect(live.usable).toBe(true);
  });
});
