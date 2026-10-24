import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import ToolDownloader from "@/components/ToolDownloader";
import ProseSection from "@/components/ProseSection";
import { TOOL_PAGES, toolMetadata } from "@/config/toolPages";

const PAGE = TOOL_PAGES.instagramPhoto;
export const metadata: Metadata = toolMetadata(PAGE);

const FAQS = [
  {
    q: "How is downloading different from taking a screenshot?",
    a: "A screenshot captures your screen at screen resolution, with interface edges and compression. Downloading grabs Instagram's stored image file itself, so it stays sharp when you zoom, crop or print it. If you plan to reuse an image you own, the downloaded file is the one to work from.",
  },
  {
    q: "Do I get the whole carousel or just the cover?",
    a: "The whole set. After you paste the link, the preview lets you step through every slide with Next and Previous, and the counter shows where you are. Each slide saves as its own file, so keep the ones you need one by one.",
  },
  {
    q: "Why did only one image save from a ten-slide post?",
    a: "That is how carousels are built here — one file per slide, not a bundle. Move to the next slide in the preview and tap Download again. Repeat for each image you want to keep.",
  },
  {
    q: "Can I save a profile picture with this page?",
    a: "No. This page handles photo and carousel posts only. Profile pictures are served through a different path and are not supported, so paste the link to a specific post instead.",
  },
  {
    q: "The photo looks soft on the page. Will the file be soft too?",
    a: "Judge the downloaded file, not the small preview. The preview is scaled down to fit the page, while the file itself is the full-resolution image Instagram serves. Open the saved file to see its real sharpness.",
  },
  {
    q: "Can I download photos from a private account I follow?",
    a: "No. Following the account does not change the check. Only posts that are visible to a logged-out visitor can be fetched — follower-only and removed posts return a clear message instead of a file.",
  },
];

