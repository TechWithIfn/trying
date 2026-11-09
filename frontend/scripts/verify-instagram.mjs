import fs from "fs";
import path from "path";

const pages = [
  { file: "instagram-video-downloader.html", expectedH1: "Instagram Downloader", can: "https://downloadit.pro/instagram-video-downloader" },
  { file: "instagram-reels-downloader.html", expectedH1: "Instagram Reels Downloader", can: "https://downloadit.pro/instagram-reels-downloader" },
  { file: "instagram-photo-downloader.html", expectedH1: "Instagram Photo & Carousel Downloader", can: "https://downloadit.pro/instagram-photo-downloader" },
  { file: "instagram-story-downloader.html", expectedH1: "Instagram Story Downloader", can: "https://downloadit.pro/instagram-story-downloader" },
  { file: "instagram-audio-downloader.html", expectedH1: "Instagram Audio Downloader", can: "https://downloadit.pro/instagram-audio-downloader" }
];

const basePath = path.join(process.cwd(), ".next", "server", "app");

let hasErrors = false;

for (const p of pages) {
  const filePath = path.join(basePath, p.file);
  if (!fs.existsSync(filePath)) {
    console.error("Missing:", filePath);
    hasErrors = true;
    continue;
  }
  const html = fs.readFileSync(filePath, "utf8");
  const h1Matches = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || [];
  const h2Matches = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/gi) || [];
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"/i);
  const canMatch = html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]*)"/i);
  const jsonLdCount = (html.match(/application\/ld\+json/g) || []).length;
  
  console.log(`\n=== ${p.file} ===`);
  console.log(`  H1 count: ${h1Matches.length} -> "${h1Matches[0]?.replace(/<[^>]+>/g, "").trim()}"`);
  console.log(`  H2 count: ${h2Matches.length}`);
  h2Matches.forEach((h2, idx) => {
    console.log(`    [H2-${idx + 1}] ${h2.replace(/<[^>]+>/g, "").trim()}`);
  });
  console.log(`  Title: ${titleMatch?.[1]}`);
  console.log(`  Description: ${descMatch?.[1]}`);
  console.log(`  Canonical: ${canMatch?.[1]}`);
  console.log(`  JSON-LD blocks: ${jsonLdCount}`);

  if (h1Matches.length !== 1) {
    console.error(`  ERROR: Expected exactly 1 H1, found ${h1Matches.length}`);
    hasErrors = true;
  }
  if (!canMatch || canMatch[1] !== p.can) {
    console.error(`  ERROR: Expected canonical ${p.can}, got ${canMatch?.[1]}`);
    hasErrors = true;
  }
}

if (hasErrors) {
  process.exit(1);
} else {
  console.log("\n All 5 Instagram pages verified successfully!");
}

