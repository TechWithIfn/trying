"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import ToolDownloader from "@/components/ToolDownloader";
import ProseSection from "@/components/ProseSection";
import { TOOL_PAGES } from "@/config/toolPages";

const PAGE = TOOL_PAGES.instagramAudio;

const FAQS = [
  {
    q: "Which links can I pull sound from?",
    a: "Public reel and video links — the same posts the video pages accept. The tool opens the clip and lifts out its audio track as an MP3. Photo posts and stories have no such track to lift, and private clips are excluded either way.",
  },
  {
    q: "Why does audio take longer than saving a video?",
    a: "A video download hands you Instagram&apos;s file directly. Audio has to be processed on the server first — the clip is fetched, the track is separated, and the MP3 is built for you. That work grows with the clip&apos;s length, so a short reel finishes quickly while a long talk keeps you waiting.",
  },
  {
    q: "Can I keep just a chorus or a single quote instead of the whole thing?",
    a: "The tool always returns the full clip&apos;s sound as one MP3, with no trimming step inside. Take the whole file and cut the part you need afterwards in any free audio app or phone editor — that keeps this page simple and predictable.",
  },
  {
    q: "Will the MP3 sound better than the video did?",
    a: "No — it mirrors the source exactly. Extraction moves the clip&apos;s own audio into an MP3 without improving it. A crisp recording gives a crisp MP3; a windy, distant or muffled original stays that way in the file.",
  },
  {
    q: "What does temporarily unavailable mean here?",
    a: "The server-side audio queue is full at that moment. It is a capacity notice, not a broken link — wait a while and retry the same post link. If you need something immediately, save the MP4 through the video downloader first so you at least hold the file.",
  },
  {
    q: "Where do MP3s play after I save them?",
    a: "Almost everywhere. Phone music apps, messaging apps, car stereos, laptops, smart speakers — MP3 is the one audio format everything opens, with no special software needed on your side.",
  },
];

