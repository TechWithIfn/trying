import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PinterestDownloader from "@/components/PinterestDownloader";
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
  Layers,
  HeartHandshake,
  Image as ImageIcon,
} from "lucide-react";

const PAGE = TOOL_PAGES.pinterestImage;

export const metadata: Metadata = toolMetadata(PAGE);

const FAQS = [
  {
    q: "How to download Pinterest images in full resolution?",
    a: "Copy the link of any public Pinterest image Pin, paste it into Downloadit above, and tap 'Download Pin'. Our tool connects directly to Pinterest's CDN servers to deliver the highest-resolution master image (JPEG/PNG) without compression.",
  },
  {
    q: "How to download multiple images from a Pinterest Pin?",
    a: "When a Pin contains multiple images (a carousel post), Downloadit automatically extracts every slide in the album. Each picture appears in the preview panel with its own high-resolution download button, allowing you to save all slides one by one.",
  },
  {
    q: "Does Downloadit support Pinterest carousel images?",
    a: "Yes. Our Pinterest resolver seamlessly handles multi-image carousel Pins, unpacking all individual slides so you can download the entire collection in full original quality.",
  },
  {
    q: "How to save Pinterest photos in original quality?",
    a: "Unlike taking screenshots that capture screen resolution and crop margins, Downloadit fetches the full-resolution master image (often up to 2000px+ height) directly from Pinterest's content delivery network.",
  },
  {
    q: "Can I download pictures from private Pinterest boards?",
    a: "No. Downloadit respects privacy guidelines and only retrieves media from publicly accessible Pinterest Pins. Secret boards, private accounts, and invite-only boards cannot be accessed.",
  },
  {
    q: "Is Downloadit Pinterest Image Downloader free?",
    a: "Yes. Downloadit does not charge for Pinterest image downloads and requires no account, subscription, or payment details. You can save single photos and carousel slides for personal use.",
  },
  {
    q: "Do I need a Pinterest account to download pictures?",
    a: "No. You never need to log in, register, or connect your Pinterest account. Anyone with a valid public Pin link can download images immediately.",
  },
  {
    q: "Can I download Pinterest images without an app?",
    a: "Yes. Downloadit is completely web-based and operates in your standard mobile or desktop web browser. You do not need to install any APK, mobile app, or browser extension.",
  },
  {
    q: "Can I save Pinterest images on a phone?",
    a: "Yes. The image downloader works in mobile Safari on iPhone and iPad and in Chrome or Samsung Internet on Android. Tap a slide, then save the JPEG to your browser's Downloads folder and move it into Photos if needed.",
  },
  {
    q: "Why does a Pinterest image Pin show as unsupported?",
    a: "An image Pin cannot be resolved when it belongs to a secret board, has been deleted, or uses an interactive format that does not expose a public image file. Use the direct URL of an active public image or carousel Pin.",
  },
];

