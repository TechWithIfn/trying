"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import HeroDownloader, { type DownloaderTab } from "@/components/HeroDownloader";
import Footer from "@/components/Footer";
import {
  FacebookIcon,
  InstagramIcon,
  PinterestIcon,
  ThreadsIcon,
  TwitterIcon,
  YouTubeIcon,
} from "@/components/ToolCategoryDropdown";
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
} from "lucide-react";

const POPULAR_DOWNLOADERS = [
  {
    name: "Instagram Downloader",
    shortName: "Instagram",
    href: "/instagram-video-downloader",
    Icon: InstagramIcon,
    color: "#ec5fa8",
    badgeBg: "rgba(236, 95, 168, 0.12)",
    desc: "Download high-definition Reels, long video posts, swipe carousels, full-size photos, and live stories with original audio.",
    mediaTypes: ["Reels (MP4)", "Videos", "Photos", "Carousels", "Stories", "Audio (MP3)"],
  },
  {
    name: "Pinterest Downloader",
    shortName: "Pinterest",
    href: "/pinterest-video-downloader",
    Icon: PinterestIcon,
    color: "#e60023",
    badgeBg: "rgba(230, 0, 35, 0.10)",
    desc: "Save video pins, recipe clips, aesthetic Idea pins, and original-resolution image boards directly to your device.",
    mediaTypes: ["Pin Videos (MP4)", "Idea Pins", "Original Images (JPG/PNG)", "Carousels"],
  },
  {
    name: "YouTube Downloader",
    shortName: "YouTube",
    href: "/youtube-video-downloader",
    Icon: YouTubeIcon,
    color: "#ff0000",
    badgeBg: "rgba(255, 0, 0, 0.09)",
    desc: "Download public YouTube videos, trending Shorts, and extract crystal-clear sound tracks in MP3 or M4A format.",
    mediaTypes: ["Videos up to 1080p", "Shorts (9:16)", "Audio (MP3 / M4A)"],
  },
  {
    name: "Facebook Downloader",
    shortName: "Facebook",
    href: "/facebook-video-downloader",
    Icon: FacebookIcon,
    color: "#1877f2",
    badgeBg: "rgba(24, 119, 242, 0.10)",
    desc: "Save publicly accessible Facebook feed videos, viral Reels, and Watch streams in progressive MP4 format.",
    mediaTypes: ["Watch Videos (MP4)", "Facebook Reels", "Public Post Videos"],
  },
  {
    name: "Twitter/X Downloader",
    shortName: "Twitter/X",
    href: "/twitter-video-downloader",
    Icon: TwitterIcon,
    color: "#0f172a",
    badgeBg: "rgba(15, 23, 42, 0.10)",
    desc: "Download MP4 videos and animated GIFs from public tweets and posts on twitter.com and x.com without signing in.",
    mediaTypes: ["Tweet Videos (MP4)", "Looped GIFs", "Best Supported Quality"],
  },
  {
    name: "Threads Downloader",
    shortName: "Threads",
    href: "/threads-video-downloader",
    Icon: ThreadsIcon,
    color: "#0f172a",
    badgeBg: "rgba(15, 23, 42, 0.10)",
    desc: "Save media clips and high-resolution photos shared by creators across the public Threads network with ease.",
    mediaTypes: ["Threads Video (MP4)", "Original Photos", "Multi-Media Posts"],
  },
] as const;

