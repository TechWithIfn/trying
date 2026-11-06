import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import StoryDownloaderPageClient from "./PageClient";
import { TOOL_PAGES, toolMetadata } from "@/config/toolPages";

const PAGE = TOOL_PAGES.instagramStory;
export const metadata: Metadata = toolMetadata(PAGE);

const FAQS = [
  ["How do I download a public Instagram Story?", "Copy the link to a public Instagram Story, paste it above, select Get Media, preview the available image or video, and select Download while the Story is still live."],
  ["Can I use an Instagram Story link after 24 hours?", "No. Instagram Stories expire 24 hours after posting. Once a Story has expired, the link can no longer be resolved and the downloader will show an error."],
  ["Do I need an Instagram account?", "No account is requested by Downloadit. The Story itself must be publicly accessible without signing in."],
  ["Why does my Instagram link fail?", "The link may point to a profile, grid, or hashtag page rather than a single Story. The Story may be private, deleted, a Close Friends Story, or may have already expired (24 hours after posting)."],
  ["Can I download a private Instagram Story?", "No. Private Stories, Close Friends Stories, and login-walled content are not supported."],
  ["What format is downloaded?", "The resolver returns the public image or video file Instagram exposes for the Story, normally an MP4 video or image format (JPG, PNG, WebP)."],
  ["Why is the preview unavailable?", "Instagram Story links are temporary and expire 24 hours after posting. Open the Story in a private browser window while logged out to confirm it is still live, then submit a fresh link."],
  ["Does this work on mobile?", "Yes. The page works in current mobile browsers, including common Android and iPhone browsers."],
  ["Can I download someone else's Instagram Story?", "Only save media you have permission to use and follow Instagram's terms and the creator's rights."],
];

export default function InstagramStoryDownloaderPage() {
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
        <StoryDownloaderPageClient />
        <section className="mx-auto max-w-[900px] px-5 pb-16 sm:px-6 lg:px-12">
          <Link href="/" className="font-semibold text-primary hover:underline">← Back to Home</Link>
          <h2 className="mt-8 text-2xl font-bold text-fg">Download public Instagram Stories</h2>
          <p className="mt-3 text-base leading-7 text-fg-muted">
            Download public Instagram Stories online while they are still live. Paste a Story link above and Downloadit identifies the available image or video, lets you preview it, and saves it to your device. Stories expire 24 hours after posting.
          </p>
          <h2 className="mt-8 text-2xl font-bold text-fg">Supported Instagram links</h2>
          <p className="mt-3 text-base leading-7 text-fg-muted">
            The Instagram Story downloader supports public Story URLs from photo and video Stories. It works in a modern browser on desktop, tablet, and mobile. Profile pages, grids, explore pages, and hashtag pages are not supported because they point at collections rather than a single Story.
          </p>
          <h2 className="mt-8 text-2xl font-bold text-fg">Public content only – 24-hour limit</h2>
          <p className="mt-3 text-base leading-7 text-fg-muted">
            Instagram Stories expire 24 hours after posting. Private Stories, Close Friends Stories, deleted Stories, and login-walled content cannot be downloaded. Downloadit does not ask for Instagram passwords, cookies, or session credentials and does not bypass access controls. Only publicly accessible Stories that are still live can be fetched.
          </p>
          <h2 className="mt-8 text-2xl font-bold text-fg">How to use the Instagram Story downloader</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-base leading-7 text-fg-muted">
            <li>Open the public Instagram Story you want to save.</li>
            <li>Copy the link from the three-dot Share menu or from the address bar.</li>
            <li>Return to Downloadit and paste the link into the Instagram Story downloader.</li>
            <li>Select Get Media, confirm the preview of the available image or video, and download the file while the Story is still live.</li>
          </ol>
          <h2 className="mt-8 text-2xl font-bold text-fg">Troubleshooting</h2>
          <p className="mt-3 text-base leading-7 text-fg-muted">
            Expired Stories (past 24 hours), private Stories, Close Friends Stories, deleted Stories, and login-walled content cannot be downloaded. Open the Story in a private or incognito browser window while logged out to confirm it is still publicly visible and live, then submit the link again.
          </p>
          <h2 className="mt-8 text-2xl font-bold text-fg">Instagram Story downloader FAQ</h2>
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
