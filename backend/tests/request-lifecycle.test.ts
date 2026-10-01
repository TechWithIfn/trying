/**
 * Request-lifecycle repair tests (timeout hierarchy + redirect handling).
 *
 *  1. Redirect-away detection (pure): a Reel bounced to the homepage,
 *     off-domain, or onto a path that lost its shortcode is recognized so
 *     the resolver never grinds extraction work against the wrong document.
 *  2. SSE timeout answers exactly one STREAM_TIMEOUT error event and aborts
 *     the resolver job (provider signal aborted, pool slot released).
 *  3. Client disconnect aborts the in-flight resolver job.
 *  4. STREAM_TIMEOUT is a 504 retryable code distinct from RESOLVER_TIMEOUT.
 *  5. No first-party legacy `url.parse()` usage (DEP0169 hygiene).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import type { Server } from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

vi.mock("@/lib/providers/index.js", () => ({
  createProvider: vi.fn(),
}));

import { createProvider } from "@/lib/providers/index.js";
import { resetResolver } from "@/lib/resolvers/index.js";
import { resetPoolForTests, getResolverPool } from "@/lib/resolver-pool.js";
import { isRedirectedAwayFromTarget } from "@/lib/providers/puppeteer.js";
import { createError } from "@/lib/errors.js";
import app from "@/app";

const mockCreateProvider = () => vi.mocked(createProvider);

const REEL = "https://www.instagram.com/reel/RedirectAway001/";

function startServer(handler: express.Express): Promise<{ server: Server; base: string }> {
  return new Promise((resolve) => {
    const server = handler.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      resolve({ server, base: `http://127.0.0.1:${port}` });
    });
  });
}
function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve()))
  );
}

async function readStreamToEnd(res: Response, timeoutMs = 10_000): Promise<string> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let text = "";
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  await reader.cancel().catch(() => {});
  return text;
}

describe("redirect-away detection", () => {
  it("Reel bounced to the homepage is redirected away", () => {
    expect(
      isRedirectedAwayFromTarget(REEL, {
        finalUrl: "https://www.instagram.com/",
        finalHost: "www.instagram.com",
        finalPath: "/",
      })
    ).toBe(true);
  });

  it("Reel that stayed on its page is not redirected away", () => {
    expect(
      isRedirectedAwayFromTarget(REEL, {
        finalUrl: "https://www.instagram.com/reel/RedirectAway001/",
        finalHost: "www.instagram.com",
        finalPath: "/reel/RedirectAway001/",
      })
    ).toBe(false);
  });

  it("canonical plural-to-singular redirect keeps the shortcode", () => {
    expect(
      isRedirectedAwayFromTarget("https://www.instagram.com/reels/RedirectAway001/", {
        finalUrl: "https://www.instagram.com/reel/RedirectAway001/",
        finalHost: "www.instagram.com",
        finalPath: "/reel/RedirectAway001/",
      })
    ).toBe(false);
  });

  it("landing on a different shortcode lost the target", () => {
    expect(
      isRedirectedAwayFromTarget(REEL, {
        finalUrl: "https://www.instagram.com/reel/SomeOtherClip/",
        finalHost: "www.instagram.com",
        finalPath: "/reel/SomeOtherClip/",
      })
    ).toBe(true);
  });

  it("off-domain bounce is redirected away", () => {
    expect(
      isRedirectedAwayFromTarget(REEL, {
        finalUrl: "https://example.com/",
        finalHost: "example.com",
        finalPath: "/",
      })
    ).toBe(true);
  });

  it("login interstitial is off-target (the gate branch still diagnoses it)", () => {
    // The Reel did not load, so extraction is skipped — but the downstream
    // login-wall branch (PAGE_STATE_FN) still reports LOGIN_REQUIRED.
    expect(
      isRedirectedAwayFromTarget(REEL, {
        finalUrl: "https://www.instagram.com/accounts/login/",
        finalHost: "www.instagram.com",
        finalPath: "/accounts/login/",
      })
    ).toBe(true);
  });

  it("failed navigation (no final URL) is not a redirect verdict", () => {
    expect(
      isRedirectedAwayFromTarget(REEL, { finalUrl: null, finalHost: null, finalPath: null })
    ).toBe(false);
  });

  it("requesting the homepage itself is not redirected away", () => {
    expect(
      isRedirectedAwayFromTarget("https://www.instagram.com/", {
        finalUrl: "https://www.instagram.com/",
        finalHost: "www.instagram.com",
        finalPath: "/",
      })
    ).toBe(false);
  });
});

describe("SSE timeout and disconnect lifecycle", () => {
  let capturedSignal: AbortSignal | null = null;

  beforeEach(() => {
    resetResolver();
    resetPoolForTests();
    mockCreateProvider().mockReset();
    capturedSignal = null;
    vi.unstubAllGlobals();
    delete process.env.RESOLVER_TIMEOUT_MS;
    delete process.env.WORKER_JOB_TIMEOUT_MS;
    // A provider that hangs until cancelled: proves abort propagation.
    mockCreateProvider().mockReturnValue({
      name: "test-mock",
      resolve: (_url: string, _onProgress?: unknown, opts?: { signal?: AbortSignal }) =>
        new Promise<never>((_, reject) => {
          capturedSignal = opts?.signal ?? null;
          opts?.signal?.addEventListener(
            "abort",
            () => {
              const cancelled = new Error("resolve cancelled by caller");
              cancelled.name = "AbortError";
              reject(cancelled);
            },
            { once: true }
          );
        }),
    } as never);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.RESOLVER_TIMEOUT_MS;
    delete process.env.WORKER_JOB_TIMEOUT_MS;
    resetPoolForTests();
  });

  it("SSE timeout sends one STREAM_TIMEOUT error and cancels the resolver job", async () => {
    process.env.RESOLVER_TIMEOUT_MS = "400";
    process.env.WORKER_JOB_TIMEOUT_MS = "60000";
    resetPoolForTests();
    const { server, base } = await startServer(app);
    try {
      const res = await fetch(
        `${base}/api/resolve/stream?url=${encodeURIComponent("https://www.instagram.com/reel/SseTimeout001/")}`
      );
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/event-stream");
      const text = await readStreamToEnd(res);
      expect(text).toContain("event: error");
      expect(text).toContain("STREAM_TIMEOUT");
      // The deadline aborted the job: no browser work outlives the response.
      expect(capturedSignal).not.toBeNull();
      expect(capturedSignal!.aborted).toBe(true);
      // Pool slot released once the cancelled work settles.
      await new Promise((r) => setTimeout(r, 200));
      expect(getResolverPool().snapshot().totalActive).toBe(0);
    } finally {
      await closeServer(server);
    }
  }, 15000);

  it("client disconnect aborts the in-flight resolver job", async () => {
    process.env.RESOLVER_TIMEOUT_MS = "30000";
    process.env.WORKER_JOB_TIMEOUT_MS = "60000";
    resetPoolForTests();
    const { server, base } = await startServer(app);
    try {
      const controller = new AbortController();
      const res = await fetch(
        `${base}/api/resolve/stream?url=${encodeURIComponent("https://www.instagram.com/reel/SseDisconnect001/")}`,
        { signal: controller.signal }
      );
      const reader = res.body!.getReader();
      await reader.read();
      await reader.cancel().catch(() => {});
      controller.abort();
      await new Promise((r) => setTimeout(r, 800));
      expect(capturedSignal).not.toBeNull();
      expect(capturedSignal!.aborted).toBe(true);
      expect(getResolverPool().snapshot().totalActive).toBe(0);
    } finally {
      await closeServer(server);
    }
  }, 15000);
});

describe("STREAM_TIMEOUT error code", () => {
  it("is a 504 retryable timeout distinct from RESOLVER_TIMEOUT", () => {
    const err = createError("STREAM_TIMEOUT");
    expect(err.code).toBe("STREAM_TIMEOUT");
    expect(err.statusCode).toBe(504);
    const response = err.toResponse();
    expect(response.success).toBe(false);
    if (!response.success) {
      expect(response.error.retryable).toBe(true);
      expect(response.error.message).toBeTruthy();
    }
    expect(createError("RESOLVER_TIMEOUT").code).not.toBe("STREAM_TIMEOUT");
  });
});

describe("legacy URL parsing hygiene (DEP0169)", () => {
  it("first-party backend code uses WHATWG URL, never url.parse()", () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const srcDir = path.resolve(here, "../src");
    const offenders: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (!entry.name.endsWith(".ts")) continue;
        const text = fs.readFileSync(full, "utf8");
        if (
          /(^|[^\w$.])url\.parse\(/.test(text) ||
          /require\(["']url["']\)/.test(text) ||
          /from ["']url["']/.test(text) ||
          /from ["']node:url["']/.test(text)
        ) {
          offenders.push(path.relative(srcDir, full));
        }
      }
    };
    walk(srcDir);
    expect(offenders).toEqual([]);
  });
});
