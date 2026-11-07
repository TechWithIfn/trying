"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import ToolDownloader from "@/components/ToolDownloader";
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
            What the Reels Downloader Does
          </h2>

          <div className="mt-6 space-y-8 text-fg">
            <div>
              <h3 className="text-[20px] font-bold text-fg mb-3">What is an Instagram Reels Downloader?</h3>
              <p className="text-[15px] sm:text-[16px] leading-[1.75] text-fg-muted">
                An Instagram Reels Downloader is a specialized web tool built to download vertical 9:16 short-form video clips from Instagram to your device as standard MP4 video files. It saves the original audio, visuals, and timing without adding watermarks or reducing video resolution.
              </p>
            </div>

            <div>
              <h3 className="text-[20px] font-bold text-fg mb-3">How Does It Work?</h3>
              <p className="text-[15px] sm:text-[16px] leading-[1.75] text-fg-muted">
                When a creator publishes a Reel publicly, Instagram distributes the clip across global media servers. By copying the link to the Reel and pasting it into Downloadit, our engine locates the progressive media stream and provides a direct download link that saves the complete video file onto your smartphone, tablet, or desktop computer.
              </p>
            </div>

            <div>
              <h3 className="text-[20px] font-bold text-fg mb-3">Supported Formats &amp; Quality</h3>
              <p className="text-[15px] sm:text-[16px] leading-[1.75] text-fg-muted mb-3">
                Downloadit preserves the exact quality that Instagram serves to viewers:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-border bg-card p-4">
                  <span className="block text-[14px] font-bold text-primary">Original 1080p / 720p</span>
                  <span className="block text-[12px] text-fg-subtle mt-1">High-definition vertical format (1080x1920)</span>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <span className="block text-[14px] font-bold text-primary">MP4 Container</span>
                  <span className="block text-[12px] text-fg-subtle mt-1">Universal video format playing on any modern device</span>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <span className="block text-[14px] font-bold text-primary">Synchronized Audio</span>
                  <span className="block text-[12px] text-fg-subtle mt-1">Full soundtrack and vocal track merged seamlessly</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
              <h3 className="text-[20px] font-bold text-fg mb-4">How to Download Instagram Reels, Step by Step</h3>

              <div className="space-y-6">
                <div>
                  <h4 className="text-[16px] font-bold text-primary-strong mb-2">On Android</h4>
                  <ol className="list-decimal pl-5 space-y-2 text-[14.5px] leading-[1.7] text-fg-muted">
                    <li>Open Instagram and scroll to the Reel you want to save.</li>
                    <li>Tap the <strong className="text-fg">Share</strong> icon (the paper airplane) on the right side.</li>
                    <li>Tap <strong className="text-fg">Copy Link</strong>.</li>
                    <li>Open Downloadit in your browser, paste the link into the URL field, and tap <strong className="text-fg">Download Reel</strong>.</li>
                    <li>Confirm the preview and tap <strong className="text-fg">Download</strong> to save the MP4 into your Downloads.</li>
                  </ol>
                </div>

                <div>
                  <h4 className="text-[16px] font-bold text-primary-strong mb-2">On iPhone &amp; iPad</h4>
                  <ol className="list-decimal pl-5 space-y-2 text-[14.5px] leading-[1.7] text-fg-muted">
                    <li>Open the Instagram app and tap the Share button on the Reel.</li>
                    <li>Select <strong className="text-fg">Copy Link</strong> from the sharing options.</li>
                    <li>Launch <strong className="text-fg">Safari</strong>, paste the link above, and tap <strong className="text-fg">Download Reel</strong>.</li>
                    <li>Preview the clip, tap <strong className="text-fg">Download</strong>, and accept the download dialog.</li>
                    <li>Access your saved video anytime inside the <strong className="text-fg">Files</strong> app under Downloads.</li>
                  </ol>
                </div>

                <div>
                  <h4 className="text-[16px] font-bold text-primary-strong mb-2">On Desktop</h4>
                  <ol className="list-decimal pl-5 space-y-2 text-[14.5px] leading-[1.7] text-fg-muted">
                    <li>Open the Reel in your desktop browser and copy the address from your browser bar.</li>
                    <li>Paste the address into Downloadit and click <strong className="text-fg">Download Reel</strong>.</li>
                    <li>Preview the Reel and click <strong className="text-fg">Download</strong> to save the MP4 directly to your PC or Mac.</li>
                  </ol>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-[20px] font-bold text-fg mb-4">Features &amp; Benefits</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { title: "No Watermark Stamped", desc: "Keep the original video clean without forced stamps, handles, or overlays." },
                  { title: "Full Original Audio", desc: "Music and original audio tracks are preserved with perfect lip-sync." },
                  { title: "Lightning Fast Extraction", desc: "Real-time SSE streaming delivers media previews in a split second." },
                  { title: "Completely Anonymous", desc: "No login, no cookies stored, and no notifications sent to the creator." },
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
                Troubleshooting Reel Downloads
              </h3>
              <div className="space-y-3 text-[14.5px] leading-[1.7] text-fg-muted">
                <p>
                  <strong className="text-fg">Private Account Reels:</strong> If a creator has a private account, Instagram restricts their Reels strictly to approved followers. These clips cannot be retrieved anonymously.
                </p>
                <p>
                  <strong className="text-fg">Audio-Restricted Reels:</strong> In rare cases, third-party music publishers mute or restrict licensed music in specific geographic areas. The video will still download, but the music track may reflect Instagram&apos;s regional restrictions.
                </p>
                <p>
                  <strong className="text-fg">Stale Links:</strong> Instagram expires direct media links after a few hours. If your download stalls, paste the original post link again to generate fresh streaming tokens.
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
                  { href: "/instagram-video-downloader", label: "Instagram Video Downloader", desc: "Save longer feed videos" },
                  { href: "/instagram-photo-downloader", label: "Instagram Photo Downloader", desc: "Download photos and carousels" },
                  { href: "/instagram-story-downloader", label: "Instagram Story Downloader", desc: "Save stories before they expire" },
                  { href: "/instagram-audio-downloader", label: "Instagram Audio Downloader", desc: "Extract Reel sound as MP3" },
                  { href: "/pinterest-video-downloader", label: "Pinterest Video Downloader", desc: "Download Pinterest videos" },
                  { href: "/youtube-video-downloader", label: "YouTube Video Downloader", desc: "Download YouTube Shorts & videos" },
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
