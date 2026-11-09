import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ToolDownloader from "@/components/ToolDownloader";
import { TOOL_PAGES } from "@/config/toolPages";
import {
  CheckCircle2,
  ChevronDown,
  Film,
  Smartphone,
  ShieldCheck,
  Zap,
  Sparkles,
  ArrowRight,
  Monitor,
  HelpCircle,
  Repeat,
  Lock,
  Layers,
  HeartHandshake,
  Image as ImageIcon,
  Music,
  Clock,
  Volume2,
} from "lucide-react";

const PAGE = TOOL_PAGES.instagramReels;

export const metadata: Metadata = {
  title: {
    absolute: "Instagram Reels Downloader – Download Reels Videos in HD | Downloadit",
  },
  description:
    "Download Instagram Reels videos in high definition with audio using Downloadit. Free, fast and unlimited online Instagram Reels downloader. No watermark.",
  alternates: {
    canonical: "https://downloadit.pro/instagram-reels-downloader",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    title: "Instagram Reels Downloader – Download Reels Videos in HD | Downloadit",
    description:
      "Download Instagram Reels videos in high definition with audio using Downloadit. Free, fast and unlimited online Instagram Reels downloader. No watermark.",
    url: "https://downloadit.pro/instagram-reels-downloader",
    images: [
      {
        url: "/og-downloadit.png",
        width: 1200,
        height: 630,
        alt: "Downloadit Instagram Reels Downloader online tool",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Instagram Reels Downloader – Download Reels Videos in HD | Downloadit",
    description:
      "Download Instagram Reels videos in high definition with audio using Downloadit. Free, fast and unlimited online Instagram Reels downloader. No watermark.",
    images: ["/og-downloadit.png"],
  },
};

const FAQS = [
  {
    q: "How to download Instagram Reels online?",
    a: "Open the Instagram app or website, find the Reel you want to save, tap the Share icon, and choose 'Copy link'. Paste the link into the input field on this page, click 'Download Media', preview the video, and click 'Download' to save the original vertical MP4 directly to your device.",
  },
  {
    q: "Can I download Instagram Reels with audio?",
    a: "Yes. All Reels saved through Downloadit include the full original mixed audio soundtrack (speech, trending music, and sound effects) in high-fidelity stereo AAC encoding. If you prefer to download only the sound file as an MP3, use our Instagram Audio Downloader.",
  },
  {
    q: "Do downloaded Instagram Reels have watermarks?",
    a: "No. Unlike downloading through certain mobile apps that burn the Instagram camera logo and creator handle into the frame, Downloadit retrieves the pristine master video file as delivered by Instagram's content delivery servers—completely watermark-free.",
  },
  {
    q: "What video quality can I download for Instagram Reels?",
    a: "Downloadit delivers the highest quality stream provided by Instagram for the requested Reel—typically 1080p (1080x1920) or 720p (720x1280) vertical video at 30 or 60 frames per second with progressive MP4 compression.",
  },
  {
    q: "Can I download Instagram Reels from private accounts?",
    a: "No. To respect user privacy and adhere to platform security protocols, Downloadit only processes publicly accessible Instagram Reels. Content posted by private profiles cannot be retrieved or previewed.",
  },
  {
    q: "Is Downloadit Instagram Reels Downloader free?",
    a: "Yes, Downloadit is 100% free with unlimited usage. You can download as many Instagram Reels as you want without paying subscription fees, purchasing tokens, or encountering daily download limits.",
  },
  {
    q: "Do I need an Instagram account or login to download Reels?",
    a: "No. You never need to log in, register an account, or link your Instagram profile to Downloadit. Simply copy the public Reel link and paste it into our tool for instant access.",
  },
  {
    q: "What is the difference between Reels and regular videos on Instagram?",
    a: "Reels are vertical 9:16 short-form entertainment videos (up to 90 seconds) designed for viral discovery and accompanied by music or trending audio. Regular feed videos or older IGTV clips can have horizontal (16:9) or square (1:1) aspect ratios. Downloadit seamlessly supports both formats.",
  },
  {
    q: "Can I download Instagram Reels audio separately as an MP3?",
    a: "Yes. If you only want the background music or voiceover from a Reel, visit our dedicated Instagram Audio Downloader, paste the Reel link, and download the audio converted to a crisp MP3 track.",
  },
  {
    q: "Does Downloadit store or keep copies of downloaded Reels?",
    a: "No. Downloadit does not host, duplicate, or archive any videos on its servers. All downloads are fetched and streamed directly from Instagram's public edge delivery endpoints to your browser session in real time.",
  },
  {
    q: "Which devices and browsers are supported?",
    a: "Downloadit works across all modern operating systems and web browsers, including iOS (Safari, Chrome), Android (Chrome, Firefox, Samsung Internet), macOS, Windows, Linux, and iPadOS. No browser plugins or APK installations are required.",
  },
];

const OTHER_TOOLS = [
  {
    title: "Instagram Video Downloader",
    href: "/instagram-video-downloader",
    desc: "Save regular feed videos, long clips, and IGTV videos in full HD MP4.",
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
    title: "Instagram Story Downloader",
    href: "/instagram-story-downloader",
    desc: "Save active 24-hour public stories (both video and photo) anonymously.",
    icon: Clock,
    badge: "24h Ephemeral",
  },
  {
    title: "Instagram Audio Downloader",
    href: "/instagram-audio-downloader",
    desc: "Extract background tracks, trending sounds, and voiceovers to high-bitrate MP3.",
    icon: Music,
    badge: "MP3 Audio",
  },
];

export default function ReelsDownloaderPage() {
  const jsonLdWebPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Instagram Reels Downloader – Download Reels Videos in HD",
    description:
      "Download Instagram Reels videos in high definition with audio using Downloadit. Free, fast and unlimited online Instagram Reels downloader. No watermark.",
    url: "https://downloadit.pro/instagram-reels-downloader",
    inLanguage: "en-US",
    isPartOf: {
      "@type": "WebSite",
      name: "Downloadit",
      url: "https://downloadit.pro",
    },
  };

  const jsonLdWebApp = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Downloadit Instagram Reels Downloader",
    url: "https://downloadit.pro/instagram-reels-downloader",
    applicationCategory: "MultimediaApplication",
    operatingSystem: "All",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "Download Instagram Reels videos in 1080p and 720p HD",
      "Save Instagram Reels with original mixed stereo audio",
      "Watermark-free MP4 download",
      "No account login or registration required",
      "Fast CDN direct streaming",
      "Compatible with iPhone, Android, PC, and Mac",
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
        item: "https://downloadit.pro",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Instagram Downloader",
        item: "https://downloadit.pro/instagram-video-downloader",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Instagram Reels Downloader",
        item: "https://downloadit.pro/instagram-reels-downloader",
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
              Download Instagram Reels Online in HD
            </h2>
            <p className="text-[15.5px] sm:text-[16.5px] text-fg-muted leading-relaxed">
              Instagram Reels has revolutionized mobile short-form video, hosting millions of creative tutorials,
              humorous skits, workout routines, travel diaries, and viral music clips every day. However, Instagram
              does not provide an integrated way to save reels directly to your camera roll without compressing
              the clip or stamping a distracting watermark over the visual work.
            </p>
            <p className="text-[15.5px] sm:text-[16.5px] text-fg-muted leading-relaxed">
              <strong>Downloadit Instagram Reels Downloader</strong> is a specialized, high-performance web tool
              engineered to retrieve public Instagram Reels in original 1080p and 720p HD resolution with crystal-clear
              audio. Whether you want to archive favorite recipe reels, save motivational workouts for the gym with zero
              signal, or download clips for personal video editing, our <em>reels downloader online</em> delivers instant,
              lossless MP4 files with zero app installation.
            </p>
          </section>

          {/* Section 2: How to Download Instagram Reels */}
          <section className="space-y-6">
            <div className="border-b border-border pb-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
                How to Download Instagram Reels
              </h2>
              <p className="text-[14.5px] sm:text-[15.5px] text-fg-muted mt-1">
                Follow this simple 4-step process to save any public Instagram Reel to your mobile phone or computer.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                    1
                  </span>
                  <h3 className="font-bold text-fg text-[16px]">Copy the Reel Link</h3>
                </div>
                <p className="text-[14px] text-fg-muted leading-relaxed">
                  Open Instagram, navigate to the Reel you want to save, tap the <strong>Share</strong> paper airplane icon,
                  and select <strong>Copy link</strong>. On desktop, copy the URL directly from your browser address bar.
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
                  Navigate back to this page and paste the link into the input box above. You can click the handy
                  <strong> Paste</strong> button on mobile devices for instant input.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                    3
                  </span>
                  <h3 className="font-bold text-fg text-[16px]">Fetch &amp; Preview</h3>
                </div>
                <p className="text-[14px] text-fg-muted leading-relaxed">
                  Click the <strong>Download Media</strong> button. Downloadit contacts Instagram servers in milliseconds,
                  resolves the direct video stream, and displays a responsive preview with title details.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                    4
                  </span>
                  <h3 className="font-bold text-fg text-[16px]">Download HD MP4</h3>
                </div>
                <p className="text-[14px] text-fg-muted leading-relaxed">
                  Click the <strong>Download</strong> button. The pure vertical MP4 file will immediately save to your
                  device’s Downloads folder or camera roll, ready for offline viewing anytime.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Save Without Watermark */}
          <section className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
              Save Instagram Reels Without Watermark
            </h2>
            <p className="text-[15.5px] sm:text-[16.5px] text-fg-muted leading-relaxed">
              When creators share or save reels through built-in platform features, Instagram frequently attaches
              a bouncing watermark logo along with the author’s username over the video. While useful for platform
              attribution, this watermark obstructs subtitles, graphic overlays, and the aesthetic framing of the reel.
            </p>
            <p className="text-[15.5px] sm:text-[16.5px] text-fg-muted leading-relaxed">
              Because Downloadit queries the underlying high-bitrate media stream rather than screen-recording or
              re-exporting through the mobile app, the MP4 file you receive is 100% clean and watermark-free.
              Every pixel remains exactly as the creator captured and edited it, providing pristine playback on 4K TVs,
              monitors, or smartphones.
            </p>
          </section>

          {/* Section 4: Instagram Reels to MP4 Converter with Audio */}
          <section className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
              Instagram Reels to MP4 Converter with Audio
            </h2>
            <p className="text-[15.5px] sm:text-[16.5px] text-fg-muted leading-relaxed">
              Audio is at the very core of what makes Instagram Reels engaging. From trending pop tracks and indie remixes
              to educational commentaries and comedic soundbites, a reel without sound loses half its impact.
            </p>
            <p className="text-[15.5px] sm:text-[16.5px] text-fg-muted leading-relaxed">
              Our <em>instagram reel video download</em> engine ensures complete synchronization between the 9:16 vertical
              video stream (H.264 / AVC) and the stereo audio track (AAC 128-192 kbps). The resulting file is an
              industry-standard progressive MP4 container that works natively on all media players, including QuickTime,
              VLC, Windows Media Player, CapCut, Premiere Pro, and smartphone photo galleries.
            </p>
          </section>

          {/* Section 5: Cross-Device Compatibility */}
          <section className="space-y-5">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
              Instagram Reels Downloader for Android, iPhone &amp; PC
            </h2>
            <p className="text-[15.5px] sm:text-[16.5px] text-fg-muted leading-relaxed">
              Downloadit is designed to provide an identical, frictionless experience regardless of the hardware or
              operating system you rely on:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold">
                  <Smartphone className="h-5 w-5" />
                  <span>iPhone &amp; iPad</span>
                </div>
                <p className="text-[14px] text-fg-muted leading-relaxed">
                  Works seamlessly in Safari. Once downloaded, tap the download icon in the browser toolbar, open the
                  file in the Files app, and tap &quot;Save Video&quot; to transfer it straight into your iOS Photos camera roll.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold">
                  <Smartphone className="h-5 w-5" />
                  <span>Android Devices</span>
                </div>
                <p className="text-[14px] text-fg-muted leading-relaxed">
                  Compatible with Chrome, Samsung Internet, and Firefox. The MP4 video saves directly into your
                  Downloads folder and appears instantly in Google Photos or your default Gallery app.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold">
                  <Monitor className="h-5 w-5" />
                  <span>Windows &amp; Mac</span>
                </div>
                <p className="text-[14px] text-fg-muted leading-relaxed">
                  No mobile emulation needed. Simply copy the URL from Chrome, Edge, or Safari on your desktop and download
                  the original resolution file right to your local drive in seconds.
                </p>
              </div>
            </div>
          </section>

          {/* Section 6: Key Features Grid */}
          <section className="space-y-6">
            <div className="border-b border-border pb-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
                Features of Downloadit Reels Downloader
              </h2>
              <p className="text-[14.5px] sm:text-[15.5px] text-fg-muted mt-1">
                Engineered for speed, privacy, and full fidelity media retrieval.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-[15px]">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span>1080p Full HD</span>
                </div>
                <p className="text-[13.5px] text-fg-muted leading-relaxed">
                  Always fetches the highest bitrate and maximum vertical resolution served by Instagram.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-[15px]">
                  <Film className="h-5 w-5 text-primary" />
                  <span>Zero Watermark</span>
                </div>
                <p className="text-[13.5px] text-fg-muted leading-relaxed">
                  Clean files without superimposed logos, handles, or third-party promo graphics.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-[15px]">
                  <Volume2 className="h-5 w-5 text-primary" />
                  <span>Stereo Audio Sync</span>
                </div>
                <p className="text-[13.5px] text-fg-muted leading-relaxed">
                  Preserves trending music, speech, and sound effects encoded in pristine AAC format.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-[15px]">
                  <Zap className="h-5 w-5 text-primary" />
                  <span>Lightning Fast</span>
                </div>
                <p className="text-[13.5px] text-fg-muted leading-relaxed">
                  Direct edge CDN streaming downloads your video in seconds without server throttling.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-[15px]">
                  <Lock className="h-5 w-5 text-primary" />
                  <span>100% Anonymous</span>
                </div>
                <p className="text-[13.5px] text-fg-muted leading-relaxed">
                  No login, email, password, or account connection required. Your identity remains private.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-[15px]">
                  <HeartHandshake className="h-5 w-5 text-primary" />
                  <span>Free &amp; Unlimited</span>
                </div>
                <p className="text-[13.5px] text-fg-muted leading-relaxed">
                  Download as many reels as you want without rate limits, subscription paywalls, or hidden costs.
                </p>
              </div>
            </div>
          </section>

          {/* Section 7: Internal Linking Hub to other Instagram Tools */}
          <section className="space-y-6 pt-4">
            <div className="border-b border-border pb-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
                Explore More Instagram Downloaders
              </h2>
              <p className="text-[14.5px] sm:text-[15.5px] text-fg-muted mt-1">
                Downloadit offers dedicated tools for every type of media published on Instagram.
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
                <span>&larr; Back to all Downloadit tools (YouTube, Pinterest, Facebook, Twitter/X, Threads)</span>
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
                Everything you need to know about downloading Instagram Reels with Downloadit.
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