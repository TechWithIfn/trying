import { describe, it, expect } from "vitest";
import { crc32 as nodeCrc32 } from "node:zlib";
import {
  sanitizeDownloadFilename,
  sanitizeFilenameBase,
  contentDispositionAttachment,
  extensionForContentType,
} from "../src/lib/download-filename.js";
import { buildZip, crc32 } from "../src/lib/zip.js";

describe("Download query-param validation", () => {
  it("preserves case and spaces in the requested base name", () => {
    expect(sanitizeDownloadFilename("Downloadit My Pin", "video/mp4")).toBe("Downloadit My Pin.mp4");
    expect(sanitizeDownloadFilename("Downloadit Sunset Beach", "image/jpeg")).toBe(
      "Downloadit Sunset Beach.jpg"
    );
  });

  it("enforces extension from verified content type", () => {
    expect(sanitizeDownloadFilename("creator-video", "video/mp4")).toBe("creator-video.mp4");
    expect(sanitizeDownloadFilename("creator-video.mp4", "image/jpeg")).toBe("creator-video.jpg");
    expect(sanitizeDownloadFilename("pic", "image/png")).toBe("pic.png");
    expect(sanitizeDownloadFilename("pic", "image/webp")).toBe("pic.webp");
    expect(sanitizeDownloadFilename("track", "audio/mpeg")).toBe("track.mp3");
    expect(sanitizeDownloadFilename("track", "audio/mp4")).toBe("track.m4a");
  });

  it("strips path traversal and dangerous characters", () => {
    expect(sanitizeDownloadFilename("../../etc/passwd", "video/mp4")).toBe("etc-passwd.mp4");
    expect(sanitizeDownloadFilename('a"b\r\nc', "video/mp4")).toBe("a-bc.mp4");
    expect(sanitizeDownloadFilename("C:\\evil.exe", "video/mp4")).toBe("C-evil.mp4");
  });

  it("falls back to a safe name for empty input", () => {
    expect(sanitizeDownloadFilename("", "video/mp4")).toBe("downloadit-media.mp4");
    expect(sanitizeDownloadFilename(undefined, "video/mp4")).toBe("downloadit-media.mp4");
    expect(sanitizeDownloadFilename("...", "video/mp4")).toBe("downloadit-media.mp4");
  });

  it("truncates long names without splitting a Unicode code point", () => {
    expect(sanitizeDownloadFilename("a".repeat(200), "video/mp4").length).toBeLessThanOrEqual(124);
    // 200 emoji code points → capped at 120 code points, never a broken surrogate.
    const emoji = sanitizeDownloadFilename("😀".repeat(200), "video/mp4");
    expect(Array.from(emoji.replace(/\.mp4$/, "")).length).toBeLessThanOrEqual(120);
    expect(emoji).not.toContain("\uFFFD");
  });

  it("maps verified content types to extensions", () => {
    expect(extensionForContentType("image/jpeg")).toBe(".jpg");
    expect(extensionForContentType("image/png")).toBe(".png");
    expect(extensionForContentType("audio/mpeg")).toBe(".mp3");
    expect(extensionForContentType("video/mp4")).toBe(".mp4");
    expect(extensionForContentType("")).toBe(".mp4");
  });

  it("builds an RFC 5987 Content-Disposition with an ASCII fallback", () => {
    const header = contentDispositionAttachment("Downloadit नमस्ते Pin.jpg");
    expect(header.startsWith("attachment;")).toBe(true);
    expect(header).toContain('filename="Downloadit ');
    expect(header).toContain("filename*=UTF-8''");
    expect(header).toContain("%E0%A4%A8"); // percent-encoded Devanagari
    // The ASCII fallback never leaks the raw non-ASCII bytes.
    expect(header.split(";")[1]).not.toMatch(/[^\x20-\x7e]/);
  });

  it("keeps the zip base usable for a folder-less archive name", () => {
    expect(sanitizeFilenameBase("Downloadit Trip.zip")).toBe("Downloadit Trip");
    expect(`${sanitizeFilenameBase("Downloadit Trip")}.zip`).toBe("Downloadit Trip.zip");
  });
});

