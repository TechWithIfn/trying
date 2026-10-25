import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { SITE_URL } from "@/config/site";

const ABOUT_TITLE = "About Downloadit – Independent Public-Media Downloader";
const ABOUT_DESCRIPTION =
  "Learn who runs Downloadit, how its independent Instagram, Pinterest and YouTube downloader works, and what it does not access.";

export const metadata: Metadata = {
  title: { absolute: ABOUT_TITLE },
  description: ABOUT_DESCRIPTION,
  alternates: { canonical: "/about" },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: ABOUT_TITLE,
    description: ABOUT_DESCRIPTION,
    type: "website",
    siteName: "Downloadit",
    url: `${SITE_URL}/about`,
    images: [{ url: "/og-downloadit.png", width: 1200, height: 630, alt: "About — Downloadit" }],
  },
  twitter: {
    card: "summary_large_image",
    title: ABOUT_TITLE,
    description: ABOUT_DESCRIPTION,
    images: ["/og-downloadit.png"],
  },
};

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
    about: { "@id": `${SITE_URL}/#webapplication` },
  });
  return (
    <>
      <script
        id="aboutpage-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: aboutJson }}
      />
    <LegalPage title="About Downloadit" updated="October 2026" crumbPath="/about">
      <h2 className="text-[20px] font-bold text-fg">What Downloadit is</h2>
      <p>
        Downloadit is a free tool for saving media from public Instagram,
        Pinterest and YouTube links.
        Paste a link, preview what is found, and download it to your phone,
        tablet or desktop. No account, no app install, no login — that is the
        whole idea.
      </p>
      <h2 className="text-[20px] font-bold text-fg">Why it was built</h2>
      <p>
        It was built out of a small, everyday annoyance: Instagram has no save
        button. People screenshot images and lose quality, or screen-record
        clips and get something barely watchable. I wanted one page with one
        field that skips all of that — paste a public link, get the original
        file, done. No popups in the way, no password asked, nothing to sign
        up for.
      </p>
      <h2 className="text-[20px] font-bold text-fg">Who runs Downloadit</h2>
      <p>
        Downloadit is maintained by [MY NAME], an independent web developer who
        started the project in 2026 to make public-media saving clearer. The
        service is kept deliberately small, and support is handled through the{" "}
        <Link href="/contact" className="font-semibold text-fg transition-colors hover:text-primary">
          Contact page
        </Link>
        .
      </p>
      <p>
        The project focuses on a clear public-content workflow, honest error
        messages, and practical support. If something breaks or you have a
        concern, email the support address listed on the Contact page rather
        than sending credentials or private account details.
      </p>
      <h2 className="text-[20px] font-bold text-fg">How it works, in simple words</h2>
      <p>
        Think of it like this: every public Instagram post, Pinterest pin or
        YouTube video is a page anyone can open, with media sitting on it. When
        you paste a link,
        Downloadit opens that same public page — exactly as a logged-out
        stranger would see it — finds the media files on it, and shows them
        back to you as a preview. You check the preview and save the file you
        want. Nothing is copied in advance and nothing is stored on any
        server in between.
      </p>
      <p>
        Media links are short-lived by nature, so every request starts fresh
        from the live link instead of a stored copy. Audio works the same way
        except for one extra step: the sound is extracted on the server
        first, which is why audio takes longer and can occasionally be busy.
      </p>
      <h2 className="text-[20px] font-bold text-fg">What it does and does not do</h2>
      <p>What Downloadit does:</p>
      <ul className="list-disc space-y-1 pl-6">
        <li>Saves supported public photos, videos, reels, stories, pins, and audio.</li>
        <li>Shows you a preview of the exact file before anything is downloaded.</li>
        <li>Works in the browser with no account, no app, and no login.</li>
      </ul>
      <p>What it deliberately does not do:</p>
      <ul className="list-disc space-y-1 pl-6">
        <li>Open private accounts, Close Friends stories, or anything that needs a login.</li>
        <li>Ask for your Instagram password — not once, not ever.</li>
        <li>Keep copies of your links or files, or track who downloads what.</li>
      </ul>
      <h2 className="text-[20px] font-bold text-fg">What you can download</h2>
      <p>
        The tool covers the media types people actually ask for:{" "}
        <Link href="/instagram-reels-downloader" className="font-semibold text-fg transition-colors hover:text-primary">Reels</Link>,{" "}
        <Link href="/instagram-video-downloader" className="font-semibold text-fg transition-colors hover:text-primary">videos</Link>,{" "}
        <Link href="/instagram-photo-downloader" className="font-semibold text-fg transition-colors hover:text-primary">carousels</Link>,{" "}
        <Link href="/instagram-story-downloader" className="font-semibold text-fg transition-colors hover:text-primary">stories</Link>, and{" "}
        <Link href="/instagram-audio-downloader" className="font-semibold text-fg transition-colors hover:text-primary">audio extracted as MP3</Link>.
        Videos save as MP4, images keep their original JPG, PNG or WebP, and
        stories keep whatever image or video format they were posted in. Downloadit also supports{" "}
        <Link href="/pinterest-video-downloader" className="font-semibold text-fg transition-colors hover:text-primary">Pinterest videos</Link>,{" "}
        <Link href="/pinterest-image-downloader" className="font-semibold text-fg transition-colors hover:text-primary">Pinterest images</Link> and{" "}
        <Link href="/youtube-video-downloader" className="font-semibold text-fg transition-colors hover:text-primary">public YouTube videos</Link>. The{" "}
        <Link href="/help" className="font-semibold text-fg transition-colors hover:text-primary">Help page</Link>{" "}
        walks through each of these with troubleshooting for the common
        failures.
      </p>
      <h2 className="text-[20px] font-bold text-fg">Public content only</h2>
      <p>
        One rule governs everything: public content only. The test is what a
        logged-out stranger can view. Private accounts, Close Friends,
        deleted posts and expired stories fail that test and return a clear
        message instead of a file. Access controls are never bypassed, and
        nothing on this site will ever ask for your Instagram password to get
        around them.
      </p>
      <h2 className="text-[20px] font-bold text-fg">Privacy by design</h2>
      <p>
        Privacy follows from that design. There are no accounts, so there is
        nothing to tie your activity to — no download history in your browser,
        no profile, no tracking of who saved what. Pasted links exist
        transiently to complete your request and then expire. Your files live
        on your device and nowhere else. I run no analytics that identifies
        visitors, and I would rather shut a feature off than add tracking to
        keep it running.
      </p>
      <h2 className="text-[20px] font-bold text-fg">Honest limitations</h2>
      <p>
        A few honest limitations. Media URLs expire quickly, so a link that
        worked minutes ago may need re-resolving. Audio depends on server-side
        processing and can be temporarily unavailable at busy moments. Long
        videos are big files that need storage space and a steady connection.
        And Instagram changes its own site regularly — when something shifts
        on their end, resolution can break until things are adjusted. The
        tool reports these situations plainly rather than pretending
        everything is fine.
      </p>
      <h2 className="text-[20px] font-bold text-fg">An independent service</h2>
      <p>
        Downloadit is an independent service and is not affiliated with,
        endorsed by, or sponsored by Instagram or Meta. It only reads what is
        already publicly available through normal links, and you are
        responsible for having the right to download and reuse anything you
        save — see the <Link href="/terms" className="font-semibold text-fg transition-colors hover:text-primary">Terms</Link> and{" "}
        <Link href="/dmca" className="font-semibold text-fg transition-colors hover:text-primary">DMCA pages</Link> if
        you are unsure.
      </p>
      <h2 className="text-[20px] font-bold text-fg">Contact</h2>
      <p>
        Questions, broken links, or reports? The fastest route is the{" "}
        <Link href="/contact" className="font-semibold text-fg transition-colors hover:text-primary">Contact page</Link>,
        which explains what to include so most issues are solved in one
        reply. If you believe content reachable through this site infringes
        your copyright, use the formal process on the{" "}
        <Link href="/dmca" className="font-semibold text-fg transition-colors hover:text-primary">DMCA page</Link>{" "}
        instead — complete notices there are reviewed within 48–72 hours.
      </p>
    </LegalPage>
    </>
  );
}
