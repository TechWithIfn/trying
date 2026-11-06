# Vercel backend deployment configuration

The Vercel project must use `backend` as its **Root Directory**. With that
setting, Vercel reads `backend/vercel.json`, runs `npm run build`, and serves
`api/index.ts`. Do not set the repository root as the backend project root:
the root package is the frontend/workspace orchestrator and does not provide
the backend function configuration.

Values below are set only in Vercel; never commit or paste secrets into this
file.

## Core required variables

| Variable | Description | Safe example |
| --- | --- | --- |
| `RESOLVER_PROVIDER` | Resolver used by Instagram and Pinterest. `puppeteer` needs no API key and is the working local value. | `puppeteer` |
| `CORS_ORIGIN` | Exact browser origins allowed to call the backend, comma-separated, no trailing slash. Must match the deployed frontend. | `https://www.downloadit.pro,https://downloadit.pro` |

The backend's `package.json` build script runs
`scripts/ensure-ytdlp.mjs`. It stages binaries for the Vercel Linux build
platform, and `vercel.json` includes `bin/**` in the function while excluding
the Windows-oriented `youtube-dl-exec` bundled binary.

## Optional media path overrides

The backend stages and verifies Linux-compatible binaries automatically. Leave
these unset unless a deployment provides its own executable:

| Variable | Description | Safe example |
| --- | --- | --- |
| `YTDLP_PATH` | Linux yt-dlp executable override; never use a Windows `.exe` path. | `bin/yt-dlp` |
| `FFMPEG_BIN` | Linux FFmpeg executable override; never use a Windows `.exe` path. | `bin/ffmpeg` |

## Required for reliable Instagram downloads on Vercel

Vercel runs on datacenter IPs, so anonymous Instagram resolution commonly
returns video-stripped pages. Set one session form plus its CSRF companion.

| Variable | Description |
| --- | --- |
| `INSTAGRAM_SESSIONID` | Instagram `sessionid` cookie value (secret). |
| `INSTAGRAM_CSRFTOKEN` | Instagram `csrftoken` from the same browser session (secret). |
| `INSTAGRAM_COOKIE` | Alternative to the two variables above: full cookie string containing both `sessionid` and `csrftoken` (secret). |
| `INSTAGRAM_DS_USER_ID` | Optional viewer id companion (secret). |

## Optional: external Story provider

Only needed for accounts whose Stories are gated. The built-in chain still
runs when these are absent.

| Variable | Description |
| --- | --- |
| `STORY_PROVIDER_URL` | Provider endpoint, for example `https://api.profilequery.com/v1/profile/stories`. |
| `STORY_PROVIDER_API_KEY` | Provider key (secret). |
| `STORY_PROVIDER` | `auto` (default), `external`, or `puppeteer`. |

## Optional tuning

These already have safe defaults; set them only with a measured reason.

| Variable | Default / purpose |
| --- | --- |
| `RESOLVER_TIMEOUT_MS` | `15000`; clamped to `55000` on Vercel. |
| `PUPPETEER_VIDEO_SETTLE_MS` | `12000`; bounded `500`–`30000`. |
| `PUPPETEER_RESOLVE_DEADLINE_MS` | `45000`; bounded `5000`–`300000`. |
| `RATE_LIMIT_WINDOW_MS` | `60000`. |
| `RATE_LIMIT_MAX_REQUESTS` | `17` resolves per window. |
| `MAX_REQUEST_BODY_SIZE` | JSON body limit in bytes. |
| `AUDIO_PROVIDER_URL` / `AUDIO_PROVIDER_KEY` | Optional dedicated audio resolver; the key is secret. |
| `X_IG_APP_ID` | Optional Instagram app id used by the session helper. |
| `BUILD_VERSION` | Optional build id for `/api/health/ready`; Vercel supplies a commit SHA automatically. |
| `YOUTUBE_RESOLVE_TIMEOUT_MS` | Metadata probe deadline; Vercel caps it at 120 seconds. Default `30000`. |
| `YOUTUBE_DOWNLOAD_TIMEOUT_MS` | Download/transcode deadline; Vercel caps it at 240 seconds. Default `300000`. |
| `YOUTUBE_MAX_DURATION_SECONDS` | Maximum accepted video duration. Default `3600`. |
| `YOUTUBE_MAX_OUTPUT_BYTES` | Maximum prepared output size. Default `536870912`. |
| `MEDIA_RUNTIME_DOWNLOAD` | Set `1` only to explicitly allow runtime binary provisioning; staged binaries are preferred. |
| `RATE_LIMIT_YOUTUBE_MAX_REQUESTS` | Shared YouTube request budget per IP/window. Default `12`. |

## Do not set

- `PORT` — Vercel assigns the port; `server.ts` is not used on Vercel.
- `NODE_ENV` — Vercel sets `production`.
- `VERCEL`, `VERCEL_GIT_COMMIT_SHA` — injected by Vercel.
- `ALLOW_MOCK_CDN`, `ALLOW_STORY_DEBUG` — development/debug only; never enable in production.
- `TRUST_PROXY`, `TRUST_PROXY_HOPS`, `PUPPETEER_RUNTIME`, `DISABLE_BACKGROUND_TIMERS` — Vercel is auto-detected; leave unset unless diagnosing a proxy/runtime issue.

Vercel does not read the local `backend/.env` from GitHub. Enter the required
variables above in the Vercel dashboard. Do not copy Windows `YTDLP_PATH` or
`FFMPEG_BIN` values from local development; leaving both path overrides unset is
the recommended deployment configuration.

## Deployment verification

After deployment, check these endpoints without exposing logs or secrets:

```text
GET /api/health
GET /api/health/ready
GET /api/health/media
```

`/api/health/media` should report Linux-compatible `ytDlpAvailable` and
`ffmpegAvailable` as `true`, and `ytDlpSource`/`ffmpegSource` as `staged` (or
`runtime` if the host omitted the staged files). These checks verify the media
engine only; they cannot prove that YouTube will allow the Vercel egress IP.
