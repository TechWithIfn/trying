import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { SITE_URL } from "@/config/site";

const DMCA_TITLE = "DMCA Policy | Downloadit";
const DMCA_DESCRIPTION =
  "Read the Downloadit DMCA policy for copyright and content removal requests.";

export const metadata: Metadata = {
  title: { absolute: DMCA_TITLE },
  description: DMCA_DESCRIPTION,
  alternates: { canonical: "/dmca" },
  openGraph: {
    title: DMCA_TITLE,
    description: DMCA_DESCRIPTION,
    type: "website",
    siteName: "Downloadit",
    url: `${SITE_URL}/dmca`,
    images: [{ url: "/og-downloadit.png", width: 1200, height: 630, alt: "DMCA / Copyright — Downloadit" }],
  },
  twitter: {
    card: "summary_large_image",
    title: DMCA_TITLE,
    description: DMCA_DESCRIPTION,
    images: ["/og-downloadit.png"],
  },
};

export default function DmcaPage() {
  return (
    <LegalPage title="DMCA / Copyright" updated="October 2026" crumbPath="/dmca">
      <p>
        Downloadit respects the intellectual property rights of others. Only download content
        you own or have permission to save.
      </p>
      <p>
        If you believe content accessible through Downloadit infringes your copyright, you may
        report it via the email link on this page. Please include identification of the
        copyrighted work, the location of the material in question, and your contact
        information so we can review the report.
      </p>
      <p>
        Reports can only concern content reachable through the service. Because private and
        restricted content is never accessed here, only publicly available links can be
        reviewed against a report.
      </p>
    </LegalPage>
  );
}
