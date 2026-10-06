import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/config/site";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ToolDownloader from "@/components/ToolDownloader";

export const metadata: Metadata = {
  title: { absolute: "Instagram Video Downloader – Save Videos as MP4 | Downloadit" },
  description: "Download public Instagram videos and Reels as MP4 with Downloadit. Paste a link, preview the video and save it in HD — no login required.",
  alternates: { canonical: "/instagram-video-downloader" },
  openGraph: {
    title: { absolute: "Instagram Video Downloader – Save Videos as MP4 | Downloadit" },
    description: "Download public Instagram videos and Reels as MP4 with Downloadit. Paste a link, preview the video and save it in HD — no login required.",
    url: `${SITE_URL}/instagram-video-downloader`,
    type: "website",
    images: [{ url: "/og-downloadit.png", width: 1200, height: 630, alt: "Instagram Video Downloader — Downloadit" }],
  },
  twitter: {
    card: "summary_large_image",
    title: { absolute: "Instagram Video Downloader – Save Videos as MP4 | Downloadit" },
    description: "Download public Instagram videos and Reels as MP4 with Downloadit. Paste a link, preview the video and save it in HD — no login required.",
    images: ["/og-downloadit.png"],
  },
};

const PAGE_NAME = "Instagram Video Downloader";
const PAGE_PATH = "/instagram-video-downloader";

const FAQS = [
  {
    q: "What is the difference between the Video and Reels downloaders?",
    a: "The tabs are presets for the same pipeline. Paste any public video link on either page and detection sorts out the type by itself — this page simply opens with the Videos tab already selected.",
  },
  {
    q: "What quality are downloaded videos?",
    a: "The original MP4 Instagram serves for playback, in HD. Nothing is re-compressed and no watermark is added.",
  },
  {
    q: "How large are video files and how long does saving take?",
    a: "It depends on the clip's length — a minute-long video is a few dozen megabytes, longer ones proportionally more. Transfer time depends on your connection, so longer videos need a steady signal and free storage space.",
  },
  {
    q: "Can I download a private video?",
    a: "No. Private, Close Friends and removed videos return a clear error. Only videos anyone can watch without logging in are eligible.",
  },
  {
    q: "Can I watch a saved video offline?",
    a: "Yes. The MP4 plays in any video player — your phone gallery, VLC, or a desktop player — with no internet needed.",
  },
  {
    q: "Do I need an account to download Instagram videos?",
    a: "None. If a stranger with no account can play it, you can download it the same way.",
  },
];

export default function VideoDownloaderPage() {
  return (
    <>
      <Header />
      <main id="main-content" className="flex-1">
        <ToolDownloader
          initialTab="videos"
          titleA="Paste a video link,"
          titleB="keep it offline."
          subtitle="Save public Instagram videos and long clips as MP4 for offline watching — preview the file first, no account needed."
        />
        <section className="mx-auto max-w-[900px] px-5 sm:px-6 lg:px-12 pb-12">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center text-[14px] font-semibold text-fg-muted transition-colors hover:text-primary"
          >
            ← Back to Instagram Downloader
          </Link>
          <h1 className="mt-4 text-[32px] font-extrabold tracking-[-0.02em] text-fg sm:text-[42px] leading-[1.1]">Instagram Video Downloader</h1>
          <p className="mt-4 text-[18px] leading-[1.7] text-fg-muted">
            Not everything on Instagram is a fifteen-second reel. Interviews, match highlights, talks, full-length clips people post to their grid — the kind of video you want to finish on a flight or rewatch without burning mobile data. This page saves those as MP4 files you can keep.
          </p>
          <p className="mt-3 text-[16px] leading-[1.7] text-fg-muted">
            Paste the link to a public video post above and you get the original file Instagram streams: same picture, same sound, playable anywhere. One thing to know upfront — longer videos mean bigger files, so check you have storage space and a decent connection before a long clip.
          </p>

          <div className="mt-12 grid gap-6 rounded-[24px] p-6 sm:p-8" style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}>
            <h2 className="text-[20px] font-bold text-fg">How to download a video</h2>
            <ol className="list-decimal pl-5 space-y-2 text-[14px] leading-[1.7] text-fg-muted">
              <li><strong className="text-fg">Copy the video link</strong> — on desktop open the post and use the three dots → Copy Link; on mobile open the post, tap Share, then Copy link. Copy the post itself, not your profile grid.</li>
              <li><strong className="text-fg">Paste it above</strong> — the Videos tab is already selected. Tap Get Media. If the link turns out to be a reel, the tab switches over by itself; you do not need to start over.</li>
              <li><strong className="text-fg">Preview, then save</strong> — confirm it is the right video and tap Download. For long clips give the transfer time; the file plays offline afterwards in any player.</li>
            </ol>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <h3 className="text-[16px] font-bold text-fg">Format and quality</h3>
              <p className="mt-2 text-[14px] leading-[1.6] text-fg-muted">MP4 in the original HD Instagram serves — the same stream your phone plays, saved as a file. No conversion, no added watermark.</p>
            </div>
            <div className="rounded-2xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <h3 className="text-[16px] font-bold text-fg">Watch anywhere after</h3>
              <p className="mt-2 text-[14px] leading-[1.6] text-fg-muted">The MP4 opens in gallery apps, VLC and desktop players with no internet. Good for flights, commutes and weak-signal areas.</p>
            </div>
          </div>

          <h2 className="mt-12 text-[24px] font-bold text-fg">Videos this page cannot fetch</h2>
          <p className="mt-3 text-[16px] leading-[1.7] text-fg-muted">
            Private, Close Friends, deleted and restricted videos are out — the backend names the actual category instead of handing you a broken file. Media links also expire: Instagram signs them for a short window, so a link that worked an hour ago may need re-resolving. That is normal, not a bug.
          </p>
          <p className="mt-3 text-[16px] leading-[1.7] text-fg-muted">
            Only interested in the soundtrack? The <Link href="/instagram-audio-downloader" className="font-bold text-primary-strong hover:underline">Instagram Audio Downloader</Link> pulls the audio out as MP3.
          </p>

          <h2 className="mt-10 text-[20px] font-bold text-fg">Video troubleshooting</h2>
          <div className="mt-4 rounded-2xl p-5 sm:p-6" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex flex-col gap-4 text-[14px] leading-[1.7] text-fg-muted">
              <p><strong className="text-fg">The download stalls halfway.</strong> Usually a dropped connection or full storage on a big file. Free up space, get back on stable Wi-Fi, and resolve the link again so the URLs are fresh.</p>
              <p><strong className="text-fg">It plays in the preview but will not save on my iPhone.</strong> iPhones put the file in Downloads rather than Photos. Open the Files app → Downloads and it should be there.</p>
              <p><strong className="text-fg">The preview shows the wrong video.</strong> You likely copied a profile or grid URL instead of the post URL. Open the video post itself and copy its link.</p>
              <p><strong className="text-fg">“Expired link” message.</strong> Signed media URLs die fast. Paste the original post link once more and download promptly.</p>
            </div>
          </div>

          <h2 className="mt-10 text-[18px] font-bold text-fg">Related downloaders</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              { href: "/instagram-reels-downloader", label: "Instagram Reels Downloader", desc: "Save Reels as MP4" },
              { href: "/instagram-photo-downloader", label: "Instagram Photo Downloader", desc: "Save photos as JPG" },
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
            <h2 className="text-[20px] font-bold text-fg">Video downloading FAQ</h2>
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
