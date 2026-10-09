import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/config/site";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ToolDownloader from "@/components/ToolDownloader";

export const metadata: Metadata = {
  title: { absolute: "Instagram Audio Downloader – Save Audio as MP3 | Downloadit" },
  description: "Download Instagram audio as MP3 with Downloadit. Extract and save music or sound from public Reels and videos — no login required.",
  alternates: { canonical: "/instagram-audio-downloader" },
  openGraph: {
    title: { absolute: "Instagram Audio Downloader – Save Audio as MP3 | Downloadit" },
    description: "Download Instagram audio as MP3 with Downloadit. Extract and save music or sound from public Reels and videos — no login required.",
    url: `${SITE_URL}/instagram-audio-downloader`,
    type: "website",
    images: [{ url: "/og-downloadit.png", width: 1200, height: 630, alt: "Instagram Audio Downloader — Downloadit" }],
  },
  twitter: {
    card: "summary_large_image",
    title: { absolute: "Instagram Audio Downloader – Save Audio as MP3 | Downloadit" },
    description: "Download Instagram audio as MP3 with Downloadit. Extract and save music or sound from public Reels and videos — no login required.",
    images: ["/og-downloadit.png"],
  },
};

const PAGE_NAME = "Instagram Audio Downloader";
const PAGE_PATH = "/instagram-audio-downloader";

const FAQS = [
  {
    q: "Which links work for audio extraction?",
    a: "Links to public reels and videos — the same links the video pages accept. The tool pulls the audio track out of the clip. Private reels and videos are excluded, same as everywhere else here.",
  },
  {
    q: "How long does audio extraction take?",
    a: "Longer than a straight video download, because the server processes the clip instead of just handing you the file. Expect the wait to grow with the video's length — a short reel is quick, a long video is not.",
  },
  {
    q: "What quality is the MP3?",
    a: "It mirrors the source video's own audio track. Extraction copies that track into an MP3 — it cannot improve a muffled or quiet original, so what the clip sounds like is what you get.",
  },
  {
    q: "Can I extract only part of a clip?",
    a: "No. You always get the full clip's audio as one MP3. There is no trimming or section selection in the tool — if you need a fragment, cut the MP3 afterwards in any audio app.",
  },
  {
    q: "Can I download private Instagram audio?",
    a: "No. Only audio from videos you can watch without logging in is supported.",
  },
  {
    q: "Do I need to log in?",
    a: "No account involved at any point — link in, MP3 out.",
  },
];

