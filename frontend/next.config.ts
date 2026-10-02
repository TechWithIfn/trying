import type { NextConfig } from "next";

// Google ad origins observed in production traffic (Auto Ads + sodar +
// DoubleClick). Listed explicitly — no scheme wildcards.
const GOOGLE_AD_SCRIPT = [
  "https://pagead2.googlesyndication.com",
  "https://googleads.g.doubleclick.net",
  "https://*.googlesyndication.com",
  "https://*.adtrafficquality.google",
  "https://www.google.com",
  "https://www.gstatic.com",
].join(" ");

const nextConfig: NextConfig = {
  devIndicators: false,
  // No X-Powered-By fingerprint.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Clickjacking: modern (frame-ancestors) + legacy (X-Frame-Options).
          // The app renders no third-party iframes of its own; ad iframes
          // created by AdSense are governed by frame-src below.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Transport security. Deliberately WITHOUT preload: preload is a
          // one-way, domain-wide commitment (all subdomains, forever) that
          // must be a conscious hosting decision, not a code default.
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          // Popups (e.g. mail compose) keep working; the opener is protected.
          // same-origin would also work today, but allow-popups is the safe
          // default while contact flows use target=_blank.
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          // No COEP: requiring it would break cross-origin ad/media bytes
          // that carry no CORP headers. Documented tradeoff, not an omission.
          {
            key: "Permissions-Policy",
            value: [
              "camera=()",
              "microphone=()",
              "geolocation=()",
              "payment=()",
              "usb=()",
              "fullscreen=(self)",
              "clipboard-read=(self)",
              "clipboard-write=(self)",
            ].join(", "),
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // 'unsafe-inline' is required by Next.js inline bootstrap +
              // the theme-init script AND by AdSense (Google documents it as
              // mandatory). No 'unsafe-eval', no wildcards: most display
              // creatives render without eval; anything needing it fails
              // closed (blank slot) instead of weakening the whole policy.
              `script-src 'self' 'unsafe-inline' ${GOOGLE_AD_SCRIPT}`,
              // SSR style attributes + Tailwind require 'unsafe-inline'.
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.cdninstagram.com https://cdninstagram.com https://*.fbcdn.net https://fbcdn.net https://*.googlesyndication.com https://googleads.g.doubleclick.net https://*.googleusercontent.com https://www.gstatic.com https://*.adtrafficquality.google",
              // Production backend host + local dev origins (unreachable in
              // production). A custom NEXT_PUBLIC_API_BASE_URL needs its host
              // added here.
              "connect-src 'self' http://localhost:3001 http://127.0.0.1:3001 https://backend-chi-orpin-90.vercel.app https://pagead2.googlesyndication.com https://*.adtrafficquality.google",
              // next/font is self-hosted: no Google Fonts request needed.
              "font-src 'self' data:",
              "media-src 'self' blob: http://localhost:3001 http://127.0.0.1:3001 https://backend-chi-orpin-90.vercel.app https://*.cdninstagram.com https://cdninstagram.com https://*.fbcdn.net https://fbcdn.net",
              "frame-src https://*.googlesyndication.com https://googleads.g.doubleclick.net https://www.google.com https://*.adtrafficquality.google",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
              // Trusted Types NOT enforced: AdSense creatives and Next.js
              // hydration both use sinks an allowlist cannot cover. Enforcing
              // would break monetization and the framework itself.
            ].join("; "),
          },
        ],
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    remotePatterns: [
      { protocol: "https", hostname: "*.cdninstagram.com" },
      { protocol: "https", hostname: "cdninstagram.com" },
      { protocol: "https", hostname: "*.fbcdn.net" },
      { protocol: "https", hostname: "fbcdn.net" },
    ],
  },
};

export default nextConfig;
