import { describe, expect, it } from "vitest";
import {
  classifyInstagramYtDlpError,
  inspectNetscapeCookieText,
  netscapeFromCookieHeader,
  selectInstagramReelMedia,
} from "@/lib/instagram-reel-ytdlp";

describe("instagram reel yt-dlp", () => {
  it("keeps a video longer than one minute", () => {
    const selected = selectInstagramReelMedia(
      [
        { url: "https://cdn.example/v.mp4", vcodec: "avc1", acodec: "mp4a", height: 720, tbr: 800 },
        { url: "https://cdn.example/a.m4a", vcodec: "none", acodec: "mp4a", height: 0, tbr: 128 },
      ],
      125
    );
    expect(selected?.duration).toBe(125);
    expect(selected?.audioUrl).toBeNull();
    expect(selected?.url).toContain("v.mp4");
  });

  it("pairs separate audio when the picture has no soundtrack", () => {
    const selected = selectInstagramReelMedia(
      [
        { url: "https://cdn.example/v.mp4", vcodec: "avc1", acodec: "none", height: 1080 },
        { url: "https://cdn.example/a.m4a", vcodec: "none", acodec: "mp4a", tbr: 128 },
      ],
      95
    );
    expect(selected?.url).toContain("v.mp4");
    expect(selected?.audioUrl).toContain("a.m4a");
    expect(selected?.duration).toBe(95);
  });

  it("names a restriction the account cannot open as not accessible", () => {
    const failure = classifyInstagramYtDlpError("Restricted Video: age-restricted", "local", "restricted");
    expect(failure.kind).toBe("unavailable");
    expect(failure.message).toBe("Content unavailable (deleted, region-blocked, or restricted) — no way to download");
    expect(failure.retryable).toBe(false);
  });

  it("names login, rate limit, private, and a cloud block separately", () => {
    expect(classifyInstagramYtDlpError("login required", "local").message).toBe(
      "Cookies expired/invalid — please re-export"
    );
    expect(classifyInstagramYtDlpError("HTTP Error 429: Too Many Requests", "local").message).toBe(
      "Rate limited — try again later"
    );
    expect(classifyInstagramYtDlpError("Private account", "local").message).toBe(
      "This account is private and I don't follow it — no way to download"
    );
    const blocked = classifyInstagramYtDlpError("HTTP Error 403", "cloud", "public");
    expect(blocked.kind).toBe("ip-block");
    expect(blocked.message).toBe("IP appears blocked");
  });

  it("reads cookie expiry without treating the value as part of the result", () => {
    const past = Math.floor(Date.now() / 1000) - 60;
    const future = Math.floor(Date.now() / 1000) + 3600;
    const expired = `.instagram.com\tTRUE\t/\tTRUE\t${past}\tsessionid\tnot-a-real-value`;
    const fresh = `.instagram.com\tTRUE\t/\tTRUE\t${future}\tsessionid\tnot-a-real-value`;
    expect(inspectNetscapeCookieText(expired)).toBe("expired");
    expect(inspectNetscapeCookieText(fresh)).toBe("ok");
    expect(inspectNetscapeCookieText("# Netscape\n")).toBe("invalid");
  });

  it("turns a session cookie header into a netscape jar", () => {
    const jar = netscapeFromCookieHeader("sessionid=not-a-real-value; csrftoken=also-fake");
    expect(jar).toContain("\tsessionid\tnot-a-real-value");
    expect(jar).toContain("\tcsrftoken\talso-fake");
    expect(inspectNetscapeCookieText(jar ?? "")).toBe("ok");
    expect(netscapeFromCookieHeader("theme=dark")).toBeNull();
  });
});
