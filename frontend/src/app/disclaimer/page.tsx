import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { SITE_URL } from "@/config/site";

const DISCLAIMER_TITLE = "Disclaimer | Downloadit";
const DISCLAIMER_DESCRIPTION =
  "Read the Downloadit disclaimer covering third-party content, Instagram links and responsible use of the service.";

export const metadata: Metadata = {
  title: { absolute: DISCLAIMER_TITLE },
  description: DISCLAIMER_DESCRIPTION,
  alternates: { canonical: "/disclaimer" },
  openGraph: {
    title: DISCLAIMER_TITLE,
    description: DISCLAIMER_DESCRIPTION,
    type: "website",
    siteName: "Downloadit",
    url: `${SITE_URL}/disclaimer`,
    images: [{ url: "/og-downloadit.png", width: 1200, height: 630, alt: "Disclaimer — Downloadit" }],
  },
  twitter: {
    card: "summary_large_image",
    title: DISCLAIMER_TITLE,
    description: DISCLAIMER_DESCRIPTION,
    images: ["/og-downloadit.png"],
  },
};

export default function DisclaimerPage() {
  return (
    <LegalPage title="Disclaimer" updated="October 2026" crumbPath="/disclaimer">
      <p>Downloadit is not affiliated with Instagram or Meta.</p>
      <p>
        The tool only works with publicly available content and does not bypass logins,
        private profiles, or platform access controls. You are responsible for ensuring you
        have the right to download and use any media you save.
      </p>
      <p>
        The service depends on Instagram&apos;s own availability and behavior, which change
        without notice. Availability, results and accuracy are therefore not guaranteed, and
        the service may be interrupted or modified at any time. The service is provided
        as-is, without warranties of any kind.
      </p>
    </LegalPage>
  );
}
