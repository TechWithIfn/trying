import type { Metadata } from "next";
import { SITE_URL } from "@/config/site";

/**
 * Single source of truth for tool-page presentation.
 *
 * Every downloader route reads its identity from here: page name, the two-part
 * H1 rendered inside the hero, the hero description, the input placeholder,
 * the media controls that route actually offers, its trust indicators and its
 * SEO title/description/canonical. A route can therefore never inherit another
 * route's headline, placeholder or media controls — the values are looked up
 * by route key, never shared.
 *
 * Long-form page content (guide, troubleshooting, FAQ) stays in each route's
 * `page.tsx`, because it is genuinely page-specific prose.
 */

/** Instagram media tabs a tool route may expose in its hero. */
export type InstagramMediaTab = "reels" | "videos" | "photos" | "stories" | "audio";

/** Pinterest media modes a tool route may expose (auto detection stays first). */
export type PinterestMode = "any" | "video" | "image";

interface BaseToolPage {
  /** Route path. Also used as the canonical path. */
  path: string;
  /** Visible page name — used for headings, links and structured data. */
  name: string;
  /**
   * Two-part hero heading. `titleA` keeps its trailing space so the DOM text
   * reads "Instagram Reels Downloader" rather than "Instagram ReelsDownloader"
   * (the two spans are separate blocks).
   */
  titleA: string;
  titleB: string;
  /** Hero description shown directly under the heading. */
  description: string;
  /** URL field placeholder — names this route's link type only. */
  placeholder: string;
  /** Primary action button label, e.g. "Download Reel" or "Get Media". */
  buttonLabel?: string;
  /** Eyebrow badge above the heading. */
  badge: string;
  /** Honest trust indicators shown under the input. */
  trust: string[];
  seoTitle: string;
  seoDescription: string;
}

export interface InstagramToolPage extends BaseToolPage {
  platform: "instagram";
  /** Preselected media mode (behavioural — audio requests an MP3). */
  initialTab: InstagramMediaTab;
  /** Note rendered with the single supported-media chip in the hero. */
  mediaNote?: string;
}

export interface PinterestToolPage extends BaseToolPage {
  platform: "pinterest";
  /** Selectable media controls. Never lists a type this route does not serve. */
  modes: PinterestMode[];
}

export interface FacebookToolPage extends BaseToolPage {
  platform: "facebook";
}

export interface TwitterToolPage extends BaseToolPage {
  platform: "twitter";
}

export interface ThreadsToolPage extends BaseToolPage {
  platform: "threads";
}

export type ToolPageConfig =
  | InstagramToolPage
  | PinterestToolPage
  | FacebookToolPage
  | TwitterToolPage
  | ThreadsToolPage;

