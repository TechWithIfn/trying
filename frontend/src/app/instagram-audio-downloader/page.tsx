import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/config/site";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ToolDownloader from "@/components/ToolDownloader";
import ProseSection from "@/components/ProseSection";
import ReadMore from "@/components/ReadMore";

export const metadata: Metadata = {
  title: { absolute: "Instagram Audio Downloader – Save Audio as MP3 | Downloadit" },
  description: "Extract music and sound from public Reels and videos as MP3. Paste a link and download the audio track with Downloadit — free, no login required.",
  alternates: { canonical: "/instagram-audio-downloader" },
  openGraph: {
    title: { absolute: "Instagram Audio Downloader – Save Audio as MP3 | Downloadit" },
    description: "Extract music and sound from public Reels and videos as MP3. Paste a link and download the audio track with Downloadit — free, no login required.",
    url: `${SITE_URL}/instagram-audio-downloader`,
    type: "website",
    images: [{ url: "/og-downloadit.png", width: 1200, height: 630, alt: "Instagram Audio Downloader — Downloadit" }],
  },
  twitter: {
    card: "summary_large_image",
    title: { absolute: "Instagram Audio Downloader – Save Audio as MP3 | Downloadit" },
    description: "Extract music and sound from public Reels and videos as MP3. Paste a link and download the audio track with Downloadit — free, no login required.",
    images: ["/og-downloadit.png"],
  },
};

const PAGE_NAME = "Instagram Audio Downloader";
const PAGE_PATH = "/instagram-audio-downloader";

