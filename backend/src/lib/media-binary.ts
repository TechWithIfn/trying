import { execFile } from "child_process";
import { chmodSync, copyFileSync, existsSync, readdirSync, statSync } from "fs";
import { chmod, copyFile, readFile, readdir, rename, rm, stat, writeFile } from "fs/promises";
import { gunzipSync } from "zlib";
import { basename, dirname, join, resolve as resolvePath } from "path";
import { tmpdir } from "os";
import { logger } from "./logger.js";

/**
 * Shared locating/staging logic for the external media engines (yt-dlp and
 * ffmpeg).
 *
 * Both binaries are staged into `<project>/bin` at build time by
 * `scripts/ensure-ytdlp.mjs` and declared in `vercel.json` via
 * `includeFiles`. Neither of those is guaranteed at runtime:
 *
 *  - serverless bundles may place the function entry somewhere other than the
 *    project root, so computing `bin/` from `import.meta.url` alone is
 *    unreliable (and silently returns the filesystem root when the entry is
 *    bundled);
 *  - a binary can be present but non-executable on a read-only mount;
 *  - the build step may not run at all on some hosting setups.
 *
 * So resolution walks several plausible roots, fixes the executable bit (or
 * copies to the writable temp dir), and — when nothing is found on a
 * serverless host — downloads the correct standalone build once per instance.
 */

/** Directory of this module, when the runtime exposes a real module URL. */
const MODULE_DIR = (() => {
  try {
    const url = new URL(import.meta.url);
    if (url.protocol !== "file:") return null;
    // Windows file URLs arrive as /C:/... — strip the leading slash so
    // `dirname` produces a usable drive path.
    return dirname(decodeURIComponent(url.pathname).replace(/^\/([A-Za-z]:)/, "$1"));
  } catch {
    return null;
  }
})();

