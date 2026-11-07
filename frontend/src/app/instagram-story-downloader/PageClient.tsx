"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import ToolDownloader from "@/components/ToolDownloader";
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
            What the Story Downloader Does
          </h2>

          <div className="mt-6 space-y-8 text-fg">
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

            <div>
              <h3 className="text-[20px] font-bold text-fg mb-3 flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                The 24-Hour Expiry Window
              </h3>
              <p className="text-[15px] sm:text-[16px] leading-[1.75] text-fg-muted">
                Standard stories expire exactly 24 hours from when the creator posted them. Expiry is the number one cause of failed story downloads. We advise downloading stories as soon as you see them. If a story was added to a creator&apos;s public Highlights, it remains permanently available.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
              <h3 className="text-[20px] font-bold text-fg mb-4">How to Download Instagram Stories, Step by Step</h3>

              <div className="space-y-6">
                <div>
                  <h4 className="text-[16px] font-bold text-primary-strong mb-2">On Android &amp; iPhone</h4>
                  <ol className="list-decimal pl-5 space-y-2 text-[14.5px] leading-[1.7] text-fg-muted">
                    <li>Open the Instagram app and tap the public Story you want to save.</li>
                    <li>Tap the three dots (···) or the Share icon and tap <strong className="text-fg">Copy link</strong>.</li>
                    <li>Open your browser, paste the story link above, and tap <strong className="text-fg">Download Story</strong>.</li>
                    <li>Preview the media and save the MP4 or JPEG to your device.</li>
                  </ol>
                </div>

                <div>
                  <h4 className="text-[16px] font-bold text-primary-strong mb-2">On Desktop</h4>
                  <ol className="list-decimal pl-5 space-y-2 text-[14.5px] leading-[1.7] text-fg-muted">
                    <li>Navigate to the story on instagram.com and copy the link from the browser URL bar.</li>
                    <li>Paste the URL into Downloadit and click <strong className="text-fg">Download Story</strong>.</li>
                    <li>Preview the clip or image and save it immediately to your Downloads folder.</li>
                  </ol>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-[20px] font-bold text-fg mb-4">Features &amp; Benefits</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { title: "Completely Anonymous", desc: "Your username never appears on the poster's Story viewers list." },
                  { title: "Original Visual Quality", desc: "Downloads full vertical 1080x1920 video and high-resolution photos." },
                  { title: "Highlights Supported", desc: "Save permanently archived public profile highlights anytime." },
                  { title: "No Account Needed", desc: "You do not even need an Instagram account to download public stories." },
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
                Common Story Download Problems
              </h3>
              <div className="space-y-3 text-[14.5px] leading-[1.7] text-fg-muted">
                <p>
                  <strong className="text-fg">Expired Stories:</strong> If a story is older than 24 hours, Instagram removes it from public servers and it cannot be downloaded.
                </p>
                <p>
                  <strong className="text-fg">Close Friends &amp; Private Accounts:</strong> Any story restricted by privacy settings or Close Friends lists cannot be viewed by logged-out users and is unavailable.
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
                  { href: "/instagram-photo-downloader", label: "Instagram Photo Downloader", desc: "Save photos and swipe carousels" },
                  { href: "/pinterest-video-downloader", label: "Pinterest Video Downloader", desc: "Download Pinterest videos" },
                  { href: "/youtube-video-downloader", label: "YouTube Video Downloader", desc: "Download YouTube Shorts & videos" },
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
