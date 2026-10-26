import { chmod, mkdir, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const binaryPath = join(root, "bin", process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp");

async function isUsable(filePath) {
  try {
    const details = await stat(filePath);
    return details.isFile() && details.size > 1_000_000;
  } catch {
    return false;
  }
}

if (!(await isUsable(binaryPath))) {
  const asset = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
  const response = await fetch(`https://github.com/yt-dlp/yt-dlp/releases/latest/download/${asset}`);
  if (!response.ok || !response.body) {
    throw new Error(`Could not download yt-dlp build asset (${response.status}).`);
  }
  await mkdir(dirname(binaryPath), { recursive: true });
  await writeFile(binaryPath, Buffer.from(await response.arrayBuffer()));
}

if (process.platform !== "win32") {
  await chmod(binaryPath, 0o755);
}

console.log(`[youtube] yt-dlp ready: ${binaryPath}`);
