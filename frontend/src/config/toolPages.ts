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

export interface YouTubeToolPage extends BaseToolPage {
  platform: "youtube";
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
  | YouTubeToolPage
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
      "Save public Instagram Reels as MP4 with original audio. Paste any public Reel link, preview in HD, and download without an account.",
    placeholder: "Paste link",
    buttonLabel: "Download Reel",
    initialTab: "reels",
    trust: ["No account required", "Public Reels only", "Preview before saving"],
    seoTitle: "Instagram Reels Downloader – Download Reels Videos in HD | Downloadit",
    seoDescription:
      "Download public Instagram Reels online for free with Downloadit. Save high-definition vertical MP4 Reels with clean audio. Fast, mobile-friendly, no login required.",
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
    seoTitle: "Instagram Downloader – Reels, Stories, Videos, Photos & Audio | Downloadit",
    seoDescription:
      "Download Instagram Reels, Stories, Videos, Photos and Carousel posts online with Downloadit. Save supported Instagram media and extract audio as MP3 for free.",
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
    seoTitle: "Instagram Photo & Carousel Downloader – Save Images & Slides | Downloadit",
    seoDescription:
      "Download Instagram photos and multi-slide carousel posts in original high resolution. Save single images or all slides as JPEG for free. No login required.",
  },
  instagramStory: {
    platform: "instagram",
    path: "/instagram-story-downloader",
    name: "Instagram Story Downloader",
    titleA: "Instagram Story ",
    titleB: "Downloader",
    badge: "Instagram Story Downloader · Free & Fast",
    description:
      "Save public Instagram Stories before they expire. Paste a Story link and download Story videos as MP4 or Story photos in HD — free, no login required.",
    placeholder: "Paste link",
    buttonLabel: "Download Story",
    initialTab: "stories",
    trust: ["No account required", "Live public Stories only", "Save within 24 hours"],
    seoTitle: "Instagram Story Downloader – Save Stories Online | Downloadit",
    seoDescription:
      "Download public Instagram Stories anonymously before they expire. Save Story videos as MP4 and Story photos in original quality. Free, no login required.",
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
    seoTitle: "Instagram Audio Downloader – Extract Reels & Video Audio to MP3 | Downloadit",
    seoDescription:
      "Extract sound and music from public Instagram Reels and videos as high-quality MP3. Free online Instagram to MP3 converter with no software installation.",
  },
  pinterestVideo: {
    platform: "pinterest",
    path: "/pinterest-video-downloader",
    name: "Pinterest Video Downloader",
    titleA: "Pinterest Video ",
    titleB: "Downloader",
    badge: "Pinterest Video Downloader · Free & Easy",
    description:
      "Paste a public Pinterest video pin link, preview the video, and download it as MP4. No account, no watermark, nothing to install. Works on iPhone, Android, Windows and Mac.",
    placeholder: "Paste link",
    buttonLabel: "Download Pin",
    modes: ["any"],
    trust: [
      "Free to use",
      "No account required",
      "Public pins only",
      "Preview before downloading",
    ],
    seoTitle: "Pinterest Video Downloader – Download Pinterest Videos & Images | Downloadit",
    seoDescription:
      "Download Pinterest videos and images online for free with Downloadit. Save public Pinterest Pins as MP4 videos or images, including supported carousel media. No login required.",
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
    seoTitle: "Pinterest Image & Carousel Downloader – Save Pins & Slides | Downloadit",
    seoDescription:
      "Download Pinterest images and multi-photo carousel Pins online with Downloadit. Save high-resolution JPEG pictures directly from public Pins for free. No login needed.",
  },
  youtubeVideo: {
    platform: "youtube",
    path: "/youtube-video-downloader",
    name: "YouTube Video Downloader",
    titleA: "YouTube Video ",
    titleB: "Downloader",
    badge: "YouTube Video Downloader · Free & Easy",
    description:
      "Paste a public YouTube video link, choose an available quality up to 1080p, and download MP4 — or extract the audio as MP3 or M4A. No account, no watermark, nothing to install. Works on iPhone, Android, Windows and Mac.",
    placeholder: "Paste link",
    buttonLabel: "Get Video",
    trust: [
      "Free to use",
      "No account required",
      "Public videos only",
      "MP4 video or MP3/M4A audio",
    ],
    seoTitle: "YouTube Video Downloader – Download Videos in Supported Quality | Downloadit",
    seoDescription:
      "Free YouTube video downloader. Paste a public YouTube link, choose an available MP4 quality (up to 1080p), or extract the audio as MP3. No login, no app, no watermark added.",
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
    seoTitle: "Facebook Video Downloader – Download FB Videos in HD | Downloadit",
    seoDescription:
      "Download Facebook videos online for free with Downloadit.pro. Paste a public Facebook video or Reel link, preview available media and save supported HD MP4 quality. No login required.",
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
    seoTitle: "Twitter Video Downloader – Download X Videos in MP4 HD | Downloadit",
    seoDescription:
      "Download Twitter (X) videos online for free with Downloadit. Save public X videos as MP4 in available quality. Fast, easy, mobile-friendly and no login required.",
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
    seoTitle: "Threads Video Downloader – Download Threads Videos in HD | Downloadit",
    seoDescription:
      "Download Threads videos online for free with Downloadit. Paste a public Threads post link, preview available media and save videos in supported MP4 quality. No login required.",
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
