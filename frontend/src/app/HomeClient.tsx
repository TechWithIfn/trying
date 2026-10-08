"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import HeroDownloader, { type DownloaderTab } from "@/components/HeroDownloader";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";
import { useLanguage } from "@/i18n";
import {
  Globe,
  Smartphone,
  Eye,
  LayoutGrid,
  ShieldCheck,
  Film,
  Video,
  Image as ImageIcon,
  Layers,
  Clock,
  Music,
  Link2,
  Search,
  Download,
} from "lucide-react";

const QUICK_ICONS = [Globe, Smartphone, Eye, LayoutGrid];

const MEDIA_ROWS = [
  { href: "/instagram-reels-downloader", label: "Reels", note: "Supported video downloads", Icon: Film },
  { href: "/instagram-video-downloader", label: "Videos", note: "Supported video posts", Icon: Video },
  { href: "/instagram-photo-downloader", label: "Carousels", note: "Supported image posts", Icon: ImageIcon },
  { href: "/instagram-photo-downloader", label: "Carousel posts", note: "Individual supported images", Icon: Layers },
  { href: "/instagram-story-downloader", label: "Stories", note: "Active public Stories", Icon: Clock },
  { href: "/instagram-audio-downloader", label: "Audio", note: "MP3 extraction", Icon: Music },
] as const;

const FORMAT_ROWS = [
  { label: "Video", value: "MP4", Icon: Video },
  { label: "Images", value: "JPG, PNG or WebP when provided", Icon: ImageIcon },
  { label: "Audio", value: "MP3", Icon: Music },
] as const;

const FLOW_STAGES = [
  { n: "01", title: "Paste link", desc: "Drop in a supported public link.", Icon: Link2 },
  { n: "02", title: "Check media", desc: "The service identifies what is available.", Icon: Search },
  { n: "03", title: "Preview", desc: "Review the file before saving.", Icon: Eye },
  { n: "04", title: "Save", desc: "Download it to your device.", Icon: Download },
] as const;

const WHY_POINTS = [
  { title: "Simple", desc: "One link and one straightforward download flow." },
  { title: "Browser-based", desc: "No separate application is required." },
  { title: "Clear", desc: "Preview the available media before saving." },
] as const;

function IconChip({ Icon }: { Icon: typeof Film }) {
  return (
    <span
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
      style={{ background: "var(--accent-tint-purple)", border: "1px solid var(--accent-tint-purple-border)" }}
      aria-hidden="true"
    >
      <Icon size={14} color="var(--primary)" strokeWidth={2} />
    </span>
  );
}

