"use client";

import { useState, useCallback, type ReactNode } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ShieldCheck,
  Mail,
  Play,
  Film,
  Image as ImageIcon,
  Clock,
  Star,
  Music,
  ArrowRight,
  ArrowDown,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";
import { useLanguage } from "@/i18n";
import { SUPPORT_EMAIL, SUPPORT_GMAIL_URL } from "@/config/site";

const TYPE_ICONS = [Play, Film, ImageIcon, Clock, Star, Music];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[24px] font-bold tracking-[-0.01em] text-fg sm:text-[26px]">
      {children}
    </h2>
  );
}

const TOOL_LINK = "font-semibold text-primary hover:underline";

function Accordion({
  items,
  idPrefix,
}: {
  items: { q: string; a: ReactNode }[];
  idPrefix: string;
}) {
  const [openIndex, setOpenIndex] = useState(0);
  const toggle = useCallback((i: number) => {
    setOpenIndex((prev) => (prev === i ? -1 : i));
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div
            key={i}
            className="rounded-2xl transition-all duration-200"
            style={{
              background: isOpen ? "var(--accent-tint-purple)" : "var(--card)",
              border: isOpen
                ? "1px solid var(--accent-tint-purple-border)"
                : "1px solid var(--border)",
              boxShadow: isOpen ? "none" : "var(--shadow-card)",
            }}
          >
            <button
              type="button"
              onClick={() => toggle(i)}
              aria-expanded={isOpen}
              aria-controls={`${idPrefix}-answer-${i}`}
              className="flex w-full items-center justify-between gap-4 py-5 px-6 text-left transition-colors"
            >
              <span className="text-[16px] font-semibold text-fg pr-2">{item.q}</span>
              <ChevronDown
                className="h-[18px] w-[18px] shrink-0 transition-transform duration-250"
                style={{
                  color: "var(--fg-subtle)",
                  transform: isOpen ? "rotate(180deg)" : "rotate(0)",
                }}
              />
            </button>
            <div
              id={`${idPrefix}-answer-${i}`}
              role="region"
              className="overflow-hidden transition-all duration-300"
              style={{
                maxHeight: isOpen ? 600 : 0,
                opacity: isOpen ? 1 : 0,
                padding: isOpen ? "0 24px 20px" : "0 24px",
              }}
            >
              <div className="text-[14px] leading-[1.65] text-fg-muted">{item.a}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function HelpClient() {
  const { t } = useLanguage();
  const h = t.help;
  const typeNames = [t.tabs.reels, t.tabs.videos, t.tabs.photos, t.tabs.stories, t.tabs.audio];

  // NOTE: document.title is intentionally NOT set here. The <title> comes
  // from the page metadata API (single source of truth for crawlers and tabs).

  return (
    <>
      <Header />
      <main id="main-content" className="flex-1">
        <section className="relative overflow-hidden pb-8 pt-8 sm:pt-12">
          <div className="absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-primary/[0.03] blur-[160px]" />
          </div>
          <div className="mx-auto max-w-[800px] px-4 text-center sm:px-6">
            <h1
              className="animate-fade-in-up font-bold tracking-[-0.02em] text-fg"
              style={{ fontSize: "clamp(32px, 6vw, 56px)", lineHeight: 1.1 }}
            >
              {h.title}
            </h1>
            <p className="animate-fade-in-up delay-100 mx-auto mt-4 max-w-[560px] text-[16px] leading-[1.7] text-fg-muted sm:text-[18px]">
              {h.subtitle}
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-[800px] px-4 pb-20 sm:px-6">
          {/* ── 1. Getting started ── */}
          <ScrollReveal>
            <section className="mt-10 rounded-[24px] p-7 sm:p-9" style={{ background: "var(--card)", boxShadow: "var(--shadow-card)", border: "1px solid var(--border)" }}>
              <SectionTitle>{h.s1title}</SectionTitle>
              <ol className="mt-6 flex flex-col gap-4">
                {h.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3.5">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[14px] font-bold text-white"
                      style={{ background: "var(--brand-gradient)" }}
                    >
                      {i + 1}
                    </span>
                    <p className="pt-1 text-[16px] leading-[1.65] text-fg-muted">{step}</p>
                  </li>
                ))}
              </ol>
            </section>
          </ScrollReveal>

          {/* ── 2. Supported content ── */}
          <ScrollReveal>
            <section className="mt-8 rounded-[24px] p-7 sm:p-9" style={{ background: "var(--card)", boxShadow: "var(--shadow-card)", border: "1px solid var(--border)" }}>
              <SectionTitle>{h.s2title}</SectionTitle>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {typeNames.map((name, i) => {
                  const Icon = TYPE_ICONS[i];
                  return (
                    <div
                      key={name}
                      className="flex items-center gap-2.5 rounded-2xl p-4"
                      style={{ background: "var(--bg)" }}
                    >
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                        style={{ background: "var(--accent-tint-purple)", border: "1px solid var(--accent-tint-purple-border)" }}
                      >
                        <Icon size={17} color="var(--primary)" strokeWidth={2} />
                      </span>
                      <span className="text-[14px] font-bold text-fg">{name}</span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-5 text-[14px] leading-[1.7] text-fg-muted">{h.s2note}</p>
            </section>
          </ScrollReveal>

          {/* ── 2b. Which link shapes work ── */}
          <ScrollReveal>
            <section className="mt-8 rounded-[24px] p-7 sm:p-9" style={{ background: "var(--card)", boxShadow: "var(--shadow-card)", border: "1px solid var(--border)" }}>
              <SectionTitle>Which links work</SectionTitle>
              <p className="mt-3 text-[16px] leading-[1.7] text-fg-muted">
                Paste the instagram.com link itself, exactly as Instagram&apos;s Share → Copy link gives it to you. These shapes are accepted:
              </p>
              <ul className="mt-5 flex flex-col gap-3 text-[14px] leading-[1.7] text-fg-muted">
                <li><span className="rounded px-1.5 py-0.5 font-mono text-[13px]" style={{ background: "var(--bg)" }}>instagram.com/reel/…</span> — any public reel, for the <Link href="/instagram-reels-downloader" className={TOOL_LINK}>Reels downloader</Link>.</li>
                <li><span className="rounded px-1.5 py-0.5 font-mono text-[13px]" style={{ background: "var(--bg)" }}>instagram.com/p/…</span> — photo posts, video posts and carousels, for the <Link href="/instagram-photo-downloader" className={TOOL_LINK}>Photo</Link> and <Link href="/instagram-video-downloader" className={TOOL_LINK}>Video downloaders</Link>. Older long videos may use <span className="rounded px-1.5 py-0.5 font-mono text-[13px]" style={{ background: "var(--bg)" }}>/tv/…</span> instead.</li>
                <li><span className="rounded px-1.5 py-0.5 font-mono text-[13px]" style={{ background: "var(--bg)" }}>instagram.com/stories/…</span> — a live story, for the <Link href="/instagram-story-downloader" className={TOOL_LINK}>Story downloader</Link>. Copy it while the story is still up.</li>
                <li><span className="rounded px-1.5 py-0.5 font-mono text-[13px]" style={{ background: "var(--bg)" }}>instagram.com/username</span> — a plain public profile link is accepted as a story lookup.</li>
              </ul>
              <p className="mt-5 text-[14px] leading-[1.7] text-fg-muted">
                Only instagram.com links (with or without www, mobile links included) are accepted — if the tool says a link does not look valid, it is usually truncated or from somewhere else entirely. And whatever the shape, the content itself must be public: private, removed and expired content fails at resolve time with a plain message, never a fake file.
              </p>
              <p className="mt-3 text-[14px] leading-[1.7] text-fg-muted">
                Audio is not a link shape of its own — the sound is extracted from reel and video links like the ones above, through the <Link href="/instagram-audio-downloader" className={TOOL_LINK}>Audio downloader</Link>.
              </p>
            </section>
          </ScrollReveal>

          {/* ── 3. How it works ── */}
          <ScrollReveal>
            <section className="mt-8 rounded-[24px] p-7 sm:p-9" style={{ background: "var(--card)", boxShadow: "var(--shadow-card)", border: "1px solid var(--border)" }}>
              <SectionTitle>{h.s3title}</SectionTitle>
              <p className="mt-3 text-[16px] leading-[1.7] text-fg-muted">{h.s3desc}</p>
              <div className="mt-6 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                {h.flow.map((step, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 sm:flex-1 sm:flex-row sm:justify-center">
                    <span
                      className="w-full rounded-xl px-4 py-3 text-center text-[14px] font-bold text-white sm:w-auto sm:flex-1"
                      style={{ background: "var(--brand-gradient)" }}
                    >
                      {step}
                    </span>
                    {i < h.flow.length - 1 && (
                      <>
                        <ArrowDown className="h-4 w-4 shrink-0 text-fg-subtle sm:hidden" />
                        <ArrowRight className="hidden h-4 w-4 shrink-0 text-fg-subtle sm:block" />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </ScrollReveal>

          {/* ── 4. Audio ── */}
          <ScrollReveal>
            <section className="mt-8 rounded-[24px] p-7 sm:p-9" style={{ background: "var(--card)", boxShadow: "var(--shadow-card)", border: "1px solid var(--border)" }}>
              <SectionTitle>{h.s4title}</SectionTitle>
              <ol className="mt-6 flex flex-col gap-4">
                {h.s4steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3.5">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[14px] font-bold text-white"
                      style={{ background: "var(--brand-gradient)" }}
                    >
                      {i + 1}
                    </span>
                    <p className="pt-1 text-[16px] leading-[1.65] text-fg-muted">{step}</p>
                  </li>
                ))}
              </ol>
            </section>
          </ScrollReveal>

          {/* ── 4b. Reels problems ── */}
          <ScrollReveal>
            <section className="mt-8">
              <div className="mb-5 px-1">
                <SectionTitle>Reels problems</SectionTitle>
              </div>
              <Accordion idPrefix="help-reels" items={[
                {
                  q: "It says private, but I can watch the reel myself",
                  a: <span>You can watch it because you follow the account or are logged in. The check here is stricter: what is visible to a logged-out stranger. Follower-only reels fail that check, correctly. Only genuinely public reels work — try one from a public account to confirm the tool itself is fine. Details on the <Link href="/instagram-reels-downloader" className={TOOL_LINK}>Reels downloader page</Link>.</span>,
                },
                {
                  q: "A reel link from a chat will not resolve",
                  a: "Chat apps love cutting long links short. Ask for the link again or re-copy it yourself with Share → Copy link, and paste the complete URL including the /reel/ part. A trimmed link fails validation before anything else happens.",
                },
                {
                  q: "The saved reel has no sound",
                  a: "The MP4 carries the reel's original audio track, so check the easy things first: your volume, the silent switch, the earpiece versus speaker. If the reel plays silently on Instagram itself, the file will be silent too — nothing was lost in transit.",
                },
                {
                  q: "Preview played, but the download came out tiny or empty",
                  a: "Instagram signs media URLs for a short window and yours died between preview and tap. This one is routine: paste the reel link again and download promptly this time.",
                },
              ]} />
            </section>
          </ScrollReveal>

          {/* ── 4c. Video problems ── */}
          <ScrollReveal>
            <section className="mt-8">
              <div className="mb-5 px-1">
                <SectionTitle>Video problems</SectionTitle>
              </div>
              <Accordion idPrefix="help-videos" items={[
                {
                  q: "A long video stalls partway through",
                  a: "Long clip, big file, fragile connection — that combination stalls. Free up storage, get on stable Wi-Fi, resolve the link again so the download URL is live, and let the transfer finish without switching apps mid-way.",
                },
                {
                  q: "It previewed fine but will not save on my iPhone",
                  a: <span>It probably did save — iPhones put downloads in Files, not Photos. Open the Files app, look in Downloads, and your MP4 should be sitting there. More on the <Link href="/instagram-video-downloader" className={TOOL_LINK}>Video downloader page</Link>.</span>,
                },
                {
                  q: "The preview shows the wrong video",
                  a: "You pasted a profile or grid URL instead of the post URL. Go back, open the video post itself so it fills the screen, and copy the link from there.",
                },
                {
                  q: "I pasted a reel on the video page — problem?",
                  a: "No. The tabs are presets for one pipeline and detection re-sorts the type by itself, flipping to the Reels tab automatically. Nothing to redo.",
                },
              ]} />
            </section>
          </ScrollReveal>

          {/* ── 4d. Photo problems ── */}
          <ScrollReveal>
            <section className="mt-8">
              <div className="mb-5 px-1">
                <SectionTitle>Photo problems</SectionTitle>
              </div>
              <Accordion idPrefix="help-photos" items={[
                {
                  q: "Only the first carousel slide saved",
                  a: <span>That is how it is supposed to work — every slide is its own file. Watch the counter, step through with Next and Previous, and tap Download on each image you want. Ten slides means ten taps. The <Link href="/instagram-photo-downloader" className={TOOL_LINK}>Photo downloader page</Link> walks through it.</span>,
                },
                {
                  q: "The saved photo looks soft or blurry",
                  a: "Compare the downloaded file, not the small preview on the page. The file is Instagram's original resolution; the preview is a lightweight stand-in and was never meant for judging sharpness.",
                },
                {
                  q: "There is no link to copy",
                  a: "You are on the profile grid. Tap into the post so the photo or carousel opens on its own screen, then copy the link from there — three dots on desktop, Share on mobile.",
                },
                {
                  q: "Can I grab a profile picture this way?",
                  a: "No, and that is deliberate scope, not a bug. This flow handles photo posts and carousels only. Profile pictures are a different thing entirely.",
                },
              ]} />
            </section>
          </ScrollReveal>

          {/* ── 4e. Story problems ── */}
          <ScrollReveal>
            <section className="mt-8">
              <div className="mb-5 px-1">
                <SectionTitle>Story problems</SectionTitle>
              </div>
              <Accordion idPrefix="help-stories" items={[
                {
                  q: "“Expired / not found” on a story I saw today",
                  a: "The 24-hour clock runs from posting, not from when you saw it. A story from last night is already gone this evening, and once Instagram removes it there is nothing left for any link tool to fetch. Save stories the same day you spot them.",
                },
                {
                  q: "I follow them — why does it say private?",
                  a: "Following someone is not the same as their content being public. Follower-only and Close Friends stories are invisible without a login, so they stop here even though you personally can watch them.",
                },
                {
                  q: "The link worked this morning and is dead now",
                  a: "Two clocks run at once: the story's 24 hours and the signed media URL's much shorter life. Re-paste the story link for a new media URL — unless the story itself expired, in which case that chapter is closed.",
                },
                {
                  q: "Do stickers, polls and captions come along?",
                  a: <span>Whatever is baked into the picture or clip is saved with it. Interactive layers — poll taps, question boxes, link stickers — do not carry over, because only the visible media file is downloaded. Full story guidance lives on the <Link href="/instagram-story-downloader" className={TOOL_LINK}>Story downloader page</Link>.</span>,
                },
              ]} />
            </section>
          </ScrollReveal>

          {/* ── 4f. Audio problems ── */}
          <ScrollReveal>
            <section className="mt-8">
              <div className="mb-5 px-1">
                <SectionTitle>Audio problems</SectionTitle>
              </div>
              <Accordion idPrefix="help-audio" items={[
                {
                  q: "“Temporarily unavailable” when I try audio",
                  a: <span>The backend audio queue is busy, not broken. Audio has to be processed on the server while video is handed over directly, so at peak moments there is a wait. Try the same link again in a bit — or save the MP4 from the <Link href="/instagram-video-downloader" className={TOOL_LINK}>Video downloader</Link> now so you at least have the file.</span>,
                },
                {
                  q: "Audio extraction takes very long",
                  a: "Normal for long videos: the wait scales with clip length, and closing the tab abandons the attempt. Leave it open, let it finish, download the MP3 once.",
                },
                {
                  q: "The MP3 came out silent",
                  a: "Extraction copies the track — it cannot restore audio that was never there. If the source clip plays silently on Instagram, the MP3 will be silent too.",
                },
                {
                  q: "I only wanted part of the clip",
                  a: <span>The tool returns the whole track with no trimming step, by design. Take the full MP3 and cut your fragment in any free audio app afterwards. More detail on the <Link href="/instagram-audio-downloader" className={TOOL_LINK}>Audio downloader page</Link>.</span>,
                },
              ]} />
            </section>
          </ScrollReveal>

          {/* ── 5. Troubleshooting ── */}
          <ScrollReveal>
            <section className="mt-8">
              <div className="mb-5 px-1">
                <SectionTitle>{h.s5title}</SectionTitle>
              </div>
              <Accordion items={h.problems} idPrefix="help-trouble" />
            </section>
          </ScrollReveal>

          {/* ── 5b. Preview problems ── */}
          <ScrollReveal>
            <section className="mt-8">
              <div className="mb-5 px-1">
                <SectionTitle>Preview problems</SectionTitle>
              </div>
              <Accordion idPrefix="help-preview" items={[
                {
                  q: "The preview never loads — just a spinner",
                  a: "Most of the time the media URL expired before the preview could fetch it. Paste the original post link again and retry the preview. If that still spins, check you are actually online — the provider has brief hiccups like everything else.",
                },
                {
                  q: "The preview shows the wrong post",
                  a: "The link is the suspect, not the preview. Profile links, grid URLs and Explore-page links all resolve to something other than the post you meant. Open the exact post, reel or story and copy its link.",
                },
                {
                  q: "Video preview starts muted",
                  a: "Browsers often begin playback quietly — unmute in the player controls. The downloaded file is unaffected and carries the original audio track.",
                },
                {
                  q: "Preview worked a minute ago, now it errors",
                  a: "Signed URLs die fast, sometimes mid-session. Resolve the original link once more and move to download without leaving the tab sitting.",
                },
              ]} />
            </section>
          </ScrollReveal>

          {/* ── 5c. Download problems ── */}
          <ScrollReveal>
            <section className="mt-8">
              <div className="mb-5 px-1">
                <SectionTitle>Download problems</SectionTitle>
              </div>
              <Accordion idPrefix="help-download" items={[
                {
                  q: "I tap Download and nothing happens",
                  a: "Check storage first — a full phone silently swallows downloads, especially long videos. Next suspect is an expired URL: re-paste the post link and tap Download promptly after the preview appears.",
                },
                {
                  q: "The file downloads but will not open",
                  a: "That is a partial or expired transfer wearing a filename. Delete it, resolve the link again, and download in one go on a stable connection.",
                },
                {
                  q: "I cannot find the file after downloading",
                  a: "Android: check Downloads or Gallery. iPhone: open the Files app → Downloads — Safari puts files there, not in Photos. Desktop: the browser's Downloads folder, openable from the toolbar download icon.",
                },
                {
                  q: "It downloaded twice",
                  a: "A double-tap starts two saves. Harmless — delete the spare. One firm tap is all it takes.",
                },
              ]} />
            </section>
          </ScrollReveal>

          {/* ── 5d. Mobile problems ── */}
          <ScrollReveal>
            <section className="mt-8">
              <div className="mb-5 px-1">
                <SectionTitle>Mobile problems</SectionTitle>
              </div>
              <Accordion idPrefix="help-mobile" items={[
                {
                  q: "Where do files go on my phone?",
                  a: "Android drops them in Downloads, and photos and videos also surface in Gallery. iPhones keep everything in the Files app under Downloads. If an MP4 does not appear in Photos on iPhone, that is why — it was never going there.",
                },
                {
                  q: "How do I copy a link inside the Instagram app?",
                  a: "Reels and videos: Share (paper plane) → Copy link. Photo posts: the same Share button. Stories: Share from the story viewer while it is live. Then switch to your browser and paste.",
                },
                {
                  q: "Audio processing seems to die when I switch apps",
                  a: "Keep the Downloadit tab in the foreground until the MP3 is ready. Mobile browsers freeze background tabs aggressively, and a frozen tab cannot finish — or even hold — a server-side extraction.",
                },
                {
                  q: "Do I need to install an app?",
                  a: "No, and be suspicious of anything in an app store claiming to be Downloadit. The whole tool runs in your mobile browser; there is nothing to install and no account to create.",
                },
              ]} />
            </section>
          </ScrollReveal>

          {/* ── 5e. Desktop problems ── */}
          <ScrollReveal>
            <section className="mt-8">
              <div className="mb-5 px-1">
                <SectionTitle>Desktop problems</SectionTitle>
              </div>
              <Accordion idPrefix="help-desktop" items={[
                {
                  q: "How do I copy links on desktop?",
                  a: "Open the post so it has its own view, then three dots → Copy Link. For stories, the browser address bar works while the story is live. Paste the complete URL — a link chopped short fails validation with a message saying it does not look like an Instagram link.",
                },
                {
                  q: "Where do desktop downloads land?",
                  a: "Your browser's Downloads folder, every time. The toolbar's download icon jumps you straight there. MP4s open in any desktop player, photos in any viewer, MP3s in any music app.",
                },
                {
                  q: "Pasting does not seem to work",
                  a: "Copy again and make sure the full URL came along, protocol and all. Fragments copied from chat snippets or notification previews are the usual culprits — grab the link from the post itself.",
                },
                {
                  q: "Do I need a browser extension?",
                  a: "No. No extension, no desktop program, no login. If a site asks you to install something to use Downloadit, you are not on Downloadit.",
                },
              ]} />
            </section>
          </ScrollReveal>

          {/* ── 6. Privacy ── */}
          <ScrollReveal>
            <section className="mt-8 rounded-[24px] p-7 sm:p-9" style={{ background: "var(--card)", boxShadow: "var(--shadow-card)", border: "1px solid var(--border)" }}>
              <SectionTitle>{h.s6title}</SectionTitle>
              <ul className="mt-6 flex flex-col gap-3.5">
                {h.privacy.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" style={{ color: "var(--primary)" }} strokeWidth={2} />
                    <p className="text-[16px] leading-[1.65] text-fg-muted">{item}</p>
                  </li>
                ))}
              </ul>
            </section>
          </ScrollReveal>

          {/* ── 6b. Privacy questions ── */}
          <ScrollReveal>
            <section className="mt-8">
              <div className="mb-5 px-1">
                <SectionTitle>Privacy questions</SectionTitle>
              </div>
              <Accordion idPrefix="help-privacy" items={[
                {
                  q: "Do you ever need my Instagram login?",
                  a: "Never. There is no login field, no password prompt, no cookie request anywhere on this site. Public links resolve without any of that, and anything requiring a login is outside what the tool does.",
                },
                {
                  q: "What happens to a link I paste?",
                  a: "It goes to the backend for one job — resolving the public media — and is kept only transiently to complete your request before expiring automatically. The full policy is short and readable on the Privacy page.",
                },
                {
                  q: "Is there a history of my downloads?",
                  a: "No download history is kept in your browser, and nothing is tied to an identity because there are no accounts. Your files live on your device and nowhere else.",
                },
                {
                  q: "Can anyone see what I downloaded?",
                  a: "There is nothing to see: no account, no profile, no log attached to you. Someone with your unlocked phone could open your gallery, of course — that part is on you.",
                },
                {
                  q: "Why “public content only”?",
                  a: "Because access controls are never bypassed here. The rule is simple and absolute: if it takes a login to view, Downloadit cannot fetch it. Anything else would be someone else's privacy being broken.",
                },
              ]} />
            </section>
          </ScrollReveal>

          {/* ── 7. FAQ ── */}
          <ScrollReveal>
            <section className="mt-8">
              <div className="mb-5 px-1">
                <SectionTitle>{h.s7title}</SectionTitle>
              </div>
              <Accordion items={h.faq} idPrefix="help-faq" />
            </section>
          </ScrollReveal>

          {/* ── 7b. Copyright / DMCA questions ── */}
          <ScrollReveal>
            <section className="mt-8">
              <div className="mb-5 px-1">
                <SectionTitle>Copyright questions</SectionTitle>
              </div>
              <Accordion idPrefix="help-copyright" items={[
                {
                  q: "If a post is public, can I freely reuse it?",
                  a: "No — visible is not the same as yours. Only download and reuse content you own or have permission to use. “Everyone can see it” has never been a license.",
                },
                {
                  q: "What if I give credit to the creator?",
                  a: "Credit is polite, not permission. Reposting, especially commercially, needs the rights holder's agreement regardless of how nicely you attribute it.",
                },
                {
                  q: "How do I report infringing content?",
                  a: "Write to the support email on the DMCA page and include three things: what the copyrighted work is, where the material in question sits, and how to reach you. That is what a reviewable report needs — vague complaints cannot be acted on.",
                },
                {
                  q: "Is Downloadit part of Instagram?",
                  a: "No affiliation, endorsement or sponsorship — it is an independent tool that only touches publicly available content through normal links. Instagram and Meta own their platform; this site just reads what is already public.",
                },
                {
                  q: "Can I reuse music pulled out as MP3?",
                  a: "Same rule as everything else: the MP3 is for content you have rights to. Trending sounds belong to their artists and labels — saving one for personal listening and republishing it are very different acts.",
                },
              ]} />
            </section>
          </ScrollReveal>

          {/* ── 8. Email support ── */}
          <ScrollReveal>
            <section
              className="mt-8 rounded-[24px] p-8 text-center sm:p-10"
              style={{ background: "var(--card)", boxShadow: "var(--shadow-card)", border: "1px solid var(--border)" }}
            >
              <h2 className="text-[24px] font-bold text-fg sm:text-[26px]">{h.supportTitle}</h2>
              <p className="mx-auto mt-3 max-w-[420px] text-[16px] leading-[1.7] text-fg-muted">
                {h.supportDesc}
              </p>
              <a href={SUPPORT_GMAIL_URL} target="_blank" rel="noopener noreferrer" className="gradient-btn mt-6 min-h-[48px] px-8 text-[16px]">
                <Mail className="h-5 w-5" />
                {h.supportBtn}
              </a>
              <p className="mt-4 text-[14px] text-fg-muted">
                <a
                  href={SUPPORT_GMAIL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center justify-center break-all font-medium transition-colors hover:text-primary"
                >
                  {SUPPORT_EMAIL}
                </a>
              </p>
            </section>
          </ScrollReveal>
        </div>
      </main>
      <Footer />
    </>
  );
}
