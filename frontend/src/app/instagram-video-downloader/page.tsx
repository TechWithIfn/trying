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
  ShieldCheck,
  Zap,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Layers,
  HeartHandshake,
  Image as ImageIcon,
  Music,
  Clock,
} from "lucide-react";

const PAGE = TOOL_PAGES.instagramVideo;

export const metadata: Metadata = toolMetadata(PAGE);

const FAQS = [
  {
    q: "Which Instagram media types can Downloadit save?",
    a: "The tool handles public Reels, standard feed videos, single photos, multi-photo or mixed carousels, active Stories, and the audio track of a video. Paste a post URL and Downloadit detects which media the post contains.",
  },
  {
    q: "Do I need a different downloader for each Instagram format?",
    a: "No. The main page accepts any public Instagram post link. If you want a page focused on one format, the Reels, Photo, Story, and Audio tools each cover a specific media type.",
  },
  {
    q: "Can Downloadit save a carousel that mixes photos and videos?",
    a: "Yes. Each slide in a public carousel is listed separately, so you can preview the items and download the photos or video clips you need.",
  },
  {
    q: "What happens to an Instagram Story after 24 hours?",
    a: "Stories expire from public view after roughly 24 hours. Downloadit can only retrieve a Story while it is still active; once Instagram removes it, no tool can fetch the original.",
  },
  {
    q: "Why does an Instagram link return no media?",
    a: "Common causes are a private account, a deleted or archived post, a profile URL instead of a post URL, an expired Story, or a text-only post. Make sure the link opens a public post that contains a video, photo, or carousel.",
  },
  {
    q: "Can I use Downloadit without an Instagram login?",
    a: "Yes. Downloadit never asks for an Instagram username, password, or session cookie. Only publicly viewable posts can be processed.",
  },
  {
    q: "Is there a charge to use the Instagram downloader?",
    a: "No. Downloadit does not require a subscription, account, or payment details. The service is intended for personal, offline viewing.",
  },
  {
    q: "Does Downloadit keep the media I download?",
    a: "No. Downloadit does not maintain a library of saved Instagram media. Files are requested from Instagram's delivery network when you download and are passed to your browser.",
  },
  {
    q: "Does the Instagram downloader work in a mobile browser?",
    a: "Yes. It works in Safari on iPhone and iPad and in Chrome, Firefox, or Samsung Internet on Android, as well as desktop browsers. Saved files go to the browser's download location.",
  },
  {
    q: "Can I save only the audio from an Instagram video?",
    a: "Yes. Use the dedicated Instagram Audio Downloader, paste the public video or Reel link, and download the soundtrack as an MP3.",
  },
];

const STEPS = [
  {
    step: "1",
    title: "Open Instagram and find the post",
    desc: "Open the Instagram app or website and navigate to the public Reel, video, photo, carousel, or Story you want to save.",
  },
  {
    step: "2",
    title: "Copy the post share link",
    desc: "Tap the Share icon (paper airplane) and select 'Copy link', or copy the URL directly from your web browser address bar.",
  },
  {
    step: "3",
    title: "Open Downloadit Instagram Downloader",
    desc: "Open the Instagram Downloader on your phone, tablet, or computer.",
  },
  {
    step: "4",
    title: "Paste the copied link",
    desc: "Paste the Instagram link into the box above.",
  },
  {
    step: "5",
    title: "Click Download Media",
    desc: "Tap 'Download Media' to start the extraction. Downloadit inspects the post and fetches the public media stream.",
  },
  {
    step: "6",
    title: "Preview and save your file",
    desc: "Verify the media thumbnail, select your preferred format (MP4 video, JPEG image, or MP3 audio), and save it to your device.",
  },
];

