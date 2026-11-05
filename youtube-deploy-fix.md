# YouTube Downloader — Deployed-Server Fix

**Date:** November 4, 2026
**Symptom:** `https://backend-chi-orpin-90.vercel.app` returned
`YOUTUBE_UNAVAILABLE` ("media engine is not installed or could not be started")
for every YouTube request, while the same code worked on Windows locally.

## Evidence collected before changing code

```text
GET https://backend-chi-orpin-90.vercel.app/api/health/media
{"status":"degraded","engineReady":false,"ffmpegConfigured":true,"ytDlpConfigured":true,
 "ffmpegAvailable":false,"ffmpegVersion":null,"ytDlpAvailable":false,"ytDlpVersion":null}
```

```text
POST https://backend-chi-orpin-90.vercel.app/api/youtube/resolve
HTTP/1.1 503 Service Unavailable
{"success":false,"error":{"code":"YOUTUBE_UNAVAILABLE", ... "totalDurationMs":7, "stage":"probe"}}
```

Both media binaries were missing **on the server only**, and the failure was
instant (7 ms), so no binary was ever spawned. That ruled out YouTube blocking
and download timeouts and pointed at binary packaging/resolution.

## Root causes

1. **Fragile `bin/` lookup.** `src/lib/youtube/ytdlp.ts` derived the backend
   root exclusively from `import.meta.url` (`../../..`). Serverless hosts bundle
   the entry point, so the computed root became the filesystem root and
   `bin/yt-dlp` was searched in the wrong place. `process.cwd()`, the Lambda
   task root and the monorepo `backend/` folder were never considered.
2. **Wrong Linux binary.** The build fell back to the generic `yt-dlp` release
   asset, which is a **Python zipapp** (`#!/usr/bin/env python3`). It verifies
   on the build image (Python present) and fails on the Node runtime (no
   Python). ffmpeg staging failures were also swallowed instead of recorded.
3. **No recovery path.** If `includeFiles` did not ship `bin/*` (or shipped a
   non-executable / wrong-platform file), the code had no way to recover.

## What changed

| File | Change |
|------|--------|
| `backend/src/lib/media-binary.ts` *(new)* | Shared binary locator. Searches `MEDIA_BIN_DIR`, `LAMBDA_TASK_ROOT`, `/var/task`, `cwd`, cwd/module ancestors and `<root>/backend`, fixes the executable bit (copying to the writable temp dir on read-only mounts), verifies binaries, and downloads the correct standalone build into the temp dir as a last resort (once per instance, 5-minute failure backoff, stale partial cleanup). |
| `backend/scripts/ensure-ytdlp.mjs` | Stages the **self-contained** `yt-dlp_linux` / `yt-dlp_linux_aarch64` / `yt-dlp_macos` / `yt-dlp.exe` builds, rejects shebang scripts by magic bytes, removes foreign-platform binaries, and no longer hides ffmpeg download failures. On Linux/macOS ffmpeg is staged **gzipped** (`bin/ffmpeg.gz`, ~28 MB instead of ~76 MB) to stay under Vercel's 250 MB function limit. |
| `backend/src/lib/youtube/ytdlp.ts` | Candidate search uses the shared roots (no more `import.meta.url`-only path), resolves relative `YTDLP_PATH` against every root, and falls back to a runtime download when nothing usable shipped. |
| `backend/src/lib/ffmpeg.ts` | Same root discovery + executable-bit handling; new async `resolveFfmpegPath()` that expands a staged `bin/ffmpeg.gz` (or downloads ffmpeg) before the merge/transcode step. |
| `backend/src/lib/youtube/download.ts` | Uses `await resolveFfmpegPath()` so the merge/transcode step can provision ffmpeg before spawning yt-dlp. |
| `backend/src/routes/health.ts`, `backend/api/index.ts` | `/api/health/media` and the cold-start log now report `ytDlpSource` / `ffmpegSource` (`staged`, `env`, `runtime`) and the runtime architecture. |
| `backend/vercel.json` | `includeFiles` changed to `["bin/**"]`; `excludeFiles` drops `youtube-dl-exec`'s bundled Python zipapp (useless on Linux, keeps the function small). |
| `backend/.env.example` | Documents `MEDIA_BIN_DIR`, `MEDIA_RUNTIME_DOWNLOAD`, and recommends **leaving `YTDLP_PATH` / `FFMPEG_BIN` unset** (a Windows-only value on the server is worse than auto-detection). |