export default function HomeClient() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<DownloaderTab | null>(null);

  useEffect(() => {
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    if (requestedTab === "reels" || requestedTab === "videos" || requestedTab === "photos" || requestedTab === "stories" || requestedTab === "audio") {
      queueMicrotask(() => setActiveTab(requestedTab));
    }
  }, []);

  const handleDownloaderTabChange = (tab: DownloaderTab | null) => {
    setActiveTab(tab);
    if (tab) {
      document.getElementById("hero")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <>
      <Header activeDownloaderTab={activeTab} onDownloaderTabChange={handleDownloaderTabChange} />
      <main id="main-content" className="flex-1">
        <HeroDownloader activeTab={activeTab} onActiveTabChange={setActiveTab} />

        {/* ── Benefit strip: 4 equal compact cards ── */}
        <ScrollReveal>
          <section className="mx-auto max-w-[1100px] px-5 sm:px-6 lg:px-12 pb-16 sm:pb-20">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
              {t.quick.items.map((f, i) => {
                const Icon = QUICK_ICONS[i];
                return (
                  <ScrollReveal key={i} delay={i * 60} className="h-full">
                    <div
                      className="group flex h-full flex-col rounded-[20px] p-6 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-card-hover)] hover:[border-color:var(--accent-tint-purple-border)]"
                      style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                    >
                      <div
                        className="mb-3 flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105"
                        style={{ background: "var(--accent-tint-purple)", border: "1px solid var(--accent-tint-purple-border)" }}
                      >
                        <Icon size={20} color="var(--primary)" strokeWidth={2} />
                      </div>
                      <p className="text-[18px] font-bold text-fg">{f.title}</p>
                      <p className="mt-1.5 text-[14px] leading-[1.5] text-fg-muted">{f.desc}</p>
                    </div>
                  </ScrollReveal>
                );
              })}
            </div>
          </section>
        </ScrollReveal>

        {/* ── Supported content (6 equal numbered cards) ── */}
        <ScrollReveal><Features /></ScrollReveal>

        {/* ── Three steps ── */}
        <ScrollReveal><HowItWorks /></ScrollReveal>

        {/* ── Supported media & formats: two compact panels ── */}
        <ScrollReveal>
          <section className="px-5 py-16 sm:px-6 sm:py-20 lg:px-8" aria-labelledby="supported-media">
            <div className="mx-auto max-w-[1000px]">
              <div className="mb-10 text-center">
                <p className="mb-3 text-[14px] font-bold uppercase tracking-[0.12em] text-primary-strong">
                  Media &amp; Formats
                </p>
                <h2 id="supported-media" className="text-[30px] font-bold tracking-[-0.02em] text-fg sm:text-[44px]">
                  Supported media and formats
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 items-stretch">
                <div
                  className="rounded-[20px] bg-card p-6 shadow-[var(--shadow-card)]"
                  style={{ border: "1px solid var(--border)" }}
                >
                  <h3 className="text-[18px] font-bold text-fg">Supported media</h3>
                  <ul className="mt-4 space-y-2.5">
                    {MEDIA_ROWS.map((m) => (
                      <li key={m.label} className="flex items-center gap-3 text-[15px] leading-[1.5] text-fg-muted">
                        <IconChip Icon={m.Icon} />
                        <span>
                          <Link href={m.href} className="font-semibold text-primary-strong hover:underline">
                            {m.label}
                          </Link>
                          {" — "}
                          {m.note}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div
                  className="flex flex-col rounded-[20px] bg-card p-6 shadow-[var(--shadow-card)]"
                  style={{ border: "1px solid var(--border)" }}
                >
                  <h3 className="text-[18px] font-bold text-fg">Available formats</h3>
                  <ul className="mt-4 space-y-2.5">
                    {FORMAT_ROWS.map((f) => (
                      <li key={f.label} className="flex items-center gap-3 text-[15px] leading-[1.5] text-fg-muted">
                        <IconChip Icon={f.Icon} />
                        <span>
                          <strong className="font-semibold text-fg">{f.label}</strong>
                          {" → "}
                          {f.value}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-auto pt-5 text-[14px] leading-[1.5] text-fg-subtle">
                    Formats follow what Instagram provides — files pass through, not converted.
                  </p>
                </div>
              </div>
              <p className="mt-8 text-center text-[15px] text-fg-muted">
                Works on mobile, tablet and desktop through a modern browser.
              </p>
            </div>
          </section>
        </ScrollReveal>

        {/* ── How Downloadit works: compact horizontal flow ── */}
        <ScrollReveal>
          <section className="px-5 py-16 sm:px-6 sm:py-20 lg:px-8" aria-labelledby="how-downloadit-works">
            <div className="mx-auto max-w-[1000px]">
              <div className="mb-10 text-center">
                <p className="mb-3 text-[14px] font-bold uppercase tracking-[0.12em] text-primary-strong">
                  Overview
                </p>
                <h2 id="how-downloadit-works" className="text-[30px] font-bold tracking-[-0.02em] text-fg sm:text-[44px]">
                  How Downloadit works
                </h2>
                <p className="mx-auto mt-4 max-w-[560px] text-[16px] leading-[1.7] text-fg-muted">
                  Downloadit accepts supported public Instagram links. When you paste
                  a link, the service checks the available media and prepares a
                  preview. You can then choose the available file and save it to
                  your device.
                </p>
              </div>
              <div
                className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-stretch"
                aria-label="Process: paste link, check media, preview, save"
              >
                {FLOW_STAGES.map((stage, i) => {
                  const Icon = stage.Icon;
                  return (
                    <div key={stage.n} className="flex flex-1 flex-col sm:flex-row sm:items-stretch">
                      <ScrollReveal delay={i * 100} className="flex flex-1 flex-col">
                        <div
                          className="flex flex-1 items-center gap-3 rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]"
                          style={{ border: "1px solid var(--border)" }}
                        >
                          <span
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                            style={{ background: "var(--accent-tint-purple)", border: "1px solid var(--accent-tint-purple-border)" }}
                            aria-hidden="true"
                          >
                            <Icon size={18} color="var(--primary)" strokeWidth={2} />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[12px] font-bold tracking-[0.1em] text-primary-strong">
                              {stage.n}
                            </span>
                            <span className="block text-[16px] font-bold text-fg">{stage.title}</span>
                            <span className="block text-[14px] leading-[1.5] text-fg-muted">{stage.desc}</span>
                          </span>
                        </div>
                      </ScrollReveal>
                      {i < FLOW_STAGES.length - 1 && (
                        <div className="hidden items-center justify-center px-1 sm:flex" aria-hidden="true">
                          <span className="text-[18px] font-bold text-fg-subtle">→</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* ── Privacy + public-content limitations: two equal cards ── */}
        <ScrollReveal>
          <section className="px-5 py-16 sm:px-6 sm:py-20 lg:px-8" aria-labelledby="trust-limits">
            <div className="mx-auto max-w-[1000px]">
              <div className="mb-10 text-center">
                <p className="mb-3 text-[14px] font-bold uppercase tracking-[0.12em] text-primary-strong">
                  Trust &amp; Limits
                </p>
                <h2 id="trust-limits" className="text-[30px] font-bold tracking-[-0.02em] text-fg sm:text-[44px]">
                  Privacy and limitations
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 items-stretch">
                {[
                  { title: "Privacy", desc: "Downloadit does not ask for your Instagram password or require you to log in to Instagram." },
                  { title: "Public content only", desc: "Downloadit does not bypass Instagram privacy controls. Private, deleted, expired or inaccessible content may not be available." },
                ].map((c, i) => (
                  <ScrollReveal key={c.title} delay={i * 100} className="h-full">
                    <div
                      className="group flex h-full flex-col rounded-[20px] bg-card p-6 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-card-hover)] hover:[border-color:var(--accent-tint-purple-border)]"
                      style={{ border: "1px solid var(--border)" }}
                    >
                      <div
                        className="mb-3 flex h-[42px] w-[42px] items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105"
                        style={{ background: "var(--accent-tint-purple)", border: "1px solid var(--accent-tint-purple-border)" }}
                      >
                        <ShieldCheck size={20} color="var(--primary)" strokeWidth={2} />
                      </div>
                      <h3 className="text-[18px] font-bold text-fg">{c.title}</h3>
                      <p className="mt-1.5 text-[14px] leading-[1.5] text-fg-muted">{c.desc}</p>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* ── Why Downloadit: horizontal editorial ── */}
        <ScrollReveal>
          <section className="px-5 py-16 sm:px-6 sm:py-20 lg:px-8" aria-labelledby="why-downloadit">
            <div className="mx-auto max-w-[1000px]">
              <h2 id="why-downloadit" className="text-[30px] font-bold tracking-[-0.02em] text-fg sm:text-[44px]">
                Why Downloadit?
              </h2>
              <p className="mt-4 max-w-[68ch] text-[16px] leading-[1.7] text-fg-muted">
                Downloadit keeps the process simple: paste a supported public link,
                check the available media, preview it and save the file you need.
              </p>
              <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8">
                {WHY_POINTS.map((p) => (
                  <div key={p.title} className="min-w-0">
                    <p className="text-[18px] font-bold text-fg">{p.title}</p>
                    <p className="mt-1 text-[14px] leading-[1.5] text-fg-muted">{p.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </ScrollReveal>

        <ScrollReveal><FAQ /></ScrollReveal>

        {/* ── Disclosure: subtle, separated ── */}
        <ScrollReveal>
          <section className="px-5 pb-4 sm:px-6 lg:px-8" aria-label="Independence disclosure">
            <p className="mx-auto max-w-[720px] text-center text-[13px] leading-[1.7] text-fg-subtle">
              Downloadit is an independent service and is not affiliated with,
              endorsed by, or sponsored by Instagram or Meta.
            </p>
          </section>
        </ScrollReveal>

        {/* ── Final CTA ── */}
        <ScrollReveal>
          <section className="px-5 py-16 sm:px-6 sm:py-20 lg:px-8" aria-labelledby="final-cta">
            <div
              className="mx-auto max-w-[720px] rounded-[24px] px-6 py-10 text-center sm:px-10"
              style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}
            >
              <h2 id="final-cta" className="text-[30px] font-bold tracking-[-0.02em] text-fg sm:text-[44px]">
                Ready to save a public Instagram post?
              </h2>
              <p className="mx-auto mt-4 max-w-[480px] text-[18px] leading-[1.7] text-fg-muted">
                Paste a supported Instagram link into Downloadit and check the available media.
              </p>
              <a
                href="#hero"
                className="gradient-btn mt-6 inline-flex min-h-[48px] items-center justify-center px-8 text-[16px]"
              >
                Start downloading
                <span aria-hidden="true">↑</span>
              </a>
            </div>
          </section>
        </ScrollReveal>
      </main>
      <Footer />
    </>
  );
}
