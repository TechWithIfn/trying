import { Router, Request, Response as ExpressResponse } from "express";
import { logger } from "../lib/logger.js";
import { AppError, createError, createErrorResponse, toMediaAppError } from "../lib/errors.js";
import { generateToken } from "../lib/crypto.js";
import { checkRateLimit, routeRateLimitConfig } from "../lib/rate-limit.js";
import { KeyedConcurrency, getGate } from "../lib/capacity.js";
import { readBoundedInt } from "../lib/env.js";
import {
  validateProxyUrl,
  type ValidatedUrl,
  getClientIp,
  fetchUpstreamMediaResilient,
  isHtmlContent,
  pipeUpstreamToClient,
  upstreamRetryAfterValue,
} from "../lib/media-proxy.js";

const MAX_STREAM_BYTES = 200 * 1024 * 1024;
const UPSTREAM_TIMEOUT_MS = 30_000;

/**
 * Streaming has its own budget, independent of downloads: a video player
 * holds a connection for a long time and browsers often open several range
 * requests for one video, so a low per-IP cap plus a dedicated global gate is
 * what keeps playback from starving everything else.
 */
const streamGate = getGate("stream");
const perIpStream = new KeyedConcurrency(readBoundedInt("MAX_CONCURRENT_STREAMS_PER_IP", 3, 1, 16));

/**
 * Instagram CDN URLs carry their own embedded slice window in `bytestart` /
 * `byteend`. Those params are part of the signed URL, so they are preserved
 * verbatim on the first request. But the edge also uses them to decide WHAT to
 * return: when they are present it can answer with that embedded slice instead
 * of the range the caller asked for.
 *
 * Returns the URL with ONLY those two params removed (every other signed param
 * — `oh`, `oe`, `_nc_*`, `efg` — is preserved byte-identically), or null when
 * the URL has no embedded slice or the two params are inconsistent.
 */
function withoutEmbeddedSlice(rawUrl: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }
  const bytestartRaw = parsed.searchParams.get("bytestart");
  const byteendRaw = parsed.searchParams.get("byteend");
  if (bytestartRaw === null || byteendRaw === null) return null;
  const bytestart = parseInt(bytestartRaw, 10);
  const byteend = parseInt(byteendRaw, 10);
  if (!Number.isSafeInteger(bytestart) || !Number.isSafeInteger(byteend) || byteend < bytestart) {
    return null;
  }
  parsed.searchParams.delete("bytestart");
  parsed.searchParams.delete("byteend");
  return parsed.toString();
}

/**
 * Detect the "200 that is really an embedded slice" case.
 *
 * The production failure: Instagram's edge answers a Range request with HTTP
 * 200, NO `Content-Range`, and a body of only `byteend - bytestart + 1` bytes
 * (observed: 104 bytes for `bytestart=824&byteend=927`, and a 56-byte `sidx`
 * box for other renditions). A 200 with no Content-Range looks like the full
 * object, so the normal full-fetch path slices those few mid-file bytes and
 * answers a lying `Content-Range: bytes 0-N/104`. The <video> element receives
 * unusable data, `loadedmetadata`/`canplay` never fire, and the UI reports
 * "Preview unavailable".
 *
 * A full object is far larger than a slice window, and it advertises its real
 * size. So: a 200 without Content-Range whose Content-Length matches the
 * embedded slice length exactly is a slice, not the object.
 */
function isEmbeddedSliceAsFullObject(
  contentLengthHeader: string | null,
  embeddedStart: number,
  embeddedEnd: number
): boolean {
  if (!contentLengthHeader) return false;
  const advertised = parseInt(contentLengthHeader, 10);
  if (!Number.isSafeInteger(advertised) || advertised <= 0) return false;
  return advertised === embeddedEnd - embeddedStart + 1;
}

interface ParsedRange {
  start: number;
  end: number | null;
}

function parseRangeHeader(header: string | undefined): ParsedRange | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;
  const [, startStr, endStr] = match;
  if (startStr === "" && endStr === "") return null;
  if (startStr === "") return null; // suffix ranges need total size; let upstream handle via forward
  const start = parseInt(startStr, 10);
  if (isNaN(start) || start < 0) return null;
  const end = endStr === "" ? null : parseInt(endStr, 10);
  if (end !== null && (isNaN(end) || end < start)) return null;
  return { start, end };
}

interface UpstreamRange {
  start: number;
  end: number;
  total: number | null;
}