const WHY_CHOOSE_ITEMS = [
  {
    title: "Free to Use",
    desc: "100% free tool with no subscription, no hidden payments, and no download credits required.",
    Icon: CheckCircle2,
    color: "#10b981",
  },
  {
    title: "No Registration Required",
    desc: "Start downloading immediately. We never ask for your email, phone number, or social media logins.",
    Icon: Shield,
    color: "#7c4df5",
  },
  {
    title: "Simple and Fast",
    desc: "High-speed media extraction engine resolves public links in seconds with smooth, real-time feedback.",
    Icon: Zap,
    color: "#f58e5b",
  },
  {
    title: "Multiple Supported Platforms",
    desc: "One central hub for Instagram, Pinterest, YouTube, Facebook, Twitter/X, and Threads media.",
    Icon: Globe,
    color: "#0ea5e9",
  },
  {
    title: "Easy-to-Use Interface",
    desc: "Clean, responsive design made for touchscreens and desktop monitors alike. Just paste and save.",
    Icon: Smartphone,
    color: "#ec5fa8",
  },
  {
    title: "Privacy-Conscious Experience",
    desc: "We do not store your files, maintain user profiles, or track your personal browsing habits.",
    Icon: EyeOff,
    color: "#6366f1",
  },
] as const;

const HOW_TO_STEPS = [
  {
    num: "01",
    title: "Copy the Media Link",
    desc: "Open the public video, Reel, Pin, or post on the source platform and copy its share link to your clipboard.",
    Icon: Link2,
  },
  {
    num: "02",
    title: "Paste and Preview",
    desc: "Paste the URL into the Downloadit search box above. Our resolver detects the platform and displays the media preview.",
    Icon: ScanSearch,
  },
  {
    num: "03",
    title: "Download Your Media",
    desc: "Choose your preferred available quality or format (such as MP4 or MP3) and save the file directly to your device.",
    Icon: Download,
  },
] as const;

const FAQS = [
  {
    q: "Is Downloadit free?",
    a: "Yes, Downloadit is completely free to use. There are no registration fees, subscription costs, or hidden charges. You can download as many public videos and media items as you need.",
  },
  {
    q: "Do I need to create an account?",
    a: "No. You never need to create an account, log in, or give us your social media passwords. Downloadit works directly with public links that are already viewable without an account.",
  },
  {
    q: "Which platforms are supported?",
    a: "Downloadit supports six major platforms: Instagram (Reels, Videos, Photos, Stories, Audio), Pinterest (Videos, Pins, Images), YouTube (Videos, Shorts, MP3/M4A Audio), Facebook (Watch Videos, Reels), Twitter/X (Videos, GIFs), and Threads (Videos, Images).",
  },
  {
    q: "How do I download Instagram Reels?",
    a: "Open the Instagram Reel in the Instagram app or browser, tap Share, and select 'Copy link'. Next, paste that link into the input box on Downloadit and tap 'Get Media'. Preview the Reel and select Download to save the MP4 to your phone or computer.",
  },
  {
    q: "Can I download Pinterest videos?",
    a: "Yes. Simply copy the link to any public Pinterest video pin or Idea pin, paste it into Downloadit, and save the original MP4 file with sound.",
  },
  {
    q: "Does Downloadit support YouTube Shorts?",
    a: "Yes. Both regular YouTube videos and vertical YouTube Shorts are fully supported. You can download them as MP4 videos in supported quality up to 1080p, or extract the audio track as an MP3 file.",
  },
  {
    q: "Can I download Facebook videos?",
    a: "Yes, Downloadit can download public Facebook feed videos, Facebook Reels, and Watch clips as MP4 files. The post must be public and accessible without logging in.",
  },
  {
    q: "Does Downloadit support Twitter/X?",
    a: "Yes. Paste any public tweet or post link containing a video or animated GIF. Downloadit will extract the progressive MP4 stream for instant downloading.",
  },
  {
    q: "Can I download Threads media?",
    a: "Yes. Public Threads posts with video or images can be downloaded by copying the post link and pasting it into Downloadit.",
  },
  {
    q: "Why is my link not working?",
    a: "Common reasons include: the post is set to private, the creator deleted the post, the content is region-locked or age-restricted, or you copied a user profile URL rather than a specific post URL. Make sure to copy the direct URL of an individual public post.",
  },
  {
    q: "Why is some media unavailable?",
    a: "Platforms frequently update their media delivery systems and sign their CDN links with expiration tokens. If a preview fails, refresh the page and paste the link again. Also note that private accounts, restricted groups, and copyright-protected DRM media cannot be accessed.",
  },
  {
    q: "Is my download history stored?",
    a: "No. Downloadit does not keep a log of your downloads, search history, or personal identity. All processing happens in real-time between your browser and the public content servers.",
  },
] as const;