const INSTAGRAM_CATEGORIES = [
  {
    name: "Instagram Reels Downloader",
    href: "/instagram-reels-downloader",
    icon: Film,
    desc: "Download vertical 9:16 Reels as MP4 files with the original audio.",
    badge: "Reels",
  },
  {
    name: "Instagram Video Downloader",
    href: "/instagram-video-downloader",
    icon: Film,
    desc: "Save standard feed videos and longer Instagram video posts in the available MP4 quality.",
    badge: "Videos",
  },
  {
    name: "Instagram Photo & Carousel Downloader",
    href: "/instagram-photo-downloader",
    icon: ImageIcon,
    desc: "Download high-resolution JPEG photos and swipe-through carousel albums with all slides included.",
    badge: "Photos & Carousels",
  },
  {
    name: "Instagram Story Downloader",
    href: "/instagram-story-downloader",
    icon: Clock,
    desc: "Save ephemeral 24-hour Instagram Stories anonymously as MP4 videos or high-res photos.",
    badge: "Stories",
  },
  {
    name: "Instagram Audio Downloader",
    href: "/instagram-audio-downloader",
    icon: Music,
    desc: "Extract background music, sound bites, and voiceovers from public Reels and videos as MP3.",
    badge: "Audio & MP3",
  },
];

