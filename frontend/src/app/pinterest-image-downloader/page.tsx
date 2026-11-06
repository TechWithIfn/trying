import type { Metadata } from "next";
import PinterestImageDownloaderPageClient from "./PageClient";
import { TOOL_PAGES, toolMetadata } from "@/config/toolPages";

const PAGE = TOOL_PAGES.pinterestImage;
export const metadata: Metadata = toolMetadata(PAGE);

export default function PinterestImageDownloaderPage() {
  return <PinterestImageDownloaderPageClient />;
}
