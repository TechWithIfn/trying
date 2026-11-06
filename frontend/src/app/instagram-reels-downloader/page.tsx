import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import { TOOL_PAGES, toolMetadata } from "@/config/toolPages";

const PAGE = TOOL_PAGES.instagramReels;
export const metadata: Metadata = toolMetadata(PAGE);

const FAQS = [
  ["How do I download a public Instagram Reel?", "Copy the link to a public Instagram Reel, paste it above, select Get Media, preview the available video, and select Download."],
  ["Can I use an Instagram Reel link?", "Yes. Public Reel URLs are supported when the Reel is accessible to logged-out visitors."],
  ["Can I use an Instagram video post link?", "Yes. Public video post URLs are also supported, but the Reels tab starts you directly in Reels mode."],
  ["Do I need an Instagram account?", "No account is requested by Downloadit. The Reel itself must be publicly accessible without signing in."],
  ["Why does my Instagram link fail?", "The link may point to a profile, grid, or hashtag page rather than a single Reel. The Reel may be private, deleted, age-restricted, region-blocked, or temporarily unavailable."],
  ["Can I download a private Instagram Reel?", "No. Private posts, restricted content, age-restricted videos, and login-walled media are not supported."],
  ["What format is downloaded?", "The resolver returns the public video file Instagram exposes, normally an MP4 video file with original audio."],
  ["Why is the preview unavailable?", "Instagram Reel media links expire and public availability can change. Open the Reel in a private browser window and submit a fresh link."],
  ["Does this work on mobile?", "Yes. The page works in current mobile browsers, including common Android and iPhone browsers."],
  ["Can I download someone else's Instagram Reel?", "Only save media you have permission to use and follow Instagram's terms and the creator's rights."],
];

export default function InstagramReelsDownloaderPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: {
        "@type": "Answer",
        text: answer,
      },
    })),
  };

  return (
    <>
      <Header />
      <main id="main-content" className="flex-1">
        <Breadcrumb items={[{ name: "Home", path: "/" }, { name: PAGE.name, path: PAGE.path }]} />
        <ReelsDownloaderPageClient />
        <section className="mx-auto max-w-[900px] px-5 pb-16 sm:px-6 lg:px-12">
          <Link href="/" className="font-semibold text-primary hover:underline">← Back to Home</Link>
          <h2 className="mt-8 text-2xl font-bold text-fg">Download public Instagram Reels</h2>
          <p className="mt-3 text-base leading-7 text-fg-muted">
            Download public Instagram Reels online. Paste a Reel link above and Downloadit identifies the available MP4, lets you preview it, and saves it to your device. No account required.
          </p>
          <h2 className="mt-8 text-2xl font-bold text-fg">Supported Instagram links</h2>
          <p className="mt-3 text-base leading-7 text-fg-muted">
            The Instagram Reels downloader supports public Reel URLs. It works in a modern browser on desktop, tablet, and mobile. Profile pages, grids, explore pages, and hashtag pages are not supported because they point at collections rather than a single Reel.
          </p>
          <h2 className="mt-8 text-2xl font-bold text-fg">Public content only</h2>
          <p className="mt-3 text-base leading-7 text-fg-muted">
            Private posts, removed Reels, age-restricted content, and login-walled pages cannot be downloaded. Downloadit does not ask for Instagram passwords, cookies, or session credentials and does not bypass access controls. Only publicly accessible content can be fetched.
          </p>
          <h2 className="mt-8 text-2xl font-bold text-fg">How to use the Instagram Reels downloader</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-base leading-7 text-fg-muted">
            <li>Open the public Instagram Reel you want to save.</li>
            <li>Copy the link from the three-dot Share menu or from the address bar.</li>
            <li>Return to Downloadit and paste the link into the Instagram Reels downloader.</li>
            <li>Select Get Media, confirm the preview of the available video, and download the available MP4.</li>
          </ol>
          <h2 className="mt-8 text-2xl font-bold text-fg">Troubleshooting</h2>
          <p className="mt-3 text-base leading-7 text-fg-muted">
            Invalid links, deleted Reels, private content, age restrictions, region blocks, and expired media URLs can prevent a download. Open the Reel in a private or incognito browser window while logged out to confirm it is publicly viewable, then submit the link again.
          </p>
          <h2 className="mt-8 text-2xl font-bold text-fg">Instagram Reels downloader FAQ</h2>
          <div className="mt-4 space-y-4">
            {FAQS.map(([question, answer]) => (
              <details key={question} className="rounded-xl border border-border-light bg-card px-4 py-3">
                <summary className="cursor-pointer font-semibold text-fg">{question}</summary>
                <p className="mt-2 text-sm leading-6 text-fg-muted">{answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Footer />
    </>
  );
}
