import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { SITE_URL } from "@/config/site";

const ABOUT_TITLE = "About Downloadit | Downloadit";
const ABOUT_DESCRIPTION =
  "Learn what Downloadit is, why it was built, how it works, what it supports, and how to contact us.";

export const metadata: Metadata = {
  title: { absolute: ABOUT_TITLE },
  description: ABOUT_DESCRIPTION,
  alternates: { canonical: "/about" },
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
  return (
    <LegalPage title="About Downloadit" updated="October 2026" crumbPath="/about">
      <p>
        Downloadit is a free tool for saving media from public Instagram links.
        Paste a link, preview what is found, and download it to your phone,
        tablet or desktop. No account, no app install, no login — that is the
        whole idea.
      </p>
      <p>
        It was built out of a small, everyday annoyance: Instagram has no save
        button. People screenshot photos and lose quality, or screen-record
        clips and get something barely watchable. I wanted one page with one
        field that skips all of that — paste a public link, get the original
        file, done. No popups in the way, no password asked, nothing to sign
        up for.
      </p>
      <p>
        Under the hood the flow is simple. Your link is sent to the backend,
        which resolves the publicly available media behind it and hands back a
        preview plus temporary download references. You check the preview in
        your browser and save what you want. Media links are short-lived by
        nature, so every resolve starts from the live link instead of a
        stored copy. Audio works the same way except for one extra
        step: the sound is extracted on the server first, which is why audio
        takes longer and can occasionally be busy.
      </p>
      <p>
        The tool covers the media types people actually ask for:{" "}
        <Link href="/instagram-reels-downloader" className="font-semibold text-fg transition-colors hover:text-primary">Reels</Link>,{" "}
        <Link href="/instagram-video-downloader" className="font-semibold text-fg transition-colors hover:text-primary">videos</Link>,{" "}
        <Link href="/instagram-photo-downloader" className="font-semibold text-fg transition-colors hover:text-primary">photos and carousels</Link>,{" "}
        <Link href="/instagram-story-downloader" className="font-semibold text-fg transition-colors hover:text-primary">stories</Link>, and{" "}
        <Link href="/instagram-audio-downloader" className="font-semibold text-fg transition-colors hover:text-primary">audio extracted as MP3</Link>.
        Videos save as MP4, photos keep their original JPG, PNG or WebP, and
        stories keep whatever image or video format they were posted in. The{" "}
        <Link href="/help" className="font-semibold text-fg transition-colors hover:text-primary">Help page</Link>{" "}
        walks through each of these with troubleshooting for the common
        failures.
      </p>
      <p>
        One rule governs everything: public content only. The test is what a
        logged-out stranger can view. Private accounts, Close Friends,
        deleted posts and expired stories fail that test and return a clear
        message instead of a file. Access controls are never bypassed, and
        nothing on this site will ever ask for your Instagram password to get
        around them.
      </p>
      <p>
        Privacy follows from that design. There are no accounts, so there is
        nothing to tie your activity to — no download history in your browser,
        no profile, no tracking of who saved what. Pasted links exist
        transiently to complete your request and then expire. Your files live
        on your device and nowhere else.
      </p>
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
      <p>
        Downloadit is an independent service and is not affiliated with,
        endorsed by, or sponsored by Instagram or Meta. It only reads what is
        already publicly available through normal links, and you are
        responsible for having the right to download and reuse anything you
        save — see the <Link href="/terms" className="font-semibold text-fg transition-colors hover:text-primary">Terms</Link> and{" "}
        <Link href="/dmca" className="font-semibold text-fg transition-colors hover:text-primary">DMCA pages</Link> if
        you are unsure.
      </p>
      <p>
        Questions, broken links, or reports? Write to the support email
        linked at the bottom of this page. Include the link you tried, what
        happened instead of a download, and what device and browser you use —
        that is usually enough to tell whether the problem is the link, the
        content&apos;s visibility, or something on our side.
      </p>
    </LegalPage>
  );
}
