import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ThreadsDownloader from "@/components/ThreadsDownloader";
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
  Image as ImageIcon,
} from "lucide-react";

const PAGE = TOOL_PAGES.threadsVideo;

export const metadata: Metadata = toolMetadata(PAGE);

const FAQS = [
  {
    q: "How do I download a video from Threads?",
    a: "Open the Threads app or visit threads.net in your browser and find the public post. Tap the paper-airplane share icon and choose 'Copy link'. Paste that URL into the field above, select 'Get Media', confirm the preview, and choose 'Download' to save the MP4 file.",
  },
  {
    q: "Is Downloadit free to use for Threads videos?",
    a: "Yes. Downloadit is free to use and does not require a subscription, account, or payment details. You can use the Threads downloader for personal archiving without a paywall.",
  },
  {
    q: "Do I need a Threads or Instagram account to download?",
    a: "No. Downloadit does not ask for Threads, Instagram, or Meta credentials. You never share a password, session cookie, or authentication token with us.",
  },
  {
    q: "Where do downloaded Threads videos go on my phone?",
    a: "On Android, the MP4 usually lands in your browser's Downloads folder and appears in Gallery or Google Photos. On iPhone, the file is saved to Safari's Downloads; open it, tap Share, and choose 'Save Video' to move it into Photos.",
  },
  {
    q: "What video quality does Downloadit retrieve from Threads?",
    a: "Downloadit requests the highest progressive rendition Meta publishes for the post, which is often 720p or 1080p for HD uploads. We do not upscale lower-resolution source videos, so a clip saved from an SD upload stays SD.",
  },
  {
    q: "Can Downloadit save photos and carousels from Threads?",
    a: "Yes. For public image posts, Downloadit resolves the original JPEG files, including each item in a multi-photo carousel, at the dimensions published by the creator.",
  },
  {
    q: "How are animated GIFs on Threads saved?",
    a: "Threads delivers animated GIFs as silent, looping MP4 files. Downloadit retrieves that video stream, so the saved file loops in any standard video player instead of arriving as a .gif.",
  },
  {
    q: "Can I download every item in a Threads carousel?",
    a: "Yes. When a public post mixes videos and photos in one carousel, Downloadit lists each media item separately so you can preview and download only the ones you need.",
  },
  {
    q: "Why does a Threads link fail to download?",
    a: "The most common causes are a private author account, a deleted or moderated post, a profile URL such as threads.net/@username instead of a post URL, or a text-only post with no media. Check that the link opens a public post containing a video or image.",
  },
  {
    q: "Can I download media from private Threads profiles?",
    a: "No. Private posts require an approved follower session, and Downloadit only works with media that is publicly visible without logging in.",
  },
  {
    q: "Does Downloadit keep copies of downloaded Threads media?",
    a: "No. Downloadit does not host or archive the media you request. Files are streamed from Meta's delivery network to your browser, and we do not maintain a library of saved downloads.",
  },
  {
    q: "Do I need to install an app or browser extension?",
    a: "No. The downloader runs in a normal web browser on phones, tablets, and computers. There is no APK, desktop program, or extension to install.",
  },
  {
    q: "Does Downloadit work on desktop browsers?",
    a: "Yes. The page works in current versions of Chrome, Edge, Firefox, Safari, and Brave on Windows, macOS, and Linux.",
  },
  {
    q: "Does Downloadit support both threads.net and threads.com links?",
    a: "Yes. Links copied from the Threads app, mobile web, or desktop site work whether the URL uses the threads.net or threads.com domain.",
  },
];

const STEPS = [
  {
    step: "1",
    title: "Open the Threads application or website",
    desc: "Open the Threads app on your iOS/Android phone or navigate to threads.net or threads.com in your browser.",
  },
  {
    step: "2",
    title: "Find a public post containing a video",
    desc: "Locate the public Threads post featuring the video, photo carousel, or animated clip you wish to download.",
  },
  {
    step: "3",
    title: "Open the share menu and copy the link",
    desc: "Tap the paper airplane Share icon on the post and choose 'Copy link', or copy the URL from your browser address bar.",
  },
  {
    step: "4",
    title: "Visit Downloadit Threads Video Downloader",
    desc: "Open the Threads Downloader in any mobile or desktop web browser.",
  },
  {
    step: "5",
    title: "Paste the copied Threads link",
    desc: "Paste the copied post link into the box above.",
  },
  {
    step: "6",
    title: "Click the download button",
    desc: "Tap 'Get Media' to start processing. Downloadit resolves the public media stream from Meta's delivery network.",
  },
  {
    step: "7",
    title: "Preview available media",
    desc: "Review the generated media thumbnail and author information to ensure the correct content has been fetched.",
  },
  {
    step: "8",
    title: "Save the video to the device",
    desc: "Click 'Download' to save the high-definition MP4 file directly into your phone gallery or computer downloads.",
  },
];

