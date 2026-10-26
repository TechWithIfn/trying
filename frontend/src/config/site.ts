export const SITE_URL = "https://www.downloadit.pro";
export const BRAND_NAME = "Downloadit";
export const BRAND_TITLE = "Instagram, Pinterest & YouTube Downloader | Downloadit";
export const BRAND_DESCRIPTION =
  "Downloadit is a free public-media downloader for Instagram, Pinterest and YouTube. Paste a link, preview the available media, and save it without an account.";
export const HOME_OG_IMAGE_ALT =
  "Downloadit \u2014 public-media downloader for Instagram, Pinterest and YouTube";
export const SUPPORT_EMAIL = "supportdownloadit.pro@gmail.com";
// Default subject for general support mail. Always build mailto links with
// supportMailto() below — never hardcode a mailto: or Gmail compose URL.
export const SUPPORT_MAILTO_SUBJECT = "Downloadit Support Query";
export function supportMailto(subject: string = SUPPORT_MAILTO_SUBJECT): string {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}
