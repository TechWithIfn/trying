"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import HeroDownloader, { type DownloaderTab } from "@/components/HeroDownloader";
import Footer from "@/components/Footer";
import {
  Download,
  Link2,
  ScanSearch,
  CheckCircle2,
  Shield,
  Zap,
  Globe,
  Smartphone,
  EyeOff,
  ChevronDown,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  FileVideo,
  FileImage,
  FileAudio,
  Scale,
} from "lucide-react";
import { PLATFORM_CATEGORIES } from "@/config/categories";
import { SUPPORT_EMAIL } from "@/config/site";

const WHY_CHOOSE_ITEMS = [
  {
    title: "100% Free to Use",
    desc: "No subscription fees, no credit card requirements, and no daily download quotas.",
    Icon: CheckCircle2,
    color: "#10b981",
  },
  {
    title: "No Account Required",
    desc: "Start saving media immediately. We never ask for your email, password, or social media logins.",
    Icon: Shield,
    color: "#7c4df5",
  },
  {
    title: "Direct Edge Delivery",
    desc: "Our resolver fetches direct progressive streams from public content delivery networks in seconds.",
    Icon: Zap,
    color: "#f58e5b",
  },
  {
    title: "Five Supported Platforms",
    desc: "Dedicated media resolution for Instagram, Pinterest, Facebook, Twitter/X, and Threads.",
    Icon: Globe,
    color: "#0ea5e9",
  },
  {
    title: "Responsive Across Devices",
    desc: "Optimized for mobile touchscreens on iPhone and Android as well as desktop monitors on Mac and Windows.",
    Icon: Smartphone,
    color: "#ec5fa8",
  },
  {
    title: "Privacy-Conscious Architecture",
    desc: "We do not maintain user profiles, log personal browsing histories, or archive your downloaded media.",
    Icon: EyeOff,
    color: "#6366f1",
  },
] as const;

const HOW_TO_STEPS = [
  {
    num: "01",
    title: "Copy the Media Link",
    desc: "Open the public post, Reel, Pin, or video on Instagram, Pinterest, Facebook, Twitter/X, or Threads and copy its direct URL to your clipboard.",
    Icon: Link2,
  },
  {
    num: "02",
    title: "Paste into Downloadit",
    desc: "Paste the URL into the input field above. Our engine instantly identifies the source network and verifies the public link.",
    Icon: ScanSearch,
  },
  {
    num: "03",
    title: "Preview and Choose Format",
    desc: "Review the title, author, and media preview, then save the MP4, JPEG, or MP3 the public post provides.",
    Icon: FileVideo,
  },
  {
    num: "04",
    title: "Save to Your Device",
    desc: "Click Download to save the file directly to your smartphone's camera roll or your computer's local Downloads folder.",
    Icon: Download,
  },
] as const;

