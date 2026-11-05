/**
 * Stage the media-engine binaries (yt-dlp + ffmpeg) into `backend/bin/`.
 *
 * Why this script exists:
 *  - `bin/` is git-ignored, so a fresh clone (or a CI checkout) has no
 *    binaries until this runs. `npm run build` and `npm run dev` both call it.
 *  - The binaries must match the HOST platform, not the developer's machine.
 *  - The generic `yt-dlp` release asset is a Python zipapp. It runs on a build
 *    image that happens to have Python 3, then fails at runtime on a Node
 *    serverless host that does not. We therefore download the self-contained
 *    `yt-dlp_linux` / `yt-dlp_macos` / `yt-dlp.exe` builds and reject any
 *    staged file that starts with a shebang.
 *
 * `vercel.json` ships `bin/*` with the function via `includeFiles`. If that
 * ever fails, `src/lib/media-binary.ts` can still provision the same
 * standalone builds at runtime into the temp directory.
 */
import { chmod, copyFile, mkdir, open, stat, unlink, writeFile } from "node:fs/promises";
import { createReadStream, createWriteStream } from "node:fs";
import { createGunzip } from "node:zlib";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { execFile } from "node:child_process";

const require = createRequire(import.meta.url);

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const binDir = join(root, "bin");
const isWindows = process.platform === "win32";
const binaryPath = join(binDir, isWindows ? "yt-dlp.exe" : "yt-dlp");
const ffmpegDest = join(binDir, isWindows ? "ffmpeg.exe" : "ffmpeg");

const YTDLP_RELEASE = "https://github.com/yt-dlp/yt-dlp/releases/latest/download";
const FFMPEG_RELEASE = "https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1";

function ytDlpAsset() {
  if (process.platform === "win32") return "yt-dlp.exe";
  if (process.platform === "darwin") return "yt-dlp_macos";
  if (process.platform === "linux") {
    if (process.arch === "arm64") return "yt-dlp_linux_aarch64";
    if (process.arch === "ia32") return null;
    return "yt-dlp_linux";
  }
  return null;
}

function ffmpegAsset() {
  if (process.platform === "linux") {
    if (process.arch === "arm64") return "ffmpeg-linux-arm64.gz";
    if (process.arch === "ia32") return "ffmpeg-linux-ia32.gz";
    if (process.arch === "arm") return "ffmpeg-linux-arm.gz";
    return "ffmpeg-linux-x64.gz";
  }
  if (process.platform === "darwin") {
    return process.arch === "arm64" ? "ffmpeg-darwin-arm64.gz" : "ffmpeg-darwin-x64.gz";
  }
  if (process.platform === "win32" && process.arch === "x64") return "ffmpeg-win32-x64.gz";
  return null;
}

async function isFilePresent(filePath) {
  if (!filePath) return false;
  try {
    const details = await stat(filePath);
    return details.isFile() && details.size > 1_000_000;
  } catch {
    return false;
  }
}

/**
 * Verify a binary actually executes on the current platform by running
 * `--version`. A Windows .exe file passes isFilePresent() on Linux but fails
 * here because it cannot be executed.
 */
