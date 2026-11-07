"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import YouTubeDownloader from "@/components/YouTubeDownloader";
import { TOOL_PAGES } from "@/config/toolPages";
import { CheckCircle2, AlertTriangle } from "lucide-react";

const PAGE = TOOL_PAGES.youtubeVideo;

const FAQS = [
  {
    q: "How do I download YouTube Shorts?",
    a: "Open the YouTube Short on mobile or desktop, tap Share, and select 'Copy link'. Paste that link into the URL box above and click 'Get Video'. Downloadit identifies the vertical video and lets you save it as an MP4.",
  },
  {
    q: "Which video qualities are available?",
    a: "Downloadit offers all real resolutions provided by the source video, including 1080p Full HD, 720p HD, 480p, and 360p. We never invent fake 4K or 8K options when the underlying YouTube stream only exists in 1080p.",
  },
  {
    q: "Does audio downloading work for YouTube videos?",
    a: "Yes. You can extract crystal-clear audio tracks as standalone MP3 or M4A files at bitrates up to 320 kbps for podcasts, speeches, and offline audio listening.",
  },
  {
    q: "Can I download private or age-restricted YouTube videos?",
    a: "No. Videos requiring user authentication, age confirmation, or YouTube Premium membership cannot be downloaded anonymously.",
  },
  {
    q: "Do I need to install any software or extensions?",
    a: "None whatsoever. Downloadit is completely web-based and runs in any modern browser on iPhone, Android, Windows, Mac, and Chromebooks.",
  },
];

