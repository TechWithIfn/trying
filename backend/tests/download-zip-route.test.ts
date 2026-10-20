import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "http";
import app from "@/app";

/**
 * Route-level checks for the multi-image ZIP endpoint. These exercise the real
 * Express wiring (validation, SSRF allowlist, method) without depending on a
 * live CDN: the assertions below only cover paths that never reach the network.
 */
describe("GET /api/download/zip", () => {
  let server: Server;
  let base: string;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => resolve());
    });
    const addr = server.address();
    const port = typeof addr === "object" && addr ? addr.port : 0;
    base = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  });

  it("rejects a request with no url param", async () => {
    const res = await fetch(`${base}/api/download/zip?filename=Downloadit%20-%20Trip.zip`);
    expect(res.status).toBe(400);
  });

  it("rejects a single url (that is a normal single download, not a zip)", async () => {
    const url = encodeURIComponent("https://i.pinimg.com/originals/a/b/c/a.jpg");
    const res = await fetch(`${base}/api/download/zip?url=${url}&filename=Downloadit%20-%20Trip.zip`);
    expect(res.status).toBe(400);
  });

  it("rejects disallowed hosts before any fetch", async () => {
    const bad = encodeURIComponent("https://evil.example.com/steal.jpg");
    const res = await fetch(
      `${base}/api/download/zip?url=${bad}&url=${bad}&filename=Downloadit%20-%20Trip.zip`
    );
    expect(res.status).toBe(403);
  });

  it("does not answer the ZIP endpoint over an unsupported method", async () => {
    const res = await fetch(`${base}/api/download/zip`, { method: "POST" });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
