import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/config/site";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ToolDownloader from "@/components/ToolDownloader";
import ProseSection from "@/components/ProseSection";
import ReadMore from "@/components/ReadMore";

export const metadata: Metadata = {
  title: { absolute: "Instagram Story Downloader – Save Stories | Downloadit" },
  description: "Save public Instagram Stories before they expire. Paste the Story link and download the image or video in HD — free, no login required.",
  alternates: { canonical: "/instagram-story-downloader" },
  openGraph: {
    title: { absolute: "Instagram Story Downloader – Save Stories | Downloadit" },
    description: "Save public Instagram Stories before they expire. Paste the Story link and download the image or video in HD — free, no login required.",
    url: `${SITE_URL}/instagram-story-downloader`,
    type: "website",
    images: [{ url: "/og-downloadit.png", width: 1200, height: 630, alt: "Instagram Story Downloader — Downloadit" }],
  },
  twitter: {
    card: "summary_large_image",
    title: { absolute: "Instagram Story Downloader – Save Stories | Downloadit" },
    description: "Save public Instagram Stories before they expire. Paste the Story link and download the image or video in HD — free, no login required.",
    images: ["/og-downloadit.png"],
  },
};

const PAGE_NAME = "Instagram Story Downloader";
const PAGE_PATH = "/instagram-story-downloader";

