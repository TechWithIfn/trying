import { chmod, copyFile, mkdir, stat, writeFile } from "node:fs/promises";
import { createGunzip } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { pipeline } from "node:stream/promises";

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

async function downloadGzip(url, destination, label) {
  try {
    const response = await fetch(url);
    if (!response.ok || !response.body) {
      throw new Error(`HTTP ${response.status}`);
    }
    await mkdir(binDir, { recursive: true });
    await pipeline(response.body, createGunzip(), writeFile(destination));
    if (process.platform !== "win32") {
      await chmod(destination, 0o755);
    }
    console.log(`[youtube] ${label} downloaded: ${destination}`);
    return true;
  } catch (error) {
    console.warn(`[youtube] could not download ${label} to bin/:`, error instanceof Error ? error.message : String(error));
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

  // --- ffmpeg: download directly from the ffmpeg-static GitHub releases.
  //     ffmpeg-static is NOT a dependency because its install.js script has
  //     a bug on Linux (tries to open bin/ffmpeg.exe instead of bin/ffmpeg)
  //     that crashes `npm install` on Vercel. We download the binary ourselves
  //     here instead. ffmpeg-static releases use .gz files, so we gunzip. ---
  if (!(await isUsable(ffmpegDest))) {
    const platform = process.platform === "win32" ? "win32" : process.platform === "darwin" ? "darwin" : "linux";
    const arch = process.arch === "x64" ? "x64" : process.arch === "arm64" ? "arm64" : "ia32";
    const suffix = platform === "win32" ? ".exe" : "";
    const asset = `ffmpeg-${platform}-${arch}${suffix}.gz`;
    const url = `https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/${asset}`;
    await downloadGzip(url, ffmpegDest, "ffmpeg");
  } else {
    console.log(`[youtube] ffmpeg already present: ${ffmpegDest}`);
  }
})();
