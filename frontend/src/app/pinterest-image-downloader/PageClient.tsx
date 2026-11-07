"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import PinterestDownloader from "@/components/PinterestDownloader";
import { TOOL_PAGES } from "@/config/toolPages";
import { CheckCircle2, AlertTriangle, Layers } from "lucide-react";

const PAGE = TOOL_PAGES.pinterestImage;

const FAQS = [
  {
    q: "How do I download Pinterest images in full resolution?",
    a: "Copy the public pin link, paste it into Downloadit, and tap 'Download Pin'. The tool extracts the highest-resolution original image stored by Pinterest without compressing it.",
  },
  {
    q: "Can I download multi-image Pinterest carousel pins?",
    a: "Yes. When a pin contains multiple photos or slides, Downloadit lets you view and download all the pictures individually or collectively.",
  },
  {
    q: "What image formats are supported?",
    a: "Original JPG, PNG, and WebP images are supported in whatever format and aspect ratio the creator uploaded them.",
  },
  {
    q: "Do I need a Pinterest account to download pictures?",
    a: "No. You never need to log in to Pinterest. Downloadit works anonymously with any publicly viewable pin.",
  },
];

export default function PinterestImagePageClient() {
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
            What the Pinterest Image &amp; Carousel Downloader Does
          </h2>

          <div className="mt-6 space-y-8 text-fg">
            <div>
              <h3 className="text-[20px] font-bold text-fg mb-3">What is a Pinterest Image Downloader?</h3>
              <p className="text-[15px] sm:text-[16px] leading-[1.75] text-fg-muted">
                A Pinterest Image Downloader is a dedicated web tool that extracts the full-resolution source photograph behind any public Pinterest pin or multi-image carousel, saving it in crystal-clear quality without screenshot compression or watermarks.
              </p>
            </div>

            <div>
              <h3 className="text-[20px] font-bold text-fg mb-3">How Does It Work?</h3>
              <p className="text-[15px] sm:text-[16px] leading-[1.75] text-fg-muted">
                Pinterest displays scaled thumbnails in its feed to save bandwidth. Downloadit queries the underlying pin JSON and metadata to find the uncompressed original asset URL (<code className="text-xs bg-bg px-1.5 py-0.5 rounded">originals/</code> branch), giving you direct access to the full-size photograph.
              </p>
            </div>

            <div>
              <h3 className="text-[20px] font-bold text-fg mb-3 flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                Carousel &amp; Image Board Support
              </h3>
              <p className="text-[15px] sm:text-[16px] leading-[1.75] text-fg-muted">
                If the pin is a carousel containing a gallery of reference images, recipes, or moodboards, Downloadit extracts every slide in the set. You can flip through the gallery and download whichever slides you need.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
              <h3 className="text-[20px] font-bold text-fg mb-4">How to Download Pinterest Images, Step by Step</h3>

              <div className="space-y-6">
                <div>
                  <h4 className="text-[16px] font-bold text-primary-strong mb-2">On Any Mobile or Desktop Browser</h4>
                  <ol className="list-decimal pl-5 space-y-2 text-[14.5px] leading-[1.7] text-fg-muted">
                    <li>Open the Pinterest app or website and select the image pin.</li>
                    <li>Copy its share link using the <strong className="text-fg">Share</strong> button.</li>
                    <li>Paste the link into the download box above and click <strong className="text-fg">Download Pin</strong>.</li>
                    <li>Verify the preview image and tap <strong className="text-fg">Download</strong> to save the high-res file.</li>
                  </ol>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-[20px] font-bold text-fg mb-4">Features &amp; Benefits</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { title: "Highest Resolution Master", desc: "Downloads original images up to 4K resolution rather than feed thumbnails." },
                  { title: "No Watermark Stamped", desc: "Clean images without site badges, logos, or author text overlays." },
                  { title: "Fast & Unlimited", desc: "Save wallpaper ideas, aesthetic moodboards, and design references without limit." },
                  { title: "Zero Registration", desc: "No email, phone number, or login required." },
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
                Troubleshooting Pinterest Images
              </h3>
              <div className="space-y-3 text-[14.5px] leading-[1.7] text-fg-muted">
                <p>
                  <strong className="text-fg">Secret Boards:</strong> Private or secret pin boards cannot be downloaded because they require private user permissions.
                </p>
                <p>
                  <strong className="text-fg">Broken Pin Links:</strong> If a pin was removed by its uploader, Pinterest erases the master file and Downloadit cannot retrieve it.
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
                  { href: "/pinterest-video-downloader", label: "Pinterest Video Downloader", desc: "Save Pinterest video pins" },
                  { href: "/instagram-photo-downloader", label: "Instagram Photo Downloader", desc: "Download Instagram carousels & photos" },
                  { href: "/threads-video-downloader", label: "Threads Downloader", desc: "Download Threads photos & videos" },
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
