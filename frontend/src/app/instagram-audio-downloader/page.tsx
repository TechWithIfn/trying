import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import AudioDownloaderPageClient from "./PageClient";
import { TOOL_PAGES, toolMetadata } from "@/config/toolPages";

const PAGE = TOOL_PAGES.instagramAudio;
export const metadata: Metadata = toolMetadata(PAGE);

const FAQS = [
  ["How do I extract audio from a public Instagram Reel or video?", "Copy the link to a public Instagram Reel or video that contains audio, paste it above, select Get Media, and select Extract Audio to download the full-length MP3."],
  ["Can I use an Instagram Reel link for audio extraction?", "Yes. Public Reel URLs are supported when the Reel is accessible to logged-out visitors and contains an audio track."],
  ["Can I use an Instagram video post link for audio extraction?", "Yes. Public video post URLs are supported when the video contains an audio track and is accessible without signing in."],
  ["Do I need an Instagram account?", "No account is requested by Downloadit. The Reel or video itself must be publicly accessible without signing in."],
  ["Why does my Instagram link fail?", "The link may point to a profile, grid, or hashtag page rather than a single post. The Reel or video may be private, deleted, age-restricted, region-blocked, or temporarily unavailable. Audio extraction may also fail if the server-side processing is temporarily unavailable."],
  ["Can I download a private Instagram Reel or video audio?", "No. Private posts, restricted content, age-restricted content, and login-walled media are not supported."],
  ["What format is downloaded?", "Extracted audio is returned as an MP3 file. The original video's audio track is extracted without conversion when possible."],
  ["Why is the preview unavailable?", "Instagram media links expire and public availability can change. Open the Reel or video in a private browser window and submit a fresh link. Audio extraction may also be temporarily unavailable due to server-side processing."],
  ["Does this work on mobile?", "Yes. The page works in current mobile browsers, including common Android and iPhone browsers."],
  ["Can I download someone else's Instagram audio?", "Only save audio from media you have permission to use and follow Instagram's terms and the creator's rights."],
];

export default function InstagramAudioDownloaderPage() {
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
        <AudioDownloaderPageClient />
        <section className="mx-auto max-w-[900px] px-5 pb-16 sm:px-6 lg:px-12">
          <Link href="/" className="font-semibold text-primary hover:underline">← Back to Home</Link>
          <h2 className="mt-8 text-2xl font-bold text-fg">Extract audio from public Instagram Reels and videos</h2>
          <p className="mt-3 text-base leading-7 text-fg-muted">
            Extract audio from public Instagram Reels and videos online. Paste a Reel or video link above and Downloadit identifies the available audio, prepares a preview, and saves it as an MP3. No account required.
          </p>
          <h2 className="mt-8 text-2xl font-bold text-fg">Supported Instagram links</h2>
          <p className="mt-3 text-base leading-7 text-fg-muted">
            The Instagram audio downloader supports public Reel and video URLs that contain an audio track. It works in a modern browser on desktop, tablet, and mobile. Profile pages, grids, explore pages, and hashtag pages are not supported because they point at collections rather than a single media item.
          </p>
          <h2 className="mt-8 text-2xl font-bold text-fg">Public content only</h2>
          <p className="mt-3 text-base leading-7 text-fg-muted">
            Private posts, removed Reels/videos, age-restricted content, and login-walled pages cannot be downloaded. Downloadit does not ask for Instagram passwords, cookies, or session credentials and does not bypass access controls. Only publicly accessible content with an audio track can be fetched.
          </p>
          <h2 className="mt-8 text-2xl font-bold text-fg">How to extract Instagram audio</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-base leading-7 text-fg-muted">
            <li>Open the public Instagram Reel or video from which you want to extract audio.</li>
            <li>Copy the link from the three-dot Share menu or from the address bar.</li>
            <li>Return to Downloadit and paste the link into the Instagram audio downloader.</li>
            <li>Select Get Media, then select Extract Audio to process the available audio track.</li>
            <li>Download the MP3 file to your device.</li>
          </ol>
          <h2 className="mt-8 text-2xl font-bold text-fg">Troubleshooting</h2>
          <p className="mt-3 text-base leading-7 text-fg-muted">
            Invalid links, deleted Reels/videos, private content, age restrictions, region blocks, and expired media URLs can prevent audio extraction. Audio extraction also depends on server-side processing and may be temporarily unavailable. Open the Reel or video in a private or incognito browser window while logged out to confirm it is publicly viewable, then submit the link again.
          </p>
          <h2 className="mt-8 text-2xl font-bold text-fg">Instagram audio downloader FAQ</h2>
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
