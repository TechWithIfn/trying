"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import YouTubeDownloader from "@/components/YouTubeDownloader";
import ProseSection from "@/components/ProseSection";
import { TOOL_PAGES } from "@/config/toolPages";

const PAGE = TOOL_PAGES.youtubeVideo;

const FAQS = [
  {
    q: "How do I download a YouTube video?",
    a: "Copy the link to a public YouTube video, paste it into the box at the top of this page, and select Get Media. The page reads the public video details and lists the video qualities it actually exposes. Choose a quality and select Download MP4, or extract the audio as MP3.",
  },
  {
    q: "Which video qualities can I choose?",
    a: "The downloader offers 1080p, 720p, 480p, 240p, and 144p where YouTube exposes them for that video. If a video does not have one of those renditions, it is not shown, so the page never labels a lower resolution as a higher one.",
  },
  {
    q: "Can I download YouTube audio as MP3 or M4A?",
    a: "Yes, when the public video has an audio track. The server downloads the best available audio stream and converts it to a real MP3, or keeps it as M4A if you prefer that AAC container, before sending it to your device. The audio options are hidden as unavailable when a video genuinely has no audio.",
  },
  {
    q: "Do I need a YouTube account or any login?",
    a: "No. Downloadit needs no account and no login. It only works with publicly accessible videos, so private, members-only, premium, age-restricted, and live videos cannot be downloaded.",
  },
  {
    q: "Why does a YouTube link fail?",
    a: "A link can fail when the video is private, members-only, removed, region-restricted, age-restricted, or still live. YouTube can also temporarily ask servers to confirm they are not bots. The page reports the real reason instead of returning an unrelated file.",
  },
  {
    q: "Are YouTube Shorts supported?",
    a: "Yes. A youtube.com/shorts/… link is treated as the same public video and offers the formats YouTube exposes for it.",
  },
  {
    q: "Does Downloadit add a watermark?",
    a: "No watermark is added and no re-encoding is done for MP4 delivery beyond what is needed to pair the video and audio streams. MP3 and M4A are produced from the source audio because that is the format requested.",
  },
  {
    q: "Is the downloaded file stored on your server?",
    a: "No. Each download is prepared in a temporary directory for that request and deleted as soon as the transfer finishes. Raw YouTube media URLs are never exposed to the browser.",
  },
];

