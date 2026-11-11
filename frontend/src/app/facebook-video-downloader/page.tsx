import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FacebookDownloader from "@/components/FacebookDownloader";
import { TOOL_PAGES, toolMetadata } from "@/config/toolPages";
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
  Layers,
  Lock,
} from "lucide-react";

const PAGE = TOOL_PAGES.facebookVideo;

export const metadata: Metadata = toolMetadata(PAGE);

const FAQS = [
  {
    q: "How to download Facebook videos online?",
    a: "To download Facebook videos online, open Facebook and find the public video, Reel, or Watch clip you want to save. Click the Share button and select 'Copy link' (or copy the URL directly from your browser's address bar). Paste the copied link into the input field on Downloadit, click 'Get Video', and let our engine retrieve the video stream. Once the media preview appears, click 'Download' to save the MP4 video directly to your phone or computer.",
  },
  {
    q: "Is Facebook Video Downloader free?",
    a: "Yes. There is no registration, subscription, paywall or per-download charge. The service is supported by advertising, and usage is subject to fair-use rate limiting that protects availability for everyone.",
  },
  {
    q: "Can I download Facebook Reels?",
    a: "Yes. Public Facebook Reels are fully supported. Simply copy the link to any public Reel, paste it into our downloader input box, and tap 'Get Video'. Downloadit extracts the original vertical 9:16 MP4 video stream with crisp synchronized audio, with zero watermarks added.",
  },
  {
    q: "Can I download Facebook videos in HD?",
    a: "The downloader saves the best progressive MP4 stream Facebook exposes for that post. If the creator uploaded in HD and Facebook serves an HD rendition, you get that rendition; if only a standard-definition stream is available, that is what the tool returns. Downloadit does not upscale or invent a higher resolution.",
  },
  {
    q: "How do I save Facebook videos to my phone gallery?",
    a: "On Android, downloading an MP4 through Chrome or Firefox saves it directly into your device's 'Downloads' folder, which automatically appears in your Gallery or Google Photos app. On iPhone (iOS), open the downloaded video in Safari's Download Manager, tap the Share icon, and select 'Save Video' to add the MP4 directly into your Apple Photos camera roll.",
  },
  {
    q: "Does Facebook Video Downloader require login?",
    a: "No. You never need to sign in, provide your Facebook account details, or share login cookies. Downloadit resolves media from publicly accessible video links.",
  },
  {
    q: "Can I download Facebook videos on iPhone?",
    a: "Yes. Downloadit works seamlessly on iPhone and iPad via Safari, Google Chrome, or any modern iOS web browser. Simply paste the Facebook video URL, preview the content, tap Download, and save the MP4 file directly into the Safari Files app or Apple Photos.",
  },
  {
    q: "Why is my Facebook video link not working?",
    a: "A Facebook video link may fail to process if: (1) the post privacy is set to 'Friends' or restricted to a private group, (2) the creator has removed or archived the post, (3) you copied a profile feed, comment link, or search URL instead of the specific video post URL, or (4) the CDN media token has expired. Make sure you copy the direct URL of an individual public video and refresh the page to retry.",
  },
  {
    q: "Which Facebook video formats are supported?",
    a: "Downloadit extracts and serves universal MP4 video files with AAC audio. MP4 is compatible across all devices, operating systems, and video players, including Android, iOS, Windows, macOS, smart TVs, and gaming consoles.",
  },
  {
    q: "Can I download private Facebook videos?",
    a: "No. Downloadit strictly respects user privacy boundaries and platform access controls. It cannot retrieve private posts, videos from closed or secret Facebook groups, or media requiring user authentication.",
  },
  {
    q: "Which Facebook link formats are supported?",
    a: "Standard public post URLs work, including facebook.com and m.facebook.com links, fb.watch short links, and the share links produced by the Facebook mobile app. Profile URLs, search pages and comment permalinks are not media links, so paste the direct post URL instead.",
  },
];

