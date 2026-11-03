import { execFile } from "child_process";
import { existsSync } from "fs";
import { isAbsolute, resolve as resolvePath } from "path";
import { logger } from "./logger.js";
import { inc, observe } from "./metrics.js";
import {
  binaryCandidates,
  binaryRoots,
  ensureExecutable,
  ensureExecutableSync,
  findStagedBinary,
  ffmpegReleaseAsset,
  getBinarySource,
  markBinarySource,
  resolveRuntimeBinary,
  type RuntimeBinarySpec,
} from "./media-binary.js";

let cachedAvailability: boolean | null = null;
let cachedVersion: string | null = null;
let cachedPath: string | null | undefined;
const BACKEND_ROOT = process.cwd();

function configuredFfmpegPath(): string | null {
  const configured = (process.env.FFMPEG_BIN || "").trim();
  if (!configured) return null;
  try {
    if (process.platform !== "win32" && configured.toLowerCase().endsWith(".exe")) {
      logger.warn("[FFMPEG] ignoring Windows .exe path on non-Windows runtime");
      return null;
    }
    const candidates = isAbsolute(configured)
      ? [configured]
      : [BACKEND_ROOT, ...binaryRoots()].map((root) => resolvePath(root, configured));
    for (const candidate of candidates) {
      if (existsSync(candidate)) return candidate;
    }
  } catch {
    /* fall through to staged binary */
  }
  return null;
}

/**
 * Locate ffmpeg without spawning it. `bin/ffmpeg` is staged by
 * scripts/ensure-ytdlp.mjs and shipped via vercel.json `includeFiles`, but the
 * roots cover a bundled serverless entry point and a monorepo layout too.
 */
export function getFfmpegPath(): string | null {
  if (cachedPath !== undefined) return cachedPath;

  const fromEnv = configuredFfmpegPath();
  const staged = fromEnv ?? findStagedBinary("ffmpeg");
  if (!staged) {
    cachedPath = null;
    logger.warn("[FFMPEG] no executable binary found in bin/ or FFMPEG_BIN env var", {
      candidates: binaryCandidates("ffmpeg"),
    });
    return null;
  }

  cachedPath = ensureExecutableSync(staged);
  if (!getBinarySource("ffmpeg")) {
    markBinarySource("ffmpeg", fromEnv ? "env" : "staged");
  }
  return cachedPath;
}

function ffmpegRuntimeSpec(): RuntimeBinarySpec | null {
  const asset = ffmpegReleaseAsset();
  if (!asset) return null;
  return {
    label: "ffmpeg",
    base: "ffmpeg",
    url: `https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/${asset}`,
    gzip: true,
    versionArgs: ["-version"],
  };
}

/**
 * Async variant that provisions a missing binary on serverless hosts. Cheap
 * when the binary is already staged: it just returns the cached path.
 */
