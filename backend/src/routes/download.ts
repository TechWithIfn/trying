import { Router, Request, Response as ExpressResponse } from "express";
import { logger } from "../lib/logger.js";
import { AppError, createError, createErrorResponse, toMediaAppError } from "../lib/errors.js";
import { generateToken } from "../lib/crypto.js";
import { checkRateLimit, routeRateLimitConfig } from "../lib/rate-limit.js";
import { KeyedConcurrency, getGate } from "../lib/capacity.js";
import { readBoundedInt } from "../lib/env.js";
import {
  validateProxyUrl,
  getClientIp,
  fetchUpstreamMedia,
  fetchUpstreamMediaResilient,
  isHtmlContent,
  pipeUpstreamToClient,
  upstreamRetryAfterValue,
} from "../lib/media-proxy.js";
import { withoutEmbeddedByteSlice } from "../lib/providers/puppeteer.js";
import {
  sanitizeDownloadFilename,
  sanitizeFilenameBase,
  contentDispositionAttachment,
  extensionForContentType,
} from "../lib/download-filename.js";
import { buildZip, type ZipEntry } from "../lib/zip.js";

const MAX_DOWNLOAD_BYTES = 100 * 1024 * 1024;
const UPSTREAM_TIMEOUT_MS = 30_000;
/** Archive limits: bounded entries and total bytes keep a ZIP in memory-safe territory. */
const MAX_ZIP_ENTRIES = readBoundedInt("MAX_ZIP_ENTRIES", 20, 1, 50);
const MAX_ZIP_TOTAL_BYTES = readBoundedInt("MAX_ZIP_TOTAL_BYTES", 150 * 1024 * 1024, 1024 * 1024, 512 * 1024 * 1024);
const MAX_ZIP_FILE_BYTES = Math.min(MAX_ZIP_TOTAL_BYTES, 50 * 1024 * 1024);

/**
 * Downloads are long-lived and hold a socket plus a CDN connection for their
 * whole duration, so they get their own workload budget (separate from
 * streaming) plus a per-client cap: a single client cannot occupy every
 * download slot with parallel range-free connections.
 */
const downloadGate = getGate("download");
const perIpDownload = new KeyedConcurrency(readBoundedInt("MAX_CONCURRENT_DOWNLOADS_PER_IP", 2, 1, 16));

const router = Router();

router.get("/", async (req: Request, res: ExpressResponse): Promise<void> => {
  const requestId = generateToken();
  const routeStart = Date.now();
  const ip = getClientIp(req);

  // Client disconnect must cancel the upstream fetch/stream, not just stop
  // writing: otherwise a saturated download slot is held for a dead socket.
  // Listen on `res`, not `req` — `req` "close" fires as soon as a request body
  // is consumed, which is not a disconnect.
  const controller = new AbortController();
  const onClose = (): void => {
    if (!res.writableEnded) controller.abort();
  };
  res.on("close", onClose);

  if (!perIpDownload.tryAcquire(ip)) {
    res.off("close", onClose);
    logger.warn("[DOWNLOAD] per-client download limit reached", { requestId, ip });
    res.setHeader("Retry-After", "3");
    res.status(503).json(createErrorResponse("CAPACITY_EXHAUSTED"));
    return;
  }

  try {
    await downloadGate.run(
      () => handleDownload(req, res, requestId, routeStart, ip, controller.signal),
      { signal: controller.signal }
    );
  } catch (error) {
    if (res.headersSent) {
      res.destroy();
      return;
    }
    if (error instanceof AppError) {
      if (error.statusCode === 503) res.setHeader("Retry-After", "3");
      res.status(error.statusCode).json(error.toResponse());
      return;
    }
    const mapped = toMediaAppError(error);
    logger.error("[DOWNLOAD] proxy error", {
      requestId,
      errorCode: mapped.code,
      error: error instanceof Error ? error.message : "unknown",
    });
    res.status(mapped.statusCode).json(mapped.toResponse());
  } finally {
    res.off("close", onClose);
    perIpDownload.release(ip);
  }
});

/**
 * Read an upstream body fully into memory, refusing to exceed `maxBytes`.
 * A declared `Content-Length` over the cap is rejected before a single byte is
 * read; an unlabelled stream is capped while it is drained.
 */
async function readUpstreamBytes(response: Response, maxBytes: number): Promise<Buffer> {
  const declared = response.headers.get("content-length");
  if (declared && Number.parseInt(declared, 10) > maxBytes) {
    await response.body?.cancel().catch(() => {});
    throw createError("REQUEST_TOO_LARGE");
  }
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        throw createError("REQUEST_TOO_LARGE");
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock?.();
  }
  return Buffer.concat(chunks);
}

