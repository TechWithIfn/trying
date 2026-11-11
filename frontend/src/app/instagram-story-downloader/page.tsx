import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ToolDownloader from "@/components/ToolDownloader";
import { TOOL_PAGES, toolMetadata } from "@/config/toolPages";
import {
  ChevronDown,
  Film,
  Smartphone,
  Zap,
  Sparkles,
  ArrowRight,
  Monitor,
  Lock,
  HeartHandshake,
  Image as ImageIcon,
  Music,
  Clock,
  EyeOff,
} from "lucide-react";

const PAGE = TOOL_PAGES.instagramStory;

export const metadata: Metadata = toolMetadata(PAGE);

const FAQS = [
  {
    q: "How to download Instagram Stories online?",
    a: "Open the Instagram app or website, open the active Story you wish to save, tap the Share icon, and select 'Copy link'. Paste that link into the Downloadit Story Downloader input above, click 'Download Media', and tap 'Download' to save the video (MP4) or photo (JPEG) straight to your device.",
  },
  {
    q: "Can I download Stories after 24 hours have passed?",
    a: "No. Instagram Stories are inherently ephemeral and expire automatically after 24 hours. Once a story expires, Instagram deletes it from public access. Downloadit can only download active public stories while they remain live within their 24-hour window.",
  },
  {
    q: "Is downloading Instagram Stories anonymous?",
    a: "Yes. Downloadit does not log into your Instagram account, so fetching a public Story does not add you to the creator's viewer list. We do not ask for your profile or password.",
  },
  {
    q: "Can I download Stories from private Instagram accounts?",
    a: "No. Downloadit operates strictly with publicly accessible content. Stories posted by private profiles that require follow approval cannot be fetched or previewed.",
  },
  {
    q: "Can I download Instagram Stories with music or audio?",
    a: "Yes. Video stories saved through Downloadit include all attached background music, voice narration, and sound effects in full stereo audio.",
  },
  {
    q: "What file format will the downloaded Story be?",
    a: "Video stories are saved as industry-standard MP4 files with H.264 video and AAC audio. Photo stories are saved as high-resolution JPEG images.",
  },
  {
    q: "Is Downloadit Instagram Story Downloader free?",
    a: "Yes. Downloadit does not charge for Story downloads and requires no account or subscription. The tool is intended for saving active public Stories before they expire.",
  },
  {
    q: "Do I need an Instagram account to download Stories?",
    a: "No. You do not need to register, log in, or provide any Instagram credentials. Anyone with a valid public Story link can download it immediately.",
  },
  {
    q: "Does Downloadit store or archive downloaded Stories?",
    a: "No. Downloadit does not store, archive, or cache any user media on our servers. All files are fetched on demand and streamed directly to your browser.",
  },
  {
    q: "Which devices can save an Instagram Story?",
    a: "The page works in current Safari, Chrome, Firefox, Edge, and Samsung Internet builds on iPhone, iPad, Android phones, Windows, macOS, and Linux. Downloaded MP4 or JPEG files go to your browser's default download location.",
  },
];

const OTHER_TOOLS = [
  {
    title: "Instagram Reels Downloader",
    href: "/instagram-reels-downloader",
    desc: "Download vertical short-form Reels in the highest MP4 quality available from the post.",
    icon: Film,
    badge: "Trending",
  },
  {
    title: "Instagram Video Downloader",
    href: "/instagram-video-downloader",
    desc: "Save regular feed videos and longer clips in the available MP4 quality.",
    icon: Film,
    badge: "All Formats",
  },
  {
    title: "Instagram Photo & Carousel",
    href: "/instagram-photo-downloader",
    desc: "Download single pictures and all slides from multi-image album posts in original JPEG.",
    icon: ImageIcon,
    badge: "Full Resolution",
  },
  {
    title: "Instagram Audio Downloader",
    href: "/instagram-audio-downloader",
    desc: "Extract background tracks, trending sounds, and voiceovers as MP3 audio.",
    icon: Music,
    badge: "MP3 Audio",
  },
];

