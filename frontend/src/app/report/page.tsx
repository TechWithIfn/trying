import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import ReportForm from "@/components/ReportForm";
import { SITE_URL } from "@/config/site";

const REPORT_TITLE = "Report Content – Copyright & Takedown | Downloadit";
const REPORT_DESCRIPTION =
  "Report copyright, privacy or broken-link issues to Downloadit. Send the content URL and details through our takedown request form.";

export const metadata: Metadata = {
  title: { absolute: REPORT_TITLE },
  description: REPORT_DESCRIPTION,
  alternates: { canonical: "/report" },
  robots: { index: true, follow: true },
  openGraph: {
    title: REPORT_TITLE,
    description: REPORT_DESCRIPTION,
    url: `${SITE_URL}/report`,
    type: "website",
    images: [{ url: "/og-downloadit.png", width: 1200, height: 630, alt: "Report content – Downloadit" }],
  },
  twitter: {
    card: "summary_large_image",
    title: REPORT_TITLE,
    description: REPORT_DESCRIPTION,
    images: ["/og-downloadit.png"],
  },
};

export default function ReportPage() {
  return (
    <>
      <Header showBreadcrumbs={false} />
      <main id="main-content" className="flex-1">
        <Breadcrumb
          items={[
            { name: "Home", path: "/" },
            { name: "Report Content", path: "/report" },
          ]}
          containerClassName="mx-auto w-full max-w-[760px] px-4 pt-4 sm:px-6"
        />
        <section className="mx-auto w-full max-w-[760px] px-4 pb-20 pt-2 sm:px-6 sm:pt-4">
          <h1 className="text-[clamp(26px,4vw,40px)] font-bold tracking-[-0.02em] text-fg">
            Report content or request a takedown
          </h1>
          <p className="mt-2 text-[14px] text-fg-subtle">Last updated: November 2026</p>
          <p className="mt-5 text-[16px] leading-[1.75] text-fg-muted">
            Downloadit does not host media. It resolves links that platforms
            already serve publicly. If a link reaches content that should not be
            available, or if you own the rights and want it removed from the
            service, tell us below. Reports are reviewed in good faith, and
            privacy or copyright issues are prioritised.
          </p>
          <ReportForm />
          <div className="mt-10 rounded-2xl border border-border bg-card p-5 text-[14px] leading-relaxed text-fg-muted">
            <h2 className="text-[18px] font-bold text-fg">Before you report</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Open the link in a logged-out browser window. If it asks for a login, it is private content and must not be downloaded.</li>
              <li>For copyright notices, include the exact URL, the work you own, and a statement made in good faith.</li>
              <li>Never send passwords, session cookies, or identity documents through this form.</li>
            </ul>
            <p className="mt-3">
              You can also read the{" "}
              <Link href="/dmca" className="font-semibold text-primary-strong hover:underline">DMCA policy</Link>{" "}
              or{" "}
              <Link href="/contact" className="font-semibold text-primary-strong hover:underline">contact page</Link>.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
