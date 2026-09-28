import "dotenv/config";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import app from "../src/app.js";
import { validateServerEnv } from "../src/lib/env.js";

// Vercel serverless entry point. Every request is routed here via
// vercel.json rewrites; the Express app handles routing internally.
// NOTE: serverless invocations are stateless and short-lived — in-memory
// caches, rate-limit counters and reusable Puppeteer browsers do NOT
// persist reliably between invocations (see report for implications).

// Cold-start env check (runs once per instance, never per request):
// variable names only, never values — misconfiguration is warned, never fatal.
const startupEnv = validateServerEnv();
for (const warning of startupEnv.warnings) {
  console.warn(`[env] ${warning}`);
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  return (app as unknown as (req: unknown, res: unknown) => unknown)(req, res);
}
