"use client";

import { useState } from "react";
import HeroDownloader, { type DownloaderTab } from "./HeroDownloader";
import type { InstagramToolPage } from "@/config/toolPages";

/**
 * Embeds the real Downloadit downloader tool on a dedicated Instagram tool
 * page (reels / video / photo / story / audio).
 *
 * Behavior is identical to the homepage tool: same component, same props
 * contract, same resolve/preview/download logic. Only the heading copy, the
 * placeholder, the media mode and its trust indicators differ — all of them
 * come from the route's entry in `@/config/toolPages`, so no page can inherit
 * another page's text or controls.
 *
 * The heading renders as the page's single <h1> at the top of the hero.
 */
export default function ToolDownloader({ page }: { page: InstagramToolPage }) {
  const [tab, setTab] = useState<DownloaderTab | null>(page.initialTab);

  return (
    <HeroDownloader
      activeTab={tab}
      onActiveTabChange={setTab}
      titleA={page.titleA}
      titleB={page.titleB}
      subtitle={page.description}
      badge={page.badge}
      placeholder={page.placeholder}
      buttonLabel={page.buttonLabel}
      // This route serves exactly one media mode; it renders as the
      // supported-media chip, never as a one-button tab strip.
      tabs={[page.initialTab]}
      mediaNote={page.mediaNote}
      trust={page.trust}
    />
  );
}
