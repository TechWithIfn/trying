"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import PinterestDownloader from "@/components/PinterestDownloader";
import { TOOL_PAGES } from "@/config/toolPages";
import { CheckCircle2, AlertTriangle } from "lucide-react";

const PAGE = TOOL_PAGES.pinterestVideo;

const FAQS = [
  {
    q: "How do I download Pinterest videos?",
    a: "Open the Pinterest video pin, tap the share icon, and select 'Copy link'. Paste the link into the URL field on this page and click 'Download Pin'. Once the preview appears, tap Download to save the MP4 to your phone or computer.",
  },
  {
    q: "Does Downloadit support Pinterest Idea Pins?",
    a: "Yes. Many Idea pins contain video clips and animations. As long as the pin is publicly viewable without a login, Downloadit will extract the available MP4 video stream.",
  },
  {
    q: "Can I download Pinterest images from here?",
    a: "Yes, our Pinterest resolver automatically detects whether your pin is an image or video. You can also use our dedicated Pinterest Image & Carousel Downloader for high-resolution picture boards.",
  },
  {
    q: "Are the downloaded Pinterest videos watermarked?",
    a: "No. Downloadit extracts the original MP4 file directly from Pinterest's media delivery servers without stamping watermarks or altering the audio.",
  },
  {
    q: "Does Downloadit support Pinterest boards or secret pins?",
    a: "Downloadit only works with individual public pins. Secret boards, group boards requiring invites, and private pins cannot be accessed.",
  },
];

export default function PinterestVideoPageClient() {
  return (
    <>
      <Header />
      <main id="main-content" className="flex-1">
        <Breadcrumb items={[{ name: "Home", path: "/" }, { name: PAGE.name, path: PAGE.path }]} />
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
            What the Pinterest Video Downloader Does
          </h2>

          <div className="mt-6 space-y-8 text-fg">
            <div>
              <h3 className="text-[20px] font-bold text-fg mb-3">What is a Pinterest Video Downloader?</h3>
              <p className="text-[15px] sm:text-[16px] leading-[1.75] text-fg-muted">
                A Pinterest Video Downloader is a web application that enables you to save publicly accessible Pinterest video pins, DIY tutorials, recipe clips, and Idea pins directly to your device as high-definition MP4 video files with audio.
              </p>
            </div>

            <div>
              <h3 className="text-[20px] font-bold text-fg mb-3">How Does It Work?</h3>
              <p className="text-[15px] sm:text-[16px] leading-[1.75] text-fg-muted">
                Pinterest hosts media using short URLs (<code className="text-xs bg-bg px-1.5 py-0.5 rounded">pin.it</code>) and standard web links (<code className="text-xs bg-bg px-1.5 py-0.5 rounded">pinterest.com/pin/...</code>). Downloadit expands and validates the pin URL, parses the HTML metadata for the master progressive video stream, and gives you a direct download link.
              </p>
            </div>

            <div>
              <h3 className="text-[20px] font-bold text-fg mb-3">What Types of Pinterest Media Can Be Downloaded?</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-border bg-card p-4">
                  <span className="block text-[14px] font-bold text-primary">Standard Video Pins</span>
                  <span className="block text-[12px] text-fg-subtle mt-1">Full 720p and 1080p MP4 videos with sound</span>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <span className="block text-[14px] font-bold text-primary">Idea Pins &amp; Shorts</span>
                  <span className="block text-[12px] text-fg-subtle mt-1">Multi-page story videos and animated pins</span>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <span className="block text-[14px] font-bold text-primary">High-Res Photos</span>
                  <span className="block text-[12px] text-fg-subtle mt-1">Original full-size JPG/PNG images</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
              <h3 className="text-[20px] font-bold text-fg mb-4">How to Download Pinterest Videos, Step by Step</h3>

              <div className="space-y-6">
                <div>
                  <h4 className="text-[16px] font-bold text-primary-strong mb-2">On Android &amp; iPhone (Mobile)</h4>
                  <ol className="list-decimal pl-5 space-y-2 text-[14.5px] leading-[1.7] text-fg-muted">
                    <li>Open the Pinterest app and tap the video pin you want to download.</li>
                    <li>Tap the <strong className="text-fg">Share</strong> button (or three dots) and select <strong className="text-fg">Copy link</strong>.</li>
                    <li>Open Downloadit in your browser, paste the pin link into the input field above, and tap <strong className="text-fg">Download Pin</strong>.</li>
                    <li>Preview the video and tap <strong className="text-fg">Download</strong> to save the MP4 to your device.</li>
                  </ol>
                </div>

                <div>
                  <h4 className="text-[16px] font-bold text-primary-strong mb-2">On Desktop (PC &amp; Mac)</h4>
                  <ol className="list-decimal pl-5 space-y-2 text-[14.5px] leading-[1.7] text-fg-muted">
                    <li>Navigate to the video pin on pinterest.com and copy the URL from your address bar.</li>
                    <li>Paste the URL into Downloadit and click <strong className="text-fg">Download Pin</strong>.</li>
                    <li>Preview the video, click <strong className="text-fg">Download</strong>, and save the MP4 file to your computer.</li>
                  </ol>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-[20px] font-bold text-fg mb-4">Features &amp; Benefits</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { title: "No Watermark Added", desc: "Save clean Pinterest videos without promotional stamps or overlays." },
                  { title: "Supports Short pin.it Links", desc: "Easily handles both pin.it mobile share links and full desktop URLs." },
                  { title: "Universal MP4 Playback", desc: "Videos play effortlessly on iPhone, Android, Windows, Mac, and TVs." },
                  { title: "100% Free & Unlimited", desc: "Download as many recipe, aesthetic, and tutorial pins as you need." },
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
                Common Pinterest Download Problems
              </h3>
              <div className="space-y-3 text-[14.5px] leading-[1.7] text-fg-muted">
                <p>
                  <strong className="text-fg">Secret Boards:</strong> Pins saved to secret boards or shared via private messaging are protected by authentication cookies and cannot be accessed.
                </p>
                <p>
                  <strong className="text-fg">Deleted or Removed Pins:</strong> If a creator deletes a pin or Pinterest removes it for community guideline reasons, the video is erased from CDN storage and cannot be downloaded.
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
                  { href: "/pinterest-image-downloader", label: "Pinterest Image Downloader", desc: "Download high-res photos & boards" },
                  { href: "/youtube-video-downloader", label: "YouTube Downloader", desc: "Download YouTube videos & Shorts" },
                  { href: "/instagram-video-downloader", label: "Instagram Downloader", desc: "Save Instagram Reels & videos" },
                  { href: "/facebook-video-downloader", label: "Facebook Downloader", desc: "Download Facebook feed & Watch videos" },
                  { href: "/twitter-video-downloader", label: "Twitter/X Downloader", desc: "Download Twitter/X videos & GIFs" },
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