export default function YouTubeVideoPageClient() {
  return (
    <>
      <Header />
      <main id="main-content" className="flex-1">
        <Breadcrumb items={[{ name: "Home", path: "/" }, { name: PAGE.name, path: PAGE.path }]} />
        <YouTubeDownloader
          titleA={PAGE.titleA}
          titleB={PAGE.titleB}
          subtitle={PAGE.description}
          badge={PAGE.badge}
          placeholder={PAGE.placeholder}
          buttonLabel={PAGE.buttonLabel}
          benefits={PAGE.trust}
        />

        <section className="mx-auto max-w-[920px] px-5 sm:px-6 lg:px-12 pt-2 pb-16 sm:pt-4">
          <div className="mb-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-fg-subtle transition-colors hover:text-primary"
            >
              <span aria-hidden="true">←</span>
              <span>Back to Home Downloader</span>
            </Link>
          </div>

          <h2 className="text-[24px] font-bold tracking-tight text-fg sm:text-[30px] leading-[1.25]">
            What the YouTube Video Downloader Does
          </h2>

          <div className="mt-6 space-y-8 text-fg">
            <div>
              <h3 className="text-[20px] font-bold text-fg mb-3">What is a YouTube Video Downloader?</h3>
              <p className="text-[15px] sm:text-[16px] leading-[1.75] text-fg-muted">
                A YouTube Video Downloader is a high-speed web utility that allows you to download public YouTube videos, viral Shorts, and audio tracks to your computer or phone as playable MP4 or MP3 files. It lets you enjoy your favorite lectures, tutorials, and music offline without internet buffering or ads.
              </p>
            </div>

            <div>
              <h3 className="text-[20px] font-bold text-fg mb-3">How Does It Work?</h3>
              <p className="text-[15px] sm:text-[16px] leading-[1.75] text-fg-muted">
                When you paste a YouTube link, Downloadit analyzes the video metadata via our robust server backend, queries YouTube&apos;s available DASH and progressive media streams, and merges high-resolution video with AAC audio into a clean MP4 file ready for download.
              </p>
            </div>

            <div>
              <h3 className="text-[20px] font-bold text-fg mb-3">Supported Media Formats &amp; Resolutions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-border bg-card p-4">
                  <span className="block text-[14px] font-bold text-primary">MP4 Video</span>
                  <span className="block text-[12px] text-fg-subtle mt-1">1080p, 720p, 480p, and 360p resolutions</span>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <span className="block text-[14px] font-bold text-primary">YouTube Shorts</span>
                  <span className="block text-[12px] text-fg-subtle mt-1">Full 9:16 vertical clips with original sound</span>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <span className="block text-[14px] font-bold text-primary">MP3 / M4A Audio</span>
                  <span className="block text-[12px] text-fg-subtle mt-1">High-bitrate audio tracks for music &amp; talks</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
              <h3 className="text-[20px] font-bold text-fg mb-4">How to Download YouTube Videos, Step by Step</h3>

              <div className="space-y-6">
                <div>
                  <h4 className="text-[16px] font-bold text-primary-strong mb-2">On Android, iPhone, &amp; Desktop</h4>
                  <ol className="list-decimal pl-5 space-y-2 text-[14.5px] leading-[1.7] text-fg-muted">
                    <li>Open the YouTube video or Short and copy its link (via <strong className="text-fg">Share → Copy link</strong> or from the browser address bar).</li>
                    <li>Paste the link into Downloadit above and tap <strong className="text-fg">Get Video</strong>.</li>
                    <li>Verify the video title and choose your preferred format: <strong className="text-fg">MP4 Video (e.g. 1080p)</strong> or <strong className="text-fg">MP3 Audio</strong>.</li>
                    <li>Click <strong className="text-fg">Download</strong> to save the file directly to your device.</li>
                  </ol>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-[20px] font-bold text-fg mb-4">Features &amp; Benefits</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { title: "No Watermarks or Overlays", desc: "Enjoy clean video without promotional branding or altered pixels." },
                  { title: "Shorts & Standard Videos", desc: "Seamlessly handles youtube.com/watch, youtu.be, and youtube.com/shorts URLs." },
                  { title: "Audio Extraction Included", desc: "Easily extract high-quality MP3 sound without needing separate audio tools." },
                  { title: "Private & Free", desc: "No registration, no tracking cookies, and no download limits." },
                ].map((item) => (
                  <div key={item.title} className="flex gap-3 rounded-xl border border-border/80 bg-card p-4">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                    <div>
                      <h4 className="text-[14.5px] font-bold text-fg">{item.title}</h4>
                      <p className="text-[13px] text-fg-muted mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-[20px] font-bold text-fg mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Troubleshooting YouTube Downloads
              </h3>
              <div className="space-y-3 text-[14.5px] leading-[1.7] text-fg-muted">
                <p>
                  <strong className="text-fg">Private &amp; Age-Restricted Videos:</strong> Videos that require YouTube account login or age verification cannot be accessed by public downloader servers.
                </p>
                <p>
                  <strong className="text-fg">Live Streams:</strong> Active live broadcasts cannot be saved until the streamer completes the broadcast and YouTube processes the final VOD archive.
                </p>
              </div>
            </div>

            <div className="pt-4">
              <h3 className="text-[22px] font-bold text-fg mb-4">Frequently Asked Questions</h3>
              <div className="space-y-3">
                {FAQS.map((item) => (
                  <div key={item.q} className="rounded-xl border border-border bg-card p-4 sm:p-5">
                    <h4 className="text-[15.5px] font-bold text-fg mb-2">{item.q}</h4>
                    <p className="text-[14px] leading-relaxed text-fg-muted">{item.a}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4">
              <h3 className="text-[20px] font-bold text-fg mb-4">Related Downloaders</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { href: "/instagram-video-downloader", label: "Instagram Downloader", desc: "Download Instagram Reels & videos" },
                  { href: "/facebook-video-downloader", label: "Facebook Downloader", desc: "Download Facebook feed & Watch videos" },
                  { href: "/twitter-video-downloader", label: "Twitter/X Downloader", desc: "Download Twitter videos & GIFs" },
                  { href: "/pinterest-video-downloader", label: "Pinterest Downloader", desc: "Save Pinterest video pins" },
                  { href: "/threads-video-downloader", label: "Threads Downloader", desc: "Download Threads videos & photos" },
                  { href: "/", label: "All Downloaders", desc: "Downloadit multi-platform home" },
                ].map((tool) => (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    className="flex flex-col rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:bg-primary-light/40"
                  >
                    <span className="text-[14px] font-bold text-primary">{tool.label}</span>
                    <span className="text-[12px] text-fg-subtle mt-0.5">{tool.desc}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQS.map((item) => ({
              "@type": "Question",
              name: item.q,
              acceptedAnswer: { "@type": "Answer", text: item.a },
            })),
          }),
        }}
      />
    </>
  );
}
