import dotenv from "dotenv";
import path from "node:path";
import { resolveInstagramReelYtDlp } from "../src/lib/instagram-reel-ytdlp.js";

dotenv.config({ path: path.resolve(process.cwd(), "../config/.env") });
dotenv.config({ path: path.resolve(process.cwd(), "config/.env") });
dotenv.config();

const urls = process.argv.slice(2).filter((url) => url.startsWith("http"));
if (urls.length === 0) {
  console.error("Usage: npx tsx scripts/reel-self-test.ts <reel-url>...");
  process.exit(1);
}

for (const url of urls) {
  const outcome = await resolveInstagramReelYtDlp(url);
  if (outcome.result) {
    const media = outcome.result.media[0];
    console.log(
      [
        outcome.result.sourceUrl,
        "success",
        outcome.result.type,
        `count=${outcome.result.media.length}`,
        `kind=${media?.type ?? "none"}`,
        `duration=${media?.duration ?? "unknown"}`,
        `separateAudio=${Boolean(media?.audioUrl)}`,
      ].join("\t")
    );
    continue;
  }
  console.log([url, "fail", outcome.failure?.kind ?? "unknown", outcome.failure?.message ?? "no result"].join("\t"));
}
