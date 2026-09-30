/**
 * Embed-404 dead-link fast path tests (no browser needed).
 *
 * Instagram's public embed endpoint (/p/<shortcode>/embed/) 404s for
 * removed/private shortcodes. Combined with zero video signals from the main
 * page fetch, that is positive evidence of a dead link — so the provider
 * must fail fast with CONTENT_NOT_FOUND instead of burning ~17s of browser
 * work to reach an empty shell and the same answer.
 *
 * Both tests run entirely on stubbed fetch: the CONTENT_NOT_FOUND branch
 * throws before any browser launch, and the conjunction test succeeds
 * through the no-browser fast path.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PuppeteerProvider } from "@/lib/providers/puppeteer.js";
import { AppError } from "@/lib/errors.js";

const DEAD_REEL = "https://www.instagram.com/reel/DeadReel001/";
const DEAD_EMBED = "https://www.instagram.com/p/DeadReel001/embed/";
const LIVE_REEL = "https://www.instagram.com/reel/LiveReel001/";
const LIVE_EMBED = "https://www.instagram.com/p/LiveReel001/embed/";
const CDN_VIDEO = "https://scontent-iad3-2.xx.fbcdn.net/o1/v/t16/live-clip.mp4?sig=ok";

const MP4_HEAD = (() => {
  const b = Buffer.alloc(20 * 1024, 0x41);
  b.write("ftyp", 4);
  b.write("isom", 8);
  return b;
})();

const LIVE_HTML = [
  "<html><head>",
  `<meta property="og:video" content="${CDN_VIDEO}">`,
  `<meta property="og:image" content="https://scontent-iad3-2.xx.fbcdn.net/v/photo.jpg?sig=p">`,
  "</head><body>live reel page</body></html>",
].join("");

function stubFetch(handler: (url: string, init?: RequestInit) => Promise<Response> | Response) {
  vi.stubGlobal(
    "fetch",
    (async (input: unknown, init?: unknown) => handler(String(input), init as RequestInit)) as never
  );
}

describe("embed-404 dead-link fast path", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("embed 404 + zero main-page video signals fails fast with CONTENT_NOT_FOUND", async () => {
    stubFetch((url, init) => {
      if (url.startsWith(DEAD_EMBED)) {
        return new Response("not found", {
          status: 404,
          headers: { "content-type": "text/html" },
        });
      }
      if (url.startsWith("https://www.instagram.com/reel/DeadReel001/")) {
        // Plain-HTTP prefetch transport failure (status:null path).
        throw new TypeError("fetch failed");
      }
      throw new Error(`unexpected fetch in test: ${url} ${init?.method ?? "GET"}`);
    });
    const provider = new PuppeteerProvider();
    const started = Date.now();
    const failure = await provider.resolve(DEAD_REEL).then(
      () => null,
      (err: unknown) => err
    );
    // Honest dead-link code — never a timeout, never a rate-limit lie.
    expect(failure).toBeInstanceOf(AppError);
    expect((failure as AppError).code).toBe("CONTENT_NOT_FOUND");
    expect((failure as AppError).statusCode).toBe(404);
    // Fast: no browser launch, no settle wait, no probe fan-out.
    expect(Date.now() - started).toBeLessThan(10_000);
  });

  it("embed 404 does NOT kill a resolve the main page can satisfy (conjunction rule)", async () => {
    stubFetch((url, init) => {
      const method = (init?.method ?? "GET").toUpperCase();
      if (url.startsWith(LIVE_EMBED)) {
        return new Response("not found", {
          status: 404,
          headers: { "content-type": "text/html" },
        });
      }
      if (url.startsWith("https://www.instagram.com/reel/LiveReel001/")) {
        return new Response(LIVE_HTML, {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      }
      if (url.startsWith(CDN_VIDEO)) {
        if (method === "HEAD") {
          return new Response(null, {
            status: 200,
            headers: { "content-type": "video/mp4", "content-length": String(MP4_HEAD.length) },
          });
        }
        const slice = MP4_HEAD.subarray(0, Math.min(MP4_HEAD.length, 65_536));
        return new Response(slice as unknown as BodyInit, {
          status: 206,
          headers: {
            "content-type": "video/mp4",
            "content-range": `bytes 0-${slice.length - 1}/${MP4_HEAD.length}`,
            "content-length": String(slice.length),
          },
        });
      }
      throw new Error(`unexpected fetch in test: ${url} ${method}`);
    });
    const provider = new PuppeteerProvider();
    const result = await provider.resolve(LIVE_REEL);
    expect(result.type).toBe("REEL");
    expect(result.media).toHaveLength(1);
    expect(result.media[0].type).toBe("video");
    expect(result.media[0].url).toBe(CDN_VIDEO);
  }, 30_000);
});
