import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config/site";
import { getAllPosts, getHindiPosts } from "@/lib/blog";

const LAST_MODIFIED = new Date("2026-11-14T00:00:00.000Z");

const PATHS = [
  "/",
  "/hi",
  "/help",
  "/about",
  "/contact",
  "/blog",
  "/instagram-video-downloader",
  "/instagram-reels-downloader",
  "/instagram-photo-downloader",
  "/instagram-carousel-downloader",
  "/instagram-story-downloader",
  "/instagram-audio-downloader",
  "/pinterest-video-downloader",
  "/pinterest-image-downloader",
  "/pinterest-idea-pin-downloader",
  "/pinterest-to-mp4",
  "/facebook-video-downloader",
  "/facebook-reels-downloader",
  "/facebook-watch-downloader",
  "/twitter-video-downloader",
  "/twitter-gif-downloader",
  "/twitter-video-to-mp4",
  "/threads-video-downloader",
  "/threads-photo-downloader",
  "/privacy",
  "/terms",
  "/dmca",
  "/disclaimer",
  "/hi/blog",
  ...getAllPosts().map((post) => `/blog/${post.slug}`),
  ...getHindiPosts().map((post) => `/hi/blog/${post.slug}`),
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PATHS.map((path) => ({
    url: path === "/" ? SITE_URL : `${SITE_URL}${path}`,
    lastModified: LAST_MODIFIED,
  }));
}
