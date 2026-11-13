export const SITE_URL = "https://www.downloadit.pro";
export const BRAND_NAME = "Downloadit";
export const BRAND_TITLE = "Downloadit: Instagram, Facebook, X & Pinterest Downloader";
export const BRAND_DESCRIPTION =
  "Free online downloader for Instagram Reels, Stories & photos, Pinterest videos, Facebook videos, X GIFs and Threads. HD MP4, no login. Paste a link and save.";
export const HOME_OG_IMAGE_ALT =
  "Downloadit — public-media downloader for Instagram, Pinterest, Facebook, Twitter/X and Threads";
export const SUPPORT_EMAIL = "support@downloadit.pro";
/** Must match the publisher id in public/ads.txt. */
export const ADSENSE_CLIENT = "ca-pub-8543183124286362";
export const UPDATED_DATE = "November 2026";

/**
 * Official brand profiles. Left empty deliberately: adding an unverified
 * account is worse than showing none. When real profiles exist, add them
 * here and they will be emitted in Organization sameAs + footer links.
 */
export const SOCIAL_PROFILES: { label: string; href: string }[] = [];
// Default subject for general support mail. Always build mailto links with
// supportMailto() below — never hardcode a mailto: or Gmail compose URL.
export const SUPPORT_MAILTO_SUBJECT = "Downloadit Support Query";
export function supportMailto(subject: string = SUPPORT_MAILTO_SUBJECT): string {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}
