# Downloadit.pro — Organic SEO Growth Audit

**Site:** https://www.downloadit.pro
**Audit date:** 11 November 2026
**Auditor role:** Technical SEO / search strategy / web performance / full-stack review
**Method:** Live HTTP inspection of every public route, source-code review of all page metadata, structured data, sitemap/robots, backend capability review (`backend/src`), internal-link crawl, and production API health checks.

> **Scope limits stated up front**
> - **Google Search Console is not connected in this environment.** No clicks, impressions, CTR, average position, query, country or device data was accessed. Nothing in this report invents those numbers.
> - **No authorised backlink-provider data was available.** No referring-domain or anchor-text dataset was accessed.
> - **No CrUX / field Core Web Vitals data was available.** Performance statements are lab/source-code observations only; no field LCP/INP/CLS claim is made.
> - Rankings cannot be promised. This report separates verified defects from hypotheses and growth opportunities.

---

## 1. Inventory of public pages audited

| Type | Routes |
|---|---|
| Home | `/` |
| Instagram | `/instagram-video-downloader` (hub), `/instagram-reels-downloader`, `/instagram-photo-downloader`, `/instagram-story-downloader`, `/instagram-audio-downloader` |
| Pinterest | `/pinterest-video-downloader`, `/pinterest-image-downloader` |
| YouTube | `/youtube-video-downloader` |
| Facebook | `/facebook-video-downloader` |
| Twitter/X | `/twitter-video-downloader` |
| Threads | `/threads-video-downloader` |
| Blog | `/blog` + 25 `/blog/<slug>` articles |
| Information | `/help`, `/about`, `/contact`, `/advertise-with-us` |
| Legal | `/privacy`, `/terms`, `/dmca`, `/disclaimer` |
| Machine | `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`, `/ads.txt`, `/og-downloadit.png` |
| Redirect aliases | `/instagram-downloader`, `/pinterest-downloader`, `/youtube-downloader`, `/youtube-shorts-downloader`, `/facebook-downloader`, `/facebook-reels-downloader`, `/twitter-downloader`, `/twitter-gif-downloader`, `/threads-downloader` |

---

## 2. Verified technical findings

### 2.1 HTTP status and routing

| Check | Result |
|---|---|
| All 21 primary routes | `200` |
| Unknown URL | real `404` (`/this-page-does-not-exist`) |
| Apex → www | `308` permanent redirect |
| Legacy aliases | `308` permanent redirect to the canonical tool page |
| `robots.txt` | `200`, allows public pages, disallows `/api/`, `/download/`, `/stream/`, `_next/webpack-hmr`, declares sitemap |
| `sitemap.xml` | `200`, valid XML, 12 tool/static pages + 25 blog posts |
| `og-downloadit.png`, icons, manifest, `ads.txt` | `200` |
| Backend `/api/health/media` | `engineReady: true`, `ytDlpAvailable: true`, `ffmpegAvailable: true` |

### 2.2 Internal links

61 unique internal links were extracted from the home page and all tool pages and requested. **No 4xx internal link was found.** Core tool pages, deep Instagram pages, blog, help and legal pages are all reachable in the server-rendered HTML.

### 2.3 Indexability

All primary pages return `index, follow`. The 404 page returns `noindex, follow: false`. No accidental `noindex` was found on any money page.

---

## 3. Critical problems (fix first)

| # | Problem | Evidence | Impact |
|---|---|---|---|
| C1 | **Canonical host conflict on 10 of 11 tool pages.** Canonicals point at `https://downloadit.pro/...` (apex), which `308`-redirects to `https://www.downloadit.pro/...`. | Live `<link rel="canonical">` on `/instagram-*`, `/pinterest-*`, `/facebook-*`, `/twitter-*`, `/threads-*` returns apex; home + `/youtube-video-downloader` return www. | Google receives two conflicting canonicalisation signals (redirect target vs canonical tag). Wastes crawl budget and can slow consolidation of signals. |
| C2 | **Open Graph `og:url` uses the redirecting apex host on the same 10 pages.** | Live `og:url="https://downloadit.pro/..."`; `og:image` is www. | Social shares resolve through a redirect and split URL references. |
| C3 | **Structured-data entity graph is split between hosts.** Tool-page JSON-LD uses `https://downloadit.pro/#website` and apex `@id`s, while the global `WebSite` node in `layout.tsx` is `https://www.downloadit.pro/#website`. | Live JSON-LD blocks; `layout.tsx` lines 131–139. | `isPartOf` / `breadcrumb` references point at an entity that does not exist at that URL. Weakens entity understanding. |
| C4 | **Metadata is duplicated instead of using the existing single source of truth.** 10 tool pages hard-code title/description/canonical/OG instead of calling `toolMetadata()` from `config/toolPages.ts` (only YouTube uses it). Config copy has already drifted from live copy. | `toolPages.ts` vs each `page.tsx` metadata block. | Any future fix must be made twice; host drift (C1) is the direct result. |

