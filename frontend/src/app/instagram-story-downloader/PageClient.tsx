"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import ToolDownloader from "@/components/ToolDownloader";
import DownloaderContentLayout from "@/components/DownloaderContentLayout";
import { TOOL_PAGES } from "@/config/toolPages";
import { CheckCircle2, AlertTriangle, Clock } from "lucide-react";

const PAGE = TOOL_PAGES.instagramStory;

const FAQS = [
  {
    q: "Why do Stories expire after 24 hours?",
    a: "Stories are ephemeral by design on Instagram. After 24 hours from when the creator posts, Instagram automatically deletes them from the public stream. Downloadit cannot recover expired stories; save them while they are still live.",
  },
  {
    q: "Can I download public Story Highlights?",
    a: "Yes. Highlights pinned to a public profile do not expire after 24 hours. Copy the link to the public highlight and paste it into Downloadit to save the photo or video.",
  },
  {
    q: "Will the creator know I downloaded their Story?",
    a: "No. Downloadit accesses the public CDN stream anonymously without logging in. Instagram does not register a story view or notify the creator when saved via Downloadit.",
  },
  {
    q: "Can I download Stories from Close Friends or private profiles?",
    a: "No. Close Friends stories and private accounts require authenticated session credentials which Downloadit never collects or bypasses.",
  },
];

export default function StoryDownloaderPageClient() {
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
                <h3 className="text-[20px] font-bold text-fg mb-3 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  The 24-Hour Expiry Window
                </h3>
                <p className="text-[15px] sm:text-[16px] leading-[1.75] text-fg-muted">
                  Instagram Stories expire automatically after 24 hours. Once expired from the public stream, Instagram wipes them from external CDN access. To archive a story, download it while it is currently live on the creator&apos;s profile. Pinned Story Highlights remain available indefinitely.
                </p>
              </div>

              <div>
                <h3 className="text-[20px] font-bold text-fg mb-4">Features &amp; Benefits</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { title: "Anonymous Story Saving", desc: "Download public stories without registering a view on the creator's story list." },
                    { title: "Original Quality MP4 & JPG", desc: "Saves high-definition video stories and full-resolution still photos." },
                    { title: "Supports Public Highlights", desc: "Easily download pinned story highlights from any public profile." },
                    { title: "Zero Account Sign-In", desc: "You never need to log in or share your Instagram credentials." },
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
              <h3 className="text-[20px] font-bold text-fg mb-4">How to Download Instagram Stories, Step by Step</h3>

              <div className="space-y-6">
                <div>
                  <h4 className="text-[16px] font-bold text-primary-strong mb-2">On Android &amp; iPhone</h4>
                  <ol className="list-decimal pl-5 space-y-2 text-[14.5px] leading-[1.7] text-fg-muted">
                    <li>Open Instagram and view the public story or highlight you want to save.</li>
                    <li>Tap the three dots icon or the <strong className="text-fg">Share</strong> button and tap <strong className="text-fg">Copy link</strong>.</li>
                    <li>Open Downloadit in your browser, paste the link into the box above, and tap <strong className="text-fg">Get Story</strong>.</li>
                    <li>Preview the story video or photo, and tap <strong className="text-fg">Download</strong> to save it to your device.</li>
                  </ol>
                </div>

                <div>
                  <h4 className="text-[16px] font-bold text-primary-strong mb-2">On Desktop</h4>
                  <ol className="list-decimal pl-5 space-y-2 text-[14.5px] leading-[1.7] text-fg-muted">
                    <li>Open the story on instagram.com and copy the URL from your browser address bar.</li>
                    <li>Paste the story link into Downloadit and click <strong className="text-fg">Get Story</strong>.</li>
                    <li>Click <strong className="text-fg">Download</strong> to save the MP4 or JPEG directly to your computer.</li>
                  </ol>
                </div>
              </div>
            </div>
          }
          educationalContent={
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-[20px] font-bold text-fg mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Common Story Download Problems
              </h3>
              <div className="space-y-3 text-[14.5px] leading-[1.7] text-fg-muted">
                <p>
                  <strong className="text-fg">Close Friends Stories:</strong> Stories posted exclusively to a creator&apos;s Close Friends list require an authenticated user session and cannot be downloaded anonymously.
                </p>
                <p>
                  <strong className="text-fg">Expired Stories:</strong> If more than 24 hours have elapsed since posting and the story is not saved as a public highlight, it cannot be downloaded.
                </p>
              </div>
            </div>
          }
          whatItDoes={
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6">
              <h2 className="text-[24px] font-bold tracking-tight text-fg sm:text-[30px] leading-[1.25]">
                What the Story Downloader Does
              </h2>

              <div>
                <h3 className="text-[20px] font-bold text-fg mb-3">What is an Instagram Story Downloader?</h3>
                <p className="text-[15px] sm:text-[16px] leading-[1.75] text-fg-muted">
                  An Instagram Story Downloader is a fast online service that saves disappearing 24-hour stories and pinned profile highlights as original MP4 video files or high-definition JPEG images to your phone or computer before they disappear forever.
                </p>
              </div>

              <div>
                <h3 className="text-[20px] font-bold text-fg mb-3">How Does It Work?</h3>
                <p className="text-[15px] sm:text-[16px] leading-[1.75] text-fg-muted">
                  While a story is live, Instagram streams it through accessible public content delivery networks. When you paste the link of a public story into Downloadit, our streaming engine locates the active media stream and lets you save the original video or photo anonymously without leaving a view record on the creator&apos;s viewer list.
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
                  { href: "/instagram-video-downloader", label: "Instagram Video Downloader", desc: "Download high-definition videos" },
                  { href: "/instagram-reels-downloader", label: "Instagram Reels Downloader", desc: "Download vertical Instagram Reels" },
                  { href: "/instagram-photo-downloader", label: "Instagram Photo Downloader", desc: "Download carousels and photos" },
                  { href: "/instagram-audio-downloader", label: "Instagram Audio Downloader", desc: "Extract background music tracks" },
                  { href: "/facebook-video-downloader", label: "Facebook Downloader", desc: "Download Facebook feed & Watch videos" },
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