export async function resolveFfmpegPath(): Promise<string | null> {
  const existing = getFfmpegPath();
  if (existing) return existing;

  const spec = ffmpegRuntimeSpec();
  const runtime = spec ? await resolveRuntimeBinary(spec) : null;
  if (!runtime) return null;

  try {
    cachedPath = await ensureExecutable(runtime);
  } catch (error) {
    logger.error("[FFMPEG] runtime binary is not executable", {
      path: runtime,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
  markBinarySource("ffmpeg", "runtime");
  return cachedPath;
}

function queryVersion(ffmpeg: string): Promise<string | null> {
  return new Promise((resolve) => {
    execFile(ffmpeg, ["-version"], { timeout: 10_000 }, (err, stdout) => {
      if (err) {
        resolve(null);
        return;
      }
      const firstLine = String(stdout || "").split("\n")[0] || "";
      const match = firstLine.match(/ffmpeg version ([^\s]+)/);
      resolve(match ? match[1] : firstLine.trim() || null);
    });
  });
}

export async function isFfmpegAvailable(): Promise<boolean> {
  if (cachedAvailability !== null) return cachedAvailability;
  const ffmpeg = await resolveFfmpegPath();
  if (!ffmpeg) {
    cachedAvailability = false;
    return false;
  }
  const version = await queryVersion(ffmpeg);
  cachedVersion = version;
  cachedAvailability = version !== null;
  logger.info("[FFMPEG] executable resolved", {
    available: cachedAvailability,
    version: cachedVersion,
    source: getBinarySource("ffmpeg"),
  });
  return cachedAvailability;
}

export function getFfmpegVersionSync(): string | null {
  return cachedVersion;
}

export interface FfmpegResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export class FfmpegAbortedError extends Error {
  readonly reason: "aborted" | "timeout";
  constructor(reason: "aborted" | "timeout") {
    super(reason === "aborted" ? "FFmpeg cancelled by caller" : "FFmpeg timed out");
    this.name = "AbortError";
    this.reason = reason;
  }
}

/**
 * True when `ffmpeg -i` output describes at least one audio stream
 * (`Stream #0:1(...): Audio: ...`). Pure string scan — no process, no I/O —
 * so it is unit-testable without an FFmpeg binary.
 */
export function ffmpegOutputHasAudio(output: string): boolean {
  return /^\s*Stream\s+#\d+:\d+.*\bAudio:/mi.test(output);
}

/**
 * Every invocation is a real OS process holding native memory and CPU, so a
 * cancelled caller (client disconnect, drain, or gate abandonment) must kill
 * the child immediately instead of letting it run to completion unobserved.
 * `signal` is optional so existing callers keep working, but every new caller
 * should pass one.
 *
 * Hardening notes:
 *  - `execFile` + an argument ARRAY: no shell is spawned, so nothing derived
 *    from user input can ever be interpreted as a command.
 *  - Timeout is enforced by the child runner AND a SIGKILL backstop, so even a
 *    process that ignores SIGTERM cannot outlive its budget.
 *  - `maxBuffer` caps captured stdout/stderr so a chatty ffmpeg cannot grow
 *    the heap.
 */
export function runFfmpeg(
  args: string[],
  timeoutMs: number,
  signal?: AbortSignal
): Promise<FfmpegResult> {
  const ffmpeg = getFfmpegPath();
  if (!ffmpeg) {
    return Promise.reject(new Error("FFmpeg executable is not available"));
  }
  if (signal?.aborted) {
    return Promise.reject(new FfmpegAbortedError("aborted"));
  }
  return new Promise((resolve, reject) => {
    let settled = false;
    const startedAt = Date.now();
    inc("ffmpegJobs");
    const finish = (fn: () => void): void => {
      if (settled) return;
      settled = true;
      clearTimeout(killTimer);
      signal?.removeEventListener("abort", onAbort);
      observe("ffmpeg", Date.now() - startedAt);
      fn();
    };

    const child = execFile(
      ffmpeg,
      args,
      { timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          if (signal?.aborted) {
            inc("ffmpegAborts");
            finish(() => reject(new FfmpegAbortedError("aborted")));
            return;
          }
          const exitCode =
            typeof (error as NodeJS.ErrnoException & { code?: unknown }).code === "number"
              ? ((error as unknown as { code: number }).code)
              : -1;
          inc("ffmpegFailures");
          finish(() =>
            reject(
              Object.assign(new Error(`FFmpeg failed (exit ${exitCode})`), {
                exitCode,
                stdout: String(stdout || "").slice(-2000),
                stderr: String(stderr || "").slice(-4000),
              })
            )
          );
          return;
        }
        finish(() => resolve({ exitCode: 0, stdout: String(stdout || ""), stderr: String(stderr || "") }));
      }
    );

    // SIGTERM first so ffmpeg can flush/close its output file, SIGKILL as a
    // backstop in case it is stuck in a decode loop.
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
    signal?.addEventListener("abort", onAbort, { once: true });

    const killTimer = setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } catch {
        /* already exited */
      }
    }, timeoutMs + 2000);
    child.on("close", () => clearTimeout(killTimer));
  });
}
