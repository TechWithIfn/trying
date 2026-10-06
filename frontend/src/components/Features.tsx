"use client";

import Link from "next/link";
import { Play, Film, Image, Layers, Clock, Music } from "lucide-react";
import { useLanguage } from "@/i18n";
import ScrollReveal from "@/components/ScrollReveal";

const ICONS = [Play, Film, Image, Layers, Clock, Music];
const NUMS = ["01", "02", "03", "04", "05", "06"];
const TINTS = ["purple", "purple", "purple", "orange", "orange", "orange"] as const;

// One Learn-more destination per card, in card order. Multi-photo posts are
// handled by the photo downloader, so they point there.
const TOOL_HREFS = [
  "/instagram-reels-downloader",
  "/instagram-video-downloader",
  "/instagram-photo-downloader",
  "/instagram-photo-downloader",
  "/instagram-story-downloader",
  "/instagram-audio-downloader",
];

const tintStyles = {
  purple: {
    bg: "var(--accent-tint-purple)",
    border: "var(--accent-tint-purple-border)",
    iconColor: "var(--primary)",
  },
  orange: {
    bg: "var(--accent-tint-orange)",
    border: "var(--accent-tint-orange-border)",
    iconColor: "#c77a1f",
  },
};

export default function Features() {
  const { t } = useLanguage();

  return (
    <section
      id="features"
      className="px-5 py-16 sm:px-6 sm:py-20 lg:px-8"
      aria-label={t.nav.features}
    >
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-10 text-center">
          <p className="mb-3 text-[14px] font-bold uppercase tracking-[0.12em] text-primary-strong">
            {t.features.eyebrow}
          </p>
          <h2 className="text-[30px] font-bold tracking-[-0.02em] text-fg sm:text-[44px]">
            {t.features.title}
          </h2>
          <p className="mx-auto mt-4 max-w-[480px] text-[18px] leading-relaxed text-fg-muted">
            {t.features.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 max-w-[1100px] mx-auto items-stretch">
          {t.features.items.map((card, i) => {
            const tint = TINTS[i];
            const s = tintStyles[tint];
            const Icon = ICONS[i];
            return (
              <ScrollReveal key={i} delay={Math.min(i, 5) * 60}>
                <div
                  className="group flex h-full flex-col rounded-[20px] bg-card p-6 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-card-hover)] hover:[border-color:var(--accent-tint-purple-border)]"
                  style={{ border: "1px solid var(--border)" }}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div
                      className="flex h-[44px] w-[44px] items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105"
                      style={{ background: s.bg, border: `1px solid ${s.border}` }}
                    >
                      <Icon size={20} color={s.iconColor} strokeWidth={2} />
                    </div>
                    <span className="text-[12px] font-bold tracking-[0.08em] text-fg-subtle" aria-hidden="true">
                      {NUMS[i]}
                    </span>
                  </div>
                  <h3 className="text-[20px] font-bold text-fg">{card.title}</h3>
                  <p className="mt-1.5 text-[15px] leading-[1.5] text-fg-muted">{card.desc}</p>
                  <Link
                    href={TOOL_HREFS[i]}
                    className="mt-auto inline-flex min-h-[44px] items-center pt-3 text-[15px] font-semibold text-primary-strong transition-colors hover:text-primary"
                  >
                    Learn more
                    <span aria-hidden="true" className="ml-1 transition-transform duration-200 group-hover:translate-x-0.5">→</span>
                  </Link>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