export default function HomeClient() {
  const [activeTab, setActiveTab] = useState<DownloaderTab | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0); // First FAQ open by default

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
    // Focus the input
    setTimeout(() => {
      const input = document.getElementById("downloadit-url-input") || document.getElementById("downloadit-url-input-mobile");
      input?.focus();
    }, 400);
  };

  const toggleFaq = (idx: number) => {
    setOpenFaq((prev) => (prev === idx ? null : idx));
  };

  return (
    <>
      <Header activeDownloaderTab={activeTab} onDownloaderTabChange={handleDownloaderTabChange} />

      <main id="main-content" className="flex-1">
        {/* ── Section 1 & 2: Hero & Main Download Box ── */}
        <div id="main-downloader">
          <HeroDownloader
            variant="home"
            activeTab={activeTab}
            onActiveTabChange={setActiveTab}
            badge="FAST • FREE • NO LOGIN REQUIRED"
            titleA="Download Your Favorite Media "
            titleB="in One Place"
            subtitle="One simple downloader for Instagram, Pinterest, YouTube, Facebook, Twitter/X and Threads."
            placeholder="Paste link"
          />
        </div>

        {/* ── Below the Fold: Trust Indicators & Supported Platforms ── */}
        <section
          id="supported-platforms"
          className="mx-auto max-w-[1240px] px-4 pt-12 pb-14 sm:px-6 sm:pt-16 sm:pb-20 lg:px-8 xl:px-12"
          aria-label="Supported Platforms and Features"
        >
          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 text-[13px] sm:text-[14px] font-medium text-fg-muted mb-8 sm:mb-10">
            <span className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-success" />
              No account required
            </span>
            <span className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-success" />
              Public content only
            </span>
            <span className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-success" />
              No download history
            </span>
          </div>

          {/* Supported Platforms */}
          <div className="flex flex-col items-center justify-center text-center">
            <span className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-fg-subtle mb-3 sm:mb-4">
              Works with public media from 6 top networks
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3.5">
              {POPULAR_DOWNLOADERS.map((platform) => {
                const Icon = platform.Icon;
                return (
                  <Link
                    key={platform.name}
                    href={platform.href}
                    title={platform.name}
                    className="flex min-h-[44px] items-center gap-2.5 rounded-2xl border border-border bg-card px-4 py-2 text-[13.5px] font-bold text-fg-muted shadow-xs transition-all duration-200 hover:border-primary/40 hover:bg-primary-light/50 hover:text-primary hover:-translate-y-0.5"
                  >
                    <span style={{ color: platform.color }}>
                      <Icon size={19} />
                    </span>
                    <span>{platform.shortName}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Section 4: Why Choose Downloadit? ── */}
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
                Built for speed, simplicity, and respect for your device. No malware, no popups, and no sign-up forms.
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

        {/* ── Section 5: How to Use Downloadit ── */}
        <section
          id="how-to-use"
          className="mx-auto max-w-[1240px] px-4 py-12 sm:px-6 sm:py-16 lg:px-8 xl:px-12"
          aria-labelledby="how-to-use-heading"
        >
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
            <p className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-primary-strong">
              Simple 3-Step Process
            </p>
            <h2
              id="how-to-use-heading"
              className="mt-1.5 text-[24px] font-extrabold tracking-tight text-fg sm:text-[32px]"
            >
              How to Use Downloadit
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-fg-muted sm:text-[16px]">
              Save any public media in three effortless steps on desktop, tablet, or smartphone.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {HOW_TO_STEPS.map((step) => {
              const Icon = step.Icon;
              return (
                <div
                  key={step.num}
                  className="relative flex flex-col items-center rounded-2xl border border-border bg-card p-6 text-center shadow-xs transition-transform hover:-translate-y-1"
                >
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-primary mb-4"
                  >
                    <Icon size={22} strokeWidth={2.2} />
                  </span>
                  <span className="text-[12px] font-extrabold tracking-widest text-primary-strong">
                    STEP {step.num}
                  </span>
                  <h3 className="mt-1 text-[17px] font-bold text-fg">{step.title}</h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-fg-muted">
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Section 6: Platform Guide ── */}
        <section
          id="platform-guide"
          className="mx-auto max-w-[1240px] px-4 py-10 sm:px-6 sm:py-14 lg:px-8 xl:px-12"
          aria-labelledby="platform-guide-heading"
        >
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
            <p className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-primary-strong">
              Detailed Platform Coverage
            </p>
            <h2
              id="platform-guide-heading"
              className="mt-1.5 text-[24px] font-extrabold tracking-tight text-fg sm:text-[32px]"
            >
              Complete Media Support Guide
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-fg-muted sm:text-[16px]">
              Learn what content each dedicated downloader can save and find the perfect tool for your workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5">
            {POPULAR_DOWNLOADERS.map((platform) => {
              const Icon = platform.Icon;
              return (
                <div
                  key={platform.shortName}
                  className="flex flex-col justify-between rounded-xl border border-border/80 bg-card p-5 transition-colors hover:border-primary/40"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                        style={{ background: platform.badgeBg, color: platform.color }}
                      >
                        <Icon size={20} />
                      </span>
                      <div>
                        <h3 className="text-[16px] font-bold text-fg">{platform.name}</h3>
                        <span className="text-[11px] font-semibold text-fg-subtle">Public media only</span>
                      </div>
                    </div>
                    <p className="text-[13px] leading-relaxed text-fg-muted">
                      {platform.desc}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border-light flex items-center justify-between">
                    <span className="text-[11px] font-bold text-primary-strong uppercase tracking-wider">
                      Verified Tool
                    </span>
                    <Link
                      href={platform.href}
                      aria-label={`Learn more about ${platform.name}`}
                      className="inline-flex items-center gap-1 text-[13px] font-bold text-primary hover:underline"
                    >
                      <span>Learn More</span>
                      <span className="sr-only"> about {platform.shortName}</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Section 7: Frequently Asked Questions ── */}
        <section
          id="faq"
          className="mx-auto max-w-[960px] px-4 py-12 sm:px-6 sm:py-16 lg:px-8"
          aria-labelledby="faq-heading"
        >
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
            <p className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-primary-strong">
              Got Questions?
            </p>
            <h2
              id="faq-heading"
              className="mt-1.5 text-[24px] font-extrabold tracking-tight text-fg sm:text-[32px]"
            >
              Frequently Asked Questions
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-fg-muted sm:text-[16px]">
              Honest answers to the most common questions about Downloadit and media saving.
            </p>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={faq.q}
                  className="rounded-2xl border border-border bg-card transition-colors overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-primary-light/30"
                  >
                    <span className="text-[15px] sm:text-[16px] font-bold text-fg leading-snug">
                      {faq.q}
                    </span>
                    <ChevronDown
                      className="h-5 w-5 shrink-0 text-fg-muted transition-transform duration-200"
                      style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-[14px] leading-relaxed text-fg-muted border-t border-border-light bg-bg/40 animate-fade-in">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Section 8: Final Call to Action ── */}
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
                Ready to Download Your Favorite Media?
              </h2>
              <p className="text-[14px] sm:text-[16px] text-white/90 leading-relaxed max-w-xl mx-auto">
                Paste your media link and get started in seconds. Fast, free, and completely anonymous.
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

        {/* ── FAQ Structured Data for Google Rich Results ── */}
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