export default function InstagramMainDownloaderPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "https://www.downloadit.pro/instagram-video-downloader/#webpage",
        url: "https://www.downloadit.pro/instagram-video-downloader",
        name: "Instagram Downloader – Reels, Stories, Videos, Photos & Audio | Downloadit",
        description:
          "Download Instagram Reels, Stories, Videos, Photos and Carousel posts online with Downloadit. Save supported Instagram media and extract audio as MP3 for free.",
        inLanguage: "en",
        isPartOf: {
          "@id": "https://www.downloadit.pro/#website",
        },
        breadcrumb: {
          "@id": "https://www.downloadit.pro/instagram-video-downloader/#breadcrumbs",
        },
      },
      {
        "@type": "WebApplication",
        "@id": "https://www.downloadit.pro/instagram-video-downloader/#app",
        name: "Downloadit Instagram Downloader",
        url: "https://www.downloadit.pro/instagram-video-downloader",
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "Web Browser",
        inLanguage: "en",
        description:
          "Free online Instagram media downloader to save public Reels, Stories, Videos, Photos, and Carousels in HD MP4 and JPEG quality without login.",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": "https://www.downloadit.pro/instagram-video-downloader/#breadcrumbs",
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
        ],
      },
      {
        "@type": "FAQPage",
        "@id": "https://www.downloadit.pro/instagram-video-downloader/#faq",
        mainEntity: FAQS.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.a,
          },
        })),
      },
    ],
  };

  return (
    <>
      <Header />
      <main id="main-content" className="flex-1">
        {/* H1 is rendered inside the ToolDownloader hero */}
        <ToolDownloader page={PAGE} />

        {/* Content Section following exact heading hierarchy from Section 5 */}
        <div className="mx-auto max-w-[960px] px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12 text-fg">

          {/* Section 2: Download Instagram Reels */}
          <section
            id="download-instagram-reels"
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-primary-light text-primary">
                <Film className="h-4 w-4" />
              </span>
              <span className="text-[12px] font-bold uppercase tracking-wider text-primary">
                Vertical Short Video
              </span>
            </div>
            <h2 className="text-[24px] sm:text-[30px] font-extrabold tracking-tight text-fg mb-4">
              Download Instagram Reels
            </h2>
            <div className="space-y-4 text-[14.5px] sm:text-[15.5px] leading-[1.75] text-fg-muted">
              <p>
                Instagram Reels have become the platform&apos;s most popular creative format, featuring viral comedy, culinary tutorials, dance trends, and educational clips. With our dedicated <strong className="text-fg">instagram reels downloader</strong>, performing an <strong className="text-fg">instagram reels download</strong> is quick and effortless. You can <strong className="text-fg">download instagram reels</strong> in full-screen vertical 9:16 aspect ratio at the highest available resolution without quality reduction.
              </p>
              <p>
                Unlike basic screen recorders that leave app interfaces and notification stamps across your video, our <strong className="text-fg">reels video downloader</strong> extracts the clean, unwatermarked master MP4 stream directly from Instagram&apos;s Content Delivery Network. Every <strong className="text-fg">reels download</strong> preserves original audio synchronization and visual clarity. Looking specifically for Reels? Visit our dedicated <Link href="/instagram-reels-downloader" className="font-semibold text-primary hover:underline">Instagram Reels Downloader</Link> for specialized short-form tools.
              </p>
            </div>
          </section>

          {/* Section 3: Download Instagram Videos */}
          <section
            id="download-instagram-videos"
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-primary-light text-primary">
                <Film className="h-4 w-4" />
              </span>
              <span className="text-[12px] font-bold uppercase tracking-wider text-primary">
                Feed Clips &amp; Long-Form
              </span>
            </div>
            <h2 className="text-[24px] sm:text-[30px] font-extrabold tracking-tight text-fg mb-4">
              Download Instagram Videos
            </h2>
            <div className="space-y-4 text-[14.5px] sm:text-[15.5px] leading-[1.75] text-fg-muted">
              <p>
                Standard feed videos, presentations, product demonstrations, and interviews require dependable archiving. Downloadit operates as a premier <strong className="text-fg">instagram video downloader</strong> that enables you to perform a fast <strong className="text-fg">instagram video download</strong> for any public post. You can <strong className="text-fg">download instagram video</strong> content directly as a progressive MP4 file with AAC audio encoding.
              </p>
              <p>
                Our <strong className="text-fg">instagram video downloader online</strong> functions seamlessly across all mobile and desktop browsers without requiring third-party software installations. Enjoy high-definition video playback with universal compatibility on Windows, Mac, iOS, and Android devices.
              </p>
            </div>
          </section>

          {/* Section 4: Instagram Photo Downloader */}
          <section
            id="instagram-photo-downloader"
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-primary-light text-primary">
                <ImageIcon className="h-4 w-4" />
              </span>
              <span className="text-[12px] font-bold uppercase tracking-wider text-primary">
                High-Resolution Stills
              </span>
            </div>
            <h2 className="text-[24px] sm:text-[30px] font-extrabold tracking-tight text-fg mb-4">
              Instagram Photo Downloader
            </h2>
            <div className="space-y-4 text-[14.5px] sm:text-[15.5px] leading-[1.75] text-fg-muted">
              <p>
                Taking screenshots of Instagram photos often results in cropped borders, compressed detail, and degraded resolution. Our <strong className="text-fg">instagram photo downloader</strong> solves this by fetching the original, uncompressed source JPEG directly from Instagram&apos;s servers.
              </p>
              <p>
                When you initiate an <strong className="text-fg">instagram photo download</strong>, Downloadit delivers the maximum image dimensions published by the author (up to 1080×1350 for portrait photos). Whether you want to <strong className="text-fg">download instagram photos</strong> for moodboards, wallpaper backgrounds, or creative study, you receive pristine picture clarity. Visit our dedicated <Link href="/instagram-photo-downloader" className="font-semibold text-primary hover:underline">Instagram Photo &amp; Carousel Downloader</Link> for multi-image post features.
              </p>
            </div>
          </section>

          {/* Section 5: Instagram Carousel Downloader */}
          <section
            id="instagram-carousel-downloader"
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-primary-light text-primary">
                <Layers className="h-4 w-4" />
              </span>
              <span className="text-[12px] font-bold uppercase tracking-wider text-primary">
                Multi-Slide Album Tool
              </span>
            </div>
            <h2 className="text-[24px] sm:text-[30px] font-extrabold tracking-tight text-fg mb-4">
              Instagram Carousel Downloader
            </h2>
            <div className="space-y-4 text-[14.5px] sm:text-[15.5px] leading-[1.75] text-fg-muted">
              <p>
                Multi-picture posts, swipe-through albums, and photo dumps are central to modern Instagram storytelling. With our <strong className="text-fg">instagram carousel downloader</strong>, you are not forced to choose just one image. Our engine parses the entire carousel album and presents every individual slide for preview.
              </p>
              <p>
                Whether a carousel contains 2 or 10 slides, you can perform an <strong className="text-fg">instagram carousel download</strong> to save specific pictures or download all slides as a complete collection. Each slide is preserved in its original JPEG resolution without cropping.
              </p>
            </div>
          </section>

          {/* Section 6: Instagram Story Downloader */}
          <section
            id="instagram-story-downloader"
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-primary-light text-primary">
                <Clock className="h-4 w-4" />
              </span>
              <span className="text-[12px] font-bold uppercase tracking-wider text-primary">
                24-Hour Ephemeral Media
              </span>
            </div>
            <h2 className="text-[24px] sm:text-[30px] font-extrabold tracking-tight text-fg mb-4">
              Instagram Story Downloader
            </h2>
            <div className="space-y-4 text-[14.5px] sm:text-[15.5px] leading-[1.75] text-fg-muted">
              <p>
                Instagram Stories disappear after 24 hours. Once expired, Meta wipes them from external CDN access, making timely archiving essential. Downloadit provides an anonymous <strong className="text-fg">instagram story downloader</strong> that lets you perform an <strong className="text-fg">instagram story download</strong> while the content is live on a public profile.
              </p>
              <p>
                Because Downloadit queries public CDN streams anonymously without logging in, the creator is never notified and your view is not registered on their viewer list. You can save both video stories (as MP4) and photo stories (as JPEG) in original quality. Explore our dedicated <Link href="/instagram-story-downloader" className="font-semibold text-primary hover:underline">Instagram Story Downloader</Link> for more details.
              </p>
            </div>
          </section>

          {/* Section 7: Instagram Audio Downloader */}
          <section
            id="instagram-audio-downloader"
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-accent-light text-accent">
                <Music className="h-4 w-4" />
              </span>
              <span className="text-[12px] font-bold uppercase tracking-wider text-accent">
                Audio &amp; MP3 Extraction
              </span>
            </div>
            <h2 className="text-[24px] sm:text-[30px] font-extrabold tracking-tight text-fg mb-4">
              Instagram Audio Downloader
            </h2>
            <div className="space-y-4 text-[14.5px] sm:text-[15.5px] leading-[1.75] text-fg-muted">
              <p>
                Discovered a catchy song, viral sound bite, motivational speech, or podcast excerpt on an Instagram Reel? Our <strong className="text-fg">instagram audio downloader</strong> extracts the isolated sound track and converts it into a high-fidelity MP3 file.
              </p>
              <p>
                Our server-side FFmpeg pipeline extracts the audio stream at optimal bitrate, performing an authentic <strong className="text-fg">instagram to MP3</strong> conversion. You can save music, ambient sounds, and voice recordings directly to your music library. Visit our dedicated <Link href="/instagram-audio-downloader" className="font-semibold text-primary hover:underline">Instagram Audio Downloader</Link> to extract sounds directly.
              </p>
            </div>
          </section>

          {/* Section 8: How to Download Instagram Media */}
          <section
            id="how-to-download-instagram-media"
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-primary-light text-primary">
                <HelpCircle className="h-4 w-4" />
              </span>
              <span className="text-[12px] font-bold uppercase tracking-wider text-primary">
                Simple 6-Step Workflow
              </span>
            </div>
            <h2 className="text-[24px] sm:text-[30px] font-extrabold tracking-tight text-fg mb-4">
              How to Download Instagram Media
            </h2>
            <p className="text-[14.5px] sm:text-[15.5px] leading-[1.75] text-fg-muted mb-6">
              Follow this step-by-step instructional guide to download any public Instagram media in seconds:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {STEPS.map((s) => (
                <div
                  key={s.step}
                  className="flex gap-3.5 rounded-xl border border-border/80 bg-bg/40 p-4 transition-colors hover:border-primary/40 hover:bg-card"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary font-extrabold text-[14px]">
                    {s.step}
                  </span>
                  <div>
                    <h3 className="text-[15px] font-bold text-fg leading-snug">
                      Step {s.step}: {s.title}
                    </h3>
                    <p className="text-[13px] leading-relaxed text-fg-muted mt-1">
                      {s.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-border/80 bg-bg/60 p-5">
              <h3 className="text-[16px] font-bold text-fg mb-2">
                Quick Device Guidelines
              </h3>
              <ul className="list-disc pl-5 space-y-1.5 text-[13.5px] leading-relaxed text-fg-muted">
                <li>
                  <strong className="text-fg">Android:</strong> Downloads save automatically to your device &quot;Downloads&quot; directory and instantly show up in Google Photos or your default Gallery app.
                </li>
                <li>
                  <strong className="text-fg">iPhone (iOS):</strong> Tap the download prompt in Safari, open the file in Safari Downloads, tap Share, and select &quot;Save Video&quot; or &quot;Save Image&quot; to place it in Apple Photos.
                </li>
                <li>
                  <strong className="text-fg">Desktop (PC &amp; Mac):</strong> Works across Chrome, Edge, Safari, Firefox, and Brave, saving directly to your standard Downloads folder.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 9: Supported Media Formats */}
          <section
            id="supported-media-formats"
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-primary-light text-primary">
                <Layers className="h-4 w-4" />
              </span>
              <span className="text-[12px] font-bold uppercase tracking-wider text-primary">
                File Specifications
              </span>
            </div>
            <h2 className="text-[24px] sm:text-[30px] font-extrabold tracking-tight text-fg mb-4">
              Supported Media Formats
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl border border-border/80 bg-bg/50 p-4">
                <span className="block text-[14.5px] font-bold text-primary mb-1">MP4 Video</span>
                <p className="text-[13px] text-fg-muted leading-relaxed">
                  Progressive video with H.264 video encoding and AAC stereo audio. Compatible with all smartphones, PCs, media players, and video editors.
                </p>
              </div>
              <div className="rounded-xl border border-border/80 bg-bg/50 p-4">
                <span className="block text-[14.5px] font-bold text-primary mb-1">JPEG Image</span>
                <p className="text-[13px] text-fg-muted leading-relaxed">
                  Full-resolution source photographs and carousel slides up to 1080×1350 pixels without screenshot degradation or watermarks.
                </p>
              </div>
              <div className="rounded-xl border border-border/80 bg-bg/50 p-4">
                <span className="block text-[14.5px] font-bold text-primary mb-1">MP3 Audio</span>
                <p className="text-[13px] text-fg-muted leading-relaxed">
                  Extracted stereo sound and music tracks encoded at optimal bitrates for universal playback on any audio device or player.
                </p>
              </div>
            </div>
          </section>

          {/* Section 10: Why Choose Downloadit? */}
          <section
            id="why-choose-downloadit"
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-primary-light text-primary">
                <HeartHandshake className="h-4 w-4" />
              </span>
              <span className="text-[12px] font-bold uppercase tracking-wider text-primary">
                The Downloadit Advantage
              </span>
            </div>
            <h2 className="text-[24px] sm:text-[30px] font-extrabold tracking-tight text-fg mb-4">
              Why Choose Downloadit?
            </h2>
            <div className="space-y-4 text-[14.5px] sm:text-[15.5px] leading-[1.75] text-fg-muted">
              <p>
                Many online downloader sites overwhelm visitors with pop-ups, misleading download buttons, forced redirects, or mandatory software installations. Downloadit is built around a simpler workflow: paste a public link, preview the media, and save the file.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
                <div className="rounded-xl border border-border/80 bg-bg/50 p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <h3 className="text-[15px] font-bold text-fg">No Login Required</h3>
                  </div>
                  <p className="text-[13px] leading-relaxed text-fg-muted">
                    We never ask for your Instagram account, password, or cookies.
                  </p>
                </div>
                <div className="rounded-xl border border-border/80 bg-bg/50 p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Sparkles className="h-4 w-4 text-accent" />
                    <h3 className="text-[15px] font-bold text-fg">Zero Watermarks Added</h3>
                  </div>
                  <p className="text-[13px] leading-relaxed text-fg-muted">
                    We never stamp logos, branding, or watermarks onto your saved files. You receive the exact original source media stream delivered by Meta.
                  </p>
                </div>
                <div className="rounded-xl border border-border/80 bg-bg/50 p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Zap className="h-4 w-4 text-primary" />
                    <h3 className="text-[15px] font-bold text-fg">Direct CDN Retrieval</h3>
                  </div>
                  <p className="text-[13px] leading-relaxed text-fg-muted">
                    Files are requested from Instagram&apos;s delivery servers and passed to your browser without an extra conversion queue.
                  </p>
                </div>
                <div className="rounded-xl border border-border/80 bg-bg/50 p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Smartphone className="h-4 w-4 text-accent" />
                    <h3 className="text-[15px] font-bold text-fg">App-Free Browser Experience</h3>
                  </div>
                  <p className="text-[13px] leading-relaxed text-fg-muted">
                    Runs entirely inside your existing web browser. No need to download APKs, suspicious mobile apps, or desktop clients.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 11: Frequently Asked Questions */}
          <section
            id="frequently-asked-questions"
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-primary-light text-primary">
                <HelpCircle className="h-4 w-4" />
              </span>
              <span className="text-[12px] font-bold uppercase tracking-wider text-primary">
                Answers to Your Questions
              </span>
            </div>
            <h2 className="text-[24px] sm:text-[30px] font-extrabold tracking-tight text-fg mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-[14.5px] sm:text-[15.5px] leading-[1.75] text-fg-muted mb-6">
              Clear, transparent answers to the most common questions regarding our Instagram downloader tools:
            </p>

            <div className="space-y-3">
              {FAQS.map((faq, idx) => (
                <details
                  key={faq.q}
                  name="instagram-faq"
                  className="group rounded-xl border border-border/90 bg-bg/40 transition-colors hover:border-primary/40 overflow-hidden"
                  {...(idx === 0 ? { open: true } : {})}
                >
                  <summary className="flex w-full items-center justify-between gap-4 p-4 sm:p-5 text-left cursor-pointer list-none select-none transition-colors hover:bg-primary-light/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 [&::-webkit-details-marker]:hidden">
                    <span className="text-[15px] sm:text-[16px] font-bold text-fg leading-snug">
                      {faq.q}
                    </span>
                    <ChevronDown className="h-5 w-5 shrink-0 text-fg-muted transition-transform duration-200 group-open:rotate-180" />
                  </summary>
                  <div className="px-4 sm:px-5 pb-5 pt-1 text-[14px] leading-relaxed text-fg-muted border-t border-border-light bg-card/60">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </section>

          {/* Internal Linking: Dedicated Instagram Downloader Tools */}
          <section
            id="instagram-tools-hub"
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-[var(--shadow-card)]"
          >
            <h3 className="text-[20px] font-bold text-fg mb-2">
              Dedicated Instagram Downloader Tools
            </h3>
            <p className="text-[13.5px] leading-relaxed text-fg-muted mb-5">
              Looking for a specialized tool for specific Instagram media? Explore our dedicated category pages:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {INSTAGRAM_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <Link
                    key={cat.href}
                    href={cat.href}
                    className="flex flex-col rounded-xl border border-border bg-bg/40 p-4 transition-all hover:border-primary/40 hover:bg-primary-light/30"
                  >
                    <span className="text-[14.5px] font-bold text-primary flex items-center justify-between mb-1">
                      <span className="flex items-center gap-1.5">
                        <Icon className="h-4 w-4" />
                        <span>{cat.name}</span>
                      </span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-[12px] text-fg-subtle leading-normal">
                      {cat.desc}
                    </span>
                  </Link>
                );
              })}
            </div>
            <div className="mt-6 text-center">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-fg-subtle transition-colors hover:text-primary"
              >
                <span aria-hidden="true">&larr;</span>
                <span>Back to Downloadit Home</span>
              </Link>
            </div>
          </section>

        </div>
      </main>

      <Footer />

      {/* JSON-LD Structured Data: WebPage, WebApplication, BreadcrumbList, FAQPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </>
  );
}
