import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TwitterDownloader from "@/components/TwitterDownloader";
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
  Repeat,
  Lock,
  Layers,
  HeartHandshake,
} from "lucide-react";

const PAGE = TOOL_PAGES.twitterVideo;

export const metadata: Metadata = toolMetadata(PAGE);

const FAQS = [
  {
    q: "How to download Twitter videos?",
    a: "To download Twitter videos, find the public post on Twitter or X containing the video you want. Click the 'Share' icon and select 'Copy link' (or copy the URL directly from your browser's address bar). Paste the link into the input field on Downloadit, click 'Get Video', preview the retrieved media, and click 'Download' to save the MP4 video directly to your device.",
  },
  {
    q: "Is Downloadit Twitter Video Downloader free?",
    a: "Yes. Downloadit does not charge for Twitter/X downloads and requires no account, subscription, or payment details. The tool is intended for personal, offline viewing of public posts.",
  },
  {
    q: "Can I download Twitter videos without an account?",
    a: "Yes. You do not need a Twitter/X account or a Downloadit account. Downloadit works completely anonymously without requesting your login credentials, API keys, or browser session cookies.",
  },
  {
    q: "How do I download videos from X?",
    a: "Downloading videos from X is identical to downloading from Twitter. Simply copy the link of any public post from x.com (or twitter.com), paste it into our input box above, click 'Get Video', and save the resulting MP4 file once the preview appears.",
  },
  {
    q: "Can I download Twitter videos in HD?",
    a: "Yes, when the original video was uploaded in high definition (720p or 1080p) and X provides a progressive stream rendition, Downloadit retrieves the highest quality stream available for that post. Standard definition videos are delivered at their highest native resolution.",
  },
  {
    q: "Can I download Twitter videos on Android?",
    a: "Yes. Open Chrome, Firefox, or Samsung Internet on your Android device, paste the tweet link into Downloadit, and download the MP4 file. The video will be saved directly into your device's Downloads directory and appear in your Google Photos or Gallery.",
  },
  {
    q: "Does Twitter Video Downloader work on iPhone?",
    a: "Yes. On iOS devices (iPhone and iPad), use Safari or Chrome to paste the link and download the MP4. Once downloaded, tap the download icon in Safari, select the file, tap Share, and tap 'Save Video' to store it directly in your Apple Photos camera roll.",
  },
  {
    q: "Can I convert Twitter videos to MP4?",
    a: "Yes. Twitter serves video content packaged in progressive MP4 containers. Downloadit extracts and provides these direct MP4 files with synchronized AAC audio, making them playable across all operating systems, media players, and smart TVs without any additional conversion.",
  },
  {
    q: "Can I download Twitter GIFs?",
    a: "Yes. On Twitter and X, animated GIFs are actually converted and delivered as looping MP4 video files without audio. Downloadit detects and extracts these looping MP4 video streams so you can save and share them on any platform.",
  },
  {
    q: "Can I use Downloadit without installing Twitter/X software?",
    a: "Yes. Downloadit is a web page, not an app. You do not need the X desktop client, a mobile APK, a browser extension, or any command-line tool to save a public video.",
  },
  {
    q: "Can I download videos from private Twitter accounts?",
    a: "No. Downloadit respects creator privacy and platform permissions. We cannot access or download videos from protected accounts, private communities, or posts requiring an approved follower login session.",
  },
  {
    q: "Why is my Twitter video download not working?",
    a: "Common reasons a download may not work include: (1) the tweet is from a protected or private account, (2) the tweet has been deleted by its author or removed by X, (3) the post contains only images or text rather than a video or GIF, or (4) you pasted a profile URL instead of a specific post URL. Verify the post is public and contains playable media, then try again.",
  },
  {
    q: "Can I download multiple Twitter videos in one session?",
    a: "Downloadit processes one post link at a time. To save several videos, paste each public tweet URL in turn. There is no login step between downloads.",
  },
  {
    q: "Are saved Twitter videos stored on Downloadit?",
    a: "No. Downloadit does not keep a library of the videos you save. Media is requested from X's delivery network at the time of download and passed to your browser; we do not publish or resell downloaded files.",
  },
  {
    q: "Is Downloadit safe to use for X videos?",
    a: "The downloader runs over HTTPS and does not ask for your X password or require software installation. As with any online tool, avoid entering credentials on look-alike sites and only download media you have the right to use.",
  },
];

