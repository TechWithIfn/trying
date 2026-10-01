import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: { path: string; priority: number; changeFreq: "weekly" | "monthly" | "yearly" }[] = [
    { path: "/", priority: 1, changeFreq: "weekly" },
    { path: "/help", priority: 0.5, changeFreq: "yearly" },
    { path: "/privacy", priority: 0.3, changeFreq: "yearly" },
    { path: "/terms", priority: 0.3, changeFreq: "yearly" },
    { path: "/dmca", priority: 0.3, changeFreq: "yearly" },
    { path: "/disclaimer", priority: 0.3, changeFreq: "yearly" },
  ];
  // Fixed date: `new Date()` churned lastmod on every build and caused
  // needless recrawls. Bump manually only when page content changes.
  const lastModified = new Date("2026-09-28T00:00:00.000Z");
  return pages.map(({ path, priority, changeFreq }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency: changeFreq,
    priority,
  }));
}