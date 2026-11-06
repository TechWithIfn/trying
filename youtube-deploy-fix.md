# YouTube Downloader — Deployed-Server Fix

**Date:** November 4, 2026
**Updated:** November 6, 2026 — deploy verified live, cold-start issue fixed.
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
| `backend/src/lib/media-binary.ts` *(new)* | Shared binary locator. Searches `MEDIA_BIN_DIR`, `LAMBDA_TASK_ROOT`, `/var/task`, `cwd`, cwd/module ancestors and `<root>/backend` (never the filesystem root `/`, whose `bin/` is the OS binary directory), fixes the executable bit (copying to the writable temp dir on read-only mounts), verifies binaries, expands the staged `bin/ffmpeg.gz`, and downloads the correct standalone build into the temp dir as a last resort (once per instance, 5-minute failure backoff, stale partial cleanup, collision-free temp names). |
| `backend/scripts/ensure-ytdlp.mjs` | Stages the **self-contained** `yt-dlp_linux` / `yt-dlp_linux_aarch64` / `yt-dlp_macos` / `yt-dlp.exe` builds, rejects shebang scripts by magic bytes, removes foreign-platform binaries, and no longer hides ffmpeg download failures. On Linux/macOS ffmpeg is staged **gzipped** (`bin/ffmpeg.gz`, ~28 MB instead of ~76 MB) to stay under Vercel's 250 MB function limit. |
| `backend/src/lib/youtube/ytdlp.ts` | Candidate search uses the shared roots (no more `import.meta.url`-only path), resolves relative `YTDLP_PATH` against every root, and falls back to a runtime download when nothing usable shipped. |
| `backend/src/lib/ffmpeg.ts` | Same root discovery + executable-bit handling; new async `resolveFfmpegPath()` that expands a staged `bin/ffmpeg.gz` (or downloads ffmpeg) before the merge/transcode step. |
| `backend/src/lib/youtube/download.ts` | Uses `await resolveFfmpegPath()` so the merge/transcode step can provision ffmpeg before spawning yt-dlp. |
| `backend/src/routes/health.ts`, `backend/api/index.ts` | `/api/health/media` and the cold-start log now report `ytDlpSource` / `ffmpegSource` (`staged`, `env`, `runtime`), the staged `bin/` file inventory, the staged archive size (`stagedFfmpegGzip`) and any expansion failure (`ffmpegStagingError`). |
| `backend/src/routes/youtube.ts` | Serverless time budgets raised (resolve cap 120 s, download cap 240 s) so a cold instance that must provision a binary still finishes instead of being cut off mid-stream. |
| `backend/vercel.json` | `includeFiles: "bin/**"` (string glob — arrays fail schema validation), `excludeFiles` drops `youtube-dl-exec`'s bundled Python zipapp, and `maxDuration` raised from 60 s to 300 s (Hobby maximum). |
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

## Deploy result (verified live)

After the `vercel.json` schema fix (`913d1f9`) the deployment succeeded:

```text
GET /api/health/media                          (build c36c2156)
{"status":"ok","engineReady":true,
 "ytDlpAvailable":true,"ytDlpVersion":"2026.10.26","ytDlpSource":"staged",
 "ffmpegAvailable":true,"ffmpegVersion":"7.0.2-static","ffmpegSource":"staged",
 "stagedFiles":["ffmpeg.gz","yt-dlp"],
 "stagedFfmpegGzip":{"path":"/var/task/backend/bin/ffmpeg.gz","bytes":29354986},
 "ffmpegStagingError":null}

POST /api/youtube/resolve           → 200, 1080p/720p/480p/240p/144p + audio options
GET  /api/youtube/download (mp3)    → 200, 3,409,580 bytes, ~11 s
GET  /api/youtube/download (720p)   → 200, 30,002,656 bytes, ~8 s
```

Four consecutive `/api/health/media` calls all reported
`ffmpegSource: "staged"` and `ytDlpSource: "staged"`, i.e. both engines now
come from the bundle; the runtime-download fallback is not used in the happy
path.

### Why `ffmpegSource` was `"runtime"` at first

The staged archive *was* in the bundle all along. The expansion step used a
temp file named `downloadit-ffmpeg.part-<pid>`; the cold-start engine probe in
`api/index.ts` and the request that triggered that cold start both called
`resolveFfmpegPath()` in the same process, so both wrote/renamed the **same**
temp path. One call renamed the file first, the other's `rename` then failed,
returned `null`, and fell back to the runtime download — which also overwrote
the reported source. Temp names now include a timestamp suffix, concurrent
expansion is safe, and the failure reason is exposed as `ffmpegStagingError`
(plus `stagedFfmpegGzip` for the archive size).

**Cold-start caveat that was then fixed:** the first one or two cold instances
produced a `200` with a truncated body (8 KB / 24 KB) because runtime ffmpeg
provisioning + download + transcode exceeded the old 60 s function limit. The
body was cut mid-stream while the client waited. `maxDuration` is now 300 s
and the internal budgets are 120 s / 240 s, so the same cold request completes.

## Follow-up deployment notes

* A first attempt to deploy failed schema validation because `includeFiles` /
  `excludeFiles` were arrays. Vercel expects a **string glob**, which is fixed
  in `913d1f9`.
* If a future build fails with "Serverless Function exceeded the unzipped
  maximum size of 250 MB", remove the staged ffmpeg asset and rely on the
  runtime download (already the automatic fallback) or opt into
  `VERCEL_SUPPORT_LARGE_FUNCTIONS=1`.

## Remaining limitations (not code defects)

* Long 1080p merges on a cold instance still cost time (provisioning + download
  + transcode). The 300 s function duration covers it, but audio and typical
  videos remain the best serverless workloads.
* YouTube may show a "confirm you're not a bot" challenge to datacenter IPs.
  That surfaces as `YOUTUBE_BOT_CHECK` (a different, honest error) and cannot
  be fixed by packaging changes.
* If the staging step cannot obtain ffmpeg during a build, the first request on
  each new instance downloads ~28 MB into `/tmp`; the build now retries,
  falls back to shipping the uncompressed binary, and `maxDuration` covers the
  slow first request either way.
