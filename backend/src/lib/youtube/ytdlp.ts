import { execFile } from "child_process";
import { existsSync } from "fs";
import { createRequire } from "module";
import { delimiter, isAbsolute, join } from "path";
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

function isPathLike(value: string): boolean {
  return isAbsolute(value) || value.includes("/") || value.includes("\\");
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
function probeCandidate(candidate: string): Promise<{ path: string; version: string } | null> {
  return new Promise((resolve) => {
    execFile(
      candidate,
      versionArgs(),
      { timeout: 8_000, maxBuffer: 256 * 1024, windowsHide: true },
      (error, stdout) => {
        if (error) {
          resolve(null);
          return;
        }
        const version = String(stdout || "").trim().split(/\r?\n/)[0] || "unknown";
        resolve({ path: candidate, version });
      }
    );
  });
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
        candidates.push(configured);
      } else {
        const onPath = commandOnPath(configured);
        if (onPath) candidates.push(onPath);
        else candidates.push(configured);
      }
    }

    const bundled = bundledBinaryPath();
    if (bundled && !candidates.includes(bundled)) candidates.push(bundled);

    for (const candidate of candidates) {
      if (isPathLike(candidate)) {
        try {
          if (!existsSync(candidate)) continue;
        } catch {
          continue;
        }
      }
      const verified = await probeCandidate(candidate);
      if (verified) {
        resolvedPath = verified.path;
        cachedVersion = verified.version;
        logger.info("[YOUTUBE] yt-dlp executable resolved", {
          path: verified.path,
          version: verified.version,
          source: configured && verified.path !== bundled ? "env" : "bundled",
        });
        return verified.path;
      }
      logger.warn("[YOUTUBE] yt-dlp candidate could not be executed", {
        candidate: isPathLike(candidate) ? candidate : "(path lookup)",
      });
    }

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
