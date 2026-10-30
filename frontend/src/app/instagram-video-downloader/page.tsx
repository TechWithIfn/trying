import type { Metadata } from "next";
import VideoDownloaderPageClient from "./PageClient";
import { TOOL_PAGES, toolMetadata } from "@/config/toolPages";

const PAGE = TOOL_PAGES.instagramVideo;
export const metadata: Metadata = toolMetadata(PAGE);

export default function VideoDownloaderPage() {
  return <VideoDownloaderPageClient />;
}