/** Unique, sanitized archive entry name for the Nth image. */
function zipEntryName(base: string, index: number, ext: string): string {
  const trimmed = base.slice(0, 80).replace(/[\s.\-]+$/, "") || "image";
  return `${trimmed}-${index}${ext}`;
}

/**
 * Multi-image download: fetch every image, package them into one ZIP and return
 * it as a single attachment. Every URL passes the same CDN/SSRF allowlist as a
 * normal download; ANY failure fails the whole request with an honest error
 * instead of silently shipping a partial archive.
 */
async function handleZipDownload(
  req: Request,
  res: ExpressResponse,
  requestId: string,
  signal: AbortSignal
): Promise<void> {
  try {
    res.setHeader("Cache-Control", "no-store");
    const rateLimitResult = checkRateLimit(`download:${getClientIp(req)}`, routeRateLimitConfig("download"));
    if (!rateLimitResult.allowed) {
      res.setHeader("Retry-After", String(Math.ceil(rateLimitResult.retryAfterMs / 1000)));
      res.status(429).json(createErrorResponse("RATE_LIMITED"));
      return;
    }

    const rawUrls = req.query.url;
    const urls = (Array.isArray(rawUrls) ? rawUrls : rawUrls ? [rawUrls] : []).filter(
      (u): u is string => typeof u === "string" && u.length > 0
    );
    // A ZIP of one is meaningless — that is a normal single download.
    if (urls.length < 2) {
      res.status(400).json(createErrorResponse("VALIDATION_ERROR"));
      return;
    }
    if (urls.length > MAX_ZIP_ENTRIES) {
      logger.warn("[DOWNLOAD] zip entry limit exceeded", { requestId, count: urls.length, limit: MAX_ZIP_ENTRIES });
      res.status(400).json(createErrorResponse("VALIDATION_ERROR"));
      return;
    }

    const base = sanitizeFilenameBase(req.query.filename);
    const entries: ZipEntry[] = [];
    let totalBytes = 0;

    for (const raw of urls) {
      const validation = validateProxyUrl(raw);
      if (!validation.ok) {
        logger.info("[DOWNLOAD] zip URL validation failed", { requestId, error: validation.error });
        const code = validation.error === "MISSING" ? "VALIDATION_ERROR" : "INVALID_URL";
        res
          .status(validation.error === "DISALLOWED_HOST" || validation.error === "PRIVATE_HOST" ? 403 : 400)
          .json(createErrorResponse(code));
        return;
      }
      const fullUrl = withoutEmbeddedByteSlice(validation.value.url);
      const upstream = await fetchUpstreamMedia(fullUrl, {
        timeoutMs: UPSTREAM_TIMEOUT_MS,
        tag: "DOWNLOAD-ZIP",
        requestId,
        signal,
      });
      if (upstream.kind === "timeout") {
        res.status(504).json(createErrorResponse("PROVIDER_TIMEOUT"));
        return;
      }
      if (upstream.kind === "client-gone") {
        return;
      }
      if (upstream.kind !== "ok") {
        res.status(502).json(createErrorResponse("MEDIA_DOWNLOAD_FAILED"));
        return;
      }
      const { response, finalUrl } = upstream;
      if (response.status === 401 || response.status === 403 || response.status === 404) {
        await response.body?.cancel().catch(() => {});
        const expired = createError("MEDIA_URL_EXPIRED");
        res.status(expired.statusCode).json(expired.toResponse());
        return;
      }
      if (!response.ok) {
        await response.body?.cancel().catch(() => {});
        res.status(502).json(createErrorResponse("MEDIA_DOWNLOAD_FAILED"));
        return;
      }
      const ct = (response.headers.get("content-type") || "").toLowerCase();
      if (isHtmlContent(ct) || !ct.startsWith("image/")) {
        await response.body?.cancel().catch(() => {});
        logger.warn("[DOWNLOAD] zip rejected non-image media", {
          requestId,
          contentType: ct,
          finalHost: new URL(finalUrl).hostname,
        });
        res.status(502).json(createErrorResponse("CONTENT_UNAVAILABLE"));
        return;
      }
      const bytes = await readUpstreamBytes(response, MAX_ZIP_FILE_BYTES);
      totalBytes += bytes.length;
      if (totalBytes > MAX_ZIP_TOTAL_BYTES) {
        logger.warn("[DOWNLOAD] zip exceeds total size limit", { requestId, totalBytes });
        res.status(413).json(createErrorResponse("REQUEST_TOO_LARGE"));
        return;
      }
      entries.push({ name: zipEntryName(base, entries.length + 1, extensionForContentType(ct)), data: bytes });
    }

    const zip = buildZip(entries);
    logger.info("[DOWNLOAD] zip built", { requestId, entries: entries.length, bytes: zip.length });
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", contentDispositionAttachment(`${base}.zip`));
    res.setHeader("Content-Length", String(zip.length));
    res.setHeader("X-Request-Id", requestId);
    res.status(200).end(zip);
  } catch (error) {
    if (res.headersSent) {
      res.destroy();
      return;
    }
    if (error instanceof AppError) {
      res.status(error.statusCode).json(error.toResponse());
      return;
    }
    const mapped = toMediaAppError(error);
    logger.error("[DOWNLOAD] zip error", {
      requestId,
      errorCode: mapped.code,
      error: error instanceof Error ? error.message : "unknown",
    });
    res.status(mapped.statusCode).json(mapped.toResponse());
  }
}

