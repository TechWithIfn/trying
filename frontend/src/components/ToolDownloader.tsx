"use client";

import { useState } from "react";
import HeroDownloader, { type DownloaderTab } from "./HeroDownloader";

/**
 * Embeds the real Downloadit downloader tool on a dedicated tool page
 * (reels / video / photo / story / audio) with that page's tab preselected.
 *
 * Behavior is identical to the homepage tool: same component, same props
 * contract, same resolve/preview/download logic. Only the initial tab and
 * the (purely presentational) heading copy differ per page. The heading
 * renders as a styled <p> so each tool page keeps exactly one <h1>.
 */
export default function ToolDownloader({
  initialTab,
  titleA,
  titleB,
  subtitle,
}: {
  initialTab: DownloaderTab;
  titleA: string;
  titleB: string;
  subtitle: string;
}) {
  const [tab, setTab] = useState<DownloaderTab | null>(initialTab);

  return (
    <HeroDownloader
      activeTab={tab}
      onActiveTabChange={setTab}
      titleA={titleA}
      titleB={titleB}
      subtitle={subtitle}
      titleAs="p"
    />
  );
}
