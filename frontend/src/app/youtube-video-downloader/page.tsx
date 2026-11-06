import type { Metadata } from "next";
import YouTubeVideoDownloaderPageClient from "./PageClient";
import { TOOL_PAGES, toolMetadata } from "@/config/toolPages";

const PAGE = TOOL_PAGES.youtubeVideo;
export const metadata: Metadata = {
  ...toolMetadata(PAGE),
  keywords: [
    "YouTube video downloader",
    "download YouTube videos",
    "YouTube to MP4",
    "YouTube to MP3",
    "YouTube to M4A",
    "YouTube Shorts downloader",
    "save YouTube videos",
    "YouTube 1080p download",
    "YouTube audio download",
  ],
};

export default function YouTubeVideoDownloaderPage() {
  return <YouTubeVideoDownloaderPageClient />;
}