export default function YouTubeVideoDownloaderPageClient() {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <Header />
      <main id="main-content" className="flex-1">
        <Breadcrumb items={[{ name: "Home", path: "/" }, { name: PAGE.name, path: PAGE.path }]} />
        <YouTubeDownloader
          badge={PAGE.badge}
          titleA={PAGE.titleA}
          titleB={PAGE.titleB}
          subtitle={PAGE.description}
          placeholder={PAGE.placeholder}
          buttonLabel={PAGE.buttonLabel}
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
            What the YouTube Video downloader does
          </h2>
          <p className="mt-4 text-[18px] leading-[1.7] text-fg-muted">
            Save publicly accessible YouTube videos as MP4 files you can watch offline, and extract the audio track as MP3. Paste a video, Shorts, embed, or youtu.be link, and the tool asks YouTube which formats that public video actually exposes before showing you anything to download.
          </p>
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary-strong hover:text-primary transition-colors"
          >
            {expanded ? "Show less about YouTube" : "Know more about YouTube"}
            <span aria-hidden="true">{expanded ? " ↑" : " ↓"}</span>
          </button>
          {expanded && (
            <>
              <p className="mt-3 text-[16px] leading-[1.7] text-fg-muted">
                The page reports the real title, channel, duration, and available qualities. Choose MP4 or MP3, and the file is prepared on the server before the transfer starts — no fake percentages, no invented download links, and no stored copy afterwards.
              </p>

              <ProseSection>
              <h2>How to download a YouTube video, step by step</h2>
              <ol className="list-decimal pl-5 space-y-2 text-[14px] leading-[1.7] text-fg-muted">
                  <li>Open the public YouTube video you want to keep and copy its link (Share → Copy link).</li>
                  <li>Paste the link into the box at the top of this page and select Get Media.</li>
                  <li>Check that the title, channel, and thumbnail match the video you meant to save.</li>
                  <li>For video, pick 1080p, 720p, 480p, 240p, or 144p — only qualities the video really has are listed.</li>
                  <li>Select Download MP4, or use Download MP3 / M4A to save the audio track.</li>
                  <li>The file is prepared first, then sent to your device. Wait for the real progress to complete.</li>
                </ol>

                <h2 className="mt-10">What this YouTube downloader can fetch</h2>
                <p className="mt-2 text-[14px] leading-[1.7] text-fg-muted">
                  It works on public videos, public Shorts, embed links, and youtu.be links. Private videos,
                  members-only videos, premium videos, age-restricted videos that need a signed-in viewer, region-blocked
                  videos, and live broadcasts are outside what an anonymous tool can download. When one of those is the
                  cause, the page names it instead of handing back a different file.
                </p>

                <h2 className="mt-10">YouTube video quality and format</h2>
                <p className="mt-2 text-[14px] leading-[1.7] text-fg-muted">
                  MP4 downloads pair the best compatible video stream at the chosen resolution with an AAC audio stream,
                  which keeps the file playable on phones, tablets, and desktop players. The available qualities come
                  from the public video itself. Audio can be saved as MP3 or as M4A: MP3 is encoded at high quality
                  because that is the format requested, while M4A keeps the source audio in an AAC container that many
                  phones and players prefer.
                </p>

                <h2 className="mt-10">Troubleshooting YouTube downloads</h2>
                <p className="mt-2 text-[14px] leading-[1.7] text-fg-muted">
                  <strong className="text-fg">“Video unavailable.”</strong> The video is private, members-only, premium,
                  blocked in this region, or has been removed. Open it in a browser without signing in to confirm what a
                  public visitor can see.
                </p>
                <p className="mt-2 text-[14px] leading-[1.7] text-fg-muted">
                  <strong className="text-fg">“Age-restricted.”</strong> YouTube requires a signed-in account to confirm
                  the viewer&apos;s age, so the anonymous download cannot proceed.
                </p>
                <p className="mt-2 text-[14px] leading-[1.7] text-fg-muted">
                  <strong className="text-fg">“Bot check.”</strong> YouTube is temporarily asking this server to prove it
                  is not a bot. Wait a few minutes and try again.
                </p>
                <p className="mt-2 text-[14px] leading-[1.7] text-fg-muted">
                  <strong className="text-fg">“Live video.”</strong> A broadcast that is still live has no final file.
                  Try again after the stream ends and YouTube publishes the finished video.
                </p>
                <p className="mt-2 text-[14px] leading-[1.7] text-fg-muted">
                  <strong className="text-fg">“Quality not available.”</strong> The rendition you chose is no longer
                  listed for that video. Pick one of the qualities the page shows, or run Get Media again for fresh
                  details.
                </p>

                <h2 className="mt-10">Devices and browsers this page works on</h2>
                <p className="mt-2 text-[14px] leading-[1.7] text-fg-muted">
                  Nothing is installed and no account is involved, so the page works wherever a public YouTube link opens: Chrome, Safari, Firefox, Edge or Samsung Internet on Android; Safari or Chrome on iPhone and iPad; any modern browser on Windows, Mac and Linux. Files land in the browser&apos;s usual download spot — Files under Downloads on iPhone, the Downloads folder on Android, and your downloads folder on a computer.
                </p>

                <h2 className="mt-10">Your privacy on this page</h2>
                <p className="mt-2 text-[14px] leading-[1.7] text-fg-muted">
                  The video link is the only thing you submit. Downloadit never asks for a YouTube or Google account, and there is no login step — the request carries the public link and nothing identifying you. Each file is prepared in a temporary directory and deleted when the transfer finishes, so no copy is kept afterwards. The <Link href="/privacy" className="font-bold text-primary-strong hover:underline">Privacy Policy</Link> explains exactly what is processed.
                </p>
              </ProseSection>

              <h2 className="mt-10 text-[18px] font-bold text-fg">Related downloaders</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  { href: "/instagram-video-downloader", label: "Instagram Video Downloader", desc: "Save Instagram videos as MP4" },
                  { href: "/instagram-reels-downloader", label: "Instagram Reels Downloader", desc: "Save Reels as MP4" },
                  { href: "/instagram-audio-downloader", label: "Instagram Audio Downloader", desc: "Extract Instagram audio" },
                  { href: "/pinterest-video-downloader", label: "Pinterest Video Downloader", desc: "Save Pinterest videos as MP4" },
                  { href: "/", label: "Downloadit Home", desc: "All-in-one media downloader" },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-2xl p-4 hover:bg-primary-light transition-colors"
                    style={{ border: "1px solid var(--border)", background: "var(--card)" }}
                  >
                    <span className="text-[14px] font-semibold text-primary-strong">{link.label}</span>
                    <span className="mt-1 block text-[14px] text-fg-muted">{link.desc}</span>
                  </Link>
                ))}
              </div>

              <ProseSection>
                <section className="cv-auto mt-12">
                  <h2>YouTube video download FAQ</h2>
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
                Downloadit is not affiliated with YouTube. Only download videos you have the right to save, and follow
                YouTube&apos;s terms and your local copyright rules. See{" "}
                <Link href="/dmca" className="font-bold text-primary-strong hover:underline">DMCA</Link>,{" "}
                <Link href="/terms" className="font-bold text-primary-strong hover:underline">Terms</Link>, and{" "}
                <Link href="/disclaimer" className="font-bold text-primary-strong hover:underline">Disclaimer</Link>.
              </p>
            </>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
