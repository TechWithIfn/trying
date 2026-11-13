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
  Clock,
  Radio,
} from "lucide-react";

const PAGE = TOOL_PAGES.instagramAudio;

export const metadata: Metadata = toolMetadata(PAGE);

const FAQS = [
  {
    q: "How to convert Instagram videos or Reels to MP3?",
    a: "Copy the link of any public Instagram Reel, video post, or clip. Paste the URL into the input field above and click 'Download Audio'. Downloadit's high-speed media engine strips the video stream and encodes the soundtrack into a clean MP3 file for instant download.",
  },
  {
    q: "Can I download Instagram audio separately without the video?",
    a: "Yes. Downloadit Instagram Audio Downloader is built specifically for this purpose. It separates the audio track from the video so you only download the lightweight MP3 audio file, saving storage space and mobile data.",
  },
  {
    q: "What format and bitrate is the extracted audio?",
    a: "Audio is delivered as an industry-standard MP3 file encoded with high-fidelity stereo sound at up to 192–320 kbps (based on the original audio quality uploaded to Instagram). It is compatible with all music players, phone ringtone managers, and editing software.",
  },
  {
    q: "Can I extract audio from private Instagram accounts?",
    a: "No. Downloadit only processes public Instagram links. If a reel or video is from a private profile that requires approval to follow, its audio cannot be retrieved.",
  },
  {
    q: "Can I use downloaded Instagram audio for ringtones or alarms?",
    a: "Yes! Because the downloaded file is a standard MP3, you can easily set it as a custom ringtone, alarm, or notification sound on Android and iPhone (using GarageBand or iTunes).",
  },
  {
    q: "Is Downloadit Instagram Audio Downloader free?",
    a: "Yes. Downloadit does not charge for audio extraction and requires no account or subscription. You can convert public Instagram audio for personal use.",
  },
  {
    q: "Do I need to install any software or browser extensions?",
    a: "No software, apps, or extensions are needed. Downloadit runs entirely in your mobile or desktop web browser, handling the conversion securely on our high-speed processing infrastructure.",
  },
  {
    q: "Does Downloadit store or archive extracted audio files?",
    a: "No. Downloadit does not keep a library of converted audio. The extracted MP3 is returned to your browser for download and is not published elsewhere by us.",
  },
  {
    q: "Can I extract Instagram audio on my phone?",
    a: "Yes. The tool runs in mobile Safari on iPhone and in Chrome or Samsung Internet on Android. The MP3 is saved to your browser's Downloads folder, where you can play it or move it into a music app.",
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
    title: "Instagram Story Downloader",
    href: "/instagram-story-downloader",
    desc: "Save active 24-hour public stories (both video and photo) anonymously before they vanish.",
    icon: Clock,
    badge: "24h Ephemeral",
  },
];

