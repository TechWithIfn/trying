import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import { TOOL_PAGES, toolMetadata } from "@/config/toolPages";

const PAGE = TOOL_PAGES.youtubeVideo;
export const metadata: Metadata = toolMetadata(PAGE);

const FAQS = [
  ["How do I download a YouTube video?", "Copy the URL of a public YouTube video, paste it above, select Get Video, choose the available quality, preview the file, and select Download."],
  ["Can I use a YouTube Shorts link?", "Yes. YouTube Shorts URLs are supported and will be processed as regular videos."],
  ["Does YouTube Watch page work?", "Yes. Public Watch page URLs are supported when the video is accessible without signing in."],
  ["Do I need a YouTube account?", "No account is requested by Downloadit. The video itself must be publicly accessible without signing in."],
  ["Why does my YouTube link fail?", "The video may be age-restricted, region-blocked, private, deleted, or the URL may be incorrect. Check the link and try again."],
  ["Can I download a private YouTube video?", "No. Private videos, age-restricted content, and login-walled videos are not supported."],
  ["What format is downloaded?", "The resolver returns the public progressive or DASH video file YouTube exposes, normally MP4 video or MP3/M4A audio."],
  ["Why is the preview unavailable?", "YouTube media links expire and public availability can change. Open the video page and submit a fresh link."],
  ["Does this work on mobile?", "Yes. The page works in current mobile browsers, including common Android and iPhone browsers."],
  ["Can I extract audio only?", "Yes. Select the MP3 or M4A audio option after the video is resolved to extract only the audio track."],
];

export default function YouTubeVideoDownloaderPage() {
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
        <YouTubeVideoDownloaderPageClient />
        <section className="mx-auto max-w-[900px] px-5 pb-16 sm:px-6 lg:px-12">
          <Link href="/" className="font-semibold text-primary hover:underline">← Back to Home</Link>
          <h2 className="mt-8 text-2xl font-bold text-fg">Download YouTube videos</h2>
          <p className="mt-3 text-base leading-7 text-fg-muted">
            Download public YouTube videos online and save them as MP4. Paste a YouTube video link above, choose an available quality up to 1080p, preview the file, and save it to your device. Audio extraction as MP3 or M4A is also supported.
          </p>
          <h2 className="mt-8 text-2xl font-bold text-fg">Supported YouTube links</h2>
          <p className="mt-3 text-base leading-7 text-fg-muted">
            The downloader supports youTube video URLs (watch?v=…), youtu.be short links, and YouTube Watch page URLs. Age-restricted, private, or region-blocked videos cannot be fetched without authentication.
          </p>
          <h2 className="mt-8 text-2xl font-bold text-fg">Public content and limitations</h2>
          <p className="mt-3 text-base leading-7 text-fg-muted">
            Private videos, age-restricted content, and region-blocked videos are not supported. Downloadit does not bypass YouTube's age gates or DRM. Only publicly accessible videos can be downloaded, and availability depends on what YouTube exposes through its public API.
          </p>
          <h2 className="mt-8 text-2xl font-bold text-fg">How to download YouTube videos</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-base leading-7 text-fg-muted">
            <li>Open the public YouTube video you want to save.</li>
            <li>Copy the video URL from the address bar.</li>
            <li>Return to Downloadit and paste the link into the YouTube downloader.</li>
            <li>Select Get Video, choose an available quality (up to 1080p), and preview the file.</li>
            <li>To extract audio only, select the MP3 or M4A format before downloading.</li>
            <li>Click Download to save the file to your device.</li>
          </ol>
          <h2 className="mt-8 text-2xl font-bold text-fg">Troubleshooting</h2>
          <p className="mt-3 text-base leading-7 text-fg-muted">
            Age restrictions, region blocks, private videos, deleted content, and expired URLs can prevent a download. If a video is age-restricted, you must be signed in to YouTube to view it, but Downloadit cannot bypass this limitation. Try the link again later if it was previously unavailable.
          </p>
          <h2 className="mt-8 text-2xl font-bold text-fg">YouTube downloader FAQ</h2>
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
