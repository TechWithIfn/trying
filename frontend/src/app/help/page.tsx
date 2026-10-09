import type { Metadata } from "next";
import HelpClient from "./HelpClient";
import { SITE_URL } from "@/config/site";

const HELP_TITLE = "How to Download Instagram Reels, Videos & Carousels | Downloadit";
const HELP_DESCRIPTION =
  "Learn how to use Downloadit to download public Instagram Reels, videos, carousels, Stories and audio quickly and easily.";

export const metadata: Metadata = {
  title: { absolute: HELP_TITLE },
  description: HELP_DESCRIPTION,
  alternates: { canonical: "/help" },
  openGraph: {
    title: HELP_TITLE,
    description: HELP_DESCRIPTION,
    type: "website",
    siteName: "Downloadit",
    url: `${SITE_URL}/help`,
    images: [
      {
        url: "/og-downloadit.png",
        width: 1200,
        height: 630,
        alt: "Help & Guide — Downloadit",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: HELP_TITLE,
    description: HELP_DESCRIPTION,
    images: ["/og-downloadit.png"],
  },
};

export default function HelpPage() {
  return (
    <>
      <script
        id="breadcrumb-help"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: `${SITE_URL}/`,
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Help",
                item: `${SITE_URL}/help`,
              },
            ],
          }),
        }}
      />
      <HelpClient />
    </>
  );
}
