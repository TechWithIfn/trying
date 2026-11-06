import type { Metadata } from "next";
import ReelsDownloaderPageClient from "./PageClient";
import { TOOL_PAGES, toolMetadata } from "@/config/toolPages";

const PAGE = TOOL_PAGES.instagramReels;
export const metadata: Metadata = toolMetadata(PAGE);

export default function ReelsDownloaderPage() {
  return <ReelsDownloaderPageClient />;
}
