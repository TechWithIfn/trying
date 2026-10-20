import { describe, it, expect } from "vitest";
import { validatePinterestUrl } from "@/lib/validators/pinterest-url";

describe("validatePinterestUrl", () => {
  describe("valid URLs", () => {
    it("accepts a standard pin URL and extracts the pin ID", () => {
      const result = validatePinterestUrl("https://www.pinterest.com/pin/106204676805362606/");
      expect(result.valid).toBe(true);
      expect(result.parsed?.pinId).toBe("106204676805362606");
      expect(result.parsed?.isShortLink).toBe(false);
      expect(result.parsed?.normalized).toBe("https://www.pinterest.com/pin/106204676805362606/");
    });

    it("accepts a pin URL with a slug", () => {
      const result = validatePinterestUrl("https://www.pinterest.com/pin/1234567890123456/some-slug/");
      expect(result.valid).toBe(true);
      expect(result.parsed?.pinId).toBe("1234567890123456");
      expect(result.parsed?.isShortLink).toBe(false);
    });

    it("accepts the bare pinterest.com host without www", () => {
      const result = validatePinterestUrl("https://pinterest.com/pin/106204676805362606/");
      expect(result.valid).toBe(true);
      expect(result.parsed?.pinId).toBe("106204676805362606");
    });

    it("accepts a pin.it short link and marks it for expansion", () => {
      const result = validatePinterestUrl("https://pin.it/4nJXkVz");
      expect(result.valid).toBe(true);
      expect(result.parsed?.isShortLink).toBe(true);
      expect(result.parsed?.pinId).toBeNull();
    });

    it("accepts regional mirrors (au.pinterest.com, pinterest.co.uk)", () => {
      const au = validatePinterestUrl("https://au.pinterest.com/pin/106204676805362606/");
      expect(au.valid).toBe(true);
      expect(au.parsed?.pinId).toBe("106204676805362606");

      const uk = validatePinterestUrl("https://www.pinterest.co.uk/pin/106204676805362606/");
      expect(uk.valid).toBe(true);
      expect(uk.parsed?.pinId).toBe("106204676805362606");
    });

    it("marks a non-/pin/ path as a short/unknown link", () => {
      const result = validatePinterestUrl("https://www.pinterest.com/username/");
      expect(result.valid).toBe(true);
      expect(result.parsed?.isShortLink).toBe(true);
      expect(result.parsed?.pinId).toBeNull();
    });

    it("strips tracking params but keeps meaningful ones", () => {
      const result = validatePinterestUrl(
        "https://www.pinterest.com/pin/106204676805362606/?utm_source=share&utm_medium=member_desktop&sender=pin"
      );
      expect(result.valid).toBe(true);
      expect(result.parsed?.normalized).toBe("https://www.pinterest.com/pin/106204676805362606/");
    });

    it("keeps non-tracking query params in the normalized URL", () => {
      const result = validatePinterestUrl("https://www.pinterest.com/pin/106204676805362606/?foo=bar");
      expect(result.valid).toBe(true);
      expect(result.parsed?.normalized).toContain("foo=bar");
    });

    it("trims surrounding whitespace", () => {
      const result = validatePinterestUrl("  https://www.pinterest.com/pin/106204676805362606/  ");
      expect(result.valid).toBe(true);
      expect(result.parsed?.pinId).toBe("106204676805362606");
    });

    it("accepts http and upgrades nothing (normalizes origin+path)", () => {
      const result = validatePinterestUrl("http://www.pinterest.com/pin/106204676805362606/");
      expect(result.valid).toBe(true);
      expect(result.parsed?.normalized).toBe("http://www.pinterest.com/pin/106204676805362606/");
    });
  });

  describe("invalid URLs", () => {
    it("rejects empty input", () => {
      expect(validatePinterestUrl("").valid).toBe(false);
      expect(validatePinterestUrl("   ").valid).toBe(false);
    });

    it("rejects non-string input", () => {
      expect(validatePinterestUrl(null as unknown as string).valid).toBe(false);
      expect(validatePinterestUrl(undefined as unknown as string).valid).toBe(false);
    });

    it("rejects a URL longer than 2048 chars", () => {
      const long = `https://www.pinterest.com/pin/106204676805362606/?x=${"a".repeat(2100)}`;
      expect(validatePinterestUrl(long).valid).toBe(false);
    });

    it("rejects dangerous schemes", () => {
      expect(validatePinterestUrl("javascript:alert(1)").valid).toBe(false);
      expect(validatePinterestUrl("data:text/html,<script>").valid).toBe(false);
      expect(validatePinterestUrl("blob:https://pinterest.com/x").valid).toBe(false);
      expect(validatePinterestUrl("vbscript:msgbox").valid).toBe(false);
    });

    it("rejects malformed URLs", () => {
      expect(validatePinterestUrl("not a url").valid).toBe(false);
      expect(validatePinterestUrl("https://").valid).toBe(false);
      expect(validatePinterestUrl("://pinterest.com").valid).toBe(false);
    });

    it("rejects non-HTTP protocols", () => {
      expect(validatePinterestUrl("ftp://pinterest.com/pin/123/").valid).toBe(false);
      expect(validatePinterestUrl("file:///etc/passwd").valid).toBe(false);
    });

    it("rejects credential-bearing URLs", () => {
      expect(validatePinterestUrl("https://user:pass@pinterest.com/pin/123/").valid).toBe(false);
    });

    it("rejects non-Pinterest hosts", () => {
      expect(validatePinterestUrl("https://example.com/pin/123/").valid).toBe(false);
      expect(validatePinterestUrl("https://pinterest.example.com/pin/123/").valid).toBe(false);
      expect(validatePinterestUrl("https://notpinterest.com/").valid).toBe(false);
    });

    it("rejects pinimg.com CDN hosts (media, not pages)", () => {
      expect(validatePinterestUrl("https://i.pinimg.com/736x/ab/cd/ef.jpg").valid).toBe(false);
      expect(validatePinterestUrl("https://v1.pinimg.com/videos/mc/720p/ab.mp4").valid).toBe(false);
    });

    it("rejects lookalike hosts that merely contain pinterest", () => {
      expect(validatePinterestUrl("https://pinterest.com.evil.example/pin/123/").valid).toBe(false);
      expect(validatePinterestUrl("https://evilpinterest.com/").valid).toBe(false);
      expect(validatePinterestUrl("https://pinterest.computer/").valid).toBe(false);
    });

    it("rejects a pin ID that is too short to be real", () => {
      const result = validatePinterestUrl("https://www.pinterest.com/pin/12/");
      expect(result.valid).toBe(true);
      // Too-short IDs are not /pin/ permalinks — treated as unknown paths.
      expect(result.parsed?.pinId).toBeNull();
      expect(result.parsed?.isShortLink).toBe(true);
    });
  });
});