export default function CarouselDownloaderPage() {
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
          <h2 className="mt-4 text-[24px] font-bold tracking-[-0.01em] text-fg sm:text-[28px] leading-[1.2]">What the Photo &amp; Carousel downloader does</h2>
          <p className="mt-4 text-[18px] leading-[1.7] text-fg-muted">
            A carousel is Instagram&apos;s swipeable photo post — up to ten stills in one place, the kind photographers use for a series, shops use for product angles, and teachers use for step-by-step diagrams. Single photos work here too. The frustration is familiar: you find an image you need, but Instagram offers no way to keep the actual file, so people screenshot it and end up with a dull copy of a copy. This page takes the opposite path. Paste the link to a public post and you receive Instagram&apos;s stored image, slide by slide, at the sharpness it was uploaded in.
          </p>
          <p className="mt-3 text-[16px] leading-[1.7] text-fg-muted">
            Stills deserve their own page because they are used differently from video. A photo gets zoomed, cropped, pinned to a board, compared side by side with another. A ten-slide carousel is really ten separate files that happen to share one caption. Everything on this page is shaped around that: flipping through slides, saving individual frames, and keeping the resolution intact for close looking.
          </p>

          <ProseSection>
          <h2>What saved photos are actually good for</h2>
          <p>
            Designers and makers keep images they own or are allowed to use as reference boards — colour palettes, packaging angles, lettering styles. The full file survives zooming and cropping far better than a screenshot, so you can inspect a corner or sample a colour cleanly.
          </p>
          <p className="mt-3 text-[16px] leading-[1.7] text-fg-muted">
            Students save diagrams and charts from public educational accounts so the writing stays readable when magnified. Sellers archive their own product photography the same way — every angle of a listing, kept on a drive and ready to reuse. Travellers and families hold onto their own posted memories at full quality, without chat-app compression grinding them down.
          </p>

          <div className="mt-12">
            <h2>How to download photos and carousels, step by step</h2>
            <h3 className="text-[16px] font-bold text-fg">On Android</h3>
            <ol className="list-decimal pl-5 space-y-2 text-[14px] leading-[1.7] text-fg-muted">
              <li>Open the photo or carousel post itself in the Instagram app — tap into it from the grid so the single post is on screen.</li>
              <li>Tap Share, then Copy link.</li>
              <li>Open this page in your mobile browser and paste the link into the box.</li>
              <li>Tap Get Media. The first slide appears with a counter showing your position.</li>
              <li>Use Next and Previous to walk through the slides, tapping Download on each image you want. Each slide saves as its own file in Downloads or Gallery.</li>
            </ol>
            <h3 className="text-[16px] font-bold text-fg">On iPhone</h3>
            <ol className="list-decimal pl-5 space-y-2 text-[14px] leading-[1.7] text-fg-muted">
              <li>Open the single post in the Instagram app and copy its link with Share and Copy link.</li>
              <li>Paste the link into the downloader above in Safari and tap Get Media.</li>
              <li>Step through the carousel in the preview to find the slides you need.</li>
              <li>Tap Download on each one. Safari places images in Files under Downloads.</li>
              <li>From Files you can view them, move them into Photos, or send them straight to another app.</li>
            </ol>
            <h3 className="text-[16px] font-bold text-fg">On desktop</h3>
            <ol className="list-decimal pl-5 space-y-2 text-[14px] leading-[1.7] text-fg-muted">
              <li>Open the post in your browser. The three-dots menu and Copy Link gives the same address as the address bar.</li>
              <li>Paste it into the box at the top of this page and click Get Media.</li>
              <li>Browse the slides with Next and Previous and download each frame you want to keep.</li>
              <li>Files land in your downloads folder, ready to open, rename, or drop into a design tool.</li>
            </ol>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-[16px] font-bold text-fg">Formats and quality for stills</h3>
              <p className="mt-2 text-[14px] leading-[1.6] text-fg-muted">Images save in whatever format Instagram stores for that post — JPG usually, sometimes PNG or WebP — kept exactly as served at full display resolution, never recompressed.</p>
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-fg">One slide, one file</h3>
              <p className="mt-2 text-[14px] leading-[1.6] text-fg-muted">A carousel is a row of separate images, not a bundle. The preview counter shows which slide you are viewing, and each Download tap saves exactly that frame.</p>
            </div>
          </div>

          <h2 className="mt-12 text-[24px] font-bold text-fg">What this page cannot fetch</h2>
          <p className="mt-3 text-[16px] leading-[1.7] text-fg-muted">
            Private, removed and login-walled posts are out, as everywhere on this site. Two stills-specific edges: profile pictures are not supported — only photo and carousel posts — and images posted as stories belong to the <Link href="/instagram-story-downloader" className="font-bold text-primary-strong hover:underline">Instagram Story Downloader</Link>, because stories carry a 24-hour expiry this pipeline does not track.
          </p>

          <h2 className="mt-10 text-[20px] font-bold text-fg">Photo and carousel troubleshooting</h2>
          <div className="mt-4">
            <div>
              <p><strong className="text-fg">I cannot find a link to copy.</strong> You are standing on the profile grid. Tap the post so it opens on its own screen, then copy the link from there.</p>
              <p><strong className="text-fg">The image looks blurry on the page.</strong> That is the scaled-down preview. Open the downloaded file itself — it is the full-resolution original and will look noticeably sharper.</p>
              <p><strong className="text-fg">The download starts but the file will not open.</strong> The signed media address expired mid-save. Paste the post link again and download promptly this time.</p>
              <p><strong className="text-fg">I wanted every slide at once.</strong> There is no single bundle download — save each frame with its own Download tap while stepping through with Next and Previous.</p>
            </div>
          </div>

          <h2 className="mt-10 text-[20px] font-bold text-fg">Devices and browsers this page works on</h2>
          <p className="mt-3 text-[14px] leading-[1.7] text-fg-muted">
            The photo and carousel downloader works entirely in your browser without apps or accounts. It is compatible with all modern mobile and desktop browsers: Safari, Chrome, Firefox, Edge, and Samsung Internet on Android; Safari and Chrome on iOS (iPhone &amp; iPad); and Chrome, Firefox, Edge, and Safari on Windows, Mac, and Linux. Downloaded images save as standalone files directly into your device&apos;s standard download storage — the Files app on iOS, and the Downloads folder or Photos app on Android and computer operating systems.
          </p>

          <h2 className="mt-10 text-[20px] font-bold text-fg">Your privacy on this page</h2>
          <p className="mt-3 text-[14px] leading-[1.7] text-fg-muted">
            The only thing you submit is the public post link. Downloadit takes no Instagram username or password and offers no account connection — there is nothing to sign into and nothing personal travelling with the request. The link identifies the post, not you. The <Link href="/privacy" className="font-bold text-primary-strong hover:underline">Privacy Policy</Link> explains exactly what is processed and what is not stored.
          </p>

          <h2 className="mt-10 text-[20px] font-bold text-fg">Respect the photographer</h2>
          <p className="mt-3 text-[14px] leading-[1.7] text-fg-muted">
            Photos carry visible authorship — someone composed, lit and edited that frame. Save your own work freely, keep other people&apos;s images for private reference, and ask written permission before reposting or using anyone&apos;s photo in your feed, shop or ads. Never strip watermarks or crop out credit. Rights holders can raise concerns via the <Link href="/dmca" className="font-bold text-primary-strong hover:underline">DMCA page</Link> and <Link href="/terms" className="font-bold text-primary-strong hover:underline">Terms</Link>. Only download content you own or have permission to reuse.
          </p>
          </ProseSection>

          <h2 className="mt-10 text-[18px] font-bold text-fg">Related downloaders</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              { href: "/instagram-reels-downloader", label: "Instagram Reels Downloader", desc: "Save Reels as MP4" },
              { href: "/instagram-video-downloader", label: "Instagram Video Downloader", desc: "Save videos as MP4" },
              { href: "/instagram-story-downloader", label: "Instagram Story Downloader", desc: "Save stories before they expire" },
              { href: "/instagram-audio-downloader", label: "Instagram Audio Downloader", desc: "Extract MP3 from videos" },
              { href: "/pinterest-image-downloader", label: "Pinterest Image & Carousel Downloader", desc: "Save Pinterest images & carousels" },
              { href: "/pinterest-video-downloader", label: "Pinterest Video Downloader", desc: "Save Pinterest videos as MP4" },
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
              { href: "/blog/save-own-instagram-posts", label: "How to Save Your Own Posts Without Screenshots" },
              { href: "/blog/save-instagram-carousel-slides", label: "How to Save Carousel Posts Slide by Slide" },
              { href: "/blog/permission-reuse-instagram-content", label: "How to Get Permission to Reuse Content" },
              { href: "/blog/instagram-video-resolution-formats", label: "Resolution and Formats, Explained" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="rounded-2xl p-4 hover:bg-primary-light transition-colors" style={{ border: "1px solid var(--border)", background: "var(--card)" }}>
                <span className="text-[14px] font-semibold text-primary-strong">{l.label}</span>
                <span className="mt-1 block text-[14px] text-fg-muted">Downloadit Blog guide</span>
              </Link>
            ))}
          </div>

          <ProseSection>
          <section className="cv-auto mt-12">
            <h2>Photo and carousel FAQ</h2>
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
    </>
  );
}
