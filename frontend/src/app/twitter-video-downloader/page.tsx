import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import TwitterDownloader from "@/components/TwitterDownloader";
import { TOOL_PAGES, toolMetadata } from "@/config/toolPages";
import { CheckCircle2, AlertTriangle, Repeat } from "lucide-react";

const PAGE = TOOL_PAGES.twitterVideo;
export const metadata: Metadata = toolMetadata(PAGE);

const FAQS = [
  {
    q: "How do I download videos from Twitter / X?",
    a: "Copy the link of the public tweet or post containing a video. Paste it into the input box above, click 'Get Video', preview the video, and click Download to save the MP4 to your device.",
  },
  {
    q: "Can I download animated GIFs from Twitter / X?",
    a: "Yes. GIFs on Twitter/X are actually delivered as looped MP4 video files. Downloadit extracts this progressive video stream so you can save and play it on any device.",
  },
  {
    q: "Do both twitter.com and x.com links work?",
    a: "Yes. Downloadit accepts all standard public status URLs from both twitter.com and x.com, as well as mobile share links.",
  },
  {
    q: "Do I need an X / Twitter account to download videos?",
    a: "No. You do not need to sign in, provide tokens, or share your Twitter/X account credentials. Downloadit works anonymously with public posts.",
  },
  {
    q: "Can I download videos from private or protected accounts?",
    a: "No. Downloadit cannot access protected tweets or private accounts that require an approved follower session to view.",
  },
];

export default function TwitterVideoDownloaderPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <>
      <Header />
      <main id="main-content" className="flex-1">
        <Breadcrumb items={[{ name: "Home", path: "/" }, { name: PAGE.name, path: PAGE.path }]} />
        <TwitterDownloader
          badge={PAGE.badge}
          titleA={PAGE.titleA}
          titleB={PAGE.titleB}
          subtitle={PAGE.description}
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
            What the Twitter/X Video Downloader Does
          </h2>

          <div className="mt-6 space-y-8 text-fg">
            <div>
              <h3 className="text-[20px] font-bold text-fg mb-3">What is a Twitter/X Video Downloader?</h3>
              <p className="text-[15px] sm:text-[16px] leading-[1.75] text-fg-muted">
                A Twitter/X Video Downloader is an online tool that saves video clips and animated GIFs posted on Twitter (now X) directly to your local device as standard MP4 files for offline playback.
              </p>
            </div>

            <div>
              <h3 className="text-[20px] font-bold text-fg mb-3">How Does It Work?</h3>
              <p className="text-[15px] sm:text-[16px] leading-[1.75] text-fg-muted">
                When a video tweet is shared publicly on X or Twitter, the platform packages the video into multiple bitrate renditions. Downloadit parses the status ID, selects the highest supported video resolution available, and delivers a fast, direct download link without watermarks.
              </p>
            </div>

            <div>
              <h3 className="text-[20px] font-bold text-fg mb-3 flex items-center gap-2">
                <Repeat className="h-5 w-5 text-primary" />
                Animated GIFs &amp; Video Clips
              </h3>
              <p className="text-[15px] sm:text-[16px] leading-[1.75] text-fg-muted">
                Twitter converts all uploaded GIFs into lightweight looped MP4 video streams. Downloadit preserves these animated clips in their original loop-ready format so you can share them across WhatsApp, Telegram, or Discord.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
              <h3 className="text-[20px] font-bold text-fg mb-4">How to Download Twitter/X Videos, Step by Step</h3>

              <div className="space-y-6">
                <div>
                  <h4 className="text-[16px] font-bold text-primary-strong mb-2">On Any Mobile or Desktop Browser</h4>
                  <ol className="list-decimal pl-5 space-y-2 text-[14.5px] leading-[1.7] text-fg-muted">
                    <li>Find the public tweet containing the video or GIF you want to save.</li>
                    <li>Click or tap the <strong className="text-fg">Share</strong> icon and select <strong className="text-fg">Copy link to Tweet / Post</strong>.</li>
                    <li>Paste the link into the download box above and click <strong className="text-fg">Get Video</strong>.</li>
                    <li>Verify the video preview and click <strong className="text-fg">Download</strong> to save the MP4 to your device.</li>
                  </ol>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-[20px] font-bold text-fg mb-4">Features &amp; Benefits</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { title: "No Watermark Added", desc: "Saves the pristine video stream with zero forced branding or watermarks." },
                  { title: "Twitter.com & X.com Compatible", desc: "Fully supports old twitter.com URLs and modern x.com post addresses." },
                  { title: "High-Quality Progressive MP4", desc: "Picks the highest available resolution up to 1080p." },
                  { title: "100% Free & Unlimited", desc: "No download throttles, subscription fees, or account logins." },
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
                Troubleshooting Twitter/X Video Downloads
              </h3>
              <div className="space-y-3 text-[14.5px] leading-[1.7] text-fg-muted">
                <p>
                  <strong className="text-fg">Protected Accounts:</strong> Tweets from protected accounts require follower authentication and cannot be downloaded by public tools.
                </p>
                <p>
                  <strong className="text-fg">Deleted Tweets:</strong> If the author or X removes a post, its video stream is deleted from CDN servers and cannot be downloaded.
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
                  { href: "/threads-video-downloader", label: "Threads Downloader", desc: "Download Threads videos & photos" },
                  { href: "/facebook-video-downloader", label: "Facebook Downloader", desc: "Download Facebook feed & Watch videos" },
                  { href: "/instagram-video-downloader", label: "Instagram Downloader", desc: "Save Instagram Reels & videos" },
                  { href: "/youtube-video-downloader", label: "YouTube Downloader", desc: "Save YouTube videos and Shorts" },
                  { href: "/pinterest-video-downloader", label: "Pinterest Downloader", desc: "Save Pinterest video pins" },
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
}