const FAQS = [
  {
    q: "What is Downloadit and what can I download with it?",
    a: "Downloadit is a free, web-based utility designed to help users download publicly accessible media for offline personal viewing, archiving, and research. You can save public videos (MP4), full-resolution images (JPEG/PNG), carousel albums, and extract audio (MP3) from five major networks: Instagram, Pinterest, Facebook, Twitter/X, and Threads.",
  },
  {
    q: "Is Downloadit completely free to use?",
    a: "Yes. Downloadit is 100% free with unlimited usage. There are no subscriptions, paywalls, premium tiers, or download limits. The website is supported by standard non-intrusive online advertising.",
  },
  {
    q: "Do I need to register or create an account?",
    a: "No. You never need to create an account, register your email, or provide a social media login. Downloadit only asks for the public link.",
  },
  {
    q: "Can I download content from private profiles or secret boards?",
    a: "No. Downloadit strictly respects platform access controls and user privacy. We cannot and do not bypass passwords, followers-only restrictions, secret boards, or login requirements. Only publicly accessible media can be resolved.",
  },
  {
    q: "What video and photo formats does Downloadit provide?",
    a: "Videos are saved as the progressive MP4 the platform provides for that public post. Photos are saved as JPEG or PNG when that is the file the post serves. Audio from a supported video can be saved as MP3. Downloadit does not upscale a low-resolution upload.",
  },
  {
    q: "Why did my link fail to download?",
    a: "The most common reasons for resolution failure are: (1) the post is set to private or followers-only, (2) the media has expired or been deleted by the author, (3) an incomplete or truncated URL was pasted, or (4) a profile URL was entered instead of a specific post link. Confirm that the link opens in a private or logged-out browser window, then try again.",
  },
  {
    q: "Does Downloadit keep copies of downloaded files or log my downloads?",
    a: "No. Downloadit does not host, duplicate, or archive any media files on its servers. All files are streamed on demand directly from public edge delivery endpoints to your browser session. Furthermore, we maintain no user logs or download history.",
  },
  {
    q: "How do I save downloaded videos to my camera roll on iPhone / iPad?",
    a: "On iOS using Safari, tap the Download button. Safari will display a download prompt; confirm the download. Once complete, tap the download icon in Safari's address bar, select the file, tap the Share icon, and select 'Save Video' to add it directly to your Apple Photos library.",
  },
  {
    q: "How do I save media on Android devices?",
    a: "On Android using Chrome or Samsung Internet, tap Download. The file will save immediately to your device's internal Downloads folder and will instantly appear in Google Photos, Samsung Gallery, or your preferred media app.",
  },
  {
    q: "What are the rules regarding copyright and fair use?",
    a: "All intellectual property rights remain with the original creators and copyright holders. Downloadit is intended strictly for personal, non-commercial use, creator backups, and offline viewing. Users are legally responsible for respecting applicable copyright laws and must not re-upload, distribute, or monetize downloaded media without authorization.",
  },
  {
    q: "How can I contact support or report an issue?",
    a: `If you encounter an issue or have a question, visit our Help Center or Contact Us page. You can reach our support team directly via email at ${SUPPORT_EMAIL}.`,
  },
] as const;

