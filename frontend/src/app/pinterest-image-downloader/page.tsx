import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import PinterestImageDownloaderPageClient from "./PageClient";
import { TOOL_PAGES, toolMetadata } from "@/config/toolPages";

const PAGE = TOOL_PAGES.pinterestImage;
export const metadata: Metadata = toolMetadata(PAGE);

const FAQS = [
  ["How do I download a public Pinterest image pin?", "Copy the link to a public Pinterest image pin, paste it above, select Get Media, preview the available image, and select Download."],
  ["Can I use a Pinterest image pin URL?", "Yes. Public Pinterest image pin URLs are supported when the image is accessible to logged-out visitors."],
  ["Can I use a pin.it short link?", "Yes. Shortened pin.it links are normalized and accepted."],
  ["Do I need a Pinterest account?", "No account is requested by Downloadit. The pin itself must be publicly accessible without signing in."],
  ["Why does my Pinterest link fail?", "The link may point to a board, category, or search page rather than a single pin. The pin may be private, deleted, or temporarily unavailable. Board and search pages are not supported because they point at collections rather than a single pin."],
  ["Can I download a private Pinterest image pin?", "No. Private pins, restricted content, and login-walled pins are not supported."],
  ["What format is downloaded?", "The resolver returns the public image file Pinterest exposes, normally JPG, PNG, or WebP format at the available resolution."],
  ["Why is the preview unavailable?", "Pinterest image pin links can expire and public availability can change. Open the pin in a private browser window and submit a fresh link."],
  ["Does this work on mobile?", "Yes. The page works in current mobile browsers, including common Android and iPhone browsers."],
  ["Can I download someone else's Pinterest image?", "Only save media you have permission to use and follow Pinterest's terms and the creator's rights."],
];

export default function PinterestImageDownloaderPage() {
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
        <PinterestImageDownloaderPageClient />
        <section className="mx-auto max-w-[900px] px-5 pb-16 sm:px-6 lg:px-12">
          <Link href="/" className="font-semibold text-primary hover:underline">← Back to Home</Link>
          <h2 className="mt-8 text-2xl font-bold text-fg">Download public Pinterest image pins</h2>
          <p className="mt-3 text-base leading-7 text-fg-muted">
            Download public Pinterest image pins online. Paste an image pin link above and Downloadit identifies the available images, lets you preview them, and saves them to your device. No account required.
          </p>
          <h2 className="mt-8 text-2xl font-bold text-fg">Supported Pinterest links</h2>
          <p className="mt-3 text-base leading-7 text-fg-muted">
            The Pinterest image downloader supports public image pins. It works in a modern browser on desktop, tablet, and mobile. Board pages, category pages, search results, and profile pages are not supported because they point at collections rather than a single pin.
          </p>
          <h2 className="mt-8 text-2xl font-bold text-fg">Public content only</h2>
          <p className="mt-3 text-base leading-7 text-fg-muted">
            Private pins, removed pins, and login-walled content cannot be downloaded. Downloadit does not ask for Pinterest passwords, cookies, or session credentials and does not bypass access controls. Only publicly accessible pins can be fetched.
          </p>
          <h2 className="mt-8 text-2xl font-bold text-fg">How to download Pinterest image pins</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-base leading-7 text-fg-muted">
            <li>Open the public Pinterest image pin you want to save.</li>
            <li>Copy the pin URL from the address bar or the Share menu.</li>
            <li>Return to Downloadit and paste the link into the Pinterest image downloader.</li>
            <li>Select Get Media, confirm the preview of the available image, and download the individual image.</li>
          </ol>
          <h2 className="mt-8 text-2xl font-bold text-fg">Troubleshooting</h2>
          <p className="mt-3 text-base leading-7 text-fg-muted">
            Invalid links, deleted pins, private content, and expired media URLs can prevent a download. Open the pin in a private or incognito browser window while logged out to confirm it is publicly viewable, then submit the link again.
          </p>
          <h2 className="mt-8 text-2xl font-bold text-fg">Pinterest image downloader FAQ</h2>
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
