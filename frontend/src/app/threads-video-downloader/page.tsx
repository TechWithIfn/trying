import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ThreadsDownloader from "@/components/ThreadsDownloader";
import DownloaderContentLayout from "@/components/DownloaderContentLayout";
import { TOOL_PAGES, toolMetadata } from "@/config/toolPages";
import { CheckCircle2, AlertTriangle, Layers } from "lucide-react";

const PAGE = TOOL_PAGES.threadsVideo;
export const metadata: Metadata = toolMetadata(PAGE);

const FAQS = [
  {
    q: "How do I download public Threads videos?",
    a: "Open the public Threads post containing the video. Tap Share and select 'Copy link'. Paste that URL into Downloadit above, tap 'Get Media', verify the preview, and download the MP4.",
  },
  {
    q: "Can I download Threads photos and carousel images?",
    a: "Yes. When a Threads post includes one or more photos, Downloadit extracts the high-resolution image files and lets you save them individually or as a complete set.",
  },
  {
    q: "Which Threads URLs are supported?",
    a: "Public post URLs on threads.net and threads.com are supported whenever the post is accessible without logging in.",
  },
  {
    q: "Do I need a Threads or Instagram account?",
    a: "No. Downloadit does not ask for credentials, cookies, or account sessions. It works completely anonymously with public links.",
  },
  {
    q: "Can I download media from private Threads profiles?",
    a: "No. Private Threads posts require follower authorization and cannot be retrieved by an anonymous downloader.",
  },
];

export default function ThreadsVideoDownloaderPage() {
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
        <ThreadsDownloader
          badge={PAGE.badge}
          titleA={PAGE.titleA}
          titleB={PAGE.titleB}
          subtitle={PAGE.description}
          placeholder={PAGE.placeholder}
          buttonLabel={PAGE.buttonLabel}
          benefits={PAGE.trust}
        />

        <DownloaderContentLayout
          supportedFeatures={
            <>
              <div>
                <h3 className="text-[20px] font-bold text-fg mb-3 flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  Both Video and Photo Posts Supported
                </h3>
                <p className="text-[15px] sm:text-[16px] leading-[1.75] text-fg-muted">
                  Threads posts frequently combine short video clips and multi-picture carousels. Downloadit automatically resolves all items in the post and lets you save videos as MP4 files and photos at full native resolution.
                </p>
              </div>

              <div>
                <h3 className="text-[20px] font-bold text-fg mb-4">Features &amp; Benefits</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { title: "No Watermark Added", desc: "Preserves the original source video stream without stamping overlay logos." },
                    { title: "High-Resolution Photos", desc: "Extracts original JPEG image files without screenshot artifacts." },
                    { title: "Mobile & Desktop Ready", desc: "Works seamlessly on iOS, Android, macOS, and Windows browsers." },
                    { title: "Zero Account Sign-In", desc: "No Meta, Instagram, or Threads credentials required." },
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
              <h3 className="text-[20px] font-bold text-fg mb-4">How to Download Threads Media, Step by Step</h3>

              <div className="space-y-6">
                <div>
                  <h4 className="text-[16px] font-bold text-primary-strong mb-2">On Any Device (Mobile or Desktop)</h4>
                  <ol className="list-decimal pl-5 space-y-2 text-[14.5px] leading-[1.7] text-fg-muted">
                    <li>Open the Threads post with the video or photo you want to save.</li>
                    <li>Tap the <strong className="text-fg">Share</strong> paper airplane icon and select <strong className="text-fg">Copy link</strong>.</li>
                    <li>Paste the link into Downloadit above and tap <strong className="text-fg">Get Media</strong>.</li>
                    <li>Verify the preview and tap <strong className="text-fg">Download</strong> to save the file to your device.</li>
                  </ol>
                </div>
              </div>
            </div>
          }
          educationalContent={
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-[20px] font-bold text-fg mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Troubleshooting Threads Downloads
              </h3>
              <div className="space-y-3 text-[14.5px] leading-[1.7] text-fg-muted">
                <p>
                  <strong className="text-fg">Private Profiles:</strong> Threads from private profiles require user follower permissions and cannot be retrieved anonymously.
                </p>
                <p>
                  <strong className="text-fg">Profile Links vs. Post Links:</strong> Copying a profile address (e.g. <code className="text-xs bg-bg px-1.5 py-0.5 rounded">threads.net/@username</code>) will not download media; you must copy the specific post link.
                </p>
              </div>
            </div>
          }
          whatItDoes={
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6">
              <h2 className="text-[24px] font-bold tracking-tight text-fg sm:text-[30px] leading-[1.25]">
                What the Threads Downloader Does
              </h2>

              <div>
                <h3 className="text-[20px] font-bold text-fg mb-3">What is a Threads Downloader?</h3>
                <p className="text-[15px] sm:text-[16px] leading-[1.75] text-fg-muted">
                  A Threads Downloader is an online service that enables you to save public videos and high-resolution photos shared on the Threads social platform directly to your mobile phone or desktop computer.
                </p>
              </div>

              <div>
                <h3 className="text-[20px] font-bold text-fg mb-3">How Does It Work?</h3>
                <p className="text-[15px] sm:text-[16px] leading-[1.75] text-fg-muted">
                  When a post is published publicly on Threads, its media streams are served from Meta&apos;s global CDN infrastructure. Downloadit resolves the post link, extracts the highest quality MP4 video or original image files, and gives you clean, direct download links.
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
                  { href: "/twitter-video-downloader", label: "Twitter/X Downloader", desc: "Download Twitter/X videos & GIFs" },
                  { href: "/instagram-video-downloader", label: "Instagram Downloader", desc: "Download Instagram Reels & videos" },
                  { href: "/facebook-video-downloader", label: "Facebook Downloader", desc: "Download Facebook feed & Watch videos" },
                  { href: "/youtube-video-downloader", label: "YouTube Downloader", desc: "Save YouTube videos and Shorts" },
                  { href: "/pinterest-video-downloader", label: "Pinterest Downloader", desc: "Download Pinterest video pins" },
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
}
