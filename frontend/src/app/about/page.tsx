import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { SITE_URL, SUPPORT_EMAIL, supportMailto } from "@/config/site";

const ABOUT_TITLE = "About Downloadit – Purpose, Platforms & Team";
const ABOUT_DESCRIPTION =
  "Learn who runs Downloadit, why the public-media downloader exists, which platforms it supports and how it handles privacy, copyright and support.";

export const metadata: Metadata = {
  title: { absolute: ABOUT_TITLE },
  description: ABOUT_DESCRIPTION,
  alternates: { canonical: "/about" },
  authors: [{ name: "Downloadit", url: SITE_URL }],
  creator: "Downloadit",
  publisher: "Downloadit",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: { absolute: ABOUT_TITLE },
    description: ABOUT_DESCRIPTION,
    type: "website",
    siteName: "Downloadit",
    url: `${SITE_URL}/about`,
    images: [{ url: "/og-downloadit.png", width: 1200, height: 630, alt: "About Downloadit" }],
  },
  twitter: {
    card: "summary_large_image",
    title: { absolute: ABOUT_TITLE },
    description: ABOUT_DESCRIPTION,
    images: ["/og-downloadit.png"],
  },
};

const linkClass =
  "font-semibold text-fg transition-colors hover:text-primary";

export default function AboutPage() {
  const aboutJson = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "@id": `${SITE_URL}/about#webpage`,
    url: `${SITE_URL}/about`,
    name: ABOUT_TITLE,
    description: ABOUT_DESCRIPTION,
    inLanguage: "en",
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": `${SITE_URL}/#organization` },
    mainEntity: { "@id": `${SITE_URL}/#organization` },
  });

  return (
    <>
      <script
        id="aboutpage-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: aboutJson }}
      />
      <LegalPage title="About Downloadit" updated="November 2026" crumbPath="/about">
        <p>
          Downloadit is an independent, browser-based media downloader at{" "}
          <a
            href={SITE_URL}
            className={linkClass}
            aria-label="Visit the Downloadit homepage"
          >
            downloadit.pro
          </a>
          . It helps people save publicly accessible videos, photos and audio for
          offline personal viewing. There is no account to create, no app to
          install, and no social-media login to hand over.
        </p>

        <h2 className="text-[20px] font-bold text-fg">What Downloadit is</h2>
        <p>
          Downloadit is a small online utility with a focused purpose: take a
          public link from a supported platform, find the media attached to it,
          show a preview, and let you save the file to your device. The project
          is maintained under the Downloadit name and is intended for personal
          archiving, research, creative reference and offline access.
        </p>
        <p>
          The site does not host a media library and is not a social network. It
          works only with individual public links that a visitor pastes into the
          input box on the homepage or on one of the dedicated platform pages.
        </p>

        <h2 className="text-[20px] font-bold text-fg">Why Downloadit was created</h2>
        <p>
          Saving a public video or photo is often more awkward than it should
          be. Many download sites bury the file behind redirect chains,
          pop-ups, fake buttons or browser extensions. Some ask for a
          social-media password, which should never be necessary for a public
          post.
        </p>
        <p>
          Downloadit was built around a simpler idea: paste a public link,
          preview what the platform already serves publicly, and download the
          file you actually want. The interface is deliberately plain, the
          wording explains failures instead of hiding them, and the same flow
          works on a phone, tablet or desktop browser.
        </p>

        <h2 className="text-[20px] font-bold text-fg">What problems it aims to solve</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <strong>Too many steps:</strong> one input accepts links from all
            five supported platforms and detects the source automatically.
          </li>
          <li>
            <strong>Unclear results:</strong> a preview shows the media that was
            found before you commit to a download.
          </li>
          <li>
            <strong>Intrusive download flows:</strong> no fake download buttons,
            no installable extension, and no requirement to create an account.
          </li>
          <li>
            <strong>Privacy concerns:</strong> the service does not ask for
            passwords, cookies or social-media credentials.
          </li>
          <li>
            <strong>Unsupported links:</strong> private, expired and login-walled
            content returns a clear message rather than a misleading file.
          </li>
        </ul>

        <h2 className="text-[20px] font-bold text-fg">Platforms Downloadit supports</h2>
        <p>
          Downloadit currently supports five platforms. Each link below opens the
          dedicated downloader for that platform.
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <Link href="/instagram-video-downloader" className={linkClass}>
              Instagram Downloader
            </Link>{" "}
            — Reels, videos, photos, carousels, stories and audio.
          </li>
          <li>
            <Link href="/pinterest-video-downloader" className={linkClass}>
              Pinterest Downloader
            </Link>{" "}
            — public video pins and high-resolution images.
          </li>
          <li>
            <Link href="/facebook-video-downloader" className={linkClass}>
              Facebook Downloader
            </Link>{" "}
            — publicly accessible Facebook videos.
          </li>
          <li>
            <Link href="/twitter-video-downloader" className={linkClass}>
              Twitter/X Downloader
            </Link>{" "}
            — public post videos and animated GIFs.
          </li>
          <li>
            <Link href="/threads-video-downloader" className={linkClass}>
              Threads Downloader
            </Link>{" "}
            — videos and images from public Threads posts.
          </li>
        </ul>

        <h2 className="text-[20px] font-bold text-fg">Features available</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>Preview the available media before downloading it.</li>
          <li>
            Save public videos as MP4 where the platform provides a progressive
            stream.
          </li>
          <li>
            Save public photos and carousel slides in the image format the
            platform provides, such as JPG, PNG or WebP.
          </li>
          <li>
            Extract audio from supported public Instagram Reels and videos as an
            MP3 file.
          </li>
          <li>
            Use the service without an account, app, browser extension or social
            login.
          </li>
          <li>
            Work in modern mobile and desktop browsers on iPhone, iPad, Android,
            Windows, macOS and Linux.
          </li>
          <li>
            Process one public link at a time, without bulk profile or channel
            scraping.
          </li>
          <li>
            Show a plain explanation when a link is private, expired,
            unsupported or temporarily unavailable.
          </li>
        </ul>

        <h2 className="text-[20px] font-bold text-fg">How to use Downloadit</h2>
        <ol className="list-decimal space-y-1 pl-6">
          <li>
            Open the public post, Reel, Pin or video on the original platform and
            copy its link.
          </li>
          <li>
            Paste the link into the Downloadit input on the{" "}
            <Link href="/" className={linkClass}>
              homepage
            </Link>{" "}
            or on the relevant platform page.
          </li>
          <li>Review the preview and the available file format.</li>
          <li>
            Download the file to your device. On mobile, the file is saved to
            your browser&apos;s Downloads location; on desktop, it goes to your
            normal download folder.
          </li>
        </ol>
        <p>
          The{" "}
          <Link href="/help" className={linkClass}>
            Help page
          </Link>{" "}
          explains each flow in more detail and includes troubleshooting for
          common failures.
        </p>

        <h2 className="text-[20px] font-bold text-fg">What Downloadit cannot do</h2>
        <p>
          The service is intentionally limited to public content. It cannot and
          does not bypass platform access controls. In practice, that means it
          cannot:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            Open private accounts, followers-only posts, secret boards or Close
            Friends stories.
          </li>
          <li>
            Recover deleted posts, expired stories or media that the platform has
            already removed.
          </li>
          <li>
            Bypass a login wall, paywall, password, DRM protection or other
            security mechanism.
          </li>
          <li>
            Scrape an entire profile, channel or board in bulk.
          </li>
          <li>
            Guarantee that a link will work forever. Platforms change their
            pages and media URLs regularly, and a saved link can expire quickly.
          </li>
          <li>
            Grant copyright permission or transfer ownership of any media.
          </li>
        </ul>
        <p>
          Audio extraction depends on server-side processing, so it can take
          longer than a direct video or image download and may be temporarily
          busy. Long videos are large files and need enough storage space and a
          stable connection.
        </p>

        <h2 className="text-[20px] font-bold text-fg">
          Copyright and responsible use
        </h2>
        <p>
          All intellectual property rights remain with the original creators and
          copyright holders. Downloadit does not claim ownership of any media
          processed through the service and does not grant permission to reuse
          it.
        </p>
        <p>
          Use downloaded media only where you have the right to do so — for
          example, your own posts, content you have permission to save, or
          material covered by an applicable exception such as fair use or fair
          dealing. Do not re-upload, redistribute, broadcast or monetise
          third-party media without authorisation, and respect the terms of
          service of the platform you are using.
        </p>
        <p>
          For copyright concerns, use the formal process on the{" "}
          <Link href="/dmca" className={linkClass}>
            DMCA / Copyright Policy
          </Link>{" "}
          page. The{" "}
          <Link href="/terms" className={linkClass}>
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/disclaimer" className={linkClass}>
            Disclaimer
          </Link>{" "}
          set out the full rules.
        </p>

        <h2 className="text-[20px] font-bold text-fg">Contact Downloadit</h2>
        <p>
          Questions, bug reports and feature suggestions are welcome through the{" "}
          <Link href="/contact" className={linkClass}>
            Contact page
          </Link>
          . You can also email{" "}
          <a
            href={supportMailto()}
            className={linkClass}
            aria-label="Email Downloadit support"
            style={{ overflowWrap: "anywhere" }}
          >
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
        <p>
          When reporting a broken download, include the public link and a short
          description of what happened. Never send a social-media password,
          cookie or account credential.
        </p>

        <h2 className="text-[20px] font-bold text-fg">Who maintains Downloadit</h2>
        <p>
          Downloadit is maintained under the project name <strong>Downloadit</strong>.
          The maintainer display name used across the site, metadata and support
          channels is <strong>Downloadit</strong>. The project is independent and
          is not presented as a registered company, agency, staffed team or
          physical office.
        </p>
        <p>
          If formal legal or ownership information is required, please request it
          through the{" "}
          <Link href="/contact" className={linkClass}>
            Contact page
          </Link>{" "}
          rather than inferring it from this page.
        </p>

        <h2 className="text-[20px] font-bold text-fg">An independent service</h2>
        <p>
          Downloadit is an independent service and is not affiliated with,
          endorsed by, or sponsored by Instagram, Meta, Pinterest, X Corp., or
          Threads. Platform names and logos belong to their respective owners and
          are used only to describe the links the service can process.
        </p>
      </LegalPage>
    </>
  );
}
