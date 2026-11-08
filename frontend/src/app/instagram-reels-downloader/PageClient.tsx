"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import ToolDownloader from "@/components/ToolDownloader";
import DownloaderContentLayout from "@/components/DownloaderContentLayout";
import { TOOL_PAGES } from "@/config/toolPages";
import { CheckCircle2, AlertTriangle } from "lucide-react";

const PAGE = TOOL_PAGES.instagramReels;

const FAQS = [
  {
    q: "Why does a reel I can watch say it is private here?",
    a: "Because watching and fetching are checked differently. You watch while logged in, possibly as a follower. Downloadit checks the reel the way a stranger with no account would see it. If it needs a login or a follow, it is treated as private.",
  },
  {
    q: "My friend sent me a reel in a chat. Can I save that?",
    a: "Yes, if the reel itself is public. Open the reel so it loads in Instagram, then use Share and Copy link to get the full URL. Links that get cut off inside some chat apps fail, so copying it fresh from the app is the reliable way.",
  },
  {
    q: "Will the saved reel look exactly like it does on Instagram?",
    a: "Yes. You get the same vertical MP4 Instagram streams to your phone, with the picture, edits, on-screen text and mixed-in sound exactly as posted. Nothing is stamped over it and nothing is re-compressed.",
  },
  {
    q: "Where do reels go on an iPhone after downloading?",
    a: "Safari puts them in the Files app under Downloads, not directly in the Photos gallery. Open Files, then Downloads, and you will find the MP4 there. From there you can play it, move it to Photos, or share it to another app.",
  },
  {
    q: "Can I save a reel to watch on a flight with no signal?",
    a: "That is one of the main reasons people use this page. Download the MP4 while you have Wi-Fi and it plays offline afterwards in any video player, since the whole file sits on your device.",
  },
  {
    q: "Does saving a reel notify the person who posted it?",
    a: "No. Downloadit resolves the public file without logging in and without interacting with the account. Instagram does not show the poster who saved or downloaded their public reel through this page.",
  },
];

