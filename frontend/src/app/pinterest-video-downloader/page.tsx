import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/config/site";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PinterestDownloader from "@/components/PinterestDownloader";
import ProseSection from "@/components/ProseSection";
import ReadMore from "@/components/ReadMore";

export const metadata: Metadata = {
  title: { absolute: "Pinterest Video Downloader – Save Pinterest Videos MP4 Free" },
  description:
    "Free Pinterest video downloader. Paste a public pin link and save Pinterest videos as MP4 in original quality. No login, no watermark, no app needed.",
  keywords: [
    "Pinterest video downloader",
    "download Pinterest videos",
    "Pinterest video download",
    "save Pinterest videos",
    "Pinterest MP4 downloader",
    "Pinterest pin video download",
  ],
  alternates: { canonical: "/pinterest-video-downloader" },
  openGraph: {
    title: { absolute: "Pinterest Video Downloader – Save Pinterest Videos MP4 Free" },
    description:
      "Free Pinterest video downloader. Paste a public pin link and save Pinterest videos as MP4 in original quality. No login, no watermark, no app needed.",
    url: `${SITE_URL}/pinterest-video-downloader`,
    type: "website",
    images: [{ url: "/og-downloadit.png", width: 1200, height: 630, alt: "Pinterest Video Downloader — Downloadit" }],
  },
  twitter: {
    card: "summary_large_image",
    title: { absolute: "Pinterest Video Downloader – Save Pinterest Videos MP4 Free" },
    description:
      "Free Pinterest video downloader. Paste a public pin link and save Pinterest videos as MP4 in original quality. No login, no watermark, no app needed.",
    images: ["/og-downloadit.png"],
  },
};

const PAGE_NAME = "Pinterest Video Downloader";
const PAGE_PATH = "/pinterest-video-downloader";

const STEPS = [
  { title: "Copy the pin link", desc: "Open a publicly accessible Pinterest video pin and copy its URL." },
  { title: "Paste and preview", desc: "Paste the link into Downloadit and preview the available media." },
  { title: "Download your video", desc: "Select Download when the media is successfully resolved." },
];

const FAQS = [
  {
    q: "How do I download a Pinterest video?",
    a: "Open a publicly accessible Pinterest video pin, copy its link, paste it into the box above, and choose Get Media. When the media is successfully resolved you can preview it and select Download to save a supported file.",
  },
  {
    q: "Do I need a Pinterest account?",
    a: "No. Downloadit needs no account and no login. It only works with publicly accessible pins, so there is nothing to sign in to.",
  },
  {
    q: "Why might a video link not work?",
    a: "A link can fail when the pin is deleted, private, region-restricted, login-walled, or is only served as a streaming playlist that cannot be fetched anonymously. Availability depends entirely on the pin and the source, and no downloader can guarantee it.",
  },
  {
    q: "Can I download private Pinterest content?",
    a: "No. Only publicly accessible pins can be resolved. Private boards, secret pins, and anything behind a login cannot be downloaded, and the tool reports the real reason instead of returning an unrelated file.",
  },
];