router.get("/zip", async (req: Request, res: ExpressResponse): Promise<void> => {
  const requestId = generateToken();
  const ip = getClientIp(req);
  const controller = new AbortController();
  const onClose = (): void => {
    if (!res.writableEnded) controller.abort();
  };
  res.on("close", onClose);

  if (!perIpDownload.tryAcquire(ip)) {
    res.off("close", onClose);
    logger.warn("[DOWNLOAD] per-client download limit reached (zip)", { requestId, ip });
    res.setHeader("Retry-After", "3");
    res.status(503).json(createErrorResponse("CAPACITY_EXHAUSTED"));
    return;
  }

  try {
    await downloadGate.run(() => handleZipDownload(req, res, requestId, controller.signal), {
      signal: controller.signal,
    });
  } catch (error) {
    if (res.headersSent) {
      res.destroy();
      return;
    }
    if (error instanceof AppError) {
      if (error.statusCode === 503) res.setHeader("Retry-After", "3");
      res.status(error.statusCode).json(error.toResponse());
      return;
    }
    const mapped = toMediaAppError(error);
    logger.error("[DOWNLOAD] zip proxy error", {
      requestId,
      errorCode: mapped.code,
      error: error instanceof Error ? error.message : "unknown",
    });
    res.status(mapped.statusCode).json(mapped.toResponse());
  } finally {
    res.off("close", onClose);
    perIpDownload.release(ip);
  }
});

