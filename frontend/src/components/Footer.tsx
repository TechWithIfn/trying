"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, Globe } from "lucide-react";
import { useLanguage, LANGUAGES } from "@/i18n";
import {
  FacebookIcon,
  InstagramIcon,
  PinterestIcon,
  ThreadsIcon,
  TwitterIcon,
  YouTubeIcon,
} from "@/components/ToolCategoryDropdown";

const POPULAR_DOWNLOADERS = [
  { label: "Instagram Downloader", href: "/instagram-video-downloader", Icon: InstagramIcon, color: "#ec5fa8" },
  { label: "Pinterest Downloader", href: "/pinterest-video-downloader", Icon: PinterestIcon, color: "#e60023" },
  { label: "Facebook Downloader", href: "/facebook-video-downloader", Icon: FacebookIcon, color: "#1877f2" },
  { label: "Twitter/X Downloader", href: "/twitter-video-downloader", Icon: TwitterIcon, color: "#0f172a" },
  { label: "Threads Downloader", href: "/threads-video-downloader", Icon: ThreadsIcon, color: "#0f172a" },
] as const;

const COMPANY_LINKS = [
  { label: "About Us", href: "/about" },
  { label: "Contact Us", href: "/contact" },
  { label: "Blog", href: "/blog" },
  { label: "Help Center", href: "/help" },
] as const;

const LEGAL_LINKS = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Disclaimer", href: "/disclaimer" },
  { label: "DMCA / Copyright Policy", href: "/dmca" },
] as const;

const FOOTER_HEADING =
  "text-[12px] font-bold uppercase tracking-[0.12em] text-fg";

export default function Footer() {
  const { t, lang, setLang } = useLanguage();
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setYear(new Date().getFullYear());
    });
  }, []);

  return (
    <footer className="mt-14 border-t border-border bg-card/60 px-4 pb-10 pt-12 sm:mt-16 sm:px-6 sm:pt-14 lg:px-8 xl:px-12">
      <div className="mx-auto max-w-[1240px]">
        {/* 4-column organized layout */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
          {/* Column 1 – Downloadit */}
          <div className="space-y-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 text-fg no-underline"
              aria-label="Downloadit.pro homepage"
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-xs"
                style={{ background: "var(--brand-gradient)" }}
              >
                <Download className="h-5 w-5" strokeWidth={2.4} />
              </span>
              <span className="text-[20px] font-bold tracking-tight">
                Download<span className="text-primary">it</span>.pro
              </span>
            </Link>

            <p className="text-[13px] leading-[1.7] text-fg-muted max-w-[280px]">
              Fast, free, and secure multi-platform media downloader. Save public videos, photos, reels, and audio from your favorite platforms in original quality with zero login.
            </p>

            {/* Supported platform icons */}
            <div className="pt-1">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
                Supported Platforms
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {POPULAR_DOWNLOADERS.map(({ label, href, Icon, color }) => (
                  <Link
                    key={href}
                    href={href}
                    aria-label={label}
                    title={label}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-fg-muted transition-all hover:scale-110 hover:border-primary/40 hover:bg-primary-light"
                    style={{ color }}
                  >
                    <Icon size={17} />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Column 2 – Popular Downloaders */}
          <nav aria-label="Popular Downloaders" className="space-y-3">
            <h2 className={FOOTER_HEADING}>Popular Downloaders</h2>
            <ul className="space-y-2">
              {POPULAR_DOWNLOADERS.map(({ label, href, Icon, color }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="group flex items-center gap-2.5 text-[13.5px] text-fg-muted transition-colors hover:text-primary"
                  >
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-bg transition-colors group-hover:bg-primary-light"
                      style={{ color }}
                      aria-hidden="true"
                    >
                      <Icon size={13} />
                    </span>
                    <span>{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Column 3 – Company */}
          <nav aria-label="Company Links" className="space-y-3">
            <h2 className={FOOTER_HEADING}>Company</h2>
            <ul className="space-y-2">
              {COMPANY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="flex items-center text-[13.5px] text-fg-muted transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Column 4 – Legal */}
          <nav aria-label="Legal Links" className="space-y-3">
            <h2 className={FOOTER_HEADING}>Legal &amp; Policy</h2>
            <ul className="space-y-2">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="flex items-center text-[13.5px] text-fg-muted transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="pt-2">
              <p className="text-[11.5px] leading-relaxed text-fg-subtle">
                Downloadit is an independent utility and is not affiliated with Instagram, Meta, Pinterest, YouTube, Google, or X Corp.
              </p>
            </div>
          </nav>
        </div>

        {/* Bottom Section */}
        <div className="mt-10 flex flex-col gap-4 border-t border-border pt-6 text-[12.5px] text-fg-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year ?? 2026} Downloadit.pro. All rights reserved.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-fg-muted">
              <Globe className="h-3.5 w-3.5" />
              <span>Language:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setLang(l.code)}
                  className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
                    lang === l.code
                      ? "bg-primary text-white font-semibold"
                      : "text-fg-muted hover:bg-primary-light hover:text-primary"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
