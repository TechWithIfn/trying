/**
 * /api/stream range-streaming regression tests (backend-only, no UI change).
 *
 * Covers the HTML5 <video> playback contract against a stubbed Instagram CDN
 * upstream with a realistic signed URL shape (bytestart/byteend + _nc_*):
 *  1. Honored Range -> 206 forwarded with matching Content-Range/Length.
 *  2. CDN embedded-slice 206 (bytes 818-909) for a bytes=0-... request is
 *     NEVER forwarded: the backend refetches the full object and answers a
 *     correct 206 for the browser's range (the reported production bug).
 *  3. Open-ended and seek ranges return the exact requested bytes.
 *  4. No Range -> 200 full body.
 *  5. Signed query params reach upstream byte-identical (no stripping).
 *  6. Persistent slice / 403 / HTML masquerade -> honest errors, never a
 *     lying 206.
 *  7. HEAD -> headers only, no body.
 *  8. SSRF validation untouched (non-CDN host rejected).
 *
 * Byte patterns (not uniform fills) prove the returned slice is exactly the
 * requested window, starting with a real `ftyp` box the <video> element
 * needs for loadedmetadata.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import type { Server } from "http";
import app from "@/app";

const TOTAL = 200 * 1024;
const MP4 = (() => {
  const b = Buffer.alloc(TOTAL);
  for (let i = 0; i < b.length; i++) b[i] = i % 251;
  b.write("ftyp", 4);
  b.write("isom", 8);
  return b;
})();

// Realistic signed Instagram CDN video URL shape.
const CDN =
  "https://scontent-ord5-2.xx.fbcdn.net/v/t16/abcdef1234.mp4?bytestart=818&byteend=909" +
  "&_nc_cat=101&_nc_sid=abc123&_nc_ht=scontent-ord5-2.xx.fbcdn.net&_nc_ohc=xyz" +
  "&efg=eyJ2IjoxfQ%3D%3D&ccb=11-4&oh=00&oe=6ABCDEF&_nc_vs=abc";
const SOURCE = "https://www.instagram.com/reel/ReelStreamRange001/";

type CdnMode =
  | "honor-range"
  | "embedded-slice"
  | "always-slice"
  | "expired"
  | "html";

const stubPolicy = {
  mode: "honor-range" as CdnMode,
  lastUpstreamUrl: "",
  lastUpstreamRange: null as string | null,
};

function sliceResponse(start: number, end: number) {
  const slice = MP4.subarray(start, end + 1);
  return new Response(slice as unknown as BodyInit, {
    status: 206,
    headers: {
      "content-type": "video/mp4",
      "content-range": `bytes ${start}-${end}/${TOTAL}`,
      "content-length": String(slice.length),
      "accept-ranges": "bytes",
    },
  });
}

function stubUpstreamFetch() {
  const realFetch = globalThis.fetch.bind(globalThis);
  const handler = vi.fn(async (input: unknown, init?: unknown) => {
    const url = String(input);
    if (url.startsWith("http://127.0.0.1:") || url.startsWith("http://localhost:")) {
      return realFetch(input as string, init as RequestInit);
    }
    const ini = (init ?? {}) as RequestInit;
    const u = new URL(url);
    stubPolicy.lastUpstreamUrl = url;
    const range = new Headers(ini.headers as HeadersInit).get("range");
    stubPolicy.lastUpstreamRange = range;

    if (stubPolicy.mode === "expired") {
      return new Response("blocked", { status: 403 });
    }
    if (stubPolicy.mode === "html") {
      return new Response("<html>login required</html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    }
    const bs = u.searchParams.get("bytestart");
    const be = u.searchParams.get("byteend");
    const embeddedSlice = bs !== null && be !== null;
    if (stubPolicy.mode === "always-slice" && embeddedSlice) {
      return sliceResponse(parseInt(bs, 10), parseInt(be, 10));
    }
    if (stubPolicy.mode === "embedded-slice" && embeddedSlice && range) {
      // Production failure mode: the edge answers ranged requests with its
      // embedded bytestart/byteend slice, ignoring the Range header.
      return sliceResponse(parseInt(bs, 10), parseInt(be, 10));
    }
    if (range) {
      const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
      if (m) {
        if (m[1] === "" && m[2] !== "") {
          // Suffix range: last N bytes.
          const n = parseInt(m[2], 10);
          const start = Math.max(0, TOTAL - n);
          return sliceResponse(start, TOTAL - 1);
        }
        const start = m[1] === "" ? 0 : parseInt(m[1], 10);
        const end = m[2] === "" ? TOTAL - 1 : Math.min(parseInt(m[2], 10), TOTAL - 1);
        if (start >= TOTAL) {
          return new Response("unsatisfiable", { status: 416 });
        }
        return sliceResponse(start, end);
      }
    }
    return new Response(MP4 as unknown as BodyInit, {
      status: 200,
      headers: {
        "content-type": "video/mp4",
        "content-length": String(TOTAL),
        "accept-ranges": "bytes",
      },
    });
  });
  vi.stubGlobal("fetch", handler as never);
}

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

const streamUrl = (extra = "") =>
  `/api/stream?url=${encodeURIComponent(CDN)}&source=${encodeURIComponent(SOURCE)}${extra}`;

describe("/api/stream range streaming", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    stubPolicy.mode = "honor-range";
    stubPolicy.lastUpstreamUrl = "";
    stubPolicy.lastUpstreamRange = null;
    stubUpstreamFetch();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("1. honored Range bytes=0-1023 -> 206 with matching headers and exact bytes", async () => {
    const { server, base } = await startServer(app);
    try {
      const res = await fetch(`${base}${streamUrl()}`, {
        headers: { Range: "bytes=0-1023" },
      });
      expect(res.status).toBe(206);
      expect(res.headers.get("content-type")).toBe("video/mp4");
      expect(res.headers.get("accept-ranges")).toBe("bytes");
      expect(res.headers.get("content-range")).toBe(`bytes 0-1023/${TOTAL}`);
      expect(res.headers.get("content-length")).toBe("1024");
      const bytes = Buffer.from(await res.arrayBuffer());
      expect(bytes.length).toBe(1024);
      expect(bytes.equals(MP4.subarray(0, 1024))).toBe(true);
      // MP4 head the <video> element needs for loadedmetadata.
      expect(bytes.subarray(4, 8).toString()).toBe("ftyp");
    } finally {
      await closeServer(server);
    }
  });

  it("2. embedded bytestart slice is never forwarded: browser range is honored", async () => {
    stubPolicy.mode = "embedded-slice";
    const { server, base } = await startServer(app);
    try {
      const res = await fetch(`${base}${streamUrl()}`, {
        headers: { Range: "bytes=0-1023" },
      });
      // Must NOT be the CDN's tiny arbitrary slice.
      expect(res.headers.get("content-range")).not.toBe(`bytes 818-909/${TOTAL}`);
      expect(res.status).toBe(206);
      expect(res.headers.get("content-type")).toBe("video/mp4");
      expect(res.headers.get("accept-ranges")).toBe("bytes");
      expect(res.headers.get("content-range")).toBe(`bytes 0-1023/${TOTAL}`);
      expect(res.headers.get("content-length")).toBe("1024");
      const bytes = Buffer.from(await res.arrayBuffer());
      expect(bytes.length).toBe(1024);
      expect(bytes.equals(MP4.subarray(0, 1024))).toBe(true);
      expect(bytes.subarray(4, 8).toString()).toBe("ftyp");
    } finally {
      await closeServer(server);
    }
  });

  it("3. open-ended bytes=0- streams the whole object as 206 with full length", async () => {
    const { server, base } = await startServer(app);
    try {
      const res = await fetch(`${base}${streamUrl()}`, {
        headers: { Range: "bytes=0-" },
      });
      expect(res.status).toBe(206);
      expect(res.headers.get("content-range")).toBe(`bytes 0-${TOTAL - 1}/${TOTAL}`);
      expect(res.headers.get("content-length")).toBe(String(TOTAL));
      const bytes = Buffer.from(await res.arrayBuffer());
      expect(bytes.length).toBe(TOTAL);
      expect(bytes.equals(MP4)).toBe(true);
    } finally {
      await closeServer(server);
    }
  });

  it("4. seek range returns exactly the requested window", async () => {
    const { server, base } = await startServer(app);
    try {
      const res = await fetch(`${base}${streamUrl()}`, {
        headers: { Range: "bytes=100000-101023" },
      });
      expect(res.status).toBe(206);
      expect(res.headers.get("content-range")).toBe(`bytes 100000-101023/${TOTAL}`);
      expect(res.headers.get("content-length")).toBe("1024");
      const bytes = Buffer.from(await res.arrayBuffer());
      expect(bytes.equals(MP4.subarray(100000, 101024))).toBe(true);
    } finally {
      await closeServer(server);
    }
  });

  it("5. no Range -> 200 full body with length", async () => {
    const { server, base } = await startServer(app);
    try {
      const res = await fetch(`${base}${streamUrl()}`);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("video/mp4");
      expect(res.headers.get("accept-ranges")).toBe("bytes");
      expect(res.headers.get("content-length")).toBe(String(TOTAL));
      const bytes = Buffer.from(await res.arrayBuffer());
      expect(bytes.length).toBe(TOTAL);
    } finally {
      await closeServer(server);
    }
  });

  it("6. signed CDN query params reach upstream byte-identical (never stripped)", async () => {
    const { server, base } = await startServer(app);
    try {
      await fetch(`${base}${streamUrl()}`, { headers: { Range: "bytes=0-1023" } });
      const upstreamQuery = new URL(stubPolicy.lastUpstreamUrl).searchParams;
      const originalQuery = new URL(CDN).searchParams;
      for (const key of ["bytestart", "byteend", "_nc_cat", "_nc_sid", "_nc_ht", "_nc_ohc", "efg", "ccb", "oh", "oe", "_nc_vs"]) {
        expect(upstreamQuery.get(key)).toBe(originalQuery.get(key));
      }
      // The browser Range traveled as a header, not as URL params.
      expect(stubPolicy.lastUpstreamRange).toBe("bytes=0-1023");
    } finally {
      await closeServer(server);
    }
  });

  it("7. persistent slice -> honest 410, never a lying 206", async () => {
    stubPolicy.mode = "always-slice";
    const { server, base } = await startServer(app);
    try {
      const res = await fetch(`${base}${streamUrl()}`, {
        headers: { Range: "bytes=0-1023" },
      });
      expect(res.status).toBe(410);
      const body = (await res.json()) as { success: boolean; error: { code: string } };
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("MEDIA_URL_EXPIRED");
    } finally {
      await closeServer(server);
    }
  });

  it("8. upstream 403 and HTML masquerade map to expired-media errors", async () => {
    const { server, base } = await startServer(app);
    try {
      stubPolicy.mode = "expired";
      const gone = await fetch(`${base}${streamUrl()}`);
      expect(gone.status).toBe(410);
      stubPolicy.mode = "html";
      const html = await fetch(`${base}${streamUrl()}`);
      expect(html.status).toBe(410);
    } finally {
      await closeServer(server);
    }
  });

  it("9. HEAD answers headers only with full length, no body", async () => {
    const { server, base } = await startServer(app);
    try {
      const res = await fetch(`${base}${streamUrl()}`, { method: "HEAD" });
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("video/mp4");
      expect(res.headers.get("accept-ranges")).toBe("bytes");
      expect(res.headers.get("content-length")).toBe(String(TOTAL));
      const bytes = Buffer.from(await res.arrayBuffer());
      expect(bytes.length).toBe(0);
    } finally {
      await closeServer(server);
    }
  });

  it("10. SSRF validation kept: non-CDN host rejected, missing url rejected", async () => {
    const { server, base } = await startServer(app);
    try {
      const evil = await fetch(
        `${base}/api/stream?url=${encodeURIComponent("https://evil.example.com/x.mp4")}`
      );
      expect(evil.status).toBe(403);
      const missing = await fetch(`${base}/api/stream`);
      expect(missing.status).toBe(400);
    } finally {
      await closeServer(server);
    }
  });

  it("11. suffix range still forwarded and answered by upstream", async () => {
    const { server, base } = await startServer(app);
    try {
      const res = await fetch(`${base}${streamUrl()}`, {
        headers: { Range: "bytes=-500" },
      });
      expect(res.status).toBe(206);
      expect(res.headers.get("content-range")).toBe(`bytes ${TOTAL - 500}-${TOTAL - 1}/${TOTAL}`);
      const bytes = Buffer.from(await res.arrayBuffer());
      expect(bytes.equals(MP4.subarray(TOTAL - 500))).toBe(true);
    } finally {
      await closeServer(server);
    }
  });
});
