import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import ToolDownloader from "@/components/ToolDownloader";
import ProseSection from "@/components/ProseSection";
import { TOOL_PAGES, toolMetadata } from "@/config/toolPages";

const PAGE = TOOL_PAGES.instagramReels;
export const metadata: Metadata = toolMetadata(PAGE);

const FAQS = [
  {
    q: "Why does a reel I can watch say it is private here?",
    a: "Because watching and fetching are checked differently. You watch while logged in, possibly as a follower. Downloadit checks the reel the way a stranger with no account would see it. If it needs a login or a follow, it is treated as private.",
  },
  {
    q: "My friend sent me a reel in a chat. Can I save that?",
    a: "Yes, if the reel itself is public. Open the link so it loads in Instagram, then use Share and Copy link to get the full URL. Links that get cut off inside some chat apps fail, so copying it fresh from the app is the reliable way.",
  },
  {
    q: "Will the saved reel look exactly like it does on Instagram?",
    a: "Yes. You get the same vertical MP4 Instagram streams to your phone, with the picture, edits, on-screen text and mixed-in sound exactly as posted. Nothing is stamped over it and nothing is re-compressed.",
  },
  {
    q: "Where do reels go on an iPhone after downloading?",
    a: "Safari puts them in the Files app under Downloads, not directly in the Photos gallery. Open Files, then Downloads, and you will find the MP4 there. From there you can play it, move it to Photos, or share it to another app.",
  },
  {
    q: "Can I save a reel to watch on a flight with no signal?",
    a: "That is one of the main reasons people use this page. Download the MP4 while you have Wi-Fi and it plays offline afterwards in any video player, since the whole file sits on your device.",
  },
  {
    q: "Does saving a reel notify the person who posted it?",
    a: "No. Downloadit resolves the public file without logging in and without interacting with the account. Instagram does not show the poster who saved or downloaded their public reel through this page.",
  },
];