export default function PinterestVideoDownloaderPage() {
  return (
    <>
      <Header />
      <main id="main-content" className="flex-1">
        <PinterestDownloader
          badge={"Pinterest Video Downloader · Free & Easy"}
          titleA="Pinterest Video Downloader – "
          titleB="Download Pinterest Videos as MP4"
          subtitle="Paste a public Pinterest video pin link, preview the video, and download it as MP4. No account, no watermark, nothing to install. Works on iPhone, Android, Windows and Mac."
        />

        <section className="mx-auto mt-2 w-full max-w-[900px] px-5 sm:px-6 lg:px-12 pb-6 sm:pb-8">
          <h2 className="text-center text-[22px] font-extrabold tracking-[-0.01em] text-fg sm:text-[26px]">
            How to download a Pinterest video
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className="rounded-2xl p-5"
                style={{ border: "1px solid var(--border)", background: "var(--card)" }}
              >
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[14px] font-bold text-white"
                  style={{ background: "var(--brand-gradient)" }}
                >
                  {i + 1}
                </span>
                <h3 className="mt-3 text-[15px] font-bold text-fg">{step.title}</h3>
                <p className="mt-1.5 text-[14px] leading-[1.6] text-fg-muted">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[900px] px-5 sm:px-6 lg:px-12 pb-12">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center text-[14px] font-semibold text-fg-muted transition-colors hover:text-primary"
          >
            ← Back to Home
          </Link>
          <h2 className="mt-4 text-[32px] font-extrabold tracking-[-0.02em] text-fg sm:text-[42px] leading-[1.1]">
            Pinterest Video Downloader
          </h2>
          <p className="mt-4 text-[18px] leading-[1.7] text-fg-muted">
            This Pinterest Video Downloader saves publicly accessible Pinterest video pins as MP4 files you can watch
            offline, on any device. Paste the URL of a public Pinterest video pin, and the tool reads the pin page and
            returns the video it exposes.
          </p>
          <p className="mt-3 text-[16px] leading-[1.7] text-fg-muted">
            Copy the pin link, paste it into the downloader above, preview the result when it is available, then
            download the file the pin exposes — no watermark, no login, nothing to install.
          </p>

          <ProseSection>
            <ReadMore label="Pinterest video guide">
              <h2>How to download a Pinterest video, step by step</h2>
              <ol className="list-decimal pl-5 space-y-2 text-[14px] leading-[1.7] text-fg-muted">
                <li>Open the video pin you want to keep — tap it so it fills the screen, not the board grid.</li>
                <li>Use the share icon and choose Copy link (desktop users can copy the address bar).</li>
                <li>Paste the link into the box at the top of this page and select Video, then Get Media.</li>
                <li>Check that the preview is the correct video.</li>
                <li>Select Download and let the transfer finish. The MP4 lands in your Downloads folder.</li>
              </ol>

              <h2 className="mt-10">What this Pinterest video downloader can fetch</h2>
              <p className="mt-2 text-[14px] leading-[1.7] text-fg-muted">
                It works on public video pins — the same content a visitor sees without signing in. Deleted pins,
                private boards, login-walled pins, region-restricted pins and pins served only as streaming playlists
                are outside what an anonymous tool can download, and the page reports the exact reason when that
                happens. It never fabricates a download or hands back an unrelated file.
              </p>

              <h2 className="mt-10">Pinterest video quality and format</h2>
              <p className="mt-2 text-[14px] leading-[1.7] text-fg-muted">
                Videos are saved as MP4 using the best progressive rendition the pin exposes, so the picture and sound
                match what plays on Pinterest. Because Pinterest signs its media links, save the file soon after
                resolving it; if a link has gone stale, paste the pin link again for a fresh address.
              </p>

              <h2 className="mt-10">Troubleshooting Pinterest video downloads</h2>
              <p className="mt-2 text-[14px] leading-[1.7] text-fg-muted">
                <strong className="text-fg">“No downloadable video.”</strong> The pin is an image-only pin. Switch to
                the Carousel option above to save its picture, or use the{" "}
                <Link href="/pinterest-image-downloader" className="font-bold text-primary-strong hover:underline">
                  Pinterest Image and Carousel Downloader
                </Link>
                .
              </p>
              <p className="mt-2 text-[14px] leading-[1.7] text-fg-muted">
                <strong className="text-fg">“Pin not found.”</strong> The pin was likely deleted or the link is
                incomplete — open it in Pinterest first to confirm it still exists.
              </p>
              <p className="mt-2 text-[14px] leading-[1.7] text-fg-muted">
                <strong className="text-fg">“Restricted.”</strong> Pinterest may be limiting automated access at that
                moment, or the pin needs a login. Try again shortly or open the pin directly.
              </p>
            </ReadMore>
          </ProseSection>

          <h2 className="mt-10 text-[18px] font-bold text-fg">Related downloaders</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              { href: "/pinterest-image-downloader", label: "Pinterest Image and Carousel Downloader", desc: "Save Pinterest images and carousels" },
              { href: "/instagram-video-downloader", label: "Instagram Video Downloader", desc: "Save Instagram videos as MP4" },
              { href: "/instagram-reels-downloader", label: "Instagram Reels Downloader", desc: "Save Reels as MP4" },
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
              <h2>Pinterest video download FAQ</h2>
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
            "@type": "WebApplication",
            name: "Pinterest Video Downloader",
            url: `${SITE_URL}${PAGE_PATH}`,
            description:
              "Free Pinterest video downloader. Paste a public pin link and save Pinterest videos as MP4 in original quality. No login, no watermark, no app needed.",
            applicationCategory: "MultimediaApplication",
            operatingSystem: "Any",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          }),
        }}
      />
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
              { "@type": "ListItem", position: 2, name: PAGE_NAME, item: `${SITE_URL}${PAGE_PATH}` },
            ],
          }),
        }}
      />
    </>
  );
}