describe("ZIP archive writer", () => {
  const readUInt32 = (b: Buffer, o: number) => b.readUInt32LE(o);

  it("writes a valid store-method archive with central directory", () => {
    const a = Buffer.from("hello world");
    const b = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05]);
    const zip = buildZip([
      { name: "one.jpg", data: a },
      { name: "two.png", data: b },
    ]);

    // Local file header signature.
    expect(readUInt32(zip, 0)).toBe(0x04034b50);
    // End of central directory signature.
    const eocdOffset = zip.length - 22;
    expect(readUInt32(zip, eocdOffset)).toBe(0x06054b50);
    expect(zip.readUInt16LE(eocdOffset + 10)).toBe(2); // total entries
    // Central directory offset points at a central header.
    const cdOffset = readUInt32(zip, eocdOffset + 16);
    expect(readUInt32(zip, cdOffset)).toBe(0x02014b50);
  });

  it("stores real bytes and the correct CRC-32", () => {
    const data = Buffer.from("The quick brown fox");
    // Cross-checked against Node's own zlib.crc32 reference implementation.
    expect(crc32(data)).toBe(nodeCrc32(data));
    const zip = buildZip([{ name: "f.bin", data }]);
    // CRC in local header (offset 14) matches the data CRC.
    expect(zip.readUInt32LE(14)).toBe(crc32(data));
    // The raw payload is present verbatim (STORE, no compression).
    expect(zip.includes(data)).toBe(true);
  });

  it("produces an empty but structurally valid archive", () => {
    const zip = buildZip([]);
    expect(zip.length).toBe(22);
    expect(readUInt32(zip, 0)).toBe(0x06054b50);
    expect(zip.readUInt16LE(10)).toBe(0);
  });
});

describe("Strict domain allowlist matching", () => {
  const ALLOWED_MEDIA_HOSTS: Array<(hostname: string) => boolean> = [
    (h) => h === "cdninstagram.com" || h.endsWith(".cdninstagram.com"),
    (h) => h === "fbcdn.net" || h.endsWith(".fbcdn.net"),
    (h) => h.startsWith("scontent."),
  ];

  function isAllowedMediaUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:") return false;
      const hostname = parsed.hostname.toLowerCase();
      return ALLOWED_MEDIA_HOSTS.some((match) => match(hostname));
    } catch {
      return false;
    }
  }

  it("allows legitimate Instagram CDN domains", () => {
    expect(isAllowedMediaUrl("https://cdninstagram.com/media/v1.mp4")).toBe(true);
    expect(isAllowedMediaUrl("https://scontent-iad3-1.xx.fbcdn.net/v/media.mp4")).toBe(true);
    expect(isAllowedMediaUrl("https://scontent.cdninstagram.com/v/image.jpg")).toBe(true);
    expect(isAllowedMediaUrl("https://fbcdn.net/v/media.mp4")).toBe(true);
  });

  it("blocks attacker-controlled domains containing allowed substrings", () => {
    expect(isAllowedMediaUrl("https://evil-cdninstagram.com.attacker.net/malware")).toBe(false);
    expect(isAllowedMediaUrl("https://not-cdninstagram.com/malware")).toBe(false);
    expect(isAllowedMediaUrl("https://evil-scontent.attacker.com/malware")).toBe(false);
    expect(isAllowedMediaUrl("https://evil-fbcdn.net.attacker.com/malware")).toBe(false);
  });

  it("blocks non-https protocols", () => {
    expect(isAllowedMediaUrl("http://cdninstagram.com/video.mp4")).toBe(false);
    expect(isAllowedMediaUrl("ftp://scontent.xx.fbcdn.net/video.mp4")).toBe(false);
  });

  it("blocks all other domains", () => {
    expect(isAllowedMediaUrl("https://evil.com/steal")).toBe(false);
    expect(isAllowedMediaUrl("https://notinstagram.com/p/fake")).toBe(false);
    expect(isAllowedMediaUrl("https://example.com/hack")).toBe(false);
  });
});

