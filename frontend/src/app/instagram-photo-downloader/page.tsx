import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/config/site";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ToolDownloader from "@/components/ToolDownloader";

export const metadata: Metadata = {
  title: { absolute: "Instagram Photo & Carousel Downloader – Save Photos & Carousels | Downloadit" },
  description: "Save public Instagram photos and full carousels at original quality. Download a single image or every slide at once — free, no login required.",
  alternates: { canonical: "/instagram-photo-downloader" },
  openGraph: {
    title: { absolute: "Instagram Photo & Carousel Downloader – Save Photos & Carousels | Downloadit" },
    description: "Save public Instagram photos and full carousels at original quality. Download a single image or every slide at once — free, no login required.",
    url: `${SITE_URL}/instagram-photo-downloader`,
    type: "website",
    images: [{ url: "/og-downloadit.png", width: 1200, height: 630, alt: "Instagram Photo & Carousel Downloader — Downloadit" }],
  },
  twitter: {
    card: "summary_large_image",
    title: { absolute: "Instagram Photo & Carousel Downloader – Save Photos & Carousels | Downloadit" },
    description: "Save public Instagram photos and full carousels at original quality. Download a single image or every slide at once — free, no login required.",
    images: ["/og-downloadit.png"],
  },
};

const PAGE_NAME = "Instagram Photo & Carousel Downloader";
const PAGE_PATH = "/instagram-photo-downloader";

const FAQS = [
  {
    q: "Can I download every slide from a carousel post?",
    a: "Yes. Paste the carousel link and flip through the slides with Next and Previous — the counter shows where you are. Each slide downloads as its own file, so save the ones you want one by one.",
  },
  {
    q: "What quality are the saved images?",
    a: "The original file Instagram serves for display — JPG, PNG or WebP at full resolution. Compare the saved file, not the small in-page preview, if one looks soft.",
  },
  {
    q: "Can I download someone's profile picture?",
    a: "No. This page handles carousel posts only. Profile pictures are a different thing and are not supported.",
  },
  {
    q: "What about images posted as stories?",
    a: "Story images belong to the story pipeline, which handles their 24-hour expiry. Use the Instagram Story Downloader for those.",
  },
  {
    q: "Do I need to log in?",
    a: "No. A public post link downloads as-is; there is no sign-in step anywhere in the flow.",
  },
  {
    q: "Which image formats can I get?",
    a: "Whatever Instagram serves for that image: JPG in most cases, sometimes PNG or WebP. The format is preserved, not converted.",
  },
];