/**
 * Parse an upstream `Content-Range` (`bytes 0-1023/1234567`, `bytes 0-1023/*`).
 * Null when absent or malformed: a 206 without a parseable range can never
 * be trusted to satisfy the browser.
 */
function parseContentRange(header: string | null | undefined): UpstreamRange | null {
  if (!header) return null;
  const match = /^bytes\s+(\d+)-(\d+)\/(\d+|\*)$/.exec(header.trim());
  if (!match) return null;
  const start = parseInt(match[1], 10);
  const end = parseInt(match[2], 10);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || end < start) return null;
  const total = match[3] === "*" ? null : parseInt(match[3], 10);
  if (total !== null && (!Number.isSafeInteger(total) || total <= 0 || end >= total)) return null;
  return { start, end, total };
}

/**
 * True only when the upstream 206 actually answers the browser's Range
 * request. The browser's HTTP Range header is the authority here — never the
 * Instagram CDN URL's embedded bytestart/byteend slice (those query params
 * are part of the signed URL and are preserved verbatim, but they must not
 * be mistaken for the browser's range). A suffix/unknown Range form (which
 * parseRangeHeader declines) was forwarded verbatim upstream, so a
 * well-formed upstream range is accepted as its answer.
 */
function upstreamSatisfiesBrowser(
  upstream: UpstreamRange | null,
  rawRange: string | undefined,
  clientRange: ParsedRange | null
): boolean {
  if (!upstream) return false;
  if (!rawRange) return false; // unsolicited 206: the browser expected 200
  if (!clientRange) return true; // suffix form, answered verbatim upstream
  if (upstream.start > clientRange.start) return false;
  if (clientRange.end !== null && upstream.end < clientRange.end) return false;
  return true;
}

function looksLikeMediaBytes(firstBytes: Uint8Array): boolean {
  if (firstBytes.length < 8) return true;
  const text = new TextDecoder("ascii", { fatal: false }).decode(firstBytes.slice(0, 64));
  if (text.includes("<!DOCTYPE") || text.includes("<html") || text.includes("<HTML")) return false;
  if (text.includes("<?xml")) return false;
  if (text.startsWith("{") && (text.includes("login") || text.includes("error") || text.includes("requireLogin"))) return false;
  for (let i = 0; i <= firstBytes.length - 4; i++) {
    if (firstBytes[i] === 0x66 && firstBytes[i + 1] === 0x74 && firstBytes[i + 2] === 0x79 && firstBytes[i + 3] === 0x70) return true;
  }
  if (firstBytes[0] === 0xFF && firstBytes[1] === 0xD8) return true;
  if (firstBytes[0] === 0x89 && firstBytes[1] === 0x50 && firstBytes[2] === 0x4E && firstBytes[3] === 0x47) return true;
  return false;
}