---

## 4. High-priority SEO problems

| # | Problem | Evidence | Impact |
|---|---|---|---|
| H1 | Home page `<title>` is **90 characters** and will be truncated in SERPs. | `BRAND_TITLE` in `config/site.ts`. | Lower CTR; brand + key phrase cut off. |
| H2 | Home page H1 is **"Download Your Favorite Media in One Place"** — no platform or media-type terms. | Live `<h1>`. | Weaker relevance for “multi-platform video downloader” and related queries. |
| H3 | Home meta description is **183 characters**, truncated. | Live meta description. | CTR loss. |
| H4 | Help page title/description are Instagram-only, but the page is the global help hub for six platforms. | `help/page.tsx` lines 5–7. | Mismatch between query intent and page; limits relevance for other platforms. |
| H5 | About description omits Threads. | `about/page.tsx` line 8. | Minor relevance/consistency gap across the site. |
| H6 | **Duplicate FAQ content across pages** (11 duplicate question groups). | `/instagram-video-downloader` repeats Reels/Photo/Story FAQs; `/pinterest-video-downloader` repeats 5 image-page FAQs; 4 Instagram pages share “Which devices and browsers are supported?”; Twitter and Threads share 2 FAQs. | FAQPage duplication, cannibalisation between hub and child pages, bloated pages. |
| H7 | **Keyword stuffing and Hinglish keyword strings** in visible body copy. | Facebook page includes lists of competitor brands (`fdown`, `fbdown`, `getfvid`, `snapsave`) and strings such as `facebook se video download kaise kare`; Twitter and Threads pages repeat the same pattern. | Low-quality signals, unnatural reading experience, risk under Google’s spam/helpful-content policies. |
| H8 | **Unverified statistics.** | “Over 80% of Facebook users browse content from a mobile smartphone or tablet.” | Unsupported factual claim. |
| H9 | **Overstated guarantees.** | “100% free with unlimited usage”, “Complete privacy guaranteed”, “Total privacy guaranteed”, “unlimited conversions”. | Cannot be guaranteed; conflicts with the site’s own honest-limitations positioning. |
| H10 | Sitemap `lastmod` stale for pages that changed. | `/youtube-video-downloader` and `/` carry 2026-10-24 while other tool pages carry 2026-11-10. | Weak freshness signal; inconsistent sitemap. |

---

## 5. Medium-priority findings

| # | Problem | Evidence |
|---|---|---|
| M1 | YouTube page has only one JSON-LD block (`FAQPage`), while every other tool page has `WebPage` + `WebApplication` + `BreadcrumbList` + `FAQPage`. | `youtube-video-downloader/PageClient.tsx`; live page. |
| M2 | YouTube page has only 4 H2s vs 10–14 on comparable pages; weaker topical depth. | Heading extraction. |
| M3 | Twitter page contains an H2 “Is Twitter Video Downloader Free?” that duplicates the FAQ answer, plus a duplicated pricing paragraph. | `twitter-video-downloader/page.tsx` lines 695–719. |
| M4 | Pinterest video page carries **20 FAQs**, many belonging to the image page. | FAQ extraction. |
| M5 | Facebook page carries 12 FAQs with overlap between “save to gallery”, “iPhone”, “without app” and “mobile links”. | FAQ extraction. |
| M6 | Threads page carries 18 FAQs with overlap between mobile/iPhone/Android/quality. | FAQ extraction. |
| M7 | Twitter and Threads describe “unthrottled”, “no limits”, “full GIF support” in ways that overstate tested capability. | Feature card copy. |
| M8 | Web app manifest is Instagram-only. | `manifest.ts` lines 5–7. |
| M9 | Twitter card title on `/blog` differs from the page title/OG title. | `blog/page.tsx` lines 10 and 24. |
| M10 | Blog metadata describes only Instagram/Pinterest/YouTube although it also covers Facebook/X/Threads topics. | `blog/page.tsx` title/description. |

---

## 6. Content-quality findings

**Good:** every tool page has a unique H1, practical step-by-step instructions, honest “public content only” limits, troubleshooting, internal links, and a page-specific FAQ set. No thin doorway pages were found. No page claims a platform the backend does not support.

**Needs work:**
- Repetitive FAQ sets between hub and child pages (see H6).
- Competitor-name keyword blocks and Hinglish keyword strings (H7).
- Fabricated or unverifiable statistics (H8).
- Absolute guarantees (H9).
- Verbose “why choose us” copy that repeats the same promise three or four times on one page.

**Backend-verified capabilities used to police claims:**

