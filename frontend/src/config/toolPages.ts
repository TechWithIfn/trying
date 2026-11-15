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
      "Download public Instagram Reels as MP4 with original audio, free and in HD. No login required.",
    placeholder: "Paste",
    buttonLabel: "Download Reel",
    initialTab: "reels",
    trust: ["No account required", "Public Reels only", "Preview before saving"],
    seoTitle: "Instagram Reels Downloader - Save Reels as MP4, No Watermark",
    seoDescription:
      "Download public Instagram Reels as MP4 with original audio, free and in HD. No login required.",
  },
  instagramVideo: {
    platform: "instagram",
    path: "/instagram-video-downloader",
    name: "Instagram Video Downloader",
    titleA: "Instagram Video ",
    titleB: "Downloader",
    badge: "Instagram Video Downloader · Free & Fast",
    description:
      "Download Instagram videos in HD MP4 for free. No login, no app, no watermark. Paste the link and save instantly.",
    placeholder: "Paste",
    buttonLabel: "Download Media",
    initialTab: "videos",
    trust: ["No account required", "Public videos only", "Preview before saving"],
    seoTitle: "Instagram Video Downloader - Download Free, No Watermark",
    seoDescription:
      "Download Instagram videos in HD MP4 for free. No login, no app, no watermark. Paste the link and save instantly.",
  },
  instagramPhoto: {
    platform: "instagram",
    path: "/instagram-photo-downloader",
    name: "Instagram Photo Downloader",
    titleA: "Instagram Photo ",
    titleB: "Downloader",
    badge: "Instagram Photo Downloader · Free & Fast",
    description:
      "Download Instagram photos and full-resolution images for free. No login, no quality loss, works on any device.",
    placeholder: "Paste",
    buttonLabel: "Download Photo",
    initialTab: "photos",
    trust: ["No account required", "Public photos only", "JPEG and PNG"],
    seoTitle: "Instagram Photo Downloader - Save Photos in Full HD, Free",
    seoDescription:
      "Download Instagram photos and full-resolution images for free. No login, no quality loss, works on any device.",
  },
  instagramStory: {
    platform: "instagram",
    path: "/instagram-story-downloader",
    name: "Instagram Story Downloader",
    titleA: "Instagram Story ",
    titleB: "Downloader",
    badge: "Instagram Story Downloader · Free & Fast",
    description:
      "Download public Instagram Stories as photos or videos while they're still live, free and without logging in.",
    placeholder: "Paste",
    buttonLabel: "Download Story",
    initialTab: "stories",
    trust: ["No account required", "Live public Stories only", "Save within 24 hours"],
    seoTitle: "Instagram Story Downloader - Save Stories Before They Expire",
    seoDescription:
      "Download public Instagram Stories as photos or videos while they're still live, free and without logging in.",
  },
  instagramAudio: {
    platform: "instagram",
    path: "/instagram-audio-downloader",
    name: "Instagram Audio Downloader",
    titleA: "Instagram Audio ",
    titleB: "Downloader",
    badge: "Instagram Audio Downloader · Free & Fast",
    description:
      "Extract and download the audio from any public Instagram video or Reel as MP3, free and in high quality.",
    placeholder: "Paste",
    buttonLabel: "Extract Audio",
    initialTab: "audio",
    trust: ["No account required", "Public Reels and videos only", "MP3 extraction"],
    seoTitle: "Instagram Audio Downloader - Extract Sound as MP3 Free",
    seoDescription:
      "Extract and download the audio from any public Instagram video or Reel as MP3, free and in high quality.",
  },
  pinterestVideo: {
    platform: "pinterest",
    path: "/pinterest-video-downloader",
    name: "Pinterest Video Downloader",
    titleA: "Pinterest Video ",
    titleB: "Downloader",
    badge: "Pinterest Video Downloader · Free & Fast",
    description:
      "Download Pinterest videos in HD MP4 for free, no watermark, no login. Paste any Pin link and save instantly.",
    placeholder: "Paste",
    buttonLabel: "Download Pin",
    modes: ["any"],
    trust: [
      "Free to use",
      "No account required",
      "Public pins only",
      "Preview before downloading",
    ],
    seoTitle: "Pinterest Video Downloader - Download Pin Videos in HD Free",
    seoDescription:
      "Download Pinterest videos in HD MP4 for free, no watermark, no login. Paste any Pin link and save instantly.",
  },
  pinterestImage: {
    platform: "pinterest",
    path: "/pinterest-image-downloader",
    name: "Pinterest Image Downloader",
    titleA: "Pinterest Image ",
    titleB: "Downloader",
    badge: "Pinterest Image Downloader · Free & Fast",
    description:
      "Download Pinterest images in full original resolution for free. No login, no watermark, works on any device.",
    placeholder: "Paste",
    buttonLabel: "Download Pin",
    modes: ["any"],
    trust: [
      "Free to use",
      "No account required",
      "Public pins only",
      "Original image quality",
    ],
    seoTitle: "Pinterest Image Downloader - Save High-Res Images Free",
    seoDescription:
      "Download Pinterest images in full original resolution for free. No login, no watermark, works on any device.",
  },
  facebookVideo: {
    platform: "facebook",
    path: "/facebook-video-downloader",
    name: "Facebook Video Downloader",
    titleA: "Facebook Video ",
    titleB: "Downloader",
    badge: "Facebook Video Downloader · Free & Fast",
    description:
      "Download public Facebook videos in HD MP4 for free. No login, no watermark, no app installation needed.",
    placeholder: "Paste",
    buttonLabel: "Get Video",
    trust: ["Public videos only", "No login required", "Preview before saving"],
    seoTitle: "Facebook Video Downloader - Save FB Videos in HD Free",
    seoDescription:
      "Download public Facebook videos in HD MP4 for free. No login, no watermark, no app installation needed.",
  },
  twitterVideo: {
    platform: "twitter",
    path: "/twitter-video-downloader",
    name: "Twitter/X Video Downloader",
    titleA: "Twitter/X Video ",
    titleB: "Downloader",
    badge: "Twitter/X Video Downloader · Free & Fast",
    description:
      "Download videos from X (Twitter) posts in HD MP4 for free. No login, no watermark, works on any device.",
    placeholder: "Paste",
    buttonLabel: "Get Video",
    trust: ["Public posts only", "No login required", "Preview before saving"],
    seoTitle: "Twitter/X Video Downloader - Download Videos in HD Free",
    seoDescription:
      "Download videos from X (Twitter) posts in HD MP4 for free. No login, no watermark, works on any device.",
  },
  threadsVideo: {
    platform: "threads",
    path: "/threads-video-downloader",
    name: "Threads Video Downloader",
    titleA: "Threads Video ",
    titleB: "Downloader",
    badge: "Threads Video Downloader · Free & Fast",
    description:
      "Download public Threads videos and photos for free. No login, no watermark, fast and simple.",
    placeholder: "Paste",
    buttonLabel: "Get Media",
    trust: ["Public posts only", "No login required", "Video and images supported"],
    seoTitle: "Threads Video Downloader - Save Public Videos Free",
    seoDescription:
      "Download public Threads videos and photos for free. No login, no watermark, fast and simple.",
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
