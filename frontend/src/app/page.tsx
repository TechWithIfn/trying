import type { Metadata } from "next";
import HomeClient from "./HomeClient";
import {
  BRAND_DESCRIPTION,
  BRAND_NAME,
  BRAND_TITLE,
  HOME_KEYWORDS,
  HOME_OG_IMAGE_ALT,
  SITE_URL,
  SUPPORT_CONTACT_EMAIL,
} from "@/config/site";

export const metadata: Metadata = {
  title: { absolute: BRAND_TITLE },
  description: BRAND_DESCRIPTION,
  keywords: HOME_KEYWORDS,
  alternates: { canonical: "/" },
  openGraph: {
    title: { absolute: BRAND_TITLE },
    description: BRAND_DESCRIPTION,
    type: "website",
    siteName: BRAND_NAME,
    url: SITE_URL,
    locale: "en_US",
    images: [{ url: "/og-downloadit.png", width: 1200, height: 630, alt: HOME_OG_IMAGE_ALT }],
  },
  twitter: {
    card: "summary_large_image",
    title: { absolute: BRAND_TITLE },
    description: BRAND_DESCRIPTION,
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
            name: BRAND_NAME,
            url: SITE_URL,
            logo: {
              "@type": "ImageObject",
              url: `${SITE_URL}/apple-touch-icon.png`,
            },
            contactPoint: {
              "@type": "ContactPoint",
              contactType: "customer support",
              email: SUPPORT_CONTACT_EMAIL,
              availableLanguage: "English",
            },
          }),
        }}
      />
    </>
  );
}
