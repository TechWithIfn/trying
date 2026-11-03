import { execFile } from "child_process";
import { existsSync } from "fs";
import { createRequire } from "module";
import { delimiter, dirname, isAbsolute, join, resolve as resolvePath } from "path";
import {
  binaryCandidates,
  binaryRoots,
  ensureExecutable,
  markBinarySource,
  resolveRuntimeBinary,
  ytDlpReleaseAsset,
  type RuntimeBinarySpec,
} from "../media-binary.js";
import { logger } from "../logger.js";

/**
 * Thin, bounded wrapper around the yt-dlp executable.
 *
 * The binary ships with the `youtube-dl-exec` dependency (postinstall
 * downloads the platform build into the package's `bin/` directory). A
 * deployment may override it with `YTDLP_PATH`, which is also the escape
 * hatch for hosts that cannot execute a binary from `node_modules`.
 *
 * All invocations use `execFile` with an argument ARRAY — no shell — so a
 * URL can never be interpreted as a command. Every call has a hard timeout,
 * an abort signal (client disconnect / shutdown), and a captured-output cap.
 */

const require = createRequire(import.meta.url);

/** Backend root used to resolve relative `YTDLP_PATH` values. */
const BACKEND_ROOT = process.cwd();

interface YoutubeDlConstants {
  YOUTUBE_DL_PATH?: string;
}

function bundledBinaryPath(): string | null {
  try {
    const pkg = require("youtube-dl-exec") as { constants?: YoutubeDlConstants };
    const candidate = pkg.constants?.YOUTUBE_DL_PATH;
    return typeof candidate === "string" && candidate.length > 0 ? candidate : null;
  } catch {
    return null;
  }
}

function packageBinaryCandidates(): string[] {
  try {
    const packageEntry = require.resolve("youtube-dl-exec");
    const binDir = join(dirname(packageEntry), "bin");
    return process.platform === "win32"
      ? [join(binDir, "yt-dlp.exe"), join(binDir, "yt-dlp")]
      : [join(binDir, "yt-dlp"), join(binDir, "yt-dlp.exe")];
  } catch {
    return [];
  }
}

function projectBinaryCandidates(): string[] {
  // `bin/yt-dlp` is staged by scripts/ensure-ytdlp.mjs and shipped through
  // vercel.json `includeFiles`. The roots cover a bundled serverless entry, a
  // monorepo `backend/` folder and local development alike.
  return binaryCandidates("yt-dlp");
}

function isPathLike(value: string): boolean {
  return isAbsolute(value) || value.includes("/") || value.includes("\\");
}

function isCompatibleCandidate(candidate: string): boolean {
  return process.platform === "win32" || !candidate.toLowerCase().endsWith(".exe");
}

function configuredPathCandidates(configured: string): string[] {
  if (isAbsolute(configured)) {
    if (process.platform === "win32" && !/\.[a-z0-9]+$/i.test(configured)) {
      return [configured, `${configured}.exe`];
    }
    return [configured];
  }

  // Relative overrides are read against the working directory first (npm
  // scripts run from backend/), then against every deployment root so the
  // same value keeps working in a serverless bundle.
  const candidates: string[] = [];
  for (const root of [BACKEND_ROOT, ...binaryRoots()]) {
    const resolved = resolvePath(root, configured);
    if (!candidates.includes(resolved)) candidates.push(resolved);
    if (process.platform === "win32" && !/\.[a-z0-9]+$/i.test(resolved)) {
      const withExe = `${resolved}.exe`;
      if (!candidates.includes(withExe)) candidates.push(withExe);
    }
  }
  return candidates;
}

function commandOnPath(name: string): string | null {
  const pathValue = process.env.PATH ?? "";
  const exts =
    process.platform === "win32"
      ? (process.env.PATHEXT ?? ".EXE;.CMD;.BAT").split(";").filter(Boolean)
      : [""];
  for (const dir of pathValue.split(delimiter)) {
    if (!dir) continue;
    for (const ext of exts) {
      const file = join(dir, name.endsWith(ext.toLowerCase()) ? name : name + ext);
      try {
        if (existsSync(file)) return file;
      } catch {
        /* ignore unreadable PATH entries */
      }
    }
  }
  return null;
}

export class YtDlpNotAvailableError extends Error {
  constructor(message = "yt-dlp executable is not available") {
    super(message);
    this.name = "YtDlpNotAvailableError";
  }
}

export class YtDlpProcessError extends Error {
  readonly stderr: string;
  readonly exitCode: number;
  constructor(message: string, stderr: string, exitCode: number) {
    super(message);
    this.name = "YtDlpProcessError";
    this.stderr = stderr;
    this.exitCode = exitCode;
  }
}

export class YtDlpAbortedError extends Error {
  readonly reason: "aborted" | "timeout";
  constructor(reason: "aborted" | "timeout") {
    super(reason === "aborted" ? "yt-dlp cancelled by caller" : "yt-dlp timed out");
    this.name = "AbortError";
    this.reason = reason;
  }
}