function ancestorDirs(start: string, depth: number): string[] {
  const dirs: string[] = [];
  let current = resolvePath(start);
  for (let i = 0; i <= depth; i += 1) {
    dirs.push(current);
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return dirs;
}

/**
 * Ordered list of directories that may contain a `bin/` folder. Specific
 * overrides win; deployment roots and the working directory follow; module and
 * process ancestors are the last resort.
 */
export function binaryRoots(): string[] {
  const roots: string[] = [];
  const push = (value: string | undefined | null): void => {
    const trimmed = (value ?? "").trim();
    if (!trimmed) return;
    const normalized = resolvePath(trimmed);
    if (!roots.includes(normalized)) roots.push(normalized);
  };

  push(process.env.MEDIA_BIN_DIR);
  push(process.env.LAMBDA_TASK_ROOT);
  push(process.env.VERCEL_TASK_ROOT);
  if (process.env.VERCEL) push("/var/task");
  push(process.cwd());
  for (const dir of ancestorDirs(process.cwd(), 3)) push(dir);
  if (MODULE_DIR) {
    for (const dir of ancestorDirs(MODULE_DIR, 5)) push(dir);
  }

  // A `bin/` folder can sit at the deployment root or beside a `backend/`
  // workspace in a monorepo checkout.
  const expanded: string[] = [];
  for (const root of roots) {
    if (!expanded.includes(root)) expanded.push(root);
    const nested = join(root, "backend");
    if (!expanded.includes(nested)) expanded.push(nested);
  }
  return expanded;
}

/** Executable file names to try for a base name on the current platform. */
export function binaryNames(base: string): string[] {
  return process.platform === "win32" ? [`${base}.exe`, base] : [base, `${base}.exe`];
}

function isCompatible(candidate: string): boolean {
  return process.platform === "win32" || !candidate.toLowerCase().endsWith(".exe");
}

/** Every `<root>/bin/<name>` candidate, most specific root first. */
export function binaryCandidates(base: string): string[] {
  const names = binaryNames(base);
  const candidates: string[] = [];
  for (const root of binaryRoots()) {
    for (const name of names) {
      const candidate = join(root, "bin", name);
      if (!candidates.includes(candidate)) candidates.push(candidate);
    }
  }
  return candidates;
}

/** First candidate that exists on disk. No execution probe. */
export function findStagedBinary(base: string): string | null {  for (const candidate of binaryCandidates(base)) {
    if (!isCompatible(candidate)) continue;
    try {
      if (existsSync(candidate)) return candidate;
    } catch {
      /* unreadable root */
    }
  }
  return null;
}

/**
 * Names of the files present in any candidate `bin/` folder. Ops diagnostics
 * only (file names, never full paths) — it answers "what actually shipped?".
 */
export function stagedBinaryInventory(): string[] {
  const names = new Set<string>();
  for (const root of binaryRoots()) {
    try {
      for (const entry of readdirSync(join(root, "bin"))) names.add(entry);
    } catch {
      /* no bin/ under this root */
    }
  }
  return [...names].sort();
}

/**
 * A compressed staged binary (`bin/<base>.gz`). Shipping ffmpeg gzipped keeps
 * the serverless bundle ~48 MB smaller than shipping the ~76 MB executable;
 * it is expanded into the temp dir on first use.
 */
export function findStagedGzip(base: string): string | null {
  for (const root of binaryRoots()) {
    const candidate = join(root, "bin", `${base}.gz`);
    try {
      if (existsSync(candidate)) return candidate;
    } catch {
      /* unreadable root */
    }
  }
  return null;
}

/**
 * Expand a staged `.gz` binary into the temp dir, verify it, and cache it for
 * the life of the instance. Returns null (never throws) on failure.
 */
export async function materializeStagedGzip(
  base: string,
  gzPath: string,
  versionArgs: string[]
): Promise<string | null> {
  const destination = runtimeBinaryPath(base);
  try {
    if (await verifyBinary(destination, versionArgs)) {
      runtimePaths.set(base, destination);
      return destination;
    }
  } catch {
    /* expand a fresh copy */
  }

  const temporary = `${destination}.part-${process.pid}`;
  try {
    const compressed = await readFile(gzPath);
    const data = gunzipSync(compressed);
    if (data.byteLength < 1_000_000) throw new Error(`expanded binary too small (${data.byteLength} bytes)`);
    await writeFile(temporary, data);
    if (process.platform !== "win32") await chmod(temporary, 0o755);
    if (!(await verifyBinary(temporary, versionArgs))) {
      throw new Error("staged archive failed its startup check");
    }
    await rename(temporary, destination);
    runtimePaths.set(base, destination);
    logger.info("[MEDIA] staged archive expanded", {
      base,
      gzPath,
      path: destination,
      bytes: data.byteLength,
    });
    return destination;
  } catch (error) {
    logger.error("[MEDIA] could not expand staged archive", {
      base,
      gzPath,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  } finally {
    await rm(temporary, { force: true }).catch(() => undefined);
  }
}

/**
 * Ensure a staged binary can be executed. `/var/task` is read-only on
 * serverless hosts, so an archive that dropped the executable bit has to be
 * copied into the temp directory instead of chmod'ed in place.
 */
export async function ensureExecutable(filePath: string): Promise<string> {
  if (process.platform === "win32") return filePath;
  try {
    const details = await stat(filePath);
    if ((details.mode & 0o111) !== 0) return filePath;
    try {
      await chmod(filePath, details.mode | 0o755);
      return filePath;
    } catch {
      const copy = join(tmpdir(), `downloadit-${basename(filePath)}-${process.pid}`);
      await copyFile(filePath, copy);
      await chmod(copy, 0o755);
      logger.warn("[MEDIA] binary was not executable; copied to temporary storage", {
        filePath,
        runtimePath: copy,
      });
      return copy;
    }
  } catch (error) {
    throw new Error(`not executable: ${error instanceof Error ? error.message : "permission check failed"}`);
  }
}

/** Synchronous variant used by path getters that cannot await. */
export function ensureExecutableSync(filePath: string): string {
  if (process.platform === "win32") return filePath;
  try {
    const details = statSync(filePath);
    if ((details.mode & 0o111) !== 0) return filePath;
    try {
      chmodSync(filePath, details.mode | 0o755);
      return filePath;
    } catch {
      const copy = join(tmpdir(), `downloadit-${basename(filePath)}-${process.pid}`);
      copyFileSync(filePath, copy);
      chmodSync(copy, 0o755);
      return copy;
    }
  } catch {
    return filePath;
  }
}

/** Run `binary versionArgs` and report whether it produced any output. */
export function verifyBinary(filePath: string, versionArgs: string[], timeoutMs = 20_000): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      execFile(
        filePath,
        versionArgs,
        { timeout: timeoutMs, maxBuffer: 256 * 1024, windowsHide: true },
        (error, stdout, stderr) => {
          if (error) {
            resolve(false);
            return;
          }
          const output = `${String(stdout ?? "")}${String(stderr ?? "")}`.trim();
          resolve(output.length >= 3);
        }
      );
    } catch {
      resolve(false);
    }
  });
}

