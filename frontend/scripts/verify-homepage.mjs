import fs from "fs";
import path from "path";

const indexPath = path.join(process.cwd(), ".next", "server", "app", "index.html");

if (!fs.existsSync(indexPath)) {
  console.error("Missing index.html at", indexPath);
  process.exit(1);
}

const html = fs.readFileSync(indexPath, "utf8");

const h1Matches = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || [];
const h2Matches = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/gi) || [];
const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"/i);
const canMatch = html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]*)"/i);
const jsonLdBlocks = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi) || [];

console.log("\n=== HOMEPAGE VERIFICATION REPORT ===");
console.log(`H1 count: ${h1Matches.length} -> "${h1Matches[0]?.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()}"`);
console.log(`H2 count: ${h2Matches.length}`);
h2Matches.forEach((h2, idx) => {
  console.log(`  [H2-${idx + 1}] ${h2.replace(/<[^>]+>/g, "").trim()}`);
});

console.log(`Title: ${titleMatch?.[1]}`);
console.log(`Description: ${descMatch?.[1]}`);
console.log(`Canonical: ${canMatch?.[1]}`);
console.log(`JSON-LD blocks: ${jsonLdBlocks.length}`);

// Check for YouTube on the homepage
const hasYouTubeLink = html.includes('href="/youtube-video-downloader"');
const hasYouTubeTitle = html.toLowerCase().includes("youtube downloader");
console.log(`\nYouTube presence on homepage:`);
console.log(`  Link to /youtube-video-downloader: ${hasYouTubeLink}`);
console.log(`  "YouTube Downloader" text: ${hasYouTubeTitle}`);

// Verify 5 platforms
const platforms = ["Instagram", "Pinterest", "Facebook", "Twitter/X", "Threads"];
console.log("\nPlatforms present in homepage cards/chips:");
for (const p of platforms) {
  const present = html.includes(p);
  console.log(`  ${p}: ${present}`);
}

console.log("\nJSON-LD Schemas found:");
jsonLdBlocks.forEach((block, idx) => {
  const content = block.replace(/<[^>]+>/g, "");
  try {
    const parsed = JSON.parse(content);
    console.log(`  [Schema ${idx + 1}] Type: ${parsed["@type"]} ${parsed.name ? `(${parsed.name})` : ""}`);
  } catch (e) {
    console.log(`  [Schema ${idx + 1}] Raw block present`);
  }
});

