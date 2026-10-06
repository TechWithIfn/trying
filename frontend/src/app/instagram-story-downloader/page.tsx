import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/config/site";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ToolDownloader from "@/components/ToolDownloader";

export const metadata: Metadata = {
  title: { absolute: "Instagram Story Downloader – Save Stories | Downloadit" },
  description: "Download public Instagram Stories before they disappear with Downloadit. Save story images and videos from public accounts quickly — no login required.",
  alternates: { canonical: "/instagram-story-downloader" },
  openGraph: {
    title: { absolute: "Instagram Story Downloader – Save Stories | Downloadit" },
    description: "Download public Instagram Stories before they disappear with Downloadit. Save story images and videos from public accounts quickly — no login required.",
    url: `${SITE_URL}/instagram-story-downloader`,
    type: "website",
    images: [{ url: "/og-downloadit.png", width: 1200, height: 630, alt: "Instagram Story Downloader — Downloadit" }],
  },
  twitter: {
    card: "summary_large_image",
    title: { absolute: "Instagram Story Downloader – Save Stories | Downloadit" },
    description: "Download public Instagram Stories before they disappear with Downloadit. Save story images and videos from public accounts quickly — no login required.",
    images: ["/og-downloadit.png"],
  },
};

const PAGE_NAME = "Instagram Story Downloader";
const PAGE_PATH = "/instagram-story-downloader";

const FAQS = [
  {
    q: "How long do I have to save a story?",
    a: "24 hours from when it was posted. After Instagram removes it, the link goes dead and no link-based tool can bring it back — so save stories the same day you spot them.",
  },
  {
    q: "Can I download private or Close Friends stories?",
    a: "No — following the account changes nothing here. The page checks each story the way a stranger with no account would see it, so follower-only and Close Friends stories come back as private.",
  },
  {
    q: "What about highlights?",
    a: "Public highlight links often resolve through the same flow, since a highlight is a saved story. Paste the link and try — if it is public, you usually get the media; if not, you get a clear message.",
  },
  {
    q: "A story I saved yesterday is gone — can it be recovered?",
    a: "No. Once a story expires or is deleted, the underlying media is gone from Instagram's side too. There is nothing left for any downloader to fetch.",
  },
  {
    q: "What formats do story downloads come in?",
    a: "The originals: JPG for image stories, MP4 for video stories. Stickers and captions baked into the picture or clip come along; interactive bits like polls and link taps do not, since only the visible media is saved.",
  },
  {
    q: "Do I need to log in?",
    a: "No sign-in on either side: the story must be viewable without one, and you download without one.",
  },
];

