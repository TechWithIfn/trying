import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config/site";
import { getPostSlugs } from "@/lib/blog";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: { path: string; priority: number; changeFreq: "weekly" | "monthly" | "yearly" }[] = [
    { path: "/", priority: 1, changeFreq: "weekly" },
    { path: "/instagram-reels-downloader", priority: 0.8, changeFreq: "monthly" },
    { path: "/instagram-video-downloader", priority: 0.8, changeFreq: "monthly" },
    { path: "/instagram-photo-downloader", priority: 0.8, changeFreq: "monthly" },
    { path: "/instagram-story-downloader", priority: 0.8, changeFreq: "monthly" },
    { path: "/instagram-audio-downloader", priority: 0.8, changeFreq: "monthly" },
    { path: "/blog", priority: 0.7, changeFreq: "weekly" },
    ...getPostSlugs().map((slug) => ({
      path: `/blog/${slug}`,
      priority: 0.6,
      changeFreq: "monthly" as const,
    })),
    { path: "/help", priority: 0.5, changeFreq: "yearly" },
    { path: "/about", priority: 0.5, changeFreq: "yearly" },
    { path: "/contact", priority: 0.5, changeFreq: "yearly" },
    { path: "/advertise-with-us", priority: 0.4, changeFreq: "yearly" },
    { path: "/privacy", priority: 0.3, changeFreq: "yearly" },
    { path: "/terms", priority: 0.3, changeFreq: "yearly" },
    { path: "/dmca", priority: 0.3, changeFreq: "yearly" },
    { path: "/disclaimer", priority: 0.3, changeFreq: "yearly" },
  ];
  // Fixed date: `new Date()` churned lastmod on every build and caused
  // needless recrawls. Bump manually only when page content changes.
  // Bumped 2026-10-16: /about expansion (signed owner section, does/does-not-do,
  // Person+Organization schema) + homepage in-body /about link.
  const lastModified = new Date("2026-10-16T00:00:00.000Z");
  return pages.map(({ path, priority, changeFreq }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency: changeFreq,
    priority,
  }));
}