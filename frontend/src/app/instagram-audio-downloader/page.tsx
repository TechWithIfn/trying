import type { Metadata } from "next";
import AudioDownloaderPageClient from "./PageClient";
import { TOOL_PAGES, toolMetadata } from "@/config/toolPages";

const PAGE = TOOL_PAGES.instagramAudio;
export const metadata: Metadata = toolMetadata(PAGE);

export default function AudioDownloaderPage() {
  return <AudioDownloaderPageClient />;
}
