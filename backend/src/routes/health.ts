import { Router, Request, Response } from "express";
import { isFfmpegAvailable, getFfmpegVersionSync } from "../lib/ffmpeg.js";
import { getYtDlpVersion, isYtDlpAvailable } from "../lib/youtube/ytdlp.js";
import { audioProviderStatus } from "../lib/audio-provider.js";
import { capacitySnapshot } from "../lib/capacity.js";
import { getResolverPoolSnapshot } from "../lib/resolver-pool.js";
import { currentDrainReason, drainMetrics, isDraining } from "../lib/shutdown.js";
import { metricsSnapshot } from "../lib/metrics.js";
import { getSessionState, isInstagramSessionConfigured } from "../lib/instagram-session.js";
import { getBuildVersion } from "../lib/env.js";

const router = Router();
const MEDIA_HEALTH_TIMEOUT_MS = 5000;

async function boundedMediaCheck(check: () => Promise<boolean>): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      check().catch(() => false),
      new Promise<boolean>((resolve) => {
        timer = setTimeout(() => resolve(false), MEDIA_HEALTH_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// Health/readiness answers describe this instant (uptime, draining,
// capacity): caching them anywhere would serve stale orchestration signals.
router.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

/**
 * Liveness: the process is running and able to answer. Deliberately does NOT
 * depend on capacity or dependencies, so a busy instance is not killed by an
 * orchestrator while it is still serving requests correctly.
 */
router.get("/", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * Readiness: should this instance receive new work?
 *
 * Reports honest saturation (which workload is full and how deep the queue
 * is) and returns 503 while draining so a load balancer stops sending traffic
 * before the process exits. It does not fail on FFmpeg being absent, because
 * that degrades audio conversion only — resolution and proxying still work.
 */
router.get("/ready", async (_req: Request, res: Response) => {
  const providerName = process.env.RESOLVER_PROVIDER || "placeholder";
  const drain = drainMetrics();
  const ffmpegAvailable = await boundedMediaCheck(isFfmpegAvailable);
  const ytDlpAvailable = drain.draining ? false : await boundedMediaCheck(isYtDlpAvailable);
  const capacity = capacitySnapshot();

  // Only report unavailable when the instance is shutting down. A saturated
  // workload still serves cached and queued work, so it stays ready and lets
  // per-request gates return precise 503s instead of a blanket outage.
  const ready = !drain.draining;

  // Safe build identifier: proves WHICH code a production instance runs
  // (stale-bundle diagnosis) without exposing anything secret.
  const build = getBuildVersion();

  res.status(ready ? 200 : 503).json({
    status: ready ? "ready" : "draining",
    engineReady: ffmpegAvailable && ytDlpAvailable,
    provider: providerName,
    build,
    buildVersion: build,
    providerConfigured: providerName !== "placeholder",
    // Presence flags only — credentials never leave the backend.
    hasSession: isInstagramSessionConfigured(),
    instagramSessionConfigured: isInstagramSessionConfigured(),
    // Lifecycle state (UNCONFIGURED/CONFIGURED_UNKNOWN/VALID/INVALID) plus
    // the selecting variable NAME only — distinguishes "loaded" from
    // "verified" for operators without exposing any secret material.
    sessionState: getSessionState().state,
    sessionSource: getSessionState().source,
    sessionValidated: getSessionState().validated,
    audioProvider: audioProviderStatus(),
    ffmpegConfigured: Boolean(process.env.FFMPEG_BIN?.trim()),
    ffmpegAvailable,
    ffmpegVersion: getFfmpegVersionSync(),
    ytDlpConfigured: Boolean(process.env.YTDLP_PATH?.trim()),
    ytDlpAvailable,
    ytDlpVersion: getYtDlpVersion(),
    draining: drain.draining,
    drainReason: drain.reason,
    inFlightRequests: drain.inFlight,
    capacity,
    node: process.version,
    runtime: "node",
    uptimeSeconds: Math.round(process.uptime()),
    platform: process.platform,
    serverless: Boolean(process.env.VERCEL),
    timestamp: new Date().toISOString(),
  });
});

router.get("/capacity", (_req: Request, res: Response) => {
  res.json({
    draining: isDraining(),
    drainReason: currentDrainReason(),
    capacity: capacitySnapshot(),
    // 3-worker resolver pool: per-worker active/queued/load/health. Counts
    // and percentages only — never URLs, cookies, or session data.
    resolverPool: getResolverPoolSnapshot(),
    // Cache hit rate, provider/browser/transcode volumes, 429/503/5xx counts
    // and per-stage latency: the numbers needed to tell "slow" from "busy"
    // from "broken" without attaching a debugger.
    metrics: metricsSnapshot(),
    timestamp: new Date().toISOString(),
  });
});

router.get("/media", async (_req: Request, res: Response) => {
  const ffmpegAvailable = await boundedMediaCheck(isFfmpegAvailable);
  const ytDlpAvailable = await boundedMediaCheck(isYtDlpAvailable);
  res.json({
    status: ffmpegAvailable && ytDlpAvailable ? "ok" : "degraded",
    engineReady: ffmpegAvailable && ytDlpAvailable,
    ffmpegConfigured: Boolean(process.env.FFMPEG_BIN?.trim()),
    ytDlpConfigured: Boolean(process.env.YTDLP_PATH?.trim()),
    ffmpegAvailable,
    ffmpegVersion: getFfmpegVersionSync(),
    ytDlpAvailable,
    ytDlpVersion: getYtDlpVersion(),
    timestamp: new Date().toISOString(),
  });
});

export default router;
