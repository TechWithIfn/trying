export const SITE_URL = "https://www.downloadit.pro";
export const BRAND_NAME = "Downloadit";
export const BRAND_TITLE = "Downloadit – Free Video & Photo Downloader for 5 Platforms";
export const BRAND_DESCRIPTION =
  "Download public videos, photos and audio from Instagram, Pinterest, Facebook, Twitter/X and Threads. Paste a link to preview and save. Free, no login required.";
export const HOME_OG_IMAGE_ALT =
  "Downloadit \u2014 public-media downloader for Instagram, Pinterest, Facebook, Twitter/X and Threads";
export const SUPPORT_EMAIL = "supportdownloadit.pro@gmail.com";
// Default subject for general support mail. Always build mailto links with
// supportMailto() below — never hardcode a mailto: or Gmail compose URL.
export const SUPPORT_MAILTO_SUBJECT = "Downloadit Support Query";
export function supportMailto(subject: string = SUPPORT_MAILTO_SUBJECT): string {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}
