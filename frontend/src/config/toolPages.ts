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
    placeholder: "Paste link",
    buttonLabel: "Download Reel",
    initialTab: "reels",
    trust: ["No account required", "Public Reels only", "Preview before saving"],
    seoTitle: "Instagram Reels Downloader – Save Reels as MP4 | Downloadit",
    seoDescription:
      "Download public Instagram Reels as MP4 with the original audio. Paste a Reel link, preview the available quality and save it free — no login or app required.",
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
    placeholder: "Paste link",
    buttonLabel: "Download Media",
    initialTab: "videos",
    trust: ["No account required", "Public media only", "Preview before saving"],
    seoTitle: "Instagram Downloader – Reels, Videos, Photos & Stories | Downloadit",
    seoDescription:
      "Download public Instagram media with one tool: Reels, videos, photos, carousels, Stories and MP3 audio. Paste a link, preview the result and save. No login.",
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
    placeholder: "Paste link",
    buttonLabel: "Download Photo",
    initialTab: "photos",
    trust: ["No account required", "Public posts only", "Original image quality"],
    seoTitle: "Instagram Photo & Carousel Downloader – Save Images | Downloadit",
    seoDescription:
      "Download public Instagram photos and carousel slides at the resolution Instagram provides. Save a single image or every slide as JPEG. Free, no login required.",
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
    placeholder: "Paste link",
    buttonLabel: "Download Story",
    initialTab: "stories",
    trust: ["No account required", "Live public Stories only", "Save within 24 hours"],
    seoTitle: "Instagram Story Downloader – Save Public Stories | Downloadit",
    seoDescription:
      "Download public Instagram Stories while they are still live. Save Story photos as JPEG or videos as MP4 before the 24-hour window closes. No login required.",
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
    placeholder: "Paste link",
    buttonLabel: "Extract Audio",
    initialTab: "audio",
    trust: ["No account required", "Public Reels and videos only", "Full track as MP3"],
    seoTitle: "Instagram Audio Downloader – Reels & Video to MP3 | Downloadit",
    seoDescription:
      "Extract audio from public Instagram Reels and videos as an MP3. Paste a link, preview the media and download the sound track. Free, no software, no login.",
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
    placeholder: "Paste link",
    buttonLabel: "Download Pin",
    modes: ["any"],
    trust: [
      "Free to use",
      "No account required",
      "Public pins only",
      "Preview before downloading",
    ],
    seoTitle: "Pinterest Video Downloader – Save Public Video Pins | Downloadit",
    seoDescription:
      "Download public Pinterest video Pins as MP4. Paste a Pin link, preview the available media and save the video file. Free to use, no login or extension needed.",
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
    placeholder: "Paste link",
    buttonLabel: "Download Pin",
    modes: ["any"],
    trust: [
      "Free to use",
      "No account required",
      "Public pins only",
      "Original image quality",
    ],
    seoTitle: "Pinterest Image Downloader – Save Images in High Resolution | Downloadit",
    seoDescription:
      "Download images from public Pinterest Pins, including supported carousel slides. Paste a Pin link, preview the pictures and save them in the format provided.",
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
    placeholder: "Paste link",
    buttonLabel: "Get Video",
    trust: ["Public videos only", "No login required", "Preview before saving"],
    seoTitle: "Facebook Video Downloader – Save Public FB Videos | Downloadit",
    seoDescription:
      "Download publicly accessible Facebook videos and Reels as MP4. Paste a post link, preview the available media and save it without a Facebook login.",
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
    placeholder: "Paste link",
    buttonLabel: "Get Video",
    trust: ["Public posts only", "No login required", "Preview before saving"],
    seoTitle: "Twitter/X Video Downloader – Save Videos as MP4 | Downloadit",
    seoDescription:
      "Download videos and animated GIFs from public Twitter/X posts as MP4. Paste a post link, preview the available media and save it without an account.",
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
    placeholder: "Paste link",
    buttonLabel: "Get Media",
    trust: ["Public posts only", "No login required", "Video and images supported"],
    seoTitle: "Threads Video Downloader – Save Videos & Photos | Downloadit",
    seoDescription:
      "Download videos and photos from public Threads posts. Paste a Threads link, preview the available media and save it to your device without logging in.",
  },
} as const satisfies Record<string, ToolPageConfig>;

export type ToolPageKey = keyof typeof TOOL_PAGES;

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
    alternates: { canonical: page.path },
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
