import type { Metadata, Viewport } from "next";
import { Poppins, Lora } from "next/font/google";
import Script from "next/script";
import { LanguageProvider } from "@/i18n";
import ScrollToTop from "@/components/ScrollToTop";
import BackToTop from "@/components/BackToTop";
import {
  BRAND_DESCRIPTION,
  BRAND_NAME,
  BRAND_TITLE,
  HOME_OG_IMAGE_ALT,
  SITE_URL,
} from "@/config/site";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  // Only 600 italic is used (hero title accent, font-semibold italic).
  // Loading 500 as well would cost an extra render-blocking woff2 + preload
  // for a weight nothing renders.
  weight: ["600"],
  style: ["italic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: BRAND_TITLE,
    template: `%s | ${BRAND_NAME}`,
  },
  description: BRAND_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: BRAND_TITLE,
    description: BRAND_DESCRIPTION,
    type: "website",
    siteName: BRAND_NAME,
    url: SITE_URL,
    locale: "en_US",
    images: [
      {
        url: "/og-downloadit.png",
        width: 1200,
        height: 630,
        alt: HOME_OG_IMAGE_ALT,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND_TITLE,
    description: BRAND_DESCRIPTION,
    images: ["/og-downloadit.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: [
      {
        url: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcut: "/favicon.ico",
  },
  manifest: "/manifest.webmanifest",
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  // Single light theme — one theme-color, no media variants.
  themeColor: "#f5f4fa",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${lora.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Single light theme: tell browsers and form controls never to
            apply dark styling. No dark class or data-theme is ever added. */}
        <meta name="color-scheme" content="light" />
        {/* Google AdSense (Auto Ads): lazyOnload keeps the ~250KB ad stack
            off the critical path — it must never compete with hero paint,
            fonts, or hydration. Ads render once the page is interactive. */}
        <Script
          id="google-adsense"
          strategy="lazyOnload"
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8543183124286362"
          crossOrigin="anonymous"
        />

        {/* Website Structured Data. Plain <script> tags so the JSON-LD is
            server-rendered for crawlers — next/script only injects it after
            hydration, which bots never see. */}
        <script
          id="website-structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "@id": `${SITE_URL}/#website`,
              name: BRAND_NAME,
              alternateName: [
                "Downloadit.pro",
                "Downloadit Instagram Downloader",
              ],
              url: SITE_URL,
              inLanguage: "en",
            }),
          }}
        />

        {/* Web Application Structured Data (factual claims only: no ratings,
            reviews, prices, awards, or social profiles) */}
        <script
          id="webapp-structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "@id": `${SITE_URL}/#webapplication`,
              name: BRAND_NAME,
              url: SITE_URL,
              applicationCategory: "MultimediaApplication",
              operatingSystem: "Web",
              inLanguage: "en",
              description: BRAND_DESCRIPTION,
            }),
          }}
        />

        {/* Scripting flag: marks scripting as active so CSS can keep content
            visible (ScrollReveal's opacity:0 state) when JS is unavailable.
            (Theme switching was removed — the site is dark-only.) */}
        <Script
          id="downloadit-js-flag"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{document.documentElement.classList.add('js');}catch(e){}})();`,
          }}
        />
      </head>

      <body className="min-h-full flex flex-col antialiased">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <LanguageProvider>
          <ScrollToTop />
          {children}
          <BackToTop />
        </LanguageProvider>
      </body>
    </html>
  );
}