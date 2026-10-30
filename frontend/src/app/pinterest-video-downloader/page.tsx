import type { Metadata } from "next";
import PinterestVideoDownloaderPageClient from "./PageClient";
import { TOOL_PAGES, toolMetadata } from "@/config/toolPages";

const PAGE = TOOL_PAGES.pinterestVideo;
export const metadata: Metadata = toolMetadata(PAGE);

export default function PinterestVideoDownloaderPage() {
  return <PinterestVideoDownloaderPageClient />;
}