export default function AudioDownloaderPageClient() {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <Header />
      <main id="main-content" className="flex-1">
        <Breadcrumb items={[{ name: "Home", path: "/" }, { name: PAGE.name, path: PAGE.path }]} />
        <ToolDownloader page={PAGE} />
        <section className="mx-auto max-w-[900px] px-5 sm:px-6 lg:px-12 pb-12">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center text-[14px] font-semibold text-fg-muted transition-colors hover:text-primary"
          >
            ← Back to Instagram Downloader
          </Link>
          <h2 className="mt-4 text-[24px] font-bold tracking-[-0.01em] text-fg sm:text-[28px] leading-[1.2]">
            What the Audio downloader does
          </h2>
          <p className="mt-4 text-[18px] leading-[1.7] text-fg-muted">
            Sometimes the picture is beside the point. Paste the link to a public reel or video and take home just the audio as an MP3 you can listen to anywhere.
          </p>
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary-strong hover:text-primary transition-colors"
          >
            {expanded ? "Show less about Audio" : "Know more about Audio"}
            <span aria-hidden="true">{expanded ? " ↑" : " ↓"}</span>
          </button>
          {expanded && (
            <>
              <p className="mt-3 text-[16px] leading-[1.7] text-fg-muted">
                Listening is the intent that sets this page apart. Video pages are about watching; this one is about carrying the sound in your pocket — in earphones, in the car, in a playlist of reference clips.
              </p>

              <ProseSection>
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
                  <li>Open this page in your mobile browser and paste the link — this page always asks for audio, so no format choice is needed.</li>
                  <li>Paste the link, tap Get Media, and leave the tab open while the server works. Short reels take a little while; long videos take proportionally longer.</li>
                  <li>When the MP3 is ready, tap Download. It lands in Downloads and opens in any music app.</li>
                </ol>
                <h3 className="text-[16px] font-bold text-fg">On iPhone</h3>
                <ol className="list-decimal pl-5 space-y-2 text-[14px] leading-[1.7] text-fg-muted">
                  <li>Copy the reel or video link from the Instagram app the usual way.</li>
                  <li>Paste it into the downloader above in Safari and tap Get Media. This page always extracts audio from the clip you paste.</li>
                  <li>Keep Safari open on this tab. Closing it or letting the phone sleep mid-job abandons that attempt.</li>
                  <li>Tap Download once processing finishes. The MP3 sits in Files under Downloads — move it into your music app or share it onward from there.</li>
                </ol>
                <h3 className="text-[16px] font-bold text-fg">On desktop</h3>
                <ol className="list-decimal pl-5 space-y-2 text-[14px] leading-[1.7] text-fg-muted">
                  <li>Copy the address of the public reel or video post from your browser.</li>
                  <li>Paste it into the box at the top of this page and click Get Media — the request extracts the audio track.</li>
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

              <h2 className="mt-10 text-[20px] font-bold text-fg">Devices and browsers this page works on</h2>
              <p className="mt-3 text-[14px] leading-[1.7] text-fg-muted">
                The audio extractor runs on any standard web browser on your phone, tablet, or computer without installing third-party apps or signing into an account. Supported browsers include Safari and Chrome on iOS; Chrome, Samsung Internet, and Firefox on Android; and Chrome, Safari, Firefox, and Edge on macOS, Windows, Linux, and ChromeOS. Extracted MP3 files download straight to your browser&apos;s default folder — Files under Downloads on iPhone and iPad, or the Downloads/Audio folder on Android and PCs.
              </p>

              <h2 className="mt-10 text-[20px] font-bold text-fg">Your privacy on this page</h2>
              <p className="mt-3 text-[14px] leading-[1.7] text-fg-muted">
                Only the public post link is submitted. Downloadit never asks for an Instagram username or password and never asks you to connect an account, so nothing personal rides along with the request — there is no login session to expose because no login exists. The <Link href="/privacy" className="font-bold text-primary-strong hover:underline">Privacy Policy</Link> describes precisely what is processed when you extract audio.
              </p>

              <h2 className="mt-10 text-[20px] font-bold text-fg">Music belongs to someone — handle it with care</h2>
              <p className="mt-3 text-[14px] leading-[1.7] text-fg-muted">
                This warning matters more for audio than anywhere else, because songs and voice recordings carry the strictest rights. Keep your own recordings freely, save other audio for private listening, and never re-upload, remix or sample someone else&apos;s music or voice without written permission. A trending sound is not a free sound. Rights holders can request a review via the <Link href="/dmca" className="font-bold text-primary-strong hover:underline">DMCA page</Link> and <Link href="/terms" className="font-bold text-primary-strong hover:underline">Terms</Link>. Only download content you own or have permission to reuse.
              </p>
              </ProseSection>

              <h2 className="mt-10 text-[18px] font-bold text-fg">Related downloaders</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  { href: "/instagram-reels-downloader", label: "Instagram Reels Downloader", desc: "Save Reels as MP4" },
                  { href: "/instagram-video-downloader", label: "Instagram Video Downloader", desc: "Save videos as MP4" },
                  { href: "/instagram-photo-downloader", label: "Instagram Photo & Carousel Downloader", desc: "Save photos and carousels as JPG" },
                  { href: "/instagram-story-downloader", label: "Instagram Story Downloader", desc: "Save stories before they expire" },
                  { href: "/pinterest-video-downloader", label: "Pinterest Video Downloader", desc: "Save Pinterest videos as MP4" },
                  { href: "/pinterest-image-downloader", label: "Pinterest Image & Carousel Downloader", desc: "Save Pinterest images & carousels" },
                  { href: "/youtube-video-downloader", label: "YouTube Video Downloader", desc: "Save YouTube videos and audio" },
                  { href: "/", label: "Downloadit Home", desc: "All-in-one media downloader" },
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
              <section className="cv-auto mt-12">
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
            </>
          )}
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
