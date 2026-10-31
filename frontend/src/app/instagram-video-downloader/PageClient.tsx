"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import ToolDownloader from "@/components/ToolDownloader";
import ProseSection from "@/components/ProseSection";
import { TOOL_PAGES } from "@/config/toolPages";

const PAGE = TOOL_PAGES.instagramVideo;

const FAQS = [
  {
    q: "What counts as a video post here, as opposed to a reel?",
    a: "On this page, video means the longer grid posts — talks, interviews, match clips, demonstrations — rather than quick vertical reels. In practice you do not have to sort them yourself: paste any public link and the tool detects what it is and opens the right preview.",
  },
  {
    q: "How much space should I leave for a long video?",
    a: "Think in minutes, not seconds. A minute of video is roughly a few dozen megabytes, so a ten-minute talk can be several hundred. Check your free storage before a long download, especially on a phone that is nearly full.",
  },
  {
    q: "Can I keep a video for a flight and watch it with no internet?",
    a: "Yes, that is exactly what the MP4 is for. Save it over Wi-Fi beforehand and it plays offline in your gallery app, VLC, or any desktop player, with no connection needed at all.",
  },
  {
    q: "The video plays fine in the preview but stops halfway after saving. Why?",
    a: "Almost always a shaky connection or a full disk on a large file. Move back onto stable Wi-Fi, free up space, then paste the post link again so the media address is fresh, and download in one go.",
  },
  {
    q: "I pasted a profile link and got the wrong thing. What did I do wrong?",
    a: "You copied the grid instead of the post. Open the video itself so it fills the screen, then copy that link — the three-dots menu on desktop or Share on mobile — rather than the address of someone's profile page.",
  },
  {
    q: "Do downloaded videos work in editing or classroom software?",
    a: "The MP4 is a plain video file, so most editors, players and classroom tools open it directly. If your editor is picky, import the MP4 and export from there — the downloaded file is the starting point, not locked to any app.",
  },
];