async function verifyExecutable(filePath, versionArgs = ["--version"]) {
  if (!filePath) return false;
  try {
    await new Promise((resolve, reject) => {
      execFile(
        filePath,
        versionArgs,
        { timeout: 20_000, maxBuffer: 256 * 1024 },
        (error, stdout, stderr) => {
          const out = `${String(stdout || "")} ${String(stderr || "")}`.trim();
          if (error) {
            reject(new Error(`exit ${error.code}: ${error.message}`));
            return;
          }
          if (!out || out.length < 3) {
            reject(new Error("no version output"));
            return;
          }
          resolve();
        }
      );
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Reject interpreter scripts (a Python zipapp starts with `#!`). Native
 * executables start with ELF/Mach-O/PE magic instead. This is what prevents a
 * build image with Python from silently staging a binary the runtime host
 * cannot start.
 */
async function looksNative(filePath) {
  if (process.platform === "win32") return true;
  try {
    const handle = await open(filePath, "r");
    try {
      const { buffer, bytesRead } = await handle.read(Buffer.alloc(4), 0, 4, 0);
      if (bytesRead < 4) return false;
      if (buffer[0] === 0x23 && buffer[1] === 0x21) return false; // "#!"
      const magic = buffer.readUInt32BE(0);
      const ELF = 0x7f454c46;
      const MACHO_64 = 0xcffaedfe;
      const MACHO_32 = 0xcefaedfe;
      const MACHO_BE = 0xfeedface;
      const FAT = 0xcafebabe;
      return magic === ELF || magic === MACHO_64 || magic === MACHO_32 || magic === MACHO_BE || magic === FAT;
    } finally {
      await handle.close();
    }
  } catch {
    return false;
  }
}

async function isUsable(filePath, versionArgs) {
  return (await isFilePresent(filePath)) && (await looksNative(filePath)) && (await verifyExecutable(filePath, versionArgs));
}

/** Verify a gzip-compressed binary by expanding it to a temp file and running it. */
async function isUsableGzip(gzPath, versionArgs) {
  if (!gzPath) return false;
  try {
    const details = await stat(gzPath);
    if (!details.isFile() || details.size < 1_000_000) return false;
  } catch {
    return false;
  }
  const temporary = `${gzPath}.verify-${process.pid}`;
  try {
    await pipeline(createReadStream(gzPath), createGunzip(), createWriteStream(temporary));
    await markExecutable(temporary);
    return await verifyExecutable(temporary, versionArgs);
  } catch {
    return false;
  } finally {
    await unlink(temporary).catch(() => undefined);
  }
}

function bundledYtDlpPath() {
  try {
    const pkg = require("youtube-dl-exec");
    const candidate = pkg.constants?.YOUTUBE_DL_PATH;
    return typeof candidate === "string" && candidate.length > 0 ? candidate : null;
  } catch {
    return null;
  }
}

async function markExecutable(filePath) {
  if (!isWindows) await chmod(filePath, 0o755);
}

/** Download an uncompressed binary (yt-dlp releases are raw files). */
async function downloadBinary(url, destination) {
  const temporary = `${destination}.download-${process.pid}`;
  try {
    const response = await fetch(url, { redirect: "follow" });
    if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
    await mkdir(binDir, { recursive: true });
    await writeFile(temporary, Buffer.from(await response.arrayBuffer()));
    await markExecutable(temporary);
    await copyFile(temporary, destination);
    return true;
  } finally {
    await unlink(temporary).catch(() => undefined);
  }
}

/** Download and gunzip a binary (ffmpeg-static releases are `.gz`). */
async function downloadGzip(url, destination) {
  const temporary = `${destination}.download-${process.pid}`;
  try {
    const response = await fetch(url, { redirect: "follow" });
    if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
    await mkdir(binDir, { recursive: true });
    await pipeline(Readable.fromWeb(response.body), createGunzip(), createWriteStream(temporary));
    await markExecutable(temporary);
    await copyFile(temporary, destination);
    return true;
  } finally {
    await unlink(temporary).catch(() => undefined);
  }
}

async function stageYtDlp() {
  if (await isUsable(binaryPath)) {
    console.log(`[youtube] yt-dlp already present: ${binaryPath}`);
    return true;
  }

  // Prefer the copy that npm installed, but only when it is a native build.
  // On Linux/macOS youtube-dl-exec installs the Python zipapp, which we must
  // not ship: it verifies on the build image but cannot run on the host.
  const bundled = bundledYtDlpPath();
  if (bundled && bundled !== binaryPath && (await isUsable(bundled))) {
    await mkdir(binDir, { recursive: true });
    await copyFile(bundled, binaryPath);
    await markExecutable(binaryPath);
    console.log(`[youtube] yt-dlp staged from bundled dependency: ${binaryPath}`);
    return true;
  }

  const asset = ytDlpAsset();
  if (!asset) {
    console.warn(`[youtube] no standalone yt-dlp build for ${process.platform}/${process.arch}`);
    return false;
  }

  const url = `${YTDLP_RELEASE}/${asset}`;
  try {
    await downloadBinary(url, binaryPath);
    await markExecutable(binaryPath);
    if (!(await isUsable(binaryPath))) {
      throw new Error("downloaded yt-dlp failed verification (wrong platform or interpreter script)");
    }
    console.log(`[youtube] yt-dlp downloaded: ${binaryPath} (${asset})`);
    return true;
  } catch (error) {
    console.warn(`[youtube] could not stage yt-dlp: ${error instanceof Error ? error.message : String(error)}`);
    await unlink(binaryPath).catch(() => undefined);
    return false;
  }
}

async function stageFfmpeg() {
  const gzDest = `${ffmpegDest}.gz`;

  if (await isUsable(ffmpegDest, ["-version"])) {
    console.log(`[youtube] ffmpeg already present: ${ffmpegDest}`);
    return true;
  }
  if (!isWindows && (await isUsableGzip(gzDest, ["-version"]))) {
    console.log(`[youtube] ffmpeg archive already present: ${gzDest}`);
    return true;
  }

  const asset = ffmpegAsset();
  if (!asset) {
    console.warn(`[youtube] no ffmpeg-static build for ${process.platform}/${process.arch}`);
    return false;
  }

  const url = `${FFMPEG_RELEASE}/${asset}`;
  try {
    if (isWindows) {
      // Local Windows development runs the binary directly, so keep it raw.
      await downloadGzip(url, ffmpegDest);
      await markExecutable(ffmpegDest);
      if (!(await isUsable(ffmpegDest, ["-version"]))) throw new Error("downloaded ffmpeg failed verification");
      console.log(`[youtube] ffmpeg downloaded: ${ffmpegDest} (${asset})`);
    } else {
      // Serverless deployments ship the ~28 MB archive instead of the ~76 MB
      // executable; src/lib/ffmpeg.ts expands it into the temp dir on first
      // use. This keeps the function under Vercel's 250 MB bundle limit.
      await unlink(gzDest).catch(() => undefined);
      await downloadBinary(url, gzDest);
      if (!(await isUsableGzip(gzDest, ["-version"]))) throw new Error("downloaded ffmpeg archive failed verification");
      await unlink(ffmpegDest).catch(() => undefined);
      console.log(`[youtube] ffmpeg archive staged: ${gzDest} (${asset})`);
    }
    return true;
  } catch (error) {
    console.warn(`[youtube] could not stage ffmpeg: ${error instanceof Error ? error.message : String(error)}`);
    await unlink(isWindows ? ffmpegDest : gzDest).catch(() => undefined);
    return false;
  }
}

/** Drop binaries for other platforms so a deployment never ships dead weight. */
async function removeForeignBinaries() {
  const foreign = isWindows
    ? [join(binDir, "yt-dlp"), join(binDir, "ffmpeg"), join(binDir, "ffmpeg.gz")]
    : [join(binDir, "yt-dlp.exe"), join(binDir, "ffmpeg.exe")];
  for (const filePath of foreign) {
    await unlink(filePath).catch(() => undefined);
  }
}

(async () => {
  await mkdir(binDir, { recursive: true });
  await removeForeignBinaries();

  const [ytDlpOk, ffmpegOk] = [await stageYtDlp(), await stageFfmpeg()];

  if (!ytDlpOk || !ffmpegOk) {
    // Not fatal: src/lib/media-binary.ts downloads the same standalone builds
    // into the temp directory on first use. Failing the build here would block
    // deployments whenever GitHub Releases has a hiccup.
    console.warn(
      "[youtube] media engine binaries incomplete; the server will provision them at runtime on first use"
    );
  }
})();
