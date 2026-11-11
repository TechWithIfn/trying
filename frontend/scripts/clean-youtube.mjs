import fs from "fs";
import path from "path";

function updateFile(relPath, fn) {
  const fullPath = path.resolve(relPath);
  if (!fs.existsSync(fullPath)) {
    console.log("Skipping (not found):", relPath);
    return;
  }
  const original = fs.readFileSync(fullPath, "utf8");
  const updated = fn(original);
  if (original !== updated) {
    fs.writeFileSync(fullPath, updated, "utf8");
    console.log("Updated:", relPath);
  } else {
    console.log("No changes needed:", relPath);
  }
}

// 1. frontend/src/config/toolPages.ts
updateFile("frontend/src/config/toolPages.ts", (content) => {
  return content
    .replace(/export interface YouTubeToolPage extends BaseToolPage \{[\s\S]*?\}\r?\n\r?\n/, "")
    .replace(/\s*\|\s*YouTubeToolPage\r?\n/, "\n")
    .replace(/\s*youtubeVideo:\s*\{[\s\S]*?\n\s*\},(?=\r?\n\s*facebookVideo)/, "");
});

// 2. frontend/src/components/ToolCategoryDropdown.tsx
updateFile("frontend/src/components/ToolCategoryDropdown.tsx", (content) => {
  return content.replace(/export function YouTubeIcon[\s\S]*?\}\r?\n\r?\n/, "");
});

// 3. frontend/src/components/HeroDownloader.tsx
updateFile("frontend/src/components/HeroDownloader.tsx", (content) => {
  return content
    .replace(/\s*resolveYouTubeUrl,/, "")
    .replace(/\s*type YouTubeResolveData,/, "")
    .replace(/\s*YouTubeIcon,/, "")
    .replace(/function convertYouTubeToResolveData[\s\S]*?\n\}\r?\n\r?\n/, "")
    .replace(/\s*\|\s*"youtube"/, "")
    .replace(/\s*if \(val\.includes\("youtube\.com"\) \|\| val\.includes\("youtu\.be"\)\) return "youtube";/, "");
});

// 4. Update backlinks in category pages
const toolPagePaths = [
  "frontend/src/app/facebook-video-downloader/page.tsx",
  "frontend/src/app/twitter-video-downloader/page.tsx",
  "frontend/src/app/threads-video-downloader/page.tsx",
  "frontend/src/app/instagram-audio-downloader/page.tsx",
  "frontend/src/app/instagram-photo-downloader/page.tsx",
  "frontend/src/app/instagram-reels-downloader/page.tsx",
  "frontend/src/app/instagram-story-downloader/page.tsx",
  "frontend/src/app/pinterest-image-downloader/page.tsx",
  "frontend/src/app/pinterest-video-downloader/page.tsx",
];

for (const p of toolPagePaths) {
  updateFile(p, (content) => {
    return content
      .replace(/YouTube,\s*/gi, "")
      .replace(/,\s*YouTube/gi, "")
      .replace(/YouTube/gi, (match, offset, str) => {
        // If part of "YouTube, Pinterest, Facebook" backlink text
        if (str.slice(offset - 20, offset + 30).includes("Back to all Downloadit tools")) {
          return "";
        }
        return match;
      });
  });
}

// 5. Update info pages (about, help, terms, privacy, disclaimer, dmca, advertise-with-us, blog)
const infoPagePaths = [
  "frontend/src/app/about/page.tsx",
  "frontend/src/app/disclaimer/page.tsx",
  "frontend/src/app/dmca/page.tsx",
  "frontend/src/app/privacy/page.tsx",
  "frontend/src/app/terms/page.tsx",
  "frontend/src/app/advertise-with-us/page.tsx",
  "frontend/src/app/blog/page.tsx",
  "frontend/src/app/help/page.tsx",
  "frontend/src/app/help/HelpClient.tsx",
];

for (const p of infoPagePaths) {
  updateFile(p, (content) => {
    return content
      .replace(/,\s*YouTube/g, "")
      .replace(/YouTube,\s*/g, "")
      .replace(/YouTube\s*and\s*/g, "")
      .replace(/and\s*YouTube/g, "")
      .replace(/6 platforms/gi, "5 platforms")
      .replace(/six platforms/gi, "five platforms");
  });
}

console.log("Frontend text cleanup complete.");