let resolvedPath: string | null = null;
let resolvedPromise: Promise<string> | null = null;
let cachedVersion: string | null = null;

function versionArgs(): string[] {
  return ["--version"];
}

/**
 * Verify one candidate by asking it for its version. A candidate that exists
 * but cannot execute (wrong platform, missing shared library, stripped from a
 * serverless bundle) is rejected and the next candidate is tried.
 */
interface CandidateProbe {
  path: string;
  version?: string;
  failure?: string;
}

const CANDIDATE_PROBE_TIMEOUT_MS = 10_000;

function runtimeSpec(): RuntimeBinarySpec | null {
  const asset = ytDlpReleaseAsset();
  if (!asset) return null;
  return {
    label: "yt-dlp",
    base: "yt-dlp",
    // `yt-dlp_linux`/`yt-dlp_macos` are self-contained builds. The generic
    // `yt-dlp` asset is a Python zipapp and cannot run on hosts without
    // Python 3 — which is exactly the case for a Node serverless runtime.
    url: `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${asset}`,
    versionArgs: versionArgs(),
  };
}

async function probeCandidate(candidate: string): Promise<CandidateProbe> {
  try {
    const executable = await ensureExecutable(candidate);
    return await new Promise((resolve) => {
      execFile(
        executable,
        versionArgs(),
        { timeout: CANDIDATE_PROBE_TIMEOUT_MS, maxBuffer: 256 * 1024, windowsHide: true },
        (error, stdout, stderr) => {
          if (error) {
            const code = typeof error.code === "string" || typeof error.code === "number" ? error.code : "unknown";
            const detail = String(stderr || error.message || "startup failed")
              .replace(/[\u0000-\u001f\u007f]/g, " ")
              .replace(/\s+/g, " ")
              .trim()
              .slice(-240);
            resolve({ path: candidate, failure: `exit=${code}${detail ? ` ${detail}` : ""}` });
            return;
          }
          const version = String(stdout || "").trim().split(/\r?\n/)[0] || "unknown";
          resolve({ path: executable, version });
        }
      );
    });
  } catch (error) {
    return {
      path: candidate,
      failure: error instanceof Error ? error.message.slice(0, 240) : "startup check failed",
    };
  }
}

/**
 * Resolve and verify the executable once per process. `YTDLP_PATH` wins over
 * the bundled binary; a bare command name is looked up on PATH.
 */
export function resolveYtDlp(): Promise<string> {
  if (resolvedPath) return Promise.resolve(resolvedPath);
  if (resolvedPromise) return resolvedPromise;

  resolvedPromise = (async () => {
    const configured = (process.env.YTDLP_PATH ?? "").trim();
    const candidates: string[] = [];

    if (configured) {
      if (isPathLike(configured)) {
        if (isCompatibleCandidate(configured)) {
          candidates.push(...configuredPathCandidates(configured));
        } else {
          logger.warn("[YOUTUBE] ignoring Windows yt-dlp path on non-Windows runtime");
        }
      } else {
        const onPath = commandOnPath(configured);
        if (onPath) candidates.push(onPath);
        else candidates.push(configured);
      }
    }

    for (const candidate of projectBinaryCandidates()) {
      if (!candidates.includes(candidate)) candidates.push(candidate);
    }
    const bundled = bundledBinaryPath();
    if (bundled && !candidates.includes(bundled)) candidates.push(bundled);
    for (const candidate of packageBinaryCandidates()) {
      if (!candidates.includes(candidate)) candidates.push(candidate);
    }
    const systemBinary = commandOnPath("yt-dlp");
    if (systemBinary && !candidates.includes(systemBinary)) candidates.push(systemBinary);

    for (const candidate of candidates.filter(isCompatibleCandidate)) {
      if (isPathLike(candidate)) {
        try {
          if (!existsSync(candidate)) continue;
        } catch {
          continue;
        }
      }
      const verified = await probeCandidate(candidate);
      if (verified.version) {
        resolvedPath = verified.path;
        cachedVersion = verified.version;
        const fromEnv = configured.length > 0 && configuredPathCandidates(configured).includes(verified.path);
        markBinarySource("yt-dlp", fromEnv ? "env" : "staged");
        logger.info("[YOUTUBE] yt-dlp executable resolved", {
          path: verified.path,
          version: verified.version,
          source: fromEnv ? "env" : "bundled",
        });
        return verified.path;
      }
      logger.warn("[YOUTUBE] yt-dlp candidate could not be executed", {
        candidate: isPathLike(candidate) ? candidate : "(path lookup)",
        failure: verified.failure ?? "unknown startup failure",
      });
    }

    // --- Last resort: nothing usable shipped with the deployment. Download
    //     the standalone build into the temp dir (one per instance), verify
    //     it, and continue. This keeps /api/youtube working even when the
    //     host ignores `includeFiles` or stages an incompatible binary. ---
    const spec = runtimeSpec();
    const runtime = spec ? await resolveRuntimeBinary(spec) : null;
    if (runtime) {
      const verifiedRuntime = await probeCandidate(runtime);
      if (verifiedRuntime.version) {
        resolvedPath = verifiedRuntime.path;
        cachedVersion = verifiedRuntime.version;
        markBinarySource("yt-dlp", "runtime");
        logger.info("[YOUTUBE] yt-dlp resolved from runtime download", {
          path: verifiedRuntime.path,
          version: verifiedRuntime.version,
        });
        return verifiedRuntime.path;
      }
      logger.error("[YOUTUBE] runtime yt-dlp download could not be executed", {
        path: runtime,
        failure: verifiedRuntime.failure ?? "unknown startup failure",
      });
    }

    // --- Diagnostic: no candidate worked. Log everything we tried so an
    //     operator can see exactly which paths were checked and why each
    //     failed, instead of an opaque "media engine not installed". ---
    logger.error("[YOUTUBE] no yt-dlp executable could be resolved", {
      candidates: candidates.map((c) => ({ path: c, exists: isPathLike(c) ? existsSync(c) : null })),
      ytdlpPathEnv: configured || null,
      backendRoot: BACKEND_ROOT,
      platform: process.platform,
    });

    resolvedPromise = null;
    throw new YtDlpNotAvailableError();
  })();

  return resolvedPromise;
}