/* -------------------------------------------------------------------------- */
/* Runtime fallback downloads                                                  */
/* -------------------------------------------------------------------------- */

export interface RuntimeBinarySpec {
  /** Human-readable label for logs ("yt-dlp", "ffmpeg"). */
  label: string;
  /** Base file name used for the temp path and cache key. */
  base: string;
  /** Absolute download URL for the platform-correct standalone build. */
  url: string;
  /** Whether the payload is gzip-compressed. */
  gzip?: boolean;
  /** Arguments that make the binary print its version. */
  versionArgs: string[];
}

const runtimePaths = new Map<string, string>();
const runtimePending = new Map<string, Promise<string | null>>();
const runtimeRetryAfter = new Map<string, number>();
const RUNTIME_MAX_BYTES = 200 * 1024 * 1024;
/** Do not retry a failed download on every request: the host may be offline. */
const RUNTIME_RETRY_BACKOFF_MS = 5 * 60_000;

/**
 * A frozen serverless invocation can leave a partially written download
 * behind. Clear stale parts so repeated cold starts cannot fill the temp dir.
 */
async function cleanupPartialDownloads(base: string): Promise<void> {
  try {
    const prefix = `downloadit-${base}.part-`;
    const entries = await readdir(tmpdir());
    const cutoff = Date.now() - 10 * 60_000;
    for (const entry of entries) {
      if (!entry.startsWith(prefix)) continue;
      const filePath = join(tmpdir(), entry);
      try {
        const details = await stat(filePath);
        if (details.mtimeMs < cutoff) await rm(filePath, { force: true });
      } catch {
        /* already removed */
      }
    }
  } catch {
    /* temp dir not readable — nothing to clean */
  }
}

/**
 * Runtime downloads are intentionally opt-in on developer machines: a missing
 * local binary should surface as a clear error, not as a surprise 40 MB
 * download during a test run. Serverless hosts opt in automatically because
 * their filesystem layout is outside our control.
 */
export function runtimeDownloadsEnabled(): boolean {
  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    return (process.env.MEDIA_RUNTIME_DOWNLOAD ?? "").trim().toLowerCase() === "1";
  }
  const flag = (process.env.MEDIA_RUNTIME_DOWNLOAD ?? "").trim().toLowerCase();
  if (flag === "0" || flag === "false" || flag === "off") return false;
  if (flag === "1" || flag === "true" || flag === "on") return true;
  return Boolean(process.env.VERCEL || process.env.LAMBDA_TASK_ROOT);
}

export function runtimeBinaryPath(base: string): string {
  const suffix = process.platform === "win32" ? ".exe" : "";
  return join(tmpdir(), `downloadit-${base}${suffix}`);
}

