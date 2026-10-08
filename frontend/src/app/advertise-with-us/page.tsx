import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SITE_URL, SUPPORT_EMAIL, SUPPORT_GMAIL_URL } from "@/config/site";

const ADVERTISE_TITLE = "Advertise With Us | Downloadit";
const ADVERTISE_DESCRIPTION =
  "Reach people downloading public Instagram Reels, videos, carousels and audio with Downloadit. Learn about advertising options and how to contact us.";

export const metadata: Metadata = {
  title: { absolute: ADVERTISE_TITLE },
  description: ADVERTISE_DESCRIPTION,
  alternates: { canonical: "/advertise-with-us" },
  openGraph: {
    title: { absolute: ADVERTISE_TITLE },
    description: ADVERTISE_DESCRIPTION,
    type: "website",
    siteName: "Downloadit",
    url: `${SITE_URL}/advertise-with-us`,
    images: [{ url: "/og-downloadit.png", width: 1200, height: 630, alt: "Advertise with Downloadit" }],
  },
  twitter: {
    card: "summary_large_image",
    title: { absolute: ADVERTISE_TITLE },
    description: ADVERTISE_DESCRIPTION,
    images: ["/og-downloadit.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function AdvertiseWithUsPage() {
  return (
    <>
      <Header />
      <main id="main-content" className="flex-1">
        <section className="mx-auto w-full max-w-[720px] px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center text-[14px] font-semibold text-fg-muted transition-colors hover:text-primary"
          >
            ← Back to home
          </Link>
          <h1 className="mt-4 text-[clamp(26px,4vw,40px)] font-bold tracking-[-0.02em] text-fg">
            Advertise With Us
          </h1>
          <p className="mt-2 text-[14px] text-fg-subtle">Last updated: September 2026</p>
          <div className="mt-6 flex flex-col gap-4 text-[16px] leading-[1.75] text-fg-muted">
            <p>
              Downloadit is a free tool people use to save public Instagram Reels, videos,
              carousels, stories and audio. If your product or service fits that audience,
              advertising on Downloadit puts your message in front of them while they
              download.
            </p>
            <h2 className="text-[20px] font-bold text-fg">How advertising works here</h2>
            <p>
              Display advertising on Downloadit is served through Google AdSense,
              including automatic placements across the site. Availability, formats and
              pricing for any direct arrangement depend on current inventory, so every
              request starts with a short conversation.
            </p>
            <h2 className="text-[20px] font-bold text-fg">What we do not accept</h2>
            <p>
              We do not run ads for misleading downloads, fake system warnings,
              adult content, gambling, or anything that mimics Downloadit itself.
              For any direct arrangement, placement stays around the content —
              never inside the input field and never dressed up as a download
              button. Ads must be clearly distinguishable from the downloader
              interface.
            </p>
            <h2 className="text-[20px] font-bold text-fg">What to include in your enquiry</h2>
            <p>
              Three lines are enough: what you sell, why it fits people saving
              Instagram media, and roughly when you want to run. That is all
              that is needed for a first answer about availability — traffic
              figures and rate cards come later, if there is a fit.
            </p>
            <h2 className="text-[20px] font-bold text-fg">Contact</h2>
            <p>
              To ask about availability, tell us briefly what you would like to
              promote and where your audience overlaps with ours. Write to{" "}
              <a
                href={SUPPORT_GMAIL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center break-all font-semibold text-fg transition-colors hover:text-primary"
              >
                {SUPPORT_EMAIL}
              </a>{" "}
              with the subject “Advertising enquiry”.
            </p>
          </div>
          <p className="mt-8 text-[16px] text-fg-muted">
            Prefer the downloader itself?{" "}
            <Link href="/" className="font-semibold text-primary-strong hover:underline">
              Back to the Instagram downloader
            </Link>
            .
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
