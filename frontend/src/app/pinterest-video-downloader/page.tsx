import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import PinterestDownloader from "@/components/PinterestDownloader";
import ProseSection from "@/components/ProseSection";
import { TOOL_PAGES, toolMetadata } from "@/config/toolPages";

const PAGE = TOOL_PAGES.pinterestVideo;

export const metadata: Metadata = toolMetadata(PAGE);

const FAQS = [
  {
    q: "How do I download a Pinterest video?",
    a: "Open a publicly accessible Pinterest video pin, copy its link, paste it into the box above, and choose Get Media. When the media is successfully resolved you can preview it and select Download to save a supported file.",
  },
  {
    q: "Do I need a Pinterest account?",
    a: "No. Downloadit needs no account and no login. It only works with publicly accessible pins, so there is nothing to sign in to.",
  },
  {
    q: "Why might a video link not work?",
    a: "A link can fail when the pin is deleted, private, region-restricted, login-walled, or is only served as a streaming playlist that cannot be fetched anonymously. Availability depends entirely on the pin and the source, and no downloader can guarantee it.",
  },
  {
    q: "Can I download private Pinterest content?",
    a: "No. Only publicly accessible pins can be resolved. Private boards, secret pins, and anything behind a login cannot be downloaded, and the tool reports the real reason instead of returning an unrelated file.",
  },
];

export default function PinterestVideoDownloaderPage() {
  return (
    <>
      <Header />
      <main id="main-content" className="flex-1">
        <Breadcrumb items={[{ name: "Home", path: "/" }, { name: PAGE.name, path: PAGE.path }]} />
        <PinterestDownloader
          badge={PAGE.badge}
          titleA={PAGE.titleA}
          titleB={PAGE.titleB}
          subtitle={PAGE.description}
          placeholder={PAGE.placeholder}
          buttonLabel={PAGE.buttonLabel}
          modes={PAGE.modes}
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
            What the Pinterest Video downloader does
          </h2>
          <p className="mt-4 text-[18px] leading-[1.7] text-fg-muted">
            This Pinterest Video Downloader saves publicly accessible Pinterest video pins as MP4 files you can watch
            offline, on any device. Paste the URL of a public Pinterest video pin, and the tool reads the pin page and
            returns the video it exposes.
          </p>
          <p className="mt-3 text-[16px] leading-[1.7] text-fg-muted">
            Copy the pin link, paste it into the downloader above, preview the result when it is available, then
            download the file the pin exposes — no watermark, no login, nothing to install.
          </p>

          <ProseSection>
            <h2>How to download a Pinterest video, step by step</h2>
            <ol className="list-decimal pl-5 space-y-2 text-[14px] leading-[1.7] text-fg-muted">
              <li>Open the video pin you want to keep — tap it so it fills the screen, not the board grid.</li>
              <li>Use the share icon and choose Copy link (desktop users can copy the address bar).</li>
              <li>Paste the link into the box at the top of this page and select Get Media. Auto Detect identifies the pin by default; you can also tap Video to state the type you expect.</li>
              <li>Check that the preview is the correct video.</li>
              <li>Select Download and let the transfer finish. The MP4 lands in your Downloads folder.</li>
            </ol>

            <h2 className="mt-10">What this Pinterest video downloader can fetch</h2>
            <p className="mt-2 text-[14px] leading-[1.7] text-fg-muted">
              It works on public video pins — the same content a visitor sees without signing in. Deleted pins,
              private boards, login-walled pins, region-restricted pins and pins served only as streaming playlists
              are outside what an anonymous tool can download, and the page reports the exact reason when that
              happens. It never fabricates a download or hands back an unrelated file.
            </p>

            <h2 className="mt-10">Pinterest video quality and format</h2>
            <p className="mt-2 text-[14px] leading-[1.7] text-fg-muted">
              Videos are saved as MP4 using the best progressive rendition the pin exposes, so the picture and sound
              match what plays on Pinterest. Because Pinterest signs its media links, save the file soon after
              resolving it; if a link has gone stale, paste the pin link again for a fresh address.
            </p>

            <h2 className="mt-10">Troubleshooting Pinterest video downloads</h2>
            <p className="mt-2 text-[14px] leading-[1.7] text-fg-muted">
              <strong className="text-fg">“No downloadable video.”</strong> The pin is an image-only pin. Use the{" "}
              <Link href="/pinterest-image-downloader" className="font-bold text-primary-strong hover:underline">
                Pinterest Image &amp; Carousel Downloader
              </Link>{" "}
              to save its picture instead.
            </p>
            <p className="mt-2 text-[14px] leading-[1.7] text-fg-muted">
              <strong className="text-fg">“Pin not found.”</strong> The pin was likely deleted or the link is
              incomplete — open it in Pinterest first to confirm it still exists.
            </p>
            <p className="mt-2 text-[14px] leading-[1.7] text-fg-muted">
              <strong className="text-fg">“Restricted.”</strong> Pinterest may be limiting automated access at that
              moment, or the pin needs a login. Try again shortly or open the pin directly.
            </p>

            <h2 className="mt-10">Devices and browsers this page works on</h2>
            <p className="mt-2 text-[14px] leading-[1.7] text-fg-muted">
              Nothing is installed and nothing is account-bound, so the page works wherever a public Pinterest link opens: Chrome, Safari, Firefox, Edge or Samsung Internet on Android; Safari or Chrome on iPhone and iPad; any modern browser on Windows, Mac and Linux. Downloads land in the browser&apos;s normal download location — Files under Downloads on iPhone, the Downloads folder or Gallery on Android, and your downloads folder on a computer. The only firm requirements are a current browser and a public pin link.
            </p>

            <h2 className="mt-10">Your privacy on this page</h2>
            <p className="mt-2 text-[14px] leading-[1.7] text-fg-muted">
              The pin link is the only thing you submit. Downloadit never asks for a Pinterest account, email or password, and there is no login flow to go through — the request carries the public link and nothing that identifies who pasted it. The <Link href="/privacy" className="font-bold text-primary-strong hover:underline">Privacy Policy</Link> explains exactly what is processed.
            </p>
          </ProseSection>

          <h2 className="mt-10 text-[18px] font-bold text-fg">Related downloaders</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              { href: "/pinterest-image-downloader", label: "Pinterest Image & Carousel Downloader", desc: "Save Pinterest images and carousels" },
              { href: "/instagram-video-downloader", label: "Instagram Video Downloader", desc: "Save Instagram videos as MP4" },
              { href: "/instagram-reels-downloader", label: "Instagram Reels Downloader", desc: "Save Reels as MP4" },
              { href: "/youtube-video-downloader", label: "YouTube Video Downloader", desc: "Save YouTube videos and audio" },
              { href: "/", label: "Downloadit Home", desc: "All-in-one media downloader" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-2xl p-4 hover:bg-primary-light transition-colors"
                style={{ border: "1px solid var(--border)", background: "var(--card)" }}
              >
                <span className="text-[14px] font-semibold text-primary-strong">{l.label}</span>
                <span className="mt-1 block text-[14px] text-fg-muted">{l.desc}</span>
              </Link>
            ))}
          </div>

          <ProseSection>
            <section className="cv-auto mt-12">
              <h2>Pinterest video download FAQ</h2>
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
            See <Link href="/#how-it-works" className="text-primary-strong hover:underline">How It Works</Link>, the{" "}
            <Link href="/help" className="text-primary-strong hover:underline">Help page</Link> or{" "}
            <Link href="/privacy" className="text-primary-strong hover:underline">Privacy</Link>.
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
