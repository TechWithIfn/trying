# Vercel backend environment variables

Non-secret checklist for the Vercel project that serves `backend/`
(Settings → Environment Variables). Values are set only in Vercel; never commit
them or paste them into this file.

## Required

| Variable | Description | Safe example |
| --- | --- | --- |
| `RESOLVER_PROVIDER` | Resolver used by Instagram and Pinterest. `puppeteer` needs no API key and is the working local value. | `puppeteer` |
| `CORS_ORIGIN` | Exact browser origins allowed to call the backend, comma-separated, no trailing slash. Must match the deployed frontend. | `https://www.downloadit.pro,https://downloadit.pro` |
| `YTDLP_PATH` | Linux yt-dlp executable packaged in `backend/bin`; never use a Windows `.exe` path. | `bin/yt-dlp` |
| `FFMPEG_BIN` | Linux FFmpeg executable packaged in `backend/bin`; never use a Windows `.exe` path. | `bin/ffmpeg` |

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

## Do not set

- `PORT` — Vercel assigns the port; `server.ts` is not used on Vercel.
- `NODE_ENV` — Vercel sets `production`.
- `VERCEL`, `VERCEL_GIT_COMMIT_SHA` — injected by Vercel.
- `ALLOW_MOCK_CDN`, `ALLOW_STORY_DEBUG` — development/debug only; never enable in production.
- `TRUST_PROXY`, `TRUST_PROXY_HOPS`, `PUPPETEER_RUNTIME`, `DISABLE_BACKGROUND_TIMERS` — Vercel is auto-detected; leave unset unless diagnosing a proxy/runtime issue.

Vercel does not read the local `backend/.env` from GitHub. Every value above
must be entered separately in the Vercel dashboard.
