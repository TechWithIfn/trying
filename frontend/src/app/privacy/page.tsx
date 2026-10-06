import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { SITE_URL } from "@/config/site";

const PRIVACY_TITLE = "Privacy Policy | Downloadit";
const PRIVACY_DESCRIPTION =
  "Read the Downloadit Privacy Policy to understand how information is handled when you use our Instagram downloader.";

export const metadata: Metadata = {
  title: { absolute: PRIVACY_TITLE },
  description: PRIVACY_DESCRIPTION,
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: PRIVACY_TITLE,
    description: PRIVACY_DESCRIPTION,
    type: "website",
    siteName: "Downloadit",
    url: `${SITE_URL}/privacy`,
    images: [{ url: "/og-downloadit.png", width: 1200, height: 630, alt: "Privacy Policy — Downloadit" }],
  },
  twitter: {
    card: "summary_large_image",
    title: PRIVACY_TITLE,
    description: PRIVACY_DESCRIPTION,
    images: ["/og-downloadit.png"],
  },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="October 2026" crumbPath="/privacy">
      <p>
        Downloadit does not require an account, sign-up, or login. We do not keep a download
        history in your browser.
      </p>
      <p>
        When you paste a link, it is sent to our backend solely to resolve publicly available
        media and deliver your download. Links and resolved media references are kept only
        transiently to complete your request and expire automatically.
      </p>
      <p>
        Your browser keeps two small preferences on your device — the theme (light or dark)
        and the language you picked — so the site remembers them between visits. These never
        leave your device and are not used to identify you.
      </p>
      <p>
        Advertising on this site is served through Google AdSense. Google and its partners
        may use cookies to serve ads based on your visits to this and other sites. You can
        opt out of personalized advertising in your Google account&apos;s ad settings.
      </p>
      <p>
        We do not sell personal information. If you have any privacy questions, contact us
        using the email link on this page.
      </p>
    </LegalPage>
  );
}
