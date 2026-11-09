import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PinterestDownloader from "@/components/PinterestDownloader";
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
  Play,
  Download,
} from "lucide-react";

const PAGE = TOOL_PAGES.pinterestVideo;

export const metadata: Metadata = {
  title: {
    absolute: "Pinterest Video Downloader – Download Pinterest Videos & Images | Downloadit",
  },
  description:
    "Download Pinterest videos and images online for free with Downloadit. Save public Pinterest Pins as MP4 videos or images, including supported carousel media. No login required.",
  alternates: {
    canonical: "https://downloadit.pro/pinterest-video-downloader",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    title: "Pinterest Video Downloader – Download Pinterest Videos & Images | Downloadit",
    description:
      "Download Pinterest videos and images online for free with Downloadit. Save public Pinterest Pins as MP4 videos or images, including supported carousel media. No login required.",
    url: "https://downloadit.pro/pinterest-video-downloader",
    images: [
      {
        url: "/og-downloadit.png",
        width: 1200,
        height: 630,
        alt: "Downloadit Pinterest Video Downloader online tool",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pinterest Video Downloader – Download Pinterest Videos & Images | Downloadit",
    description:
      "Download Pinterest videos and images online for free with Downloadit. Save public Pinterest Pins as MP4 videos or images, including supported carousel media. No login required.",
    images: ["/og-downloadit.png"],
  },
};

const FAQS = [
  {
    q: "How to download Pinterest videos online?",
    a: "Open the Pinterest app or website, find the video Pin you want to save, tap the Share icon, and select 'Copy link'. Paste that URL into Downloadit above, click 'Download Pin', preview the video, and tap 'Download' to save the progressive MP4 directly to your device.",
  },
  {
    q: "How to download Pinterest videos in HD?",
    a: "Downloadit automatically scans all available progressive video renditions exposed by Pinterest's CDN and serves the highest quality stream available for that Pin—typically 720p or 1080p HD with crystal-clear audio.",
  },
  {
    q: "How to save Pinterest videos to gallery?",
    a: "On Android, files downloaded from Downloadit save directly to your Downloads folder and immediately appear in Google Photos or your phone's Gallery app. On iPhone (iOS), open the downloaded MP4 in the Safari Downloads manager or Files app, tap the Share icon, and choose 'Save Video' to move it into Apple Photos.",
  },
  {
    q: "How to download Pinterest videos on Android?",
    a: "Open Pinterest on your Android device, tap the Share button on any public video Pin, select 'Copy link', open Chrome or your preferred browser, paste the link into Downloadit, and tap 'Download Pin' to save the MP4 file to your phone.",
  },
  {
    q: "How to download Pinterest videos on iPhone?",
    a: "In the Pinterest iOS app, tap the three dots or Share icon and tap 'Copy link'. Open Safari, visit Downloadit, paste the link, and tap 'Download Pin'. When prompted by Safari, tap 'Download'. You can view it in Safari Downloads or transfer it to the Photos app via 'Save Video'.",
  },
  {
    q: "How to download Pinterest videos on PC?",
    a: "On Windows or Mac, copy the Pin URL directly from your web browser address bar, paste it into Downloadit, click 'Download Pin', and click 'Download' to save the MP4 video directly to your PC's Downloads folder.",
  },
  {
    q: "How to convert Pinterest videos to MP4?",
    a: "Pinterest hosts its public video streams natively as progressive MP4 files. Downloadit extracts this source MP4 directly, so no lossy re-encoding or third-party file conversion is needed—it is ready to play in any media player.",
  },
  {
    q: "Is Pinterest Video Downloader free?",
    a: "Yes, Downloadit is 100% free with unlimited usage. You can download as many Pinterest video and image Pins as you need without subscriptions, paywalls, or daily limits.",
  },
  {
    q: "Do I need a Pinterest account to download videos?",
    a: "No. You do not need to register, log in, or connect your Pinterest account to Downloadit. Anyone with a valid public Pin link can download videos and pictures immediately.",
  },
  {
    q: "Can I download Pinterest videos without an app?",
    a: "Yes. Downloadit is completely web-based and operates in your standard mobile or desktop web browser. You do not need to install APKs, iOS apps, or browser extensions.",
  },
  {
    q: "How to download Pinterest images?",
    a: "Paste any public Pinterest image Pin URL into Downloadit. Our tool identifies that the Pin is a picture and serves the uncompressed, original-resolution JPEG/PNG file directly from Pinterest servers.",
  },
  {
    q: "How to save Pinterest photos in original quality?",
    a: "Unlike taking screenshots that capture screen resolution and crop margins, Downloadit fetches the full-resolution master image (often up to 2000px+ height) directly from Pinterest's content delivery network.",
  },
  {
    q: "How to download multiple images from a Pinterest Pin?",
    a: "When a Pin is a carousel or multi-image collection, Downloadit parses the entire album and presents every individual image slide in the preview panel, allowing you to download each picture in original resolution.",
  },
  {
    q: "Does Downloadit support Pinterest carousel images?",
    a: "Yes. Our Pinterest resolver automatically unpacks multi-slide carousel Pins, displaying each slide with its own dedicated high-resolution download button.",
  },
  {
    q: "Why is my Pinterest video link not working?",
    a: "Common causes include typing an incomplete link, attempting to download from a private or secret board, trying to access a deleted Pin, or copying a profile/board URL instead of an individual Pin link. Ensure you copy the direct URL of an active public Pin.",
  },
  {
    q: "Can I download videos from private Pinterest boards?",
    a: "No. Downloadit strictly respects user privacy and platform security protocols. Content on secret boards, group boards requiring invite-only access, or private accounts cannot be retrieved.",
  },
  {
    q: "Does Pinterest Downloader work on mobile?",
    a: "Yes. Downloadit is fully responsive and optimized for mobile devices, working seamlessly across Chrome, Safari, Samsung Internet, and Firefox on Android and iOS.",
  },
  {
    q: "Can I download Pinterest videos without a watermark?",
    a: "Yes. Downloadit downloads the clean source video stream directly from Pinterest's edge servers. No logos, watermarks, or account stamps are added to the file.",
  },
  {
    q: "What video format does Downloadit support?",
    a: "Downloadit delivers standard progressive MP4 video (H.264 video codec with AAC audio), ensuring maximum compatibility across all mobile phones, PCs, tablets, and video editing suites.",
  },
  {
    q: "Why is Pinterest showing an unsupported Pin error?",
    a: "If a Pin uses a restricted format (such as certain deprecated interactive widgets, story formats, or restricted ads) or is hosted on a secret board, the backend cannot retrieve a valid public MP4 or image stream. In such cases, an informative error message is displayed.",
  },
];

export default function PinterestVideoDownloaderPage() {
  const jsonLdWebPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Pinterest Video Downloader – Download Pinterest Videos & Images",
    description:
      "Download Pinterest videos and images online for free with Downloadit. Save public Pinterest Pins as MP4 videos or images, including supported carousel media. No login required.",
    url: "https://downloadit.pro/pinterest-video-downloader",
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
    name: "Downloadit Pinterest Video Downloader",
    url: "https://downloadit.pro/pinterest-video-downloader",
    applicationCategory: "MultimediaApplication",
    operatingSystem: "All",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "Download Pinterest video Pins in progressive MP4 HD quality",
      "Download high-resolution Pinterest image Pins",
      "Support for multi-image Pinterest carousel Pins",
      "Supports mobile pin.it short links and desktop URLs",
      "Clean downloads with no added watermarks",
      "No account login or software installation required",
      "100% free with unlimited downloads",
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
        name: "Pinterest Video Downloader",
        item: "https://downloadit.pro/pinterest-video-downloader",
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
        {/* Interactive Downloader Hero */}
        <PinterestDownloader
          titleA={PAGE.titleA}
          titleB={PAGE.titleB}
          subtitle={PAGE.description}
          badge={PAGE.badge}
          placeholder={PAGE.placeholder}
          buttonLabel={PAGE.buttonLabel}
          modes={PAGE.modes}
          benefits={PAGE.trust}
        />

        {/* Detailed SEO Content Section (Kept below initial viewport) */}
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10 sm:space-y-14 text-fg leading-relaxed">

          {/* Section 2: Download Pinterest Videos Online */}
          <section className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
              Download Pinterest Videos Online
            </h2>
            <p className="text-[15.5px] sm:text-[16.5px] text-fg-muted leading-relaxed">
              Pinterest is a premier global discovery engine for visual inspiration, DIY crafts, home decor, culinary
              recipes, fitness routines, and creative video tutorials. Every day, millions of creators share engaging video
              Pins that inspire practical action. However, Pinterest does not provide a direct button to save these video Pins
              to your smartphone gallery or computer drive for offline reference.
            </p>
            <p className="text-[15.5px] sm:text-[16.5px] text-fg-muted leading-relaxed">
              <strong>Downloadit Pinterest Video Downloader</strong> offers a fast, reliable, and browser-based solution
              to <em>download pinterest video</em> files in pristine quality. Our engine resolves the public Pin link,
              detects whether it is a video, image, or multi-slide carousel, and delivers direct download links without
              requiring an account or any app installations.
            </p>
          </section>

          {/* Section 3: Download Pinterest Videos as MP4 */}
          <section className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
              Download Pinterest Videos as MP4
            </h2>
            <p className="text-[15.5px] sm:text-[16.5px] text-fg-muted leading-relaxed">
              When you download videos through inferior screen recorders, you risk choppy frame rates, unwanted notification
              popups, and loss of synchronized sound. Downloadit acts as a dedicated <em>pinterest MP4 downloader</em>, querying
              Pinterest&apos;s content delivery servers directly to locate the master progressive MP4 stream.
            </p>
            <p className="text-[15.5px] sm:text-[16.5px] text-fg-muted leading-relaxed">
              By fetching the highest available resolution—whether 720p or 1080p Full HD—with AAC stereo audio, you receive
              clean, uncompressed files. The resulting MP4 video is universally compatible with Android, iPhone, Windows, Mac,
              smart TVs, and video editing suites like Premiere Pro, Final Cut, and CapCut.
            </p>
          </section>

          {/* Section 4: Pinterest Image Downloader */}
          <section className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
              Pinterest Image Downloader
            </h2>
            <p className="text-[15.5px] sm:text-[16.5px] text-fg-muted leading-relaxed">
              Pinterest was built on still photography, infographics, aesthetic moodboards, architecture sketches, and
              design templates. While taking a screenshot can capture an image, it confines the picture to your screen&apos;s
              display dimensions and compresses fine details.
            </p>
            <p className="text-[15.5px] sm:text-[16.5px] text-fg-muted leading-relaxed">
              Our <em>pinterest image downloader</em> extracts the original master image uploaded by the creator. You receive
              full-resolution JPG or PNG files with true color reproduction and zero cropping, perfect for graphic designers,
              illustrators, and visual artists seeking maximum detail.
            </p>
          </section>

          {/* Section 5: Pinterest Carousel Downloader */}
          <section className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
              Pinterest Carousel Downloader
            </h2>
            <p className="text-[15.5px] sm:text-[16.5px] text-fg-muted leading-relaxed">
              Many educational and lifestyle Pins are published as carousels—multi-image posts that showcase a sequence of
              steps, multi-photo lookbooks, or recipe variations. Most generic video downloaders fail when encountering
              carousel Pins or only extract the cover slide.
            </p>
            <p className="text-[15.5px] sm:text-[16.5px] text-fg-muted leading-relaxed">
              Downloadit features a built-in <em>pinterest carousel downloader</em> that parses the complete set of slides
              within any supported public carousel Pin. Every slide is displayed in our preview panel with its own high-resolution
              download trigger, enabling you to inspect and save all images from the collection effortlessly.
            </p>
          </section>

          {/* Section 6: How to Download Pinterest Videos */}
          <section className="space-y-6">
            <div className="border-b border-border pb-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
                How to Download Pinterest Videos
              </h2>
              <p className="text-[14.5px] sm:text-[15.5px] text-fg-muted mt-1">
                Save any public Pinterest video Pin to your phone or computer in four simple steps.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                    1
                  </span>
                  <h3 className="font-bold text-fg text-[16px]">Copy the Pin Link</h3>
                </div>
                <p className="text-[14px] text-fg-muted leading-relaxed">
                  Open the Pinterest app or website, find the video Pin you wish to save, tap the <strong>Share</strong> icon,
                  and select <strong>Copy link</strong>. Both desktop URLs and mobile <code>pin.it</code> short links are supported.
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
                  Paste the copied link into the input field above. On mobile devices, tap the built-in <strong>Paste</strong> button
                  to populate the field with a single tap.
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
                  Click <strong>Download Pin</strong>. Downloadit connects to Pinterest servers, resolves the progressive MP4 stream,
                  and generates an instant video preview with title and author information.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                    4
                  </span>
                  <h3 className="font-bold text-fg text-[16px]">Download MP4 Video</h3>
                </div>
                <p className="text-[14px] text-fg-muted leading-relaxed">
                  Click the <strong>Download</strong> button. The high-definition MP4 video file will immediately download to your
                  device’s Downloads folder or camera roll.
                </p>
              </div>
            </div>
          </section>

          {/* Section 7: How to Download Pinterest Images */}
          <section className="space-y-6">
            <div className="border-b border-border pb-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
                How to Download Pinterest Images
              </h2>
              <p className="text-[14.5px] sm:text-[15.5px] text-fg-muted mt-1">
                Save single photos or multi-slide carousel albums at maximum resolution.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                    1
                  </span>
                  <h3 className="font-bold text-fg text-[16px]">Copy Image or Carousel Link</h3>
                </div>
                <p className="text-[14px] text-fg-muted leading-relaxed">
                  Navigate to the image or carousel Pin on Pinterest, click the <strong>Share</strong> button, and tap <strong>Copy link</strong>.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                    2
                  </span>
                  <h3 className="font-bold text-fg text-[16px]">Insert into Downloadit</h3>
                </div>
                <p className="text-[14px] text-fg-muted leading-relaxed">
                  Paste the URL into our tool. Downloadit’s automatic detector recognizes that the Pin contains pictures rather than a video.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                    3
                  </span>
                  <h3 className="font-bold text-fg text-[16px]">Inspect Full Gallery</h3>
                </div>
                <p className="text-[14px] text-fg-muted leading-relaxed">
                  Click <strong>Download Pin</strong>. Downloadit displays the single photo or unpacks every slide in the carousel album.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                    4
                  </span>
                  <h3 className="font-bold text-fg text-[16px]">Save Original Quality JPEG</h3>
                </div>
                <p className="text-[14px] text-fg-muted leading-relaxed">
                  Click <strong>Download</strong> on any individual image card to save the full-resolution uncompressed file straight to your gallery.
                </p>
              </div>
            </div>
          </section>

          {/* Section 8: Supported Media and Formats */}
          <section className="space-y-5">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
              Supported Media and Formats
            </h2>
            <p className="text-[15.5px] sm:text-[16.5px] text-fg-muted leading-relaxed">
              Downloadit is strictly built to process the verified media types exposed by Pinterest&apos;s public infrastructure:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-[15px]">
                  <Film className="h-5 w-5" />
                  <span>Pinterest Video (MP4)</span>
                </div>
                <p className="text-[13.5px] text-fg-muted leading-relaxed">
                  Standard progressive MP4 video streams encoded in H.264 with AAC stereo audio at 720p or 1080p resolution.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-[15px]">
                  <ImageIcon className="h-5 w-5" />
                  <span>Pinterest Image (JPG)</span>
                </div>
                <p className="text-[13.5px] text-fg-muted leading-relaxed">
                  Full-resolution master JPEG and PNG image files extracted directly from Pinterest CDN servers without compression.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-[15px]">
                  <Layers className="h-5 w-5" />
                  <span>Carousel Albums</span>
                </div>
                <p className="text-[13.5px] text-fg-muted leading-relaxed">
                  Multi-slide Pins containing multiple high-resolution photos, parsed slide-by-slide for selective or complete downloads.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card/60 p-4 sm:p-5 text-[14px] text-fg-muted space-y-1">
              <span className="font-semibold text-fg">Platform Scope Notice:</span>
              <p>
                Downloadit processes individual public Pins only. We do not support secret boards, private accounts, bulk board archiving,
                or unsupported third-party formats. Only active, publicly accessible Pins can be fetched.
              </p>
            </div>
          </section>

          {/* Section 9: Why Choose Downloadit? */}
          <section className="space-y-6">
            <div className="border-b border-border pb-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
                Why Choose Downloadit?
              </h2>
              <p className="text-[14.5px] sm:text-[15.5px] text-fg-muted mt-1">
                Engineered for speed, transparency, and clean user experience.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-[15px]">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span>Zero Watermark</span>
                </div>
                <p className="text-[13.5px] text-fg-muted leading-relaxed">
                  Downloads pure source streams without adding watermarks, logos, or author overlays.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-[15px]">
                  <Zap className="h-5 w-5 text-primary" />
                  <span>Auto-Detect Engine</span>
                </div>
                <p className="text-[13.5px] text-fg-muted leading-relaxed">
                  Paste any Pin URL; our engine automatically detects whether it is a video, image, or carousel.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-[15px]">
                  <Smartphone className="h-5 w-5 text-primary" />
                  <span>Mobile &amp; pin.it Support</span>
                </div>
                <p className="text-[13.5px] text-fg-muted leading-relaxed">
                  Seamlessly resolves shortened mobile <code>pin.it</code> share links and full desktop URLs.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-[15px]">
                  <Lock className="h-5 w-5 text-primary" />
                  <span>100% Anonymous</span>
                </div>
                <p className="text-[13.5px] text-fg-muted leading-relaxed">
                  No login, email, password, or account linking required. Complete privacy guaranteed.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-[15px]">
                  <HeartHandshake className="h-5 w-5 text-primary" />
                  <span>Free &amp; Unlimited</span>
                </div>
                <p className="text-[13.5px] text-fg-muted leading-relaxed">
                  Save as many Pins as you need without rate limits, subscription fees, or hidden tokens.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-[15px]">
                  <Monitor className="h-5 w-5 text-primary" />
                  <span>Universal Playback</span>
                </div>
                <p className="text-[13.5px] text-fg-muted leading-relaxed">
                  Universal MP4 and JPG files that play natively across all smartphones, tablets, and PCs.
                </p>
              </div>
            </div>
          </section>

          {/* Section 10: Frequently Asked Questions (20 FAQs) */}
          <section className="space-y-6 pt-4">
            <div className="border-b border-border pb-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
                Frequently Asked Questions
              </h2>
              <p className="text-[14.5px] sm:text-[15.5px] text-fg-muted mt-1">
                Everything you need to know about downloading Pinterest videos, images, and carousels.
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

          {/* Internal Linking Hub */}
          <section className="space-y-6 pt-4">
            <div className="border-b border-border pb-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
                Explore More Downloadit Tools
              </h2>
              <p className="text-[14.5px] sm:text-[15.5px] text-fg-muted mt-1">
                Downloadit offers specialized high-speed downloaders for all your favorite platforms.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                href="/pinterest-image-downloader"
                className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-5 hover:border-primary/50 hover:shadow-md transition-all duration-200"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                      <span className="font-bold text-fg text-[16px] group-hover:text-primary transition-colors">
                        Pinterest Image Downloader
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      Images &amp; Carousels
                    </span>
                  </div>
                  <p className="text-[13.5px] text-fg-muted leading-relaxed">
                    Dedicated tool to download single photos and multi-image carousel albums in full original resolution.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-primary text-[13px] font-semibold mt-4 pt-3 border-t border-border/50">
                  <span>Open tool</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>

              <Link
                href="/instagram-video-downloader"
                className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-5 hover:border-primary/50 hover:shadow-md transition-all duration-200"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Film className="h-5 w-5" />
                      </div>
                      <span className="font-bold text-fg text-[16px] group-hover:text-primary transition-colors">
                        Instagram Downloader
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      Reels &amp; Stories
                    </span>
                  </div>
                  <p className="text-[13.5px] text-fg-muted leading-relaxed">
                    Download Instagram Reels, Stories, Videos, Photos, and Audio in HD MP4 with zero watermark.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-primary text-[13px] font-semibold mt-4 pt-3 border-t border-border/50">
                  <span>Open tool</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            </div>

            <div className="text-center pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm font-medium text-fg-muted hover:text-primary transition-colors"
              >
                <span>&larr; Back to all Downloadit tools (YouTube, Facebook, Twitter/X, Threads)</span>
              </Link>
            </div>
          </section>

        </div>
      </main>

      <Footer />
    </>
  );
}