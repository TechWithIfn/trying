import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import ThreadsDownloader from "@/components/ThreadsDownloader";
import { TOOL_PAGES, toolMetadata } from "@/config/toolPages";

const PAGE = TOOL_PAGES.threadsVideo;
export const metadata: Metadata = toolMetadata(PAGE);

const FAQS = [
  ["How do I download a Threads video?", "Copy the link to a public Threads post, paste it above, select Get Media, preview the available video, and select Download."],
  ["Can this download images from Threads?", "Yes. The same Threads Video Downloader detects supported public images and displays them for individual download."],
  ["Can I download multiple images from one Threads post?", "When Threads exposes multiple public image items, Downloadit shows the supported images and the existing download-all option."],
  ["Which Threads URLs are supported?", "Public post URLs on threads.net, www.threads.net, threads.com and www.threads.com are supported when the post is accessible without signing in."],
  ["Do I need a Threads account?", "No account, password, cookie, or session token is requested. The post must be publicly accessible to logged-out visitors."],
  ["Can I download a private Threads post?", "No. Downloadit does not bypass private profiles, login walls, authentication, DRM, or other access controls."],
  ["Why does my Threads post fail?", "The post may be private, deleted, unavailable, rate-limited, unsupported, or temporarily inaccessible. Try the original public link again later."],
  ["What media formats are supported?", "Videos are returned as the supported MP4 rendition exposed by Threads. Images keep the available image format and dimensions."],
  ["Does it work on mobile?", "Yes. The Threads downloader works in current mobile and desktop browsers."],
];

export default function ThreadsVideoDownloaderPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };

  return (
    <>
      <Header />
      <main id="main-content" className="flex-1">
        <Breadcrumb items={[{ name: "Home", path: "/" }, { name: PAGE.name, path: PAGE.path }]} />
        <ThreadsDownloader
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
          <h2 className="mt-8 text-2xl font-bold text-fg">Threads Video Downloader for public posts</h2>
          <p className="mt-3 text-base leading-7 text-fg-muted">
            Download videos and images from public Threads posts online. Paste a Threads post link and Downloadit detects the supported media, prepares a real preview, and lets you save the available file without a login.
          </p>
          <h2 className="mt-8 text-2xl font-bold text-fg">Download Threads videos</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-base leading-7 text-fg-muted">
            <li>Open the public Threads post containing the video.</li>
            <li>Copy the post URL from the Share menu.</li>
            <li>Paste the URL into this Threads Video Downloader.</li>
            <li>Select Get Media, review the actual preview, and select Download.</li>
          </ol>
          <h2 className="mt-8 text-2xl font-bold text-fg">Download images from Threads</h2>
          <p className="mt-3 text-base leading-7 text-fg-muted">
            Public Threads image posts are detected automatically. A single image is shown at its available aspect ratio, while supported multi-image posts display each available image with the existing individual and download-all controls.
          </p>
          <h2 className="mt-8 text-2xl font-bold text-fg">Supported URLs and limitations</h2>
          <p className="mt-3 text-base leading-7 text-fg-muted">
            Use a public post URL from threads.net or threads.com. Private, deleted, login-walled, region-restricted, DRM-protected, or otherwise inaccessible content cannot be fetched. Downloadit never requests Threads credentials or imports personal cookies.
          </p>
          <h2 className="mt-8 text-2xl font-bold text-fg">Troubleshooting</h2>
          <p className="mt-3 text-base leading-7 text-fg-muted">
            Confirm the link is a post rather than a profile page and that it opens in a private browser window while logged out. A temporary upstream failure or rate limit may require trying again later. Only save media you own or have permission to reuse.
          </p>
          <p className="mt-4 text-base leading-7 text-fg-muted">
            Downloadit also supports <Link href="/twitter-video-downloader" className="font-semibold text-primary hover:underline">Twitter/X videos</Link>, <Link href="/instagram-video-downloader" className="font-semibold text-primary hover:underline">Instagram videos</Link>, <Link href="/pinterest-video-downloader" className="font-semibold text-primary hover:underline">Pinterest videos</Link>, <Link href="/youtube-video-downloader" className="font-semibold text-primary hover:underline">YouTube videos</Link>, and <Link href="/facebook-video-downloader" className="font-semibold text-primary hover:underline">Facebook videos</Link>.
          </p>
          <h2 className="mt-8 text-2xl font-bold text-fg">Threads downloader FAQ</h2>
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <Footer />
    </>
  );
}
