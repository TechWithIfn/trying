import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/config/site";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ToolDownloader from "@/components/ToolDownloader";

export const metadata: Metadata = {
  title: { absolute: "Instagram Reels Downloader – Save Reels as MP4 | Downloadit" },
  description: "Download public Instagram Reels as MP4 with Downloadit. Preview trending reels and save them to your phone quickly — no login required.",
  alternates: { canonical: "/instagram-reels-downloader" },
  openGraph: {
    title: { absolute: "Instagram Reels Downloader – Save Reels as MP4 | Downloadit" },
    description: "Download public Instagram Reels as MP4 with Downloadit. Preview trending reels and save them to your phone quickly — no login required.",
    url: `${SITE_URL}/instagram-reels-downloader`,
    type: "website",
    images: [{ url: "/og-downloadit.png", width: 1200, height: 630, alt: "Instagram Reels Downloader — Downloadit" }],
  },
  twitter: {
    card: "summary_large_image",
    title: { absolute: "Instagram Reels Downloader – Save Reels as MP4 | Downloadit" },
    description: "Download public Instagram Reels as MP4 with Downloadit. Preview trending reels and save them to your phone quickly — no login required.",
    images: ["/og-downloadit.png"],
  },
};

const PAGE_NAME = "Instagram Reels Downloader";
const PAGE_PATH = "/instagram-reels-downloader";

const FAQS = [
  {
    q: "Can I download a private Instagram Reel?",
    a: "No. Downloadit only fetches reels that are visible to a logged-out visitor. If a reel needs a login or a follow to watch, the tool reports it as private and stops there.",
  },
  {
    q: "What does a Reels link look like?",
    a: "Reel links look like instagram.com/reel/ followed by a short code. Copy the full link with the Share button's Copy link option and paste it as-is — trimming it by hand is what usually breaks it.",
  },
  {
    q: "Do saved reels have a watermark?",
    a: "No. You get the original MP4 Instagram streams, with nothing stamped onto the picture. Captions and on-screen text that are part of the video stay, because they are part of the video.",
  },
  {
    q: "How do I save a reel to my phone gallery?",
    a: "Copy the reel link in the Instagram app, paste it into the downloader above, and tap Download on the preview. On Android it lands in Downloads or Gallery; on iPhone it lands in Downloads — open the Files app if you don't see it right away.",
  },
  {
    q: "What is the difference between the Reels and Video downloaders?",
    a: "Almost nothing behind the scenes — the tabs are presets for the same pipeline, and pasting any public link lets detection sort out the type by itself. This page simply opens with the Reels tab already selected.",
  },
  {
    q: "Do I need to log in to download reels?",
    a: "There is no login, no account, and no password field — the page does not have one. A public link is the entire requirement.",
  },
];