export default function VideoDownloaderPageClient() {
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
            What the Video downloader does
          </h2>
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary-strong hover:text-primary transition-colors"
          >
            {expanded ? "Show less about Videos" : "Know more about Videos"}
            <span aria-hidden="true">{expanded ? " ↑" : " ↓"}</span>
          </button>
          {expanded && (
            <>
              <p className="mt-4 text-[18px] leading-[1.7] text-fg-muted">
                Some things on Instagram cannot be squeezed into a short reel. Paste the link to a public video post and save the MP4 file to store, rewatch and study at your own pace.
              </p>
              <p className="mt-3 text-[16px] leading-[1.7] text-fg-muted">
                The focus here is reference, not quick entertainment. Reels are for the moment; longer videos are for the second and third viewing — pausing halfway, jumping back thirty seconds, watching on a bigger screen with a notebook open.
              </p>

              <ProseSection>
              <h2>Who saves longer Instagram videos, and why</h2>
              <p>
                Students are the most natural fit. A revision clip, a worked example, a demonstration you want to slow down and follow step by step. A saved MP4 lets you scrub back and forth and watch on a train with no signal, instead of re-streaming the same ten minutes over and over.
              </p>
              <p className="mt-3 text-[16px] leading-[1.7] text-fg-muted">
                Creators and small teams treat it as an archive of their own output — product walkthroughs, class recordings, event recaps from a public business account, with the master copy always on a drive. Marketers and researchers keep videos they have permission to study the same way, watching a full-length clip offline with the ability to stop and take notes.
              </p>

              <div className="mt-12">
                <h2>How to download a video, step by step</h2>
                <h3 className="text-[16px] font-bold text-fg">On Android</h3>
                <ol className="list-decimal pl-5 space-y-2 text-[14px] leading-[1.7] text-fg-muted">
                  <li>Open the actual video post in the Instagram app — not the profile grid, the post itself.</li>
                  <li>Tap Share, then Copy link to copy the address of that post.</li>
                  <li>Open your browser on this page, paste the link into the box, and tap Get Media.</li>
                  <li>Confirm the preview is the right video. For long clips, switch onto Wi-Fi now.</li>
                  <li>Tap Download and give it time. The MP4 appears in Downloads when the transfer finishes.</li>
                </ol>
                <h3 className="text-[16px] font-bold text-fg">On iPhone</h3>
                <ol className="list-decimal pl-5 space-y-2 text-[14px] leading-[1.7] text-fg-muted">
                  <li>Open the video post in the Instagram app and use Share, then Copy link.</li>
                  <li>Paste the link into the downloader above using Safari.</li>
                  <li>Tap Get Media and check the preview carefully — long videos all look alike in a list.</li>
                  <li>Tap Download and stay on Wi-Fi until it completes. The file lands in Files under Downloads.</li>
                  <li>Play it from Files, or move it into Photos or VLC for easier scrubbing and offline viewing.</li>
                </ol>
                <h3 className="text-[16px] font-bold text-fg">On desktop</h3>
                <ol className="list-decimal pl-5 space-y-2 text-[14px] leading-[1.7] text-fg-muted">
                  <li>Open the video post in your browser and copy its address — the three-dots menu and Copy Link works too.</li>
                  <li>Paste the address into the box at the top of this page and click Get Media.</li>
                  <li>Preview the video, then click Download. Larger files take visibly longer, so keep the tab open.</li>
                  <li>Find the MP4 in your downloads folder. It opens in any desktop player and imports into most editing tools.</li>
                </ol>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="text-[16px] font-bold text-fg">Format and quality for long videos</h3>
                  <p className="mt-2 text-[14px] leading-[1.6] text-fg-muted">Videos save as MP4 in the original HD Instagram streams — same picture, same sound, no conversion and no watermark. The file keeps whatever shape it was uploaded in: landscape, square or vertical.</p>
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-fg">Why long videos need planning</h3>
                  <p className="mt-2 text-[14px] leading-[1.6] text-fg-muted">Length is the whole difference from reels. Save over Wi-Fi, check free space first, and download promptly — Instagram signs media addresses for a short window, so an old link may need pasting again.</p>
                </div>
              </div>

              <h2 className="mt-12 text-[24px] font-bold text-fg">Videos this page cannot fetch</h2>
              <p className="mt-3 text-[16px] leading-[1.7] text-fg-muted">
                Private posts, Close Friends posts, restricted and deleted videos are all outside reach — the page names the actual reason instead of handing you a broken file. Login-walled content stays login-walled. If a video disappears halfway through your week, it was most likely removed by the poster, and no link-based tool can bring it back.
              </p>

              <h2 className="mt-10 text-[20px] font-bold text-fg">Video troubleshooting</h2>
              <div className="mt-4">
                <div>
                  <p><strong className="text-fg">The download stalls on a long video.</strong> Treat it as a connection or storage problem first. Get onto stable Wi-Fi, clear a few hundred megabytes, re-paste the post link for a fresh media address, and let the transfer run without switching apps away.</p>
                  <p><strong className="text-fg">The saved file will not play on my phone.</strong> Try a different player such as VLC before assuming the file is broken. Gallery apps on some phones struggle with long MP4s that VLC opens without complaint.</p>
                  <p><strong className="text-fg">I see an expired-link message.</strong> Normal for video: the signed address died. Paste the original post link once more and download without leaving it sitting.</p>
                  <p><strong className="text-fg">The preview shows someone&apos;s grid, not a video.</strong> You copied a profile URL. Open one single video post and copy its own link instead.</p>
                </div>
              </div>

              <h2 className="mt-10 text-[20px] font-bold text-fg">Devices and browsers this page works on</h2>
              <p className="mt-3 text-[14px] leading-[1.7] text-fg-muted">
                The video downloader runs in your browser without requiring software downloads, browser extensions, or account sign-in. It is fully tested on Chrome, Safari, Firefox, Edge, and Samsung Internet on Android; Safari and Chrome on iOS (iPhone &amp; iPad); and all modern web browsers on macOS, Windows, Linux, and ChromeOS. On iOS devices, downloads save to the Files app under Downloads. On Android and desktop devices, videos download directly to your default Downloads folder or Photos/Gallery app.
              </p>

              <h2 className="mt-10 text-[20px] font-bold text-fg">Your privacy on this page</h2>
              <p className="mt-3 text-[14px] leading-[1.7] text-fg-muted">
                Nothing you paste is tied to you. Downloadit never asks for an Instagram username or password and never asks you to connect an account — you submit a public post link and the file is resolved from it. No login exists to be breached, and the link alone identifies nothing about who requested it. See the <Link href="/privacy" className="font-bold text-primary-strong hover:underline">Privacy Policy</Link> for the full details of what is processed.
              </p>

              <h2 className="mt-10 text-[20px] font-bold text-fg">A note on using other people&apos;s videos</h2>
              <p className="mt-3 text-[14px] leading-[1.7] text-fg-muted">
                Long videos often represent real work — a filmed class, an edited interview, a paid production. Keep your own posts freely, save other people&apos;s work for private study, and get written permission before re-uploading or using anyone else&apos;s video in your own channel or ads. If you hold the rights to a video, the <Link href="/dmca" className="font-bold text-primary-strong hover:underline">DMCA page</Link> and <Link href="/terms" className="font-bold text-primary-strong hover:underline">Terms</Link> describe how to ask for a review. Only download content you own or have permission to reuse.
              </p>
              </ProseSection>

              <h2 className="mt-10 text-[18px] font-bold text-fg">Related downloaders</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  { href: "/instagram-reels-downloader", label: "Instagram Reels Downloader", desc: "Save Reels as MP4" },
                  { href: "/instagram-photo-downloader", label: "Instagram Photo & Carousel Downloader", desc: "Save photos and carousels to your gallery" },
                  { href: "/instagram-story-downloader", label: "Instagram Story Downloader", desc: "Save stories before they expire" },
                  { href: "/instagram-audio-downloader", label: "Instagram Audio Downloader", desc: "Extract MP3 from videos" },
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
                  { href: "/blog/downloaded-video-no-sound", label: "Why Your Downloaded Video Has No Sound" },
                  { href: "/blog/instagram-link-expired-not-found", label: "What to Do When a Link Says Expired" },
                  { href: "/blog/free-phone-storage-saved-videos", label: "How to Free Up Phone Storage" },
                  { href: "/blog/trim-videos-whatsapp-status", label: "Trimming Videos for WhatsApp Status" },
                ].map((l) => (
                  <Link key={l.href} href={l.href} className="rounded-2xl p-4 hover:bg-primary-light transition-colors" style={{ border: "1px solid var(--border)", background: "var(--card)" }}>
                    <span className="text-[14px] font-semibold text-primary-strong">{l.label}</span>
                    <span className="mt-1 block text-[14px] text-fg-muted">Downloadit Blog guide</span>
                  </Link>
                ))}
              </div>

              <ProseSection>
              <section className="cv-auto mt-12">
                <h2>Video downloading FAQ</h2>
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
