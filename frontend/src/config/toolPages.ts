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
  mediaNote: string;
}

export interface PinterestToolPage extends BaseToolPage {
  platform: "pinterest";
  /** Selectable media controls. Never lists a type this route does not serve. */
  modes: PinterestMode[];
}

export interface YouTubeToolPage extends BaseToolPage {
  platform: "youtube";
}

export type ToolPageConfig =
  | InstagramToolPage
  | PinterestToolPage
  | YouTubeToolPage;

export const TOOL_PAGES = {
  instagramReels: {
    platform: "instagram",
    path: "/instagram-reels-downloader",
    name: "Instagram Reels Downloader",
    titleA: "Instagram Reels ",
    titleB: "Downloader",
    badge: "Instagram Reels Downloader · Free & Fast",
    description:
      "Drop a public Instagram Reels link into the downloader and save the original MP4 — preview it first, no login, nothing to install.",
    placeholder: "Paste URL",
    buttonLabel: "Download Reel",
    initialTab: "reels",
    mediaNote: "Public Reels · MP4 with original audio",
    trust: ["No account required", "Public Reels only", "Preview before saving"],
    seoTitle: "Instagram Reels Downloader – Save Reels as MP4 | Downloadit",
    seoDescription:
      "Save public Instagram Reels as MP4 with Downloadit. Paste a link, preview in HD and download with original audio — free, no login required.",
  },
  instagramVideo: {
    platform: "instagram",
    path: "/instagram-video-downloader",
    name: "Instagram Video Downloader",
    titleA: "Instagram Video ",
    titleB: "Downloader",
    badge: "Instagram Video Downloader · Free & Fast",
    description:
      "Save public Instagram videos and long clips as MP4 for offline watching — preview the file first, no account needed.",
    placeholder: "Paste URL",
    buttonLabel: "Download Video",
    initialTab: "videos",
    mediaNote: "Public video posts · MP4 in original quality",
    trust: ["No account required", "Public videos only", "Preview before saving"],
    seoTitle: "Instagram Video Downloader – Save Videos as MP4 | Downloadit",
    seoDescription:
      "Download public Instagram videos and Reels as MP4 in original quality. Paste a link, preview in HD and save — free, no login required.",
  },
  instagramPhoto: {
    platform: "instagram",
    path: "/instagram-photo-downloader",
    name: "Instagram Photo & Carousel Downloader",
    titleA: "Instagram Photo & Carousel ",
    titleB: "Downloader",
    badge: "Instagram Photo Downloader · Free & Fast",
    description:
      "Download public Instagram photos and full carousels at original resolution — flip through the slides and save the ones you want.",
    placeholder: "Paste URL",
    buttonLabel: "Download Photo",
    initialTab: "photos",
    mediaNote: "Single photos and multi-slide carousels · JPG, PNG or WebP",
    trust: ["No account required", "Public posts only", "Original image quality"],
    seoTitle: "Instagram Photo Downloader – Save Carousels | Downloadit",
    seoDescription:
      "Save public Instagram photos and full carousels at original quality. Download a single image or every slide at once — free, no login required.",
  },
  instagramStory: {
    platform: "instagram",
    path: "/instagram-story-downloader",
    name: "Instagram Story Downloader",
    titleA: "Instagram Story ",
    titleB: "Downloader",
    badge: "Instagram Story Downloader · Free & Fast",
    description:
      "Save a public Instagram story as image or MP4 while it's still live — after 24 hours the link goes dead.",
    placeholder: "Paste URL",
    buttonLabel: "Download Story",
    initialTab: "stories",
    mediaNote: "Live public Stories · JPG or MP4",
    trust: ["No account required", "Live public Stories only", "Save within 24 hours"],
    seoTitle: "Instagram Story Downloader – Save Stories | Downloadit",
    seoDescription:
      "Save public Instagram Stories before they expire. Paste the Story link and download the image or video in HD — free, no login required.",
  },
  instagramAudio: {
    platform: "instagram",
    path: "/instagram-audio-downloader",
    name: "Instagram Audio Downloader",
    titleA: "Instagram Audio ",
    titleB: "Downloader",
    badge: "Instagram Audio Downloader · Free & Fast",
    description:
      "Extract the sound from a public Reel or video and save it as one full-length MP3 — Audio mode is preselected for you.",
    placeholder: "Paste URL",
    buttonLabel: "Extract Audio",
    initialTab: "audio",
    mediaNote: "Audio from public Reels and videos · MP3",
    trust: ["No account required", "Public Reels and videos only", "Full track as MP3"],
    seoTitle: "Instagram Audio Downloader – Save Audio as MP3 | Downloadit",
    seoDescription:
      "Extract music and sound from public Reels and videos as MP3. Paste a link and download the audio track with Downloadit — free, no login required.",
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
    placeholder: "Paste URL",
    buttonLabel: "Download Pin",
    modes: ["any", "video"],
    trust: [
      "Free to use",
      "No account required",
      "Public pins only",
      "Preview before downloading",
    ],
    seoTitle: "Pinterest Video Downloader – Save Pinterest Videos MP4 Free",
    seoDescription:
      "Free Pinterest video downloader. Paste a public pin link and save Pinterest videos as MP4 in original quality. No login, no watermark, no app needed.",
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
    placeholder: "Paste URL",
    buttonLabel: "Download Pin",
    modes: ["any", "image"],
    trust: [
      "Free to use",
      "No account required",
      "Public pins only",
      "Original image quality",
    ],
    seoTitle: "Pinterest Image Downloader – Save Pinterest Photos HD Free",
    seoDescription:
      "Free Pinterest image downloader. Paste a pin link and download Pinterest photos & carousel images in original HD quality. No login, no watermark.",
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
    placeholder: "Paste URL",
    buttonLabel: "Get Video",
    trust: [
      "Free to use",
      "No account required",
      "Public videos only",
      "MP4 video or MP3/M4A audio",
    ],
    seoTitle: "YouTube Video Downloader – Download YouTube Videos & MP3 Free",
    seoDescription:
      "Free YouTube video downloader. Paste a public YouTube link, choose an available MP4 quality (up to 1080p), or extract the audio as MP3. No login, no app, no watermark added.",
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
