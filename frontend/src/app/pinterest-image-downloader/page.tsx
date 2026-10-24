import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import PinterestDownloader from "@/components/PinterestDownloader";
import ProseSection from "@/components/ProseSection";
import { TOOL_PAGES, toolMetadata } from "@/config/toolPages";

const PAGE = TOOL_PAGES.pinterestImage;

export const metadata: Metadata = toolMetadata(PAGE);

const FAQS = [
  {
    q: "How do I download Pinterest images?",
    a: "Open the image pin, tap the share icon and choose Copy link (on desktop you can copy the address bar). Paste that link into the box above and choose Get Media — Auto Detect finds the pictures by default. Preview the result and select Download to save each image.",
  },
  {
    q: "Does this work as a Pinterest photo downloader and carousel downloader?",
    a: "Yes. It saves the image behind a public Pinterest image pin, and when a pin exposes more than one image it returns those carousel pictures too — using the same pin link.",
  },
  {
    q: "Will I get the full-resolution image?",
    a: "The tool picks the largest image the pin exposes and preserves its original format (JPEG, PNG or WebP) wherever possible, so you get the sharpest available copy rather than a downscaled thumbnail.",
  },
  {
    q: "Can I download every picture in a Pinterest carousel?",
    a: "When a pin exposes more than one image, the result panel shows them one at a time with previous/next controls, and each picture downloads individually. If a pin exposes only a single image, just that one is shown.",
  },
  {
    q: "What if the pin is a video, not an image?",
    a: "Use the Pinterest Video Downloader to save the MP4. This page handles image and carousel pins only, and it will tell you plainly when a link resolves to a video rather than returning the wrong file.",
  },
  {
    q: "Why did a Pinterest pin image not download?",
    a: "Deleted pins, private boards, login-walled pins and region-restricted pins cannot be fetched anonymously. The page names the exact reason — invalid link, removed pin, restricted content, or an upstream problem — and never substitutes a placeholder image.",
  },
  {
    q: "Is there a watermark or quality loss?",
    a: "No. The file is the original Pinterest image served by the public page; Downloadit does not re-encode it or add any branding.",
  },
];