export default function AudioDownloaderPage() {
  const jsonLdWebPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Instagram Audio Downloader – Extract Reels & Video Audio to MP3",
    description:
      "Extract and download audio from Instagram Reels and videos as MP3 with Downloadit. Free online Instagram to MP3 converter with high quality audio.",
    url: "https://www.downloadit.pro/instagram-audio-downloader",
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
    name: "Downloadit Instagram Audio Downloader",
    url: "https://www.downloadit.pro/instagram-audio-downloader",
    applicationCategory: "MultimediaApplication",
    operatingSystem: "All",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "Extract audio tracks from Instagram Reels and feed videos",
      "Convert Instagram video audio to standalone MP3 format",
      "High quality audio bitrate up to 320 kbps",
      "No account login or registration required",
      "Compatible with iPhone, Android, PC, and Mac",
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
        name: "Instagram Audio Downloader",
        item: "https://www.downloadit.pro/instagram-audio-downloader",
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
              Extract Audio from Instagram Reels &amp; Videos to MP3
            </h2>
            <p className="text-[15.5px] sm:text-[16.5px] text-fg-muted leading-relaxed">
              Instagram has grown into one of the world&apos;s leading tastemakers for music discovery, viral audio memes,
              inspirational voiceovers, and original acoustic performances. Many creators debut unique acoustic tracks,
              remixes, and podcast snippets exclusively through Instagram Reels and video posts.
            </p>
            <p className="text-[15.5px] sm:text-[16.5px] text-fg-muted leading-relaxed">
              If you only want the sound or music file, downloading a heavy 100MB video file is inefficient.
              <strong> Downloadit Instagram Audio Downloader</strong> solves this by isolating the audio stream and
              converting it to a clean, universal MP3 track. Whether you need audio for video editing, ringtones,
              alarms, or offline music listening, our <em>instagram to mp3 converter</em> processes your request in seconds.
            </p>
          </section>

          {/* Section 2: How to Download Audio Step-by-Step */}
          <section className="space-y-6">
            <div className="border-b border-border pb-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
                How to Download Audio from Instagram
              </h2>
              <p className="text-[14.5px] sm:text-[15.5px] text-fg-muted mt-1">
                Convert any public Instagram Reel or video post into an MP3 file in four easy steps.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                    1
                  </span>
                  <h3 className="font-bold text-fg text-[16px]">Copy Reel or Video Link</h3>
                </div>
                <p className="text-[14px] text-fg-muted leading-relaxed">
                  Open Instagram, find the Reel or video whose soundtrack you want to extract, tap the <strong>Share</strong> icon,
                  and choose <strong>Copy link</strong>.
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
                  Paste the copied link into the input box above. On a phone, use the clipboard button beside the box.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                    3
                  </span>
                  <h3 className="font-bold text-fg text-[16px]">Extract Audio Stream</h3>
                </div>
                <p className="text-[14px] text-fg-muted leading-relaxed">
                  Click <strong>Download Audio</strong>. Downloadit retrieves the underlying media stream and converts
                  the audio track directly into an MP3 format.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                    4
                  </span>
                  <h3 className="font-bold text-fg text-[16px]">Download MP3 File</h3>
                </div>
                <p className="text-[14px] text-fg-muted leading-relaxed">
                  Click the <strong>Download</strong> button. The lightweight MP3 audio file immediately saves to your device,
                  ready to play in any media player or set as a custom ringtone.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Convert Video to MP3 at Original Bitrate */}
          <section className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
              Convert Instagram Video to High-Quality MP3
            </h2>
            <p className="text-[15.5px] sm:text-[16.5px] text-fg-muted leading-relaxed">
              Instagram streams audio in advanced AAC format inside its video containers. Many cheap online audio rippers
              re-encode the audio at degraded bitrates (such as 64 kbps or 96 kbps), causing noticeable muffling, loss
              of high-frequency instruments, and hollow vocal quality.
            </p>
            <p className="text-[15.5px] sm:text-[16.5px] text-fg-muted leading-relaxed">
              Downloadit uses a dedicated audio processing pipeline that preserves maximum frequency response and stereo
              separation. We extract and package the stream at up to 192–320 kbps MP3, ensuring that bass drops, vocal
              clarity, and orchestral nuances sound crisp and rich across high-end headphones and studio speakers.
            </p>
          </section>

          {/* Section 4: Reels Audio & Trending Sounds */}
          <section className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
              Download Reels Audio and Background Soundtracks
            </h2>
            <p className="text-[15.5px] sm:text-[16.5px] text-fg-muted leading-relaxed">
              Trending sounds and viral audio clips are the heartbeat of short-form content. Creators frequently create
              mashups, sped-up edits, slowed-and-reverbed tracks, and motivational dialogues that are not sold as a
              standalone track.
            </p>
            <p className="text-[15.5px] sm:text-[16.5px] text-fg-muted leading-relaxed">
              With Downloadit, you can save any trending Reel audio in seconds. Use it as reference audio for your own
              content production, mix it into your DJ sets, or keep it in your personal music library for offline listening
              while traveling.
            </p>
          </section>

          {/* Section 5: Device Support */}
          <section className="space-y-5">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
              Instagram Audio Downloader for Mobile &amp; Desktop
            </h2>
            <p className="text-[15.5px] sm:text-[16.5px] text-fg-muted leading-relaxed">
              Downloadit runs in any standard web browser on all devices without external apps or software:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold">
                  <Smartphone className="h-5 w-5" />
                  <span>iOS (iPhone &amp; iPad)</span>
                </div>
                <p className="text-[14px] text-fg-muted leading-relaxed">
                  Download MP3s directly in Safari. Access them in the Files app under Downloads, play them in the background,
                  or assign them as ringtones using GarageBand.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold">
                  <Smartphone className="h-5 w-5" />
                  <span>Android Devices</span>
                </div>
                <p className="text-[14px] text-fg-muted leading-relaxed">
                  Audio saves straight to your Downloads or Music folder. Open in Spotify local files, Samsung Music,
                  or set as a custom ringtone in phone settings.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold">
                  <Monitor className="h-5 w-5" />
                  <span>Windows &amp; Mac</span>
                </div>
                <p className="text-[14px] text-fg-muted leading-relaxed">
                  Save pristine MP3 tracks directly into your DAW, music library, or project folders for fast editing
                  in Audacity, Logic Pro, or Premiere.
                </p>
              </div>
            </div>
          </section>

          {/* Section 6: Key Features Grid */}
          <section className="space-y-6">
            <div className="border-b border-border pb-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
                Features of Downloadit Audio Downloader
              </h2>
              <p className="text-[14.5px] sm:text-[15.5px] text-fg-muted mt-1">
                High-fidelity sound extraction built for music lovers and creators.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-[15px]">
                  <Radio className="h-5 w-5 text-primary" />
                  <span>High-Bitrate MP3</span>
                </div>
                <p className="text-[13.5px] text-fg-muted leading-relaxed">
                  Encodes sound with maximum fidelity up to 320 kbps for rich highs and deep bass.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-[15px]">
                  <Film className="h-5 w-5 text-primary" />
                  <span>Reels &amp; Videos</span>
                </div>
                <p className="text-[13.5px] text-fg-muted leading-relaxed">
                  Extracts audio from vertical Reels, feed videos, and standard Instagram clips.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-[15px]">
                  <Zap className="h-5 w-5 text-primary" />
                  <span>Small File Sizes</span>
                </div>
                <p className="text-[13.5px] text-fg-muted leading-relaxed">
                  Saves storage space and mobile data by stripping unnecessary video frames.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-[15px]">
                  <Lock className="h-5 w-5 text-primary" />
                  <span>No Login Required</span>
                </div>
                <p className="text-[13.5px] text-fg-muted leading-relaxed">
                  No Instagram account login or personal data required.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-[15px]">
                  <HeartHandshake className="h-5 w-5 text-primary" />
                  <span>Free to Use</span>
                </div>
                <p className="text-[13.5px] text-fg-muted leading-relaxed">
                  No subscription or account required to extract audio.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-[15px]">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span>Universal Playback</span>
                </div>
                <p className="text-[13.5px] text-fg-muted leading-relaxed">
                  Universal MP3 files work effortlessly on all smartphones, car stereos, and media players.
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
                Frequently asked questions regarding Instagram audio and MP3 extraction.
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