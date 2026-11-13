import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config/site";
import { getAllPosts, getHindiPosts } from "@/lib/blog";
import { KEYWORD_PAGES } from "@/config/keywordPages";

/**
 * Production sitemap for Downloadit.pro.
 *
 * Rules:
 * - Only real, canonical, publicly accessible URLs on https://www.downloadit.pro
 * - Meaningful lastModified dates matching actual content updates
 * - Excludes non-indexable, temporary, or API routes
 * - Covers all verified downloaders, blog articles, and informational pages
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: { path: string; lastModified: Date }[] = [
    // Homepage and primary downloaders (metadata and content refreshed 12 Nov 2026)
    { path: "/", lastModified: new Date("2026-11-12T00:00:00.000Z") },
    { path: "/instagram-reels-downloader", lastModified: new Date("2026-11-11T00:00:00.000Z") },
    { path: "/instagram-video-downloader", lastModified: new Date("2026-11-11T00:00:00.000Z") },
    { path: "/instagram-photo-downloader", lastModified: new Date("2026-11-11T00:00:00.000Z") },
    { path: "/instagram-story-downloader", lastModified: new Date("2026-11-11T00:00:00.000Z") },
    { path: "/instagram-audio-downloader", lastModified: new Date("2026-11-11T00:00:00.000Z") },
    { path: "/pinterest-video-downloader", lastModified: new Date("2026-11-11T00:00:00.000Z") },
    { path: "/pinterest-image-downloader", lastModified: new Date("2026-11-11T00:00:00.000Z") },
    { path: "/facebook-video-downloader", lastModified: new Date("2026-11-11T00:00:00.000Z") },
    { path: "/twitter-video-downloader", lastModified: new Date("2026-11-11T00:00:00.000Z") },
    { path: "/threads-video-downloader", lastModified: new Date("2026-11-11T00:00:00.000Z") },

    // Blog index
    { path: "/blog", lastModified: new Date("2026-11-11T00:00:00.000Z") },

    // Report / takedown form
    { path: "/report", lastModified: new Date("2026-11-12T00:00:00.000Z") },

    // Information and legal pages with verified update dates
    { path: "/about", lastModified: new Date("2026-11-12T00:00:00.000Z") },
    { path: "/help", lastModified: new Date("2026-11-11T00:00:00.000Z") },
    { path: "/contact", lastModified: new Date("2026-10-01T00:00:00.000Z") },
    { path: "/advertise-with-us", lastModified: new Date("2026-09-15T00:00:00.000Z") },
    { path: "/privacy", lastModified: new Date("2026-10-01T00:00:00.000Z") },
    { path: "/terms", lastModified: new Date("2026-10-01T00:00:00.000Z") },
    { path: "/dmca", lastModified: new Date("2026-10-01T00:00:00.000Z") },
    { path: "/disclaimer", lastModified: new Date("2026-10-01T00:00:00.000Z") },
  ];

  // Genuine blog articles with genuine publish/update dates from frontmatter
  const blogPosts = getAllPosts().map((post) => {
    let modDate: Date;
    if (post.date && /^\d{4}-\d{2}-\d{2}$/.test(post.date)) {
      modDate = new Date(`${post.date}T00:00:00.000Z`);
    } else {
      modDate = new Date("2026-09-01T00:00:00.000Z");
    }
    return {
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: modDate,
    };
  });

  const staticEntries = staticPages.map(({ path, lastModified }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
  }));

  // Dedicated keyword pages (one URL per exact search intent).
  const keywordEntries = KEYWORD_PAGES.map((page) => ({
    url: `${SITE_URL}/${page.slug}`,
    lastModified: new Date("2026-11-12T00:00:00.000Z"),
  }));

  // Indexable Hindi URLs with real translations.
  const hindiPaths = [
    "/hi",
    "/hi/instagram-video-downloader",
    "/hi/pinterest-video-downloader",
    "/hi/facebook-video-downloader",
    "/hi/twitter-video-downloader",
    "/hi/threads-video-downloader",
    "/hi/blog",
  ];
  const hindiEntries = hindiPaths.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date("2026-11-12T00:00:00.000Z"),
  }));

  const hindiBlogPosts = getHindiPosts().map((post) => ({
    url: `${SITE_URL}/hi/blog/${post.slug}`,
    lastModified:
      post.date && /^\d{4}-\d{2}-\d{2}$/.test(post.date)
        ? new Date(`${post.date}T00:00:00.000Z`)
        : new Date("2026-11-12T00:00:00.000Z"),
  }));

  return [
    ...staticEntries,
    ...keywordEntries,
    ...hindiEntries,
    ...blogPosts,
    ...hindiBlogPosts,
  ];
}