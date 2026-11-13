export const SITE_URL = "https://www.downloadit.pro";
export const BRAND_NAME = "Downloadit";
export const BRAND_TITLE = "Downloadit – Instagram, Facebook, Pinterest & X Downloader";
export const BRAND_DESCRIPTION =
  "Download public videos, photos and audio online from Instagram, Pinterest, Facebook, X and Threads. Preview and save free — no login required.";
export const HOME_OG_IMAGE_ALT =
  "Downloadit — public-media downloader for Instagram, Pinterest, Facebook, Twitter/X and Threads";
export const SUPPORT_EMAIL = "support@downloadit.pro";
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