export default function StoryDownloaderPage() {
  const jsonLdWebPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Instagram Story Downloader – Save Stories Online",
    description:
      "Download Instagram Stories online with Downloadit. Save active public story videos and photos in high quality before they expire. Anonymous and free.",
    url: "https://www.downloadit.pro/instagram-story-downloader",
    inLanguage: "en-US",
    isPartOf: {
      "@type": "WebSite",
      name: "Downloadit",
      url: "https://www.downloadit.pro",
    },
  };

  const jsonLdWebApp = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Downloadit Instagram Story Downloader",
    url: "https://www.downloadit.pro/instagram-story-downloader",
    applicationCategory: "MultimediaApplication",
    operatingSystem: "All",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "Download active public Instagram Story videos and photos",
      "100% anonymous downloading without appearing in the viewer list",
      "High definition vertical MP4 video with original audio",
      "Full-resolution JPEG image extraction",
      "No account login or registration required",
      "Free to use without an account",
    ],
  };

  const jsonLdBreadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://www.downloadit.pro",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Instagram Downloader",
        item: "https://www.downloadit.pro/instagram-video-downloader",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Instagram Story Downloader",
        item: "https://www.downloadit.pro/instagram-story-downloader",
      },
    ],
  };

  const jsonLdFaq = {
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
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebPage) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebApp) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
      />

      <Header />

      <main id="main-content" className="flex-1">
        {/* Hero Downloader Box */}
        <ToolDownloader page={PAGE} />

        {/* Content Section */}
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10 sm:space-y-14 text-fg leading-relaxed">

          {/* Section 1: Introduction & Overview */}
          <section className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
              Download Instagram Stories Online Anonymously
            </h2>
            <p className="text-[15.5px] sm:text-[16.5px] text-fg-muted leading-relaxed">
              Instagram Stories have become the most popular medium for sharing spontaneous, real-time life updates,
              behind-the-scenes clips, announcements, and short video clips. Because Stories disappear after 24 hours,
              saving memorable moments or critical reference clips before they disappear is a constant necessity.
            </p>
            <p className="text-[15.5px] sm:text-[16.5px] text-fg-muted leading-relaxed">
              <strong>Downloadit Instagram Story Downloader</strong> is a fast, web-based tool that lets you watch
              and save active public Instagram Stories completely anonymously. When you use our service, your Instagram
              username never appears in the creator&apos;s story viewer list. You can save both video stories (MP4) and
              photo stories (JPEG) in full original resolution without logging in.
            </p>
          </section>

          {/* Section 2: How to Download Step-by-Step */}
          <section className="space-y-6">
            <div className="border-b border-border pb-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
                How to Download Instagram Stories
              </h2>
              <p className="text-[14.5px] sm:text-[15.5px] text-fg-muted mt-1">
                Save active public Instagram Stories to your phone or PC in four easy steps.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                    1
                  </span>
                  <h3 className="font-bold text-fg text-[16px]">Copy the Story Link</h3>
                </div>
                <p className="text-[14px] text-fg-muted leading-relaxed">
                  Open the active Story in the Instagram app, tap the <strong>Share</strong> paper airplane icon or the
                  three dots menu, and tap <strong>Copy link</strong>. On desktop, copy the story URL directly from your browser.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                    2
                  </span>
                  <h3 className="font-bold text-fg text-[16px]">Paste into Downloadit</h3>
                </div>
                <p className="text-[14px] text-fg-muted leading-relaxed">
                  Paste the Story link into the input field above. On mobile, tap the <strong>Paste</strong> button to
                  insert the link immediately.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                    3
                  </span>
                  <h3 className="font-bold text-fg text-[16px]">Preview Story Media</h3>
                </div>
                <p className="text-[14px] text-fg-muted leading-relaxed">
                  Click <strong>Download Media</strong>. Downloadit contacts Instagram CDN endpoints anonymously and displays
                  a responsive preview of the story video or photo.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                    4
                  </span>
                  <h3 className="font-bold text-fg text-[16px]">Save Video or Photo</h3>
                </div>
                <p className="text-[14px] text-fg-muted leading-relaxed">
                  Click <strong>Download</strong>. Your device will save the MP4 video (with audio) or original
                  JPEG picture right to your gallery or Downloads folder.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: 24-Hour Expiry Window Explained */}
          <section className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
              The 24-Hour Expiry Window Explained
            </h2>
            <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
              <div className="flex items-center gap-2 text-warning font-bold text-[16px]">
                <Clock className="h-5 w-5" />
                <span>Important Lifespan Notice</span>
              </div>
              <p className="text-[15px] text-fg-muted leading-relaxed">
                By platform design, Instagram Stories automatically expire and disappear 24 hours after being posted.
                Once a story expires, Instagram completely removes its media files from public CDN servers.
              </p>
              <p className="text-[15px] text-fg-muted leading-relaxed">
                <strong>Can expired stories be downloaded?</strong> No tool can retrieve an expired Story once it has
                vanished from Instagram. To save a story, you must copy its link and process it through Downloadit while
                it is still active within its 24-hour publication window.
              </p>
            </div>
          </section>

          {/* Section 4: Video and Photo HD Quality */}
          <section className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
              Download Instagram Story Videos &amp; Photos in HD
            </h2>
            <p className="text-[15.5px] sm:text-[16.5px] text-fg-muted leading-relaxed">
              Instagram Stories can feature either vertical video or still photography, often enhanced with text,
              stickers, and background music tracks. Many third-party screen recording tools degrade quality, record
              notification banners, or drop frames.
            </p>
            <p className="text-[15.5px] sm:text-[16.5px] text-fg-muted leading-relaxed">
              Downloadit retrieves the direct master files. Video stories are served as MP4 video in the available quality
              files with complete audio synchronization. Photo stories are served as uncompressed JPEGs. Neither contains
              watermarks or screen-recorder artifacts.
            </p>
          </section>

          {/* Section 5: Device Support */}
          <section className="space-y-5">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
              Instagram Story Downloader for Android, iPhone &amp; PC
            </h2>
            <p className="text-[15.5px] sm:text-[16.5px] text-fg-muted leading-relaxed">
              Downloadit works smoothly across all hardware platforms without requiring specialized apps or software:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold">
                  <Smartphone className="h-5 w-5" />
                  <span>iOS (iPhone &amp; iPad)</span>
                </div>
                <p className="text-[14px] text-fg-muted leading-relaxed">
                  Open in Safari. Tap Download, locate the file in Safari Downloads, and tap &quot;Save Video&quot; to transfer
                  it directly to your Apple Photos camera roll.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold">
                  <Smartphone className="h-5 w-5" />
                  <span>Android Devices</span>
                </div>
                <p className="text-[14px] text-fg-muted leading-relaxed">
                  Open in Chrome or Samsung Internet. Downloaded stories save directly to your internal storage and appear
                  instantly in your Gallery app.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold">
                  <Monitor className="h-5 w-5" />
                  <span>Windows &amp; Mac</span>
                </div>
                <p className="text-[14px] text-fg-muted leading-relaxed">
                  Watch and save stories from any desktop browser. The files save straight to your chosen desktop folder
                  at full resolution.
                </p>
              </div>
            </div>
          </section>

          {/* Section 6: Key Features Grid */}
          <section className="space-y-6">
            <div className="border-b border-border pb-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
                Features of Downloadit Story Downloader
              </h2>
              <p className="text-[14.5px] sm:text-[15.5px] text-fg-muted mt-1">
                Engineered for total anonymity, maximum fidelity, and simplicity.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-[15px]">
                  <EyeOff className="h-5 w-5 text-primary" />
                  <span>100% Anonymous</span>
                </div>
                <p className="text-[13.5px] text-fg-muted leading-relaxed">
                  Your identity is never revealed. You do not appear in the creator&apos;s story viewer list.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-[15px]">
                  <Film className="h-5 w-5 text-primary" />
                  <span>Video &amp; Photo Support</span>
                </div>
                <p className="text-[13.5px] text-fg-muted leading-relaxed">
                  Seamlessly handles both MP4 video clips with audio and full-resolution JPEG photos.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-[15px]">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span>No Added Watermark</span>
                </div>
                <p className="text-[13.5px] text-fg-muted leading-relaxed">
                  Clean files without added logos, creator handles, or UI screen elements.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-[15px]">
                  <Zap className="h-5 w-5 text-primary" />
                  <span>Fast CDN Fetch</span>
                </div>
                <p className="text-[13.5px] text-fg-muted leading-relaxed">
                  Pulls media from Instagram content delivery endpoints within milliseconds.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-[15px]">
                  <Lock className="h-5 w-5 text-primary" />
                  <span>No Account Needed</span>
                </div>
                <p className="text-[13.5px] text-fg-muted leading-relaxed">
                  Never asks for your Instagram password, email, or credentials.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-[15px]">
                  <HeartHandshake className="h-5 w-5 text-primary" />
                  <span>Free to Use</span>
                </div>
                <p className="text-[13.5px] text-fg-muted leading-relaxed">
                  No subscription or account needed to save an active Story.
                </p>
              </div>
            </div>
          </section>

          {/* Section 7: Internal Linking Hub */}
          <section className="space-y-6 pt-4">
            <div className="border-b border-border pb-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
                Explore More Instagram Downloaders
              </h2>
              <p className="text-[14.5px] sm:text-[15.5px] text-fg-muted mt-1">
                Downloadit offers dedicated tools for all Instagram content types.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {OTHER_TOOLS.map((tool) => {
                const IconComponent = tool.icon;
                return (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-5 hover:border-primary/50 hover:shadow-md transition-all duration-200"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <IconComponent className="h-5 w-5" />
                          </div>
                          <span className="font-bold text-fg text-[16px] group-hover:text-primary transition-colors">
                            {tool.title}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          {tool.badge}
                        </span>
                      </div>
                      <p className="text-[13.5px] text-fg-muted leading-relaxed">
                        {tool.desc}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-primary text-[13px] font-semibold mt-4 pt-3 border-t border-border/50">
                      <span>Open tool</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="text-center pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm font-medium text-fg-muted hover:text-primary transition-colors"
              >
                <span>&larr; Back to all Downloadit tools (Pinterest, Facebook, Twitter/X, Threads)</span>
              </Link>
            </div>
          </section>

          {/* Section 8: Frequently Asked Questions */}
          <section className="space-y-6 pt-4">
            <div className="border-b border-border pb-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
                Frequently Asked Questions
              </h2>
              <p className="text-[14.5px] sm:text-[15.5px] text-fg-muted mt-1">
                Frequently asked questions regarding anonymous Instagram Story downloads.
              </p>
            </div>

            <div className="space-y-3">
              {FAQS.map((faq, index) => (
                <details
                  key={index}
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

        </div>
      </main>

      <Footer />
    </>
  );
}