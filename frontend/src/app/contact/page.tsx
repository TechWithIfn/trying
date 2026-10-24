import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import ProseSection from "@/components/ProseSection";
import { SITE_URL, SUPPORT_EMAIL, supportMailto } from "@/config/site";

const CONTACT_TITLE = "Contact Downloadit – Support & Feedback";
const CONTACT_DESCRIPTION =
  "Contact Downloadit for technical support, broken download reports, general questions and copyright concerns.";

export const metadata: Metadata = {
  title: { absolute: CONTACT_TITLE },
  description: CONTACT_DESCRIPTION,
  alternates: { canonical: "/contact" },
  openGraph: {
    title: CONTACT_TITLE,
    description: CONTACT_DESCRIPTION,
    type: "website",
    siteName: "Downloadit",
    url: `${SITE_URL}/contact`,
    images: [{ url: "/og-downloadit.png", width: 1200, height: 630, alt: "Contact — Downloadit" }],
  },
  twitter: {
    card: "summary_large_image",
    title: CONTACT_TITLE,
    description: CONTACT_DESCRIPTION,
    images: ["/og-downloadit.png"],
  },
};

function MailLink({ subject, children }: { subject: string; children: React.ReactNode }) {
  return (
    <a
      href={supportMailto(subject)}
      aria-label="Email Downloadit support"
      className="inline-flex min-h-[44px] items-center break-all font-semibold text-fg transition-colors hover:text-primary"
      style={{ overflowWrap: "anywhere" }}
    >
      {children}
    </a>
  );
}

export default function ContactPage() {
  return (
    <>
      <Header />
      <main id="main-content" className="flex-1">
        <Breadcrumb
          items={[
            { name: "Home", path: "/" },
            { name: "Contact Downloadit", path: "/contact" },
          ]}
          containerClassName="mx-auto w-full max-w-[720px] px-4 pt-4 sm:px-6"
        />
        <section className="mx-auto w-full max-w-[720px] px-4 pb-20 pt-2 sm:px-6 sm:pt-4">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center text-[14px] font-semibold text-fg-muted transition-colors hover:text-primary"
          >
            ← Back to home
          </Link>
          <h1 className="mt-4 text-[clamp(26px,4vw,40px)] font-bold tracking-[-0.02em] text-fg">
            Contact Downloadit
          </h1>
          <p className="mt-2 text-[14px] text-fg-subtle">Last updated: October 2026</p>
          <div className="mt-6 flex flex-col gap-4 text-[16px] leading-[1.75] text-fg-muted">
          <ProseSection>
            <p>
              Everything support-related runs over plain email — there is no
              ticket system, no live chat and no contact form to fill in. Write
              to <MailLink subject="Downloadit query">{SUPPORT_EMAIL}</MailLink>{" "}
              and your message gets read by the person who actually runs the
              site. We reply within 1–2 business days. A little detail in the
              first email saves a round trip, so include these three things:
            </p>
            <ul className="list-disc space-y-1 pl-6">
              <li>The exact link you tried.</li>
              <li>What happened instead of a download (the message you saw).</li>
              <li>Your device and browser.</li>
            </ul>
            <h2 className="text-[20px] font-bold text-fg">Technical support</h2>
            <p>
              Something broken that should work — a public link that resolves
              to an error, a preview that never loads, a download that keeps
              failing. Send the link you tried, the exact message you got, and
              your device and browser. Most reports turn out to be expired
              links or non-public content, and those two lines are usually
              enough to tell which it is. If you have not already, the{" "}
              <Link href="/help" className="font-semibold text-fg transition-colors hover:text-primary">Help page</Link>{" "}
              covers the common causes first.
            </p>
            <h2 className="text-[20px] font-bold text-fg">Broken download reports</h2>
            <p>
              Same address, with one extra check before you write: open the
              link in a private browser window while logged out of Instagram.
              If it does not open there, the content is not public and no
              downloader can fetch it — that is the answer, no email needed.
              If it does open and Downloadit still fails, send the link with
              the subject “Broken download” to{" "}
              <MailLink subject="Broken download">{SUPPORT_EMAIL}</MailLink>.
            </p>
            <h2 className="text-[20px] font-bold text-fg">General questions</h2>
            <p>
              Anything that is not broken — how a feature behaves, whether a
              link type is supported, questions about the service itself.
              Write to{" "}
              <MailLink subject="General question">{SUPPORT_EMAIL}</MailLink>{" "}
              with the subject “General question”. Short questions get short
              answers; that is a feature, not rudeness.
            </p>
            <h2 className="text-[20px] font-bold text-fg">Copyright concerns</h2>
            <p>
              If you believe content reachable through Downloadit infringes
              your copyright, please use the formal takedown process on the{" "}
              <Link href="/dmca" className="font-semibold text-fg transition-colors hover:text-primary">DMCA page</Link>{" "}
              instead of this inbox — it lists exactly what a complete notice
              must contain, and complete notices are reviewed within 48–72
              hours. Reports sent here without those pieces cannot be
              reviewed and will be redirected to the DMCA process.
            </p>
          </ProseSection>
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
