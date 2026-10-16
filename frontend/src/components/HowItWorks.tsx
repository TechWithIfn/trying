"use client";

import Link from "next/link";
import { Link2, Clipboard, Eye } from "lucide-react";
import { useLanguage } from "@/i18n";
import ProseSection from "@/components/ProseSection";

const ICONS = [Link2, Clipboard, Eye];
const NUMS = ["01", "02", "03"];

// Connector arrows between step cards: horizontal on desktop, vertical on
// mobile. Pure CSS/SVG, aria-hidden, no layout shift (fixed small sizes).
function DesktopConnector() {
  return (
    <div className="hidden items-center justify-center px-1 sm:flex" aria-hidden="true">
      <span
        className="block h-[2px] w-10 flex-shrink-0 rounded-full"
        style={{ background: "linear-gradient(90deg, var(--primary), var(--accent))", opacity: 0.55 }}
      />
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginLeft: "-2px" }}>
        <path d="M9 6l6 6-6 6" />
      </svg>
    </div>
  );
}

function MobileConnector() {
  return (
    <div className="flex flex-col items-center justify-center py-1 sm:hidden" aria-hidden="true">
      <span
        className="block h-8 w-[2px] flex-shrink-0 rounded-full"
        style={{ background: "linear-gradient(180deg, var(--primary), var(--accent))", opacity: 0.55 }}
      />
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginTop: "-2px" }}>
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  );
}

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

        <div className="flex flex-col items-stretch max-w-[1000px] mx-auto sm:flex-row sm:items-stretch">
          {t.steps.items.map((step, i) => {
            const Icon = ICONS[i];
            return (
              <div key={NUMS[i]} className="flex flex-1 flex-col sm:flex-row sm:items-stretch min-w-0">
                <div className="flex flex-1 flex-col min-w-0">
                  {/* Pure-CSS entrance: visible by default, no JS gating, so this
                      content can never stick at opacity:0 (route changes, Back
                      navigation, or JS hiccups included). */}
                  <div
                    className="lift-card animate-fade-in-up relative flex flex-1 flex-col items-center px-6 py-7 text-center rounded-[24px] bg-card overflow-hidden"
                    style={{
                      border: "1px solid var(--accent-tint-purple-border)",
                      boxShadow: "var(--shadow-card), 0 0 0 4px rgba(124, 77, 245, 0.04)",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      data-stepnum={NUMS[i]}
                      className="step-num pointer-events-none absolute -top-3 right-2 select-none"
                    />
                    <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.12em] text-primary-strong">
                      {t.steps.stepWord} {NUMS[i]}
                    </p>
                    <div
                      className="lift-icon mb-3 flex h-[52px] w-[52px] items-center justify-center rounded-full text-white"
                      style={{ background: "var(--brand-gradient)", boxShadow: "var(--shadow-brand), 0 0 24px rgba(124, 77, 245, 0.35)" }}
                    >
                      <Icon size={22} strokeWidth={2} />
                    </div>
                    <h3 className="text-[20px] font-bold text-fg">{step.title}</h3>
                    <p className="mt-1.5 max-w-[260px] text-[16px] leading-[1.6] text-fg-muted">
                      {step.desc}
                    </p>
                  </div>
                </div>
                {i < t.steps.items.length - 1 && (
                  <>
                    <DesktopConnector />
                    <MobileConnector />
                  </>
                )}
              </div>
            );
          })}
        </div>

        <ProseSection className="mx-auto mt-14 max-w-[720px]">
          <h3 className="text-[24px] font-bold tracking-[-0.01em] text-fg sm:text-[28px]">
            How to use Downloadit, step by step
          </h3>

          <h4 className="mt-8 text-[18px] font-bold text-fg">Copy the link from Instagram</h4>
          <p className="mt-2 text-[16px] leading-[1.7] text-fg-muted">
            Open the Instagram app or website and go to the post itself — a public
            Reel, video, photo, carousel, or Story. Tap the Share icon (the little
            paper plane) and choose Copy link. The post has to be public: if it
            needs a login or a follow to view, it cannot be fetched later. On a
            computer the same works from the browser address bar — just open the
            single post and copy its address. Copy the post itself, not a profile
            or grid page: collection links point at many posts at once, so the
            tool cannot tell which file you mean.
          </p>

          <h4 className="mt-8 text-[18px] font-bold text-fg">Paste it into Downloadit</h4>
          <p className="mt-2 text-[16px] leading-[1.7] text-fg-muted">
            Come back to this page, tap the input box, paste the link, and press
            Get Media. No login and no account are needed at any point. If you
            already know the media type, you can start from its dedicated page —
            the{" "}
            <Link href="/instagram-reels-downloader" className="font-semibold text-primary-strong hover:underline">Reels downloader</Link>,{" "}
            <Link href="/instagram-video-downloader" className="font-semibold text-primary-strong hover:underline">video downloader</Link>,{" "}
            <Link href="/instagram-photo-downloader" className="font-semibold text-primary-strong hover:underline">photo and carousel downloader</Link>,{" "}
            <Link href="/instagram-story-downloader" className="font-semibold text-primary-strong hover:underline">story downloader</Link>, or{" "}
            <Link href="/instagram-audio-downloader" className="font-semibold text-primary-strong hover:underline">audio downloader</Link>{" "}
            — but pasting any supported link here works just as well. While the
            link resolves, leave the tab open: closing it or letting the phone
            sleep mid-request can interrupt that attempt. The button stays
            disabled during loading so a double tap can never fire two requests.
          </p>

          <h4 className="mt-8 text-[18px] font-bold text-fg">Preview and save your file</h4>
          <p className="mt-2 text-[16px] leading-[1.7] text-fg-muted">
            After a few seconds the page shows exactly what the link contains, so
            confirm it is the right post before saving. Then pick the available
            file — video as MP4, images as JPG, PNG or WebP where provided, audio
            as MP3 — and tap Download. Files land in Downloads or Gallery on
            Android, in the Files app under Downloads on iPhone, and in the
            downloads folder on desktop. Each carousel slide saves as its own
            image, so work through multi-slide posts with the on-screen
            navigation and keep the frames you want. If a preview looks right
            but the file will not open, the media address likely expired between
            the two taps — paste the link once more and download promptly.
          </p>

          <h4 className="mt-8 text-[18px] font-bold text-fg">Quick tips</h4>
          <ul className="mt-2 list-disc space-y-1.5 pl-6 text-[16px] leading-[1.7] text-fg-muted">
            <li>Make sure the account and the post are public first.</li>
            <li>Use the full share link — half-copied links fail every time.</li>
            <li>Give the preview a few seconds to resolve before retrying.</li>
            <li>Save only what you own or have permission to reuse.</li>
          </ul>

          <h4 className="mt-8 text-[18px] font-bold text-fg">If something goes wrong</h4>
          <p className="mt-2 text-[16px] leading-[1.7] text-fg-muted">
            Private, deleted, or expired content cannot be fetched, and Stories
            disappear 24 hours after posting. When a link fails, copy it fresh
            from Instagram and check your connection first — that fixes most
            cases. If it still fails, the{" "}
            <Link href="/help" className="font-semibold text-primary-strong hover:underline">Help page</Link>{" "}
            walks through every error message, or{" "}
            <Link href="/contact" className="font-semibold text-primary-strong hover:underline">contact us</Link>{" "}
            with the link you tried.
          </p>
        </ProseSection>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "HowTo",
            name: "How to use Downloadit",
            step: [
              {
                "@type": "HowToStep",
                name: "Copy the link from Instagram",
                text: "Open the public Reel, video, photo, carousel or Story in Instagram, tap Share and choose Copy link. On desktop, copy the single post's address from the browser bar.",
              },
              {
                "@type": "HowToStep",
                name: "Paste it into Downloadit",
                text: "Paste the link into the input box on this page and press Get Media. No login or account is needed.",
              },
              {
                "@type": "HowToStep",
                name: "Preview and save your file",
                text: "Check the preview, pick the available file (MP4 video, JPG/PNG/WebP image, or MP3 audio) and tap Download.",
              },
            ],
          }),
        }}
      />
    </section>
  );
}