export default function ReelsDownloaderPageClient() {
  return (
    <>
      <Header />
      <main id="main-content" className="flex-1">
        <Breadcrumb items={[{ name: "Home", path: "/" }, { name: PAGE.name, path: PAGE.path }]} />
        <ToolDownloader page={PAGE} />

        <DownloaderContentLayout
          supportedFeatures={
            <>
              <div>
                <h3 className="text-[20px] font-bold text-fg mb-3">Supported Formats &amp; Quality</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-border bg-card p-4">
                    <span className="block text-[14px] font-bold text-primary">Vertical 9:16 MP4</span>
                    <span className="block text-[12px] text-fg-subtle mt-1">Full-screen mobile video aspect ratio</span>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4">
                    <span className="block text-[14px] font-bold text-primary">Stereo Audio (AAC)</span>
                    <span className="block text-[12px] text-fg-subtle mt-1">Original mixed-in music and speech tracks</span>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4">
                    <span className="block text-[14px] font-bold text-primary">High Bitrate 1080p</span>
                    <span className="block text-[12px] text-fg-subtle mt-1">Highest resolution supplied by Instagram</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-[20px] font-bold text-fg mb-4">Features &amp; Benefits</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { title: "No Watermark Stamped", desc: "Clean reels without app logos, account stamps, or overlays." },
                    { title: "Original Frame Rate", desc: "Fluid 30fps and 60fps playback matching the creator's upload." },
                    { title: "Fast Streaming Direct", desc: "Direct download links directly from edge CDNs for max download speeds." },
                    { title: "Free & Unlimited", desc: "Download as many reels as you need with zero daily quotas." },
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
            </>
          }
          howToUse={
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
              <h3 className="text-[20px] font-bold text-fg mb-4">How to Download Instagram Reels, Step by Step</h3>

              <div className="space-y-6">
                <div>
                  <h4 className="text-[16px] font-bold text-primary-strong mb-2">On Android</h4>
                  <ol className="list-decimal pl-5 space-y-2 text-[14.5px] leading-[1.7] text-fg-muted">
                    <li>Open Instagram, find the Reel you want to save, and tap the <strong className="text-fg">Share</strong> icon.</li>
                    <li>Tap <strong className="text-fg">Copy link</strong>.</li>
                    <li>Open Downloadit in Chrome or any browser, paste the link in the input field above, and click <strong className="text-fg">Get Reel</strong>.</li>
                    <li>Preview the reel and click <strong className="text-fg">Download</strong> to save the MP4 to your gallery.</li>
                  </ol>
                </div>

                <div>
                  <h4 className="text-[16px] font-bold text-primary-strong mb-2">On iPhone &amp; iPad</h4>
                  <ol className="list-decimal pl-5 space-y-2 text-[14.5px] leading-[1.7] text-fg-muted">
                    <li>In the Instagram app, tap the three dots or Share button on the Reel and tap <strong className="text-fg">Copy link</strong>.</li>
                    <li>Open <strong className="text-fg">Safari</strong>, paste the URL into Downloadit, and tap <strong className="text-fg">Get Reel</strong>.</li>
                    <li>Tap <strong className="text-fg">Download</strong> and confirm the Safari download prompt. The video is saved into your Files app.</li>
                  </ol>
                </div>

                <div>
                  <h4 className="text-[16px] font-bold text-primary-strong mb-2">On Desktop</h4>
                  <ol className="list-decimal pl-5 space-y-2 text-[14.5px] leading-[1.7] text-fg-muted">
                    <li>Copy the URL from your browser address bar while viewing the Reel on instagram.com.</li>
                    <li>Paste the URL into Downloadit and click <strong className="text-fg">Get Reel</strong>.</li>
                    <li>Click <strong className="text-fg">Download</strong> to save the MP4 video directly to your computer.</li>
                  </ol>
                </div>
              </div>
            </div>
          }
          educationalContent={
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-[20px] font-bold text-fg mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Troubleshooting Reel Downloads
              </h3>
              <div className="space-y-3 text-[14.5px] leading-[1.7] text-fg-muted">
                <p>
                  <strong className="text-fg">Private Account Reels:</strong> If a creator has set their account to private, logged-out users and tools cannot access the media. Downloadit only downloads public Reels.
                </p>
                <p>
                  <strong className="text-fg">Audio-Only Reels or Removed Sounds:</strong> If a creator or copyright owner removes an audio track, Instagram silences the reel on their CDN. Downloadit delivers the exact video track stored by Instagram.
                </p>
              </div>
            </div>
          }
          whatItDoes={
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6">
              <h2 className="text-[24px] font-bold tracking-tight text-fg sm:text-[30px] leading-[1.25]">
                What the Reels Downloader Does
              </h2>

              <div>
                <h3 className="text-[20px] font-bold text-fg mb-3">What is an Instagram Reels Downloader?</h3>
                <p className="text-[15px] sm:text-[16px] leading-[1.75] text-fg-muted">
                  An Instagram Reels Downloader is a specialized web tool built to download vertical 9:16 short-form video clips from Instagram to your device as standard MP4 video files. It saves the original audio, visuals, and timing without adding watermarks or reducing video resolution.
                </p>
              </div>

              <div>
                <h3 className="text-[20px] font-bold text-fg mb-3">How Does It Work?</h3>
                <p className="text-[15px] sm:text-[16px] leading-[1.75] text-fg-muted">
                  Instagram hosts public Reels on globally distributed content delivery networks. When you paste a Reel URL (<code className="text-xs bg-bg px-1.5 py-0.5 rounded">instagram.com/reel/...</code>), Downloadit resolves the master MP4 media stream from the page metadata and provides a direct, one-click download link.
                </p>
              </div>
            </div>
          }
          faqs={
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
          }
          relatedDownloaders={
            <div className="pt-4">
              <h3 className="text-[20px] font-bold text-fg mb-4">Related Downloaders</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { href: "/instagram-video-downloader", label: "Instagram Video Downloader", desc: "Download regular Instagram feed videos" },
                  { href: "/instagram-photo-downloader", label: "Instagram Photo Downloader", desc: "Download full-res photos and carousels" },
                  { href: "/instagram-story-downloader", label: "Instagram Story Downloader", desc: "Save active 24-hour stories" },
                  { href: "/instagram-audio-downloader", label: "Instagram Audio Downloader", desc: "Extract background music & audio MP3" },
                  { href: "/youtube-video-downloader", label: "YouTube Shorts Downloader", desc: "Download YouTube Shorts & videos" },
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
          }
        />
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