async function pipeWithValidation(
  req: Request,
  res: ExpressResponse,
  body: ReadableStream<Uint8Array>,
  maxBytes: number,
  tag: string,
  requestId: string,
  signal?: AbortSignal
): Promise<{ completed: boolean; bytes: number }> {
  const reader = body.getReader();
  let totalBytes = 0;
  let finished = false;
  let clientGone = false;
  let validated = false;
  const HEADROOM = 128;
  const firstChunk: Uint8Array[] = [];
  let headroomBytes = 0;

  const stop = (): void => {
    if (finished) return;
    clientGone = true;
    reader.cancel().catch(() => {});
  };
  const onClientClose = () => {
    if (!finished) {
      clientGone = true;
      reader.cancel().catch(() => {});
      logger.warn(`[${tag}] client disconnected mid-stream`, { requestId, bytes: totalBytes });
    }
  };
  req.on("close", onClientClose);
  const onExternalAbort = () => {
    if (!finished) {
      logger.warn(`[${tag}] aborted mid-stream`, { requestId, bytes: totalBytes });
      stop();
      if (!res.writableEnded) res.destroy();
    }
  };
  if (signal) {
    if (signal.aborted) {
      req.off("close", onClientClose);
      await reader.cancel().catch(() => {});
      return { completed: false, bytes: 0 };
    }
    signal.addEventListener("abort", onExternalAbort, { once: true });
  }

  try {
    while (true) {
      if (clientGone) {
        return { completed: false, bytes: totalBytes };
      }
      const { done, value } = await reader.read();
      if (done) {
        finished = true;
        res.end();
        return { completed: true, bytes: totalBytes };
      }
      totalBytes += value.length;
      if (totalBytes > maxBytes) {
        finished = true;
        await reader.cancel().catch(() => {});
        res.destroy();
        logger.warn(`[${tag}] exceeded size limit mid-stream`, { requestId, bytes: totalBytes });
        return { completed: false, bytes: totalBytes };
      }
      if (!validated) {
        firstChunk.push(value);
        headroomBytes += value.length;
        if (headroomBytes >= HEADROOM) {
          const combined = new Uint8Array(headroomBytes);
          let offset = 0;
          for (const chunk of firstChunk) {
            combined.set(chunk, offset);
            offset += chunk.length;
          }
          if (!looksLikeMediaBytes(combined)) {
            finished = true;
            await reader.cancel().catch(() => {});
            logger.warn(`[${tag}] upstream returned non-media content`, { requestId });
            const err = createError("MEDIA_URL_EXPIRED");
            res.status(err.statusCode).json(err.toResponse());
            return { completed: false, bytes: totalBytes };
          }
          validated = true;
          for (const chunk of firstChunk) {
            try {
              const canContinue = res.write(chunk);
              if (!canContinue) {
                await new Promise<void>((resolve) => res.once("drain", () => resolve()));
              }
            } catch {
              finished = true;
              await reader.cancel().catch(() => {});
              return { completed: false, bytes: totalBytes };
            }
          }
          firstChunk.length = 0;
        }
        continue;
      }
      try {
        const canContinue = res.write(value);
        if (!canContinue) {
          await new Promise<void>((resolve) => res.once("drain", () => resolve()));
        }
      } catch {
        finished = true;
        await reader.cancel().catch(() => {});
        return { completed: false, bytes: totalBytes };
      }
    }
  } finally {
    req.off("close", onClientClose);
    signal?.removeEventListener("abort", onExternalAbort);
  }
}

async function pipeRangeSlice(
  req: Request,
  res: ExpressResponse,
  body: ReadableStream<Uint8Array>,
  start: number,
  end: number | null,
  tag: string,
  requestId: string,
  signal?: AbortSignal
): Promise<number> {
  const reader = body.getReader();
  let skipped = 0;
  let sent = 0;
  let finished = false;
  let clientGone = false;
  const onClientClose = () => {
    if (!finished) {
      clientGone = true;
      reader.cancel().catch(() => {});
    }
  };
  const onExternalAbort = () => {
    if (!finished) {
      clientGone = true;
      reader.cancel().catch(() => {});
      if (!res.writableEnded) res.destroy();
    }
  };
  req.on("close", onClientClose);
  if (signal) {
    if (signal.aborted) {
      req.off("close", onClientClose);
      await reader.cancel().catch(() => {});
      return 0;
    }
    signal.addEventListener("abort", onExternalAbort, { once: true });
  }
  try {
    while (true) {
      if (clientGone) return sent;
      const { done, value } = await reader.read();
      if (done) {
        finished = true;
        res.end();
        return sent;
      }
      let chunk = value;
      if (skipped < start) {
        const skipNow = Math.min(chunk.length, start - skipped);
        skipped += skipNow;
        chunk = chunk.slice(skipNow);
        if (chunk.length === 0) continue;
      }
      if (end !== null) {
        const remaining = end - start + 1 - sent;
        if (remaining <= 0) {
          finished = true;
          await reader.cancel().catch(() => {});
          res.end();
          return sent;
        }
        if (chunk.length > remaining) {
          chunk = chunk.slice(0, remaining);
        }
      }
      sent += chunk.length;
      if (sent > MAX_STREAM_BYTES) {
        finished = true;
        await reader.cancel().catch(() => {});
        res.destroy();
        logger.warn(`[${tag}] range slice exceeded size limit`, { requestId });
        return sent;
      }
      try {
        const canContinue = res.write(chunk);
        if (!canContinue) {
          await new Promise<void>((resolve) => res.once("drain", () => resolve()));
        }
      } catch {
        finished = true;
        await reader.cancel().catch(() => {});
        return sent;
      }
      if (end !== null && sent >= end - start + 1) {
        finished = true;
        await reader.cancel().catch(() => {});
        res.end();
        return sent;
      }
    }
  } finally {
    req.off("close", onClientClose);
    signal?.removeEventListener("abort", onExternalAbort);
  }
}

const router = Router();