export const TOOL_PAGES = {
  instagramReels: {
    platform: "instagram",
    path: "/instagram-reels-downloader",
    name: "Instagram Reels Downloader",
    titleA: "Instagram Reels ",
    titleB: "Downloader",
    badge: "Instagram Reels Downloader · Free & Fast",
    description:
      "Save public Instagram Reels as MP4 with original audio. Paste any public Reel link, preview the available quality, and download without an account.",
    placeholder: "Paste",
    buttonLabel: "Download Reel",
    initialTab: "reels",
    trust: ["No account required", "Public Reels only", "Preview before saving"],
    seoTitle: "Instagram Reels Downloader – Save Reels in HD | Downloadit",
    seoDescription:
      "Download public Instagram Reels as MP4 with the original sound. Free, no login. Paste the link and save the Reel in seconds. Public media only.",
  },
  instagramVideo: {
    platform: "instagram",
    path: "/instagram-video-downloader",
    name: "Instagram Downloader",
    titleA: "Instagram ",
    titleB: "Downloader",
    badge: "Instagram Downloader · Free & Fast",
    description:
      "Download public Instagram Reels, Stories, Videos, Photos, and Carousels as MP4 or JPEG. Preview first, no login required.",
    placeholder: "Paste",
    buttonLabel: "Download Media",
    initialTab: "videos",
    trust: ["No account required", "Public media only", "Preview before saving"],
    seoTitle: "Instagram Video Downloader – Free HD MP4 | Downloadit",
    seoDescription:
      "Download public Instagram videos as MP4 in the quality the post offers. Free, no login. Paste the link and save the file to your device. Public media only.",
  },
  instagramPhoto: {
    platform: "instagram",
    path: "/instagram-photo-downloader",
    name: "Instagram Photo & Carousel Downloader",
    titleA: "Instagram Photo & Carousel ",
    titleB: "Downloader",
    badge: "Instagram Photo Downloader · Free & Fast",
    description:
      "Download public Instagram photos and full carousels at original resolution — flip through the slides and save single images or the full collection.",
    placeholder: "Paste",
    buttonLabel: "Download Photo",
    initialTab: "photos",
    trust: ["No account required", "Public posts only", "Original image quality"],
    seoTitle: "Instagram Photo Downloader – Save HD Photos | Downloadit",
    seoDescription:
      "Download public Instagram photos and carousel images as JPEG. Free, no login. Paste the link and save the pictures. Only public media is supported.",
  },
  instagramStory: {
    platform: "instagram",
    path: "/instagram-story-downloader",
    name: "Instagram Story Downloader",
    titleA: "Instagram Story ",
    titleB: "Downloader",
    badge: "Instagram Story Downloader · Free & Fast",
    description:
      "Save public Instagram Stories before they expire. Paste a Story link and download Story videos as MP4 or Story photos at the available resolution — free, no login required.",
    placeholder: "Paste",
    buttonLabel: "Download Story",
    initialTab: "stories",
    trust: ["No account required", "Live public Stories only", "Save within 24 hours"],
    seoTitle: "Instagram Story Downloader – Save Public Stories | Downloadit",
    seoDescription:
      "Download public Instagram Stories while they are still live, as MP4 or JPEG. Free, no login. Paste the link and save. Only public media is supported.",
  },
  instagramAudio: {
    platform: "instagram",
    path: "/instagram-audio-downloader",
    name: "Instagram Audio Downloader",
    titleA: "Instagram Audio ",
    titleB: "Downloader",
    badge: "Instagram Audio Downloader · Free & Fast",
    description:
      "Extract sound and music from public Instagram Reels and videos as MP3 — free online Instagram to MP3 converter with no software required.",
    placeholder: "Paste",
    buttonLabel: "Extract Audio",
    initialTab: "audio",
    trust: ["No account required", "Public Reels and videos only", "Full track as MP3"],
    seoTitle: "Instagram Audio Downloader – Reels to MP3 | Downloadit",
    seoDescription:
      "Save the audio from a public Instagram Reel or video as an MP3 file. Free, no login. Paste the link and save the sound. Only public media is supported.",
  },
  pinterestVideo: {
    platform: "pinterest",
    path: "/pinterest-video-downloader",
    name: "Pinterest Video Downloader",
    titleA: "Pinterest Video ",
    titleB: "Downloader",
    badge: "Pinterest Video Downloader · Free & Easy",
    description:
      "Paste a public Pinterest video pin link, preview the video, and download it as MP4. No account, no added watermark, nothing to install. Works on iPhone, Android, Windows and Mac.",
    placeholder: "Paste",
    buttonLabel: "Download Pin",
    modes: ["any"],
    trust: [
      "Free to use",
      "No account required",
      "Public pins only",
      "Preview before downloading",
    ],
    seoTitle: "Pinterest Video Downloader – Save Pins as MP4 | Downloadit",
    seoDescription:
      "Download public Pinterest video Pins as MP4. Free, no login. Paste the Pin link and save the video to your device. Only public media is supported.",
  },
  pinterestImage: {
    platform: "pinterest",
    path: "/pinterest-image-downloader",
    name: "Pinterest Image & Carousel Downloader",
    titleA: "Pinterest Image & Carousel ",
    titleB: "Downloader",
    badge: "Pinterest Image Downloader · Free & Easy",
    description:
      "Paste a public Pinterest image pin link, preview the available media, and download the pictures in their original format. The same pin link also works as a Pinterest carousel downloader — no account needed.",
    placeholder: "Paste",
    buttonLabel: "Download Pin",
    modes: ["any"],
    trust: [
      "Free to use",
      "No account required",
      "Public pins only",
      "Original image quality",
    ],
    seoTitle: "Pinterest Image Downloader – HD Photos Free | Downloadit",
    seoDescription:
      "Download public Pinterest images and carousel photos as JPEG. Free, no login. Paste the Pin link and save the pictures. Only public media is supported.",
  },
  facebookVideo: {
    platform: "facebook",
    path: "/facebook-video-downloader",
    name: "Facebook Video Downloader",
    titleA: "Facebook Video ",
    titleB: "Downloader",
    badge: "Facebook Video Downloader · Free & Easy",
    description:
      "Save publicly accessible Facebook videos, Reels and Watch videos as MP4. Paste a link, preview it, and download without a Facebook login.",
    placeholder: "Paste",
    buttonLabel: "Get Video",
    trust: ["Public videos only", "No login required", "Preview before saving"],
    seoTitle: "Facebook Video Downloader – Free HD MP4 | Downloadit",
    seoDescription:
      "Download public Facebook videos as MP4 in the quality the post offers. Free, no login. Paste the link and save the file. Only public media is supported.",
  },
  twitterVideo: {
    platform: "twitter",
    path: "/twitter-video-downloader",
    name: "Twitter Video Downloader",
    titleA: "Twitter Video ",
    titleB: "Downloader",
    badge: "Twitter/X Video Downloader · Free & Easy",
    description:
      "Download publicly accessible Twitter/X videos as MP4. Paste a public post link, preview the available video, and save it without a login.",
    placeholder: "Paste",
    buttonLabel: "Get Video",
    trust: ["Public posts only", "No login required", "Preview before saving"],
    seoTitle: "Twitter Video Downloader – Save X Videos MP4 | Downloadit",
    seoDescription:
      "Download public X and Twitter videos as MP4. Free, no login. Paste the post link and save the clip to your device. Only public media is supported.",
  },
  threadsVideo: {
    platform: "threads",
    path: "/threads-video-downloader",
    name: "Threads Video Downloader",
    titleA: "Threads Video ",
    titleB: "Downloader",
    badge: "Threads Video Downloader · Free & Easy",
    description:
      "Download videos and images from public Threads posts. Paste a link, preview supported media, and save it without a login.",
    placeholder: "Paste",
    buttonLabel: "Get Media",
    trust: ["Public posts only", "No login required", "Video and images supported"],
    seoTitle: "Threads Video Downloader – Save Videos Free | Downloadit",
    seoDescription:
      "Download public Threads videos as MP4. Free, no login. Paste the post link and save the video file to your device. Only public media is supported.",
  },
} as const satisfies Record<string, ToolPageConfig>;

