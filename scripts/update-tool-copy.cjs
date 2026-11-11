const fs = require("fs");
const path = "frontend/src/config/toolPages.ts";
let src = fs.readFileSync(path, "utf8");

const copy = {
  instagramReels: {
    title: "Instagram Reels Downloader – Save Reels as MP4 | Downloadit",
    desc: "Download public Instagram Reels as MP4 with the original audio. Paste a Reel link, preview the available quality and save it free — no login or app required.",
  },
  instagramVideo: {
    title: "Instagram Downloader – Reels, Videos, Photos & Stories | Downloadit",
    desc: "Download public Instagram media with one tool: Reels, videos, photos, carousels, Stories and MP3 audio. Paste a link, preview the result and save. No login.",
  },
  instagramPhoto: {
    title: "Instagram Photo & Carousel Downloader – Save Images | Downloadit",
    desc: "Download public Instagram photos and carousel slides at the resolution Instagram provides. Save a single image or every slide as JPEG. Free, no login required.",
  },
  instagramStory: {
    title: "Instagram Story Downloader – Save Public Stories | Downloadit",
    desc: "Download public Instagram Stories while they are still live. Save Story photos as JPEG or videos as MP4 before the 24-hour window closes. No login required.",
  },
  instagramAudio: {
    title: "Instagram Audio Downloader – Reels & Video to MP3 | Downloadit",
    desc: "Extract audio from public Instagram Reels and videos as an MP3. Paste a link, preview the media and download the sound track. Free, no software, no login.",
  },
  pinterestVideo: {
    title: "Pinterest Video Downloader – Save Public Video Pins | Downloadit",
    desc: "Download public Pinterest video Pins as MP4. Paste a Pin link, preview the available media and save the video file. Free to use, no login or extension needed.",
  },
  pinterestImage: {
    title: "Pinterest Image Downloader – Save Pins in HD | Downloadit",
    desc: "Download images from public Pinterest Pins, including supported carousel slides. Paste a Pin link, preview the pictures and save them in the format provided.",
  },
  youtubeVideo: {
    title: "YouTube Video Downloader – MP4 Video & MP3 Audio | Downloadit",
    desc: "Download public YouTube videos in an available MP4 quality up to 1080p, or extract the audio as MP3 or M4A. Paste a link, preview and save. No login required.",
  },
  facebookVideo: {
    title: "Facebook Video Downloader – Save Public FB Videos | Downloadit",
    desc: "Download publicly accessible Facebook videos and Reels as MP4. Paste a post link, preview the available media and save it without a Facebook login.",
  },
  twitterVideo: {
    title: "Twitter/X Video Downloader – Save Videos as MP4 | Downloadit",
    desc: "Download videos and animated GIFs from public Twitter/X posts as MP4. Paste a post link, preview the available media and save it without an account.",
  },
  threadsVideo: {
    title: "Threads Video Downloader – Save Videos & Photos | Downloadit",
    desc: "Download videos and photos from public Threads posts. Paste a Threads link, preview the available media and save it to your device without logging in.",
  },
};

let count = 0;
for (const [key, val] of Object.entries(copy)) {
  const startRe = new RegExp(`\\n  ${key}: \\{`);
  const m = startRe.exec(src);
  if (!m) throw new Error(`key not found: ${key}`);
  const start = m.index + 1;
  const endMarker = "\n  },";
  const end = src.indexOf(endMarker, start);
  if (end === -1) throw new Error(`end not found: ${key}`);
  let block = src.slice(start, end);
  const before = block;
  block = block.replace(/seoTitle: "(?:[^"\\]|\\.)*"/, `seoTitle: ${JSON.stringify(val.title)}`);
  block = block.replace(/seoDescription:\r?\n      "(?:[^"\\]|\\.)*"/, `seoDescription:\n      ${JSON.stringify(val.desc)}`);
  if (block === before) throw new Error(`no replacement in ${key}`);
  src = src.slice(0, start) + block + src.slice(end);
  count++;
}
fs.writeFileSync(path, src, "utf8");
console.log(`Updated ${count} tool-page entries.`);