/**
 * TEMPORARY Reel video diagnostic (MEDIA_DIAG=1): one line per completed
 * stream describing what the client actually received. Contains only status,
 * mode, content type and byte counts — never the media URL, so no signed CDN
 * query string can leak into logs.
 */
function logStreamDiag(
  requestId: string,
  info: { status: number; mode: string; contentType: string; bytes: number }
): void {
  if (process.env.MEDIA_DIAG !== "1") return;
  logger.info("[STREAM] [media-diag] completed", {
    requestId,
    streamStatus: info.status,
    mode: info.mode,
    contentType: info.contentType,
    bytes: info.bytes,
  });
}

async function serveStream(req: Request, res: ExpressResponse): Promise<void> {
  const requestId = generateToken();
  const ip = getClientIp(req);

  const controller = new AbortController();
  const onClose = (): void => {
    if (!res.writableEnded) controller.abort();
  };
  res.on("close", onClose);

  if (!perIpStream.tryAcquire(ip)) {
    res.off("close", onClose);
    logger.warn("[STREAM] per-client stream limit reached", { requestId, ip });
    res.setHeader("Retry-After", "3");
    res.status(503).json(createErrorResponse("CAPACITY_EXHAUSTED"));
    return;
  }

  try {
    await streamGate.run(() => handleStream(req, res, requestId, ip, controller.signal), {
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
    logger.error("[STREAM] proxy error", {
      requestId,
      errorCode: mapped.code,
      error: error instanceof Error ? error.message : "unknown",
    });
    res.status(mapped.statusCode).json(mapped.toResponse());
  } finally {
    res.off("close", onClose);
    perIpStream.release(ip);
  }
}

router.get("/", serveStream);
// HEAD uses the same pipeline (same validation, rate limit and budget);
// handleStream answers it with headers only and no body.
router.head("/", serveStream);

/**
 * Explicit HEAD support: some clients probe headers before streaming. A
 * single 1-byte upstream range reveals the total object size (via its
 * Content-Range) without ever downloading media; the byte is discarded and
 * only headers are answered. Never sends a body.
 */
async function handleHead(
  req: Request,
  res: ExpressResponse,
  requestId: string,
  validation: ValidatedUrl,
  signal: AbortSignal
): Promise<void> {
  const probe = await fetchUpstreamMediaResilient(validation.url, {
    timeoutMs: UPSTREAM_TIMEOUT_MS,
    rangeHeader: "bytes=0-0",
    tag: "STREAM",
    requestId,
    sourceUrl: req.query.source,
    signal,
  });
  if (probe.status.kind === "timeout") {
    res.status(504).json(createErrorResponse("PROVIDER_TIMEOUT"));
    return;
  }
  if (probe.status.kind === "client-gone") {
    return;
  }
  if (probe.status.kind === "bad-redirect" || probe.status.kind === "network-error") {
    res.status(502).json(createErrorResponse("MEDIA_DOWNLOAD_FAILED"));
    return;
  }
  const upstream = probe.status.response;
  if (upstream.status === 401 || upstream.status === 403 || upstream.status === 404) {
    await upstream.body?.cancel().catch(() => {});
    const expired = createError("MEDIA_URL_EXPIRED");
    res.status(expired.statusCode).json(expired.toResponse());
    return;
  }
  const upstreamCT = upstream.headers.get("content-type") || "";
  const isVideo = upstreamCT.includes("video") || validation.url.includes(".mp4");
  res.setHeader("Content-Type", isVideo ? "video/mp4" : upstreamCT || "application/octet-stream");
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Request-Id", requestId);
  if (upstream.status === 206) {
    const upRange = parseContentRange(upstream.headers.get("content-range"));
    await upstream.body?.cancel().catch(() => {});
    if (upRange?.total) res.setHeader("Content-Length", String(upRange.total));
    res.status(200).end();
    return;
  }
  if (upstream.status === 200) {
    // Same embedded-slice trap as GET: the edge can answer the 1-byte probe
    // with 200 + the slice length, which would advertise a 56/104-byte
    // "video" to the client. Re-probe without the embedded window so the
    // reported Content-Length is the real object size.
    const declaredLength = upstream.headers.get("content-length");
    const startRaw = new URL(validation.url).searchParams.get("bytestart");
    const endRaw = new URL(validation.url).searchParams.get("byteend");
    const embeddedStart = startRaw === null ? NaN : parseInt(startRaw, 10);
    const embeddedEnd = endRaw === null ? NaN : parseInt(endRaw, 10);
    await upstream.body?.cancel().catch(() => {});
    if (isEmbeddedSliceAsFullObject(declaredLength, embeddedStart, embeddedEnd)) {
      const embedded = withoutEmbeddedSlice(validation.url);
      logger.info("[STREAM] HEAD probe hit embedded slice, re-probing full object", {
        requestId,
        embeddedStart,
        embeddedEnd,
      });
      if (embedded) {
        const retry = await fetchUpstreamMediaResilient(embedded, {
          timeoutMs: UPSTREAM_TIMEOUT_MS,
          rangeHeader: "bytes=0-0",
          tag: "STREAM",
          requestId,
          sourceUrl: req.query.source,
          signal,
        });
        if (retry.status.kind === "ok") {
          const retryRes = retry.status.response;
          if (retryRes.status === 206) {
            const retryRange = parseContentRange(retryRes.headers.get("content-range"));
            await retryRes.body?.cancel().catch(() => {});
            if (retryRange?.total) res.setHeader("Content-Length", String(retryRange.total));
            res.status(200).end();
            return;
          }
          if (retryRes.status === 200) {
            const retryLength = retryRes.headers.get("content-length");
            await retryRes.body?.cancel().catch(() => {});
            if (retryLength) res.setHeader("Content-Length", retryLength);
            res.status(200).end();
            return;
          }
          await retryRes.body?.cancel().catch(() => {});
        }
      }
      res.status(502).json(createErrorResponse("MEDIA_DOWNLOAD_FAILED"));
      return;
    }
    if (declaredLength) res.setHeader("Content-Length", declaredLength);
    res.status(200).end();
    return;
  }
  await upstream.body?.cancel().catch(() => {});
  res.status(502).json(createErrorResponse("MEDIA_DOWNLOAD_FAILED"));
}

async function handleStream(
  req: Request,
  res: ExpressResponse,
  requestId: string,
  ip: string,
  signal: AbortSignal
): Promise<void> {
  try {
    logger.info("[STREAM] requested", { requestId, ip });

    const rateLimitResult = checkRateLimit(`stream:${ip}`, routeRateLimitConfig("stream"));
    if (!rateLimitResult.allowed) {
      logger.warn("[STREAM] rate limit exceeded", { requestId, ip });
      res.setHeader("Retry-After", String(Math.ceil(rateLimitResult.retryAfterMs / 1000)));
      res.status(429).json(createErrorResponse("RATE_LIMITED"));
      return;
    }

    const validation = validateProxyUrl(req.query.url);
    if (!validation.ok) {
      logger.info("[STREAM] URL validation failed", { requestId, error: validation.error });
      res.status(validation.error === "DISALLOWED_HOST" || validation.error === "PRIVATE_HOST" ? 403 : 400).json(
        createErrorResponse(validation.error === "MISSING" ? "VALIDATION_ERROR" : "INVALID_URL")
      );
      return;
    }

    // Header-only probe: no body is ever streamed for HEAD.
    if (req.method === "HEAD") {
      await handleHead(req, res, requestId, validation.value, signal);
      return;
    }

    const clientRange = parseRangeHeader(req.headers.range);

    const upstreamStart = Date.now();
    // Resilient fetch: on expired/invalid CDN URLs the helper re-resolves
    // once from `source` (when supplied) and retries against the fresh URL.
    const { status: upstream, refreshed } = await fetchUpstreamMediaResilient(validation.value.url, {
      timeoutMs: UPSTREAM_TIMEOUT_MS,
      rangeHeader: req.headers.range,
      tag: "STREAM",
      requestId,
      sourceUrl: req.query.source,
      signal,
    });
    if (refreshed) {
      logger.info("[STREAM] serving from refreshed media URL", { requestId });
    }

    if (upstream.kind === "timeout") {
      res.status(504).json(createErrorResponse("PROVIDER_TIMEOUT"));
      return;
    }
    if (upstream.kind === "client-gone") {
      logger.info("[STREAM] client gone before stream", { requestId });
      return;
    }
    if (upstream.kind === "bad-redirect" || upstream.kind === "network-error") {
      res.status(502).json(createErrorResponse("MEDIA_DOWNLOAD_FAILED"));
      return;
    }

    const { finalUrl } = upstream;
    // Reassignable: on an upstream range mismatch (below) the sliced 206 is
    // discarded and the full object is fetched instead.
    let response = upstream.response;
    const firstByteMs = Date.now() - upstreamStart;
    logger.info("[STREAM] upstream status", {
      requestId,
      status: response.status,
      firstByteMs,
      finalHost: new URL(finalUrl).hostname,
    });

    if (response.status === 401 || response.status === 403 || response.status === 404) {
      await response.body?.cancel().catch(() => {});
      logger.warn("[STREAM] upstream reports expired/missing media", {
        requestId,
        status: response.status,
      });
      const expired = createError("MEDIA_URL_EXPIRED");
      res.status(expired.statusCode).json(expired.toResponse());
      return;
    }

    if (response.status === 416) {
      await response.body?.cancel().catch(() => {});
      res.status(416).setHeader("Accept-Ranges", "bytes").json(createErrorResponse("CONTENT_UNAVAILABLE"));
      return;
    }

    // Genuine upstream throttling is reported honestly (with the backoff the
    // CDN asked for) instead of being flattened into a download failure.
    if (response.status === 429) {
      await response.body?.cancel().catch(() => {});
      res.setHeader("Retry-After", upstreamRetryAfterValue(response));
      logger.warn("[STREAM] upstream rate limited", { requestId });
      res.status(429).json(createErrorResponse("PROVIDER_RATE_LIMITED"));
      return;
    }

    if (response.status !== 200 && response.status !== 206) {
      await response.body?.cancel().catch(() => {});
      logger.warn("[STREAM] upstream error status", { requestId, status: response.status });
      res.status(502).json(createErrorResponse("MEDIA_DOWNLOAD_FAILED"));
      return;
    }

    const upstreamCT = response.headers.get("content-type") || "";
    logger.info("[STREAM] upstream content-type", { requestId, contentType: upstreamCT });

    if (isHtmlContent(upstreamCT)) {
      await response.body?.cancel().catch(() => {});
      logger.warn("[STREAM] rejected HTML masquerading as media", { requestId });
      const expired = createError("MEDIA_URL_EXPIRED");
      res.status(expired.statusCode).json(expired.toResponse());
      return;
    }

    const isVideo = upstreamCT.includes("video") || validation.value.url.includes(".mp4");
    let contentType = isVideo ? "video/mp4" : upstreamCT || "application/octet-stream";

    if (!response.body) {
      logger.warn("[STREAM] empty upstream body", { requestId });
      res.status(502).json(createErrorResponse("CONTENT_UNAVAILABLE"));
      return;
    }

    res.setHeader("Content-Type", contentType);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Request-Id", requestId);

    // Case 0: upstream answered 200 WITHOUT Content-Range, but the body is
    // exactly the length of the URL's embedded bytestart/byteend window — the
    // edge served that slice while claiming to be the full object. Slicing it
    // (Case 2) or forwarding it (Case 3) would answer a lying Content-Range and
    // feed the <video> element mid-file bytes, so `loadedmetadata`/`canplay`
    // never fire. Re-request the same signed asset with ONLY the embedded
    // window removed so the edge honors the browser's real Range.
    if (response.status === 200) {
      const embedded = withoutEmbeddedSlice(validation.value.url);
      if (embedded) {
        const startRaw = new URL(validation.value.url).searchParams.get("bytestart");
        const endRaw = new URL(validation.value.url).searchParams.get("byteend");
        const embeddedStart = startRaw === null ? NaN : parseInt(startRaw, 10);
        const embeddedEnd = endRaw === null ? NaN : parseInt(endRaw, 10);
        if (
          isEmbeddedSliceAsFullObject(
            response.headers.get("content-length"),
            embeddedStart,
            embeddedEnd
          )
        ) {
          await response.body?.cancel().catch(() => {});
          logger.info("[STREAM] upstream 200 is an embedded slice, refetching full object", {
            requestId,
            embeddedStart,
            embeddedEnd,
            rangeRequested: req.headers.range ?? null,
          });
          const clean = await fetchUpstreamMediaResilient(embedded, {
            timeoutMs: UPSTREAM_TIMEOUT_MS,
            rangeHeader: req.headers.range,
            tag: "STREAM",
            requestId,
            sourceUrl: req.query.source,
            signal,
          });
          if (clean.status.kind === "timeout") {
            res.status(504).json(createErrorResponse("PROVIDER_TIMEOUT"));
            return;
          }
          if (clean.status.kind === "client-gone") {
            logger.info("[STREAM] client gone during embedded-slice recovery", { requestId });
            return;
          }
          if (clean.status.kind === "bad-redirect" || clean.status.kind === "network-error") {
            res.status(502).json(createErrorResponse("MEDIA_DOWNLOAD_FAILED"));
            return;
          }
          const recovered = clean.status.response;
          if (recovered.status === 401 || recovered.status === 403 || recovered.status === 404) {
            await recovered.body?.cancel().catch(() => {});
            const expired = createError("MEDIA_URL_EXPIRED");
            res.status(expired.statusCode).json(expired.toResponse());
            return;
          }
          if (recovered.status !== 200 && recovered.status !== 206) {
            await recovered.body?.cancel().catch(() => {});
            logger.warn("[STREAM] embedded-slice recovery upstream status", {
              requestId,
              status: recovered.status,
            });
            res.status(502).json(createErrorResponse("MEDIA_DOWNLOAD_FAILED"));
            return;
          }
          const recoveredCT = recovered.headers.get("content-type") || "";
          if (isHtmlContent(recoveredCT)) {
            await recovered.body?.cancel().catch(() => {});
            const expired = createError("MEDIA_URL_EXPIRED");
            res.status(expired.statusCode).json(expired.toResponse());
            return;
          }
          if (!recovered.body) {
            res.status(502).json(createErrorResponse("CONTENT_UNAVAILABLE"));
            return;
          }
          response = recovered;
          const recoveredVideo = recoveredCT.includes("video") || validation.value.url.includes(".mp4");
          contentType = recoveredVideo ? "video/mp4" : recoveredCT || "application/octet-stream";
          res.setHeader("Content-Type", contentType);
          logStreamDiag(requestId, { status: recovered.status, mode: "embedded-slice-recovery", contentType, bytes: 0 });
        }
      }
    }

    // Case 1: upstream honored the browser's range — forward 206 as-is.
    // The upstream range MUST cover what the browser asked for. Instagram's
    // CDN URLs carry their own embedded bytestart/byteend slice parameters;
    // when the edge answers with that slice instead of the requested Range
    // (e.g. `bytes 818-909/...` for a `bytes=0-...` request), forwarding it
    // would hand the <video> element bytes it cannot use. Never forward a
    // mismatched 206 — fall through to the full-fetch recovery below.
    if (response.status === 206) {
      const upRange = parseContentRange(response.headers.get("content-range"));
      if (upRange && upstreamSatisfiesBrowser(upRange, req.headers.range, clientRange)) {
        const contentRange = response.headers.get("content-range") as string;
        res.setHeader("Content-Range", contentRange);
        const contentLength = response.headers.get("content-length");
        res.setHeader(
          "Content-Length",
          contentLength ?? String(upRange.end - upRange.start + 1)
        );
        res.status(206);
        logger.info("[STREAM] forwarding 206 partial content", { requestId, contentRange });
        if (!response.body) {
          res.status(502).json(createErrorResponse("CONTENT_UNAVAILABLE"));
          return;
        }
        const result = await pipeUpstreamToClient(req, res, response.body, MAX_STREAM_BYTES, "STREAM", requestId, signal);
        logger.info("[STREAM] 206 stream completed", { requestId, bytes: result.bytes });
        logStreamDiag(requestId, { status: 206, mode: "upstream-range", contentType, bytes: result.bytes });
        return;
      }
      // Mismatch recovery: discard the unusable slice and fetch the full
      // object (no Range), then satisfy the browser's range locally via
      // Case 2/3 below. The signed CDN URL is reused exactly as received —
      // no parameter is stripped or rewritten.
      await response.body?.cancel().catch(() => {});
      logger.warn("[STREAM] upstream range mismatch, refetching full object", {
        requestId,
        rangeRequested: req.headers.range ?? null,
        upstreamContentRange: response.headers.get("content-range"),
      });
      const refetch = await fetchUpstreamMediaResilient(validation.value.url, {
        timeoutMs: UPSTREAM_TIMEOUT_MS,
        tag: "STREAM",
        requestId,
        sourceUrl: req.query.source,
        signal,
      });
      if (refetch.status.kind === "timeout") {
        res.status(504).json(createErrorResponse("PROVIDER_TIMEOUT"));
        return;
      }
      if (refetch.status.kind === "client-gone") {
        logger.info("[STREAM] client gone before range recovery", { requestId });
        return;
      }
      if (refetch.status.kind === "bad-redirect" || refetch.status.kind === "network-error") {
        res.status(502).json(createErrorResponse("MEDIA_DOWNLOAD_FAILED"));
        return;
      }
      const full = refetch.status.response;
      if (full.status === 401 || full.status === 403 || full.status === 404) {
        await full.body?.cancel().catch(() => {});
        res.status(createError("MEDIA_URL_EXPIRED").statusCode).json(createError("MEDIA_URL_EXPIRED").toResponse());
        return;
      }
      if (full.status !== 200) {
        // Still no full object (e.g. the edge keeps serving its embedded
        // slice): the URL cannot satisfy range playback. Report it as an
        // expired/unusable link — never a lying 206.
        await full.body?.cancel().catch(() => {});
        logger.warn("[STREAM] range recovery failed, upstream status", {
          requestId,
          status: full.status,
        });
        res.status(createError("MEDIA_URL_EXPIRED").statusCode).json(createError("MEDIA_URL_EXPIRED").toResponse());
        return;
      }
      const fullCT = full.headers.get("content-type") || "";
      if (isHtmlContent(fullCT)) {
        await full.body?.cancel().catch(() => {});
        logger.warn("[STREAM] range recovery hit HTML masquerading as media", { requestId });
        res.status(createError("MEDIA_URL_EXPIRED").statusCode).json(createError("MEDIA_URL_EXPIRED").toResponse());
        return;
      }
      if (!full.body) {
        res.status(502).json(createErrorResponse("CONTENT_UNAVAILABLE"));
        return;
      }
      response = full;
      const recoveredVideo = fullCT.includes("video") || validation.value.url.includes(".mp4");
      contentType = recoveredVideo ? "video/mp4" : fullCT || "application/octet-stream";
      res.setHeader("Content-Type", contentType);
    }

    // Re-narrow after a possible recovery reassignment above.
    if (!response.body) {
      logger.warn("[STREAM] empty upstream body", { requestId });
      res.status(502).json(createErrorResponse("CONTENT_UNAVAILABLE"));
      return;
    }

    // Case 2: upstream returned 200 but client asked for a range — slice it ourselves
    if (clientRange) {
      const totalHeader = response.headers.get("content-length");
      const total = totalHeader ? parseInt(totalHeader, 10) : NaN;
      const end = clientRange.end ?? (isNaN(total) ? null : total - 1);
      if (!isNaN(total) && clientRange.start >= total) {
        await response.body.cancel().catch(() => {});
        res.status(416).setHeader("Accept-Ranges", "bytes").json(createErrorResponse("CONTENT_UNAVAILABLE"));
        return;
      }
      const rangeEnd = end ?? "";
      const rangeTotal = isNaN(total) ? "*" : String(total);
      res.setHeader("Content-Range", `bytes ${clientRange.start}-${rangeEnd}/${rangeTotal}`);
      if (end !== null) {
        res.setHeader("Content-Length", String(end - clientRange.start + 1));
      }
      res.status(206);
      logger.info("[STREAM] serving 206 from 200 upstream (slicing)", {
        requestId,
        start: clientRange.start,
        end,
      });
      const sent = await pipeRangeSlice(req, res, response.body, clientRange.start, end, "STREAM", requestId, signal);
      logger.info("[STREAM] sliced 206 completed", { requestId, bytes: sent });
      logStreamDiag(requestId, { status: 206, mode: "sliced-206", contentType, bytes: sent });
      return;
    }

    // Case 3: full 200 stream — validate first bytes are actually media
    const contentLength = response.headers.get("content-length");
    if (contentLength) {
      if (parseInt(contentLength, 10) > MAX_STREAM_BYTES) {
        await response.body.cancel().catch(() => {});
        res.status(413).json(createErrorResponse("REQUEST_TOO_LARGE"));
        return;
      }
      res.setHeader("Content-Length", contentLength);
    }
    logger.info("[STREAM] full 200 stream started", { requestId });
    const result = await pipeWithValidation(req, res, response.body, MAX_STREAM_BYTES, "STREAM", requestId, signal);
    logger.info("[STREAM] full stream completed", {
      requestId,
      completed: result.completed,
      bytes: result.bytes,
    });
    logStreamDiag(requestId, { status: 200, mode: "full", contentType, bytes: result.bytes });
  } catch (error) {
    const mapped = toMediaAppError(error);
    logger.error("[STREAM] proxy error", {
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
