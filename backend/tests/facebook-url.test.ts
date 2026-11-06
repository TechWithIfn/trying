import { describe, expect, it } from "vitest";
import { validateFacebookUrl } from "../src/lib/validators/facebook-url.js";

describe("validateFacebookUrl", () => {
  it.each([
    "https://www.facebook.com/watch/?v=10153231379946729",
    "https://www.facebook.com/reel/123456789012345",
    "https://www.facebook.com/share/r/abc123/",
    "https://fb.watch/abc123/",
  ])("accepts public Facebook URL shape: %s", (url) => {
    expect(validateFacebookUrl(url).valid).toBe(true);
  });

  it.each(["https://example.com/video", "javascript:alert(1)", "https://facebook.com/"])(
    "rejects unsafe or non-video URL: %s",
    (url) => {
      expect(validateFacebookUrl(url).valid).toBe(false);
    }
  );
});
