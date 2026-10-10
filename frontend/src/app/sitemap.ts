import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: { path: string; priority: number; changeFreq: "weekly" | "monthly" | "yearly" }[] = [
    { path: "/", priority: 1, changeFreq: "weekly" },
    { path: "/instagram-reels-downloader", priority: 0.8, changeFreq: "monthly" },
    { path: "/instagram-video-downloader", priority: 0.8, changeFreq: "monthly" },
    { path: "/instagram-photo-downloader", priority: 0.8, changeFreq: "monthly" },
    { path: "/instagram-story-downloader", priority: 0.8, changeFreq: "monthly" },
    { path: "/instagram-audio-downloader", priority: 0.8, changeFreq: "monthly" },
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
  // Bumped 2026-10-11: SEO pass — optimized meta descriptions, photo page
  // title aligned with its H1, schema @id anchors, HTTPS upgrade directive.
  const lastModified = new Date("2026-10-11T00:00:00.000Z");
  return pages.map(({ path, priority, changeFreq }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency: changeFreq,
    priority,
  }));
}