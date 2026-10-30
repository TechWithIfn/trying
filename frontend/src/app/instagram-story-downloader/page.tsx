import type { Metadata } from "next";
import StoryDownloaderPageClient from "./PageClient";
import { TOOL_PAGES, toolMetadata } from "@/config/toolPages";

const PAGE = TOOL_PAGES.instagramStory;
export const metadata: Metadata = toolMetadata(PAGE);

export default function StoryDownloaderPage() {
  return <StoryDownloaderPageClient />;
}
