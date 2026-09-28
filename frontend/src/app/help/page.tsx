import type { Metadata } from "next";
import HelpClient from "./HelpClient";
import { SITE_URL } from "@/config/site";

export const metadata: Metadata = {
  title: "Help & Guide | Downloadit",
  description:
    "Learn how to use Downloadit, troubleshoot common download issues, and find answers to frequently asked questions.",
  alternates: { canonical: "/help" },
  openGraph: {
    title: "Help & Guide | Downloadit",
    description:
      "Learn how to use Downloadit, troubleshoot common download issues, and find answers to frequently asked questions.",
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
    title: "Help & Guide | Downloadit",
    description:
      "Learn how to use Downloadit, troubleshoot common download issues, and find answers to frequently asked questions.",
    images: ["/og-downloadit.png"],
  },
};

export default function HelpPage() {
  return <HelpClient />;
}