const FEATURES = [
  {
    icon: Zap,
    title: "Free Online Access",
    desc: "No subscription or payment details required to use the Threads downloader.",
  },
  {
    icon: ShieldCheck,
    title: "No Account or Login Required",
    desc: "Never asks for your Meta, Instagram, or Threads credentials, passwords, or personal access tokens.",
  },
  {
    icon: Sparkles,
    title: "Simple Copy-and-Paste Workflow",
    desc: "Works with any standard public post link from threads.net or threads.com in seconds.",
  },
  {
    icon: Film,
    title: "Video Preview When Available",
    desc: "Inspect the video thumbnail and details before saving to confirm the exact media item.",
  },
  {
    icon: Layers,
    title: "Supported MP4 Downloads",
    desc: "Extracts progressive MP4 video streams compatible with every phone, tablet, and computer.",
  },
  {
    icon: ImageIcon,
    title: "Photo & Carousel Support",
    desc: "Resolves full-resolution JPEG photos and multi-image carousels in addition to videos.",
  },
  {
    icon: Smartphone,
    title: "Mobile-Friendly Interface",
    desc: "Responsive touch-optimized layout designed specifically for Android and iOS mobile web browsers.",
  },
  {
    icon: Monitor,
    title: "Desktop Compatibility",
    desc: "Full browser performance across Chrome, Edge, Safari, Firefox, and Brave on Windows and Mac.",
  },
];

const WHY_CHOOSE = [
  {
    icon: Zap,
    title: "Unified Video & Photo Resolver",
    desc: "Unlike single-purpose tools, Downloadit resolves all public media formats in a Threads post: short video clips, high-resolution photos, and full carousels.",
  },
  {
    icon: ShieldCheck,
    title: "No Added Watermark",
    desc: "We never stamp promotional branding or logos onto your downloaded files. You receive the authentic, original source stream served by Meta.",
  },
  {
    icon: Lock,
    title: "Privacy-Conscious by Design",
    desc: "No account is required, and Downloadit does not keep a library of the media you request.",
  },
  {
    icon: Repeat,
    title: "No App Installation Needed",
    desc: "Avoid questionable third-party APKs or battery-draining apps. Everything runs entirely within your existing web browser.",
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
    name: "Pinterest Image Downloader",
    href: "/pinterest-image-downloader",
    desc: "Download high-resolution Pinterest photos and carousel albums in full quality.",
  },
  {
    name: "Facebook Video Downloader",
    href: "/facebook-video-downloader",
    desc: "Download public Facebook videos, Reels, and Watch clips in HD MP4.",
  },
  {
    name: "Twitter/X Video Downloader",
    href: "/twitter-video-downloader",
    desc: "Download videos and animated GIFs from public Twitter and X posts.",
  },
];

export default function ThreadsVideoDownloaderPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "https://www.downloadit.pro/threads-video-downloader/#webpage",
        url: "https://www.downloadit.pro/threads-video-downloader",
        name: "Threads Video Downloader – Download Threads Videos in HD | Downloadit",
        description:
          "Download Threads videos online for free with Downloadit. Paste a public Threads post link, preview available media and save videos in supported MP4 quality. No login required.",
        inLanguage: "en",
        isPartOf: {
          "@id": "https://www.downloadit.pro/#website",
        },
        breadcrumb: {
          "@id": "https://www.downloadit.pro/threads-video-downloader/#breadcrumbs",
        },
      },
      {
        "@type": "WebApplication",
        "@id": "https://www.downloadit.pro/threads-video-downloader/#app",
        name: "Downloadit Threads Video Downloader",
        url: "https://www.downloadit.pro/threads-video-downloader",
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "Web Browser",
        inLanguage: "en",
        description:
          "Free online tool to preview and download public Threads videos, photos, and carousels in HD MP4 and JPEG quality without login.",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": "https://www.downloadit.pro/threads-video-downloader/#breadcrumbs",
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
            name: "Threads Video Downloader",
            item: "https://www.downloadit.pro/threads-video-downloader",
          },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": "https://www.downloadit.pro/threads-video-downloader/#faq",
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
        {/* H1 is rendered inside the ThreadsDownloader hero */}
        <ThreadsDownloader
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

          {/* H2: Download Threads Videos Online */}
          <section
            id="download-threads-videos-online"
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-primary-light text-primary">
                <Film className="h-4 w-4" />
              </span>
              <span className="text-[12px] font-bold uppercase tracking-wider text-primary">
                Online Threads Media Saver
              </span>
            </div>
            <h2 className="text-[24px] sm:text-[30px] font-extrabold tracking-tight text-fg mb-4">
              Download Threads Videos Online
            </h2>
            <div className="space-y-4 text-[14.5px] sm:text-[15.5px] leading-[1.75] text-fg-muted">
              <p>
                Meta&apos;s Threads platform has grown into a hub for conversations, trending memes, breaking news, short video clips, and creative photo essays. Threads does not offer a native download button for saving media to your device. Downloadit&apos;s <strong className="text-fg">Threads video downloader</strong> lets you save a public post&apos;s video in a few seconds, directly in your browser.
              </p>
              <p>
                The tool connects to Meta&apos;s public Content Delivery Network to request the progressive media stream without re-encoding it. You can save a Threads video for offline viewing, keep a photo post for reference, or archive an inspirational clip, and the result is a clean MP4 or full-resolution image with no Downloadit watermark.
              </p>
              <p>
                Threads does not currently offer a native download button. Downloadit gives you a simple, link-based alternative: paste a public post URL and retrieve the available media without logging in to Instagram or Threads, installing mobile apps, or working through pop-up advertisements.
              </p>
              <div className="rounded-xl border border-border/80 bg-bg/50 p-4 mt-4">
                <div className="flex items-start gap-3">
                  <Lock className="h-5 w-5 text-fg-subtle shrink-0 mt-0.5" />
                  <div className="text-[13.5px] leading-relaxed text-fg-muted">
                    <strong className="text-fg">Public Posts Only:</strong> Downloadit only resolves publicly available Threads posts. Media from private accounts or content restricted behind authenticated login sessions cannot be accessed. Please respect intellectual property rights and only save media for personal archiving or with creator permission.
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* H2: How to Download Videos from Threads */}
          <section
            id="how-to-download-videos-from-threads"
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
              How to Download Videos from Threads
            </h2>
            <p className="text-[14.5px] sm:text-[15.5px] leading-[1.75] text-fg-muted mb-6">
              Follow this clear 8-step guide to download any public Threads video or media post to your device:
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
                Helpful Tips for Threads Link Resolution
              </h3>
              <ul className="list-disc pl-5 space-y-1.5 text-[13.5px] leading-relaxed text-fg-muted">
                <li>
                  <strong className="text-fg">Threads App:</strong> Tap the paper airplane icon underneath the post and select &quot;Copy link&quot;.
                </li>
                <li>
                  <strong className="text-fg">Both Domains Supported:</strong> URLs from both <code className="text-xs bg-bg px-1 py-0.5 rounded">threads.net</code> and <code className="text-xs bg-bg px-1 py-0.5 rounded">threads.com</code> resolve smoothly.
                </li>
                <li>
                  <strong className="text-fg">Specific Post Link:</strong> Ensure you copy the direct URL of the individual post rather than a user profile page (<code className="text-xs bg-bg px-1 py-0.5 rounded">threads.net/@username</code>).
                </li>
              </ul>
            </div>
          </section>

          {/* H2: Threads Video Downloader in HD */}
          <section
            id="threads-video-downloader-in-hd"
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-primary-light text-primary">
                <Zap className="h-4 w-4" />
              </span>
              <span className="text-[12px] font-bold uppercase tracking-wider text-primary">
                Resolution &amp; Fidelity
              </span>
            </div>
            <h2 className="text-[24px] sm:text-[30px] font-extrabold tracking-tight text-fg mb-4">
              Threads Video Downloader in HD
            </h2>
            <div className="space-y-4 text-[14.5px] sm:text-[15.5px] leading-[1.75] text-fg-muted">
              <p>
                When videos are uploaded to Threads, Meta processes the file into progressive stream renditions. Downloadit inspects the renditions exposed for the post and requests the highest-resolution progressive stream available.
              </p>
              <p>
                We do not claim to upscale standard-definition videos to 4K or 1080p when the creator posted in lower quality. If the author uploads in high definition, the saved MP4 retains the clarity, colour contrast, and synchronized audio of that source rendition.
              </p>
              <p>
                The resulting quality depends on the original upload and on the stream Meta makes available for that post.
              </p>
            </div>
          </section>

          {/* H2: Threads to MP4 Converter */}
          <section
            id="threads-to-mp4-converter"
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
              Threads to MP4 Converter
            </h2>
            <div className="space-y-4 text-[14.5px] sm:text-[15.5px] leading-[1.75] text-fg-muted">
              <p>
                MP4 is universally recognized as the most compatible video format across modern devices and platforms. Through our <strong className="text-fg">threads to mp4</strong> downloader, videos saved from Threads are packaged in standard MP4 containers with H.264 video encoding and AAC audio.
              </p>
              <p>
                This ensures that your <strong className="text-fg">threads video mp4 download</strong> plays natively on iPhone, iPad, Android smartphones, Windows PCs, Mac computers, smart TVs, and video editing suites without requiring specialized media player software or format transcoder tools.
              </p>
            </div>
          </section>

          {/* H2: Threads Photo Downloader */}
          <section
            id="threads-photo-downloader"
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-primary-light text-primary">
                <ImageIcon className="h-4 w-4" />
              </span>
              <span className="text-[12px] font-bold uppercase tracking-wider text-primary">
                Image &amp; Carousel Support
              </span>
            </div>
            <h2 className="text-[24px] sm:text-[30px] font-extrabold tracking-tight text-fg mb-4">
              Threads Photo Downloader
            </h2>
            <div className="space-y-4 text-[14.5px] sm:text-[15.5px] leading-[1.75] text-fg-muted">
              <p>
                Threads is not limited to text and video — creators regularly publish stunning photography, infographics, comic strips, and multi-picture carousels. Downloadit is a comprehensive <strong className="text-fg">threads photo downloader</strong> that detects and resolves static image posts seamlessly.
              </p>
              <p>
                When a post includes images, our system extracts the original full-resolution JPEG files directly from Meta&apos;s servers. You can easily <strong className="text-fg">download threads images</strong> and carousels at their maximum published dimensions without the compression or resolution loss typical of mobile screenshots.
              </p>
            </div>
          </section>

          {/* H2: Threads GIF Downloader */}
          <section
            id="threads-gif-downloader"
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-primary-light text-primary">
                <Repeat className="h-4 w-4" />
              </span>
              <span className="text-[12px] font-bold uppercase tracking-wider text-primary">
                Animated Clip Support
              </span>
            </div>
            <h2 className="text-[24px] sm:text-[30px] font-extrabold tracking-tight text-fg mb-4">
              Threads GIF Downloader
            </h2>
            <div className="space-y-4 text-[14.5px] sm:text-[15.5px] leading-[1.75] text-fg-muted">
              <p>
                Animated GIFs on Threads are encoded and served as lightweight looping MP4 video files without audio tracks. This modern technique ensures fast loading and smooth playback across all screen sizes.
              </p>
              <p>
                Downloadit acts as a fast <strong className="text-fg">threads gif downloader</strong>. When you paste the link of a post containing an animated GIF, our engine detects the looping video stream and provides a direct download link. You can easily <strong className="text-fg">download threads gif</strong> files for sharing on WhatsApp, Telegram, Discord, or saving to your meme archive.
              </p>
            </div>
          </section>

          {/* H2: Threads Video Downloader for Mobile */}
          <section
            id="threads-video-downloader-for-mobile"
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-primary-light text-primary">
                <Smartphone className="h-4 w-4" />
              </span>
              <span className="text-[12px] font-bold uppercase tracking-wider text-primary">
                Mobile &amp; Tablet
              </span>
            </div>
            <h2 className="text-[24px] sm:text-[30px] font-extrabold tracking-tight text-fg mb-4">
              Threads Video Downloader for Mobile
            </h2>
            <div className="space-y-4 text-[14.5px] sm:text-[15.5px] leading-[1.75] text-fg-muted">
              <p>
                Because Threads is primarily a mobile-first social experience, Downloadit has been designed from the ground up for smartphone browsers. With our <strong className="text-fg">threads video downloader mobile</strong>, you never have to install questionable third-party APKs or battery-draining apps.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
                <div className="rounded-xl border border-border/80 bg-bg/50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Smartphone className="h-4 w-4 text-primary" />
                    <h3 className="text-[15px] font-bold text-fg">Threads Video Downloader Android</h3>
                  </div>
                  <p className="text-[13px] leading-relaxed text-fg-muted">
                    Works seamlessly with Google Chrome, Mozilla Firefox, and Samsung Internet. Downloaded MP4 files save directly to your Android &quot;Downloads&quot; folder and immediately appear in Google Photos or your default Gallery app.
                  </p>
                </div>
                <div className="rounded-xl border border-border/80 bg-bg/50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Smartphone className="h-4 w-4 text-accent" />
                    <h3 className="text-[15px] font-bold text-fg">Threads Video Downloader iPhone (iOS)</h3>
                  </div>
                  <p className="text-[13px] leading-relaxed text-fg-muted">
                    Fully optimized for Apple Safari and Chrome on iOS 13+. Download the video directly into Safari Downloads, open the file, tap Share, and select &quot;Save Video&quot; to place the MP4 directly into your Photos camera roll.
                  </p>
                </div>
              </div>
              <p>
                Downloadit gives you an app-free path to saving Threads media straight to your phone, whether the post contains a video, a photo, or a mixed carousel.
              </p>
            </div>
          </section>

          {/* H2: Threads Video Downloader for PC */}
          <section
            id="threads-video-downloader-for-pc"
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
              Threads Video Downloader for PC
            </h2>
            <div className="space-y-4 text-[14.5px] sm:text-[15.5px] leading-[1.75] text-fg-muted">
              <p>
                Using a desktop browser to save Threads videos is fast and efficient. Our <strong className="text-fg">threads video downloader for pc</strong> requires zero software installations, browser extensions, or command-line scripts.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
                <div className="rounded-xl border border-border/80 bg-bg/50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Monitor className="h-4 w-4 text-primary" />
                    <h3 className="text-[15px] font-bold text-fg">Windows PC Compatibility</h3>
                  </div>
                  <p className="text-[13px] leading-relaxed text-fg-muted">
                    Compatible with Google Chrome, Microsoft Edge, Mozilla Firefox, and Brave on Windows 10 and 11. Downloaded media lands directly in your Windows Downloads folder for immediate viewing.
                  </p>
                </div>
                <div className="rounded-xl border border-border/80 bg-bg/50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Monitor className="h-4 w-4 text-accent" />
                    <h3 className="text-[15px] font-bold text-fg">macOS (Mac) Compatibility</h3>
                  </div>
                  <p className="text-[13px] leading-relaxed text-fg-muted">
                    Native compatibility with Apple Safari, Google Chrome, and Arc on macOS. Save progressive MP4 files and JPEG images directly to Finder with full QuickTime playback and AirDrop support.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* H2: Features of Downloadit Threads Downloader */}
          <section
            id="features-of-downloadit-threads-downloader"
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
              Features of Downloadit Threads Downloader
            </h2>
            <p className="text-[14.5px] sm:text-[15.5px] leading-[1.75] text-fg-muted mb-6">
              Downloadit is built around simplicity, performance, and user safety. Here are the core features of our Threads downloader:
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
                Our Advantage
              </span>
            </div>
            <h2 className="text-[24px] sm:text-[30px] font-extrabold tracking-tight text-fg mb-4">
              Why Use Downloadit?
            </h2>
            <div className="space-y-4 text-[14.5px] sm:text-[15.5px] leading-[1.75] text-fg-muted">
              <p>
                In a web crowded with ad-heavy downloader websites and deceptive download banners, Downloadit prioritizes user security, speed, and privacy. We do not inject watermarks, alter video quality, or force users to complete verification surveys.
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
                When you paste a public Threads post link, you receive the direct media stream served by Meta&apos;s delivery servers — cleanly, quickly, and completely free.
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
                Common Questions
              </span>
            </div>
            <h2 className="text-[24px] sm:text-[30px] font-extrabold tracking-tight text-fg mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-[14.5px] sm:text-[15.5px] leading-[1.75] text-fg-muted mb-6">
              Find transparent, accurate answers to the most common questions regarding our Threads video and photo downloader:
            </p>

            <div className="space-y-3">
              {FAQS.map((faq, idx) => (
                <details
                  key={faq.q}
                  name="threads-faq"
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
              Need to save videos or media from other social networks? Downloadit offers dedicated tools for all major platforms:
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
