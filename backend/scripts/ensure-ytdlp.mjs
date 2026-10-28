import { chmod, copyFile, mkdir, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import ffmpegPath from "ffmpeg-static";

const require = createRequire(import.meta.url);

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const binDir = join(root, "bin");
const binaryPath = join(binDir, process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp");
const ffmpegDest = join(binDir, process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg");

async function isUsable(filePath) {
  if (!filePath) return false;
  try {
    const details = await stat(filePath);
    return details.isFile() && details.size > 1_000_000;
  } catch {
    return false;
  }
}

async function stageFile(source, destination, label) {
  try {
    if (!(source && await isUsable(source))) {
      console.warn(`[youtube] ${label} source not usable, skipping: ${source ?? "(none)"}`);
      return false;
    }
    await mkdir(binDir, { recursive: true });
    await copyFile(source, destination);
    if (process.platform !== "win32") {
      await chmod(destination, 0o755);
    }
    console.log(`[youtube] ${label} ready: ${destination}`);
    return true;
  } catch (error) {
    console.warn(`[youtube] ${label} could not be staged to bin/:`, error instanceof Error ? error.message : String(error));
    return false;
  }
}

function bundledBinaryPath() {
  try {
    const pkg = require("youtube-dl-exec");
    const candidate = pkg.constants?.YOUTUBE_DL_PATH;
    return typeof candidate === "string" && candidate.length > 0 ? candidate : null;
  } catch {
    return null;
  }
}

(async () => {
  // --- yt-dlp: stage from the bundled dependency first (no network needed),
  //     then fall back to downloading the latest release from GitHub.
  //     Never crash the build if both fail — the runtime will report an
  //     honest diagnostic instead of a 500. ---
  if (!(await isUsable(binaryPath))) {
    const bundled = bundledBinaryPath();
    if (bundled && await isUsable(bundled)) {
      await mkdir(binDir, { recursive: true });
      await copyFile(bundled, binaryPath);
      if (process.platform !== "win32") {
        await chmod(binaryPath, 0o755);
      }
      console.log(`[youtube] yt-dlp staged from bundled dependency: ${binaryPath}`);
    } else {
      const asset = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
      try {
        const response = await fetch(`https://github.com/yt-dlp/yt-dlp/releases/latest/download/${asset}`);
        if (!response.ok || !response.body) {
          throw new Error(`HTTP ${response.status}`);
        }
        await mkdir(binDir, { recursive: true });
        await writeFile(binaryPath, Buffer.from(await response.arrayBuffer()));
        if (process.platform !== "win32") {
          await chmod(binaryPath, 0o755);
        }
        console.log(`[youtube] yt-dlp downloaded from GitHub: ${binaryPath}`);
      } catch (error) {
        console.warn(`[youtube] could not stage yt-dlp to bin/ (runtime will diagnose):`, error instanceof Error ? error.message : String(error));
      }
    }
  } else {
    console.log(`[youtube] yt-dlp already present: ${binaryPath}`);
  }

  // --- ffmpeg: copy the ffmpeg-static binary into bin/ so it is deployed
  //     together with yt-dlp. ffmpeg-static is not covered by vercel.json
  //     includeFiles, so without this step FFmpeg is absent in production
  //     and MP4 merge / audio extraction cannot run. ---
  await stageFile(ffmpegPath, ffmpegDest, "ffmpeg");
})();
