import { describe, it, expect } from "vitest";
import { validateYouTubeUrl } from "@/lib/validators/youtube-url";

const ID = "jNQXAC9IVRw";

describe("validateYouTubeUrl", () => {
  describe("valid URLs", () => {
    it("accepts a watch URL and rebuilds a canonical URL", () => {
      const result = validateYouTubeUrl(`https://www.youtube.com/watch?v=${ID}&list=PL123&t=10`);
      expect(result.valid).toBe(true);
      expect(result.parsed).toEqual({
        videoId: ID,
        normalized: `https://www.youtube.com/watch?v=${ID}`,
        kind: "watch",
      });
    });

    it("accepts youtu.be short links", () => {
      const result = validateYouTubeUrl(`https://youtu.be/${ID}?si=tracking`);
      expect(result.valid).toBe(true);
      expect(result.parsed?.videoId).toBe(ID);
      expect(result.parsed?.kind).toBe("short");
      expect(result.parsed?.normalized).toBe(`https://www.youtube.com/watch?v=${ID}`);
    });

    it("accepts Shorts URLs", () => {
      const result = validateYouTubeUrl(`https://www.youtube.com/shorts/${ID}`);
      expect(result.valid).toBe(true);
      expect(result.parsed?.kind).toBe("shorts");
      expect(result.parsed?.normalized).toBe(`https://www.youtube.com/watch?v=${ID}`);
    });

    it("accepts embed URLs", () => {
      const result = validateYouTubeUrl(`https://youtube.com/embed/${ID}`);
      expect(result.valid).toBe(true);
      expect(result.parsed?.kind).toBe("embed");
    });

    it("accepts a bare copied link without a scheme", () => {
      const result = validateYouTubeUrl(`youtu.be/${ID}`);
      expect(result.valid).toBe(true);
      expect(result.parsed?.videoId).toBe(ID);
    });

    it("accepts m.youtube.com and trims whitespace", () => {
      const result = validateYouTubeUrl(`  https://m.youtube.com/watch?v=${ID}  `);
      expect(result.valid).toBe(true);
      expect(result.parsed?.videoId).toBe(ID);
    });

    it("accepts http but canonicalizes to https", () => {
      const result = validateYouTubeUrl(`http://www.youtube.com/watch?v=${ID}`);
      expect(result.valid).toBe(true);
      expect(result.parsed?.normalized).toMatch(/^https:\/\//);
    });
  });

  describe("invalid URLs", () => {
    it.each([
      "",
      "not a url",
      "https://vimeo.com/123456",
      `https://www.youtube.com.evil.com/watch?v=${ID}`,
      `https://youtube.com@evil.com/watch?v=${ID}`,
      `https://www.youtube.com/channel/${ID}`,
      `https://www.youtube.com/playlist?list=PL123`,
      `https://www.youtube.com/live/${ID}`,
      `https://www.youtube.com/watch?v=short`,
      `https://youtu.be/${ID}/extra`,
      `https://www.youtube.com/shorts/${ID}/extra`,
      `https://www.youtube.com:8443/watch?v=${ID}`,
      "javascript:alert(1)",
      "ftp://youtube.com/watch?v=" + ID,
    ])("rejects %s", (url) => {
      expect(validateYouTubeUrl(url).valid).toBe(false);
    });

    it("rejects non-string values", () => {
      expect(validateYouTubeUrl(null).valid).toBe(false);
      expect(validateYouTubeUrl(123).valid).toBe(false);
    });
  });
});