const FAQS = [
  {
    q: "How much time do I actually have to save a story?",
    a: "A day from posting, at most. The clock starts when the story goes up, not when you first see it — a story you notice in the evening may already be hours old. Once Instagram removes it there is no copy left for any tool to fetch.",
  },
  {
    q: "Can highlights be saved the same way?",
    a: "Often, yes. A highlight is a saved story, so a public highlight link usually resolves through the same flow as a live story. Paste it and try — public ones generally return the image or clip, while restricted ones return a clear message.",
  },
  {
    q: "What do I get — a picture or a video?",
    a: "Whichever the story is. Image stories save as JPG, video stories as MP4, each in its original file. Anything drawn onto the frame — text, doodles, stickers flattened into the picture — comes along, but tappable elements like polls, question boxes and link buttons do not, since only the visible media is stored.",
  },
  {
    q: "The story opens for me but the page calls it private. Why?",
    a: "You are watching as a logged-in follower. This page re-checks every story the way a stranger with no account would see it, so anything that needs a follow or a login — including Close Friends stories — lands in the private bucket even though it plays for you.",
  },
  {
    q: "Can an expired story be recovered somehow?",
    a: "No. Expiry deletes the underlying media from Instagram's side, so there is nothing left to resolve. Anyone promising to recover gone stories is not telling the truth — the only rescue is saving while the story is still live.",
  },
  {
    q: "Does the poster see that I saved their story?",
    a: "The page fetches the public file without logging in and without tapping anything inside the story, so it does not register as a reply, reaction or sticker tap. Story views themselves are visible to the poster inside Instagram, but saving the file here adds no extra signal beyond viewing.",
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
            A story is Instagram&apos;s disappearing post — a photo or short clip that lives at the top of the app for one day and then vanishes. Announcements, behind-the-scenes moments, flash sales, match-day clips: things meant to be seen today, not next month. Screenshotting a story mid-watch is awkward, and recording your screen for a fifteen-second clip is worse. This page is built for the narrow window while a public story is still alive — you paste its link and keep the original file before the clock runs out.
          </p>
          <p className="mt-3 text-[16px] leading-[1.7] text-fg-muted">
            Urgency is the whole difference from the rest of this site. A reel waits for you next week. A story does not. If a story matters enough to keep, treat it as a today-job rather than a tonight-job, because expiry — not logins, not formats — is the reason most story saves fail.
          </p>

          <ProseSection>
          <ReadMore label="story guide">
          <h2>Why people rush to save stories</h2>
          <p>
            Small businesses archive their own story output — daily offers, menus, opening hours from a public account — so a finished promotion can be reused next season and there is always proof of what was advertised and when.
          </p>
          <p className="mt-3 text-[16px] leading-[1.7] text-fg-muted">
            Creators save their own behind-the-scenes runs to cut into longer videos later. Students keep deadline reminders and room changes posted by public class and club accounts as pictures rather than trusting memory. Event organisers hold onto public coverage they have rights to, because once the day ends that coverage is otherwise gone for good.
          </p>

          <div className="mt-12">
            <h2>How to download a story, step by step</h2>
            <h3 className="text-[16px] font-bold text-fg">On Android</h3>
            <ol className="list-decimal pl-5 space-y-2 text-[14px] leading-[1.7] text-fg-muted">
              <li>Open the story while it is still live and confirm it plays. An already-expired story has no link worth copying.</li>
              <li>Use Share from the story viewer to copy its link.</li>
              <li>Open this page in your mobile browser, paste the link, and tap Get Media.</li>
              <li>Check the preview, then tap Download immediately. The JPG or MP4 lands in Downloads or Gallery within seconds.</li>
            </ol>
            <h3 className="text-[16px] font-bold text-fg">On iPhone</h3>
            <ol className="list-decimal pl-5 space-y-2 text-[14px] leading-[1.7] text-fg-muted">
              <li>Copy the live story&apos;s link from the Instagram app via Share.</li>
              <li>Paste it into the downloader above in Safari and tap Get Media.</li>
              <li>Preview it — image stories resolve in seconds, video stories take a little longer.</li>
              <li>Tap Download right away and do not leave the tab sitting. Safari stores the file in Files under Downloads.</li>
            </ol>
            <h3 className="text-[16px] font-bold text-fg">On desktop</h3>
            <ol className="list-decimal pl-5 space-y-2 text-[14px] leading-[1.7] text-fg-muted">
              <li>Open the story in your browser while it is live — check it actually loads first.</li>
              <li>Copy the address from the address bar, or use Share inside the viewer.</li>
              <li>Paste it into the box at the top of this page and click Get Media.</li>
              <li>Preview and click Download at once. Two clocks run here — the story&apos;s 24 hours and the much shorter life of the signed media address — so promptness wins twice.</li>
            </ol>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-[16px] font-bold text-fg">Formats for image and video stories</h3>
              <p className="mt-2 text-[14px] leading-[1.6] text-fg-muted">Story files save in their originals: JPG for still stories, MP4 for moving ones. Text flattened into the frame travels with the file; tappable extras — polls, quizzes, link stickers — stay behind, since only the visible media is stored.</p>
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-fg">Why speed beats everything here</h3>
              <p className="mt-2 text-[14px] leading-[1.6] text-fg-muted">Story files are small and save in seconds — but the deadline is real: 24 hours from posting, plus a far shorter expiry on the signed media address underneath. Re-paste the link for a fresh address while the story is still live.</p>
            </div>
          </div>

          <h2 className="mt-12 text-[24px] font-bold text-fg">Stories this page cannot fetch</h2>
          <p className="mt-3 text-[16px] leading-[1.7] text-fg-muted">
            Expiry comes first: past its day, a story is gone from Instagram and no tool can reconstruct it. Then the familiar walls — private accounts, Close Friends, deleted stories. The check is always done the logged-out way: if watching takes a login, fetching is off the table.
          </p>

          <h2 className="mt-10 text-[20px] font-bold text-fg">Story troubleshooting</h2>
          <div className="mt-4">
            <div>
              <p><strong className="text-fg">Expired or not found on a story I saw today.</strong> The clock runs from posting, not from your first view. A story posted last night is already gone this evening. Next time, save within hours of spotting it.</p>
              <p><strong className="text-fg">The link worked this morning and is dead now.</strong> Either the story aged out, or the signed media address underneath expired. Re-paste the story link for a new address — if the story itself is still live, it will resolve again.</p>
              <p><strong className="text-fg">Stickers and polls — what carries over?</strong> Anything baked into the picture or clip is saved with it. Taps, votes, questions and links are part of Instagram&apos;s interactive layer, not the media file, so they stay behind.</p>
              <p><strong className="text-fg">The preview is right but saving fails on mobile data.</strong> Video stories are heavier than stills. Switch to Wi-Fi, keep the tab open, and retry the same link rather than an old preview.</p>
            </div>
          </div>

          <h2 className="mt-10 text-[20px] font-bold text-fg">Save stories that are yours to keep</h2>
          <p className="mt-3 text-[14px] leading-[1.7] text-fg-muted">
            Stories feel casual, but the same authorship applies: the frame belongs to whoever posted it. Archive your own stories freely, keep other people&apos;s public stories for personal reference only, and get explicit permission before reposting or running anyone else&apos;s story in your own account or campaign. Rights holders can request a review via the <Link href="/dmca" className="font-bold text-primary-strong hover:underline">DMCA page</Link> and <Link href="/terms" className="font-bold text-primary-strong hover:underline">Terms</Link>. Only download content you own or have permission to reuse.
          </p>
          </ReadMore>
          </ProseSection>

          <h2 className="mt-10 text-[18px] font-bold text-fg">Related downloaders</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              { href: "/instagram-reels-downloader", label: "Instagram Reels Downloader", desc: "Save Reels as MP4" },
              { href: "/instagram-photo-downloader", label: "Instagram Photo & Carousel Downloader", desc: "Save photos and carousels as JPG" },
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

          <h2 className="mt-10 text-[18px] font-bold text-fg">Related guides</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              { href: "/blog/download-instagram-stories-before-expire", label: "How to Download Stories Before They Disappear" },
              { href: "/blog/story-swipe-file-business", label: "Building a Story Swipe File for Business" },
              { href: "/blog/private-vs-public-instagram-content", label: "Private vs Public Content, Explained" },
              { href: "/blog/instagram-link-expired-not-found", label: "What to Do When a Link Says Expired" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="rounded-2xl p-4 hover:bg-primary-light transition-colors" style={{ border: "1px solid var(--border)", background: "var(--card)" }}>
                <span className="text-[14px] font-semibold text-primary-strong">{l.label}</span>
                <span className="mt-1 block text-[14px] text-fg-muted">Downloadit Blog guide</span>
              </Link>
            ))}
          </div>

          <ProseSection>
          <section className="mt-12">
            <h2>Story downloading FAQ</h2>
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