export async function isYtDlpAvailable(): Promise<boolean> {
  try {
    await resolveYtDlp();
    return true;
  } catch {
    return false;
  }
}

export function getYtDlpVersion(): string | null {
  return cachedVersion;
}

export interface RunYtDlpOptions {
  timeoutMs: number;
  signal?: AbortSignal;
  maxBuffer?: number;
}

export interface RunYtDlpResult {
  stdout: string;
  stderr: string;
}

/**
 * Run yt-dlp to completion. Rejects with:
 *  - YtDlpAbortedError for a caller abort or timeout,
 *  - YtDlpProcessError for a non-zero exit (stderr is preserved for
 *    classification), and
 *  - YtDlpNotAvailableError when no executable could be verified.
 */
export async function runYtDlp(args: string[], options: RunYtDlpOptions): Promise<RunYtDlpResult> {
  const binary = await resolveYtDlp();
  if (options.signal?.aborted) throw new YtDlpAbortedError("aborted");

  return new Promise((resolve, reject) => {
    let settled = false;
    let timedOut = false;

    const settle = (fn: () => void): void => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      options.signal?.removeEventListener("abort", onAbort);
      fn();
    };

    const child = execFile(
      binary,
      args,
      {
        timeout: options.timeoutMs,
        maxBuffer: options.maxBuffer ?? 32 * 1024 * 1024,
        windowsHide: true,
        encoding: "utf8",
      },
      (error, stdout, stderr) => {
        const out = String(stdout || "");
        const err = String(stderr || "");

        if (error) {
          if (options.signal?.aborted) {
            settle(() => reject(new YtDlpAbortedError("aborted")));
            return;
          }
          if (timedOut || isTimeoutExecError(error)) {
            settle(() => reject(new YtDlpAbortedError("timeout")));
            return;
          }
          const exitCode =
            typeof (error as { code?: unknown }).code === "number"
              ? ((error as unknown as { code: number }).code)
              : -1;
          settle(() => reject(new YtDlpProcessError("yt-dlp failed", err.slice(-8000), exitCode)));
          return;
        }

        settle(() => resolve({ stdout: out, stderr: err }));
      }
    );

    const kill = (): void => {
      try {
        child.kill("SIGTERM");
      } catch {
        /* already exited */
      }
      setTimeout(() => {
        try {
          if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
        } catch {
          /* already exited */
        }
      }, 2_000).unref();
    };

    const onAbort = (): void => kill();
    options.signal?.addEventListener("abort", onAbort, { once: true });

    const deadline = setTimeout(() => {
      timedOut = true;
      // yt-dlp spawns ffmpeg; killing the parent first stops new work. The
      // SIGKILL backstop below handles a parent that ignores SIGTERM.
      kill();
    }, options.timeoutMs);
    deadline.unref?.();

    child.on("error", (error) => {
      // Spawn-level failure (typically ENOENT): the binary disappeared or the
      // platform refused it. Surface as unavailable rather than a process exit.
      const err = error as NodeJS.ErrnoException & { code?: string | number };
      logger.error("[YOUTUBE] yt-dlp spawn failed", {
        binary,
        code: err.code,
        message: error.message,
      });
      if (options.signal?.aborted) {
        settle(() => reject(new YtDlpAbortedError("aborted")));
        return;
      }
      settle(() => reject(new YtDlpNotAvailableError(error.message)));
    });
  });
}

function isTimeoutExecError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { killed?: unknown; signal?: unknown; code?: unknown };
  return e.killed === true && (e.signal === "SIGTERM" || e.signal === "SIGKILL");
}

/** Test-only: forget the verified binary so a new env value is honored. */
export function resetYtDlpCacheForTests(): void {
  resolvedPath = null;
  resolvedPromise = null;
  cachedVersion = null;
}