export default function StoryDownloaderPage() {
  return (
    <>
      <Header />
      <main id="main-content" className="flex-1">
        <ToolDownloader
          initialTab="stories"
          titleA="Paste a story link,"
          titleB="before it expires."
          subtitle="Save a public Instagram story as image or MP4 while it's still live — after 24 hours the link goes dead."
        />
        <section className="mx-auto max-w-[900px] px-5 sm:px-6 lg:px-12 pb-12">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center text-[14px] font-semibold text-fg-muted transition-colors hover:text-primary"
          >
            ← Back to Instagram Downloader
          </Link>
          <h1 className="mt-4 text-[32px] font-extrabold tracking-[-0.02em] text-fg sm:text-[42px] leading-[1.1]">Instagram Story Downloader</h1>
          <p className="mt-4 text-[18px] leading-[1.7] text-fg-muted">
            Stories are Instagram&apos;s most time-pressured format: a photo or clip that self-destructs 24 hours after posting. Screenshots of a story are awkward mid-watch, and screen recording a 15-second clip is worse. This page exists for the narrow window while a public story is still alive — paste its link, save the original file, done.
          </p>
          <p className="mt-3 text-[16px] leading-[1.7] text-fg-muted">
            Speed matters more here than on any other page of this site. A reel waits for you; a story does not. If you found a story worth keeping, do it now rather than tonight — expiry is the single most common reason story downloads fail.
          </p>

          <div className="mt-12 grid gap-6 rounded-[24px] p-6 sm:p-8" style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}>
            <h2 className="text-[20px] font-bold text-fg">How to download a story</h2>
            <ol className="list-decimal pl-5 space-y-2 text-[14px] leading-[1.7] text-fg-muted">
              <li><strong className="text-fg">Copy the story link while it is live</strong> — from the story viewer via Share, or from the browser address bar on desktop. A link to an already-expired story is useless, so check the story still opens first.</li>
              <li><strong className="text-fg">Paste it above right away</strong> — the Stories tab is already selected. Tap Get Media; image stories resolve in seconds, video stories take a little longer.</li>
              <li><strong className="text-fg">Save immediately</strong> — preview to confirm, then Download. Do not leave the tab sitting for hours: both the story and its signed media URL are on clocks.</li>
            </ol>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <h3 className="text-[16px] font-bold text-fg">What stories are covered</h3>
              <p className="mt-2 text-[14px] leading-[1.6] text-fg-muted">Public story photos (JPG) and story videos (MP4) in their original files. Public highlight links usually resolve through the same flow — paste one and see.</p>
            </div>
            <div className="rounded-2xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <h3 className="text-[16px] font-bold text-fg">Phones beat desktops here</h3>
              <p className="mt-2 text-[14px] leading-[1.6] text-fg-muted">Stories are found on phones and expire fast, so saving from the mobile browser into Gallery or Downloads is the natural flow. Desktop works identically if that is where you are.</p>
            </div>
          </div>

          <h2 className="mt-12 text-[24px] font-bold text-fg">Stories this page cannot fetch</h2>
          <p className="mt-3 text-[16px] leading-[1.7] text-fg-muted">
            Expiry first: past 24 hours, the story is gone from Instagram and there is nothing left to resolve — no tool can recover it, and anyone claiming otherwise is selling something. Then the usual walls: private accounts, Close Friends, deleted stories. Being able to watch a story yourself because you follow the account does not make it downloadable. The rule is the same as everywhere on this site: if it takes a login to watch, it cannot be fetched.
          </p>

          <h2 className="mt-10 text-[20px] font-bold text-fg">Story troubleshooting</h2>
          <div className="mt-4 rounded-2xl p-5 sm:p-6" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex flex-col gap-4 text-[14px] leading-[1.7] text-fg-muted">
              <p><strong className="text-fg">“Expired / not found” on a story I saw today.</strong> The 24-hour clock runs from posting, not from when you saw it. A story from last night is already gone this evening. Save earlier next time.</p>
              <p><strong className="text-fg">It says private, but I follow them.</strong> Watching while logged in does not count. If a story needs you to be a follower — or logged in at all — it lands in the private bucket.</p>
              <p><strong className="text-fg">The link worked this morning and is dead now.</strong> Two clocks run at once: the story&apos;s 24 hours and the signed media URL&apos;s much shorter life. Re-paste the story link to mint a new media URL — unless the story itself aged out, in which case there is nothing left to resolve.</p>
              <p><strong className="text-fg">Stickers and polls — do they come along?</strong> What you see baked into the picture or clip is saved with it. Interactive elements — poll taps, question boxes, link stickers — do not carry over, because only the visible media file is downloaded.</p>
            </div>
          </div>

          <h2 className="mt-10 text-[18px] font-bold text-fg">Related downloaders</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              { href: "/instagram-reels-downloader", label: "Instagram Reels Downloader", desc: "Save Reels as MP4" },
              { href: "/instagram-photo-downloader", label: "Instagram Photo Downloader", desc: "Save photos as JPG" },
              { href: "/instagram-video-downloader", label: "Instagram Video Downloader", desc: "Save videos as MP4" },
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
            <h2 className="text-[20px] font-bold text-fg">Story downloading FAQ</h2>
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
