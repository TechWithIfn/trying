import type { Metadata } from "next";
import HelpClient from "./HelpClient";
import { SITE_URL } from "@/config/site";

const HELP_TITLE = "Help Center – How to Download Public Media | Downloadit";
const HELP_DESCRIPTION =
  "How to use Downloadit for Instagram, Pinterest, Facebook, Twitter/X and Threads, plus fixes for common download errors and format questions.";

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
  return <HelpClient />;
}