export default function PinterestImageDownloaderPage() {
  const jsonLdWebPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Pinterest Image & Carousel Downloader – Save Pins & Slides",
    description:
      "Download Pinterest images and multi-photo carousel Pins online with Downloadit. Save high-resolution JPEG pictures directly from public Pins for free. No login needed.",
    url: "https://www.downloadit.pro/pinterest-image-downloader",
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
    name: "Downloadit Pinterest Image & Carousel Downloader",
    url: "https://www.downloadit.pro/pinterest-image-downloader",
    applicationCategory: "MultimediaApplication",
    operatingSystem: "All",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "Download high-resolution Pinterest image Pins in original quality",
      "Full carousel support to download all images from multi-photo Pins",
      "Supports mobile pin.it short links and desktop URLs",
      "No account login or software installation required",
      "Fast edge CDN image delivery",
      "Free to use with no account or subscription required",
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
        name: "Pinterest Video Downloader",
        item: "https://www.downloadit.pro/pinterest-video-downloader",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Pinterest Image Downloader",
        item: "https://www.downloadit.pro/pinterest-image-downloader",
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

          {/* Section 1: Overview */}
          <section className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
              Download Pinterest Images &amp; Carousels in Full Resolution
            </h2>
            <p className="text-[15.5px] sm:text-[16.5px] text-fg-muted leading-relaxed">
              Pinterest is the undisputed home of aesthetic visual inspiration—spanning high-fashion moodboards, architectural
              blueprints, graphic design templates, home renovation plans, and culinary infographics. While millions of stunning
              images are pinned daily, saving the full-resolution source file directly to your photo gallery is often hindered
              by platform interfaces and app restrictions.
            </p>
            <p className="text-[15.5px] sm:text-[16.5px] text-fg-muted leading-relaxed">
              <strong>Downloadit Pinterest Image Downloader</strong> connects directly to Pinterest&apos;s content delivery servers
              to resolve the pristine master JPEG or PNG file uploaded by the creator. Whether you are archiving a single aesthetic
              wallpaper or extracting a multi-photo carousel album, our tool delivers uncompressed picture files in seconds.
            </p>
          </section>

          {/* Section 2: Carousel Support */}
          <section className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
              Download Pinterest Carousel Pins – Save All Slides
            </h2>
            <p className="text-[15.5px] sm:text-[16.5px] text-fg-muted leading-relaxed">
              Carousel Pins allow creators to group multiple photos, tutorial steps, or lookbook galleries into a single swipeable
              post. Generic download tools often fail completely on carousels or only scrape the cover slide, leaving the rest of the
              valuable slides inaccessible.
            </p>
            <p className="text-[15.5px] sm:text-[16.5px] text-fg-muted leading-relaxed">
              Our <em>pinterest carousel image download</em> engine scans and enumerates every slide in the Pin. You can preview the
              entire photo collection in our clean interface and download individual pictures or save the complete set of slides
              in original resolution without quality loss.
            </p>
          </section>

          {/* Section 3: How to Download */}
          <section className="space-y-6">
            <div className="border-b border-border pb-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
                How to Download Pinterest Images &amp; Carousel Pins
              </h2>
              <p className="text-[14.5px] sm:text-[15.5px] text-fg-muted mt-1">
                Save any public Pinterest image or multi-slide post in four simple steps.
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
                  Open Pinterest, find the image or carousel Pin you want to save, tap the <strong>Share</strong> icon, and select
                  <strong> Copy link</strong>. Both desktop URLs and mobile <code>pin.it</code> short links work.
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
                  Paste the URL into the input box above. On a phone, use the clipboard button beside the box.
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
                  Click <strong>Download Pin</strong>. Downloadit retrieves the original image files and displays a high-resolution preview
                  of the single photo or the entire carousel gallery.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                    4
                  </span>
                  <h3 className="font-bold text-fg text-[16px]">Save High-Res JPEGs</h3>
                </div>
                <p className="text-[14px] text-fg-muted leading-relaxed">
                  Click the <strong>Download</strong> button on any preview slide to immediately save the pristine master image to your
                  gallery or Downloads folder.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: Original Quality JPG */}
          <section className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
              Pinterest JPG Downloader at Original Quality
            </h2>
            <p className="text-[15.5px] sm:text-[16.5px] text-fg-muted leading-relaxed">
              Taking screenshots of Pinterest pins degrades quality by capturing only the display resolution of your device, introducing
              interface clutter, and compressing color subtleties.
            </p>
            <p className="text-[15.5px] sm:text-[16.5px] text-fg-muted leading-relaxed">
              Downloadit retrieves the original high-resolution master file—often spanning 1080x1920 or higher vertical resolutions—directly
              from Pinterest&apos;s <code>pinimg.com</code> edge servers. Every graphic nuance, texture, and typography element remains crisp,
              making it ideal for print, creative design, and wallpaper use.
            </p>
          </section>

          {/* Section 5: Device Compatibility */}
          <section className="space-y-5">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
              Pinterest Image Downloader for Mobile &amp; PC
            </h2>
            <p className="text-[15.5px] sm:text-[16.5px] text-fg-muted leading-relaxed">
              Downloadit is engineered to work effortlessly across all devices and web browsers:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold">
                  <Smartphone className="h-5 w-5" />
                  <span>iOS (iPhone &amp; iPad)</span>
                </div>
                <p className="text-[14px] text-fg-muted leading-relaxed">
                  Open in Safari or Chrome. Tap Download or long-press the high-res preview to save directly to your Apple Photos library.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold">
                  <Smartphone className="h-5 w-5" />
                  <span>Android Devices</span>
                </div>
                <p className="text-[14px] text-fg-muted leading-relaxed">
                  Tap Download to instantly save full-resolution images to your Downloads folder, appearing immediately in Google Photos or Samsung Gallery.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold">
                  <Monitor className="h-5 w-5" />
                  <span>Windows &amp; Mac</span>
                </div>
                <p className="text-[14px] text-fg-muted leading-relaxed">
                  Save master image files directly to your computer for moodboards, graphic design, presentation decks, or offline reference.
                </p>
              </div>
            </div>
          </section>

          {/* Section 6: Key Features Grid */}
          <section className="space-y-6">
            <div className="border-b border-border pb-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
                Features of Downloadit Pinterest Image Downloader
              </h2>
              <p className="text-[14.5px] sm:text-[15.5px] text-fg-muted mt-1">
                High-fidelity image retrieval built for creators and visual artists.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-[15px]">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span>Maximum Resolution</span>
                </div>
                <p className="text-[13.5px] text-fg-muted leading-relaxed">
                  Extracts the largest original master dimensions hosted by Pinterest without downscaling.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-[15px]">
                  <Layers className="h-5 w-5 text-primary" />
                  <span>Complete Carousel Support</span>
                </div>
                <p className="text-[13.5px] text-fg-muted leading-relaxed">
                  Unpacks multi-image carousel albums, letting you download all slides individually.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-[15px]">
                  <ImageIcon className="h-5 w-5 text-primary" />
                  <span>Universal JPG &amp; PNG</span>
                </div>
                <p className="text-[13.5px] text-fg-muted leading-relaxed">
                  Delivers standard image formats compatible with all picture viewers, phones, and software.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-[15px]">
                  <Zap className="h-5 w-5 text-primary" />
                  <span>Instant Edge Delivery</span>
                </div>
                <p className="text-[13.5px] text-fg-muted leading-relaxed">
                  Direct CDN streaming delivers your high-res photos within milliseconds.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-[15px]">
                  <Lock className="h-5 w-5 text-primary" />
                  <span>Anonymous &amp; Secure</span>
                </div>
                <p className="text-[13.5px] text-fg-muted leading-relaxed">
                  No login, password, or account linking required.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-[15px]">
                  <HeartHandshake className="h-5 w-5 text-primary" />
                  <span>Free to Use</span>
                </div>
                <p className="text-[13.5px] text-fg-muted leading-relaxed">
                  No subscription paywall, tokens, or account required.
                </p>
              </div>
            </div>
          </section>

          {/* Section 7: Supported Media and Formats */}
          <section className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
              Supported Media and Formats
            </h2>
            <p className="text-[15.5px] sm:text-[16.5px] text-fg-muted leading-relaxed">
              This tool focuses exclusively on Pinterest image Pins and multi-slide carousel albums. If your Pin contains
              video, our engine automatically detects it, or you can switch to our dedicated Pinterest Video Downloader.
              Please note that secret boards, private accounts, and bulk board downloads are not supported.
            </p>
          </section>

          {/* Section 8: Frequently Asked Questions */}
          <section className="space-y-6 pt-4">
            <div className="border-b border-border pb-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
                Frequently Asked Questions
              </h2>
              <p className="text-[14.5px] sm:text-[15.5px] text-fg-muted mt-1">
                Frequently asked questions regarding Pinterest image and carousel downloads.
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
                Switch between Pinterest tools or explore our other platform downloaders.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                href="/pinterest-video-downloader"
                className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-5 hover:border-primary/50 hover:shadow-md transition-all duration-200"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Film className="h-5 w-5" />
                      </div>
                      <span className="font-bold text-fg text-[16px] group-hover:text-primary transition-colors">
                        Pinterest Video Downloader
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      MP4 Videos
                    </span>
                  </div>
                  <p className="text-[13.5px] text-fg-muted leading-relaxed">
                    Download Pinterest video Pins in progressive MP4 quality with the original audio, without an added watermark.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-primary text-[13px] font-semibold mt-4 pt-3 border-t border-border/50">
                  <span>Open tool</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>

              <Link
                href="/instagram-photo-downloader"
                className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-5 hover:border-primary/50 hover:shadow-md transition-all duration-200"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                      <span className="font-bold text-fg text-[16px] group-hover:text-primary transition-colors">
                        Instagram Photo Downloader
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      Photos &amp; Carousels
                    </span>
                  </div>
                  <p className="text-[13.5px] text-fg-muted leading-relaxed">
                    Download single photos and all slides from Instagram carousel posts in full uncompressed resolution.
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
                <span>&larr; Back to all Downloadit tools (Facebook, Twitter/X, Threads)</span>
              </Link>
            </div>
          </section>

        </div>
      </main>

      <Footer />
    </>
  );
}