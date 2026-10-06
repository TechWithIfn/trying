import type { InstagramContentType } from "../types.js";

const USERNAME_RE = /^[a-zA-Z0-9._]{1,30}$/;
const RESERVED_SINGLE = new Set([
  "accounts",
  "direct",
  "explore",
  "stories",
  "story",
  "s",
  "reel",
  "reels",
  "p",
  "tv",
  "about",
  "developer",
  "embed",
]);

export function detectContentType(pathname: string): InstagramContentType {
  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] === "reels" && segments[1] === "audio") return "AUDIO";
  if (segments[0] === "reel" || segments[0] === "reels") return "REEL";
  if (segments[0] === "p") return "POST";
  if (segments[0] === "tv") return "VIDEO";
  if (segments[0] === "stories") {
    if (segments.includes("highlights")) return "HIGHLIGHT";
    if (segments.length === 2) {
      return USERNAME_RE.test(segments[1] ?? "") ? "STORY_PROFILE" : "UNKNOWN";
    }
    return "STORY";
  }
  if (segments.length === 1 && !RESERVED_SINGLE.has(segments[0].toLowerCase())) {
    return USERNAME_RE.test(segments[0]) ? "STORY_PROFILE" : "UNKNOWN";
  }

  return "UNKNOWN";
}

export function isSupportedContent(type: InstagramContentType): boolean {
  const supported: InstagramContentType[] = [
    "REEL",
    "POST",
    "CAROUSEL",
    "VIDEO",
    "PHOTO",
    "STORY",
    "STORY_PROFILE",
    "HIGHLIGHT",
    "AUDIO",
  ];
  return supported.includes(type);
}
