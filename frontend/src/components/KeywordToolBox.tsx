import ToolDownloader from "./ToolDownloader";
import FacebookDownloader from "./FacebookDownloader";
import TwitterDownloader from "./TwitterDownloader";
import ThreadsDownloader from "./ThreadsDownloader";
import PinterestDownloader from "./PinterestDownloader";
import type { InstagramMediaTab, PinterestMode } from "@/config/toolPages";
import type { KeywordPlatform } from "@/config/keywordPages";

export interface KeywordToolBoxProps {
  platform: KeywordPlatform;
  /** Full route path, used for structured-data identity. */
  path: string;
  name: string;
  titleA: string;
  titleB: string;
  subtitle: string;
  badge: string;
  placeholder: string;
  buttonLabel: string;
  /** Instagram only: preselected media mode. */
  instagramTab?: InstagramMediaTab;
  /** Pinterest only: media controls this route actually serves. */
  pinterestModes?: PinterestMode[];
}

/**
 * Renders the real, working Downloadit tool for a keyword page.
 *
 * The underlying components are the same ones used on the homepage, so URL
 * validation, resolve, preview and download behaviour are identical. Only
 * presentation copy differs, and it is passed per route.
 */
export default function KeywordToolBox({
  platform,
  path,
  name,
  titleA,
  titleB,
  subtitle,
  badge,
  placeholder,
  buttonLabel,
  instagramTab = "videos",
  pinterestModes = ["any"],
}: KeywordToolBoxProps) {
  if (platform === "instagram") {
    return (
      <ToolDownloader
        page={{
          platform: "instagram",
          path,
          name,
          titleA,
          titleB,
          badge,
          description: subtitle,
          placeholder,
          buttonLabel,
          initialTab: instagramTab,
          trust: ["No account required", "Public posts only", "Preview before saving"],
          seoTitle: name,
          seoDescription: subtitle,
        }}
      />
    );
  }

  if (platform === "pinterest") {
    return (
      <PinterestDownloader
        titleA={titleA}
        titleB={titleB}
        subtitle={subtitle}
        badge={badge}
        placeholder={placeholder}
        buttonLabel={buttonLabel}
        modes={pinterestModes}
        benefits={[
          "Free to use",
          "No account required",
          "Public pins only",
          "Preview before downloading",
        ]}
      />
    );
  }

  const shared = {
    badge,
    titleA,
    titleB,
    subtitle,
    placeholder,
    buttonLabel,
    benefits: ["No account required", "Public media only", "Preview before saving"],
  };

  if (platform === "facebook") return <FacebookDownloader {...shared} />;

  if (platform === "twitter") {
    return (
      <TwitterDownloader
        badge={badge}
        titleA={titleA}
        titleB={titleB}
        subtitle={subtitle}
        placeholder={placeholder}
        buttonLabel={buttonLabel}
        benefits={["Public posts only", "No login required", "Preview before saving"]}
      />
    );
  }

  return (
    <ThreadsDownloader
      badge={badge}
      titleA={titleA}
      titleB={titleB}
      subtitle={subtitle}
      placeholder={placeholder}
      buttonLabel={buttonLabel}
      benefits={["Public posts only", "No login required", "Photos and video"]}
    />
  );
}
