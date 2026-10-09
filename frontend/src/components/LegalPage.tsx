import type { ReactNode } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SUPPORT_GMAIL_URL, SUPPORT_EMAIL, SITE_URL } from "@/config/site";

export default function LegalPage({
  title,
  updated,
  children,
  crumbPath,
}: {
  title: string;
  updated: string;
  children: ReactNode;
  /** Canonical path of this page (e.g. "/privacy") for BreadcrumbList markup. */
  crumbPath: string;
}) {
  const breadcrumbJson = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${SITE_URL}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: title,
        item: `${SITE_URL}${crumbPath}`,
      },
    ],
  });
  return (
    <>
      <Header />
      <main id="main-content" className="flex-1">
        <section className="mx-auto w-full max-w-[720px] px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <script
        id={`breadcrumb-${crumbPath.replace(/\//g, "") || "home"}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumbJson }}
      />
      <Link
        href="/"
        className="inline-flex min-h-[44px] items-center text-[14px] font-semibold text-fg-muted transition-colors hover:text-primary"
      >
        ← Back to home
      </Link>
      <h1 className="mt-4 text-[clamp(26px,4vw,40px)] font-bold tracking-[-0.02em] text-fg">
        {title}
      </h1>
      <p className="mt-2 text-[14px] text-fg-subtle">Last updated: {updated}</p>
      <div className="mt-6 flex flex-col gap-4 text-[16px] leading-[1.75] text-fg-muted">
        {children}
      </div>
      <p className="mt-8 text-[14px] text-fg-subtle">
        Related:{" "}
        {[
          { label: "Privacy", href: "/privacy" },
          { label: "Terms", href: "/terms" },
          { label: "DMCA", href: "/dmca" },
          { label: "Disclaimer", href: "/disclaimer" },
        ]
          .filter((l) => l.href !== crumbPath)
          .map((l, i, arr) => (
            <span key={l.href}>
              <Link href={l.href} className="font-semibold text-fg transition-colors hover:text-primary">
                {l.label}
              </Link>
              {i < arr.length - 1 ? " · " : ""}
            </span>
          ))}
      </p>
      <p className="mt-8 text-[16px] text-fg-muted">
        Questions about this page? Contact us at{" "}
        <a
          href={SUPPORT_GMAIL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[44px] items-center break-all font-semibold text-fg transition-colors hover:text-primary"
        >
          {SUPPORT_EMAIL}
        </a>
        .
      </p>
      </section>
      </main>
      <Footer />
    </>
  );
}
