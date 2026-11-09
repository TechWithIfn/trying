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
} from "lucide-react";

const PAGE = TOOL_PAGES.instagramPhoto;

export const metadata: Metadata = {
  title: {
    absolute: "Instagram Photo & Carousel Downloader – Save Images & Slides | Downloadit",
  },
  description:
    "Download Instagram photos and carousel albums in full resolution with Downloadit. Save single pictures or all slides from multi-image posts for free online.",
  alternates: {
    canonical: "https://downloadit.pro/instagram-photo-downloader",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    title: "Instagram Photo & Carousel Downloader – Save Images & Slides | Downloadit",
    description:
      "Download Instagram photos and carousel albums in full resolution with Downloadit. Save single pictures or all slides from multi-image posts for free online.",
    url: "https://downloadit.pro/instagram-photo-downloader",
    images: [
      {
        url: "/og-downloadit.png",
        width: 1200,
        height: 630,
        alt: "Downloadit Instagram Photo and Carousel Downloader online tool",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Instagram Photo & Carousel Downloader – Save Images & Slides | Downloadit",
    description:
      "Download Instagram photos and carousel albums in full resolution with Downloadit. Save single pictures or all slides from multi-image posts for free online.",
    images: ["/og-downloadit.png"],
  },
};

const FAQS = [
  {
    q: "How to download Instagram photos?",
    a: "Open the Instagram app or website, find the photo post you wish to save, tap the Share icon, and select 'Copy link'. Paste that URL into Downloadit above, click 'Download Media', and tap 'Download' on the preview to save the uncompressed JPEG directly to your device.",
  },
  {
    q: "How to download Instagram carousel posts?",
    a: "Paste the URL of any multi-image or multi-slide carousel post into Downloadit. Our tool extracts every individual photo and video slide within the album. You can inspect each slide in the preview and download them individually or save the full collection.",
  },
  {
    q: "Can I download all photos from a carousel at once?",
    a: "Downloadit displays every slide of the carousel with its own dedicated high-resolution download button. You can tap each slide sequentially to save the entire photo album to your device within seconds.",
  },
  {
    q: "What image quality does Downloadit provide?",
    a: "Downloadit retrieves the original high-resolution master JPEG files served by Instagram's edge servers—typically 1080x1080 (square), 1080x1350 (portrait 4:5), or 1080x566 (landscape). We never downscale or recompress the pictures.",
  },
  {
    q: "Can I download photos from private Instagram accounts?",
    a: "No. Downloadit respects privacy guidelines and only retrieves media from publicly accessible Instagram posts. Private accounts requiring follow approvals cannot be accessed by our tool.",
  },
  {
    q: "Is Downloadit Instagram Photo Downloader free?",
    a: "Yes. Downloadit is completely free and unrestricted. There are no download quotas, subscription paywalls, or hidden charges. You can download as many single photos and carousel slides as you need.",
  },
  {
    q: "Do I need an Instagram account or login to download pictures?",
    a: "No account or login is required. You never need to enter your Instagram username or password on Downloadit. Simply provide the public post link to download.",
  },
  {
    q: "Can I download mixed carousels containing both photos and videos?",
    a: "Yes! Instagram carousels often combine still photos with video clips. Downloadit processes mixed media albums effortlessly, delivering full-resolution JPEGs for photo slides and progressive HD MP4s for video slides.",
  },
  {
    q: "Does Downloadit store or archive downloaded pictures?",
    a: "No. Downloadit does not host, duplicate, or store any images on our servers. All pictures are fetched on-the-fly directly from Instagram's content delivery network to your browser.",
  },
  {
    q: "Which devices and browsers are supported?",
    a: "Downloadit works across all devices, including Apple iPhone (Safari), Android phones (Chrome, Samsung Internet), iPadOS, Windows PCs, and Mac computers without requiring any software installation.",
  },
];

const OTHER_TOOLS = [
  {
    title: "Instagram Reels Downloader",
    href: "/instagram-reels-downloader",
    desc: "Download vertical short-form reels in 1080p HD MP4 with original audio and zero watermark.",
    icon: Film,
    badge: "Trending",
  },
  {
    title: "Instagram Video Downloader",
    href: "/instagram-video-downloader",
    desc: "Save regular feed videos, long clips, and IGTV videos in full HD MP4.",
    icon: Film,
    badge: "All Formats",
  },
  {
    title: "Instagram Story Downloader",
    href: "/instagram-story-downloader",
    desc: "Save active 24-hour public stories (both video and photo) anonymously before they vanish.",
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

export default function PhotoDownloaderPage() {
  const jsonLdWebPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Instagram Photo & Carousel Downloader – Save Images & Slides",
    description:
      "Download Instagram photos and carousel albums in full resolution with Downloadit. Save single pictures or all slides from multi-image posts for free online.",
    url: "https://downloadit.pro/instagram-photo-downloader",
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
    name: "Downloadit Instagram Photo & Carousel Downloader",
    url: "https://downloadit.pro/instagram-photo-downloader",
    applicationCategory: "MultimediaApplication",
    operatingSystem: "All",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "Download single Instagram photos in full original resolution",
      "Save all slides from Instagram carousel and album posts",
      "Direct original JPEG images without extra compression",
      "Mixed carousel support for both photos and video clips",
      "No account login or registration required",
      "100% free and unlimited downloads",
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
        name: "Instagram Photo Downloader",
        item: "https://downloadit.pro/instagram-photo-downloader",
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
              Download Instagram Photos &amp; Carousels in High Resolution
            </h2>
            <p className="text-[15.5px] sm:text-[16.5px] text-fg-muted leading-relaxed">
              Instagram is the global benchmark for visual photography, digital artwork, travel galleries, and
              curated product showcases. While millions of stunning images are published every hour, Instagram’s
              web and mobile interfaces intentionally block right-click saving, long-press downloads, and native
              image saving to protect the platform interface.
            </p>
            <p className="text-[15.5px] sm:text-[16.5px] text-fg-muted leading-relaxed">
              Taking low-resolution screenshots results in cluttered phone UI, cropped edges, and compressed pixelation.
              <strong> Downloadit Instagram Photo Downloader</strong> provides an elegant, web-based solution that
              queries the public post and delivers the uncompressed, full-size original JPEG directly from Instagram&apos;s
              content distribution network. Whether you are downloading a single portrait picture or an entire 10-slide
              carousel album, our tool preserves maximum clarity and color vibrancy.
            </p>
          </section>

          {/* Section 2: How to Download Step-by-Step */}
          <section className="space-y-6">
            <div className="border-b border-border pb-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
                How to Download Instagram Photos &amp; Carousels
              </h2>
              <p className="text-[14.5px] sm:text-[15.5px] text-fg-muted mt-1">
                Save any public Instagram photo or multi-slide post in four simple steps.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                    1
                  </span>
                  <h3 className="font-bold text-fg text-[16px]">Copy the Post Link</h3>
                </div>
                <p className="text-[14px] text-fg-muted leading-relaxed">
                  Open Instagram, find the photo or carousel post you want to save, tap the <strong>Share</strong> paper airplane icon,
                  and select <strong>Copy link</strong>. On a computer browser, simply copy the URL from the top address bar.
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
                  Paste the copied link into the input field above. Mobile users can tap the built-in <strong>Paste</strong> button
                  to populate the box with a single touch.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                    3
                  </span>
                  <h3 className="font-bold text-fg text-[16px]">Preview All Slides</h3>
                </div>
                <p className="text-[14px] text-fg-muted leading-relaxed">
                  Click <strong>Download Media</strong>. Downloadit inspects the post structure, resolving the master image URL or
                  unpacking every individual photo and video slide if it is a carousel album.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                    4
                  </span>
                  <h3 className="font-bold text-fg text-[16px]">Download High-Res Images</h3>
                </div>
                <p className="text-[14px] text-fg-muted leading-relaxed">
                  Click the <strong>Download</strong> button beneath each preview card to save the pristine JPEG file straight
                  to your device’s gallery or downloads folder.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Instagram Carousel Downloader */}
          <section className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
              Instagram Carousel Downloader – Save All Slides &amp; Albums
            </h2>
            <p className="text-[15.5px] sm:text-[16.5px] text-fg-muted leading-relaxed">
              Instagram carousel posts allow creators to share up to 10 photos and video clips in a single swipeable
              album. Most generic online downloaders either fail entirely on carousel posts or only capture the very
              first slide.
            </p>
            <p className="text-[15.5px] sm:text-[16.5px] text-fg-muted leading-relaxed">
              Downloadit is equipped with a specialized carousel parser that enumerates every slide in the album.
              Whether the album contains 2 slides or 10 slides, our tool displays the full gallery sequentially,
              allowing you to selectively pick specific slides or download the entire collection in full resolution
              without losing image metadata or sharpness.
            </p>
          </section>

          {/* Section 4: Original Quality & Uncompressed JPEG */}
          <section className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
              Instagram Photo to JPG at Original Quality
            </h2>
            <p className="text-[15.5px] sm:text-[16.5px] text-fg-muted leading-relaxed">
              When you take a screenshot of an Instagram photo, your device captures the display resolution rather
              than the actual image dimensions, introducing compression artifacts, color banding, and blurred details.
            </p>
            <p className="text-[15.5px] sm:text-[16.5px] text-fg-muted leading-relaxed">
              Downloadit connects directly to Instagram’s content delivery network (CDN) to fetch the original
              high-resolution source files. You receive crisp, uncompressed JPEG files at up to 1080x1350 resolution
              with true sRGB color reproduction—perfect for graphic designers, photographers, mood boards, and wallpapers.
            </p>
          </section>

          {/* Section 5: Device Support */}
          <section className="space-y-5">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
              Download Instagram Photos on Mobile &amp; PC
            </h2>
            <p className="text-[15.5px] sm:text-[16.5px] text-fg-muted leading-relaxed">
              Downloadit runs entirely in modern web browsers with zero app installation:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold">
                  <Smartphone className="h-5 w-5" />
                  <span>iOS (iPhone &amp; iPad)</span>
                </div>
                <p className="text-[14px] text-fg-muted leading-relaxed">
                  Open in Safari or Chrome. Long-press the preview or tap Download to add the high-resolution JPEG directly
                  to your Apple Photos library.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold">
                  <Smartphone className="h-5 w-5" />
                  <span>Android Devices</span>
                </div>
                <p className="text-[14px] text-fg-muted leading-relaxed">
                  Tap Download to immediately save the image to your Downloads directory. It will appear instantly in
                  Google Photos, Samsung Gallery, or any file manager.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold">
                  <Monitor className="h-5 w-5" />
                  <span>Windows &amp; Mac</span>
                </div>
                <p className="text-[14px] text-fg-muted leading-relaxed">
                  Save full-size pictures directly to your local computer drive. Ideal for archival, design reference,
                  creative presentations, and offline viewing.
                </p>
              </div>
            </div>
          </section>

          {/* Section 6: Features Grid */}
          <section className="space-y-6">
            <div className="border-b border-border pb-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
                Features of Downloadit Photo &amp; Carousel Downloader
              </h2>
              <p className="text-[14.5px] sm:text-[15.5px] text-fg-muted mt-1">
                Optimized for visual perfection, reliability, and security.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-[15px]">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span>Full HD Resolution</span>
                </div>
                <p className="text-[13.5px] text-fg-muted leading-relaxed">
                  Extracts the largest available dimension from Instagram servers without downscaling.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-[15px]">
                  <Layers className="h-5 w-5 text-primary" />
                  <span>Complete Carousel Support</span>
                </div>
                <p className="text-[13.5px] text-fg-muted leading-relaxed">
                  Effortlessly parses multi-picture and mixed video/photo carousel albums slide by slide.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-[15px]">
                  <ImageIcon className="h-5 w-5 text-primary" />
                  <span>Pure JPEG Format</span>
                </div>
                <p className="text-[13.5px] text-fg-muted leading-relaxed">
                  Universal JPEG files that open instantly in any photo viewer, browser, or editing software.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-[15px]">
                  <Zap className="h-5 w-5 text-primary" />
                  <span>Instant Response</span>
                </div>
                <p className="text-[13.5px] text-fg-muted leading-relaxed">
                  Resolves image links in milliseconds for quick preview and instantaneous download.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-[15px]">
                  <Lock className="h-5 w-5 text-primary" />
                  <span>Anonymous &amp; Secure</span>
                </div>
                <p className="text-[13.5px] text-fg-muted leading-relaxed">
                  No Instagram account connection or personal details required. Completely private.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-[15px]">
                  <HeartHandshake className="h-5 w-5 text-primary" />
                  <span>100% Free Forever</span>
                </div>
                <p className="text-[13.5px] text-fg-muted leading-relaxed">
                  Unlimited downloads with zero subscription fees, hidden charges, or rate limiting.
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
                Answers to common questions regarding Instagram photo and carousel downloads.
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