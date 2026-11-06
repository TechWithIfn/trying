# Alternative backend hosting

This backend can run as a normal long-lived Node.js service. Vercel remains
the current deployment; this document describes a separate Linux deployment
for testing whether another provider's egress network can serve YouTube
requests without changing the frontend or the API contract.

## What is deployed

The service is the existing Express application:

- `POST /api/youtube/resolve`
- `GET /api/youtube/download`
- all existing Instagram, Pinterest, stream, audio, and health routes

The container uses `node:20-bookworm-slim`, stages native Linux yt-dlp and
FFmpeg during the image build, and starts the existing `dist/server.js`.
No cookies, Google credentials, OAuth tokens, or CAPTCHA-related settings are
used by this deployment.

## Build and run locally

From the `backend/` directory:

```bash
docker build -t downloadit-backend .
docker run --rm -p 3001:3001 \
  -e CORS_ORIGIN=https://www.example.com \
  -e RESOLVER_PROVIDER=puppeteer \
  downloadit-backend
```

The image build needs outbound HTTPS access to npm and the public release
artifacts used by `scripts/ensure-ytdlp.mjs`. The runtime needs outbound HTTPS
access to Instagram, Pinterest, and YouTube. The provider must allow long-lived
HTTP requests and child processes; a serverless function timeout is not
appropriate for YouTube preparation and FFmpeg work.

## Hosting requirements

Choose a Linux container or Node service with:

1. Node.js 20 or the supplied Docker image.
2. At least 1 GB RAM; 2 GB is recommended for Puppeteer plus FFmpeg.
3. A writable temporary directory for in-progress media files.
4. A request timeout of at least 5 minutes for YouTube downloads.
5. Outbound HTTPS and DNS without a provider proxy that truncates long requests.
6. Graceful termination support so in-flight work can drain.
7. HTTPS and a stable public URL.
8. A way to configure secrets server-side without committing them.

Do not use a Windows image for this deployment. The build stages binaries for
the image platform, and `YTDLP_PATH`/`FFMPEG_BIN` should normally remain unset.
If a provider supplies its own binaries, use absolute Linux paths only.

## Environment variables

Required:

```text
PORT=<provider-assigned port, or 3001>
NODE_ENV=production
CORS_ORIGIN=https://your-frontend.example
RESOLVER_PROVIDER=puppeteer
```

Set `TRUST_PROXY=true` and `TRUST_PROXY_HOPS` only when the provider's reverse
proxy rewrites forwarding headers. Keep the existing Instagram provider
configuration and any server-side credentials in the provider's secret store.
Never put those values in `NEXT_PUBLIC_*` variables.

Optional YouTube tuning is already documented in
[`.env.example`](./.env.example). Leave `YTDLP_PATH` and `FFMPEG_BIN` empty
unless the host explicitly provides compatible Linux executables.

## Pointing the existing frontend at this backend

Set this during the frontend build:

```text
NEXT_PUBLIC_API_BASE_URL=https://api.your-backend.example
```

The frontend's request paths and response handling remain unchanged. Set
`CORS_ORIGIN` on the backend to the exact frontend origin (or comma-separated
production origins), without a trailing slash. Redeploy the frontend after
changing this build-time variable.

## Verification checklist

1. `GET /api/health` returns HTTP 200.
2. `GET /api/health/ready` reports available native media engines.
3. A public YouTube URL is resolved through `/api/youtube/resolve`.
4. The same URL is downloaded through `/api/youtube/download`.
5. Instagram Reel/post and Pinterest video/image/carousel flows still work.
6. A YouTube bot-verification response, if it persists, is reported as
   `YOUTUBE_BOT_CHECK`; do not add cookies, CAPTCHA bypasses, or retries.

A different provider may have different egress behavior, but this deployment
does not guarantee that YouTube will allow the traffic.
