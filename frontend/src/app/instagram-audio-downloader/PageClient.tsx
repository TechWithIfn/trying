"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import ToolDownloader from "@/components/ToolDownloader";
import { TOOL_PAGES } from "@/config/toolPages";
import { CheckCircle2, AlertTriangle, Music } from "lucide-react";

const PAGE = TOOL_PAGES.instagramAudio;

const FAQS = [
  {
    q: "What format does the extracted audio download in?",
    a: "Audio is extracted and delivered as a high-fidelity MP3 file (or AAC stream where applicable) that plays in any standard music player, smartphone, or audio editing software.",
  },
  {
    q: "Can I download audio from any Instagram Reel or Video?",
    a: "Yes, as long as the Reel or video is hosted on a public profile and contains an audio track.",
  },
  {
    q: "Can I extract audio from Instagram photos or carousels?",
    a: "Photos and still carousels do not contain audio tracks. However, carousel slides that are video clips can have their audio extracted.",
  },
  {
    q: "Is there any loss of sound quality during extraction?",
    a: "No. The audio stream is extracted directly at the maximum bitrate provided by the source clip without adding noise or downsampling.",
  },
];

export default function AudioDownloaderPageClient() {
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
            What the Audio Downloader Does
          </h2>

          <div className="mt-6 space-y-8 text-fg">
            <div>
              <h3 className="text-[20px] font-bold text-fg mb-3">What is an Audio Downloader?</h3>
              <p className="text-[15px] sm:text-[16px] leading-[1.75] text-fg-muted">
                An Instagram Audio Downloader is a dedicated tool that extracts audio tracks, music, voiceovers, podcasts, and speeches from public Instagram Reels and videos, saving them as standalone MP3 files onto your device.
              </p>
            </div>

            <div>
              <h3 className="text-[20px] font-bold text-fg mb-3">How Does It Work?</h3>
              <p className="text-[15px] sm:text-[16px] leading-[1.75] text-fg-muted">
                When you paste a Reel or video URL, Downloadit inspects the post&apos;s audio channels, decouples the audio track from the video stream, and packages it into an MP3 file ready for immediate offline listening or audio production.
              </p>
            </div>

            <div>
              <h3 className="text-[20px] font-bold text-fg mb-3 flex items-center gap-2">
                <Music className="h-5 w-5 text-primary" />
                Audio Quality &amp; Compatibility
              </h3>
              <p className="text-[15px] sm:text-[16px] leading-[1.75] text-fg-muted">
                All audio tracks are saved with original sample rates and stereo separation. The resulting MP3 is universally compatible with Spotify local files, Apple Music, VLC, car audio systems, and digital audio workstations (DAWs).
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
              <h3 className="text-[20px] font-bold text-fg mb-4">How to Extract Audio from Instagram, Step by Step</h3>

              <div className="space-y-6">
                <div>
                  <h4 className="text-[16px] font-bold text-primary-strong mb-2">On Any Mobile or Desktop Browser</h4>
                  <ol className="list-decimal pl-5 space-y-2 text-[14.5px] leading-[1.7] text-fg-muted">
                    <li>Find the public Reel or video with the soundtrack or speech you want to keep.</li>
                    <li>Copy its link using the <strong className="text-fg">Share</strong> button.</li>
                    <li>Paste the link into the box above and tap <strong className="text-fg">Extract Audio</strong>.</li>
                    <li>Preview the sound waveform or player, tap <strong className="text-fg">Download MP3</strong>, and save the audio file.</li>
                  </ol>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-[20px] font-bold text-fg mb-4">Features &amp; Benefits</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { title: "Direct MP3 Delivery", desc: "No second conversion step needed. Download ready-to-play MP3 audio." },
                  { title: "Saves Storage Space", desc: "MP3 files are 90% smaller than full video files, saving valuable phone memory." },
                  { title: "Clean Metadata", desc: "Proper track naming derived from post title or author handle." },
                  { title: "No Sign-In Required", desc: "Extract sound clips completely anonymously with zero account creation." },
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
                Troubleshooting Audio Downloads
              </h3>
              <div className="space-y-3 text-[14.5px] leading-[1.7] text-fg-muted">
                <p>
                  <strong className="text-fg">Muted or Silent Reels:</strong> Some creators post video clips without audio or with copyright-restricted soundtracks that Instagram mutes. If a video has no audio on Instagram, no sound can be extracted.
                </p>
                <p>
                  <strong className="text-fg">Photo Posts:</strong> Static photos and photo carousels do not contain audio tracks. Make sure your link points to a video or Reel.
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
                  { href: "/instagram-reels-downloader", label: "Instagram Reels Downloader", desc: "Download public vertical Reels" },
                  { href: "/instagram-video-downloader", label: "Instagram Video Downloader", desc: "Save longer Instagram video clips" },
                  { href: "/youtube-video-downloader", label: "YouTube Downloader", desc: "Download YouTube videos and audio" },
                  { href: "/", label: "All Downloaders", desc: "Downloadit home downloader" },
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
