import type { InstagramMediaTab } from "@/config/toolPages";

export type KeywordPlatform =
  | "instagram"
  | "facebook"
  | "twitter"
  | "pinterest"
  | "threads";

export interface KeywordPage {
  slug: string;
  platform: KeywordPlatform;
  /** Instagram tab used by the shared downloader. */
  instagramTab?: InstagramMediaTab;
  name: string;
  titleA: string;
  titleB: string;
  badge: string;
  /** Short hero sentence; not the meta description. */
  subtitle: string;
  title: string;
  description: string;
  h1: string;
  intro: string[];
  formats: string[];
  steps: { title: string; body: string }[];
  devices: { title: string; body: string }[];
  troubleshooting: { title: string; body: string }[];
  faqs: { q: string; a: string }[];
  related: string[];
  keywords: string[];
  updated: string;
}

export const KEYWORD_PAGES: KeywordPage[] = [
  {
    slug: "instagram-carousel-downloader",
    platform: "instagram",
    instagramTab: "photos",
    name: "Instagram Carousel Downloader",
    titleA: "Instagram Carousel ",
    titleB: "Downloader",
    badge: "Instagram Carousel Downloader — Free & Fast",
    subtitle:
      "Paste a public Instagram carousel link, preview every slide and save the images or videos in the post.",
    title: "Instagram Carousel Downloader – Save All Slides Free",
    description:
      "Download every slide from a public Instagram carousel. Preview photos and videos, then save them individually or together. Free, no login required.",
    h1: "Instagram Carousel Downloader",
    intro: [
      "An Instagram carousel is a single post that contains more than one photo or video. Creators use carousels for step-by-step tutorials, product galleries, before-and-after comparisons and multi-page stories. Instagram lets you swipe through the slides, but it does not offer a simple button that saves the whole set to your device. Screenshots lose resolution and cannot capture video slides at all.",
      "Downloadit reads the public carousel link, finds each media item attached to the post and presents the slides in order. You can preview the set before saving, download one slide that you need, or save every image in a ZIP when several pictures are available. The tool works only with public posts, never private profiles, and it does not require your Instagram password or an app installation.",
    ],
    formats: [
      "Public Instagram carousel posts at instagram.com/p/…",
      "Mixed carousels that contain both photos and short videos",
      "JPEG images at the resolution Instagram serves publicly",
      "MP4 video slides when the carousel includes video",
      "Posts shared from the Instagram mobile app or desktop site",
      "Single-image posts are handled by the Instagram Photo Downloader",
    ],
    steps: [
      {
        title: "Open the public carousel",
        body: "In Instagram, open the post you want to save. Make sure the account is public and the post loads without a login prompt.",
      },
      {
        title: "Copy the post link",
        body: "Tap the three-dot menu or the Share icon and choose Copy link. The address should contain instagram.com/p/ followed by a short code.",
      },
      {
        title: "Paste the link above",
        body: "Return to this page, paste the copied URL into the input box and press Download Photo. The resolver identifies every slide in the post.",
      },
      {
        title: "Preview and save the slides",
        body: "Review the available images and videos. Save a single slide with its download button, or use Download all when multiple images are offered.",
      },
    ],
    devices: [
      {
        title: "iPhone and iPad",
        body: "Use Safari or Chrome. Downloaded images go to the Files app; open an image and choose Save to Photos if you want it in your camera roll. Video slides can be saved to Photos the same way.",
      },
      {
        title: "Android",
        body: "Chrome, Firefox and Samsung Internet all work. Files normally land in the Downloads folder and appear in Google Photos or Samsung Gallery after the media scanner runs.",
      },
      {
        title: "Windows and Mac",
        body: "Paste the link in any modern desktop browser. Images download to your normal Downloads location. On Mac, drag them into Photos if you want them in your library.",
      },
    ],
    troubleshooting: [
      {
        title: "Only one slide appears",
        body: "The post may be a single-image post rather than a carousel, or the link may point to a specific slide. Copy the main post URL again and remove any ?img_index= parameter.",
      },
      {
        title: "The post asks me to log in",
        body: "That means the content is not publicly accessible. Downloadit cannot and will not bypass a private account, age gate or login wall.",
      },
      {
        title: "A video slide will not preview",
        body: "Try the download button directly; some browsers block inline previews while still allowing the file to save. If the error continues, check that the post is still online.",
      },
      {
        title: "The ZIP contains fewer files than expected",
        body: "Only real image items are bundled. Video slides are offered as separate MP4 files, and unavailable upstream media is skipped rather than replaced with a placeholder.",
      },
    ],
    faqs: [
      {
        q: "Can I download all slides from an Instagram carousel?",
        a: "Yes, when the post is public and Instagram exposes the slides. Use Download all for the image set, or save individual photos and video slides from the preview.",
      },
      {
        q: "Does this work with carousels that contain videos?",
        a: "Yes. Mixed carousels are supported. Photo slides are saved as images and video slides are saved as MP4 when the source provides them.",
      },
      {
        q: "Do I need to log in to Instagram?",
        a: "No. Downloadit never asks for an Instagram account, password or session cookie. Only public post links are processed.",
      },
      {
        q: "What image quality do I get?",
        a: "You receive the image resolution that Instagram serves publicly for that post. The tool does not upscale or invent detail.",
      },
      {
        q: "Can I save a carousel from a private account?",
        a: "No. Private posts are outside the supported scope. If the link requires a login, the downloader will return an error instead of a file.",
      },
      {
        q: "Is the Instagram Carousel Downloader free?",
        a: "Yes. There is no charge, subscription or account requirement for public carousel downloads.",
      },
    ],
    related: [
      "instagram-photo-downloader",
      "instagram-reels-downloader",
      "instagram-video-downloader",
      "instagram-story-downloader",
      "instagram-audio-downloader",
    ],
    keywords: [
      "instagram carousel downloader",
      "download instagram carousel",
      "instagram multiple photos download",
      "save instagram slides",
    ],
    updated: "November 2026",
  },
  {
    slug: "instagram-highlights-downloader",
    platform: "instagram",
    instagramTab: "stories",
    name: "Instagram Highlights Downloader",
    titleA: "Instagram Highlights ",
    titleB: "Downloader",
    badge: "Instagram Highlights Downloader — Free & Fast",
    subtitle:
      "Save photos and videos from public Instagram Highlights before they change or disappear.",
    title: "Instagram Highlights Downloader – Save Public Stories",
    description:
      "Download public Instagram Highlights as photos or MP4 videos. Paste a Highlight link, preview the available media and save it free without logging in.",
    h1: "Instagram Highlights Downloader",
    intro: [
      "Instagram Highlights are saved Stories that stay on a profile after the original 24-hour window. They are useful for tutorials, travel diaries, product details and announcements, but they are still awkward to keep offline: the app has no bulk export button, and screenshots flatten video, remove audio and reduce quality.",
      "Downloadit accepts a public Highlight link and asks Instagram for the media that is publicly visible. You can preview the available items and save photos or videos to your device. Highlights change often because the owner can add or remove items, so save the version you actually need rather than assuming the link will look the same later.",
    ],
    formats: [
      "Public Instagram Highlight links under /stories/highlights/…",
      "Photo Highlights served as JPEG images",
      "Video Highlights served as MP4 files with their available audio",
      "Mixed Highlights that contain both photos and video",
      "Links copied from the Instagram mobile app or desktop browser",
      "Public profile story links are handled by the Story Downloader",
    ],
    steps: [
      {
        title: "Open the Highlight",
        body: "Visit the public profile and tap the Highlight you want. Confirm that it opens without asking you to follow or log in.",
      },
      {
        title: "Copy the Highlight link",
        body: "Use the Share menu or copy the address from your browser. A Highlight URL normally contains instagram.com/stories/highlights/.",
      },
      {
        title: "Paste it into the tool",
        body: "Paste the URL above and press Download Story. The resolver checks the Highlight and returns the media it can access publicly.",
      },
      {
        title: "Choose the items to keep",
        body: "Preview each photo or video and download the ones you need. Save videos to Photos or Gallery after download if your browser stores them in Files.",
      },
    ],
    devices: [
      {
        title: "iPhone",
        body: "Safari downloads video to Files. Open the file and tap Share > Save Video to move it into Photos. Images can be saved to Photos from the Files preview.",
      },
      {
        title: "Android",
        body: "Chrome and Samsung Internet save to Downloads. Videos usually appear in Gallery or Google Photos; if not, open the Downloads folder and share the file to your gallery app.",
      },
      {
        title: "Desktop",
        body: "On Windows or Mac, the browser saves files to its Downloads folder. Rename or move them into a project folder before the Highlight changes.",
      },
    ],
    troubleshooting: [
      {
        title: "Highlight not found",
        body: "The owner may have deleted it, renamed it, or made the profile private. Open the link in a logged-out browser to confirm it is still public.",
      },
      {
        title: "Only some items download",
        body: "Highlights can mix photo and video, and Instagram may not expose every item in the same response. Try the link again or save the missing item from a direct Story link while it is live.",
      },
      {
        title: "Video has no sound",
        body: "Some Highlight videos are uploaded without audio. Check the original in Instagram; if sound exists there but not in the file, report the link through the Help page.",
      },
      {
        title: "A profile link is rejected",
        body: "Use the actual Highlight URL, not the profile homepage. Profile-level Story lookup belongs on the Instagram Story Downloader page.",
      },
    ],
    faqs: [
      {
        q: "Can I download Instagram Highlights anonymously?",
        a: "Downloadit does not require a login, so you are not signing in or attaching your account to the request. The profile owner is not notified by Downloadit. Public links can still be logged by the platform itself.",
      },
      {
        q: "Do Highlights expire like Stories?",
        a: "No. Highlights stay on the profile until the owner removes them. Individual items can still be deleted at any time, so download the version you need.",
      },
      {
        q: "Are Highlight videos saved with audio?",
        a: "When Instagram serves an audio track with the video, the MP4 keeps it. A silent original stays silent.",
      },
      {
        q: "Can I download a private account's Highlights?",
        a: "No. Private content is not supported. The downloader only processes media that is publicly reachable without a login.",
      },
      {
        q: "Does this work on iPhone and Android?",
        a: "Yes. The tool runs in a mobile browser and does not require an app. Save the downloaded file to Photos or Gallery afterward.",
      },
      {
        q: "Is there a limit on how many Highlights I can save?",
        a: "Normal personal use is fine, but the resolver applies rate limits to protect the service. If you hit one, wait a few minutes and try again.",
      },
    ],
    related: [
      "instagram-story-downloader",
      "instagram-reels-downloader",
      "instagram-photo-downloader",
      "instagram-video-downloader",
      "instagram-audio-downloader",
    ],
    keywords: [
      "instagram highlights downloader",
      "download instagram highlights",
      "save instagram highlights",
      "instagram highlight video download",
    ],
    updated: "November 2026",
  },
  {
    slug: "facebook-reels-downloader",
    platform: "facebook",
    name: "Facebook Reels Downloader",
    titleA: "Facebook Reels ",
    titleB: "Downloader",
    badge: "Facebook Reels Downloader — Free & Easy",
    subtitle:
      "Save public Facebook Reels as MP4 with the audio track Instagram and Facebook provide.",
    title: "Facebook Reels Downloader – Save Reels as MP4 Free",
    description:
      "Download public Facebook Reels as MP4. Paste a Reel link, preview the available video and save it to your device free, with no Facebook login.",
    h1: "Facebook Reels Downloader",
    intro: [
      "Facebook Reels are short vertical videos that appear in the Reels tab, the main feed and shared links. They are popular for recipes, comedy, fitness clips and quick tutorials. Facebook does not provide a save-to-gallery button for every Reel, especially on desktop, and screen recording lowers quality and captures interface elements.",
      "Downloadit takes a public Facebook Reel URL and resolves the video file that Facebook already serves. You can preview the result and download an MP4 without handing over a Facebook password. If the Reel is private, friends-only, deleted or region-restricted, the request fails with a clear error instead of returning a broken file.",
    ],
    formats: [
      "Public facebook.com/reel/… links",
      "Reels shared from the Facebook mobile app",
      "Vertical MP4 video at the quality Facebook exposes",
      "The original audio track when one is present",
      "Desktop and mobile Facebook links",
      "Public feed videos can use the Facebook Video Downloader",
    ],
    steps: [
      {
        title: "Find the public Reel",
        body: "Open Facebook and play the Reel once to confirm it is public and not limited to friends.",
      },
      {
        title: "Copy the Reel link",
        body: "Tap Share, then Copy link. On desktop, copy the address bar URL. It should include facebook.com/reel/.",
      },
      {
        title: "Paste and resolve",
        body: "Paste the link above and press Get Video. The tool checks the URL and loads the available video preview.",
      },
      {
        title: "Download the MP4",
        body: "Press Download to save the file. On mobile, move it from Downloads to Gallery or Photos if your browser does not do it automatically.",
      },
    ],
    devices: [
      {
        title: "iPhone",
        body: "Safari saves the MP4 to Files. Open it and tap Share > Save Video to add it to Photos. The process is the same for an iPad.",
      },
      {
        title: "Android",
        body: "Chrome downloads to the Downloads folder. Most gallery apps index the file automatically; if yours does not, use Files > Share > Gallery.",
      },
      {
        title: "PC and Mac",
        body: "The browser saves the video to Downloads. Rename it if needed; MP4 plays in Windows Media Player, QuickTime, VLC and most editors.",
      },
    ],
    troubleshooting: [
      {
        title: "Reel link is rejected",
        body: "Make sure you copied the Reel itself, not the profile page or a comment permalink. A valid link normally contains /reel/ and a numeric ID.",
      },
      {
        title: "Login or permission error",
        body: "The Reel may be friends-only, age-restricted or removed. Open it in a private window while logged out; if Facebook asks for a login, the content is not public.",
      },
      {
        title: "Preview is blank",
        body: "Try the download button directly, then refresh once. If the file still fails, the upstream URL may have expired; resolve the link again.",
      },
      {
        title: "No audio",
        body: "Some Reels are uploaded silently or use licensed music that Facebook strips from certain responses. Check the original before assuming the download failed.",
      },
    ],
    faqs: [
      {
        q: "Can I download Facebook Reels without logging in?",
        a: "Yes. Downloadit only needs the public Reel URL. It never asks for your Facebook account or password.",
      },
      {
        q: "Are Facebook Reels saved as MP4?",
        a: "Yes. The download is an MP4 video file, which works on iPhone, Android, Windows, Mac and most video editors.",
      },
      {
        q: "Where are my downloaded Reels saved?",
        a: "They go to your browser's Downloads folder. On iPhone, move the file from Files to Photos; on Android, Gallery usually indexes it automatically.",
      },
      {
        q: "Can I save a Reel from a private Facebook profile?",
        a: "No. Private and friends-only content is outside the supported scope and cannot be accessed by the tool.",
      },
      {
        q: "Does the download include a watermark?",
        a: "Downloadit returns the media file Facebook provides. It does not add its own watermark.",
      },
      {
        q: "Why does a Reel sometimes fail?",
        a: "Facebook changes media URLs and access rules frequently. Expired links, removed Reels, regional limits and rate limits are the usual causes.",
      },
    ],
    related: [
      "facebook-video-downloader",
      "facebook-watch-downloader",
      "instagram-reels-downloader",
      "twitter-video-downloader",
      "threads-video-downloader",
    ],
    keywords: [
      "facebook reels downloader",
      "download facebook reels",
      "fb reel video download",
      "save facebook reels mp4",
    ],
    updated: "November 2026",
  },
  {
    slug: "facebook-watch-downloader",
    platform: "facebook",
    name: "Facebook Watch Downloader",
    titleA: "Facebook Watch ",
    titleB: "Downloader",
    badge: "Facebook Watch Downloader — Free & Easy",
    subtitle:
      "Download public Facebook Watch videos as MP4 for offline viewing.",
    title: "Facebook Watch Downloader – Save Public Videos Free",
    description:
      "Download public Facebook Watch videos as MP4. Paste a Watch or video link, preview the available media and save it free without a Facebook login.",
    h1: "Facebook Watch Downloader",
    intro: [
      "Facebook Watch hosts longer videos: episodes, interviews, livestream replays, sports clips and creator shows. These videos behave differently from short Reels, and the share link may use a watch, video or fb.watch address. Keeping a copy for offline viewing is useful when travelling or when a video may later be removed.",
      "This page handles public Watch and video links through the same resolver as the main Facebook downloader. Paste a link, preview the MP4 and save it. The tool does not unlock private groups, paid content, login-only videos or geo-blocked streams. If a video needs a Facebook session, it is not public and should not be downloaded.",
    ],
    formats: [
      "Public facebook.com/watch/?v=… links",
      "Public facebook.com/…/videos/… post links",
      "fb.watch short links that resolve to a public video",
      "MP4 video at the quality Facebook exposes",
      "Audio included when the source video has audio",
      "Facebook Reels have a dedicated downloader page",
    ],
    steps: [
      {
        title: "Open the Watch video",
        body: "Play the public video in a logged-out or private browser window to confirm no login is required.",
      },
      {
        title: "Copy the page URL",
        body: "Copy the address bar link, or use Share > Copy link. Avoid links to a profile, playlist or comment thread.",
      },
      {
        title: "Paste and preview",
        body: "Paste the URL above and press Get Video. The resolver returns the available video preview and format.",
      },
      {
        title: "Save the file",
        body: "Press Download and keep the MP4 in a folder you can find later. Rename it with the title so long Watch videos stay organised.",
      },
    ],
    devices: [
      {
        title: "iPhone and iPad",
        body: "Safari stores the MP4 in Files. Open the file and save it to Photos if you want it in the camera roll. Large Watch videos may take longer to move.",
      },
      {
        title: "Android",
        body: "Chrome saves to Downloads. Use the Files app to move the video to Movies or let Gallery index it. A file manager is helpful for long videos.",
      },
      {
        title: "Windows and Mac",
        body: "The browser saves to Downloads. The MP4 opens in VLC, Windows Media Player, QuickTime or editors such as Premiere and DaVinci Resolve.",
      },
    ],
    troubleshooting: [
      {
        title: "Link points to a playlist",
        body: "Open the individual video first, then copy its URL. Playlist and channel pages do not identify one media file.",
      },
      {
        title: "Video is login-only",
        body: "Private groups, paid content and age-restricted videos cannot be resolved. Logging into Facebook through Downloadit is not supported.",
      },
      {
        title: "Long video times out",
        body: "Very large Watch videos can take longer to resolve or download. Keep the tab open, avoid switching networks and try again once.",
      },
      {
        title: "The file plays without sound",
        body: "Check whether the original has audio. Facebook sometimes serves silent renditions for muted or music-restricted videos.",
      },
    ],
    faqs: [
      {
        q: "What is the difference between Facebook Watch and Facebook Video?",
        a: "Watch is Facebook's destination for longer shows, episodes and replays. Both use public video links, and this downloader accepts either Watch or standard video URLs.",
      },
      {
        q: "Can I download a Facebook livestream?",
        a: "A public livestream replay can be downloaded if Facebook exposes it as a normal video. An active live stream is not a stable file and may fail.",
      },
      {
        q: "Do I need a Facebook account?",
        a: "No. Only a public link is required. Downloadit does not ask for credentials.",
      },
      {
        q: "What format will I get?",
        a: "MP4 is returned whenever Facebook provides a progressive video rendition. The exact resolution depends on the source.",
      },
      {
        q: "Can I save Watch videos on my phone?",
        a: "Yes. The site works in mobile Safari and Chrome. After downloading, move the file to Photos or Gallery if it is not indexed automatically.",
      },
      {
        q: "Is downloading a public Watch video legal?",
        a: "Copyright and platform rules still apply. Save only content you own or have permission to use, and do not redistribute it. This is general information, not legal advice.",
      },
    ],
    related: [
      "facebook-video-downloader",
      "facebook-reels-downloader",
      "twitter-video-downloader",
      "threads-video-downloader",
      "instagram-video-downloader",
    ],
    keywords: [
      "facebook watch downloader",
      "download facebook watch video",
      "facebook video downloader",
      "save fb watch video",
    ],
    updated: "November 2026",
  },
  {
    slug: "twitter-gif-downloader",
    platform: "twitter",
    name: "Twitter/X GIF Downloader",
    titleA: "Twitter/X GIF ",
    titleB: "Downloader",
    badge: "Twitter/X GIF Downloader — Free & Easy",
    subtitle:
      "Save GIFs from public X posts as playable MP4 files, with no login required.",
    title: "Twitter/X GIF Downloader – Save GIFs as MP4 Free",
    description:
      "Download GIFs from public Twitter/X posts as MP4 files. Paste a post link, preview the animation and save it free without an account.",
    h1: "Twitter/X GIF Downloader",
    intro: [
      "X, formerly Twitter, converts most uploaded GIFs into short looping MP4 videos. That is why a saved file may have an .mp4 extension even though the post looks like a GIF. The animation, timing and audio are preserved, and MP4 is smaller and more compatible than a traditional GIF on modern phones.",
      "Downloadit accepts a public X or Twitter post URL and resolves the animated media attached to it. You can preview the loop and download the file without logging in. If the post contains a normal video instead of a GIF, this page still works; the dedicated X Video to MP4 page explains the video-specific steps in more detail.",
    ],
    formats: [
      "Public x.com/…/status/… post links",
      "Legacy twitter.com/…/status/… links",
      "GIF-style animations served by X as MP4",
      "Short looping video with the available audio",
      "Posts where the GIF is the primary media item",
      "Standard X videos are supported by the video downloader",
    ],
    steps: [
      {
        title: "Open the post",
        body: "Find the public post containing the GIF. Make sure the post is visible while logged out.",
      },
      {
        title: "Copy the post link",
        body: "Tap Share > Copy link, or copy the URL from the address bar. It must contain /status/ and the post ID.",
      },
      {
        title: "Paste the link",
        body: "Paste the URL above and press Get Video. The resolver checks the post and loads the animated media.",
      },
      {
        title: "Download the loop",
        body: "Preview the result and press Download. The saved MP4 loops in most players and can be converted to GIF later if a platform requires it.",
      },
    ],
    devices: [
      {
        title: "iPhone",
        body: "Safari downloads the MP4 to Files. Save it to Photos from the share sheet. It will play and loop in the Photos app.",
      },
      {
        title: "Android",
        body: "Chrome saves the file to Downloads. Gallery or Google Photos usually picks it up; if not, share it from Files to Gallery.",
      },
      {
        title: "Desktop",
        body: "The MP4 opens in VLC, QuickTime or a browser tab. To post it as a real GIF elsewhere, convert it with a video editor or GIF tool.",
      },
    ],
    troubleshooting: [
      {
        title: "The file is MP4, not GIF",
        body: "This is expected. X stores most GIF uploads as short MP4 loops. The animation is intact.",
      },
      {
        title: "Post has several videos",
        body: "The resolver returns the media it can identify. For multi-video posts, download each available item from the result panel.",
      },
      {
        title: "GIF does not animate",
        body: "Try opening the MP4 in a different player. Some lightweight image viewers do not play video files.",
      },
      {
        title: "Link is private or deleted",
        body: "Protected accounts and removed posts cannot be resolved. Confirm the post opens in a logged-out browser.",
      },
    ],
    faqs: [
      {
        q: "Can I download a GIF from X as a real GIF?",
        a: "X normally serves GIF uploads as MP4. Downloadit saves that original animation file. You can convert it to GIF afterward if a service requires the older format.",
      },
      {
        q: "Do I need to log in to X?",
        a: "No. A public post URL is enough. Downloadit does not ask for your X password or cookies.",
      },
      {
        q: "Does the GIF keep its audio?",
        a: "If the source animation has an audio track, the MP4 keeps it. Many GIF-style posts are silent by design.",
      },
      {
        q: "Can I download GIFs from protected accounts?",
        a: "No. Protected posts are not public and are outside the supported scope.",
      },
      {
        q: "Will the animation loop?",
        a: "The MP4 plays like the original short video. Most players loop it when repeat is enabled; the file itself is not a GIF container.",
      },
      {
        q: "Is this Twitter/X GIF downloader free?",
        a: "Yes. There is no account, subscription or payment requirement for public posts.",
      },
    ],
    related: [
      "twitter-video-downloader",
      "twitter-video-to-mp4",
      "threads-video-downloader",
      "facebook-reels-downloader",
      "instagram-reels-downloader",
    ],
    keywords: [
      "twitter gif downloader",
      "x gif downloader",
      "download twitter gif",
      "save x gif as mp4",
    ],
    updated: "November 2026",
  },
  {
    slug: "twitter-video-to-mp4",
    platform: "twitter",
    name: "X Video to MP4",
    titleA: "X Video to ",
    titleB: "MP4",
    badge: "X Video to MP4 — Free & Easy",
    subtitle:
      "Convert a public X video post into a downloadable MP4 file in your browser.",
    title: "X Video to MP4 – Download Twitter Videos Free",
    description:
      "Convert public X and Twitter videos to MP4 online. Paste a post link, preview the available video and download it free without a login.",
    h1: "X Video to MP4",
    intro: [
      "X videos are delivered in several renditions, and the file you receive from a browser download is usually an MP4. The challenge is finding the direct media file behind a post rather than recording the screen. Screen recordings include interface elements, reduce quality and can desynchronise audio.",
      "This page takes a public X or Twitter post link and resolves the video stream X already serves. You get a standard MP4 that plays on iPhone, Android, Windows, Mac and common editing tools. The tool does not bypass protected accounts, paid content or login walls, and it does not add a watermark.",
    ],
    formats: [
      "Public x.com/…/status/… video posts",
      "Legacy twitter.com/…/status/… links",
      "MP4 video in the highest progressive rendition available",
      "Audio track included when the source has one",
      "GIF-style X animations saved as short MP4 loops",
      "Mobile share links that contain a status ID",
    ],
    steps: [
      {
        title: "Copy the post URL",
        body: "Open the public video post and copy its link. A valid URL contains /status/ followed by the numeric post ID.",
      },
      {
        title: "Paste it above",
        body: "Paste the URL into the field and press Get Video. The resolver looks for the video attached to that post.",
      },
      {
        title: "Preview the MP4",
        body: "Check the preview and the available quality. If the post has more than one media item, choose the one you need.",
      },
      {
        title: "Download and save",
        body: "Press Download. Rename the MP4 if you are archiving several clips, then move it to Photos, Gallery or your project folder.",
      },
    ],
    devices: [
      {
        title: "iPhone and iPad",
        body: "Safari saves to Files. Use Share > Save Video to put the MP4 in Photos. It plays natively without a third-party player.",
      },
      {
        title: "Android",
        body: "Chrome saves to Downloads. Gallery or Google Photos normally indexes it. For editing, open it from the Files app in your editor of choice.",
      },
      {
        title: "Windows and Mac",
        body: "The file lands in Downloads. MP4 is accepted by VLC, QuickTime, Windows Media Player, Premiere, Final Cut and DaVinci Resolve.",
      },
    ],
    troubleshooting: [
      {
        title: "No video found",
        body: "The post may contain only text or an external link, or the video may have been removed. Open the post and confirm a video is attached.",
      },
      {
        title: "Protected account error",
        body: "X protects some accounts and media. Downloadit cannot access posts that require following or logging in.",
      },
      {
        title: "Wrong video downloaded",
        body: "If the post is a thread or quote post, make sure you copied the URL of the specific post that contains the video.",
      },
      {
        title: "MP4 will not play",
        body: "Update your player or try VLC. A partially interrupted download can also corrupt the file; delete it and download again.",
      },
    ],
    faqs: [
      {
        q: "Does X provide MP4 files directly?",
        a: "X serves video in adaptive renditions. Downloadit resolves a progressive MP4 rendition that the public post exposes.",
      },
      {
        q: "Can I convert an X video without an app?",
        a: "Yes. The conversion and download happen in your browser. No desktop or mobile app is required.",
      },
      {
        q: "Is the highest resolution always available?",
        a: "No. The available renditions depend on what X exposes for that post. The tool returns the best supported option it can access.",
      },
      {
        q: "Can I download videos from protected X accounts?",
        a: "No. Protected posts are not public and are not supported.",
      },
      {
        q: "Does the MP4 have a watermark?",
        a: "Downloadit does not add a watermark. Any watermark already present in the creator's upload remains.",
      },
      {
        q: "Can I use the MP4 for editing?",
        a: "You can import it into editors, but you still need the creator's permission for reuse beyond personal or fair-use purposes.",
      },
    ],
    related: [
      "twitter-video-downloader",
      "twitter-gif-downloader",
      "facebook-video-downloader",
      "instagram-video-downloader",
      "threads-video-downloader",
    ],
    keywords: [
      "x video to mp4",
      "twitter video to mp4",
      "twitter video downloader",
      "convert x video mp4",
    ],
    updated: "November 2026",
  },
  {
    slug: "pinterest-to-mp4",
    platform: "pinterest",
    name: "Pinterest to MP4",
    titleA: "Pinterest to ",
    titleB: "MP4",
    badge: "Pinterest to MP4 — Free & Easy",
    subtitle:
      "Save a public Pinterest video Pin as an MP4 file for offline viewing.",
    title: "Pinterest to MP4 – Download Video Pins Free",
    description:
      "Convert public Pinterest video Pins to MP4. Paste a Pin or pin.it link, preview the video and download it free without an account or extension.",
    h1: "Pinterest to MP4",
    intro: [
      "Pinterest is a visual discovery platform, and many Pins are short videos rather than still images. Recipe demos, DIY tutorials, workout clips and travel guides are often published only as video Pins. Pinterest does not offer a universal download button, and screen recording captures the interface and lowers quality.",
      "This page resolves a public Pinterest Pin link and detects whether it contains a video. When it does, you can preview the media and save an MP4. If the Pin is actually an image or a carousel, use the Pinterest Image Downloader instead. Private boards, deleted Pins and login-only content are not supported.",
    ],
    formats: [
      "Public pinterest.com/pin/… video Pins",
      "pin.it short links that expand to a public Pin",
      "Regional Pinterest domains that serve the same Pin",
      "MP4 video at the quality Pinterest exposes",
      "Audio included when the source video has audio",
      "Image Pins and carousels use the Pinterest Image Downloader",
    ],
    steps: [
      {
        title: "Open the Pin",
        body: "Tap the video Pin and confirm it plays without requiring a Pinterest login.",
      },
      {
        title: "Copy the Pin link",
        body: "Use Share > Copy link or copy the browser address. pin.it short links are accepted too.",
      },
      {
        title: "Paste and select Video",
        body: "Paste the link above, choose the Video option if the page asks, and press Download Pin. Auto detection usually identifies it for you.",
      },
      {
        title: "Save the MP4",
        body: "Preview the video and download it. Move the file to Photos or Gallery on mobile if your browser stores it in Downloads first.",
      },
    ],
    devices: [
      {
        title: "iPhone",
        body: "Safari downloads to Files. Open the MP4 and tap Share > Save Video to add it to Photos. Pinterest short links work the same way.",
      },
      {
        title: "Android",
        body: "Chrome saves to Downloads. Gallery or Google Photos normally indexes the video; otherwise move it with your file manager.",
      },
      {
        title: "Desktop",
        body: "The MP4 goes to Downloads on Windows or Mac. It plays in VLC, QuickTime or a browser and can be imported into editing software.",
      },
    ],
    troubleshooting: [
      {
        title: "Pin detected as an image",
        body: "The Pin may be a static image or a carousel. Open the Pinterest Image Downloader to save those formats.",
      },
      {
        title: "Video option finds nothing",
        body: "The Pin may be a still image, or Pinterest may not expose a video rendition. Try Auto Detect first, then confirm the Pin still plays on Pinterest.",
      },
      {
        title: "pin.it link fails",
        body: "Short links can expire or point to a board rather than a Pin. Open the link once, copy the full pinterest.com/pin/ URL and try again.",
      },
      {
        title: "Private board error",
        body: "Secret boards and private Pins are not public. Downloadit cannot access content that requires a Pinterest session.",
      },
    ],
    faqs: [
      {
        q: "How do I convert a Pinterest video to MP4?",
        a: "Paste the public Pin link into this page, let the resolver detect the video, preview it and press download. The saved file is an MP4.",
      },
      {
        q: "Are Pinterest Idea Pins supported?",
        a: "Public Idea Pins that expose video or image media can be processed. Use the dedicated Pinterest Idea Pin Downloader page for the specific workflow.",
      },
      {
        q: "Do I need a Pinterest account?",
        a: "No. Only a public Pin URL is needed. Downloadit never asks for your Pinterest login.",
      },
      {
        q: "What if the Pin is actually an image?",
        a: "Use the Pinterest Image Downloader. It handles static images and supported carousel slides.",
      },
      {
        q: "Is the video quality reduced?",
        a: "No additional compression is added by Downloadit. You receive the rendition Pinterest serves publicly.",
      },
      {
        q: "Can I download from secret boards?",
        a: "No. Secret boards and private Pins are outside the supported scope.",
      },
    ],
    related: [
      "pinterest-video-downloader",
      "pinterest-image-downloader",
      "pinterest-idea-pin-downloader",
      "instagram-reels-downloader",
      "facebook-video-downloader",
    ],
    keywords: [
      "pinterest to mp4",
      "pinterest video to mp4",
      "convert pinterest video",
      "pinterest mp4 download",
    ],
    updated: "November 2026",
  },
  {
    slug: "pinterest-idea-pin-downloader",
    platform: "pinterest",
    name: "Pinterest Idea Pin Downloader",
    titleA: "Pinterest Idea Pin ",
    titleB: "Downloader",
    badge: "Pinterest Idea Pin Downloader — Free & Easy",
    subtitle:
      "Save the public photos and videos inside a Pinterest Idea Pin for offline reference.",
    title: "Pinterest Idea Pin Downloader – Save Public Pins",
    description:
      "Download public Pinterest Idea Pins as images or MP4 video. Paste a Pin link, preview every available page and save it free without an account.",
    h1: "Pinterest Idea Pin Downloader",
    intro: [
      "Idea Pins are Pinterest's multi-page format. A single Idea Pin can combine several video clips, photos, text overlays and links, which makes it different from a standard image or video Pin. Creators use them for recipes, routines, crafts and step-by-step guides. Saving the whole story is difficult because each page is a separate media item.",
      "Downloadit resolves the public Pin and returns the media Pinterest exposes. You can preview what is available and save individual pages as images or MP4 video. Idea Pins are still evolving, so the exact number of downloadable pages depends on what Pinterest serves for that Pin. If a page is missing, open the original and confirm it is still public.",
    ],
    formats: [
      "Public Pinterest Idea Pin links",
      "Multi-page Idea Pins with video and image pages",
      "MP4 pages when Pinterest exposes video",
      "JPEG or WebP images when the page is a still",
      "pin.it short links to a public Idea Pin",
      "Standard video Pins use the Pinterest to MP4 page",
    ],
    steps: [
      {
        title: "Open the Idea Pin",
        body: "Find the public Idea Pin and swipe through its pages so you know which parts you need.",
      },
      {
        title: "Copy the Pin URL",
        body: "Tap Share > Copy link. A short pin.it address is fine as long as it opens the same public Pin.",
      },
      {
        title: "Paste and resolve",
        body: "Paste the link above and press Download Pin. Leave the media selector on Auto Detect so the resolver can inspect every page.",
      },
      {
        title: "Save the pages you need",
        body: "Preview each available item. Download images or MP4 pages individually; the result panel shows which media type was found.",
      },
    ],
    devices: [
      {
        title: "iPhone and iPad",
        body: "Safari stores files in Files. Save images to Photos from the Files preview and use Share > Save Video for MP4 pages.",
      },
      {
        title: "Android",
        body: "Chrome saves to Downloads. Gallery usually indexes images and video automatically; use Files if a page does not appear.",
      },
      {
        title: "Desktop",
        body: "Files download to your normal folder. Rename pages in order if you are rebuilding the Idea Pin as a reference document.",
      },
    ],
    troubleshooting: [
      {
        title: "Only the first page appears",
        body: "Pinterest may expose Idea Pin pages differently depending on the link and region. Copy the full Pin URL and resolve again; if only one page is public, the rest cannot be accessed.",
      },
      {
        title: "Page downloads as a still",
        body: "That page may be an image with a text overlay rather than a video. Use the image download button instead.",
      },
      {
        title: "Pin is not found",
        body: "The creator may have deleted the Idea Pin or moved it to a private board. Check it in a logged-out browser.",
      },
      {
        title: "Short link opens a board",
        body: "Copy the URL of the individual Idea Pin, not the board that contains it.",
      },
    ],
    faqs: [
      {
        q: "What is a Pinterest Idea Pin?",
        a: "It is a multi-page Pinterest format that can mix video, images and text. It is not the same as a standard single-image or video Pin.",
      },
      {
        q: "Can I download every page of an Idea Pin?",
        a: "Downloadit returns every page that Pinterest exposes publicly. Some Idea Pins may expose only part of the sequence.",
      },
      {
        q: "Are Idea Pin videos saved as MP4?",
        a: "When a page is video, the download is MP4. Image pages are saved as the image format Pinterest serves.",
      },
      {
        q: "Do I need to log in?",
        a: "No. Downloadit only processes public links and never asks for Pinterest credentials.",
      },
      {
        q: "Can I save a private Idea Pin?",
        a: "No. Private boards and login-only Pins are not supported.",
      },
      {
        q: "Is there a separate tool for ordinary video Pins?",
        a: "Yes. Use Pinterest to MP4 or the main Pinterest Video Downloader for a standard video Pin.",
      },
    ],
    related: [
      "pinterest-video-downloader",
      "pinterest-image-downloader",
      "pinterest-to-mp4",
      "instagram-carousel-downloader",
      "threads-photo-downloader",
    ],
    keywords: [
      "pinterest idea pin downloader",
      "download pinterest idea pin",
      "save idea pin video",
      "pinterest idea pin images",
    ],
    updated: "November 2026",
  },
  {
    slug: "threads-photo-downloader",
    platform: "threads",
    name: "Threads Photo Downloader",
    titleA: "Threads Photo ",
    titleB: "Downloader",
    badge: "Threads Photo Downloader — Free & Easy",
    subtitle:
      "Save photos from public Threads posts without screenshots or an app.",
    title: "Threads Photo Downloader – Save Public Images Free",
    description:
      "Download photos from public Threads posts in the resolution Threads provides. Paste a post link, preview the images and save them free without login.",
    h1: "Threads Photo Downloader",
    intro: [
      "Threads posts can contain a single photo, several images, or a mix of text, images and video. Saving a photo with a screenshot captures the interface, reduces sharpness and may cut off part of a tall image. A direct download keeps the file that Threads serves to the browser.",
      "This page accepts a public Threads post link and resolves the images attached to it. You can preview the available media and save each photo. It also works when the post contains a video, but the dedicated Threads Video Downloader explains that flow. Private accounts, deleted posts and login-only replies are not supported.",
    ],
    formats: [
      "Public threads.net and threads.com post links",
      "Single-photo Threads posts",
      "Multi-image Threads posts",
      "JPEG, PNG or WebP images as served by Threads",
      "Mixed posts where a video is also present",
      "Video-only posts use the Threads Video Downloader",
    ],
    steps: [
      {
        title: "Open the public post",
        body: "Find the Threads post and confirm it is visible without logging in. A private account will not resolve.",
      },
      {
        title: "Copy the post link",
        body: "Use the share menu or copy the address bar URL. The link should point to the individual post, not the profile.",
      },
      {
        title: "Paste and preview",
        body: "Paste the link above and press Get Media. The resolver loads the image or images it can access.",
      },
      {
        title: "Download the photos",
        body: "Use the download control on each image. Multi-image posts may offer a download-all option when several real images are present.",
      },
    ],
    devices: [
      {
        title: "iPhone",
        body: "Safari saves images to Files. Open an image and choose Save to Photos. For several images, save them one by one or use the download-all ZIP.",
      },
      {
        title: "Android",
        body: "Chrome saves to Downloads. Google Photos or Gallery normally indexes the images; use Files if they do not appear immediately.",
      },
      {
        title: "Desktop",
        body: "Images download to your normal folder. Rename them in post order if you are collecting a series.",
      },
    ],
    troubleshooting: [
      {
        title: "Only text is found",
        body: "The post may not contain an image, or the media may be a link preview. Open the post and confirm a photo is attached.",
      },
      {
        title: "Private account error",
        body: "Threads posts from private accounts are not public. Downloadit cannot access them without a login, and it does not ask for one.",
      },
      {
        title: "Image looks smaller than expected",
        body: "You receive the resolution Threads serves publicly. The platform may compress uploads, and the tool does not upscale them.",
      },
      {
        title: "Video downloads instead of a photo",
        body: "Use the result panel's media selector or open the Threads Video Downloader. Mixed posts can contain both types.",
      },
    ],
    faqs: [
      {
        q: "Can I download photos from Threads without an account?",
        a: "Yes. Paste a public Threads post link and resolve it. No Threads or Instagram login is required.",
      },
      {
        q: "Does this work on threads.com and threads.net?",
        a: "Yes. Both domains are accepted when the link points to an individual public post.",
      },
      {
        q: "Can I save all photos from a multi-image Threads post?",
        a: "Yes, when Threads exposes each image. The preview lists the available items and offers individual downloads.",
      },
      {
        q: "Are Threads photos saved in original quality?",
        a: "You get the file resolution Threads provides publicly. No extra compression is applied by Downloadit.",
      },
      {
        q: "Can I download a private Threads post?",
        a: "No. Private accounts and login-only posts are outside the supported scope.",
      },
      {
        q: "Is the Threads Photo Downloader free?",
        a: "Yes. It is free to use and does not require an account or app.",
      },
    ],
    related: [
      "threads-video-downloader",
      "instagram-photo-downloader",
      "instagram-carousel-downloader",
      "facebook-reels-downloader",
      "twitter-gif-downloader",
    ],
    keywords: [
      "threads photo downloader",
      "download threads photos",
      "save threads images",
      "threads image download",
    ],
    updated: "November 2026",
  },
];

export function getKeywordPage(slug: string): KeywordPage | undefined {
  return KEYWORD_PAGES.find((page) => page.slug === slug);
}
