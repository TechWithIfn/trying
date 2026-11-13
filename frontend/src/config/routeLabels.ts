/** Human-readable labels for visible breadcrumbs (schema lives per page). */
export const ROUTE_LABELS: Record<string, string> = {
  "/about": "About Downloadit",
  "/contact": "Contact",
  "/help": "Help Center",
  "/blog": "Blog",
  "/report": "Report Content",
  "/privacy": "Privacy Policy",
  "/terms": "Terms of Service",
  "/dmca": "DMCA / Copyright",
  "/disclaimer": "Disclaimer",
  "/advertise-with-us": "Advertise With Us",
  "/instagram-video-downloader": "Instagram Downloader",
  "/instagram-reels-downloader": "Instagram Reels Downloader",
  "/instagram-photo-downloader": "Instagram Photo Downloader",
  "/instagram-carousel-downloader": "Instagram Carousel Downloader",
  "/instagram-story-downloader": "Instagram Story Downloader",
  "/instagram-highlights-downloader": "Instagram Highlights Downloader",
  "/instagram-audio-downloader": "Instagram Audio Downloader",
  "/instagram-profile-picture-downloader": "Instagram Profile Picture Downloader",
  "/pinterest-video-downloader": "Pinterest Video Downloader",
  "/pinterest-image-downloader": "Pinterest Image Downloader",
  "/pinterest-to-mp4": "Pinterest to MP4",
  "/pinterest-idea-pin-downloader": "Pinterest Idea Pin Downloader",
  "/facebook-video-downloader": "Facebook Video Downloader",
  "/facebook-reels-downloader": "Facebook Reels Downloader",
  "/facebook-watch-downloader": "Facebook Watch Downloader",
  "/facebook-story-downloader": "Facebook Story Downloader",
  "/twitter-video-downloader": "Twitter/X Video Downloader",
  "/twitter-gif-downloader": "Twitter/X GIF Downloader",
  "/twitter-video-to-mp4": "X Video to MP4",
  "/threads-video-downloader": "Threads Video Downloader",
  "/threads-photo-downloader": "Threads Photo Downloader",
  "/hi": "हिन्दी",
};

export function breadcrumbLabel(pathname: string): string {
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname];
  const clean = pathname.replace(/^\/hi(?=\/)/, "");
  if (ROUTE_LABELS[clean]) return ROUTE_LABELS[clean];
  const last = pathname.split("/").filter(Boolean).pop() ?? "Page";
  return last
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
