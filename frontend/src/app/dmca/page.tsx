import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { SITE_URL, SUPPORT_EMAIL, supportMailto } from "@/config/site";

const DMCA_TITLE = "DMCA Policy | Downloadit";
const DMCA_DESCRIPTION =
  "How to submit a copyright takedown notice to Downloadit, what to include, response times, counter-notices, and our repeat infringer policy.";

export const metadata: Metadata = {
  title: { absolute: DMCA_TITLE },
  description: DMCA_DESCRIPTION,
  alternates: { canonical: "/dmca" },
  robots: {
    index: true,
    follow: true,
  },
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

const DMCA_MAILTO = supportMailto("DMCA Notice");

export default function DmcaPage() {
  return (
    <LegalPage title="DMCA / Copyright" updated="October 2026" crumbPath="/dmca">
      <h2 className="text-[20px] font-bold text-fg">Our position</h2>
      <p>
        Downloadit respects the intellectual property rights of others.
        Downloadit only processes publicly available links: paste a link, and
        the service resolves media that Instagram, Pinterest or YouTube already serves publicly. It
        does not host any media files, does not store copies of
        anyone&apos;s content, and does not bypass logins, private profiles,
        or platform access controls.
      </p>
      <p>
        Only download content you own or have permission to save. If you
        believe content reachable through Downloadit infringes your copyright,
        use the takedown process below.
      </p>

      <h2 className="text-[20px] font-bold text-fg">How to submit a takedown notice</h2>
      <p>
        Send your notice to{" "}
        <a
          href={DMCA_MAILTO}
          aria-label="Email Downloadit support"
          className="inline-flex min-h-[44px] items-center break-all font-semibold text-fg transition-colors hover:text-primary"
          style={{ overflowWrap: "anywhere" }}
        >
          {SUPPORT_EMAIL}
        </a>{" "}
        with the subject line “DMCA Notice”. To be reviewed, your notice must
        include all six of the following:
      </p>
      <ol className="list-decimal space-y-2 pl-6">
        <li>
          <strong className="text-fg">Identify the copyrighted work.</strong>{" "}
          Describe the work you own (for example, the photo, video, or
          recording) and, where helpful, include a link to an authorized
          copy of it.
        </li>
        <li>
          <strong className="text-fg">Give the exact URL(s) of the material.</strong>{" "}
          Provide the specific Downloadit or Instagram link(s) where the
          allegedly infringing material can be found, so it can be located
          without guesswork.
        </li>
        <li>
          <strong className="text-fg">Your contact details.</strong> Your full
          name, postal address, email address, and phone number.
        </li>
        <li>
          <strong className="text-fg">A good-faith statement.</strong> A
          statement that you have a good-faith belief the use of the material
          is not authorized by the copyright owner, its agent, or the law.
        </li>
        <li>
          <strong className="text-fg">An accuracy statement under penalty of perjury.</strong>{" "}
          A statement that the information in the notice is accurate and that
          you are the copyright owner or authorized to act on the
          owner&apos;s behalf.
        </li>
        <li>
          <strong className="text-fg">Your signature.</strong> A physical or
          electronic signature (typing your full name counts as an electronic
          signature).
        </li>
      </ol>
      <p>
        Notices missing any of these pieces cannot be acted on, and you will be
        asked to resend a complete notice.
      </p>

      <h2 className="text-[20px] font-bold text-fg">Response time</h2>
      <p>
        Complete notices are reviewed in the order received. We aim to review
        every complete notice within 48–72 hours and will reply to the email
        address the notice came from. If valid, access to the reported
        material through the service is disabled. Incomplete notices are
        answered with a request for the missing pieces, which restarts the
        review window once received.
      </p>

      <h2 className="text-[20px] font-bold text-fg">Counter-notice procedure</h2>
      <p>
        If material you believe you have the right to share was disabled
        following a notice, you may send a counter-notice to the same address
        above with the subject line “DMCA Counter-Notice”. It must include:
      </p>
      <ol className="list-decimal space-y-2 pl-6">
        <li>
          <strong className="text-fg">Identify the disabled material</strong>{" "}
          and the URL(s) where it appeared before it was disabled.
        </li>
        <li>
          <strong className="text-fg">Your contact details</strong> — full
          name, postal address, email address, and phone number.
        </li>
        <li>
          <strong className="text-fg">A consent statement</strong> agreeing to
          the jurisdiction of the courts for your address (or any judicial
          district where you can be found), and agreeing to accept service of
          process from the person who submitted the original notice.
        </li>
        <li>
          <strong className="text-fg">A good-faith statement under penalty of perjury</strong>{" "}
          that the material was removed by mistake or misidentification.
        </li>
        <li>
          <strong className="text-fg">Your physical or electronic signature.</strong>
        </li>
      </ol>
      <p>
        Valid counter-notices are forwarded to the original complainant. If
        they do not confirm court action, access may be restored.
      </p>

      <h2 className="text-[20px] font-bold text-fg">Repeat infringer policy</h2>
      <p>
        Accounts or sources linked to repeated, valid infringement reports
        lose access to the service. Because Downloadit has no user accounts,
        this is enforced against repeat report subjects and abusive request
        patterns: material that is repeatedly and validly reported stays
        disabled, and anyone submitting knowingly false notices or
        counter-notices is ignored and may be blocked from further contact.
      </p>

      <h2 className="text-[20px] font-bold text-fg">A final note</h2>
      <p>
        Downloadit is an independent service and is not affiliated with,
        endorsed by, or sponsored by Instagram, Meta, Pinterest or YouTube/Google. Users must only
        download content they own or have permission to reuse — see the{" "}
        <Link href="/terms" className="font-semibold text-fg transition-colors hover:text-primary">Terms</Link>{" "}
        and{" "}
        <Link href="/disclaimer" className="font-semibold text-fg transition-colors hover:text-primary">Disclaimer</Link>{" "}
        for the full rules.
      </p>
    </LegalPage>
  );
}