export default function AudioDownloaderPage() {
  return (
    <>
      <Header />
      <main id="main-content" className="flex-1">
        <ToolDownloader
          initialTab="audio"
          titleA="Paste a video link,"
          titleB="take the MP3."
          subtitle="Extract the audio from a public Reel or video and save it as MP3 — Audio mode is preselected below."
        />
        <section className="mx-auto max-w-[900px] px-5 sm:px-6 lg:px-12 pb-12">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center text-[14px] font-semibold text-fg-muted transition-colors hover:text-primary"
          >
            ← Back to Instagram Downloader
          </Link>
          <h1 className="mt-4 text-[32px] font-extrabold tracking-[-0.02em] text-fg sm:text-[42px] leading-[1.1]">Instagram Audio Downloader</h1>
          <p className="mt-4 text-[18px] leading-[1.7] text-fg-muted">
            Sometimes the video is beside the point. A trending sound you want to listen to on a walk, a speech worth replaying, a clip whose picture you will never watch again — what you actually want is the sound. This page pulls the audio track out of a public reel or video and hands it to you as an MP3.
          </p>
          <p className="mt-3 text-[16px] leading-[1.7] text-fg-muted">
            Be aware of the one real difference from the other pages: video downloads hand you Instagram&apos;s file directly, while audio has to be processed on the server first. That takes longer, and at busy moments there is a queue — the page tells you so instead of failing silently.
          </p>

          <div className="mt-12 grid gap-6 rounded-[24px] p-6 sm:p-8" style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}>
            <h2 className="text-[20px] font-bold text-fg">How to extract audio</h2>
            <ol className="list-decimal pl-5 space-y-2 text-[14px] leading-[1.7] text-fg-muted">
              <li><strong className="text-fg">Copy a reel or video link</strong> — any public reel or video whose sound you want, copied the usual way via Share → Copy link.</li>
              <li><strong className="text-fg">Paste it above in Audio mode</strong> — the Audio tab is already selected. Tap Get Media and leave the tab open while the server works; longer videos take proportionally longer.</li>
              <li><strong className="text-fg">Download the MP3</strong> — once processing finishes, save the file. It plays in any music app, messaging app or desktop player.</li>
            </ol>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <h3 className="text-[16px] font-bold text-fg">Format and quality</h3>
              <p className="mt-2 text-[14px] leading-[1.6] text-fg-muted">MP3 holding the source clip&apos;s own audio track — full length, no trimming. Quality mirrors the original: a crisp reel gives a crisp MP3, a muffled clip gives a muffled one.</p>
            </div>
            <div className="rounded-2xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <h3 className="text-[16px] font-bold text-fg">Plays absolutely anywhere</h3>
              <p className="mt-2 text-[14px] leading-[1.6] text-fg-muted">MP3 is the one format everything opens — phone music apps, voice-note sharing, car stereos, desktop players. No special app needed on your side.</p>
            </div>
          </div>

          <h2 className="mt-12 text-[24px] font-bold text-fg">Audio this page cannot fetch</h2>
          <p className="mt-3 text-[16px] leading-[1.7] text-fg-muted">
            Private reels and videos are excluded, exactly like the video pages. Extraction also only works from reel and video links — it pulls the track out of a clip, so there must be a clip to pull from. And one honest caveat: because processing happens server-side, the audio queue can fill up. If it has, the page says so outright with a &quot;temporarily unavailable&quot; notice. Wait a while and retry — or save the MP4 with the <Link href="/instagram-video-downloader" className="font-bold text-primary-strong hover:underline">Instagram Video Downloader</Link> in the meantime so at least you have the file.
          </p>
          <p className="mt-3 text-[16px] leading-[1.7] text-fg-muted">
            A reminder that matters more for audio than video: music belongs to someone. Only keep tracks you have a right to use — see the <Link href="/dmca" className="text-primary hover:underline">DMCA page</Link> if you are unsure.
          </p>

          <h2 className="mt-10 text-[20px] font-bold text-fg">Audio troubleshooting</h2>
          <div className="mt-4 rounded-2xl p-5 sm:p-6" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex flex-col gap-4 text-[14px] leading-[1.7] text-fg-muted">
              <p><strong className="text-fg">“Temporarily unavailable.”</strong> The backend audio queue is busy, not broken. Wait a bit and retry the same link — and if you need something now, grab the MP4 from the video downloader first.</p>
              <p><strong className="text-fg">Processing takes very long.</strong> Normal for long videos — the wait scales with clip length. Keep the tab open; closing it abandons that attempt and you start over.</p>
              <p><strong className="text-fg">The MP3 is silent.</strong> Extraction copies the track, it cannot restore missing audio. If the source clip plays silently on Instagram, the MP3 will be silent too.</p>
              <p><strong className="text-fg">I only wanted part of the clip.</strong> The tool returns the whole track with no trimming step. Take the full MP3 and cut the fragment in any free audio app afterwards.</p>
            </div>
          </div>

          <div className="mt-10 rounded-2xl p-5 sm:p-6" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex flex-col gap-4 text-[14px] leading-[1.7] text-fg-muted">
              <p><strong className="text-fg">Where the MP3 lands.</strong> You get one full-length MP3 per clip, no trimming, and it plays in any music app, messaging app or desktop player. Keep the tab open while extraction runs so the job is not interrupted.</p>
              <p><strong className="text-fg">What happens to your link.</strong> Audio is processed on the server, so your link travels a step further than a straight video download. It is still used only for your request and expires afterwards — music you save lives on your device.</p>
            </div>
          </div>

          <h2 className="mt-10 text-[18px] font-bold text-fg">Related downloaders</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              { href: "/instagram-reels-downloader", label: "Instagram Reels Downloader", desc: "Save Reels as MP4" },
              { href: "/instagram-video-downloader", label: "Instagram Video Downloader", desc: "Save videos as MP4" },
              { href: "/instagram-photo-downloader", label: "Instagram Photo & Carousel Downloader", desc: "Save photos and carousels as JPG" },
              { href: "/instagram-story-downloader", label: "Instagram Story Downloader", desc: "Save stories before they expire" },
              { href: "/", label: "Instagram Downloader Home", desc: "All-in-one media downloader" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="rounded-2xl p-4 hover:bg-primary-light transition-colors" style={{ border: "1px solid var(--border)", background: "var(--card)" }}>
                <span className="text-[14px] font-semibold text-primary-strong">{l.label}</span>
                <span className="mt-1 block text-[14px] text-fg-muted">{l.desc}</span>
              </Link>
            ))}
          </div>

          <section className="mt-12">
            <h2 className="text-[20px] font-bold text-fg">Audio downloading FAQ</h2>
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
