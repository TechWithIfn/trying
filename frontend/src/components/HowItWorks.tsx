"use client";

import { Link2, Clipboard, Eye } from "lucide-react";
import { useLanguage } from "@/i18n";
import ScrollReveal from "@/components/ScrollReveal";

const ICONS = [Link2, Clipboard, Eye];
const NUMS = ["01", "02", "03"];

export default function HowItWorks() {
  const { t } = useLanguage();

  return (
    <section
      id="how-it-works"
      className="px-5 py-16 sm:px-6 sm:py-20 lg:px-8"
      aria-label={t.nav.howItWorks}
    >
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-10 text-center">
          <p className="mb-3 text-[14px] font-bold uppercase tracking-[0.12em] text-primary-strong">
            {t.steps.eyebrow}
          </p>
          <h2 className="text-[30px] font-bold tracking-[-0.02em] text-fg sm:text-[44px]">
            {t.steps.title}
          </h2>
          <p className="mx-auto mt-4 max-w-[480px] text-[18px] leading-relaxed text-fg-muted">
            {t.steps.subtitle}
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-5 sm:flex-row sm:items-stretch max-w-[1000px] mx-auto">
          {t.steps.items.map((step, i) => {
            const Icon = ICONS[i];
            return (
              <div key={NUMS[i]} className="flex flex-1 flex-col sm:flex-row sm:items-stretch">
                <ScrollReveal delay={i * 100} className="flex flex-1 flex-col">
                  <div
                    className="group flex flex-1 flex-col items-center px-6 py-6 text-center rounded-[20px] bg-card shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-card-hover)] hover:[border-color:var(--accent-tint-purple-border)]"
                    style={{ border: "1px solid var(--border)" }}
                  >
                    <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.12em] text-primary-strong">
                      {t.steps.stepWord} {NUMS[i]}
                    </p>
                    <div
                      className="mb-3 flex h-[44px] w-[44px] items-center justify-center rounded-2xl text-white transition-transform duration-200 group-hover:scale-105"
                      style={{ background: "var(--brand-gradient)", boxShadow: "var(--shadow-brand)" }}
                    >
                      <Icon size={20} strokeWidth={2} />
                    </div>
                    <h3 className="text-[20px] font-bold text-fg">{step.title}</h3>
                    <p className="mt-1.5 max-w-[260px] text-[14px] leading-[1.5] text-fg-muted">
                      {step.desc}
                    </p>
                  </div>
                </ScrollReveal>
                {/* Connector between cards on desktop only: vertically centered
                    so the 01 → 02 → 03 flow reads without touching the cards. */}
                {i < t.steps.items.length - 1 && (
                  <div className="hidden items-center justify-center sm:flex" aria-hidden="true">
                    <div
                      className="h-px w-10 flex-shrink-0"
                      style={{
                        background: "linear-gradient(90deg, rgba(124,77,245,0.3), rgba(236,95,168,0.3))",
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
