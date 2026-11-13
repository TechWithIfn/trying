import "dotenv/config";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { validateServerEnv } from "../src/lib/env.js";

// Vercel serverless entry point. Every request is routed here via
// vercel.json rewrites; the Express app handles routing internally.
//
// NOTE: serverless invocations are stateless and short-lived — in-memory
// caches, rate-limit counters and reusable Puppeteer browsers do NOT persist
// reliably between invocations.
//
// This file is intentionally thin. It previously imported the YouTube
// media-engine helpers (`../src/lib/youtube/ytdlp.js`), a folder that no
// longer exists after YouTube support was removed. The stale import made
// every cold start fail with ERR_MODULE_NOT_FOUND, which Vercel reported as
// FUNCTION_INVOCATION_FAILED (HTTP 500) on every route, including /api/health.
// Keep the entry point dependency-light and covered by `npm run typecheck`
// (tsconfig.api.json) so a missing module can never ship silently again.

// Cold-start env check (runs once per instance, never per request):
// variable names only, never values — misconfiguration is warned, never fatal.
const startupEnv = validateServerEnv();
for (const warning of startupEnv.warnings) {
  console.warn(`[env] ${warning}`);
}

const SITE_ORIGINS = ["https://www.downloadit.pro", "https://downloadit.pro"];

function allowOrigin(req: VercelRequest): string | null {
  const header = req.headers.origin;
  const origin = Array.isArray(header) ? header[0] : header;
  if (!origin) return null;
  const configured = (process.env.CORS_ORIGIN || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const allow = configured.length > 0 ? configured : SITE_ORIGINS;
  return allow.includes(origin) ? origin : null;
}

let appPromise: Promise<(req: VercelRequest, res: VercelResponse) => unknown> | null = null;

function loadApp(): Promise<(req: VercelRequest, res: VercelResponse) => unknown> {
  if (!appPromise) {
    appPromise = import("../src/app.js")
      .then((mod) => mod.default as (req: VercelRequest, res: VercelResponse) => unknown)
      .catch((error: unknown) => {
        appPromise = null;
        throw error;
      });
  }
  return appPromise;
}

async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const app = await loadApp();
    return app(req, res);
  } catch (error) {
    // Import-time failures (a missing module, a throw while loading the app)
    // used to kill the isolate before this function ran. Vercel then answered
    // with a text/plain FUNCTION_INVOCATION_FAILED page and no CORS header, so
    // the browser reported every platform as "Could not fetch media".
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code)
        : undefined;
    console.error("[serverless] failed to handle request", {
      name: error instanceof Error ? error.name : "Unknown",
      code,
      message: error instanceof Error ? error.message.slice(0, 300) : "unknown",
    });
    const origin = allowOrigin(req);
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: {
          code: "SERVICE_ERROR",
          message: "Service issue on our side. Please try again in a minute.",
        },
      });
    }
    return undefined;
  }
}

export default handler;