export default function HomeClient() {
  const [activeTab, setActiveTab] = useState<DownloaderTab | null>(null);
  const [seoOpen, setSeoOpen] = useState(false);

  useEffect(() => {
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    if (
      requestedTab === "reels" ||
      requestedTab === "videos" ||
      requestedTab === "photos" ||
      requestedTab === "stories" ||
      requestedTab === "audio"
    ) {
      queueMicrotask(() => setActiveTab(requestedTab));
    }
  }, []);

  const handleDownloaderTabChange = (tab: DownloaderTab | null) => {
    setActiveTab(tab);
    if (tab) {
      document.querySelector("section#hero")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const scrollToDownloader = () => {
    document.querySelector("#main-downloader")?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => {
      const input = document.getElementById("downloadit-url-input") || document.getElementById("downloadit-url-input-mobile");
      input?.focus();
    }, 400);
  };

  return (
    <>
      <Header activeDownloaderTab={activeTab} onDownloaderTabChange={handleDownloaderTabChange} />

      <main id="main-content" className="flex-1">
        {/* ── Section 1: Hero & Main Download Box ── */}
        <div className="home-landing">
        <div id="main-downloader">
          <HeroDownloader
            variant="home"
            activeTab={activeTab}
            onActiveTabChange={setActiveTab}
            badge="FAST • FREE • NO LOGIN REQUIRED"
            titleA="Download Videos, Photos & Audio "
            titleB="Online with Downloadit"
            subtitle="Downloadit saves public Instagram, Pinterest, Facebook, X and Threads media in your browser. No account is required."
            placeholder="Paste"
          />
        </div>
        </div>

        {/* ── Section 3: Original Introduction & What Downloadit Is ── */}
        <section
          id="about-intro"
          className="mx-auto max-w-[1240px] px-4 py-8 sm:px-6 sm:py-12 lg:px-8 xl:px-12"
          aria-labelledby="about-intro-heading"
        >
          <div className={`seo-card rounded-[28px] border border-border/80 bg-card p-6 sm:p-10 lg:p-12 shadow-[var(--shadow-card)] space-y-6${seoOpen ? " is-open" : ""}`}>
            <div className="seo-collapse space-y-6">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-light px-3.5 py-1 text-[11px] font-bold tracking-wider uppercase text-primary-strong">
                <Sparkles size={13} />
                Welcome to Downloadit.pro
              </span>
              <h2
                id="about-intro-heading"
                className="mt-3 text-[24px] font-extrabold tracking-tight text-fg sm:text-[32px] leading-tight"
              >
                Fast, Safe, and Independent Online Media Downloader
              </h2>
              <p className="mt-3 text-[15px] sm:text-[16px] leading-relaxed text-fg-muted">
                Downloadit is a purpose-built web tool created to give everyday users and digital creators a transparent,
                reliable way to save publicly available social media content. Whether you are archiving your own creative posts,
                saving visual design inspiration for a moodboard, or keeping educational video tutorials for offline reference,
                Downloadit makes media saving fast and straightforward.
              </p>
              <p className="mt-3 text-[15px] sm:text-[16px] leading-relaxed text-fg-muted">
                Unlike ad-bloated conversion websites that require sketchy browser extensions or software downloads, Downloadit
                operates entirely within your web browser. It requests the public file the platform already serves, as MP4,
                JPEG, or MP3. The saved file matches that source, including any mark the creator put on the post.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border-light">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-bg/50">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileVideo className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-fg text-[14.5px]">HD Video (MP4)</h3>
                  <p className="text-[12.5px] text-fg-muted mt-0.5">The progressive MP4 the public post already provides, with its audio.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-bg/50">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileImage className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-fg text-[14.5px]">Original Photos (JPEG)</h3>
                  <p className="text-[12.5px] text-fg-muted mt-0.5">JPEG or PNG photos and carousel slides in the size the post serves.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-bg/50">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileAudio className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-fg text-[14.5px]">Clear Audio (MP3)</h3>
                  <p className="text-[12.5px] text-fg-muted mt-0.5">High-fidelity MP3 sound extraction from supported public video posts.</p>
                </div>
              </div>
            </div>
            </div>
            <button
              type="button"
              className="seo-read-more"
              aria-expanded={seoOpen}
              onClick={() => setSeoOpen((open) => !open)}
            >
              {seoOpen ? "Show less" : "Read more"}
            </button>
          </div>
        </section>

        {/* ── Section 4: Explore All Downloaders by Platform ── */}
        <section
          id="platform-guide"
          className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-12"
          aria-labelledby="platform-guide-heading"
        >
          <div className="mx-auto mb-4 max-w-2xl text-center">
            <h2
              id="platform-guide-heading"
              className="text-[24px] font-extrabold tracking-tight text-fg sm:text-[30px]"
            >
              Explore All Downloaders by Platform
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-fg-muted sm:text-[15px]">
              Choose a platform to open every supported downloader, feature and public media type.
            </p>
          </div>

          <div className="platform-hub-grid">
            {PLATFORM_CATEGORIES.map((platform) => {
              const Icon = platform.icon;
              return (
                <article
                  key={platform.id}
                  className="platform-hub-card group"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: platform.badgeBg, color: platform.color }}
                    >
                      <Icon size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="platform-hub-title">
                        {platform.name}
                      </h3>
                      <p className="truncate text-[12px] leading-snug text-fg-muted">
                        {platform.desc}
                      </p>
                    </div>
                  </div>

                  <ul className="mt-3 border-t border-border-light">
                    {platform.items.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          title={item.desc}
                          className="platform-hub-item group/item"
                        >
                          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-fg group-hover/item:text-primary">
                            {item.name}
                            <span className="ml-1.5 font-medium text-fg-muted">· {item.desc}</span>
                          </span>
                          <ArrowRight size={14} className="shrink-0 text-fg-subtle transition-transform group-hover/item:translate-x-0.5 group-hover/item:text-primary" aria-hidden="true" />
                        </Link>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto pt-2">
                    <Link
                      href={platform.mainHref}
                      aria-label={`Open ${platform.name}`}
                      className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-primary hover:underline"
                    >
                      <span>Open {platform.shortName} Downloader</span>
                      <ArrowRight size={13} aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              );
            })}
            <article className="platform-hub-card platform-hub-card--soon" aria-label="More downloaders coming soon">
              <h3 className="platform-hub-title">More coming soon</h3>
              <p className="mt-1 text-[13px] leading-snug text-fg-muted">
                New public downloaders will appear here. The five platforms above are the ones Downloadit supports today.
              </p>
            </article>
          </div>
        </section>

        {/* ── Section 5: How It Works (Step-by-Step) ── */}
        <section
          id="how-to-use"
          className="mx-auto max-w-[1240px] px-4 py-12 sm:px-6 sm:py-16 lg:px-8 xl:px-12"
          aria-labelledby="how-to-use-heading"
        >
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
            <h2
              id="how-to-use-heading"
              className="text-[24px] font-extrabold tracking-tight text-fg sm:text-[32px]"
            >
              How to Save Media with Downloadit
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-fg-muted sm:text-[16px]">
              Save any public video, photo, or audio track in four effortless steps on phone, tablet, or PC.
            </p>
            <p className="how-zero-logs">Zero Download Logs</p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_TO_STEPS.map((step) => {
              const Icon = step.Icon;
              return (
                <div
                  key={step.num}
                  className="relative flex flex-col items-center rounded-2xl border border-border bg-card p-6 text-center shadow-xs transition-transform hover:-translate-y-1"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-primary mb-4">
                    <Icon size={22} strokeWidth={2.2} />
                  </span>
                  <span className="text-[12px] font-extrabold tracking-widest text-primary-strong">
                    STEP {step.num}
                  </span>
                  <h3 className="mt-1 text-[16px] font-bold text-fg">{step.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-fg-muted">
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Section 6: Supported Media vs Real Limitations (Transparency & Trust) ── */}
        <section
          id="capabilities-limitations"
          className="mx-auto max-w-[1240px] px-4 py-10 sm:px-6 sm:py-14 lg:px-8 xl:px-12"
          aria-labelledby="capabilities-heading"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {/* What Downloadit CAN Do */}
            <div className="rounded-[24px] border border-success/30 bg-card p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-2.5 text-success">
                <CheckCircle2 className="h-6 w-6 shrink-0" />
                <h3 id="capabilities-heading" className="text-[20px] font-bold text-fg">
                  What Downloadit Supports
                </h3>
              </div>
              <ul className="space-y-3 text-[14px] leading-relaxed text-fg-muted">
                <li className="flex items-start gap-2">
                  <span className="text-success font-bold mt-0.5">✓</span>
                  <span><strong>Public Videos:</strong> The progressive MP4 a public Instagram Reel, Facebook post, Pinterest Pin, X clip, or Threads post already provides.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success font-bold mt-0.5">✓</span>
                  <span><strong>Master Photos &amp; Carousels:</strong> Original full-resolution JPEG and PNG images from public posts, including multi-slide carousel albums.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success font-bold mt-0.5">✓</span>
                  <span><strong>Active Instagram Stories:</strong> Public Stories can be saved while they are still live, inside the 24-hour window.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success font-bold mt-0.5">✓</span>
                  <span><strong>Source File:</strong> Downloadit saves the public file the platform serves. Marks the creator placed on the post stay on the file.</span>
                </li>
              </ul>
            </div>

            {/* What Downloadit CANNOT Do (Real Limitations) */}
            <div className="rounded-[24px] border border-warning/30 bg-card p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-2.5 text-warning">
                <AlertTriangle className="h-6 w-6 shrink-0" />
                <h3 className="text-[20px] font-bold text-fg">
                  Important Service Limitations
                </h3>
              </div>
              <ul className="space-y-3 text-[14px] leading-relaxed text-fg-muted">
                <li className="flex items-start gap-2">
                  <span className="text-warning font-bold mt-0.5">✕</span>
                  <span><strong>No Private Content:</strong> Posts, pins, or profiles set to private, secret, or followers-only cannot be retrieved under any circumstance.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-warning font-bold mt-0.5">✕</span>
                  <span><strong>No Expired Stories:</strong> Once an Instagram story passes its 24-hour lifespan, platform servers purge it; expired media cannot be recovered.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-warning font-bold mt-0.5">✕</span>
                  <span><strong>No Access Control Bypassing:</strong> We do not circumvent passwords, paywalls, DRM encryption, or account security mechanisms.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-warning font-bold mt-0.5">✕</span>
                  <span><strong>No Bulk Channel Scraping:</strong> Downloadit processes individual post links one at a time to prevent infrastructure abuse.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── Section 7: Copyright, Fair Use & Responsible Use ── */}
        <section
          id="responsible-use"
          className="mx-auto max-w-[1240px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8 xl:px-12"
          aria-labelledby="responsible-use-heading"
        >
          <div className="rounded-[24px] border border-border bg-card p-6 sm:p-8 flex flex-col md:flex-row items-start gap-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary">
              <Scale className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h3 id="responsible-use-heading" className="text-[18px] font-bold text-fg">
                Copyright Compliance &amp; Responsible Use
              </h3>
              <p className="text-[14px] leading-relaxed text-fg-muted">
                Downloadit respects the intellectual property rights of content creators, photographers, artists, and media publishers.
                Our service is intended solely for personal archiving, creative inspiration, educational research, and offline backup
                of your own published media.
              </p>
              <p className="text-[13.5px] leading-relaxed text-fg-muted">
                Downloading copyrighted works without permission for commercial redistribution, unauthorized public broadcasts, or re-uploading
                to monetize third-party content violates copyright laws and the terms of service of the respective platforms. Please respect
                the original creators by seeking permission and providing appropriate attribution when referencing their work.
                For copyright infringement inquiries, visit our <Link href="/dmca" className="text-primary underline">DMCA / Copyright Policy</Link>.
              </p>
            </div>
          </div>
        </section>

        {/* ── Section 8: Why Choose Downloadit? ── */}
        <section
          id="why-choose-us"
          className="mx-auto max-w-[1240px] px-4 py-10 sm:px-6 sm:py-14 lg:px-8 xl:px-12"
          aria-labelledby="why-choose-heading"
        >
          <div className="rounded-[28px] border border-border/80 bg-card p-6 sm:p-10 lg:p-12 shadow-[var(--shadow-card)]">
            <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-light px-3.5 py-1 text-[11px] font-bold tracking-wider uppercase text-[#9d2466]">
                <Sparkles size={13} />
                Honest &amp; Dependable
              </span>
              <h2
                id="why-choose-heading"
                className="mt-2 text-[24px] font-extrabold tracking-tight text-fg sm:text-[32px]"
              >
                Why Choose Downloadit?
              </h2>
              <p className="mt-2 text-[14px] leading-relaxed text-fg-muted sm:text-[16px]">
                Built for speed, simplicity, and total respect for user privacy. No spyware, no popups, and no sign-up forms.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
              {WHY_CHOOSE_ITEMS.map((item) => {
                const Icon = item.Icon;
                return (
                  <div
                    key={item.title}
                    className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-bg/50 p-5 transition-colors hover:border-primary/30 hover:bg-card"
                  >
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: `${item.color}15`, color: item.color }}
                    >
                      <Icon size={20} strokeWidth={2.2} />
                    </span>
                    <h3 className="text-[16px] font-bold text-fg">{item.title}</h3>
                    <p className="text-[13px] leading-relaxed text-fg-muted">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Section 9: Frequently Asked Questions (Server-Rendered Native Accordion) ── */}
        <section
          id="faq"
          className="mx-auto max-w-[960px] px-4 py-12 sm:px-6 sm:py-16 lg:px-8"
          aria-labelledby="faq-heading"
        >
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
            <h2
              id="faq-heading"
              className="text-[24px] font-extrabold tracking-tight text-fg sm:text-[32px]"
            >
              Frequently Asked Questions
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-fg-muted sm:text-[16px]">
              Honest, detailed answers about Downloadit, supported media types, and downloading guidelines.
            </p>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => (
              <details
                key={idx}
                className="group rounded-2xl border border-border bg-card transition-colors hover:border-primary/40 open:border-primary/50"
              >
                <summary className="flex cursor-pointer items-center justify-between p-5 text-[15.5px] font-bold text-fg select-none">
                  <span className="pr-4">{faq.q}</span>
                  <ChevronDown className="h-5 w-5 shrink-0 text-fg-muted transition-transform duration-200 group-open:rotate-180 group-open:text-primary" />
                </summary>
                <div className="px-5 pb-5 pt-1 text-[14.5px] text-fg-muted leading-relaxed border-t border-border/40">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </section>

        <section
          id="guides"
          className="mx-auto max-w-[1240px] px-4 py-8 sm:px-6 sm:py-12 lg:px-8 xl:px-12"
          aria-labelledby="guides-heading"
        >
          <div className="mx-auto mb-6 max-w-2xl text-center">
            <h2 id="guides-heading" className="text-[24px] font-extrabold tracking-tight text-fg sm:text-[32px]">
              Guides for saving public media
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-fg-muted">
              These explain what Downloadit can save, what it refuses, and when you need the creator&apos;s permission. Read them before you reuse a file.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["/blog/is-it-legal-download-instagram-videos", "Is it legal to download Instagram videos?", "Own files, private viewing, permission, and the cases where saving a public post is still the wrong move."],
              ["/blog/instagram-copyright-basics-creators", "Instagram copyright basics for creators", "Who owns a post, what a public account does not give away, and what to do if someone reuses your work."],
              ["/blog/private-vs-public-instagram-content", "Private vs public Instagram content", "Why a link you can open while logged in still fails, and how to tell a public post from a private one."],
              ["/blog/permission-reuse-instagram-content", "How to get permission to reuse a post", "A practical way to ask the rights holder, and what to keep if they say yes."],
              ["/blog/pinterest-copyright-basics", "Pinterest copyright basics", "The difference between viewing a Pin, saving it, and republishing it."],
              ["/blog/downloader-not-working-fix", "Downloader not working?", "The checks that explain a failed link: privacy, expiry, the wrong URL, and an in-app browser."],
            ].map(([href, title, text]) => (
              <Link
                key={href}
                href={href}
                className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] transition-colors hover:border-primary/40"
              >
                <span className="block text-[16px] font-bold text-fg">{title}</span>
                <span className="mt-2 block text-[14px] leading-relaxed text-fg-muted">{text}</span>
              </Link>
            ))}
          </div>
          <p className="mt-5 text-center">
            <Link href="/blog" className="text-[14px] font-bold text-primary hover:underline">
              Read all guides
            </Link>
          </p>
        </section>

        {/* ── Section 10: Call to Action Banner ── */}
        <section
          id="cta"
          className="mx-auto max-w-[1240px] px-4 py-8 sm:px-6 sm:py-12 lg:px-8 xl:px-12 mb-8"
        >
          <div
            className="relative overflow-hidden rounded-[28px] p-8 sm:p-12 text-center text-white shadow-xl"
            style={{
              background: "linear-gradient(135deg, #7c4df5 0%, #ec5fa8 60%, #f58e5b 100%)",
            }}
          >
            <div className="relative z-10 max-w-2xl mx-auto space-y-3">
              <span className="inline-block rounded-full bg-white/20 backdrop-blur-md px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-widest text-white">
                Start Saving Media Today
              </span>
              <h2 className="text-[26px] sm:text-[36px] font-extrabold tracking-tight text-white leading-tight">
                Ready to Save Your Favorite Public Media?
              </h2>
              <p className="text-[14px] sm:text-[16px] text-white/90 leading-relaxed max-w-xl mx-auto">
                Paste your Instagram, Pinterest, Facebook, Twitter/X, or Threads link above to get started in seconds.
              </p>
              <div className="pt-4">
                <button
                  type="button"
                  onClick={scrollToDownloader}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-3.5 text-[15px] font-bold text-primary shadow-lg transition-all hover:bg-white/95 hover:scale-105 active:scale-95"
                >
                  <Download className="h-5 w-5" strokeWidth={2.4} />
                  <span>Start Downloading</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ Structured Data for Google Search ── */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: FAQS.map((faq) => ({
                "@type": "Question",
                name: faq.q,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: faq.a,
                },
              })),
            }),
          }}
        />

        <Footer />
      </main>
    </>
  );
}