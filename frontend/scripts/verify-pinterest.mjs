import fs from "fs";
import path from "path";

const pages = [
  {
    file: "pinterest-video-downloader.html",
    expectedH1: "Pinterest Video Downloader",
    can: "https://downloadit.pro/pinterest-video-downloader",
    expectedTitle: "Pinterest Video Downloader – Download Pinterest Videos & Images | Downloadit",
  },
  {
    file: "pinterest-image-downloader.html",
    expectedH1: "Pinterest Image & Carousel Downloader",
    can: "https://downloadit.pro/pinterest-image-downloader",
    expectedTitle: "Pinterest Image & Carousel Downloader – Save Pins & Slides | Downloadit",
  },
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
  const jsonLdBlocks = (html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi) || []);

  console.log(`\n=== ${p.file} ===`);
  const cleanH1 = h1Matches[0]?.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  console.log(`  H1 count: ${h1Matches.length} -> "${cleanH1}"`);
  console.log(`  H2 count: ${h2Matches.length}`);
  h2Matches.forEach((h2, idx) => {
    console.log(`    [H2-${idx + 1}] ${h2.replace(/<[^>]+>/g, "").trim()}`);
  });
  console.log(`  Title: ${titleMatch?.[1]}`);
  console.log(`  Description: ${descMatch?.[1]}`);
  console.log(`  Canonical: ${canMatch?.[1]}`);
  console.log(`  JSON-LD blocks: ${jsonLdBlocks.length}`);

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
  console.log("\n All Pinterest pages verified successfully!");
}

