import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import TwitterDownloader from "@/components/TwitterDownloader";
import { TOOL_PAGES, toolMetadata } from "@/config/toolPages";

const PAGE = TOOL_PAGES.twitterVideo;
export const metadata: Metadata = toolMetadata(PAGE);

const FAQS = [
  ["How do I download a Twitter video?", "Copy the link to a public Twitter or X post, paste it above, select Get Video, check the preview, and select Download."],
  ["Do Twitter.com and X.com links work?", "Yes. Public status URLs on twitter.com and x.com are accepted when the post and video are accessible without signing in."],
  ["Can I use a mobile Twitter/X link?", "Yes. Common mobile host variants are normalized when they contain a standard public status URL."],
  ["Do I need a Twitter or X account?", "No account, password, cookie, or session token is requested. The post must be public to logged-out visitors."],
  ["What media does this downloader support?", "It supports publicly accessible video posts and returns the best supported video rendition exposed by the source."],
  ["Why does my post have no video?", "The post may contain only images, an unavailable clip, or media that is restricted, deleted, private, or login-walled."],
  ["Can I download a private or protected post?", "No. Downloadit does not bypass private accounts, protected posts, authentication, DRM, or other access controls."],
  ["What quality will I get?", "The resolver selects the best supported video quality it can access. Unsupported quality labels are not invented or displayed."],
  ["Why did the preview fail?", "The post may have been deleted, restricted, rate-limited, or its temporary media URL may have expired. Submit the original public link again."],
  ["Does it work on phones?", "Yes. The same Twitter/X video downloader works in current mobile and desktop browsers."],
];

export default function TwitterVideoDownloaderPage() {
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
        <TwitterDownloader
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
          <h2 className="mt-8 text-2xl font-bold text-fg">Twitter video downloader for public posts</h2>
          <p className="mt-3 text-base leading-7 text-fg-muted">
            Download publicly accessible videos from Twitter and X posts online. Paste a status link above and Downloadit identifies the available video, shows a preview, and lets you save the supported file to your device.
          </p>
          <h2 className="mt-8 text-2xl font-bold text-fg">Supported Twitter and X links</h2>
          <p className="mt-3 text-base leading-7 text-fg-muted">
            Use a public link such as https://twitter.com/username/status/123 or https://x.com/username/status/123. Mobile host variants and common status-link parameters are normalized before extraction.
          </p>
          <h2 className="mt-8 text-2xl font-bold text-fg">How to download X videos</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-base leading-7 text-fg-muted">
            <li>Open the public Twitter/X post containing the video.</li>
            <li>Copy the post link using Share.</li>
            <li>Paste it into this Twitter/X video downloader.</li>
            <li>Select Get Video, review the actual preview, then select Download.</li>
          </ol>
          <h2 className="mt-8 text-2xl font-bold text-fg">Public content and privacy limits</h2>
          <p className="mt-3 text-base leading-7 text-fg-muted">
            Private, protected, deleted, login-walled, DRM-protected, or otherwise inaccessible posts are not supported. Downloadit does not request passwords, import cookies, impersonate accounts, or bypass Twitter/X access controls. Save only media you have permission to use.
          </p>
          <h2 className="mt-8 text-2xl font-bold text-fg">Troubleshooting</h2>
          <p className="mt-3 text-base leading-7 text-fg-muted">
            Check that the URL contains a public status post rather than a profile page. If the post opens only after login, has been removed, contains no video, or the platform is rate-limiting requests, the downloader will show an error instead of a fabricated result. Try the original link again later if a temporary upstream failure occurs.
          </p>
          <p className="mt-4 text-base leading-7 text-fg-muted">
            You can also use our <Link href="/instagram-video-downloader" className="font-semibold text-primary hover:underline">Instagram video downloader</Link>, <Link href="/pinterest-video-downloader" className="font-semibold text-primary hover:underline">Pinterest video downloader</Link>, <Link href="/youtube-video-downloader" className="font-semibold text-primary hover:underline">YouTube video downloader</Link>, or <Link href="/facebook-video-downloader" className="font-semibold text-primary hover:underline">Facebook video downloader</Link>.
          </p>
          <h2 className="mt-8 text-2xl font-bold text-fg">Twitter/X downloader FAQ</h2>
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
