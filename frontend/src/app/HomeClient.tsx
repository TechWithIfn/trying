"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import HeroDownloader, { type DownloaderTab } from "@/components/HeroDownloader";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";
import { useLanguage } from "@/i18n";
import ProseSection from "@/components/ProseSection";

import { Film, Video, Image as ImageIcon, Clock, Music, Link2, Search, Download, Eye, ShieldCheck } from "lucide-react";

const MEDIA_ROWS = [
  { href: "/instagram-reels-downloader", label: "Reels", note: "Supported video downloads", Icon: Film },
  { href: "/instagram-video-downloader", label: "Videos", note: "Supported video posts", Icon: Video },
  { href: "/instagram-photo-downloader", label: "Photos & Carousels", note: "Single photos and multi-slide posts", Icon: ImageIcon },
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
      document.querySelector("section#hero")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const renderDownloader = () => (
    <HeroDownloader
        activeTab={activeTab}
        onActiveTabChange={setActiveTab}
        titleA={t.hero.titleA}
        titleB={t.hero.titleB}
        subtitle={t.hero.subtitle}
        placeholder={activeTab === "audio" ? t.hero.audioPlaceholder : t.hero.placeholder}
    />
  );

  return (
    <>
      <Header activeDownloaderTab={activeTab} onDownloaderTabChange={handleDownloaderTabChange} />
      <main id="main-content" className="flex-1">
        <div id="home-downloader">{renderDownloader()}</div>

        {/* ── Supported content & formats ── */}
        <section className="px-5 py-10 sm:px-6 sm:py-16 lg:px-8" aria-labelledby="supported-media">
          <div className="mx-auto max-w-[1000px]">
            <div className="mb-6 text-center">
              <p className="mb-2 text-[13px] font-bold uppercase tracking-[0.1em] text-primary-strong">
                Supported media and formats
              </p>
              <h2 id="supported-media" className="text-[28px] font-bold tracking-[-0.01em] text-fg sm:text-[36px]">
                Supported media and formats
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 items-stretch">
              <div
                className="rounded-[16px] bg-card p-5 shadow-[var(--shadow-card)]"
                style={{ border: "1px solid var(--border)" }}
              >
                <h3 className="text-[16px] font-bold text-fg mb-3">Supported media</h3>
                <ul className="space-y-1.5 text-[14px] leading-[1.5] text-fg-muted">
                  {MEDIA_ROWS.map((m) => (
                    <li key={m.label} className="flex items-center gap-2">
                      <m.Icon className="h-4 w-4" />
                      <span>
                        <Link href={m.href} className="font-semibold text-primary-strong hover:underline">
                          {m.label}
                        </Link>
                        {m.note}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div
                className="flex flex-col rounded-[16px] bg-card p-5 shadow-[var(--shadow-card)]"
                style={{ border: "1px solid var(--border)" }}
              >
                <h3 className="text-[16px] font-bold text-fg mb-3">Available formats</h3>
                <ul className="space-y-1.5 text-[14px] leading-[1.5] text-fg-muted">
                  {FORMAT_ROWS.map((f) => (
                    <li key={f.label} className="flex items-center gap-2">
                      <f.Icon className="h-4 w-4" />
                      <span>
                        <strong className="font-semibold text-fg">{f.label}</strong>
                        {" → "}
                        {f.value}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-auto pt-3 text-[13px] leading-[1.4] text-fg-subtle">
                  Formats follow what each platform provides — files pass through, not converted.
                </p>
              </div>
            </div>
            <p className="mt-4 text-center text-[14px] text-fg-muted">
              Works on mobile, tablet and desktop through a modern browser.
            </p>
          </div>
        </section>

        {/* ── How Downloadit works ── */}
        <ScrollReveal className="mobile:py-8">
          <section className="px-5 py-10 sm:px-6 sm:py-16 lg:px-8" aria-labelledby="how-downloadit-works">
            <div className="mx-auto max-w-[900px]">
              <div className="mb-4 text-center">
                <p className="mb-2 text-[13px] font-bold uppercase tracking-[0.1em] text-primary-strong">
                  How it works
                </p>
                <h2 id="how-downloadit-works" className="text-[28px] font-bold tracking-[-0.01em] text-fg sm:text-[36px]">
                  How Downloadit works
                </h2>
                <p className="mx-auto mt-3 max-w-[520px] text-[15px] leading-[1.6] text-fg-muted">
                  Downloadit accepts supported public links from Instagram, Pinterest, YouTube, Facebook, Twitter/X and Threads. When you paste a link, the service checks the available media and prepares a preview. You can then choose the available file and save it to your device.
                </p>
              </div>
              <div
                className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-stretch"
                aria-label="Process: paste link, check media, preview, save"
              >
                {FLOW_STAGES.map((stage, i) => {
                  const Icon = stage.Icon;
                  return (
                    <div key={stage.n} className="flex flex-1 flex-col sm:flex-row sm:items-stretch">
                      <ScrollReveal delay={i * 80} className="flex flex-1 flex-col">
                        <div
                          className="flex flex-1 items-center gap-2 rounded-2xl bg-card p-3 shadow-[var(--shadow-card)]"
                          style={{ border: "1px solid var(--border)" }}
                        >
                          <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                            style={{ background: "var(--accent-tint-purple)", border: "1px solid var(--accent-tint-purple-border)" }}
                            aria-hidden="true"
                          >
                            <Icon size={16} color="var(--primary)" strokeWidth={2} />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[11px] font-bold tracking-[0.08em] text-primary-strong">
                              {stage.n}
                            </span>
                            <span className="block text-[15px] font-bold text-fg">{stage.title}</span>
                            <span className="block text-[13px] leading-[1.5] text-fg-muted">{stage.desc}</span>
                          </span>
                        </div>
                      </ScrollReveal>
                      {i < FLOW_STAGES.length - 1 && (
                        <div className="hidden items-center justify-center px-1 sm:flex" aria-hidden="true">
                          <span className="text-[16px] font-bold text-fg-subtle">→</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* ── Privacy & limitations ── */}
        <section className="px-5 py-10 sm:px-6 sm:py-16 lg:px-8" aria-labelledby="trust-limits">
          <div className="mx-auto max-w-[1000px]">
            <div className="mb-4 text-center">
              <p className="mb-2 text-[13px] font-bold uppercase tracking-[0.1em] text-primary-strong">
                Privacy and limitations
              </p>
              <h2 id="trust-limits" className="text-[28px] font-bold tracking-[-0.01em] text-fg sm:text-[36px]">
                Privacy and limitations
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 items-stretch">
              {[
                { title: "Privacy", desc: "Downloadit never asks for a social-media password, cookie or account credential. You only paste a public link." },

                { title: "Public content only", desc: "Downloadit does not bypass source-platform privacy controls. Private, deleted or expired content cannot be downloaded." },

                { title: "Your responsibility", desc: "Only save content you own or have permission to reuse. Downloadit is independent and not affiliated with the source platforms." },

              ].map((c) => (
                <div
                  key={c.title}
                  className="flex h-full flex-col rounded-[16px] bg-card p-6 shadow-[var(--shadow-card)]"
                  style={{ border: "1px solid var(--border)" }}
                >
                  <div
                    className="flex h-[36px] w-[36px] items-center justify-center rounded-lg mb-3"
                    style={{ background: "var(--accent-tint-purple)", border: "1px solid var(--accent-tint-purple-border)" }}
                  >
                    <ShieldCheck size={18} color="var(--primary)" strokeWidth={2} />
                  </div>
                  <h3 className="text-[16px] font-bold text-fg">{c.title}</h3>
                  <p className="mt-1 text-[14px] leading-[1.5] text-fg-muted">{c.desc}</p>
                </div>
              ))}
            </div>
            <ProseSection className="mx-auto mt-8 max-w-[680px]">
              <h3>Why some links do not work</h3>
              <p>
                Most failures come down to five causes: the post is private or on a private account, it was deleted, a Story passed its 24 hours, the link is incomplete or was copied wrongly, or Instagram is briefly limiting access. Private posts fail because they need a login to view, deleted posts fail because the file no longer exists, and expired links fail because Instagram signs media addresses for a short time only. Age-restricted or region-limited posts can fail too, since they also demand something before showing the content. What usually helps: copy the full share link again straight from Instagram, open it in a private or incognito browser window to confirm anyone can see it, then paste it here again.
              </p>
              <h3>What we ask from you and what we do not</h3>
              <p>
                We never ask for a social-media password, login, or two-factor code — there is no account here to sign into, so there is nothing that could ask for one. If any page ever asks you to sign in to a source platform to use Downloadit, close it: that request did not come from us. How your pasted links are handled is explained on the Privacy Policy page.
              </p>
              <h3>Using downloaded content fairly</h3>
              <p>
                Download only your own content or content you have permission for, and give credit when you reuse someone else&apos;s work. Crediting is polite but it is not permission — reposting, remixing, or running clips in ads needs the creator&apos;s agreement first. For removal or copyright requests, use the DMCA and copyright page. The ground rules are also set out in the Disclaimer, and step-by-step help lives on the Help page.
              </p>
            </ProseSection>
          </div>
        </section>

        {/* ── Why Downloadit? ── */}
        <section className="px-5 py-10 sm:px-6 sm:py-16 lg:px-8" aria-labelledby="why-downloadit">
          <div className="mx-auto max-w-[1000px]">
            <p className="mb-2 text-[13px] font-bold uppercase tracking-[0.1em] text-primary-strong">
              Why Downloadit?
            </p>
            <h2 id="why-downloadit" className="text-[28px] font-bold tracking-[-0.01em] text-fg sm:text-[36px]">
              Why Downloadit?
            </h2>
            <p className="mt-3 max-w-[65ch] text-[15px] leading-[1.6] text-fg-muted sm:text-[17px]">
              Instagram gives you no way to save what you see. Reels have no save button, photos cannot be downloaded, and stories vanish after 24 hours. Screenshots lose quality, screen recordings are rough, and shared links often demand a login. Downloadit exists to close that gap: you paste a link to a public post, check what is inside, and keep the original file on your own device.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 text-[14px] leading-[1.6] text-fg-muted">
              <div>
                <strong>No account required</strong><br/>
                Works purely from public links — no Instagram login needed.
              </div>
              <div>
                <strong>Privacy-first</strong><br/>
                Never asks for your password or tracks your activity.
              </div>
              <div>
                <strong>Honest limitations</strong><br/>
                Private, deleted and expired content are clearly marked as unavailable.
              </div>
              <div>
                <strong>Independent service</strong><br/>
                Not affiliated with, endorsed by, or sponsored by Instagram, Meta, Pinterest, Google, YouTube, Facebook or X.
              </div>
            </div>
            <a
              href="#hero"
              className="gradient-btn mt-5 inline-flex min-h-[44px] items-center justify-center px-6 text-[15px]"
            >
              Start downloading
              <span aria-hidden="true">↑</span>
            </a>
          </div>
        </section>

        {/* ── Guide ── */}
        <section className="px-5 py-10 sm:px-6 sm:py-16 lg:px-8" aria-labelledby="downloadit-guide">
          <div className="mx-auto max-w-[800px]">
            <p className="mb-2 text-[13px] font-bold uppercase tracking-[0.1em] text-primary-strong">
              Guide
            </p>
            <h2 id="downloadit-guide" className="text-[28px] font-bold tracking-[-0.01em] text-fg sm:text-[36px]">
              Saving public Instagram media, explained properly
            </h2>
            <p className="mt-3 text-[15px] leading-[1.6] text-fg-muted">
              Instagram is built for scrolling, not for keeping. There is no save button on reels, no download option on photos, and stories delete themselves within a day. Downloadit closes that one gap: you give it the link to a public post, and it hands back the underlying file so you can keep it on your own device. Nothing more, nothing less.
            </p>

            <div className="mt-4">
              <p className="text-[14px] leading-[1.6] text-fg-muted">
                The box at the top of this page handles every link, and each tab simply starts you in the right place — paste anything public and the content type is detected for you. The separate pages below exist for the moments when you want guidance specific to one format:
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {[
                  { href: "/instagram-reels-downloader", label: "Reels downloader", desc: "Short vertical clips you want to rewatch or share — pick this for anything under a couple of minutes." },
                  { href: "/instagram-video-downloader", label: "Video downloader", desc: "Longer posts to study or archive — talks, interviews, tutorials and full-length clips." },
                  { href: "/instagram-photo-downloader", label: "Photo & carousel downloader", desc: "Stills at full resolution — flip through every slide and save each frame individually." },
                  { href: "/instagram-story-downloader", label: "Story downloader", desc: "Anything with a 24-hour deadline — save it the day you spot it, before it expires." },
                  { href: "/instagram-audio-downloader", label: "Audio downloader", desc: "When the picture is beside the point — pull the full sound track out as an MP3." },
                ].map((l) => (
                  <Link key={l.href} href={l.href} className="rounded-2xl p-3 hover:bg-primary-light transition-colors" style={{ border: "1px solid var(--border)", background: "var(--card)" }}>
                    <span className="text-[13px] font-semibold text-primary-strong">{l.label}</span>
                    <span className="mt-0.5 block text-[12px] leading-[1.5] text-fg-muted">{l.desc}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <Footer />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: [
                {
                  "@type": "Question",
                  "name": "Is Downloadit free to use?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Yes. Paste a public link, preview the media and save the file — there is no account, no payment step and nothing to install. If you ever see a page asking you to pay for this tool or log in with your Instagram password, it is not us."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Do I need to log in or share my Instagram password?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Never. The tool works purely from the public link you paste, and there is no password field anywhere on the site. Anyone asking for your Instagram login in connection with downloading is running a scam — keep your credentials to yourself."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Which links work, and which do not?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Links to individual public posts work: a reel, a video post, a photo or carousel post, or a live story. Links to profiles, grids, explore pages and hashtags do not, because they point at collections rather than one piece of media. Open the single post first, then copy its link."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Why did a story download fail?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "In most cases the story expired. Stories disappear 24 hours after posting, counted from posting rather than from when you saw them. Private, Close Friends and deleted stories fail the same way. Save stories the day you spot them."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Where do my downloaded files go?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Your browser decides. On Android that is usually Downloads or Gallery, on iPhone it is the Files app under Downloads, and on desktop it is the normal downloads folder. From there the files play offline in any standard player."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Will the person who posted it know I saved it?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Saving through this page adds no extra signal — there is no login, no comment, no reaction attached to it. Note that story views themselves are visible to the poster inside Instagram, but that is true whether or not you save the file."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Can I repost what I download, or use it in ads?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Only if you have the right to. Your own posts are fine. Anyone else's work needs their permission first — crediting them is polite but it is not permission, and music carries especially strict rights. Personal offline viewing is one thing; publishing is another."
                  }
                },
                {
                  "@type": "Question",
                  "name": "A link that worked yesterday fails today. Why?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Instagram signs its media addresses for a short time, so a resolved file from hours ago is simply dead now. This is normal. Paste the original post link again to get a fresh address and download promptly."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Is Downloadit affiliated with a source platform?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "No. Downloadit is independent and not affiliated with, endorsed by, or sponsored by Instagram, Meta, Pinterest, Google, YouTube, Facebook or X. It only touches content that is already public to logged-out visitors."
                  }
                }
              ],
            }),
          }}
        />
      </main>
    </>
  );
}