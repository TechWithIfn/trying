import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { SITE_URL } from "@/config/site";

const TERMS_TITLE = "Terms of Service | Downloadit";
const TERMS_DESCRIPTION =
  "Read the Downloadit Terms of Service covering acceptable use and limitations of the service.";

export const metadata: Metadata = {
  title: { absolute: TERMS_TITLE },
  description: TERMS_DESCRIPTION,
  alternates: { canonical: "/terms" },
  openGraph: {
    title: TERMS_TITLE,
    description: TERMS_DESCRIPTION,
    type: "website",
    siteName: "Downloadit",
    url: `${SITE_URL}/terms`,
    images: [{ url: "/og-downloadit.png", width: 1200, height: 630, alt: "Terms of Service — Downloadit" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TERMS_TITLE,
    description: TERMS_DESCRIPTION,
    images: ["/og-downloadit.png"],
  },
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="October 2026" crumbPath="/terms">
      <p>
        Downloadit is a tool for downloading publicly available media that you have the right
        to save, for personal use.
      </p>
      <p>
        You agree not to misuse the service, attempt to access non-public content through it,
        or use it in any way that violates applicable law or the rights of others. Automated,
        abusive or excessive use that degrades the service for others is not allowed, and
        requests may be rate-limited to keep the service usable.
      </p>
      <p>
        The service is provided as-is, without warranties of any kind. Availability of any
        given link depends on the source platform and its own access rules. Media links
        expire, individual features such as audio extraction can be temporarily unavailable,
        and upstream changes can interrupt resolution — uninterrupted or error-free operation
        is not promised.
      </p>
    </LegalPage>
  );
}
