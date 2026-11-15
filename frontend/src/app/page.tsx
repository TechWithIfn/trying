import type { Metadata } from "next";
import HomeClient from "./HomeClient";
import {
  BRAND_NAME,
  HOME_OG_IMAGE_ALT,
  SITE_URL,
  SUPPORT_EMAIL,
  SOCIAL_PROFILES,
} from "@/config/site";

const HOME_TITLE = "Instagram, Pinterest, Facebook, X & Threads Downloader";
const HOME_DESCRIPTION =
  "Download Instagram Reels, Pinterest videos, Facebook & X posts, and Threads media for free in HD. No login, no watermark, no app needed.";

export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  alternates: {
    canonical: SITE_URL,
    languages: {
      en: SITE_URL,
      hi: `${SITE_URL}/hi`,
      "x-default": SITE_URL,
    },
  },
  openGraph: {
    title: { absolute: HOME_TITLE },
    description: HOME_DESCRIPTION,
    type: "website",
    siteName: BRAND_NAME,
    url: SITE_URL,
    locale: "en_US",
    images: [{ url: "/og-downloadit.png", width: 1200, height: 630, alt: HOME_OG_IMAGE_ALT }],
  },
  twitter: {
    card: "summary_large_image",
    title: { absolute: HOME_TITLE },
    description: HOME_DESCRIPTION,
    images: ["/og-downloadit.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function Home() {
  return (
    <>
      <HomeClient />
      {/* Organization structured data — homepage only. Factual claims only:
          name, URL, logo and the public support address; no social profiles
          exist, so none are listed. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "@id": `${SITE_URL}/#organization`,
            name: BRAND_NAME,
            url: SITE_URL,
            logo: {
              "@type": "ImageObject",
              url: `${SITE_URL}/apple-touch-icon.png`,
            },
            contactPoint: {
              "@type": "ContactPoint",
              contactType: "customer support",
              email: SUPPORT_EMAIL,
              availableLanguage: ["English", "Hindi"],
            },
            ...(SOCIAL_PROFILES.length
              ? { sameAs: SOCIAL_PROFILES.map((profile) => profile.href) }
              : {}),
          }),
        }}
      />
    </>
  );
}