const STEPS = [
  {
    step: "1",
    title: "Open Twitter/X",
    desc: "Open the Twitter (X) app on your phone or visit twitter.com or x.com in your browser.",
  },
  {
    step: "2",
    title: "Find a public post containing a video",
    desc: "Locate the public tweet or X status update that features the video or animated GIF you want to download.",
  },
  {
    step: "3",
    title: "Copy the post link",
    desc: "Click the Share button on the post and tap 'Copy link', or copy the URL from your web browser's address bar.",
  },
  {
    step: "4",
    title: "Open Downloadit Twitter Video Downloader",
    desc: "Navigate to downloadit.pro/twitter-video-downloader on any device or browser.",
  },
  {
    step: "5",
    title: "Paste the link",
    desc: "Paste the copied tweet URL into the input field above or click the 'Paste' button.",
  },
  {
    step: "6",
    title: "Click the download button",
    desc: "Click 'Get Video' to let Downloadit process the tweet and fetch the available media stream.",
  },
  {
    step: "7",
    title: "Preview available media and download",
    desc: "Verify the media thumbnail in the result panel, then click 'Download' to save the MP4 video directly to your storage.",
  },
];

const FEATURES = [
  {
    icon: Zap,
    title: "Free Online Access",
    desc: "Free to use with no subscription, account, or payment details required.",
  },
  {
    icon: ShieldCheck,
    title: "No Login Required",
    desc: "Never requires your Twitter/X account credentials, passwords, or personal access tokens.",
  },
  {
    icon: Sparkles,
    title: "Simple Link-Based Process",
    desc: "Works with any standard public tweet URL from both x.com and legacy twitter.com domains.",
  },
  {
    icon: Film,
    title: "Video Preview When Available",
    desc: "Inspect the thumbnail and details before downloading to confirm you have the right media.",
  },
  {
    icon: Layers,
    title: "MP4 Downloads When Available",
    desc: "Extracts progressive MP4 video streams compatible with every phone, tablet, and PC.",
  },
  {
    icon: Smartphone,
    title: "Mobile-Friendly Interface",
    desc: "Responsive layout crafted specifically for Android and iOS mobile web browsers.",
  },
  {
    icon: Monitor,
    title: "Desktop Compatibility",
    desc: "Full performance in Chrome, Microsoft Edge, Safari, Firefox, and Brave on Windows and Mac.",
  },
  {
    icon: CheckCircle2,
    title: "No App Installation Required",
    desc: "Zero APKs, software downloads, or extensions needed. Everything runs in your browser.",
  },
];

const WHY_CHOOSE = [
  {
    icon: Zap,
    title: "Direct High-Speed Retrieval",
    desc: "Downloadit requests the media directly from X's public delivery network, so the file is not re-encoded or queued behind a converter.",
  },
  {
    icon: ShieldCheck,
    title: "Clean & Ad-Light Experience",
    desc: "Unlike many converter sites cluttered with deceptive download buttons, malware popups, and intrusive redirects, Downloadit prioritizes safety and clarity.",
  },
  {
    icon: Repeat,
    title: "No Added Watermarks",
    desc: "Handles standard videos, longer clips, and animated GIFs without adding a Downloadit watermark.",
  },
  {
    icon: Lock,
    title: "Strict Respect for Privacy",
    desc: "We do not track your personal identity, store download histories, or archive saved files on our servers. All transfers happen in real-time.",
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
    name: "Facebook Video Downloader",
    href: "/facebook-video-downloader",
    desc: "Download public Facebook videos, Reels, and Watch clips in HD MP4.",
  },
  {
    name: "Threads Video Downloader",
    href: "/threads-video-downloader",
    desc: "Download public videos and photos from Threads posts quickly.",
  },
];

export default function TwitterVideoDownloaderPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "https://www.downloadit.pro/twitter-video-downloader/#webpage",
        url: "https://www.downloadit.pro/twitter-video-downloader",
        name: "Twitter Video Downloader – Download X Videos in MP4 HD | Downloadit",
        description:
          "Download Twitter (X) videos online for free with Downloadit. Save public X videos as MP4 in available quality. Fast, easy, mobile-friendly and no login required.",
        inLanguage: "en",
        isPartOf: {
          "@id": "https://www.downloadit.pro/#website",
        },
        breadcrumb: {
          "@id": "https://www.downloadit.pro/twitter-video-downloader/#breadcrumbs",
        },
      },
      {
        "@type": "WebApplication",
        "@id": "https://www.downloadit.pro/twitter-video-downloader/#app",
        name: "Downloadit Twitter Video Downloader",
        url: "https://www.downloadit.pro/twitter-video-downloader",
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "Web Browser",
        inLanguage: "en",
        description:
          "Free online Twitter (X) video and GIF downloader to preview and save public Twitter media in MP4 quality without login.",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": "https://www.downloadit.pro/twitter-video-downloader/#breadcrumbs",
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
            name: "Twitter Video Downloader",
            item: "https://www.downloadit.pro/twitter-video-downloader",
          },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": "https://www.downloadit.pro/twitter-video-downloader/#faq",
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
        {/* H1 is rendered inside the TwitterDownloader hero */}
        <TwitterDownloader
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

          {/* H2: Download Twitter (X) Videos Online */}
          <section
            id="download-twitter-x-videos-online"
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-primary-light text-primary">
                <Film className="h-4 w-4" />
              </span>
              <span className="text-[12px] font-bold uppercase tracking-wider text-primary">
                Online X Media Saver
              </span>
            </div>
            <h2 className="text-[24px] sm:text-[30px] font-extrabold tracking-tight text-fg mb-4">
              Download Twitter (X) Videos Online
            </h2>
            <div className="space-y-4 text-[14.5px] sm:text-[15.5px] leading-[1.75] text-fg-muted">
              <p>
                Twitter (now officially known as X) is the primary real-time destination for breaking news, sports highlights, viral memes, investigative reporting, and entertainment clips. However, X does not provide a built-in option to save videos directly to your device. Downloadit&apos;s <strong className="text-fg">Twitter video downloader</strong> fills that gap: a free browser tool that saves a public post&apos;s video without installing anything.
              </p>
              <p>
                Whether you want to keep a clip for offline viewing, share it with friends on WhatsApp or Telegram, or reference it in a presentation, the tool resolves the direct media stream from X&apos;s Content Delivery Network. Copy the URL of any public post from <code className="text-xs bg-bg px-1.5 py-0.5 rounded border border-border">x.com</code> or <code className="text-xs bg-bg px-1.5 py-0.5 rounded border border-border">twitter.com</code>, paste it into the field above, and Downloadit retrieves the available progressive MP4 rendition.
              </p>
              <p>
                Downloadit offers a clean, link-based way to <strong className="text-fg">save Twitter videos</strong> without intrusive advertisements, fake download prompts, or mandatory app installations. All you need is the URL of a public post.
              </p>
              <div className="rounded-xl border border-border/80 bg-bg/50 p-4 mt-4">
                <div className="flex items-start gap-3">
                  <Lock className="h-5 w-5 text-fg-subtle shrink-0 mt-0.5" />
                  <div className="text-[13.5px] leading-relaxed text-fg-muted">
                    <strong className="text-fg">Public Posts Only:</strong> Downloadit only resolves publicly accessible posts and tweets. Tweets from protected accounts, private circle posts, or content restricted behind authenticated sessions cannot be downloaded. Please respect copyright laws and the intellectual property rights of content creators.
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* H2: How to Download Twitter Videos */}
          <section
            id="how-to-download-twitter-videos"
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-primary-light text-primary">
                <HelpCircle className="h-4 w-4" />
              </span>
              <span className="text-[12px] font-bold uppercase tracking-wider text-primary">
                Step-by-Step Instructions
              </span>
            </div>
            <h2 className="text-[24px] sm:text-[30px] font-extrabold tracking-tight text-fg mb-4">
              How to Download Twitter Videos
            </h2>
            <p className="text-[14.5px] sm:text-[15.5px] leading-[1.75] text-fg-muted mb-6">
              Follow this clear 7-step guide to download and save any public Twitter or X video in seconds:
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
                Helpful Tips for Smooth Twitter Video Downloads
              </h3>
              <ul className="list-disc pl-5 space-y-1.5 text-[13.5px] leading-relaxed text-fg-muted">
                <li>
                  <strong className="text-fg">Mobile App Sharing:</strong> In the Twitter or X mobile app, tap the Share icon located at the bottom-right of the tweet and choose &quot;Copy link&quot;.
                </li>
                <li>
                  <strong className="text-fg">Both Domains Supported:</strong> URLs starting with either <code className="text-xs bg-bg px-1 py-0.5 rounded">https://twitter.com/...</code> or <code className="text-xs bg-bg px-1 py-0.5 rounded">https://x.com/...</code> are fully supported.
                </li>
                <li>
                  <strong className="text-fg">Specific Post Link:</strong> Always ensure you copy the link to the individual tweet itself rather than a user profile page, hashtag feed, or search results page.
                </li>
              </ul>
            </div>
          </section>

          {/* H2: Download X Videos in HD Quality */}
          <section
            id="download-x-videos-in-hd-quality"
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-primary-light text-primary">
                <Zap className="h-4 w-4" />
              </span>
              <span className="text-[12px] font-bold uppercase tracking-wider text-primary">
                Resolution &amp; Bitrate
              </span>
            </div>
            <h2 className="text-[24px] sm:text-[30px] font-extrabold tracking-tight text-fg mb-4">
              Download X Videos in HD Quality
            </h2>
            <div className="space-y-4 text-[14.5px] sm:text-[15.5px] leading-[1.75] text-fg-muted">
              <p>
                When video content is uploaded to X (Twitter), the platform transcodes the master file into several bitrate renditions — commonly 360p, 540p, and 720p, with 1080p available for some uploads depending on the source and account settings. Downloadit inspects the progressive variants offered for the post and requests the highest-resolution stream that X exposes.
              </p>
              <p>
                We do not claim to upscale standard-definition content to 4K or 1080p when the author uploaded a lower-resolution file. If a creator posts in high definition, the saved MP4 keeps the sharpness, colour, and synchronized audio of the source rendition without artificial downsampling.
              </p>
              <p>
                The quality you receive therefore depends on the original upload and on which stream X makes publicly available for that post, not on an artificial &quot;HD&quot; toggle.
              </p>
            </div>
          </section>

          {/* H2: Twitter to MP4 Converter */}
          <section
            id="twitter-to-mp4-converter"
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-accent-light text-accent">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="text-[12px] font-bold uppercase tracking-wider text-accent">
                Format Compatibility
              </span>
            </div>
            <h2 className="text-[24px] sm:text-[30px] font-extrabold tracking-tight text-fg mb-4">
              Twitter to MP4 Converter
            </h2>
            <div className="space-y-4 text-[14.5px] sm:text-[15.5px] leading-[1.75] text-fg-muted">
              <p>
                MP4 (MPEG-4 Part 14) is universally recognized as the gold standard video format across the digital world. By converting and packaging media via <strong className="text-fg">twitter to mp4</strong> and <strong className="text-fg">x to mp4</strong>, Downloadit ensures your downloaded media plays effortlessly on any device — including Windows PCs, Mac computers, Android smartphones, iPhones, iPads, smart TVs, and popular editing software like Adobe Premiere, DaVinci Resolve, or CapCut.
              </p>
              <p>
                When you initiate a <strong className="text-fg">twitter video mp4 download</strong>, Downloadit extracts the H.264/AVC progressive video stream with AAC audio encoding. Because MP4 files feature broad hardware acceleration support, your downloaded videos load instantly, use minimal battery during playback, and can be shared effortlessly across messaging apps without requiring format conversions or third-party codecs.
              </p>
            </div>
          </section>

          {/* H2: Twitter GIF Downloader */}
          <section
            id="twitter-gif-downloader"
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-primary-light text-primary">
                <Repeat className="h-4 w-4" />
              </span>
              <span className="text-[12px] font-bold uppercase tracking-wider text-primary">
                Animated Media Support
              </span>
            </div>
            <h2 className="text-[24px] sm:text-[30px] font-extrabold tracking-tight text-fg mb-4">
              Twitter GIF Downloader
            </h2>
            <div className="space-y-4 text-[14.5px] sm:text-[15.5px] leading-[1.75] text-fg-muted">
              <p>
                Many users are surprised to discover that animated GIFs uploaded to Twitter and X are not actually stored as bulky .gif files. Instead, Twitter automatically converts GIFs into lightweight, looping MP4 video files to improve playback speed and reduce bandwidth consumption.
              </p>
              <p>
                Downloadit acts as a dedicated <strong className="text-fg">twitter gif downloader</strong>: when you paste the link to an animated GIF tweet, our system identifies the looping MP4 video stream and provides a direct download link. You can easily <strong className="text-fg">download twitter gif</strong> media to share in your group chats, insert into presentations, or preserve as memes. Simply copy the post link, paste it into Downloadit, and tap download.
              </p>
            </div>
          </section>

          {/* H2: Twitter Video Downloader for Mobile */}
          <section
            id="twitter-video-downloader-for-mobile"
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-primary-light text-primary">
                <Smartphone className="h-4 w-4" />
              </span>
              <span className="text-[12px] font-bold uppercase tracking-wider text-primary">
                Smartphone &amp; Tablet
              </span>
            </div>
            <h2 className="text-[24px] sm:text-[30px] font-extrabold tracking-tight text-fg mb-4">
              Twitter Video Downloader for Mobile
            </h2>
            <div className="space-y-4 text-[14.5px] sm:text-[15.5px] leading-[1.75] text-fg-muted">
              <p>
                Because the majority of Twitter and X browsing happens on mobile devices, Downloadit is engineered from the ground up to provide a premier mobile web experience. With our <strong className="text-fg">twitter video downloader mobile</strong>, you never need to install questionable APKs or battery-draining apps from unfamiliar sources.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
                <div className="rounded-xl border border-border/80 bg-bg/50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Smartphone className="h-4 w-4 text-primary" />
                    <h3 className="text-[15px] font-bold text-fg">Twitter Video Downloader Android</h3>
                  </div>
                  <p className="text-[13px] leading-relaxed text-fg-muted">
                    Works smoothly with Chrome, Firefox, Opera, and Samsung Internet. Downloaded MP4 files save directly to your Android &quot;Downloads&quot; folder and immediately appear in Google Photos or your default Gallery app.
                  </p>
                </div>
                <div className="rounded-xl border border-border/80 bg-bg/50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Smartphone className="h-4 w-4 text-accent" />
                    <h3 className="text-[15px] font-bold text-fg">Twitter Video Downloader iPhone (iOS)</h3>
                  </div>
                  <p className="text-[13px] leading-relaxed text-fg-muted">
                    Fully optimized for Safari and Chrome on iOS 13+. Download the video into Safari Downloads, tap the file, open the Share sheet, and select &quot;Save Video&quot; to place the MP4 directly into your Apple Photos camera roll.
                  </p>
                </div>
              </div>
              <p>
                Downloadit gives you a fast, app-free path to saving X videos directly to your phone&apos;s gallery or downloads folder.
              </p>
            </div>
          </section>

          {/* H2: Twitter Video Downloader for PC */}
          <section
            id="twitter-video-downloader-for-pc"
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-primary-light text-primary">
                <Monitor className="h-4 w-4" />
              </span>
              <span className="text-[12px] font-bold uppercase tracking-wider text-primary">
                Desktop &amp; Laptop
              </span>
            </div>
            <h2 className="text-[24px] sm:text-[30px] font-extrabold tracking-tight text-fg mb-4">
              Twitter Video Downloader for PC
            </h2>
            <div className="space-y-4 text-[14.5px] sm:text-[15.5px] leading-[1.75] text-fg-muted">
              <p>
                Downloading videos on a desktop computer should be quick and frictionless. Our <strong className="text-fg">twitter video downloader for pc</strong> requires no desktop client installation, command-line utilities, or browser extensions that inject tracking scripts.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
                <div className="rounded-xl border border-border/80 bg-bg/50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Monitor className="h-4 w-4 text-primary" />
                    <h3 className="text-[15px] font-bold text-fg">Windows PC Compatibility</h3>
                  </div>
                  <p className="text-[13px] leading-relaxed text-fg-muted">
                    Supports Google Chrome, Microsoft Edge, Mozilla Firefox, and Brave on Windows 10 and 11. Downloaded MP4 files land directly in your Windows Downloads folder for instant viewing in Windows Media Player or VLC.
                  </p>
                </div>
                <div className="rounded-xl border border-border/80 bg-bg/50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Monitor className="h-4 w-4 text-accent" />
                    <h3 className="text-[15px] font-bold text-fg">macOS (Mac) Compatibility</h3>
                  </div>
                  <p className="text-[13px] leading-relaxed text-fg-muted">
                    Seamlessly compatible with Apple Safari, Google Chrome, and Arc on macOS. Save progressive MP4 videos directly to Finder with native QuickTime playback and AirDrop sharing support.
                  </p>
                </div>
              </div>
              <p>
                Whether you use Windows, macOS, or Linux, Downloadit works smoothly in any modern web browser without needing elevated permissions or background software.
              </p>
            </div>
          </section>

          {/* H2: Features of Downloadit Twitter Downloader */}
          <section
            id="features-of-downloadit-twitter-downloader"
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-primary-light text-primary">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <span className="text-[12px] font-bold uppercase tracking-wider text-primary">
                Supported Features
              </span>
            </div>
            <h2 className="text-[24px] sm:text-[30px] font-extrabold tracking-tight text-fg mb-4">
              Features of Downloadit Twitter Downloader
            </h2>
            <p className="text-[14.5px] sm:text-[15.5px] leading-[1.75] text-fg-muted mb-6">
              Downloadit is built around speed, simplicity, and user safety. Here are the core features of our Twitter/X downloader:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {FEATURES.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="flex flex-col gap-2 rounded-xl border border-border/80 bg-bg/40 p-4 transition-colors hover:border-primary/40 hover:bg-card"
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

          {/* H2: Why Use Downloadit? */}
          <section
            id="why-use-downloadit"
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-primary-light text-primary">
                <HeartHandshake className="h-4 w-4" />
              </span>
              <span className="text-[12px] font-bold uppercase tracking-wider text-primary">
                Why Downloadit
              </span>
            </div>
            <h2 className="text-[24px] sm:text-[30px] font-extrabold tracking-tight text-fg mb-4">
              Why Use Downloadit?
            </h2>
            <div className="space-y-4 text-[14.5px] sm:text-[15.5px] leading-[1.75] text-fg-muted">
              <p>
                In a crowded landscape of online video converters, Downloadit stands apart through our commitment to honesty, speed, and privacy. Many websites in this category bombard visitors with pop-up advertisements, deceptive &quot;Download Now&quot; banners that link to adware, or force users to complete surveys before delivering files. Downloadit takes the opposite approach.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
                {WHY_CHOOSE.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="flex flex-col gap-2 rounded-xl border border-border/80 bg-bg/50 p-4"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5 text-primary" />
                        <h3 className="text-[15px] font-bold text-fg">{item.title}</h3>
                      </div>
                      <p className="text-[13px] leading-relaxed text-fg-muted">{item.desc}</p>
                    </div>
                  );
                })}
              </div>
              <p>
                We do not inject watermarks, alter audio synchronization, or truncate videos. When you paste a public Twitter post link, you receive the exact progressive MP4 stream served by X&apos;s delivery servers — cleanly, quickly, and securely.
              </p>
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
                Common Inquiries
              </span>
            </div>
            <h2 className="text-[24px] sm:text-[30px] font-extrabold tracking-tight text-fg mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-[14.5px] sm:text-[15.5px] leading-[1.75] text-fg-muted mb-6">
              Find transparent, accurate answers to the most common questions about downloading Twitter and X videos:
            </p>

            <div className="space-y-3">
              {FAQS.map((faq, idx) => (
                <details
                  key={faq.q}
                  name="twitter-faq"
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
              Need to save videos or media from other social platforms? Downloadit provides dedicated tools for all major networks:
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
