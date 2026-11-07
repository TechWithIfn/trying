"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import ToolDownloader from "@/components/ToolDownloader";
import { TOOL_PAGES } from "@/config/toolPages";
import { CheckCircle2, AlertTriangle } from "lucide-react";

const PAGE = TOOL_PAGES.instagramVideo;

const FAQS = [
  {
    q: "What counts as a video post here, as opposed to a reel?",
    a: "On this page, video means longer feed posts, presentations, interviews, product demos, and clips rather than quick 9:16 vertical reels. In practice, you do not need to sort them yourself: paste any public Instagram link and Downloadit automatically detects what it is and resolves the right preview.",
  },
  {
    q: "How much storage should I leave for a long video?",
    a: "Think in minutes, not seconds. A minute of full HD video is roughly 20 to 50 megabytes, so a ten-minute interview can easily reach several hundred megabytes. Check your available storage before downloading, especially on mobile devices.",
  },
  {
    q: "Can I keep a video for offline watching without internet?",
    a: "Yes, that is the core purpose of saving the original MP4. Save the file over Wi-Fi beforehand and it will play offline in your gallery, VLC, Apple Files, or any media player without any active network connection.",
  },
  {
    q: "The video plays in preview but fails or stops during saving. Why?",
    a: "This is usually caused by an unstable Wi-Fi connection, low local disk space, or an expired CDN token. Re-paste the original post link so Downloadit gets a fresh media URL and download in one uninterrupted session.",
  },
  {
    q: "I pasted a profile link and got the wrong media. What happened?",
    a: "You copied the creator's profile page URL instead of a specific post. Tap or click on the individual video so it opens on its own screen, then use the Share menu to copy the link.",
  },
  {
    q: "Do downloaded videos work in video editors and presentation tools?",
    a: "Yes. The downloaded file is a standard progressive MP4 with AAC audio. It works natively in Premiere, Final Cut, CapCut, DaVinci Resolve, PowerPoint, Keynote, and Google Slides.",
  },
];