| Platform | Actual capability (source) |
|---|---|
| Instagram | video, reel, photo, carousel, story, MP3 audio (`routes/resolve.ts`, `audio.ts`, `story-resolve.ts`) |
| Pinterest | video, image, carousel (`lib/pinterest/resolve.ts`, `routes/pinterest.ts`) |
| YouTube | progressive MP4 qualities up to source max + MP3/M4A (`routes/youtube.ts`, `lib/youtube/*`) |
| Facebook | best progressive MP4 video only, no image posts (`routes/facebook.ts`: `best[ext=mp4]/best`) |
| Twitter/X | progressive MP4 video; animated GIFs arrive as looping MP4 (`lib/twitter/resolve.ts`) |
| Threads | video, image, multi-media carousel (`routes/threads.ts`) |

---

## 7. Keyword map (no invented volumes)

Search-volume data was **not** available. The map below is intent-led and based on the pages’ actual capabilities; it must be validated in GSC before prioritising.

| Page | Primary keyword | Secondary | Long-tail examples | Intent |
|---|---|---|---|---|
| `/` | multi-platform media downloader | download video online, Instagram Pinterest YouTube downloader | “download videos from Instagram and Pinterest in one place” | Commercial / navigational |
| `/instagram-video-downloader` | Instagram downloader | Instagram video download, Instagram media downloader | “download Instagram video without login” | Transactional |
| `/instagram-reels-downloader` | Instagram Reels downloader | download Instagram Reels, Reels to MP4 | “download Instagram Reels with audio on iPhone” | Transactional |
| `/instagram-photo-downloader` | Instagram photo downloader | Instagram carousel downloader, Instagram picture download | “save all photos from Instagram carousel” | Transactional |
| `/instagram-story-downloader` | Instagram Story downloader | download Instagram Story anonymously | “save Instagram Story before 24 hours” | Transactional |
| `/instagram-audio-downloader` | Instagram audio downloader | Instagram to MP3, Reels audio download | “extract music from Instagram Reel” | Transactional |
| `/pinterest-video-downloader` | Pinterest video downloader | download Pinterest video, Pinterest to MP4 | “save Pinterest video on iPhone” | Transactional |
| `/pinterest-image-downloader` | Pinterest image downloader | Pinterest carousel downloader, Pinterest photo download | “download all images from Pinterest pin” | Transactional |
| `/youtube-video-downloader` | YouTube video downloader | YouTube to MP4, YouTube to MP3, YouTube Shorts downloader | “download YouTube video in 1080p” | Transactional |
| `/facebook-video-downloader` | Facebook video downloader | Facebook Reels downloader, FB video download | “save Facebook video to phone gallery” | Transactional |
| `/twitter-video-downloader` | Twitter video downloader | X video downloader, Twitter GIF downloader | “download Twitter video on iPhone” | Transactional |
| `/threads-video-downloader` | Threads video downloader | Threads photo downloader, Threads media downloader | “save video from Threads post” | Transactional |
| `/help` | Downloadit help | how to use Downloadit, download troubleshooting | “why is my download link not working” | Informational |
| `/blog` | media downloading guides | Instagram saving guides, copyright basics | topic-specific long tails | Informational |

Cannibalisation rules applied:
- The Instagram hub keeps the broad “Instagram downloader” intent; child pages own format-specific intent.
- Child pages keep their own FAQs; the hub no longer repeats their step-by-step answers.
- Pinterest video page keeps video intent; image/carousel intent belongs to the image page.
- Home page keeps brand + multi-platform intent, not a single-platform query.

---

## 8. Implementation plan (only justified changes)

**Critical**
1. Normalise every canonical, `og:url`, JSON-LD `@id`/`url`/breadcrumb to `https://www.downloadit.pro`.
2. Refactor all 11 tool pages to consume `toolMetadata()` so the host/canonical/OG values cannot drift again.

**High**
3. Re-write home title/description/H1 for length and multi-platform relevance.
4. Rewrite help and about metadata for their real scope.
5. Remove duplicate FAQs between hub/child pages; de-duplicate Twitter/Threads.
6. Remove competitor-name blocks, Hinglish keyword strings, fabricated statistics and absolute guarantees.
7. Update sitemap `lastmod` for changed pages.

**Medium**
8. Add `WebPage` + `WebApplication` + `BreadcrumbList` to the YouTube page.
9. Add YouTube-specific depth (limitations, formats, troubleshooting already partly present).
10. Remove the duplicated “Is Twitter Video Downloader Free?” section.
11. Fix manifest/blog metadata scope.
12. Trim overlapping FAQs on Facebook, Pinterest video and Threads.

**Verification**
13. `npm run build`, lint, lifecycle tests, route crawl, metadata/JSON-LD validation, mobile viewport checks, Lighthouse lab run.

---

*This audit is the baseline. The final report records what was changed, what was measured, and what remains unverifiable without Search Console or backlink data.*