export default function PinterestImageDownloaderPage() {
  return (
    <>
      <Header />
      <main id="main-content" className="flex-1">
        <Breadcrumb items={[{ name: "Home", path: "/" }, { name: PAGE.name, path: PAGE.path }]} />
        <PinterestDownloader
          badge={PAGE.badge}
          titleA={PAGE.titleA}
          titleB={PAGE.titleB}
          subtitle={PAGE.description}
          placeholder={PAGE.placeholder}
          buttonLabel={PAGE.buttonLabel}
          modes={PAGE.modes}
          benefits={PAGE.trust}
        />
        <section className="mx-auto max-w-[900px] px-5 sm:px-6 lg:px-12 pb-12">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center text-[14px] font-semibold text-fg-muted transition-colors hover:text-primary"
          >
            ← Back to Home
          </Link>
          <h2 className="mt-4 text-[24px] font-bold tracking-[-0.01em] text-fg sm:text-[28px] leading-[1.2]">
            What the Pinterest Image &amp; Carousel downloader does
          </h2>
          <p className="mt-4 text-[18px] leading-[1.7] text-fg-muted">
            Mood boards, recipes, outfits, designs and ideas — Pinterest lives on images. This Pinterest image
            downloader saves the picture behind a public Pinterest pin, and the same link works as a Pinterest carousel
            downloader when a pin exposes several images. Use it to download Pinterest images and pictures in the
            original quality the pin serves.
          </p>
          <p className="mt-3 text-[16px] leading-[1.7] text-fg-muted">
            Paste the pin link, preview the exact image, then download it in its original format. No login, no
            watermark, nothing to install.
          </p>

          <ProseSection>
            <h2>How to download Pinterest images, step by step</h2>
            <ol className="list-decimal pl-5 space-y-2 text-[14px] leading-[1.7] text-fg-muted">
              <li>Open the image pin you want to keep — tap it so it opens on its own.</li>
              <li>Use the share icon and choose Copy link (desktop users can copy the address bar).</li>
              <li>Paste the link into the box at the top of this page. Auto Detect finds the images by default — no option needs choosing.</li>
              <li>Select Get Media, then confirm the preview is the correct image.</li>
              <li>Select Download and the picture is saved in its original format.</li>
            </ol>

            <h2 className="mt-10">Pinterest photo and carousel support</h2>
            <p className="mt-2 text-[14px] leading-[1.7] text-fg-muted">
              A Pinterest pin can hold a single image or a carousel of several. This Pinterest photo downloader
              returns the images the pin actually exposes: a single picture for a standard pin, or the carousel
              items shown one at a time with previous/next controls when the pin has more than one. Nothing is
              invented — if only one image is published, only one is shown.
            </p>

            <h2 className="mt-10">Pinterest pin image download quality and format</h2>
            <p className="mt-2 text-[14px] leading-[1.7] text-fg-muted">
              The Pinterest image saver selects the largest variant the pin publishes and keeps its format — JPEG,
              PNG or WebP — instead of converting it. That means the sharpest available copy with no added
              compression or branding.
            </p>

            <h2 className="mt-10">What this Pinterest image downloader cannot fetch</h2>
            <p className="mt-2 text-[14px] leading-[1.7] text-fg-muted">
              Public pins only. Deleted pins, private boards, login-walled and region-restricted pins cannot be
              resolved anonymously, and the page reports the real reason rather than showing an unrelated image. This
              page handles image and carousel pins — to save a video pin, use the{" "}
              <Link href="/pinterest-video-downloader" className="font-bold text-primary-strong hover:underline">
                Pinterest Video Downloader
              </Link>
              .
            </p>

            <h2 className="mt-10">Using Pinterest images responsibly</h2>
            <p className="mt-2 text-[14px] leading-[1.7] text-fg-muted">
              Most images on Pinterest belong to someone — a photographer, a brand, an illustrator. Keep your own
              pins freely, save others for private reference, and get permission before reusing anyone else&apos;s
              image. See the{" "}
              <Link href="/dmca" className="font-bold text-primary-strong hover:underline">DMCA page</Link> and{" "}
              <Link href="/terms" className="font-bold text-primary-strong hover:underline">Terms</Link> for how to
              request a review. Only download content you own or have permission to use.
            </p>

            <h2 className="mt-10">Devices and browsers this page works on</h2>
            <p className="mt-2 text-[14px] leading-[1.7] text-fg-muted">
              There is nothing to install and no account to create, so the page works wherever a public Pinterest link opens: Chrome, Safari, Firefox, Edge or Samsung Internet on Android; Safari or Chrome on iPhone and iPad; any modern browser on Windows, Mac and Linux. Saved pictures land in the browser&apos;s download location — Files under Downloads on iPhone, Files or Gallery on Android, and your downloads folder on a computer.
            </p>

            <h2 className="mt-10">Your privacy on this page</h2>
            <p className="mt-2 text-[14px] leading-[1.7] text-fg-muted">
              Only the public pin link is submitted. Downloadit asks for no Pinterest account, email or password, and there is no sign-in flow — the request carries the link and nothing that identifies who pasted it. The <Link href="/privacy" className="font-bold text-primary-strong hover:underline">Privacy Policy</Link> sets out exactly what is processed.
            </p>
          </ProseSection>

          <h2 className="mt-10 text-[18px] font-bold text-fg">Related downloaders</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              { href: "/pinterest-video-downloader", label: "Pinterest Video Downloader", desc: "Save Pinterest videos as MP4" },
              { href: "/instagram-photo-downloader", label: "Instagram Photo & Carousel Downloader", desc: "Save Instagram photos and carousels" },
              { href: "/instagram-video-downloader", label: "Instagram Video Downloader", desc: "Save Instagram videos as MP4" },
              { href: "/instagram-story-downloader", label: "Instagram Story Downloader", desc: "Save stories before they expire" },
              { href: "/youtube-video-downloader", label: "YouTube Video Downloader", desc: "Save YouTube videos and audio" },
              { href: "/", label: "Downloadit Home", desc: "All-in-one media downloader" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-2xl p-4 hover:bg-primary-light transition-colors"
                style={{ border: "1px solid var(--border)", background: "var(--card)" }}
              >
                <span className="text-[14px] font-semibold text-primary-strong">{l.label}</span>
                <span className="mt-1 block text-[14px] text-fg-muted">{l.desc}</span>
              </Link>
            ))}
          </div>

          <ProseSection>
            <section className="cv-auto mt-12">
              <h2>Pinterest image and carousel download FAQ</h2>
              <div className="mt-4">
                {FAQS.map((item) => (
                  <div key={item.q}>
                    <h3>{item.q}</h3>
                    <p>{item.a}</p>
                  </div>
                ))}
              </div>
            </section>
          </ProseSection>

          <p className="mt-10 text-[12px] text-fg-subtle">
            See <Link href="/#how-it-works" className="text-primary-strong hover:underline">How It Works</Link>, the{" "}
            <Link href="/help" className="text-primary-strong hover:underline">Help page</Link> or{" "}
            <Link href="/privacy" className="text-primary-strong hover:underline">Privacy</Link>.
          </p>
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