/** Where a resolved binary came from — surfaced by the health endpoint. */
export type BinarySource = "staged" | "runtime" | "env";

const sources = new Map<string, BinarySource>();

export function getBinarySource(base: string): BinarySource | null {
  return sources.get(base) ?? null;
}

export function markBinarySource(base: string, source: BinarySource): void {
  sources.set(base, source);
}

/**
 * Download a standalone build into the temp dir, verify it, and cache it for
 * the lifetime of the instance. Concurrent callers share one download.
 * Returns null (never throws) when the download is disabled or fails.
 */
export async function resolveRuntimeBinary(spec: RuntimeBinarySpec): Promise<string | null> {
  if (!runtimeDownloadsEnabled()) return null;

  const cached = runtimePaths.get(spec.base);
  if (cached && (await verifyBinary(cached, spec.versionArgs))) return cached;

  const retryAt = runtimeRetryAfter.get(spec.base);
  if (retryAt && retryAt > Date.now()) return null;

  const pending = runtimePending.get(spec.base);
  if (pending) return pending;

  const task = (async (): Promise<string | null> => {
    const destination = runtimeBinaryPath(spec.base);
    const temporary = `${destination}.part-${process.pid}`;

    try {
      await cleanupPartialDownloads(spec.base);

      // A previous instance may have left a usable copy in /tmp.
      try {
        if (await verifyBinary(destination, spec.versionArgs)) {
          runtimePaths.set(spec.base, destination);
          logger.info("[MEDIA] reusing cached runtime binary", { label: spec.label, path: destination });
          return destination;
        }
      } catch {
        /* fall through to a fresh download */
      }

      logger.warn("[MEDIA] media engine binary missing from bundle; downloading at runtime", {
        label: spec.label,
        url: spec.url,
        platform: process.platform,
        arch: process.arch,
      });

      const response = await fetch(spec.url, {
        redirect: "follow",
        signal: AbortSignal.timeout(60_000),
      });
      if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.byteLength < 1_000_000) {
        throw new Error(`download too small (${buffer.byteLength} bytes)`);
      }
      if (buffer.byteLength > RUNTIME_MAX_BYTES) {
        throw new Error(`download too large (${buffer.byteLength} bytes)`);
      }

      const data = spec.gzip ? gunzipSync(buffer) : buffer;
      await writeFile(temporary, data);
      if (process.platform !== "win32") await chmod(temporary, 0o755);
      if (!(await verifyBinary(temporary, spec.versionArgs))) {
        throw new Error("downloaded binary failed its startup check");
      }
      await rename(temporary, destination);
      runtimePaths.set(spec.base, destination);
      logger.info("[MEDIA] runtime binary ready", {
        label: spec.label,
        path: destination,
        bytes: data.byteLength,
      });
      return destination;
    } catch (error) {
      runtimeRetryAfter.set(spec.base, Date.now() + RUNTIME_RETRY_BACKOFF_MS);
      logger.error("[MEDIA] runtime binary download failed", {
        label: spec.label,
        url: spec.url,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    } finally {
      await rm(temporary, { force: true }).catch(() => undefined);
    }
  })();

  runtimePending.set(spec.base, task);
  try {
    return await task;
  } finally {
    runtimePending.delete(spec.base);
  }
}

/** Platform-correct standalone yt-dlp release asset (no Python required). */
export function ytDlpReleaseAsset(): string | null {
  if (process.platform === "win32") return "yt-dlp.exe";
  if (process.platform === "darwin") return "yt-dlp_macos";
  if (process.platform === "linux") {
    if (process.arch === "arm64") return "yt-dlp_linux_aarch64";
    if (process.arch === "ia32") return null;
    return "yt-dlp_linux";
  }
  return null;
}

/** Platform-correct ffmpeg-static release asset (gzip-compressed). */
export function ffmpegReleaseAsset(): string | null {
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