const FAQS = [
  {
    q: "Which links can I pull sound from?",
    a: "Public reel and video links — the same posts the video pages accept. The tool opens the clip and lifts out its audio track as an MP3. Photo posts and stories have no such track to lift, and private clips are excluded either way.",
  },
  {
    q: "Why does audio take longer than saving a video?",
    a: "A video download hands you Instagram's file directly. Audio has to be processed on the server first — the clip is fetched, the track is separated, and the MP3 is built for you. That work grows with the clip's length, so a short reel finishes quickly while a long talk keeps you waiting.",
  },
  {
    q: "Can I keep just a chorus or a single quote instead of the whole thing?",
    a: "The tool always returns the full clip's sound as one MP3, with no trimming step inside. Take the whole file and cut the part you need afterwards in any free audio app or phone editor — that keeps this page simple and predictable.",
  },
  {
    q: "Will the MP3 sound better than the video did?",
    a: "No — it mirrors the source exactly. Extraction moves the clip's own audio into an MP3 without improving it. A crisp recording gives a crisp MP3; a windy, distant or muffled original stays that way in the file.",
  },
  {
    q: "What does temporarily unavailable mean on the audio tab?",
    a: "The server-side audio queue is full at that moment. It is a capacity notice, not a broken link — wait a while and retry the same post link. If you need something immediately, save the MP4 through the video downloader first so you at least hold the file.",
  },
  {
    q: "Where do MP3s play after I save them?",
    a: "Almost everywhere. Phone music apps, messaging apps, car stereos, laptops, smart speakers — MP3 is the one audio format everything opens, with no special software needed on your side.",
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
            Sometimes the picture is beside the point. A voice explaining an idea you want to replay on a walk, a demo of your own song, a spoken quote worth quoting back accurately, a sleepy lullaby playing behind a reel. Instagram stores sound and picture together, with no button for the sound alone. This page separates the two: paste the link to a public reel or video and take home just the audio as an MP3 you can listen to anywhere.
          </p>
          <p className="mt-3 text-[16px] leading-[1.7] text-fg-muted">
            Listening is the intent that sets this page apart. Video pages are about watching; this one is about carrying the sound in your pocket — in earphones, in the car, in a playlist of reference clips. If you caught yourself thinking I wish I could just hear that again, this is the tool for that sentence.
          </p>

          <ProseSection>
          <ReadMore label="audio guide">
          <h2>When saving the sound beats saving the video</h2>
          <p>
            Musicians and voice artists keep their own demos and takes — comparing versions, sending a quick draft to a collaborator, checking a mix on different speakers. Students lean on spoken material the same way: a pronunciation example, a speech to transcribe, replayed with the screen off on a commute.
          </p>
          <p className="mt-3 text-[16px] leading-[1.7] text-fg-muted">
            Creators and marketers keep original sounds they own for editing reference: the voiceover from their own reel, the jingle from their own ad, a testimonial they recorded and have permission to reuse. An MP3 drops straight into a timeline where a video file would first need stripping.
          </p>

          <div className="mt-12">
            <h2>How to extract audio, step by step</h2>
            <h3 className="text-[16px] font-bold text-fg">On Android</h3>
            <ol className="list-decimal pl-5 space-y-2 text-[14px] leading-[1.7] text-fg-muted">
              <li>Open the public reel or video whose sound you want and copy its link with Share and Copy link.</li>
              <li>Open this page in your mobile browser. The Audio tab is already selected.</li>
              <li>Paste the link, tap Get Media, and leave the tab open while the server works. Short reels take a little while; long videos take proportionally longer.</li>
              <li>When the MP3 is ready, tap Download. It lands in Downloads and opens in any music app.</li>
            </ol>
            <h3 className="text-[16px] font-bold text-fg">On iPhone</h3>
            <ol className="list-decimal pl-5 space-y-2 text-[14px] leading-[1.7] text-fg-muted">
              <li>Copy the reel or video link from the Instagram app the usual way.</li>
              <li>Paste it into the downloader above in Safari, with the Audio tab selected, and tap Get Media.</li>
              <li>Keep Safari open on this tab. Closing it or letting the phone sleep mid-job abandons that attempt.</li>
              <li>Tap Download once processing finishes. The MP3 sits in Files under Downloads — move it into your music app or share it onward from there.</li>
            </ol>
            <h3 className="text-[16px] font-bold text-fg">On desktop</h3>
            <ol className="list-decimal pl-5 space-y-2 text-[14px] leading-[1.7] text-fg-muted">
              <li>Copy the address of the public reel or video post from your browser.</li>
              <li>Paste it into the box at the top of this page and click Get Media with Audio selected.</li>
              <li>Wait for processing to complete — this is the one page where patience is part of the flow.</li>
              <li>Click Download. The MP3 goes to your downloads folder and plays in any desktop player or editor.</li>
            </ol>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-[16px] font-bold text-fg">Format and quality for audio</h3>
              <p className="mt-2 text-[14px] leading-[1.6] text-fg-muted">Every result is one full-length MP3 holding the clip&apos;s own audio track — no cuts, no enhancement. A clean recording gives a clean MP3; what the clip sounds like is what you keep.</p>
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-fg">Why audio has a queue</h3>
              <p className="mt-2 text-[14px] leading-[1.6] text-fg-muted">Unlike straight video downloads, extraction is real server work per clip, so busy periods build a queue. The page says so openly instead of failing quietly — retry later, or grab the MP4 from the video page meanwhile.</p>
            </div>
          </div>

          <h2 className="mt-12 text-[24px] font-bold text-fg">Audio this page cannot fetch</h2>
          <p className="mt-3 text-[16px] leading-[1.7] text-fg-muted">
            Private reels and videos are excluded exactly like the video pages — only clips a logged-out visitor can watch qualify. Extraction also needs a clip to pull from, so photo posts and text-only stories have nothing to give. And at peak times the queue itself is the limit: the honest answer is to wait and retry, not to hammer the same link.
          </p>

          <h2 className="mt-10 text-[20px] font-bold text-fg">Audio troubleshooting</h2>
          <div className="mt-4">
            <div>
              <p><strong className="text-fg">Processing seems stuck.</strong> Give it time scaled to the clip — a minute-long reel is quick, a ten-minute video is not. Keep the tab in the foreground with a steady connection rather than starting five attempts at once.</p>
              <p><strong className="text-fg">The MP3 came out silent.</strong> Extraction copies the track; it cannot invent missing sound. If the source clip plays silently on Instagram, the MP3 will be silent too — check the original first.</p>
              <p><strong className="text-fg">I only wanted a few seconds.</strong> Take the full MP3 and trim it afterwards. Phone editors and free desktop apps cut MP3s in seconds, and keeping the full file first means you never lose the surrounding context.</p>
              <p><strong className="text-fg">The same link fails repeatedly.</strong> Confirm the post is still public and still exists, then paste a freshly copied link. Deleted and privatised clips fail here by design.</p>
            </div>
          </div>

          <h2 className="mt-10 text-[20px] font-bold text-fg">Music belongs to someone — handle it with care</h2>
          <p className="mt-3 text-[14px] leading-[1.7] text-fg-muted">
            This warning matters more for audio than anywhere else, because songs and voice recordings carry the strictest rights. Keep your own recordings freely, save other audio for private listening, and never re-upload, remix or sample someone else&apos;s music or voice without written permission. A trending sound is not a free sound. Rights holders can request a review via the <Link href="/dmca" className="font-bold text-primary-strong hover:underline">DMCA page</Link> and <Link href="/terms" className="font-bold text-primary-strong hover:underline">Terms</Link>. Only download content you own or have permission to reuse.
          </p>
          </ReadMore>
          </ProseSection>

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

          <h2 className="mt-10 text-[18px] font-bold text-fg">Related guides</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              { href: "/blog/extract-audio-own-reels-editing", label: "How to Extract Audio for Editing" },
              { href: "/blog/downloaded-video-no-sound", label: "Why Your Downloaded Video Has No Sound" },
              { href: "/blog/is-it-legal-download-instagram-videos", label: "Is It Legal to Download Videos?" },
              { href: "/blog/students-saved-instagram-study", label: "How Students Use Saved Content for Study" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="rounded-2xl p-4 hover:bg-primary-light transition-colors" style={{ border: "1px solid var(--border)", background: "var(--card)" }}>
                <span className="text-[14px] font-semibold text-primary-strong">{l.label}</span>
                <span className="mt-1 block text-[14px] text-fg-muted">Downloadit Blog guide</span>
              </Link>
            ))}
          </div>

          <ProseSection>
          <section className="mt-12">
            <h2>Audio downloading FAQ</h2>
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