## Verification performed

* `npx tsc --noEmit -p backend` → 0 errors.
* `npm run build` → staged binaries + compiled successfully.
* Backend test suite: **884/884 passing** (`npx vitest run`, 58 files).
  One network-dependent test in `tests/status-codes-metrics.test.ts` fetched a
  hard-coded `scontent-*.fbcdn.net` URL and flaked on an earlier run; it passes
  on rerun and is unrelated to these changes.
* Local end-to-end (Windows, real YouTube):
  * `POST /api/youtube/resolve` → 200 with 1080p/720p/… qualities.
  * `GET /api/youtube/download?format=mp3&bitrate=128` → 3.4 MB MP3.
  * `GET /api/youtube/download?format=mp4&quality=720` → 7.2 MB MP4 (merge).
  * `/api/health/media` → `engineReady:true`, `ytDlpSource:"staged"`.
* Runtime-download path exercised directly on Windows: yt-dlp (23.5 MB) and
  ffmpeg (82.8 MB after gunzip) downloaded, chmod'ed, verified, and renamed
  successfully.
* Gzip expansion path exercised directly on Windows: a gzipped ffmpeg was
  expanded to the temp dir, chmod'ed and executed (`-version`) successfully.
* Function-size math: `@sparticuz/chromium` contributes ~67 MB; staged
  `yt-dlp` (39 MB) + `ffmpeg.gz` (28 MB) keeps the function well below the
  250 MB uncompressed ceiling enforced by AWS/Vercel.

## Deploy status at the time of writing

The push (`4cc0298`) is on `origin/main`, but the live backend still reported
the previous build (`build: c35b7f3…`, no `ffmpegSource`/`ytDlpSource` fields
in `/api/health/media`), so the fix is **not yet live**:

```text
GET https://backend-chi-orpin-90.vercel.app/api/health/media   (after push)
{"status":"degraded","ffmpegAvailable":true,"ffmpegVersion":"7.0.2-static","ytDlpAvailable":false, ...}
```

That response is still produced by the old code, and its `ffmpeg` success comes
from the project's existing `FFMPEG_BIN` override, not from the bundle.

## Deploy checklist (required)

1. Push this commit and let Vercel rebuild the **backend** project
   (root directory `backend`). If the project is not connected to GitHub,
   deploy manually from `backend/` (`vercel --prod`).
2. **Remove `FFMPEG_BIN` and `YTDLP_PATH` from the Vercel project env vars** if
   they contain Windows paths or point at files that do not exist on Linux.
   They are no longer needed.
3. After the deployment, confirm with:
   `curl https://backend-chi-orpin-90.vercel.app/api/health/media`
   Expected: `"engineReady": true`, plus `"ffmpegSource"` and
   `"ytDlpSource"` (`staged` is ideal, `runtime` also works).
   The first call after a cold start may take a few seconds if the bundle
   needed the runtime fallback download.
4. If the build fails with "Serverless Function exceeded the unzipped maximum
   size of 250 MB", remove the ffmpeg static asset from the bundle and rely on
   the runtime download (`MEDIA_RUNTIME_DOWNLOAD=1`).

## Remaining limitations (not code defects)

* Vercel functions cap at 60 s. Merging a long 1080p video can exceed that;
  audio and shorter videos are the realistic serverless workloads.
* YouTube may show a "confirm you're not a bot" challenge to datacenter IPs.
  That surfaces as `YOUTUBE_BOT_CHECK` (a different, honest error) and cannot
  be fixed by packaging changes.
* Each new serverless instance downloads the fallback binaries again if the
  bundle does not contain them; cold starts are slower until `includeFiles`
  ships them correctly.