export default function VideoDownloaderPageClient() {
  return (
    <>
      <Header />
      <main id="main-content" className="flex-1">
        <Breadcrumb items={[{ name: "Home", path: "/" }, { name: PAGE.name, path: PAGE.path }]} />
        <ToolDownloader page={PAGE} />

        <section className="mx-auto max-w-[920px] px-5 sm:px-6 lg:px-12 pt-2 pb-16 sm:pt-4">
          <div className="mb-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-fg-subtle transition-colors hover:text-primary"
            >
              <span aria-hidden="true">←</span>
              <span>Back to Home Downloader</span>
            </Link>
          </div>

          {/* Heading required by prompt */}
          <h2 className="text-[24px] font-bold tracking-tight text-fg sm:text-[30px] leading-[1.25]">
            What the Video Downloader Does
          </h2>

          {/* Complete educational content shown by default without any Read More / Know More button */}
          <div className="mt-6 space-y-8 text-fg">
            {/* What is a Video Downloader? */}
            <div>
              <h3 className="text-[20px] font-bold text-fg mb-3">What is a Video Downloader?</h3>
              <p className="text-[15px] sm:text-[16px] leading-[1.75] text-fg-muted">
                A video downloader is an online utility that allows you to save publicly accessible streaming videos from social networks to your personal device as independent video files (such as MP4). Instead of being forced to re-stream the clip every time you want to view it, a downloader lets you store the master video locally for offline playback, reference, archiving, and study.
              </p>
            </div>

            {/* How Does It Work? */}
            <div>
              <h3 className="text-[20px] font-bold text-fg mb-3">How Does It Work?</h3>
              <p className="text-[15px] sm:text-[16px] leading-[1.75] text-fg-muted">
                When a public video is shared on Instagram, the platform generates a progressive MP4 media stream hosted on Content Delivery Networks (CDNs). When you paste a public URL into Downloadit, our backend resolver inspects the page metadata, extracts the direct source URL of the video stream, and prepares a high-speed download link. No credentials, cookies, or account sessions are required.
              </p>
            </div>

            {/* Supported Platforms */}
            <div>
              <h3 className="text-[20px] font-bold text-fg mb-3">Supported Platforms</h3>
              <p className="text-[15px] sm:text-[16px] leading-[1.75] text-fg-muted mb-3">
                While this page is optimized specifically for Instagram video content, Downloadit provides dedicated high-speed download engines for six major platforms:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  { name: "Instagram", desc: "Videos, Reels, Stories, Photos" },
                  { name: "Pinterest", desc: "Video pins, Idea pins, Images" },
                  { name: "YouTube", desc: "Standard videos, Shorts, Audio" },
                  { name: "Facebook", desc: "Watch videos, Feed clips, Reels" },
                  { name: "Twitter / X", desc: "Tweet videos, Looped GIFs" },
                  { name: "Threads", desc: "Post videos and high-res images" },
                ].map((item) => (
                  <div key={item.name} className="rounded-xl border border-border bg-card p-3">
                    <span className="block text-[13.5px] font-bold text-primary">{item.name}</span>
                    <span className="block text-[11.5px] text-fg-subtle">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* What Types of Videos Can Be Downloaded? */}
            <div>
              <h3 className="text-[20px] font-bold text-fg mb-3">What Types of Videos Can Be Downloaded?</h3>
              <ul className="list-disc pl-5 space-y-2 text-[15px] sm:text-[16px] leading-[1.7] text-fg-muted">
                <li><strong className="text-fg">Long-form video posts:</strong> Educational tutorials, demonstrations, speeches, and interviews.</li>
                <li><strong className="text-fg">Short video clips:</strong> Standard landscape, square, or vertical clips published in user feeds.</li>
                <li><strong className="text-fg">High-Definition MP4:</strong> Original resolutions including 1080p and 720p with clean audio tracks.</li>
                <li><strong className="text-fg">Public account media:</strong> Any video visible to a logged-out web visitor without permission barriers.</li>
              </ul>
            </div>

            {/* How to Download Videos */}
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
              <h3 className="text-[20px] font-bold text-fg mb-4">How to Download Videos, Step by Step</h3>

              <div className="space-y-6">
                <div>
                  <h4 className="text-[16px] font-bold text-primary-strong mb-2">On Android Devices</h4>
                  <ol className="list-decimal pl-5 space-y-2 text-[14.5px] leading-[1.7] text-fg-muted">
                    <li>Open the Instagram app and navigate to the video post you want to save.</li>
                    <li>Tap the <strong className="text-fg">Share</strong> button and select <strong className="text-fg">Copy Link</strong>.</li>
                    <li>Open your web browser (Chrome, Firefox, Samsung Internet), paste the link into Downloadit, and tap <strong className="text-fg">Get Media</strong>.</li>
                    <li>Confirm the preview matches your video, tap <strong className="text-fg">Download</strong>, and find your MP4 in your Gallery or Downloads folder.</li>
                  </ol>
                </div>

                <div>
                  <h4 className="text-[16px] font-bold text-primary-strong mb-2">On iPhone &amp; iPad (iOS)</h4>
                  <ol className="list-decimal pl-5 space-y-2 text-[14.5px] leading-[1.7] text-fg-muted">
                    <li>Open the Instagram app, tap the three dots or Share icon on the video, and tap <strong className="text-fg">Copy Link</strong>.</li>
                    <li>Open <strong className="text-fg">Safari</strong> or Chrome, paste the link into the download box above, and tap <strong className="text-fg">Get Media</strong>.</li>
                    <li>Preview the video, tap <strong className="text-fg">Download</strong>, and confirm the Safari download prompt.</li>
                    <li>The video is saved to the <strong className="text-fg">Files</strong> app under Downloads, where you can watch it offline or save it to your Photos app.</li>
                  </ol>
                </div>

                <div>
                  <h4 className="text-[16px] font-bold text-primary-strong mb-2">On Desktop (Windows, Mac, Linux)</h4>
                  <ol className="list-decimal pl-5 space-y-2 text-[14.5px] leading-[1.7] text-fg-muted">
                    <li>Open Instagram in your web browser and copy the URL from the browser address bar.</li>
                    <li>Paste the URL into Downloadit and click <strong className="text-fg">Get Media</strong>.</li>
                    <li>Check the preview, click <strong className="text-fg">Download</strong>, and choose where to save the MP4 file on your hard drive.</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Features and Benefits */}
            <div>
              <h3 className="text-[20px] font-bold text-fg mb-4">Features and Benefits</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { title: "No Watermarks Added", desc: "Get pure original video streams without promotional logos, stamps, or watermarks." },
                  { title: "Preserved Audio Quality", desc: "Original stereo audio encoded in standard AAC at optimal bitrate." },
                  { title: "Universal Compatibility", desc: "MP4 container files play natively on iOS, Android, Windows, Mac, and Smart TVs." },
                  { title: "Zero Software Installation", desc: "100% web-based. No sketchy desktop software, APK files, or browser extensions needed." },
                ].map((feat) => (
                  <div key={feat.title} className="flex gap-3 rounded-xl border border-border/80 bg-card p-4">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                    <div>
                      <h4 className="text-[14.5px] font-bold text-fg">{feat.title}</h4>
                      <p className="text-[13px] text-fg-muted mt-0.5">{feat.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Common Video Download Problems */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-[20px] font-bold text-fg mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Common Video Download Problems &amp; Solutions
              </h3>
              <div className="space-y-3 text-[14.5px] leading-[1.7] text-fg-muted">
                <p>
                  <strong className="text-fg">Private Account Restrictions:</strong> Downloadit only accesses public media. If an account is set to private, the platform refuses all logged-out requests, and the video cannot be downloaded.
                </p>
                <p>
                  <strong className="text-fg">Expired Media URLs:</strong> Instagram signs CDN addresses with time-sensitive authorization tokens. If you let a resolved page sit idle for hours before clicking download, the token may expire. Simply paste the link again to refresh the token.
                </p>
                <p>
                  <strong className="text-fg">Profile Grid vs. Single Post:</strong> Pasting a profile URL like <code className="text-xs bg-bg px-1.5 py-0.5 rounded">instagram.com/username</code> will fail because it does not specify which video to download. Always open the individual post first.
                </p>
              </div>
            </div>

            {/* Frequently Asked Questions */}
            <div className="pt-4">
              <h3 className="text-[22px] font-bold text-fg mb-4">Frequently Asked Questions</h3>
              <div className="space-y-3">
                {FAQS.map((item) => (
                  <div key={item.q} className="rounded-xl border border-border bg-card p-4 sm:p-5">
                    <h4 className="text-[15.5px] font-bold text-fg mb-2">{item.q}</h4>
                    <p className="text-[14px] leading-relaxed text-fg-muted">{item.a}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Related Downloaders */}
            <div className="pt-4">
              <h3 className="text-[20px] font-bold text-fg mb-4">Related Downloaders</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { href: "/instagram-reels-downloader", label: "Instagram Reels Downloader", desc: "Download public vertical Reels" },
                  { href: "/instagram-photo-downloader", label: "Instagram Photo Downloader", desc: "Save photos and swipe carousels" },
                  { href: "/instagram-story-downloader", label: "Instagram Story Downloader", desc: "Save active 24h stories" },
                  { href: "/instagram-audio-downloader", label: "Instagram Audio Downloader", desc: "Extract background music to MP3" },
                  { href: "/pinterest-video-downloader", label: "Pinterest Video Downloader", desc: "Save Pinterest video pins" },
                  { href: "/youtube-video-downloader", label: "YouTube Video Downloader", desc: "Save YouTube videos and Shorts" },
                ].map((tool) => (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    className="flex flex-col rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:bg-primary-light/40"
                  >
                    <span className="text-[14px] font-bold text-primary">{tool.label}</span>
                    <span className="text-[12px] text-fg-subtle mt-0.5">{tool.desc}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQS.map((item) => ({
              "@type": "Question",
              name: item.q,
              acceptedAnswer: { "@type": "Answer", text: item.a },
            })),
          }),
        }}
      />
    </>
  );
}