export default function CarouselDownloaderPage() {
  return (
    <>
      <Header />
      <main id="main-content" className="flex-1">
        <ToolDownloader
          initialTab="photos"
          titleA="Paste a carousel link,"
          titleB="save every slide."
          subtitle="Download public Instagram carousels at original resolution — flip through the slides, save the ones you want."
        />
        <section className="mx-auto max-w-[900px] px-5 sm:px-6 lg:px-12 pb-12">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center text-[14px] font-semibold text-fg-muted transition-colors hover:text-primary"
          >
            ← Back to Instagram Downloader
          </Link>
          <h1 className="mt-4 text-[32px] font-extrabold tracking-[-0.02em] text-fg sm:text-[42px] leading-[1.1]">Instagram Photo &amp; Carousel Downloader</h1>
          <p className="mt-4 text-[18px] leading-[1.7] text-fg-muted">
            People screenshot Instagram posts because there is no save button — then wonder why the picture looks soft when they zoom in. A screenshot captures your screen; this page captures the file. Paste the link to a public post and you get Instagram&apos;s original image, not a copy of a copy.
          </p>
          <p className="mt-3 text-[16px] leading-[1.7] text-fg-muted">
            Carousels work too, and they are the main reason this page exists. A ten-slide post would take ten screenshots; here you flip through the slides in the preview and download each image separately at full resolution.
          </p>

          <div className="mt-12 grid gap-6 rounded-[24px] p-6 sm:p-8" style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}>
            <h2 className="text-[20px] font-bold text-fg">How to download photos and carousels</h2>
            <ol className="list-decimal pl-5 space-y-2 text-[14px] leading-[1.7] text-fg-muted">
              <li><strong className="text-fg">Copy the post link</strong> — open the carousel post itself (not the profile grid), then three dots → Copy Link on desktop or Share → Copy link on mobile.</li>
              <li><strong className="text-fg">Paste it above</strong> — the Carousels tab is already selected. Tap Get Media and the images appear in the preview.</li>
              <li><strong className="text-fg">Work through the carousel</strong> — the counter tells you which slide you are on. Use Next and Previous to move, and tap Download on each image you want. Every slide is a separate file.</li>
            </ol>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <h3 className="text-[16px] font-bold text-fg">Formats and quality</h3>
              <p className="mt-2 text-[14px] leading-[1.6] text-fg-muted">JPG in most cases, sometimes PNG or WebP — exactly what Instagram serves. Files are kept as-is, never recompressed into a smaller copy.</p>
            </div>
            <div className="rounded-2xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <h3 className="text-[16px] font-bold text-fg">Straight to the gallery</h3>
              <p className="mt-2 text-[14px] leading-[1.6] text-fg-muted">Carousel images are small files that save in a tap and land directly in your gallery or downloads folder — phone, tablet or desktop, all from the browser.</p>
            </div>
          </div>

          <h2 className="mt-12 text-[24px] font-bold text-fg">What this page cannot fetch</h2>
          <p className="mt-3 text-[16px] leading-[1.7] text-fg-muted">
            Private and deleted posts are out, same as everywhere else on this site. Two image-specific boundaries: profile pictures are not supported — only carousel posts — and images posted as stories belong to the <Link href="/instagram-story-downloader" className="font-bold text-primary-strong hover:underline">Instagram Story Downloader</Link>, because stories carry a 24-hour expiry this pipeline does not track.
          </p>

          <h2 className="mt-10 text-[20px] font-bold text-fg">Photo and carousel troubleshooting</h2>
          <div className="mt-4 rounded-2xl p-5 sm:p-6" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex flex-col gap-4 text-[14px] leading-[1.7] text-fg-muted">
              <p><strong className="text-fg">Only the first slide saved.</strong> That is expected — each carousel slide is its own file. Advance with Next and tap Download on every image you want to keep.</p>
              <p><strong className="text-fg">The saved image looks blurry.</strong> Judge the downloaded file, not the small preview on the page. The file is the original resolution; the preview is just a preview.</p>
              <p><strong className="text-fg">I cannot find a link to copy.</strong> You are probably on the profile grid. Tap into the post so the single post or carousel opens, then copy the link from there.</p>
              <p><strong className="text-fg">The download starts but the file will not open.</strong> The media URL expired mid-download. Paste the post link again and save promptly.</p>
            </div>
          </div>

          <div className="mt-10 rounded-2xl p-5 sm:p-6" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex flex-col gap-4 text-[14px] leading-[1.7] text-fg-muted">
              <p><strong className="text-fg">Where the images land.</strong> Photos are small files that drop into your gallery or downloads folder in one tap. Every carousel slide is its own file, so save each one you want.</p>
              <p><strong className="text-fg">What happens to your link.</strong> Your pasted link is used only to resolve the file for your request, then it expires. The images live on your device and nowhere else — the site keeps no copy of anything you download.</p>
            </div>
          </div>

          <h2 className="mt-10 text-[18px] font-bold text-fg">Related downloaders</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              { href: "/instagram-reels-downloader", label: "Instagram Reels Downloader", desc: "Save Reels as MP4" },
              { href: "/instagram-video-downloader", label: "Instagram Video Downloader", desc: "Save videos as MP4" },
              { href: "/instagram-story-downloader", label: "Instagram Story Downloader", desc: "Save stories before they expire" },
              { href: "/instagram-audio-downloader", label: "Instagram Audio Downloader", desc: "Extract MP3 from videos" },
              { href: "/", label: "Instagram Downloader Home", desc: "All-in-one media downloader" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="rounded-2xl p-4 hover:bg-primary-light transition-colors" style={{ border: "1px solid var(--border)", background: "var(--card)" }}>
                <span className="text-[14px] font-semibold text-primary-strong">{l.label}</span>
                <span className="mt-1 block text-[14px] text-fg-muted">{l.desc}</span>
              </Link>
            ))}
          </div>

          <section className="mt-12">
            <h2 className="text-[20px] font-bold text-fg">Photo and carousel FAQ</h2>
            <div className="mt-4 space-y-3">
              {FAQS.map((item) => (
                <details key={item.q} className="group rounded-2xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                  <summary className="cursor-pointer text-[16px] font-semibold text-fg">{item.q}</summary>
                  <p className="mt-2 text-[14px] leading-[1.6] text-fg-muted">{item.a}</p>
                </details>
              ))}
            </div>
          </section>

          <p className="mt-10 text-[12px] text-fg-subtle">
            See <Link href="/#how-it-works" className="text-primary-strong hover:underline">How It Works</Link>, the <Link href="/help" className="text-primary-strong hover:underline">Help page</Link> or <Link href="/privacy" className="text-primary-strong hover:underline">Privacy</Link>.
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
