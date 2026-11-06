"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import Link from "next/link";
import { SUPPORT_EMAIL, supportMailto } from "@/config/site";
import { useLanguage } from "@/i18n";

function LinkColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <nav aria-label={title}>
      <p className="text-[14px] font-bold uppercase tracking-[0.1em] text-fg">{title}</p>
      <ul className="mt-4 space-y-2">
        {links.map((link) => {
          const isPage = link.href.startsWith("/");
          const className = "flex min-h-[44px] items-center gap-2 text-[14px] text-fg-muted transition-colors hover:text-primary";
          return (
            <li key={link.label}>
              {isPage ? (
                <Link href={link.href} className={className}>
                  {link.label}
                </Link>
              ) : (
                <a href={link.href} className={className}>
                  {link.label}
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function SubColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div className="space-y-2">
      <p className="text-[13px] font-medium text-fg-muted uppercase tracking-[0.08em]">{title}</p>
      <ul className="mt-1 space-y-1">
        {links.map((link) => {
          const isPage = link.href.startsWith("/");
          const className = "flex min-h-[40px] items-center gap-2 text-[13px] text-fg-muted transition-colors hover:text-primary";
          return (
            <li key={link.label}>
              {isPage ? (
                <Link href={link.href} className={className}>
                  {link.label}
                </Link>
              ) : (
                <a href={link.href} className={className}>
                  {link.label}
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function Footer() {
  const { t } = useLanguage();
  // Resolved after mount so the statically prerendered HTML (baked at build
  // time) and the first client render are byte-identical — computing the
  // year during render would hydrate-mismatch whenever build year and view
  // year differ.
  const [year, setYear] = useState<number | null>(null);
  useEffect(() => {
    // Deferred (repo convention) to avoid a synchronous setState in effect.
    queueMicrotask(() => {
      setYear(new Date().getFullYear());
    });
  }, []);

  const PRODUCT_LINKS = [
    { label: "Instagram Reels Downloader", href: "/instagram-reels-downloader" },
    { label: "Instagram Video Downloader", href: "/instagram-video-downloader" },
    { label: "Instagram Photo & Carousel Downloader", href: "/instagram-photo-downloader" },
    { label: "Instagram Story Downloader", href: "/instagram-story-downloader" },
    { label: "Instagram Audio Downloader", href: "/instagram-audio-downloader" },
    { label: "Pinterest Video Downloader", href: "/pinterest-video-downloader" },
    { label: "Pinterest Image & Carousel Downloader", href: "/pinterest-image-downloader" },
    { label: "YouTube Video Downloader", href: "/youtube-video-downloader" },
    { label: "Facebook Video Downloader", href: "/facebook-video-downloader" },
    { label: "Twitter/X Video Downloader", href: "/twitter-video-downloader" },
    { label: "Threads Video Downloader", href: "/threads-video-downloader" },
  ];

  const RESOURCE_LINKS = [
    { label: "How It Works", href: "/#how-it-works" },
    { label: "Features", href: "/#features" },
    { label: "FAQ", href: "/#faq" },
    { label: "Help", href: "/help" },
    { label: "Blog", href: "/blog" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ];

  const LEGAL_LINKS = [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "DMCA / Copyright", href: "/dmca" },
    { label: "Disclaimer", href: "/disclaimer" },
    { label: "Advertise", href: "/advertise-with-us" },
  ];

  // Product links split into two balanced subcolumns
  const mid = Math.ceil(PRODUCT_LINKS.length / 2);
  const productLeft = PRODUCT_LINKS.slice(0, mid);
  const productRight = PRODUCT_LINKS.slice(mid);

  // Resource links split into two columns for tablet/mobile
  const resMid = Math.ceil(RESOURCE_LINKS.length / 2);
  const resourceLeft = RESOURCE_LINKS.slice(0, resMid);
  const resourceRight = RESOURCE_LINKS.slice(resMid);

  // Legal links
  const legalLinks = LEGAL_LINKS;

  useEffect(() => {
    // Deferred (repo convention) to avoid a synchronous setState in effect.
    queueMicrotask(() => {
      setYear(new Date().getFullYear());
    });
  }, []);

  return (
    <footer className="mt-20 border-t border-border px-4 py-12 sm:px-6 lg:px-8 xl:px-12">
      <div className="mx-auto max-w-[1200px]">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[1fr_1.2fr_1fr_1fr]">
          {/* Column 1 — Brand */}
          <div>
            <Link href="/" className="inline-flex items-center gap-2.5 hover:text-primary" aria-label={t.footer.homeLabel}>
              <span
                className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
                style={{ background: "var(--brand-gradient)" }}
              >
                <Download className="h-[18px] w-[18px]" strokeWidth={2.2} />
              </span>
              <span className="text-[18px] font-bold text-fg">
                Download<span className="text-primary">it</span>
              </span>
            </Link>
            <p className="mt-3 text-[14px] font-semibold text-fg">
              {t.footer.tagline}
            </p>
            <p className="mt-2 max-w-[300px] text-[14px] leading-[1.65] text-fg-muted">
              {t.footer.desc}
            </p>
            <div className="mt-4">
              <p className="text-[14px] font-bold uppercase tracking-[0.1em] text-fg">{t.footer.email}</p>
              <a
                href={supportMailto()}
                aria-label="Email Downloadit support"
                className="mt-1 inline-flex min-h-[44px] items-center gap-2 break-all text-[14px] font-medium text-fg-muted transition-colors hover:text-primary"
                style={{ overflowWrap: "anywhere" }}
              >
                {SUPPORT_EMAIL}
              </a>
            </div>
          </div>

          {/* Column 2 — Product (two subcolumns) */}
          <div className="flex flex-col lg:flex-row gap-2">
            <SubColumn title="Instagram" links={productLeft} />
            <SubColumn title="Other Platforms" links={productRight} />
          </div>

          {/* Column 3 — Resources (two columns on tablet, stacked on mobile) */}
          <div className="lg:grid lg:grid-cols-2 gap-4">
            <div>
              <SubColumn title="Instagram" links={resourceLeft} />
            </div>
            <div>
              <SubColumn title="Other" links={resourceRight} />
            </div>
          </div>

          {/* Column 4 — Legal */}
          <div>
            <SubColumn title="Legal" links={legalLinks} />
          </div>
        </div>

        {/* Bottom copyright bar */}
        <div className="mt-6 flex flex-col sm:flex-row gap-4 border-t border-border pt-6">
          <div className="text-[14px] text-fg-muted">
            © 2026 Downloadit. All rights reserved.
          </div>
          <div className="text-[14px] text-fg-subtle sm:text-right">
            Made with ♥ for Downloadit.
          </div>
        </div>
      </div>
    </footer>
  );
}