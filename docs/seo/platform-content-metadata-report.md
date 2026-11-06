# Platform content and metadata report

| Platform | Canonical route | SEO title | Content coverage |
|---|---|---|---|
| Instagram | `/instagram-video-downloader` | Instagram Video Downloader – Reels, Photos & Carousels \| Downloadit | Video flow, supported links, troubleshooting, privacy, related downloaders and FAQ content exist across the Instagram routes |
| Pinterest | `/pinterest-video-downloader` | Pinterest Video & Image Downloader – Save Pins & Carousels \| Downloadit | Video/image modes, pin limitations, troubleshooting, related routes and FAQ content |
| YouTube | `/youtube-video-downloader` | YouTube Video Downloader – Download Videos in Supported Quality \| Downloadit | Supported public video/audio formats, bot-verification limitation, troubleshooting, privacy and FAQ content |
| Facebook | `/facebook-video-downloader` | Facebook Video Downloader – Download Public Videos & Reels \| Downloadit | Public posts, Reels and Watch links, step-by-step guide, troubleshooting, privacy limits and 10 FAQs |

All four routes use the shared `toolMetadata()` helper for self-referencing canonicals, index/follow directives, Open Graph metadata and Twitter metadata. Claims are limited to functionality represented by the existing resolver and downloader components.

## Homepage

The homepage now uses the H1:

> Free Online Video Downloader for Instagram, Pinterest, YouTube & Facebook

The platform selector is visible above the downloader and switches to the existing platform-specific component. The selector is rendered as crawlable UI labels and preserves the landing-page links in navigation/footer/content sections.
