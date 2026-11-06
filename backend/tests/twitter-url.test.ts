import { describe, expect, it } from "vitest";
import { validateTwitterUrl } from "../src/lib/validators/twitter-url.js";

describe("validateTwitterUrl", () => {
  it("accepts twitter.com and x.com status URLs and strips tracking data", () => {
    expect(validateTwitterUrl("https://twitter.com/example/status/123456789?ref=share")).toEqual({
      valid: true,
      parsed: {
        normalized: "https://twitter.com/example/status/123456789",
        hostname: "twitter.com",
        postId: "123456789",
      },
    });
    expect(validateTwitterUrl("https://mobile.x.com/example/status/987654321/")).toEqual({
      valid: true,
      parsed: {
        normalized: "https://mobile.x.com/example/status/987654321",
        hostname: "mobile.x.com",
        postId: "987654321",
      },
    });
  });

  it("rejects non-status, non-Twitter/X, and malformed URLs", () => {
    expect(validateTwitterUrl("https://x.com/example")).toMatchObject({ valid: false });
    expect(validateTwitterUrl("https://example.com/example/status/123")).toMatchObject({ valid: false });
    expect(validateTwitterUrl("not a url")).toMatchObject({ valid: false });
  });
});
