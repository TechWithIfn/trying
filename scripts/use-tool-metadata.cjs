const fs = require("fs");
const files = [
  "frontend/src/app/facebook-video-downloader/page.tsx",
  "frontend/src/app/instagram-audio-downloader/page.tsx",
  "frontend/src/app/instagram-photo-downloader/page.tsx",
  "frontend/src/app/instagram-reels-downloader/page.tsx",
  "frontend/src/app/instagram-story-downloader/page.tsx",
  "frontend/src/app/instagram-video-downloader/page.tsx",
  "frontend/src/app/pinterest-image-downloader/page.tsx",
  "frontend/src/app/pinterest-video-downloader/page.tsx",
  "frontend/src/app/threads-video-downloader/page.tsx",
  "frontend/src/app/twitter-video-downloader/page.tsx",
];

for (const file of files) {
  let src = fs.readFileSync(file, "utf8");
  const importBefore = 'import { TOOL_PAGES } from "@/config/toolPages";';
  if (!src.includes(importBefore)) throw new Error(`import not found in ${file}`);
  src = src.replace(importBefore, 'import { TOOL_PAGES, toolMetadata } from "@/config/toolPages";');

  const re = /export const metadata: Metadata = \{[\s\S]*?\n\};/;
  if (!re.test(src)) throw new Error(`metadata block not found in ${file}`);
  src = src.replace(re, "export const metadata: Metadata = toolMetadata(PAGE);");

  fs.writeFileSync(file, src, "utf8");
  console.log(`OK ${file}`);
}