export type ToolPageKey = keyof typeof TOOL_PAGES;

/** Main tool routes that have a real, translated Hindi page under /hi/. */
const HINDI_TOOL_PATHS = new Set([
  "/instagram-video-downloader",
  "/pinterest-video-downloader",
  "/facebook-video-downloader",
  "/twitter-video-downloader",
  "/threads-video-downloader",
]);

/**
 * Shared metadata for a tool route: unique absolute title, unique description,
 * canonical path (resolved against `metadataBase`) and matching OG/Twitter
 * tags. Building it here guarantees no route can drift or collide.
 */
export function toolMetadata(
  page: Pick<BaseToolPage, "path" | "name" | "seoTitle" | "seoDescription">
): Metadata {
  const url = `${SITE_URL}${page.path}`;
  const alt = `${page.name} — Downloadit`;
  return {
    title: { absolute: page.seoTitle },
    description: page.seoDescription,
    alternates: {
      canonical: page.path,
      languages: HINDI_TOOL_PATHS.has(page.path)
        ? {
            en: url,
            hi: `${SITE_URL}/hi${page.path}`,
            "x-default": url,
          }
        : {
            en: url,
            "x-default": url,
          },
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: { absolute: page.seoTitle },
      description: page.seoDescription,
      url,
      type: "website",
      images: [{ url: "/og-downloadit.png", width: 1200, height: 630, alt }],
    },
    twitter: {
      card: "summary_large_image",
      title: { absolute: page.seoTitle },
      description: page.seoDescription,
      images: ["/og-downloadit.png"],
    },
  };
}
