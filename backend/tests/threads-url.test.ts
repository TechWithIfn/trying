import { describe, expect, it } from "vitest";
import { validateThreadsUrl } from "../src/lib/validators/threads-url.js";

describe("validateThreadsUrl", () => {
  it("accepts supported Threads hosts and removes query/hash data", () => {
    expect(validateThreadsUrl("https://www.threads.net/@example/post/abc123?utm_source=x#media")).toEqual({
      valid: true,
      parsed: {
        normalized: "https://www.threads.net/@example/post/abc123",
        hostname: "www.threads.net",
        path: "/@example/post/abc123",
      },
    });
    expect(validateThreadsUrl("https://threads.com/@example/post/abc123")).toMatchObject({ valid: true });
  });

  it("rejects unsupported hosts and profile/home URLs", () => {
    expect(validateThreadsUrl("https://example.com/@example/post/abc")).toMatchObject({ valid: false });
    expect(validateThreadsUrl("https://threads.net/@example")).toMatchObject({ valid: false });
    expect(validateThreadsUrl("https://threads.net/")).toMatchObject({ valid: false });
  });
});
