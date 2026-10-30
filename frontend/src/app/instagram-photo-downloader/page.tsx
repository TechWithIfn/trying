import type { Metadata } from "next";
import CarouselDownloaderPageClient from "./PageClient";
import { TOOL_PAGES, toolMetadata } from "@/config/toolPages";

const PAGE = TOOL_PAGES.instagramPhoto;
export const metadata: Metadata = toolMetadata(PAGE);

export default function PhotoDownloaderPage() {
  return <CarouselDownloaderPageClient />;
}