const STEPS = [
  {
    step: "1",
    title: "Open Facebook and find the video",
    desc: "Open the Facebook app or website and locate the public video or Reel you want to download.",
  },
  {
    step: "2",
    title: "Copy the video's share link",
    desc: "Tap the Share button on the post and select 'Copy link', or copy the URL directly from the address bar.",
  },
  {
    step: "3",
    title: "Open Downloadit Facebook Downloader",
    desc: "Navigate to downloadit.pro/facebook-video-downloader in any web browser on your device.",
  },
  {
    step: "4",
    title: "Paste the link into the input field",
    desc: "Paste the copied Facebook link into the search box above or tap the 'Paste' button.",
  },
  {
    step: "5",
    title: "Click the download button",
    desc: "Tap 'Get Video' to start the extraction process. Downloadit fetches the available progressive stream.",
  },
  {
    step: "6",
    title: "Preview the available media",
    desc: "Review the video thumbnail and details to confirm the correct media has been resolved.",
  },
  {
    step: "7",
    title: "Save the video to your device",
    desc: "Click 'Download' to save the MP4 file directly to your phone gallery or computer storage.",
  },
];

const FEATURES = [
  {
    icon: Zap,
    title: "Free to Use",
    desc: "No subscription, payment or download-credit system. The service is supported by advertising and fair-use rate limiting.",
  },
  {
    icon: ShieldCheck,
    title: "No Login or Account Needed",
    desc: "Protect your privacy. Download public Facebook videos completely anonymously without sharing credentials or passwords.",
  },
  {
    icon: Sparkles,
    title: "No Added Watermark",
    desc: "Downloadit does not stamp logos, watermarks or branding onto the MP4 it returns.",
  },
  {
    icon: Film,
    title: "Watch, Reels & Feed Videos",
    desc: "One versatile downloader for all public Facebook media: short vertical Reels, standard feed videos, and long-form Watch clips.",
  },
  {
    icon: Smartphone,
    title: "Universal Mobile Compatibility",
    desc: "Optimized for Android smartphones, iPhone, iPad, Windows PC, and Mac through any modern mobile or desktop web browser.",
  },
  {
    icon: Layers,
    title: "Best Available MP4",
    desc: "Saves the best progressive MP4 stream Facebook exposes for that post. The actual resolution depends on the source upload.",
  },
];

const RELATED_TOOLS = [
  {
    name: "Instagram Video Downloader",
    href: "/instagram-video-downloader",
    desc: "Download public Instagram Reels, videos, and carousel posts in HD.",
  },
  {
    name: "Pinterest Video Downloader",
    href: "/pinterest-video-downloader",
    desc: "Save Pinterest video pins, Idea pins, and recipe clips as MP4.",
  },
  {
    name: "YouTube Video Downloader",
    href: "/youtube-video-downloader",
    desc: "Download YouTube videos and Shorts in supported quality or audio.",
  },
  {
    name: "Twitter/X Video Downloader",
    href: "/twitter-video-downloader",
    desc: "Download videos and animated GIFs from public Twitter and X posts.",
  },
  {
    name: "Threads Video Downloader",
    href: "/threads-video-downloader",
    desc: "Download public videos and photos from Threads posts quickly.",
  },
];

export default function FacebookVideoDownloaderPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "https://www.downloadit.pro/facebook-video-downloader/#webpage",
        url: "https://www.downloadit.pro/facebook-video-downloader",
        name: "Facebook Video Downloader – Download FB Videos in HD | Downloadit",
        description:
          "Download Facebook videos online for free with Downloadit.pro. Paste a public Facebook video or Reel link, preview available media and save supported HD MP4 quality. No login required.",
        inLanguage: "en",
        isPartOf: {
          "@id": "https://www.downloadit.pro/#website",
        },
        breadcrumb: {
          "@id": "https://www.downloadit.pro/facebook-video-downloader/#breadcrumbs",
        },
      },
      {
        "@type": "WebApplication",
        "@id": "https://www.downloadit.pro/facebook-video-downloader/#app",
        name: "Downloadit Facebook Video Downloader",
        url: "https://www.downloadit.pro/facebook-video-downloader",
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "Web Browser",
        inLanguage: "en",
        description:
          "Free web-based tool to download public Facebook videos and Reels online in supported HD MP4 quality without login.",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": "https://www.downloadit.pro/facebook-video-downloader/#breadcrumbs",
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
            name: "Facebook Video Downloader",
            item: "https://www.downloadit.pro/facebook-video-downloader",
          },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": "https://www.downloadit.pro/facebook-video-downloader/#faq",
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
        {/* H1 is rendered inside the FacebookDownloader hero */}
        <FacebookDownloader
          badge={PAGE.badge}
          titleA={PAGE.titleA}
          titleB={PAGE.titleB}
          subtitle={PAGE.description}
          placeholder={PAGE.placeholder}
          buttonLabel={PAGE.buttonLabel}
          benefits={PAGE.trust}
        />

        {/* Content Section following exact heading hierarchy */}
        <div className="mx-auto max-w-[960px] px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12 text-fg">

          {/* H2: Download Facebook Videos Online */}
          <section
            id="download-facebook-videos-online"
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-primary-light text-primary">
                <Film className="h-4 w-4" />
              </span>
              <span className="text-[12px] font-bold uppercase tracking-wider text-primary">
                Online FB Video Saver
              </span>
            </div>
            <h2 className="text-[24px] sm:text-[30px] font-extrabold tracking-tight text-fg mb-4">
              Download Facebook Videos Online
            </h2>
            <div className="space-y-4 text-[14.5px] sm:text-[15.5px] leading-[1.75] text-fg-muted">
              <p>
                Looking for a fast, reliable, and completely free way to save public videos from Facebook?
                Downloadit provides a specialized <strong className="text-fg">facebook video downloader</strong> that
                works entirely in your web browser. Whether you want to perform a quick <strong className="text-fg">facebook video download</strong> of
                an entertaining viral post, save an educational tutorial, or back up an insightful community interview, our
                engine extracts the direct media stream so you can save videos in universally compatible MP4 format.
              </p>
              <p>
                Unlike complicated third-party programs or browser extensions that track your browsing habits, Downloadit is a
                clean <strong className="text-fg">facebook video download online</strong> solution. When you paste a public
                Facebook link into our tool, our backend resolves the public delivery stream directly from Facebook&apos;s Content
                Delivery Network (CDN). We never ask for your account password, login tokens, or personal information. You can
                safely enjoy <strong className="text-fg">facebook video download without login</strong> on any device.
              </p>
              <p>
                The workflow is the same on a phone, tablet or desktop: copy the link to an individual public post, paste it above, and let the resolver read the media information Facebook exposes for that post. No account connection is involved, so your profile, feed and friends list are never accessed. If the post is private, deleted, region-locked or only visible to logged-in users, the resolver returns an error instead of a broken file.
              </p>
              <div className="rounded-xl border border-border/80 bg-bg/50 p-4 mt-4">
                <div className="flex items-start gap-3">
                  <Lock className="h-5 w-5 text-fg-subtle shrink-0 mt-0.5" />
                  <div className="text-[13.5px] leading-relaxed text-fg-muted">
                    <strong className="text-fg">Privacy &amp; Copyright Notice:</strong> Downloadit only resolves publicly accessible Facebook videos. Content shared in private groups, secret communities, or personal profiles with restricted audience settings cannot be retrieved. Always respect the original creator&apos;s copyright and ensure you have permission to download and store shared media.
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* H2: Facebook Reels Downloader */}
          <section
            id="facebook-reels-downloader"
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-accent-light text-accent">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="text-[12px] font-bold uppercase tracking-wider text-accent">
                Vertical Short Video Tool
              </span>
            </div>
            <h2 className="text-[24px] sm:text-[30px] font-extrabold tracking-tight text-fg mb-4">
              Facebook Reels Downloader
            </h2>
            <div className="space-y-4 text-[14.5px] sm:text-[15.5px] leading-[1.75] text-fg-muted">
              <p>
                Facebook Reels have quickly become one of the most engaging formats on social media, filled with comedy sketches, culinary recipes, travel vlogs, and trending dance choreography. With our dedicated <strong className="text-fg">facebook reels downloader</strong>, saving your favorite short videos for offline watching has never been simpler.
              </p>
              <p>
                When you initiate a <strong className="text-fg">facebook reels download</strong> on Downloadit, our resolver fetches the full-resolution vertical 9:16 video stream exactly as published by the creator. Best of all, we offer <strong className="text-fg">download fb reels without watermark</strong>: we never stamp promotional branding, overlays, or extra logos onto your downloaded video. You get the original progressive MP4 file with crisp, synchronized stereo sound.
              </p>
              <p>
                Facebook serves Reels through the same public delivery system as other videos, so the same link-based workflow applies. Copy the Reel&apos;s share link from the Facebook app or mobile site rather than a profile or feed URL, paste it above, and download the progressive MP4 that Facebook returns. The file keeps the original vertical framing and audio; Downloadit does not add overlays or re-encode the video.
              </p>
            </div>
          </section>

          {/* H2: How to Download Facebook Videos */}
          <section
            id="how-to-download-facebook-videos"
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-primary-light text-primary">
                <HelpCircle className="h-4 w-4" />
              </span>
              <span className="text-[12px] font-bold uppercase tracking-wider text-primary">
                Step-by-Step Guide
              </span>
            </div>
            <h2 className="text-[24px] sm:text-[30px] font-extrabold tracking-tight text-fg mb-4">
              How to Download Facebook Videos
            </h2>
            <p className="text-[14.5px] sm:text-[15.5px] leading-[1.75] text-fg-muted mb-6">
              Follow these simple, step-by-step instructions to save any public Facebook video or Reel to your device in seconds:
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
                Quick Tips for Mobile &amp; Desktop Users
              </h3>
              <ul className="list-disc pl-5 space-y-1.5 text-[13.5px] leading-relaxed text-fg-muted">
                <li>
                  <strong className="text-fg">Facebook App:</strong> Tap the &quot;Share&quot; button below any video post, swipe through the options, and select &quot;Copy link&quot;.
                </li>
                <li>
                  <strong className="text-fg">Desktop Browser:</strong> Right-click the video and choose &quot;Show video URL&quot;, or copy the address bar URL directly from Chrome, Edge, or Safari.
                </li>
                <li>
                  <strong className="text-fg">Expired Media Links:</strong> Facebook CDN links use signed tokens that expire after a period of time. If a download stalls, simply re-paste the link into Downloadit to generate a fresh token.
                </li>
              </ul>
            </div>
          </section>

          {/* H2: Download Facebook Videos in HD */}
          <section
            id="download-facebook-videos-in-hd"
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-primary-light text-primary">
                <Zap className="h-4 w-4" />
              </span>
              <span className="text-[12px] font-bold uppercase tracking-wider text-primary">
                High-Definition Playback
              </span>
            </div>
            <h2 className="text-[24px] sm:text-[30px] font-extrabold tracking-tight text-fg mb-4">
              Download Facebook Videos in HD
            </h2>
            <div className="space-y-4 text-[14.5px] sm:text-[15.5px] leading-[1.75] text-fg-muted">
              <p>
                Visual clarity matters, especially when downloading scenic travel clips, sports highlights, high-production interviews, or creative tutorials. Our <strong className="text-fg">facebook video downloader hd</strong> is designed to detect and retrieve the highest progressive resolution delivered by Facebook&apos;s media servers for that specific post.
              </p>
              <p>
                When a creator publishes a video, Facebook creates multiple stream renditions including standard definition (SD 360p, 540p) and high definition (HD 720p, 1080p). When you request a <strong className="text-fg">facebook video download hd</strong> on Downloadit, we inspect the available progressive MP4 renditions and deliver the highest quality stream. If the original video was recorded and published in full high definition, you can effortlessly <strong className="text-fg">download facebook video in hd</strong> without loss of visual sharpness.
              </p>
              <p>
                All files are packaged in the universal MP4 container with synchronized AAC audio. This ensures standard <strong className="text-fg">facebook to mp4</strong> conversion that plays reliably on all modern media players, editing software, and smart screens without needing extra video codecs or transcoder tools.
              </p>
            </div>
          </section>

          {/* H2: Facebook Video Downloader for Mobile */}
          <section
            id="facebook-video-downloader-for-mobile"
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-primary-light text-primary">
                <Smartphone className="h-4 w-4" />
              </span>
              <span className="text-[12px] font-bold uppercase tracking-wider text-primary">
                Cross-Device Compatibility
              </span>
            </div>
            <h2 className="text-[24px] sm:text-[30px] font-extrabold tracking-tight text-fg mb-4">
              Facebook Video Downloader for Mobile
            </h2>
            <div className="space-y-4 text-[14.5px] sm:text-[15.5px] leading-[1.75] text-fg-muted">
              <p>
                Most people open Facebook on a phone, so the downloader is built mobile-first. The layout, touch targets and result panel are designed for small screens, and you can complete the whole flow in a mobile browser without installing an APK, a store app or a background utility.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
                <div className="rounded-xl border border-border/80 bg-bg/50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Smartphone className="h-4 w-4 text-primary" />
                    <h3 className="text-[15px] font-bold text-fg">Android Devices</h3>
                  </div>
                  <p className="text-[13px] leading-relaxed text-fg-muted">
                    Works smoothly with Chrome, Firefox, Opera, and Samsung Internet. Downloaded MP4 files go directly into your device &quot;Downloads&quot; directory and instantly appear in Google Photos or your Gallery app.
                  </p>
                </div>
                <div className="rounded-xl border border-border/80 bg-bg/50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Smartphone className="h-4 w-4 text-accent" />
                    <h3 className="text-[15px] font-bold text-fg">iPhone &amp; iPad (iOS)</h3>
                  </div>
                  <p className="text-[13px] leading-relaxed text-fg-muted">
                    Fully compatible with Apple Safari and Chrome on iOS 13+. Download the MP4 file directly into Safari Downloads, tap Share, and select &quot;Save Video&quot; to place it into your Photos camera roll.
                  </p>
                </div>
                <div className="rounded-xl border border-border/80 bg-bg/50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Monitor className="h-4 w-4 text-primary" />
                    <h3 className="text-[15px] font-bold text-fg">Windows PC</h3>
                  </div>
                  <p className="text-[13px] leading-relaxed text-fg-muted">
                    No desktop setup required. Works seamlessly across Chrome, Microsoft Edge, Firefox, and Brave. Downloaded videos save directly to your Windows Downloads folder for instant playback.
                  </p>
                </div>
                <div className="rounded-xl border border-border/80 bg-bg/50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Monitor className="h-4 w-4 text-accent" />
                    <h3 className="text-[15px] font-bold text-fg">macOS (Mac)</h3>
                  </div>
                  <p className="text-[13px] leading-relaxed text-fg-muted">
                    Native compatibility with Safari, Chrome, and Arc. Save MP4 files directly to Finder with full QuickTime playback and AirDrop support.
                  </p>
                </div>
              </div>
              <p>
                Saved files follow your browser&apos;s normal download behaviour, which means they land in the device&apos;s Downloads folder or Files app. On Android they usually appear in Gallery or Google Photos automatically; on iPhone, open the downloaded file in Files, tap Share, then choose Save Video to add it to Photos.
              </p>
            </div>
          </section>

          {/* H2: Features of Downloadit Facebook Downloader */}
          <section
            id="features-of-downloadit-facebook-downloader"
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-primary-light text-primary">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <span className="text-[12px] font-bold uppercase tracking-wider text-primary">
                Core Advantages
              </span>
            </div>
            <h2 className="text-[24px] sm:text-[30px] font-extrabold tracking-tight text-fg mb-4">
              Features of Downloadit Facebook Downloader
            </h2>
            <p className="text-[14.5px] sm:text-[15.5px] leading-[1.75] text-fg-muted mb-6">
              Downloadit is designed to provide the cleanest, fastest, and most honest video downloading experience on the web:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {FEATURES.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="flex flex-col gap-2.5 rounded-xl border border-border/80 bg-bg/40 p-4 transition-colors hover:border-primary/40 hover:bg-card"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="text-[15px] font-bold text-fg leading-snug">{item.title}</h3>
                    <p className="text-[13px] leading-relaxed text-fg-muted">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* H2: Frequently Asked Questions */}
          <section
            id="frequently-asked-questions"
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-primary-light text-primary">
                <HelpCircle className="h-4 w-4" />
              </span>
              <span className="text-[12px] font-bold uppercase tracking-wider text-primary">
                Common Questions
              </span>
            </div>
            <h2 className="text-[24px] sm:text-[30px] font-extrabold tracking-tight text-fg mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-[14.5px] sm:text-[15.5px] leading-[1.75] text-fg-muted mb-6">
              Find transparent, accurate answers to the most common questions regarding our Facebook video and Reels downloader:
            </p>

            <div className="space-y-3">
              {FAQS.map((faq, idx) => (
                <details
                  key={faq.q}
                  name="facebook-faq"
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

          {/* Internal Links: Contextual Related Downloaders */}
          <section
            id="related-downloaders"
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-[var(--shadow-card)]"
          >
            <h3 className="text-[20px] font-bold text-fg mb-2">
              Explore More Media Downloaders
            </h3>
            <p className="text-[13.5px] leading-relaxed text-fg-muted mb-5">
              Need to save videos or media from other social networks? Downloadit offers dedicated downloaders for all major platforms:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {RELATED_TOOLS.map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="flex flex-col rounded-xl border border-border bg-bg/40 p-4 transition-all hover:border-primary/40 hover:bg-primary-light/30"
                >
                  <span className="text-[14.5px] font-bold text-primary flex items-center justify-between">
                    <span>{tool.name}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-[12px] text-fg-subtle mt-1 leading-normal">
                    {tool.desc}
                  </span>
                </Link>
              ))}
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