export default function ReelsDownloaderPage() {
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
            What the Reels downloader does
          </h2>
          <p className="mt-4 text-[18px] leading-[1.7] text-fg-muted">
            A reel is Instagram&apos;s short vertical clip — usually under a couple of minutes, made to be watched on a phone and passed around. A joke your friend sends you at midnight, a 40-second recipe you want to try on Sunday, a quick fix for something broken in the house. Reels are built for the moment, and Instagram gives you no button to keep them. This page exists for that one gap: you paste the link to a public reel and keep the MP4 file on your own device.
          </p>
          <p className="mt-3 text-[16px] leading-[1.7] text-fg-muted">
            The intent here is deliberately narrow. This is not a video archive or a music tool — it is for short clips you want to rewatch, share with someone who is not on Instagram, or hold onto because the idea inside is useful.
          </p>

          <ProseSection>
          <h2>What people actually use reel downloads for</h2>
          <p>
            Creators use it as a backup drawer. If you post reels from your own public account, keeping the MP4 on your laptop means a lost draft or an app glitch never costs you the finished edit. Small-shop owners save their own product reels so they can repost a clip later or send it directly to a customer over chat.
          </p>
          <p className="mt-3 text-[16px] leading-[1.7] text-fg-muted">
            Everyone else uses it as a pocket notebook or a sharing shortcut: students replaying a quick tutorial offline, friends sending a funny clip to someone who barely opens Instagram, marketers studying the pacing of material they have rights to. Short clips are easy to rewatch from a file — no signal, no searching the feed again.
          </p>

          <div className="mt-12">
            <h2>How to download a reel, step by step</h2>
            <h3 className="text-[16px] font-bold text-fg">On Android</h3>
            <ol className="list-decimal pl-5 space-y-2 text-[14px] leading-[1.7] text-fg-muted">
              <li>Open the reel in the Instagram app and tap the Share icon (the paper plane).</li>
              <li>Tap Copy link. The full address is now on your clipboard.</li>
              <li>Open your mobile browser, come back to this page, and paste the link into the box at the top.</li>
              <li>Tap Get Media, wait a few seconds, then check the preview is the right clip.</li>
              <li>Tap Download. The MP4 lands in Downloads and usually appears in your Gallery app too.</li>
            </ol>
            <h3 className="text-[16px] font-bold text-fg">On iPhone</h3>
            <ol className="list-decimal pl-5 space-y-2 text-[14px] leading-[1.7] text-fg-muted">
              <li>In the Instagram app, open the reel, tap Share, then Copy link.</li>
              <li>Switch to Safari and paste the link into the downloader above.</li>
              <li>Tap Get Media and confirm the preview matches the reel you want.</li>
              <li>Tap Download. Safari stores the MP4 in the Files app under Downloads.</li>
              <li>Open Files, then Downloads, to play it — move it into Photos from there if you want it in your camera roll.</li>
            </ol>
            <h3 className="text-[16px] font-bold text-fg">On desktop</h3>
            <ol className="list-decimal pl-5 space-y-2 text-[14px] leading-[1.7] text-fg-muted">
              <li>Open the reel in your browser. You can also paste a link someone sent you.</li>
              <li>Copy the address from the address bar, or use the three dots and Copy Link on the post.</li>
              <li>Paste it into the box at the top of this page and click Get Media.</li>
              <li>Preview the clip, then click Download. The MP4 goes to your normal downloads folder and plays in any video player.</li>
            </ol>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-[16px] font-bold text-fg">Format and quality for reels</h3>
              <p className="mt-2 text-[14px] leading-[1.6] text-fg-muted">Reels save as vertical MP4 — the same file Instagram streams, kept exactly as posted with picture and sound together. No watermark is added and nothing is re-compressed.</p>
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-fg">File size and offline play</h3>
              <p className="mt-2 text-[14px] leading-[1.6] text-fg-muted">Short reels are light — usually a few megabytes — so they save in seconds on normal Wi-Fi and play offline in any gallery or video app.</p>
            </div>
          </div>

          <h2 className="mt-12 text-[24px] font-bold text-fg">Reels this page cannot fetch</h2>
          <p className="mt-3 text-[16px] leading-[1.7] text-fg-muted">
            The tool sees the reel the way a logged-out stranger would. If you can watch it only because you follow a private account, or only while signed in, it counts as non-public here and you get a clear private message instead of a file. Deleted reels behave the same way. Only reels that are genuinely open to everyone can be downloaded, and that rule cannot be switched off.
          </p>

          <h2 className="mt-10 text-[20px] font-bold text-fg">Reels troubleshooting</h2>
          <div className="mt-4">
            <div>
              <p><strong className="text-fg">It says private, but the reel opens for me.</strong> You open it as a follower or a logged-in user. The downloader re-checks it with no login at all, so follower-only reels correctly stay out of reach.</p>
              <p><strong className="text-fg">The preview played but the file will not open.</strong> Instagram signs media addresses for a short time and yours expired between preview and tap. Paste the reel link again and download straight away.</p>
              <p><strong className="text-fg">The saved reel has no sound.</strong> Check volume and the silent switch first — the MP4 carries whatever audio the reel has, so a reel that plays silently on Instagram saves silently too.</p>
              <p><strong className="text-fg">A link from a chat keeps failing.</strong> Some messaging apps trim long links. Use Share and Copy link again in Instagram and paste the complete URL without editing it by hand.</p>
            </div>
          </div>

          <h2 className="mt-10 text-[20px] font-bold text-fg">Devices and browsers this page works on</h2>
          <p className="mt-3 text-[14px] leading-[1.7] text-fg-muted">
            Downloadit needs nothing installed and requires no account. The Reels downloader runs directly in any modern mobile or desktop browser: Safari, Chrome, Firefox, Edge, or Samsung Internet on Android; Safari or Chrome on iPhone and iPad; and Chrome, Firefox, Safari, or Edge on Windows, Mac, Linux, and ChromeOS. Downloaded Reels go to your browser&apos;s standard destination — the Files app under Downloads on iOS, the Downloads folder or Gallery on Android, and your chosen downloads folder on a desktop computer.
          </p>

          <h2 className="mt-10 text-[20px] font-bold text-fg">Your privacy on this page</h2>
          <p className="mt-3 text-[14px] leading-[1.7] text-fg-muted">
            Paste a link and nothing about you travels with it. Downloadit never asks for your Instagram username or password, never asks you to connect an account, and processes only the public link you submitted. The URL is used to resolve the file and is not attached to an identity — there is no login to leak because there is no login at all. The full <Link href="/privacy" className="font-bold text-primary-strong hover:underline">Privacy Policy</Link> spells out what is and is not kept.
          </p>

          <h2 className="mt-10 text-[20px] font-bold text-fg">Please download reels fairly</h2>
          <p className="mt-3 text-[14px] leading-[1.7] text-fg-muted">
            A reel belongs to the person who made it. Save copies of your own reels freely, and keep other people&apos;s reels for personal offline viewing. Do not repost someone else&apos;s reel as your own or use their work in ads without permission — the <Link href="/dmca" className="font-bold text-primary-strong hover:underline">DMCA page</Link> and <Link href="/terms" className="font-bold text-primary-strong hover:underline">Terms</Link> explain how rights holders can report misuse. Only download content you own or have permission to reuse.
          </p>
          </ProseSection>

          <h2 className="mt-10 text-[18px] font-bold text-fg">Related downloaders</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              { href: "/instagram-video-downloader", label: "Instagram Video Downloader", desc: "Save standard video posts as MP4" },
              { href: "/instagram-photo-downloader", label: "Instagram Photo & Carousel Downloader", desc: "Save photos and carousels as JPG" },
              { href: "/instagram-story-downloader", label: "Instagram Story Downloader", desc: "Save stories before they expire" },
              { href: "/instagram-audio-downloader", label: "Instagram Audio Downloader", desc: "Extract MP3 audio from Reels" },
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
              { href: "/blog/backup-instagram-reels", label: "How to Back Up All Your Instagram Reels" },
              { href: "/blog/downloaded-video-no-sound", label: "Why Your Downloaded Video Has No Sound" },
              { href: "/blog/share-reel-without-instagram", label: "How to Share a Reel With Someone Off Instagram" },
              { href: "/blog/repost-instagram-content-credit", label: "How to Repost With Credit That Counts" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="rounded-2xl p-4 hover:bg-primary-light transition-colors" style={{ border: "1px solid var(--border)", background: "var(--card)" }}>
                <span className="text-[14px] font-semibold text-primary-strong">{l.label}</span>
                <span className="mt-1 block text-[14px] text-fg-muted">Downloadit Blog guide</span>
              </Link>
            ))}
          </div>

          <ProseSection>
          <section className="cv-auto mt-12">
            <h2>Reels downloading FAQ</h2>
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
    </>
  );
}