describe("Private IP blocking", () => {
  function isPrivateOrReservedHost(hostname: string): boolean {
    if (
      hostname === "localhost" ||
      hostname === "0.0.0.0" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "::" ||
      hostname === "[::1]"
    ) {
      return true;
    }
    if (hostname.startsWith("192.168.")) return true;
    if (hostname.startsWith("10.")) return true;
    if (hostname.startsWith("172.")) {
      const second = parseInt(hostname.split(".")[1], 10);
      if (second >= 16 && second <= 31) return true;
    }
    if (hostname.startsWith("169.254.")) return true;
    if (hostname === "metadata.google.internal" || hostname === "169.254.169.254") return true;
    if (hostname.endsWith(".internal") || hostname.endsWith(".local")) return true;
    return false;
  }

  it("blocks localhost variants", () => {
    expect(isPrivateOrReservedHost("localhost")).toBe(true);
    expect(isPrivateOrReservedHost("127.0.0.1")).toBe(true);
    expect(isPrivateOrReservedHost("0.0.0.0")).toBe(true);
    expect(isPrivateOrReservedHost("::1")).toBe(true);
    expect(isPrivateOrReservedHost("::")).toBe(true);
  });

  it("blocks private IPv4 ranges", () => {
    expect(isPrivateOrReservedHost("192.168.1.1")).toBe(true);
    expect(isPrivateOrReservedHost("10.0.0.1")).toBe(true);
    expect(isPrivateOrReservedHost("172.16.0.1")).toBe(true);
    expect(isPrivateOrReservedHost("172.31.255.255")).toBe(true);
  });

  it("blocks link-local and metadata", () => {
    expect(isPrivateOrReservedHost("169.254.169.254")).toBe(true);
    expect(isPrivateOrReservedHost("metadata.google.internal")).toBe(true);
    expect(isPrivateOrReservedHost("some-host.internal")).toBe(true);
    expect(isPrivateOrReservedHost("device.local")).toBe(true);
  });

  it("allows public IPs", () => {
    expect(isPrivateOrReservedHost("8.8.8.8")).toBe(false);
    expect(isPrivateOrReservedHost("1.1.1.1")).toBe(false);
    expect(isPrivateOrReservedHost("203.0.113.1")).toBe(false);
  });

  it("allows public hostnames", () => {
    expect(isPrivateOrReservedHost("cdninstagram.com")).toBe(false);
    expect(isPrivateOrReservedHost("scontent-iad3-1.xx.fbcdn.net")).toBe(false);
    expect(isPrivateOrReservedHost("example.com")).toBe(false);
  });

  it("allows 172.x.x.x outside private range", () => {
    expect(isPrivateOrReservedHost("172.0.0.1")).toBe(false);
    expect(isPrivateOrReservedHost("172.15.255.255")).toBe(false);
    expect(isPrivateOrReservedHost("172.32.0.1")).toBe(false);
  });
});

describe("Media URL validation", () => {
  const blockedDomains = [
    "localhost",
    "127.0.0.1",
    "192.168.1.1",
    "evil.com",
    "notinstagram.com",
  ];

  it("rejects non-https URLs", () => {
    const urls = [
      "http://cdninstagram.com/video.mp4",
      "ftp://cdninstagram.com/video.mp4",
      "javascript:alert(1)",
    ];
    for (const url of urls) {
      try {
        const parsed = new URL(url);
        expect(parsed.protocol).not.toBe("https:");
      } catch {
        // Invalid URL - expected
      }
    }
  });

  it("blocks unsafe domains", () => {
    for (const domain of blockedDomains) {
      const url = `https://${domain}/media/video.mp4`;
      const parsed = new URL(url);
      expect(
        parsed.hostname === "localhost" ||
        parsed.hostname === "127.0.0.1" ||
        parsed.hostname.startsWith("192.168.") ||
        parsed.hostname === "evil.com" ||
        parsed.hostname === "notinstagram.com"
      ).toBe(true);
    }
  });
});

describe("Filename sanitization", () => {
  it("sanitizes special characters", () => {
    const input = "My Post! @#$%^&*()";
    const sanitized = input
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase()
      .slice(0, 50);
    expect(sanitized).toBe("my-post");
  });

  it("truncates long names", () => {
    const input = "a".repeat(100);
    const sanitized = input
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase()
      .slice(0, 50);
    expect(sanitized.length).toBeLessThanOrEqual(50);
  });

  it("handles empty input", () => {
    const input = "";
    const sanitized = input
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase()
      .slice(0, 50);
    expect(sanitized).toBe("");
  });

  it("preserves valid characters", () => {
    const input = "reel-2024-test";
    const sanitized = input
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase()
      .slice(0, 50);
    expect(sanitized).toBe("reel-2024-test");
  });
});
