import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import FacebookDownloader from "@/components/FacebookDownloader";
import { TOOL_PAGES, toolMetadata } from "@/config/toolPages";
import { CheckCircle2, AlertTriangle } from "lucide-react";

const PAGE = TOOL_PAGES.facebookVideo;
export const metadata: Metadata = toolMetadata(PAGE);

const FAQS = [
  {
    q: "How do I download Facebook videos?",
    a: "Copy the link to any public Facebook post, Reel, or Watch video. Paste it into Downloadit above, select 'Get Video', verify the preview, and click Download to save the MP4 to your device.",
  },
  {
    q: "Can I download Facebook Reels?",
    a: "Yes. Public Facebook Reels are fully supported. Downloadit extracts the original vertical MP4 video with synchronized audio.",
  },
  {
    q: "Does Downloadit support Facebook Watch videos?",
    a: "Yes, public Facebook Watch links are supported. You can download interviews, game streams, and community clips as progressive MP4 video.",
  },
  {
    q: "Do I need a Facebook account to download videos?",
    a: "No. You never need to log in to Facebook or share your password. Downloadit works anonymously with any publicly viewable link.",
  },
  {
    q: "Can I download private Facebook videos or private group posts?",
    a: "No. Downloadit respects privacy boundaries and does not collect or bypass Facebook login sessions, cookies, or group permissions.",
  },
  {
    q: "Why is a Facebook link not working?",
    a: "Make sure you copied the direct link to the specific video post rather than a profile page, group feed, or search page. Also ensure the post privacy is set to Public.",
  },
];

export default function FacebookVideoDownloaderPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  return (
    <>
      <Header />
      <main id="main-content" className="flex-1">
        <Breadcrumb items={[{ name: "Home", path: "/" }, { name: PAGE.name, path: PAGE.path }]} />
        <FacebookDownloader
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
            What the Facebook Video Downloader Does
          </h2>

          <div className="mt-6 space-y-8 text-fg">
            <div>
              <h3 className="text-[20px] font-bold text-fg mb-3">What is a Facebook Video Downloader?</h3>
              <p className="text-[15px] sm:text-[16px] leading-[1.75] text-fg-muted">
                A Facebook Video Downloader is an online service that enables you to save publicly accessible Facebook videos, Reels, and Watch streams directly to your phone or computer as MP4 video files for offline watching.
              </p>
            </div>

            <div>
              <h3 className="text-[20px] font-bold text-fg mb-3">How Does It Work?</h3>
              <p className="text-[15px] sm:text-[16px] leading-[1.75] text-fg-muted">
                When a public video is posted on Facebook, Facebook distributes a progressive video stream. When you submit a Facebook link to Downloadit, our engine resolves the public stream address and presents a direct MP4 download link without requesting your Facebook login.
              </p>
            </div>

            <div>
              <h3 className="text-[20px] font-bold text-fg mb-3">Supported Facebook Media Types</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-border bg-card p-4">
                  <span className="block text-[14px] font-bold text-primary">Facebook Watch</span>
                  <span className="block text-[12px] text-fg-subtle mt-1">Full-length videos, shows, and interviews</span>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <span className="block text-[14px] font-bold text-primary">Facebook Reels</span>
                  <span className="block text-[12px] text-fg-subtle mt-1">Vertical 9:16 viral short videos</span>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <span className="block text-[14px] font-bold text-primary">Feed Videos</span>
                  <span className="block text-[12px] text-fg-subtle mt-1">Standard video posts from public pages</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
              <h3 className="text-[20px] font-bold text-fg mb-4">How to Download Facebook Videos, Step by Step</h3>

              <div className="space-y-6">
                <div>
                  <h4 className="text-[16px] font-bold text-primary-strong mb-2">On Android, iPhone, &amp; Desktop</h4>
                  <ol className="list-decimal pl-5 space-y-2 text-[14.5px] leading-[1.7] text-fg-muted">
                    <li>Find the public Facebook video, Reel, or Watch page you wish to download.</li>
                    <li>Tap the <strong className="text-fg">Share</strong> button and choose <strong className="text-fg">Copy link</strong> (or copy the URL from the desktop address bar).</li>
                    <li>Paste the link into the URL field above and tap <strong className="text-fg">Get Video</strong>.</li>
                    <li>Verify the video preview and select <strong className="text-fg">Download</strong> to save the MP4 to your storage.</li>
                  </ol>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-[20px] font-bold text-fg mb-4">Features &amp; Benefits</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { title: "No Watermark Added", desc: "Downloads original progressive MP4 streams without branding stamps." },
                  { title: "Watch, Feed & Reels Supported", desc: "One unified downloader for all public Facebook video types." },
                  { title: "Fast & Lightweight", desc: "No bulky APKs, desktop applications, or browser plugins required." },
                  { title: "100% Free & Anonymous", desc: "Never requires Facebook sign-in or session sharing." },
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
                Troubleshooting Facebook Video Downloads
              </h3>
              <div className="space-y-3 text-[14.5px] leading-[1.7] text-fg-muted">
                <p>
                  <strong className="text-fg">Private Profiles &amp; Closed Groups:</strong> Videos shared within closed Facebook groups or posted by private user accounts cannot be resolved because they require authorization.
                </p>
                <p>
                  <strong className="text-fg">Temporary CDN Expiration:</strong> Facebook video URLs are signed with short expiration timestamps. If a download stalls, paste the link again to retrieve a fresh URL.
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
                  { href: "/youtube-video-downloader", label: "YouTube Downloader", desc: "Save YouTube videos and Shorts" },
                  { href: "/twitter-video-downloader", label: "Twitter/X Downloader", desc: "Download Twitter/X videos & GIFs" },
                  { href: "/threads-video-downloader", label: "Threads Downloader", desc: "Download Threads videos & photos" },
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