export default function ReelsDownloaderPage() {
  return (
    <>
      <Header />
      <main id="main-content" className="flex-1">
        <ToolDownloader
          initialTab="reels"
          titleA="Paste a Reels link,"
          titleB="save the MP4."
          subtitle="Drop a public Instagram Reels link into the downloader and save the original MP4 — preview it first, no login, nothing to install."
        />
        <section className="mx-auto max-w-[900px] px-5 sm:px-6 lg:px-12 pb-12">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center text-[14px] font-semibold text-fg-muted transition-colors hover:text-primary"
          >
            ← Back to Instagram Downloader
          </Link>
          <h1 className="mt-4 text-[32px] font-extrabold tracking-[-0.02em] text-fg sm:text-[42px] leading-[1.1]">
            Instagram Reels Downloader
          </h1>
          <p className="mt-4 text-[18px] leading-[1.7] text-fg-muted">
            Reels are the short vertical clips people pass around in chats and feeds — a funny moment, a recipe, a trick someone wants to try later. The problem is that Instagram never gives you a save button for them. This page does one job: turn a public Reels link into an MP4 on your phone.
          </p>
          <p className="mt-3 text-[16px] leading-[1.7] text-fg-muted">
            It works with the link Instagram already gives you. Open the reel, tap Share, tap Copy link, and paste it into the downloader above. You see a preview of the actual file before anything is saved, so there is no guessing whether you grabbed the right clip.
          </p>

          <div className="mt-12 grid gap-6 rounded-[24px] p-6 sm:p-8" style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}>
            <h2 className="text-[20px] font-bold text-fg">How to download a reel</h2>
            <ol className="list-decimal pl-5 space-y-2 text-[14px] leading-[1.7] text-fg-muted">
              <li><strong className="text-fg">Copy the Reels link</strong> — open the reel in the Instagram app, tap the Share (paper plane) icon, then Copy link. Links sent to you in a chat work the same way, as long as the reel itself is public.</li>
              <li><strong className="text-fg">Paste it above</strong> — the Reels tab is already selected. Tap Get Media and wait a few seconds while the link is resolved.</li>
              <li><strong className="text-fg">Preview, then save</strong> — the preview plays the real MP4. If it is the right reel, tap Download and the file saves to your device.</li>
            </ol>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <h3 className="text-[16px] font-bold text-fg">Format and quality</h3>
              <p className="mt-2 text-[14px] leading-[1.6] text-fg-muted">MP4, vertical, the same file Instagram streams to your phone. Nothing is re-compressed and no watermark is added — effects, captions and music baked into the reel come along because they are part of that file.</p>
            </div>
            <div className="rounded-2xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <h3 className="text-[16px] font-bold text-fg">Phones first, desktop fine too</h3>
              <p className="mt-2 text-[14px] leading-[1.6] text-fg-muted">Most reels get saved on phones, straight from the mobile browser into Downloads or Gallery. The same page works on tablets and desktops with no install.</p>
            </div>
          </div>

          <h2 className="mt-12 text-[24px] font-bold text-fg">Reels this page cannot fetch</h2>
          <p className="mt-3 text-[16px] leading-[1.7] text-fg-muted">
            The tool sees what a logged-out visitor sees. If you can watch a reel only because you follow a private account, or only while logged in, it counts as non-public here and you get a clear private message instead of a file. Deleted reels behave the same way. Only reels that are genuinely public can be downloaded — that is a hard rule, not a setting.
          </p>
          <p className="mt-3 text-[16px] leading-[1.7] text-fg-muted">
            Want just the sound from a reel instead of the video? The <Link href="/instagram-audio-downloader" className="font-bold text-primary-strong hover:underline">Instagram Audio Downloader</Link> extracts it as MP3.
          </p>

          <h2 className="mt-10 text-[20px] font-bold text-fg">Reels troubleshooting</h2>
          <div className="mt-4 rounded-2xl p-5 sm:p-6" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex flex-col gap-4 text-[14px] leading-[1.7] text-fg-muted">
              <p><strong className="text-fg">It says private, but I can watch the reel.</strong> You can watch it because you follow the account or are logged in. The downloader checks what is visible without any login, so follower-only reels are correctly out of reach.</p>
              <p><strong className="text-fg">The preview played, but the download is tiny or empty.</strong> Instagram signs media links for a short time and yours died between preview and tap. Paste the reel link again and download right away this time.</p>
              <p><strong className="text-fg">The saved reel seems to have no sound.</strong> The MP4 carries the reel&apos;s original audio track. Check your volume and silent switch first — if the reel plays silently on Instagram itself, the file will be silent too.</p>
              <p><strong className="text-fg">A link copied from a chat does not work.</strong> Some apps cut long links short. Copy it again with Share → Copy link and paste the complete URL.</p>
            </div>
          </div>

          <h2 className="mt-10 text-[18px] font-bold text-fg">Related downloaders</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              { href: "/instagram-video-downloader", label: "Instagram Video Downloader", desc: "Save standard video posts as MP4" },
              { href: "/instagram-photo-downloader", label: "Instagram Photo Downloader", desc: "Save photos and carousel slides as JPG" },
              { href: "/instagram-story-downloader", label: "Instagram Story Downloader", desc: "Save stories before they expire" },
              { href: "/instagram-audio-downloader", label: "Instagram Audio Downloader", desc: "Extract MP3 audio from Reels" },
              { href: "/", label: "Instagram Downloader Home", desc: "All-in-one media downloader" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="rounded-2xl p-4 hover:bg-primary-light transition-colors" style={{ border: "1px solid var(--border)", background: "var(--card)" }}>
                <span className="text-[14px] font-semibold text-primary-strong">{l.label}</span>
                <span className="mt-1 block text-[14px] text-fg-muted">{l.desc}</span>
              </Link>
            ))}
          </div>

          <section className="mt-12">
            <h2 className="text-[20px] font-bold text-fg">Reels downloading FAQ</h2>
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
            Stuck on a step? See <Link href="/#how-it-works" className="text-primary-strong hover:underline">How It Works</Link>, the <Link href="/help" className="text-primary-strong hover:underline">Help page</Link> or our <Link href="/privacy" className="text-primary-strong hover:underline">Privacy Policy</Link>.
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
