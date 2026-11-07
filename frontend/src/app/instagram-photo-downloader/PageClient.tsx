"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import ToolDownloader from "@/components/ToolDownloader";
import { TOOL_PAGES } from "@/config/toolPages";
import { CheckCircle2, AlertTriangle } from "lucide-react";

const PAGE = TOOL_PAGES.instagramPhoto;

const FAQS = [
  {
    q: "Can I download individual slides from a carousel, or do I have to take all of them?",
    a: "You can download whichever ones you want. The tool resolves all slides in the carousel and lets you flip through them. Use 'Download slide' on the specific picture you want, or 'Download all' to grab the whole set as a neat package.",
  },
  {
    q: "Will a saved carousel photo match what I see on Instagram?",
    a: "Yes. You get the highest-resolution JPEG or WebP file Instagram stores on its servers, without screenshot borders, app UI overlays, or added compression.",
  },
  {
    q: "Can I save photos from private accounts if I follow them?",
    a: "No. Downloadit operates completely anonymously without an Instagram account. Any media that requires signing in or follower permission cannot be accessed.",
  },
  {
    q: "Where do saved photos go on iPhone?",
    a: "On iOS, tapping download displays the high-resolution photo in your browser. Long press and tap 'Save to Photos' or find the file saved inside your Files app under Downloads.",
  },
  {
    q: "Does Downloadit add watermarks to downloaded photos?",
    a: "Never. Downloadit delivers the exact image byte stream served by Instagram without watermarks, modifications, or metadata alteration.",
  },
];

export default function CarouselDownloaderPageClient() {
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
            What the Photo &amp; Carousel Downloader Does
          </h2>

          <div className="mt-6 space-y-8 text-fg">
            <div>
              <h3 className="text-[20px] font-bold text-fg mb-3">What is a Photo &amp; Carousel Downloader?</h3>
              <p className="text-[15px] sm:text-[16px] leading-[1.75] text-fg-muted">
                An Instagram Photo and Carousel Downloader is an online tool that saves full-resolution photos, single images, and multi-slide carousels from public Instagram posts directly to your storage. Instead of capturing low-quality screenshots that clip borders and lose clarity, this tool downloads the original uncompressed image files.
              </p>
            </div>

            <div>
              <h3 className="text-[20px] font-bold text-fg mb-3">How Does It Work?</h3>
              <p className="text-[15px] sm:text-[16px] leading-[1.75] text-fg-muted">
                Instagram carousels bundle up to 10 photos and videos in a single swipeable gallery. When you enter a post link, Downloadit inspects the gallery container, resolves every individual slide at maximum display quality, and provides single-click download buttons for each image or the entire gallery.
              </p>
            </div>

            <div>
              <h3 className="text-[20px] font-bold text-fg mb-3">Supported Image Formats &amp; Resolutions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-border bg-card p-4">
                  <span className="block text-[14px] font-bold text-primary">Original Resolution</span>
                  <span className="block text-[12px] text-fg-subtle mt-1">Full 1080px to 1440px wide master files</span>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <span className="block text-[14px] font-bold text-primary">JPEG &amp; WebP</span>
                  <span className="block text-[12px] text-fg-subtle mt-1">Direct from upstream CDN with zero re-encoding</span>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <span className="block text-[14px] font-bold text-primary">Complete Carousels</span>
                  <span className="block text-[12px] text-fg-subtle mt-1">Download slide-by-slide or all at once</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
              <h3 className="text-[20px] font-bold text-fg mb-4">How to Download Instagram Photos, Step by Step</h3>

              <div className="space-y-6">
                <div>
                  <h4 className="text-[16px] font-bold text-primary-strong mb-2">On Mobile (Android &amp; iOS)</h4>
                  <ol className="list-decimal pl-5 space-y-2 text-[14.5px] leading-[1.7] text-fg-muted">
                    <li>Find the public photo or carousel post in your Instagram app.</li>
                    <li>Tap <strong className="text-fg">Share</strong> and select <strong className="text-fg">Copy Link</strong>.</li>
                    <li>Paste the link into the URL input above and tap <strong className="text-fg">Download Photo</strong>.</li>
                    <li>Swipe through the carousel slides and tap Download on the slide you want to save.</li>
                  </ol>
                </div>

                <div>
                  <h4 className="text-[16px] font-bold text-primary-strong mb-2">On Desktop</h4>
                  <ol className="list-decimal pl-5 space-y-2 text-[14.5px] leading-[1.7] text-fg-muted">
                    <li>Copy the URL of the photo post from your browser address bar.</li>
                    <li>Paste the link into Downloadit and click <strong className="text-fg">Download Photo</strong>.</li>
                    <li>Preview the high-resolution images and save them directly to your hard drive.</li>
                  </ol>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-[20px] font-bold text-fg mb-4">Features &amp; Benefits</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { title: "No Screenshot Artifacts", desc: "Say goodbye to battery icons, cropped edges, and fuzzy screenshot compression." },
                  { title: "Carousel Slide Selection", desc: "Save only the slides you actually want, or download the complete collection." },
                  { title: "Color & Aspect Ratio Preservation", desc: "Maintains true square, portrait 4:5, and landscape proportions as uploaded." },
                  { title: "Completely Free", desc: "No watermarks, no user limits, and no registration required." },
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
                Troubleshooting Photo Downloads
              </h3>
              <div className="space-y-3 text-[14.5px] leading-[1.7] text-fg-muted">
                <p>
                  <strong className="text-fg">Private Posts:</strong> Posts from private Instagram profiles cannot be resolved because Instagram requires session cookies to view them.
                </p>
                <p>
                  <strong className="text-fg">Single Slide vs. Whole Post:</strong> Make sure to copy the share link for the post as a whole rather than copying an image URL from an external embed.
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
                  { href: "/instagram-reels-downloader", label: "Instagram Reels Downloader", desc: "Download public Reels as MP4" },
                  { href: "/instagram-video-downloader", label: "Instagram Video Downloader", desc: "Save longer Instagram video clips" },
                  { href: "/instagram-story-downloader", label: "Instagram Story Downloader", desc: "Save stories before they expire" },
                  { href: "/pinterest-image-downloader", label: "Pinterest Image Downloader", desc: "Save Pinterest pins & boards" },
                  { href: "/threads-video-downloader", label: "Threads Downloader", desc: "Download Threads videos & photos" },
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
