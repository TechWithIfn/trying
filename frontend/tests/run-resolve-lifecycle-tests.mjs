/**
 * Resolve request-lifecycle regression tests (no test framework needed).
 *
 * Compiles the REAL frontend/src/services/api.ts with the project's own
 * TypeScript and asserts, against a fake EventSource/fetch:
 *
 *  A. Offline/disconnect classification: offline vs network vs server vs
 *     aborted — a disconnect must never look like an Instagram/rate-limit
 *     or resolver verdict.
 *  B. EventSource terminal paths close the stream first: repeated `error`
 *     events (the disconnect storm) invoke the transport fallback AT MOST
 *     once, so one user action can never spawn repeated POST /api/resolve.
 *  C. Server-verdict errors never trigger the POST fallback.
 *  D. Events after close are ignored (no late repaints, no extra jobs).
 *  E. resolveInstagramUrl attempts exactly one fetch (no client retry loop).
 *
 * Run: npm run test:lifecycle
 */
import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { pathToFileURL, fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let failures = 0;

function check(name, actual, expected) {
  const ok = Object.is(actual, expected);
  if (ok) {
    console.log(`ok   ${name}`);
  } else {
    failures++;
    console.error(`FAIL ${name}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

class FakeEventSource {
  static instances = [];
  constructor(url) {
    this.url = url;
    this.closed = false;
    this.listeners = {};
    FakeEventSource.instances.push(this);
  }
  addEventListener(type, fn) {
    (this.listeners[type] = this.listeners[type] || []).push(fn);
  }
  close() {
    this.closed = true;
  }
  emit(type, event) {
    for (const fn of this.listeners[type] || []) fn(event);
  }
}

async function main() {
  // Browser globals the module touches at runtime (all guarded except these).
  // NOTE: modern Node ships a read-only global `navigator`, so plain
  // assignment is silently ignored — defineProperty actually installs the stub.
  globalThis.EventSource = FakeEventSource;
  Object.defineProperty(globalThis, "navigator", {
    value: { onLine: true },
    configurable: true,
    writable: true,
  });
  const setOnline = (onLine) => {
    Object.defineProperty(globalThis, "navigator", {
      value: { onLine },
      configurable: true,
      writable: true,
    });
  };

  const frontendDir = path.join(__dirname, "..");
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "downloadit-api-test-"));
  execSync(
    `npx tsc src/services/api.ts --outDir ${JSON.stringify(outDir)} --target es2022 --module es2022 --moduleResolution bundler --skipLibCheck --strict`,
    { cwd: frontendDir, stdio: "pipe" }
  );
  const api = await import(pathToFileURL(path.join(outDir, "api.js")).href);

  // ---- A. classification ----
  check("isBrowserOffline online", api.isBrowserOffline(), false);
  setOnline(false);
  check("isBrowserOffline offline", api.isBrowserOffline(), true);
  check("offline error is network failure", api.isNetworkFailure(new TypeError("Failed to fetch")), true);
  setOnline(true);
  check("TypeError Failed to fetch", api.isNetworkFailure(new TypeError("Failed to fetch")), true);
  check(
    "ERR_INTERNET_DISCONNECTED",
    api.isNetworkFailure(new TypeError("fetch failed: ERR_INTERNET_DISCONNECTED")),
    true
  );
  const netErr =
    typeof DOMException !== "undefined" ? new DOMException("NetworkError when attempting to fetch resource.", "NetworkError") : new Error("NetworkError");
  check("DOM NetworkError", api.isNetworkFailure(netErr), true);
  check("plain Error is not network failure", api.isNetworkFailure(new Error("boom")), false);
  // NOTE: DOMException.name is getter-only; the constructor arg sets it.
  const abortErr =
    typeof DOMException !== "undefined" ? new DOMException("aborted", "AbortError") : Object.assign(new Error("aborted"), { name: "AbortError" });
  check("AbortError is not network failure", api.isNetworkFailure(abortErr), false);

  const diag = (status, error) =>
    api.logApiFailure({ requestType: "resolve-post", requestUrl: "https://backend/api/resolve", status, error }).category;
  setOnline(false);
  check("offline category", diag(null, new TypeError("Failed to fetch")), "offline");
  setOnline(true);
  check("network category", diag(null, new TypeError("Failed to fetch")), "network");
  check("server category", diag(429, new Error("x")), "server");
  check("aborted category", diag(null, abortErr), "aborted");

  // ---- B/C/D. EventSource lifecycle ----
  const silence = () => {};
  console.warn = silence;

  let progressCalls = 0;
  let completeCalls = 0;
  let errorCalls = 0;
  let transportCalls = 0;
  const handle = api.startResolveStream("https://www.instagram.com/reel/AAA/", {
    onProgress: () => {
      progressCalls++;
    },
    onComplete: () => {
      completeCalls++;
    },
    onError: () => {
      errorCalls++;
    },
    onTransportError: () => {
      transportCalls++;
    },
  });
  const es = FakeEventSource.instances[FakeEventSource.instances.length - 1];
  check("stream targets resolve endpoint", String(es.url).includes("/api/resolve/stream"), true);

  // Disconnect storm: three transport errors in a row (offline flapping).
  es.emit("error", { data: null });
  es.emit("error", { data: null });
  es.emit("error", {});
  check("stream closed after first terminal error", es.closed, true);
  check("transport fallback ran exactly once", transportCalls, 1);
  check("no server-error handler on transport failure", errorCalls, 0);

  // Late events after close are dead: no repaints, no extra jobs.
  es.emit("progress", { data: JSON.stringify({ progress: 90, stage: "late" }) });
  es.emit("complete", { data: JSON.stringify({ data: { media: [] } }) });
  check("late progress ignored", progressCalls, 0);
  check("late complete ignored", completeCalls, 0);
  handle.close();

  // Server verdict with payload: onError once, never the POST fallback.
  let errorCalls2 = 0;
  let transportCalls2 = 0;
  api.startResolveStream("https://www.instagram.com/reel/BBB/", {
    onProgress: () => {},
    onComplete: () => {},
    onError: () => {
      errorCalls2++;
    },
    onTransportError: () => {
      transportCalls2++;
    },
  });
  const es2 = FakeEventSource.instances[FakeEventSource.instances.length - 1];
  es2.emit("error", { data: JSON.stringify({ code: "RATE_LIMITED", message: "slow down" }) });
  es2.emit("error", { data: JSON.stringify({ code: "RATE_LIMITED", message: "slow down" }) });
  check("server error delivered once", errorCalls2, 1);
  check("server error never triggers POST fallback", transportCalls2, 0);
  check("server-error stream closed", es2.closed, true);

  // ---- Pinterest Auto Detect request contract ----
  api.startPinterestResolveStream("https://www.pinterest.com/pin/123/", "any", {
    onProgress: () => {},
    onComplete: () => {},
    onError: () => {},
  });
  const pinEs = FakeEventSource.instances[FakeEventSource.instances.length - 1];
  check("pinterest stream sends kind=any", new URL(pinEs.url).searchParams.get("kind"), "any");
  pinEs.close();

  let pinterestBody = null;
  let pinterestUrl = null;
  globalThis.fetch = async (url, init) => {
    pinterestUrl = String(url);
    pinterestBody = JSON.parse(init.body);
    return new Response(
      JSON.stringify({ success: false, error: { code: "PINTEREST_PIN_NOT_FOUND", message: "missing" } }),
      { status: 404, headers: { "content-type": "application/json" } }
    );
  };
  await api.resolvePinterestUrl("https://www.pinterest.com/pin/123/", "any");
  check("pinterest POST sends kind=any", pinterestBody.kind, "any");
  check("pinterest POST targets its own route", pinterestUrl.includes("/api/pinterest/resolve"), true);
  check("pinterest POST carries the url", pinterestBody.url, "https://www.pinterest.com/pin/123/");

  // ---- E. POST resolve: exactly one fetch attempt ----
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls++;
    throw new TypeError("Failed to fetch");
  };
  let threw = null;
  try {
    await api.resolveInstagramUrl("https://www.instagram.com/reel/CCC/", undefined);
  } catch (err) {
    threw = err;
  }
  check("POST failure rethrown (component owns the message)", threw instanceof TypeError, true);
  check("POST attempted exactly once (no client retry)", fetchCalls, 1);

  // ---- F. stale-media recovery helpers (preview retry policy) ----
  // Only an expired signed CDN URL may trigger the single fresh resolve.
  check("expired code recognized", api.isExpiredMediaErrorCode("MEDIA_URL_EXPIRED"), true);
  check("generic unavailable is not expiry", api.isExpiredMediaErrorCode("CONTENT_UNAVAILABLE"), false);
  check("unknown code is not expiry", api.isExpiredMediaErrorCode("TEMPORARY_ERROR"), false);
  check("non-string code is not expiry", api.isExpiredMediaErrorCode(null), false);
  check("410 status is expiry", api.isExpiredMediaStatus(410), true);
  check("403 status is not expiry", api.isExpiredMediaStatus(403), false);
  check("null status is not expiry", api.isExpiredMediaStatus(null), false);

  // The client's own cache-buster strips cleanly; CDN signatures survive.
  const proxied =
    "https://backend/api/stream?url=https%3A%2F%2Fcdn%2Fv.mp4%3Foh%3D00%26oe%3DAB&source=https%3A%2F%2Fwww.instagram.com%2Freel%2FX%2F";
  check(
    "retry param stripped",
    api.stripStreamRetryParam(`${proxied}&_retry=123`),
    proxied
  );
  check("clean url untouched", api.stripStreamRetryParam(proxied), proxied);

  // Fresh-item swap: same index refreshed, siblings untouched, no-op when
  // the "fresh" URL is identical (must show the error, never reload stale).
  const staleItems = [
    { url: "https://cdn/old-a?sig=1", type: "video", width: 1, height: 1, duration: 1, size: 1, thumbnail: null, format: "mp4", audioUrl: "https://cdn/old-audio?sig=1" },
    { url: "https://cdn/old-b?sig=2", type: "image", width: 2, height: 2, duration: null, size: 2, thumbnail: null, format: "jpg" },
  ];
  const freshMedia = [
    { url: "https://cdn/new-a?sig=9", type: "video", width: 1080, height: 1920, duration: 12, size: 99, thumbnail: null, format: "mp4", audioUrl: "https://cdn/new-audio?sig=9" },
    { url: "https://cdn/old-b?sig=2", type: "image", width: 2, height: 2, duration: null, size: 2, thumbnail: null, format: "jpg" },
  ];
  const swapped = api.refreshMediaItemUrl(staleItems, freshMedia, 0);
  check("swap returns a list", Array.isArray(swapped), true);
  check("current item takes the fresh URL", swapped && swapped[0].url, "https://cdn/new-a?sig=9");
  check("fresh pairing follows the video", swapped && swapped[0].audioUrl, "https://cdn/new-audio?sig=9");
  check("sibling untouched", swapped && swapped[1].url, "https://cdn/old-b?sig=2");
  check("identical URL is a no-op", api.refreshMediaItemUrl(staleItems, staleItems, 0), null);
  check("empty fresh result is a no-op", api.refreshMediaItemUrl(staleItems, [], 0), null);
  check("null fresh result is a no-op", api.refreshMediaItemUrl(staleItems, null, 0), null);

  // N. playback-error handling: the refresh flag travels only on recovery.
  let lastBody = null;
  globalThis.fetch = async (_url, init) => {
    lastBody = JSON.parse(init.body);
    return { ok: true, json: async () => ({ success: true, data: { media: [] } }) };
  };
  await api.resolveInstagramUrl("https://www.instagram.com/reel/DDD/");
  check("initial resolve carries no refresh flag", "refresh" in lastBody, false);
  await api.resolveInstagramUrl("https://www.instagram.com/reel/DDD/", undefined, { refresh: true });
  check("recovery resolve sets refresh:true", lastBody.refresh, true);

  // ---- G. concurrent handles are independent (no global blocking) ----
  // Two simultaneous streams (e.g. a superseded job plus its replacement)
  // each own their EventSource: completing one never closes the other, and
  // closing one never silences the other. Per-handle `closed` flags only.
  let doneA = 0;
  let doneB = 0;
  const handleA = api.startResolveStream("https://www.instagram.com/stories/userA/", {
    onProgress: () => {},
    onComplete: () => {
      doneA++;
    },
    onError: () => {},
  });
  api.startResolveStream("https://www.instagram.com/stories/userB/", {
    onProgress: () => {},
    onComplete: () => {
      doneB++;
    },
    onError: () => {},
  });
  const esA = FakeEventSource.instances[FakeEventSource.instances.length - 2];
  const esB = FakeEventSource.instances[FakeEventSource.instances.length - 1];
  check("two handles open two streams", esA !== esB && !esA.closed && !esB.closed, true);
  esA.emit("complete", { data: JSON.stringify({ data: { media: [] } }) });
  check("first stream completes independently", doneA, 1);
  check("first stream closed after complete", esA.closed, true);
  check("second stream unaffected by first", !esB.closed && doneB === 0, true);
  handleA.close();
  esB.emit("complete", { data: JSON.stringify({ data: { media: [] } }) });
  check("second stream completes after first closed", doneB, 1);

  // Stream/download URL construction: `url` is the CDN media source and
  // `source` is only the original page — never confused, never double-encoded.
  const cdn = "https://scontent-iad3-1.cdninstagram.com/v/t16/a.mp4?oh=00&oe=AB&efg=x%3Dy";
  const page = "https://www.instagram.com/reel/DDD/";
  const built = new URL(api.getStreamUrl(cdn, page));
  check("url param round-trips the CDN URL", built.searchParams.get("url"), cdn);
  check("source param is the page URL", built.searchParams.get("source"), page);

  // ---- P. Download filenames + ZIP URL (all platforms) ----
  // Play/pause/ended state is the single source of truth that drives the
  // on-video overlay (playing → compact download icon only). Drawn from the
  // real element's flags; `ended` counts as not playing.
  check("playing when not paused/ended", api.isVideoPlaying(false, false), true);
  check("not playing while paused", api.isVideoPlaying(true, false), false);
  check("not playing after ended", api.isVideoPlaying(false, true), false);
  check("not playing when paused and ended", api.isVideoPlaying(true, true), false);

  // Requested pattern: `Downloadit {original title}.{extension}`.
  check(
    "filename uses original title and lowercased ext",
    api.buildDownloadFilename({ title: "Sunset Over the Sea", extension: ".JPG" }),
    "Downloadit Sunset Over the Sea.jpg"
  );
  check(
    "filename strips Windows/Android/iOS-illegal characters",
    api.buildDownloadFilename({ title: 'a/b:c*?"<>|', extension: "mp4" }),
    "Downloadit a b c.mp4"
  );
  check(
    "filename falls back to media-type label when title is missing",
    api.buildDownloadFilename({ title: null, extension: "mp4", fallback: "Pinterest Video" }),
    "Downloadit Pinterest Video.mp4"
  );
  check(
    "blank title uses fallback, never the username",
    api.buildDownloadFilename({ title: "   ", extension: "mp4", fallback: "Pinterest Image" }),
    "Downloadit Pinterest Image.mp4"
  );
  check(
    "zip archive filename",
    api.buildDownloadFilename({ title: "Trip", extension: "zip", fallback: "Pinterest Images" }),
    "Downloadit Trip.zip"
  );
  check(
    "title is capped at 100 Unicode code points",
    Array.from(
      api
        .buildDownloadFilename({ title: "x".repeat(200), extension: "jpg" })
        .replace(/^Downloadit /, "")
        .replace(/\.jpg$/, "")
    ).length,
    100
  );
  const zipBuilt = new URL(
    api.getZipDownloadUrl(
      ["https://i.pinimg.com/a.jpg", "https://i.pinimg.com/b.jpg"],
      "Downloadit Trip.zip",
      "https://www.pinterest.com/pin/123/"
    )
  );
  check("zip url carries every image", zipBuilt.searchParams.getAll("url").length, 2);
  check("zip url carries the filename", zipBuilt.searchParams.get("filename"), "Downloadit Trip.zip");
  check("zip url carries the source page", zipBuilt.searchParams.get("source"), "https://www.pinterest.com/pin/123/");

  // ---- Q. Cross-platform result-card behavior (shared, pure helpers) ----
  // On-video overlay for EVERY platform: only a real, playable video gets it;
  // Preview is visible before playback; the instant the element reports playing
  // Preview hides and Download collapses to the compact circular icon; paused /
  // stopped / ended restores both. `ended` is folded into `playing:false`.
  const ov = (isVideo, hasPlayableSrc, playing) =>
    api.videoOverlayState({ isVideo, hasPlayableSrc, playing });
  check("no overlay without a playable video", ov(true, false, false).showOverlay, false);
  check("no overlay for an image result", ov(false, true, false).showOverlay, false);
  check(
    "overlay before playback: preview shown, download not compact",
    `${ov(true, true, false).showPreview}/${ov(true, true, false).compactDownload}`,
    "true/false"
  );
  check(
    "overlay while playing: preview hidden, download compact",
    `${ov(true, true, true).showPreview}/${ov(true, true, true).compactDownload}`,
    "false/true"
  );
  check("ended (playing=false) restores preview", ov(true, true, false).showPreview, true);

  // Multi-image plan: a genuine "Download all images" only exists for 2+ real
  // images. Single-image and mixed posts never invent one or duplicate a file.
  check("single image: no multi-image action", api.imageDownloadPlan([{ type: "image" }]).canDownloadAll, false);
  check(
    "two images: multi-image action offered",
    api.imageDownloadPlan([{ type: "image" }, { type: "image" }]).canDownloadAll,
    true
  );
  check(
    "mixed image+video: no false multi-image action",
    api.imageDownloadPlan([{ type: "image" }, { type: "video" }]).canDownloadAll,
    false
  );
  check(
    "image count ignores videos",
    api.imageDownloadPlan([{ type: "image" }, { type: "video" }, { type: "image" }]).imageCount,
    2
  );
  check("empty items: no multi-image action", api.imageDownloadPlan([]).canDownloadAll, false);
  check("null items are safe", api.imageDownloadPlan(null).canDownloadAll, false);

  // Cross-platform filename fallbacks — the media-type label, never a username.
  check(
    "instagram video fallback",
    api.buildDownloadFilename({ title: null, extension: "mp4", fallback: "Instagram Video" }),
    "Downloadit Instagram Video.mp4"
  );
  check(
    "instagram image fallback",
    api.buildDownloadFilename({ title: "", extension: "jpg", fallback: "Instagram Image" }),
    "Downloadit Instagram Image.jpg"
  );
  check(
    "instagram carousel zip fallback",
    api.buildDownloadFilename({ title: "   ", extension: "zip", fallback: "Instagram Images" }),
    "Downloadit Instagram Images.zip"
  );
  check(
    "a real title always wins over the username",
    api.buildDownloadFilename({ title: "My Trip", extension: "mp4", fallback: "Instagram Video" }),
    "Downloadit My Trip.mp4"
  );
  check(
    "short Unicode title kept intact",
    api.buildDownloadFilename({ title: "क्रोकेट 🍲", extension: "jpg" }),
    "Downloadit क्रोकेट 🍲.jpg"
  );
  // Max 100 Unicode code points, never splitting a surrogate pair / emoji.
  const emojiName = api.buildDownloadFilename({ title: "😀".repeat(150), extension: "jpg" });
  check(
    "emoji-only title truncated to 100 code points",
    Array.from(emojiName.replace(/^Downloadit /, "").replace(/\.jpg$/, "")).length,
    100
  );
  check("truncated title has no replacement char", emojiName.includes("\uFFFD"), false);

  // ---- R. Preview-first surface (shared, pure helpers) ----
  // Default state: a compact poster with Preview + Download; the real <video>
  // is mounted only after the user opens the preview; non-video / unplayable
  // items never get a video surface at all.
  const plan = (isVideo, hasPlayableVideo, previewOpen) =>
    api.mediaPreviewPlan({ isVideo, hasPlayableVideo, previewOpen });
  check(
    "video default shows the thumbnail, not the player",
    `${plan(true, true, false).showThumbnailFirst}/${plan(true, true, false).mountVideo}`,
    "true/false"
  );
  check(
    "opening the preview mounts the video",
    `${plan(true, true, true).showThumbnailFirst}/${plan(true, true, true).mountVideo}`,
    "false/true"
  );
  check("video without a playable source gets no surface", plan(true, false, false).canPreviewVideo, false);
  check("an image is never previewed as video", plan(false, true, false).canPreviewVideo, false);
  check("opening a non-video is inert", plan(false, false, true).mountVideo, false);

  // Poster/thumbnail is only mounted when it is a real http(s) image, and it is
  // streamed through our own backend (never the raw CDN URL).
  check(
    "valid thumbnail becomes a proxied poster",
    api.proxiedPosterUrl("https://scontent.cdninstagram.com/v/t51/thumb.jpg", "https://www.instagram.com/p/x/")?.startsWith(
      "http"
    ),
    true
  );
  check("poster is proxied, not the raw CDN url", api.proxiedPosterUrl("https://cdn.example.com/a.jpg")?.includes("/api/stream?url="), true);
  check("an .mp4 is never used as a poster", api.proxiedPosterUrl("https://cdn.example.com/clip.mp4"), null);
  check("a data: poster is rejected", api.proxiedPosterUrl("data:image/png;base64,AAAA"), null);
  check("a blob: poster is rejected", api.proxiedPosterUrl("blob:https://x/y"), null);
  check("an empty poster is rejected", api.proxiedPosterUrl(""), null);
  check("a missing poster is rejected", api.proxiedPosterUrl(null), null);
  check("isValidImagePoster accepts a signed image url", api.isValidImagePoster("https://i.pinimg.com/564x/ab/cd.jpg"), true);
  check("isValidImagePoster rejects a video url", api.isValidImagePoster("https://v.example.com/a.mp4?x=1"), false);

  // ---- S. Video surface click action (shared, pure helper) ----
  // The poster is a real play surface: clicking it (or its center Play control)
  // opens the preview and starts playback — the same action as Preview. Once the
  // real <video> is mounted the surface is inert, so the native controls own
  // play/pause and a click never double-toggles. Images / unplayable items are
  // always inert.
  const surf = (isVideo, hasPlayableVideo, previewOpen) =>
    api.mediaSurfaceAction({ isVideo, hasPlayableVideo, previewOpen });
  check("poster surface opens the preview", surf(true, true, false), "open-preview");
  check("mounted video surface is inert", surf(true, true, true), "none");
  check("unplayable video surface is inert", surf(true, false, false), "none");
  check("image surface is inert", surf(false, true, false), "none");

  fs.rmSync(outDir, { recursive: true, force: true });

  if (failures > 0) {
    console.error(`${failures} assertion(s) failed`);
    process.exit(1);
  }
  console.log("all resolve-lifecycle assertions passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
