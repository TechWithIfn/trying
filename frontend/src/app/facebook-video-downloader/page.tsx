import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import FacebookDownloader from "@/components/FacebookDownloader";
import { TOOL_PAGES, toolMetadata } from "@/config/toolPages";

const PAGE = TOOL_PAGES.facebookVideo;
export const metadata: Metadata = toolMetadata(PAGE);

const FAQS = [
  ["How do I download a public Facebook video?", "Copy the link to the public post, Reel or Watch video, paste it above, select Get Video, check the preview, and select Download."],
  ["Can I use a Facebook Reel link?", "Yes. Public Facebook Reel URLs are supported when Facebook exposes the video to logged-out visitors."],
  ["Does Facebook Watch work?", "Public Watch links can work. A deleted, private, login-walled or region-restricted video cannot be fetched."],
  ["Do I need a Facebook account?", "No account is requested by Downloadit. The video itself must be publicly accessible without signing in."],
  ["Why does my Facebook link fail?", "Check that it is the video URL rather than a profile or group page, and confirm the video opens in a private browser window while logged out."],
  ["Can I download a private Facebook video?", "No. Private posts, restricted groups, login-walled videos and other access-controlled media are not supported."],
  ["What format is downloaded?", "The resolver returns the public progressive video file Facebook exposes, normally an MP4."],
  ["Why is the preview unavailable?", "Facebook media links expire and public availability can change. Open the post again and submit a fresh link."],
  ["Does this work on mobile?", "Yes. The page works in current mobile browsers, including common Android and iPhone browsers."],
  ["Can I download someone else's video?", "Only save media you have permission to use and follow Facebook's terms and the creator's rights."],
];

export default function FacebookVideoDownloaderPage() {
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
        <FacebookDownloader
          badge={PAGE.badge}
          titleA={PAGE.titleA}
          titleB={PAGE.titleB}
          subtitle={PAGE.description}
          placeholder={PAGE.placeholder}
          buttonLabel={PAGE.buttonLabel}
          benefits={PAGE.trust}
        />
        <section className="mx-auto max-w-[900px] px-5 pb-16 sm:px-6 lg:px-12">
          <Link href="/" className="font-semibold text-primary hover:underline">← Back to Home</Link>
          <h2 className="mt-8 text-2xl font-bold text-fg">Download public Facebook videos</h2>
          <p className="mt-3 text-base leading-7 text-fg-muted">
            Download public Facebook videos online from posts, Reels, and Watch pages. Paste a Facebook video link above and Downloadit identifies the available MP4, lets you preview it, and saves it to your device.
          </p>
          <h2 className="mt-8 text-2xl font-bold text-fg">Supported Facebook links</h2>
          <p className="mt-3 text-base leading-7 text-fg-muted">
            The Facebook video downloader supports public video posts, Facebook Reels, Facebook Watch pages, standard video links, and common share links. It works in a modern browser on desktop, tablet, and mobile.
          </p>
          <h2 className="mt-8 text-2xl font-bold text-fg">Public content only</h2>
          <p className="mt-3 text-base leading-7 text-fg-muted">
            Private posts, removed videos, login-walled pages, and restricted content cannot be downloaded. Downloadit does not ask for Facebook passwords, cookies, or session credentials and does not bypass access controls.
          </p>
          <h2 className="mt-8 text-2xl font-bold text-fg">How to use the Facebook video downloader</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-base leading-7 text-fg-muted">
            <li>Open the public Facebook video, Reel, or Watch page.</li>
            <li>Use Facebook&apos;s Share option and copy the link.</li>
            <li>Return to Downloadit and paste the link into the Facebook downloader.</li>
            <li>Choose Get Video, confirm the preview, and download the available MP4.</li>
          </ol>
          <h2 className="mt-8 text-2xl font-bold text-fg">Facebook downloader troubleshooting</h2>
          <p className="mt-3 text-base leading-7 text-fg-muted">
            Invalid links, deleted posts, private content, login walls, network failures, and expired media URLs can prevent a download. Use the direct video link, verify it while logged out, and submit it again if the signed media URL has expired.
          </p>
          <h2 className="mt-8 text-2xl font-bold text-fg">Facebook video downloader FAQ</h2>
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