async function handleDownload(
  req: Request,
  res: ExpressResponse,
  requestId: string,
  routeStart: number,
  ip: string,
  signal: AbortSignal
): Promise<void> {
  try {
    logger.info("[DOWNLOAD] requested", { requestId, ip });
    // Download responses (and their errors) are per-request: never
    // cacheable, on every outcome.
    res.setHeader("Cache-Control", "no-store");

    const rateLimitResult = checkRateLimit(`download:${ip}`, routeRateLimitConfig("download"));
    if (!rateLimitResult.allowed) {
      logger.warn("[DOWNLOAD] rate limit exceeded", { requestId, ip });
      res.setHeader("Retry-After", String(Math.ceil(rateLimitResult.retryAfterMs / 1000)));
      res.status(429).json(createErrorResponse("RATE_LIMITED"));
      return;
    }

    const validation = validateProxyUrl(req.query.url);
    if (!validation.ok) {
      logger.info("[DOWNLOAD] URL validation failed", { requestId, error: validation.error });
      const code = validation.error === "MISSING" ? "VALIDATION_ERROR" : "INVALID_URL";
      res.status(validation.error === "DISALLOWED_HOST" || validation.error === "PRIVATE_HOST" ? 403 : 400).json(
        createErrorResponse(code)
      );
      return;
    }

    logger.info("[DOWNLOAD] validated URL", { requestId, hostname: validation.value.hostname });

    // A download always wants the FULL object. Instagram CDN URLs may carry
    // an embedded bytestart/byteend slice window (a fragment the edge serves
    // instead of the file); fetching it verbatim would save a truncated file
    // with HTTP 200. Only the two window params are removed — every other
    // signed param is preserved byte-identically — and URLs without a window
    // pass through untouched. Expiry recovery below still applies.
    const fullObjectUrl = withoutEmbeddedByteSlice(validation.value.url);
    // Use the already-resolved media URL directly. On expired/invalid CDN
    // URLs the helper re-resolves once from `source` (when supplied) and
    // retries against the fresh URL — never a blind Puppeteer relaunch.
    const upstreamStart = Date.now();
    const { status: upstream, refreshed } = await fetchUpstreamMediaResilient(fullObjectUrl, {
      timeoutMs: UPSTREAM_TIMEOUT_MS,
      tag: "DOWNLOAD",
      requestId,
      sourceUrl: req.query.source,
      signal,
    });
    if (refreshed) {
      logger.info("[DOWNLOAD] serving from refreshed media URL", { requestId });
    }

    if (upstream.kind === "timeout") {
      res.status(504).json(createErrorResponse("PROVIDER_TIMEOUT"));
      return;
    }
    if (upstream.kind === "client-gone") {
      logger.info("[DOWNLOAD] client gone before stream", { requestId });
      return;
    }
    if (upstream.kind === "bad-redirect" || upstream.kind === "network-error") {
      res.status(502).json(createErrorResponse("MEDIA_DOWNLOAD_FAILED"));
      return;
    }

    const { response, finalUrl } = upstream;
    const firstByteMs = Date.now() - upstreamStart;
    logger.info("[DOWNLOAD] upstream status", {
      requestId,
      status: response.status,
      validationMs: upstreamStart - routeStart,
      firstByteMs,
      finalHost: new URL(finalUrl).hostname,
    });

    if (response.status === 401 || response.status === 403 || response.status === 404) {
      await response.body?.cancel().catch(() => {});
      logger.warn("[DOWNLOAD] upstream reports expired/missing media", {
        requestId,
        status: response.status,
      });
      const expired = createError("MEDIA_URL_EXPIRED");
      res.status(expired.statusCode).json(expired.toResponse());
      return;
    }

    if (response.status === 429) {
      await response.body?.cancel().catch(() => {});
      res.setHeader("Retry-After", upstreamRetryAfterValue(response));
      res.status(429).json(createErrorResponse("PROVIDER_RATE_LIMITED"));
      return;
    }

    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      logger.warn("[DOWNLOAD] upstream error status", { requestId, status: response.status });
      res.status(502).json(createErrorResponse("MEDIA_DOWNLOAD_FAILED"));
      return;
    }

    const upstreamCT = response.headers.get("content-type") || "";
    logger.info("[DOWNLOAD] upstream content-type", { requestId, contentType: upstreamCT });

    if (isHtmlContent(upstreamCT)) {
      await response.body?.cancel().catch(() => {});
      logger.warn("[DOWNLOAD] rejected HTML masquerading as media", { requestId });
      const expired = createError("MEDIA_URL_EXPIRED");
      res.status(expired.statusCode).json(expired.toResponse());
      return;
    }

    const isMediaCT =
      upstreamCT.includes("video") ||
      upstreamCT.includes("image") ||
      upstreamCT.includes("audio") ||
      upstreamCT.includes("octet-stream");
    if (upstreamCT && !isMediaCT) {
      await response.body?.cancel().catch(() => {});
      logger.warn("[DOWNLOAD] rejected unexpected content type", { requestId, contentType: upstreamCT });
      res.status(502).json(createErrorResponse("CONTENT_UNAVAILABLE"));
      return;
    }

    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_DOWNLOAD_BYTES) {
      await response.body?.cancel().catch(() => {});
      logger.warn("[DOWNLOAD] exceeds size limit", { requestId, contentLength });
      res.status(413).json(createErrorResponse("REQUEST_TOO_LARGE"));
      return;
    }

    const filename = sanitizeDownloadFilename(req.query.filename, upstreamCT);
    const isVideo =
      upstreamCT.includes("video") ||
      (!upstreamCT.includes("image") && !upstreamCT.includes("audio"));

    res.setHeader("Content-Type", isVideo ? "video/mp4" : upstreamCT || "application/octet-stream");
    res.setHeader("Content-Disposition", contentDispositionAttachment(filename));
    if (contentLength) {
      res.setHeader("Content-Length", contentLength);
    }
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Request-Id", requestId);

    if (!response.body) {
      logger.warn("[DOWNLOAD] empty upstream body", { requestId });
      res.status(502).json(createErrorResponse("CONTENT_UNAVAILABLE"));
      return;
    }

    logger.info("[DOWNLOAD] stream started", { requestId, filename });
    const result = await pipeUpstreamToClient(
      req,
      res,
      response.body,
      MAX_DOWNLOAD_BYTES,
      "DOWNLOAD",
      requestId,
      signal
    );
    logger.info("[DOWNLOAD] stream completed", {
      requestId,
      completed: result.completed,
      bytes: result.bytes,
    });
  } catch (error) {
    const mapped = toMediaAppError(error);
    logger.error("[DOWNLOAD] proxy error", {
      requestId,
      errorCode: mapped.code,
      error: error instanceof Error ? error.message : "unknown",
    });
    if (!res.headersSent) {
      res.status(mapped.statusCode).json(mapped.toResponse());
    } else {
      res.destroy();
    }
  }
}

export default router;
