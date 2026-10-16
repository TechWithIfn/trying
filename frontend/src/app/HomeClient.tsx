"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import HeroDownloader, { type DownloaderTab } from "@/components/HeroDownloader";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";
import ProseSection from "@/components/ProseSection";
import ReadMore from "@/components/ReadMore";
import { useLanguage } from "@/i18n";
import {
  Globe,
  Smartphone,
  Eye,
  LayoutGrid,
  ShieldCheck,
  Film,
  Video,
  Image as ImageIcon,
  Clock,
  Music,
  Link2,
  Search,
  Download,
} from "lucide-react";

const QUICK_ICONS = [Globe, Smartphone, Eye, LayoutGrid];

const MEDIA_ROWS = [
  { href: "/instagram-reels-downloader", label: "Reels", note: "Supported video downloads", Icon: Film },
  { href: "/instagram-video-downloader", label: "Videos", note: "Supported video posts", Icon: Video },
  { href: "/instagram-photo-downloader", label: "Photos & Carousels", note: "Single photos and multi-slide posts", Icon: ImageIcon },
  { href: "/instagram-story-downloader", label: "Stories", note: "Active public Stories", Icon: Clock },
  { href: "/instagram-audio-downloader", label: "Audio", note: "MP3 extraction", Icon: Music },
] as const;

const FORMAT_ROWS = [
  { label: "Video", value: "MP4", Icon: Video },
  { label: "Images", value: "JPG, PNG or WebP when provided", Icon: ImageIcon },
  { label: "Audio", value: "MP3", Icon: Music },
] as const;

const FLOW_STAGES = [
  { n: "01", title: "Paste link", desc: "Drop in a supported public link.", Icon: Link2 },
  { n: "02", title: "Check media", desc: "The service identifies what is available.", Icon: Search },
  { n: "03", title: "Preview", desc: "Review the file before saving.", Icon: Eye },
  { n: "04", title: "Save", desc: "Download it to your device.", Icon: Download },
] as const;

const HOME_FAQS = [
  {
    q: "Is Downloadit free to use?",
    a: "Yes. Paste a public link, preview the media and save the file — there is no account, no payment step and nothing to install. If you ever see a page asking you to pay for this tool or log in with your Instagram password, it is not us.",
  },
  {
    q: "Do I need to log in or share my Instagram password?",
    a: "Never. The tool works purely from the public link you paste, and there is no password field anywhere on the site. Anyone asking for your Instagram login in connection with downloading is running a scam — keep your credentials to yourself.",
  },
  {
    q: "Which links work, and which do not?",
    a: "Links to individual public posts work: a reel, a video post, a photo or carousel post, or a live story. Links to profiles, grids, explore pages and hashtags do not, because they point at collections rather than one piece of media. Open the single post first, then copy its link.",
  },
  {
    q: "Should I use the Reels or the Video downloader?",
    a: "For most links it does not matter — both pages run the same tool and detect the content for you. As a rule of thumb, short vertical clips belong on the Reels page and longer posts on the Video page. Each has its own guide explaining the difference in detail.",
  },
  {
    q: "Why did a story download fail?",
    a: "In most cases the story expired. Stories disappear 24 hours after posting, counted from posting rather than from when you saw them. Private, Close Friends and deleted stories fail the same way. Save stories the day you spot them.",
  },
  {
    q: "Where do my downloaded files go?",
    a: "Your browser decides. On Android that is usually Downloads or Gallery, on iPhone it is the Files app under Downloads, and on desktop it is the normal downloads folder. From there the files play offline in any standard player.",
  },
  {
    q: "Will the person who posted it know I saved it?",
    a: "Saving through this page adds no extra signal — there is no login, no comment, no reaction attached to it. Note that story views themselves are visible to the poster inside Instagram, but that is true whether or not you save the file.",
  },
  {
    q: "Can I repost what I download, or use it in ads?",
    a: "Only if you have the right to. Your own posts are fine. Anyone else's work needs their permission first — crediting them is polite but it is not permission, and music carries especially strict rights. Personal offline viewing is one thing; publishing is another.",
  },
  {
    q: "A link that worked yesterday fails today. Why?",
    a: "Instagram signs its media addresses for a short time, so a resolved file from hours ago is simply dead now. This is normal. Paste the original post link again to get a fresh address and download promptly.",
  },
  {
    q: "Is Downloadit affiliated with Instagram?",
    a: "No. It is an independent service, not affiliated with, endorsed by, or sponsored by Instagram or Meta. It only touches content that is already public to logged-out visitors.",
  },
] as const;

function IconChip({ Icon }: { Icon: typeof Film }) {
  return (
    <span
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
      style={{ background: "var(--accent-tint-purple)", border: "1px solid var(--accent-tint-purple-border)" }}
      aria-hidden="true"
    >
      <Icon size={14} color="var(--primary)" strokeWidth={2} />
    </span>
  );
}

export default function HomeClient() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<DownloaderTab | null>(null);

  useEffect(() => {
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    if (requestedTab === "reels" || requestedTab === "videos" || requestedTab === "photos" || requestedTab === "stories" || requestedTab === "audio") {
      queueMicrotask(() => setActiveTab(requestedTab));
    }
  }, []);

  const handleDownloaderTabChange = (tab: DownloaderTab | null) => {
    setActiveTab(tab);
    if (tab) {
      document.getElementById("hero")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <>
      <Header activeDownloaderTab={activeTab} onDownloaderTabChange={handleDownloaderTabChange} />
      <main id="main-content" className="flex-1">
        <HeroDownloader activeTab={activeTab} onActiveTabChange={setActiveTab} />

        {/* ── Benefit strip: 4 equal compact cards ── */}
        <ScrollReveal>
          <section className="mx-auto max-w-[1100px] px-5 sm:px-6 lg:px-12 pb-16 sm:pb-20">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
              {t.quick.items.map((f, i) => {
                const Icon = QUICK_ICONS[i];
                return (
                  <ScrollReveal key={i} delay={i * 60} className="h-full">
                    <div
                      className="lift-card flex h-full flex-col rounded-[20px] p-6 shadow-[var(--shadow-card)]"
                      style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                    >
                      <div
                        className="lift-icon mb-3 flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl"
                        style={{ background: "var(--accent-tint-purple)", border: "1px solid var(--accent-tint-purple-border)" }}
                      >
                        <Icon size={20} color="var(--primary)" strokeWidth={2} />
                      </div>
                      <p className="text-[18px] font-bold text-fg">{f.title}</p>
                      <p className="mt-1.5 text-[14px] leading-[1.5] text-fg-muted">{f.desc}</p>
                    </div>
                  </ScrollReveal>
                );
              })}
            </div>
          </section>
        </ScrollReveal>

        {/* ── Supported content (6 equal numbered cards) ── */}
        <ScrollReveal><Features /></ScrollReveal>

        {/* ── Three steps ── */}
        <ScrollReveal><HowItWorks /></ScrollReveal>

        {/* ── Supported media & formats: overview cards + detailed per-type
            and per-format notes. Deliberately NOT wrapped in ScrollReveal:
            this copy must be in the server-rendered HTML and visible without
            any client-side animation. ── */}
        <section className="px-5 py-16 sm:px-6 sm:py-20 lg:px-8" aria-labelledby="supported-media">
            <div className="mx-auto max-w-[1000px]">
              <div className="mb-10 text-center">
                <p className="mb-3 text-[14px] font-bold uppercase tracking-[0.12em] text-primary-strong">
                  Media &amp; Formats
                </p>
                <h2 id="supported-media" className="text-[30px] font-bold tracking-[-0.02em] text-fg sm:text-[44px]">
                  Supported media and formats
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 items-stretch">
                <div
                  className="rounded-[20px] bg-card p-6 shadow-[var(--shadow-card)]"
                  style={{ border: "1px solid var(--border)" }}
                >
                  <h3 className="text-[18px] font-bold text-fg">Supported media</h3>
                  <ul className="mt-4 space-y-2.5">
                    {MEDIA_ROWS.map((m) => (
                      <li key={m.label} className="flex items-center gap-3 text-[15px] leading-[1.5] text-fg-muted">
                        <IconChip Icon={m.Icon} />
                        <span>
                          <Link href={m.href} className="font-semibold text-primary-strong hover:underline">
                            {m.label}
                          </Link>
                          {" — "}
                          {m.note}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div
                  className="flex flex-col rounded-[20px] bg-card p-6 shadow-[var(--shadow-card)]"
                  style={{ border: "1px solid var(--border)" }}
                >
                  <h3 className="text-[18px] font-bold text-fg">Available formats</h3>
                  <ul className="mt-4 space-y-2.5">
                    {FORMAT_ROWS.map((f) => (
                      <li key={f.label} className="flex items-center gap-3 text-[15px] leading-[1.5] text-fg-muted">
                        <IconChip Icon={f.Icon} />
                        <span>
                          <strong className="font-semibold text-fg">{f.label}</strong>
                          {" → "}
                          {f.value}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-auto pt-5 text-[14px] leading-[1.5] text-fg-subtle">
                    Formats follow what Instagram provides — files pass through, not converted.
                  </p>
                </div>
              </div>
              <p className="mt-8 text-center text-[15px] text-fg-muted">
                Works on mobile, tablet and desktop through a modern browser.
              </p>

              <ProseSection>
              <ReadMore label="media and formats">
                  <h3>Instagram Reels</h3>
                  <p className="mt-2 text-[16px] leading-[1.7] text-fg-muted">
                    A reel saves as its video file, sound included exactly as it was
                    posted — music, voiceover, and any audio the clip carries. Reels
                    are short by nature, so each file stays small enough to send in a
                    chat or keep dozens of on a phone. Length and shape simply follow
                    whatever the creator uploaded, and on-screen text baked into the
                    clip comes along as part of the picture.{" "}
                    <Link href="/instagram-reels-downloader" className="font-semibold text-primary-strong hover:underline">Save Reels as MP4</Link>.
                  </p>
                  <h3>Instagram videos</h3>
                  <p className="mt-2 text-[16px] leading-[1.7] text-fg-muted">
                    Regular video posts — the ones that sit on someone&apos;s grid
                    rather than in the Reels viewer — save the same way, as MP4. In
                    practice the difference is only where you found the clip: short
                    vertical clips behave like reels, while longer uploads behave
                    like ordinary posts. Paste either link and you get the file
                    Instagram streams for it.{" "}
                    <Link href="/instagram-video-downloader" className="font-semibold text-primary-strong hover:underline">Save video posts as MP4</Link>.
                  </p>
                  <h3>Photos and carousels</h3>
                  <p className="mt-2 text-[16px] leading-[1.7] text-fg-muted">
                    A single photo saves as one image file, while a carousel —
                    Instagram&apos;s swipeable set of up to ten slides — saves one
                    image per slide. Each slide is kept separately so you can keep
                    only the frames you actually want instead of the whole set.
                    Resolution follows what Instagram provides for that post.{" "}
                    <Link href="/instagram-photo-downloader" className="font-semibold text-primary-strong hover:underline">Save photos and every carousel slide</Link>.
                  </p>
                  <h3>Public Stories</h3>
                  <p className="mt-2 text-[16px] leading-[1.7] text-fg-muted">
                    Only stories that are still live and visible to everyone can be
                    saved. Every story runs on a 24-hour clock that starts when it
                    is posted, not when you open it — after that Instagram removes
                    it and no link can bring it back. Private, Close Friends, and
                    deleted stories fail the same way as any other restricted
                    content. Because the window is so short, it pays to save a story
                    the same day you spot it rather than bookmarking the link for
                    later — a bookmark outlives the story it points to.{" "}
                    <Link href="/instagram-story-downloader" className="font-semibold text-primary-strong hover:underline">Save live public Stories</Link>.
                  </p>
                  <h3>Audio (MP3)</h3>
                  <p className="mt-2 text-[16px] leading-[1.7] text-fg-muted">
                    When the picture does not matter, the sound can be pulled out
                    of a supported reel or video and kept as an MP3 — handy for a
                    voiceover you want to replay or a track you recorded yourself.
                    Extraction takes a little processing time after you paste the
                    link. One caution: most music belongs to someone, so treat
                    other people&apos;s songs as listen-only unless you have
                    permission.{" "}
                    <Link href="/instagram-audio-downloader" className="font-semibold text-primary-strong hover:underline">Extract audio as MP3</Link>.
                  </p>
                  <h3>Video: MP4</h3>
                  <p className="mt-2 text-[16px] leading-[1.7] text-fg-muted">
                    MP4 is the everyday video format: it plays in phone galleries,
                    desktop players, browsers, editing apps, and most modern TVs
                    without converting anything. Your download is the MP4 Instagram
                    serves for that post, handed over unchanged — the same picture
                    and sound you previewed. That universality is also why MP4 is
                    the practical choice for sharing: the recipient needs no
                    special app, account, or conversion step to watch what you send.
                  </p>
                  <h3>Images: JPG, PNG or WebP</h3>
                  <p className="mt-2 text-[16px] leading-[1.7] text-fg-muted">
                    Photos usually arrive as JPG, the long-standard format every
                    device opens. PNG shows up for graphics with sharp lines or
                    transparent areas, and WebP is a newer, compact format
                    Instagram serves for some posts. Which one you get depends
                    entirely on what Instagram provides for that image — it is
                    never converted into something else here. In practice you will
                    meet JPG most often, since that is what phone photos become
                    once uploaded; the other two simply appear whenever Instagram
                    serves them.
                  </p>
                  <h3>Audio: MP3</h3>
                  <p className="mt-2 text-[16px] leading-[1.7] text-fg-muted">
                    MP3 is small, universal, and plays practically everywhere —
                    music apps, messaging apps, car stereos, laptops. It suits
                    spoken clips especially well, since voice stays clear at tiny
                    file sizes. The MP3 you receive is extracted from the
                    video&apos;s own sound, so it mirrors whatever the clip
                    actually sounds like. A crisp recording gives a crisp MP3;
                    a muffled original stays muffled, because extraction copies
                    the sound rather than rebuilding it.
                  </p>
                  <h3>Why files are not converted</h3>
                  <p className="mt-2 text-[16px] leading-[1.7] text-fg-muted">
                    Every file passes through exactly as Instagram provides it.
                    Converting would only mean a second round of compression on
                    top of Instagram&apos;s own — smaller in theory, visibly worse
                    in practice. So the available quality always depends on the
                    original post: a sharp upload saves sharp, and nothing here
                    can improve a blurry source.
                  </p>
                <h3>Where your files go and what to know</h3>
                  <p className="mt-2 text-[16px] leading-[1.7] text-fg-muted">
                    On Android, saved files land in Downloads or Gallery; on
                    iPhone, Safari puts them in the Files app under Downloads;
                    on desktop, they go to your browser&apos;s Downloads folder,
                    from where you can move, rename, or back them up like any
                    other files.
                    If a format or quality option you expected is missing, it is
                    because Instagram did not provide it for that particular post —
                    there is nothing more to unlock on our side. And as everywhere
                    on this site: only download content you own or have permission
                    to reuse — see the{" "}
                    <Link href="/dmca" className="font-semibold text-primary-strong hover:underline">DMCA and copyright page</Link>{" "}
                    and the{" "}
                    <Link href="/disclaimer" className="font-semibold text-primary-strong hover:underline">Disclaimer</Link>{" "}
                    for the ground rules.
                  </p>
                </ReadMore>
              </ProseSection>
            </div>
          </section>

        {/* ── How Downloadit works: compact horizontal flow ── */}
        <ScrollReveal>
          <section className="px-5 py-16 sm:px-6 sm:py-20 lg:px-8" aria-labelledby="how-downloadit-works">
            <div className="mx-auto max-w-[1000px]">
              <div className="mb-10 text-center">
                <p className="mb-3 text-[14px] font-bold uppercase tracking-[0.12em] text-primary-strong">
                  Overview
                </p>
                <h2 id="how-downloadit-works" className="text-[30px] font-bold tracking-[-0.02em] text-fg sm:text-[44px]">
                  How Downloadit works
                </h2>
                <p className="mx-auto mt-4 max-w-[560px] text-[16px] leading-[1.7] text-fg-muted">
                  Downloadit accepts supported public Instagram links. When you paste
                  a link, the service checks the available media and prepares a
                  preview. You can then choose the available file and save it to
                  your device.
                </p>
              </div>
              <div
                className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-stretch"
                aria-label="Process: paste link, check media, preview, save"
              >
                {FLOW_STAGES.map((stage, i) => {
                  const Icon = stage.Icon;
                  return (
                    <div key={stage.n} className="flex flex-1 flex-col sm:flex-row sm:items-stretch">
                      <ScrollReveal delay={i * 100} className="flex flex-1 flex-col">
                        <div
                          className="flex flex-1 items-center gap-3 rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]"
                          style={{ border: "1px solid var(--border)" }}
                        >
                          <span
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                            style={{ background: "var(--accent-tint-purple)", border: "1px solid var(--accent-tint-purple-border)" }}
                            aria-hidden="true"
                          >
                            <Icon size={18} color="var(--primary)" strokeWidth={2} />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[12px] font-bold tracking-[0.1em] text-primary-strong">
                              {stage.n}
                            </span>
                            <span className="block text-[16px] font-bold text-fg">{stage.title}</span>
                            <span className="block text-[14px] leading-[1.5] text-fg-muted">{stage.desc}</span>
                          </span>
                        </div>
                      </ScrollReveal>
                      {i < FLOW_STAGES.length - 1 && (
                        <div className="hidden items-center justify-center px-1 sm:flex" aria-hidden="true">
                          <span className="text-[18px] font-bold text-fg-subtle">→</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* ── Privacy + limitations: three equal cards. No ScrollReveal wrappers
            here on purpose: each card used to sit in its own reveal wrapper with
            a different stagger delay, so the fade/translate animations never
            settled at the same position and the right card sat a few pixels
            higher. Plain grid items align exactly. ── */}
        <section className="px-5 py-16 sm:px-6 sm:py-20 lg:px-8" aria-labelledby="trust-limits">
          <div className="mx-auto max-w-[1000px]">
            <div className="mb-10 text-center">
              <p className="mb-3 text-[14px] font-bold uppercase tracking-[0.12em] text-primary-strong">
                Trust &amp; Limits
              </p>
              <h2 id="trust-limits" className="text-[30px] font-bold tracking-[-0.02em] text-fg sm:text-[44px]">
                Privacy and limitations
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3 items-stretch">
              {[
                { title: "Privacy", desc: "Downloadit never asks for your Instagram password and you never need to log in to Instagram. You only paste a public link." },
                { title: "Public content only", desc: "Downloadit does not bypass Instagram privacy controls. Private, deleted or expired content cannot be downloaded." },
                { title: "Your responsibility", desc: "Only save content you own or have permission to reuse. Downloadit is independent and not affiliated with Instagram or Meta." },
              ].map((c) => (
                <div
                  key={c.title}
                  className="lift-card flex h-full flex-col rounded-[20px] bg-card p-7 shadow-[var(--shadow-card)]"
                  style={{ border: "1px solid var(--border)" }}
                >
                  <div
                    className="lift-icon mb-3 flex h-[42px] w-[42px] items-center justify-center rounded-xl"
                    style={{ background: "var(--accent-tint-purple)", border: "1px solid var(--accent-tint-purple-border)" }}
                  >
                    <ShieldCheck size={20} color="var(--primary)" strokeWidth={2} />
                  </div>
                  <h3 className="text-[18px] font-bold text-fg">{c.title}</h3>
                  <p className="mt-1.5 text-[16px] leading-[1.6] text-fg-muted">{c.desc}</p>
                </div>
              ))}
            </div>
            <ProseSection className="mx-auto mt-12 max-w-[720px]">
              <h3>Why some links do not work</h3>
              <p>
                Most failures come down to five causes: the post is private or on a
                private account, it was deleted, a Story passed its 24 hours, the
                link is incomplete or was copied wrongly, or Instagram is briefly
                limiting access. Private posts fail because they need a login to
                view, deleted posts fail because the file no longer exists, and
                expired links fail because Instagram signs media addresses for a
                short time only. Age-restricted or region-limited posts can fail
                too, since they also demand something before showing the content.
                What usually helps: copy the full share link again
                straight from Instagram, open it in a private or incognito browser
                window to confirm anyone can see it, then paste it here again.
              </p>
              <h3>What we ask from you and what we do not</h3>
              <p>
                We never ask for an Instagram password, login, or two-factor code —
                there is no account here to sign into, so there is nothing that
                could ask for one. If any page ever asks you to sign in to Instagram
                to use Downloadit, close it: that request did not come from us.
                How your pasted links are handled is explained on
                the <Link href="/privacy" className="font-semibold text-primary-strong hover:underline">Privacy Policy page</Link>.
              </p>
              <h3>Using downloaded content fairly</h3>
              <p>
                Download only your own content or content you have permission for,
                and give credit when you reuse someone else&apos;s work. Crediting
                is polite but it is not permission — reposting, remixing, or running
                clips in ads needs the creator&apos;s agreement first. For removal
                or copyright requests, use the{" "}
                <Link href="/dmca" className="font-semibold text-primary-strong hover:underline">DMCA and copyright page</Link>.
                The ground rules are also set out in the{" "}
                <Link href="/disclaimer" className="font-semibold text-primary-strong hover:underline">Disclaimer</Link>,
                and step-by-step help lives on the{" "}
                <Link href="/help" className="font-semibold text-primary-strong hover:underline">Help page</Link>.
              </p>
            </ProseSection>
          </div>
        </section>

        {/* ── Why Downloadit: full editorial section. Deliberately NOT wrapped
            in ScrollReveal: this copy must be in the server-rendered HTML and
            visible without any client-side animation. ── */}
        <section className="px-5 py-16 sm:px-6 sm:py-20 lg:px-8" aria-labelledby="why-downloadit">
          <div className="mx-auto max-w-[1000px]">
            <p className="mb-3 text-[14px] font-bold uppercase tracking-[0.12em] text-primary-strong">
              Why Downloadit?
            </p>
            <h2 id="why-downloadit" className="text-[30px] font-bold tracking-[-0.02em] text-fg sm:text-[44px]">
              Why Downloadit?
            </h2>
            <p className="mt-4 max-w-[68ch] text-[16px] leading-[1.7] text-fg-muted sm:text-[18px]">
              You find a reel you want to keep, a photo worth saving, or a story that
              disappears tomorrow — and Instagram gives you no button for any of it.
              Screenshots turn soft, screen recordings look rough, and links sent to
              friends demand a login. Downloadit exists for that exact gap: paste the
              link to a public post, check what is inside, and keep the original file
              on your own device. It takes less than a minute to learn, and the
              same four steps work for every supported format — whether that is
              your first saved reel or your hundredth archived story.
            </p>
            <ProseSection>
            <ReadMore label="why Downloadit">
            <h3>A simple, no-login process</h3>
            <p>
              There is no account to create and no password to hand over — ever.
              That matters because your Instagram login is the key to your whole
              account, and no download tool should ever ask for it. Here you copy
              the post&apos;s link, paste it into the box, let the service read
              what the public post contains, and save the file. Four steps, all
              visible, nothing happening behind your back. If a link ever asks
              you to sign in somewhere to make it work, stop — that request did
              not come from this tool, and legitimate public links never need it.
            </p>
            <h3>Preview before you save</h3>
            <p>
              Guessing is what fills phones with wrong files. Before anything is
              saved, you see the actual photo, clip, or track the link points to —
              not a thumbnail, the real thing. If it is not the post you meant,
              you simply paste a different link. What you preview is exactly
              what lands in your downloads. This also protects you from the
              most common mix-up: similar-looking posts from repost accounts.
              A two-second glance at the preview confirms the account name,
              the cover frame and the length before you commit any storage
              space to it.
            </p>
            <h3>One place for different media types</h3>
            <p>
              Instagram posts come in several shapes, and each has a page that
              explains it properly:
            </p>
            <ul>
              <li><Link href="/instagram-reels-downloader" className="font-semibold text-primary-strong hover:underline">Reels downloader</Link> — short vertical clips saved as MP4.</li>
              <li><Link href="/instagram-video-downloader" className="font-semibold text-primary-strong hover:underline">Video downloader</Link> — longer posts and grid videos as MP4.</li>
              <li><Link href="/instagram-photo-downloader" className="font-semibold text-primary-strong hover:underline">Photo and carousel downloader</Link> — stills kept in JPG, PNG or WebP.</li>
              <li><Link href="/instagram-story-downloader" className="font-semibold text-primary-strong hover:underline">Story downloader</Link> — public stories while they are still live.</li>
              <li><Link href="/instagram-audio-downloader" className="font-semibold text-primary-strong hover:underline">Audio downloader</Link> — sound pulled from a clip as MP3.</li>
            </ul>
            <p>
              You rarely need to choose up front: paste any supported link and
              the tool detects which kind of media it points to. The separate
              pages exist so each format gets a proper explanation — how long
              stories stay available, why carousels save slide by slide, and
              what to expect from audio extraction. Files keep the format
              Instagram serves — video as MP4, photos as JPG, PNG or WebP,
              sound as MP3 — passed through untouched, never converted or
              stamped with a watermark.
            </p>
            <h3>Works in your browser, on any device</h3>
            <p>
              There is nothing to install — no app, no browser extension, no
              updates. It runs in any modern browser on Android phones and
              tablets, iPhones and iPads, and desktop computers. Saved files
              go where your device normally puts downloads: Downloads or
              Gallery on Android, the Files app under Downloads on iPhone,
              and the downloads folder on desktop. Saved files then play
              offline in whatever player you already use — no special app
              needed on that side either. And because nothing is installed,
              there is nothing to update, no permissions to grant, and no
              background process draining your battery. It also means the tool
              works the same on a borrowed laptop or a brand-new phone —
              open the browser, paste the link, done. No setup follows you
              around because there is no setup at all.
            </p>
            <h3>Privacy and honest limits</h3>
            <p>
              Only posts that are already public can be saved — the check is
              done the way a logged-out stranger would see the link. Private
              accounts, follower-only posts, deleted content and expired
              links fail openly instead of pretending to work, and stories
              stop resolving 24 hours after posting. Your Instagram password
              is never asked for, because the service                   never logs in as you. The same rule covers every format on this
              page — reels, videos, photos, stories and audio are all held
              to the identical public-only standard, with no exceptions tucked
              into the fine print.
              When something cannot be fetched, you get a plain explanation —
              private, deleted, expired — instead of a broken file or a
              spinner that never ends. That honesty is deliberate: a clear
              no saves you far more time than a hopeful maybe.
            </p>
            <h3>Who uses Downloadit</h3>
            <ul>
              <li>Creators keeping backup copies of their own Reels, so a lost phone or locked account never costs them finished work.</li>
              <li>Social media managers archiving posts and stories they produced or have written permission to reuse.</li>
              <li>Students saving diagrams, explainers and reference clips they are allowed to keep for offline study.</li>
              <li>Anyone holding onto their own older posts at full quality instead of reposting faded screenshots.</li>
            </ul>
            <p>
              Notice what these have in common: everyone is either handling
              their own work or material they have permission to keep. That
              is the audience this tool is built for, and the usage pattern
              everything else on this page assumes.
            </p>
            <h3>Download responsibly</h3>
            <p>
              Keep your own posts freely. Anything made by someone else needs
              that person&apos;s permission before you repost, remix or run it
              in ads — crediting them is polite, but it is not permission.
              If you hold rights to something and have a concern, the{" "}
              <Link href="/dmca" className="font-semibold text-primary-strong hover:underline">DMCA and copyright page</Link>{" "}
              explains how to ask for a review, and the{" "}
              <Link href="/disclaimer" className="font-semibold text-primary-strong hover:underline">Disclaimer</Link>{" "}
              sets out the ground rules.
            </p>
            </ReadMore>
            </ProseSection>
            <p className="mt-10 max-w-[68ch] text-[16px] leading-[1.7] text-fg-muted">
              That is the whole idea: your link, your preview, your file — nothing
              else. No accounts, no installs, no passwords, no surprises. If you want the backstory on who runs this service, read{" "}
              <Link href="/about" className="font-semibold text-primary-strong hover:underline">About Downloadit</Link>,
              and if a step ever confuses you, the{" "}
              <Link href="/help" className="font-semibold text-primary-strong hover:underline">Help page</Link>{" "}
              walks through it.
            </p>
            <a
              href="#hero"
              className="gradient-btn mt-6 inline-flex min-h-[48px] items-center justify-center px-8 text-[16px]"
            >
              Start downloading
              <span aria-hidden="true">↑</span>
            </a>
          </div>
        </section>

        {/* ── Guide: what the tool does, who it is for, how it works ── */}
        <section className="px-5 py-16 sm:px-6 sm:py-20 lg:px-8" aria-labelledby="downloadit-guide">
            <div className="mx-auto max-w-[900px]">
              <p className="mb-3 text-[14px] font-bold uppercase tracking-[0.12em] text-primary-strong">
                Guide
              </p>
              <h2 id="downloadit-guide" className="text-[30px] font-bold tracking-[-0.02em] text-fg sm:text-[44px]">
                Saving public Instagram media, explained properly
              </h2>
              <p className="mt-4 text-[18px] leading-[1.7] text-fg-muted">
                Instagram is built for scrolling, not for keeping. There is no save button on reels, no
                download option on photos, and stories delete themselves within a day. Downloadit closes
                that one gap: you give it the link to a public post, and it hands back the underlying file
                so you can keep it on your own device. Nothing more, nothing less.
              </p>

              <ProseSection>
              <ReadMore label="Instagram saving guide">
              <h3 className="mt-12 text-[24px] font-bold text-fg">What the tool actually does</h3>
              <p className="mt-3 text-[16px] leading-[1.7] text-fg-muted">
                Every post on Instagram is a file sitting on a server — a video file, an image file, or a
                sound track wrapped inside a video. When you paste a link into the box at the top of this
                page, the service opens that public post the way any logged-out visitor could, finds the
                file behind it, and shows you a preview. If the preview is what you wanted, one more tap
                saves it to your phone, tablet or computer. Reels and videos arrive as MP4, photos arrive
                as JPG, PNG or WebP, and sound pulled out of a clip arrives as MP3.
              </p>
              <p className="mt-3 text-[16px] leading-[1.7] text-fg-muted">
                What it does not do matters just as much. It cannot open private accounts, Close Friends
                posts, or anything that needs a login to view. It cannot recover deleted posts or expired
                stories. And it never asks for your Instagram password, because it never logs in as you —
                it only sees what a stranger with no account could already see.
              </p>

              <h3 className="mt-12 text-[24px] font-bold text-fg">Who uses it, and why</h3>
              <p className="mt-3 text-[16px] leading-[1.7] text-fg-muted">
                Creators keep copies of their own work. If you publish from a public account, holding the
                MP4 or the full-resolution photo on your own drive means a lost draft, a locked account or
                an app glitch never takes the finished piece with it. Small shops reuse their own product
                clips and photos this way instead of filming everything twice.
              </p>
              <p className="mt-3 text-[16px] leading-[1.7] text-fg-muted">
                Students and hobbyists treat it as a study aid. A language tip to replay on the bus, a
                diagram to zoom into the night before an exam, a repair walkthrough to pause halfway
                through — saved files work without signal and cost no data to rewatch. Marketers and
                researchers keep material they have permission to study, reviewing structure and pacing
                frame by frame rather than scrolling past. And plenty of people simply want to send a
                funny clip to someone who barely opens Instagram, or keep a memory that would otherwise
                vanish with a story&apos;s 24-hour clock.
              </p>

              <h3 className="mt-12 text-[24px] font-bold text-fg">How it works, in plain words</h3>
              <p className="mt-3 text-[16px] leading-[1.7] text-fg-muted">
                There are four steps and no hidden ones. You copy the link from Instagram&apos;s Share menu,
                paste it here, and press Get Media. The server then resolves the link: it loads the public
                post, checks which files Instagram serves for it, and confirms the post is genuinely
                public. You see a preview of the real file — not a thumbnail, the file itself — and tap
                Download to save it through your browser.
              </p>
              <p className="mt-3 text-[16px] leading-[1.7] text-fg-muted">
                Two technical details are worth knowing because they explain most failures. First,
                Instagram signs its media addresses for a short time, so a file resolved an hour ago may
                already be dead — pasting the post link again mints a fresh one. Second, audio extraction
                is real processing work on the server rather than a straight handoff, which is why the
                Audio tab can take longer and occasionally shows a queue notice at busy moments.
              </p>

              <h3 className="mt-12 text-[24px] font-bold text-fg">Formats you will get</h3>
              <p className="mt-3 text-[16px] leading-[1.7] text-fg-muted">
                Video of every kind — reels, grid videos, story clips — saves as MP4, the format every
                phone gallery, desktop player and editing app opens without fuss. Quality is whatever
                Instagram streams for that post: the original file, passed through rather than
                re-compressed, with no watermark stamped on. Photos save as JPG in most cases, sometimes
                PNG or WebP, each carousel slide as its own full-resolution file. Extracted sound saves
                as a single full-length MP3 that mirrors the source clip — a crisp recording gives a crisp
                MP3, and no processing step can rescue audio that was muffled to begin with.
              </p>

              <h3 className="mt-12 text-[24px] font-bold text-fg">Privacy: what happens to your link</h3>
              <p className="mt-3 text-[16px] leading-[1.7] text-fg-muted">
                Short version: your link is used for your request and then it is gone. There are no
                accounts, so there is no watch history tied to you, no list of what you saved, and nothing
                to leak in a breach because nothing about your downloads is kept. The service never sees
                your Instagram login — it could not, since it never asks for one — and the poster is not
                notified when their public file is saved through this page. Files live on your device and
                nowhere else.
              </p>

              <h3 className="mt-12 text-[24px] font-bold text-fg">Limitations, stated plainly</h3>
              <p className="mt-3 text-[16px] leading-[1.7] text-fg-muted">
                Anything that needs a login stays out of reach: private accounts, follower-only posts,
                Close Friends stories. Deleted posts and expired stories are gone from Instagram&apos;s side
                too, so no link-based tool can bring them back. Profile pictures are not supported, and
                interactive story extras — polls, quizzes, link stickers — do not carry over, because only
                the underlying media file is saved. If a download fails, the cause is almost always one of
                these, or an expired media address that a fresh paste fixes. Honest errors instead of
                broken files is a deliberate choice.
              </p>

              <h3 className="mt-12 text-[24px] font-bold text-fg">Use it responsibly</h3>
              <p className="mt-3 text-[16px] leading-[1.7] text-fg-muted">
                A file being technically downloadable does not make it yours. Keep your own posts freely.
                For anyone else&apos;s work, personal offline viewing is one thing and publishing is another:
                get the creator&apos;s permission before reposting, remixing, or running their photo, video
                or sound in your own feed, channel or ads. Crediting helps but it is not permission, and
                music carries the strictest rights of all. If you hold rights to something and have a
                concern, the <Link href="/dmca" className="font-bold text-primary-strong hover:underline">DMCA / Copyright page</Link> and{" "}
                <Link href="/terms" className="font-bold text-primary-strong hover:underline">Terms of Service</Link> explain
                how to ask for a review — and the{" "}
                <Link href="/disclaimer" className="font-bold text-primary-strong hover:underline">Disclaimer</Link> sets
                  out the ground rules. Music deserves extra care: songs and voice
                  tracks carry the strictest rights of all, so treat any audio
                  you did not create yourself as off-limits for reposting unless
                  the owner has said yes in writing.
                </p>

              <h3 className="mt-12 text-[24px] font-bold text-fg">Who runs Downloadit?</h3>
              <p className="mt-3 text-[16px] leading-[1.7] text-fg-muted">
                One person — no team, no company, no investors. I built and maintain
                this tool in my own time, and I read every support email myself.{" "}
                <Link href="/about" className="font-bold text-primary-strong hover:underline">More about me and how the tool works</Link>.
              </p>

              <h3 className="mt-12 text-[24px] font-bold text-fg">Which downloader should you use?</h3>
              <p className="mt-3 text-[16px] leading-[1.7] text-fg-muted">
                The box at the top of this page handles every link, and each tab simply starts you in the
                right place — paste anything public and the content type is detected for you. The separate
                pages below exist for the moments when you want guidance specific to one format:
              </p>
              </ReadMore>
              </ProseSection>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  { href: "/instagram-reels-downloader", label: "Reels downloader", desc: "Short vertical clips you want to rewatch or share — pick this for anything under a couple of minutes." },
                  { href: "/instagram-video-downloader", label: "Video downloader", desc: "Longer posts to study or archive — talks, interviews, tutorials and full-length clips." },
                  { href: "/instagram-photo-downloader", label: "Photo & carousel downloader", desc: "Stills at full resolution — flip through every slide and save each frame individually." },
                  { href: "/instagram-story-downloader", label: "Story downloader", desc: "Anything with a 24-hour deadline — save it the day you spot it, before it expires." },
                  { href: "/instagram-audio-downloader", label: "Audio downloader", desc: "When the picture is beside the point — pull the full sound track out as an MP3." },
                ].map((l) => (
                  <Link key={l.href} href={l.href} className="rounded-2xl p-4 hover:bg-primary-light transition-colors" style={{ border: "1px solid var(--border)", background: "var(--card)" }}>
                    <span className="text-[14px] font-semibold text-primary-strong">{l.label}</span>
                    <span className="mt-1 block text-[14px] leading-[1.6] text-fg-muted">{l.desc}</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>

        {/* ── Detailed FAQ ── */}
        <section className="cv-auto px-5 py-16 sm:px-6 sm:py-20 lg:px-8" aria-labelledby="faq">
            <div className="mx-auto max-w-[900px]">
              <p className="mb-3 text-[14px] font-bold uppercase tracking-[0.12em] text-primary-strong">
                Support
              </p>
              <h2 id="faq" className="text-[30px] font-bold tracking-[-0.02em] text-fg sm:text-[44px]">
                Frequently asked questions
              </h2>
              <p className="mx-auto mt-4 max-w-[640px] text-[16px] leading-[1.7] text-fg-muted">
                Longer answers to what visitors actually ask — including the cases where the honest
                answer is no.
              </p>
              <ProseSection>
              <div className="mt-8">
                {HOME_FAQS.map((item) => (
                  <div key={item.q}>
                    <h3>{item.q}</h3>
                    <p>{item.a}</p>
                  </div>
                ))}
              </div>
              </ProseSection>
              <p className="mt-8 text-[14px] text-fg-muted">
                Still stuck? The <Link href="/help" className="font-semibold text-primary-strong hover:underline">Help page</Link> walks
                through troubleshooting step by step, or write to us via the{" "}
                <Link href="/contact" className="font-semibold text-primary-strong hover:underline">Contact page</Link>.
              </p>
            </div>
          </section>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: HOME_FAQS.map((item) => ({
                "@type": "Question",
                name: item.q,
                acceptedAnswer: { "@type": "Answer", text: item.a },
              })),
            }),
          }}
        />

        {/* ── Disclosure: subtle, separated ── */}
        <ScrollReveal>
          <section className="px-5 pb-4 sm:px-6 lg:px-8" aria-label="Independence disclosure">
            <p className="mx-auto max-w-[720px] text-center text-[13px] leading-[1.7] text-fg-subtle">
              Downloadit is an independent service and is not affiliated with,
              endorsed by, or sponsored by Instagram or Meta.{" "}
              <Link href="/about" className="font-semibold text-primary-strong hover:underline">
                Learn more about Downloadit
              </Link>
              .
            </p>
          </section>
        </ScrollReveal>

        {/* ── Final CTA ── */}
        <ScrollReveal>
          <section className="px-5 py-16 sm:px-6 sm:py-20 lg:px-8" aria-labelledby="final-cta">
            <div
              className="mx-auto max-w-[720px] rounded-[24px] px-6 py-10 text-center sm:px-10"
              style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}
            >
              <h2 id="final-cta" className="text-[30px] font-bold tracking-[-0.02em] text-fg sm:text-[44px]">
                Ready to save a public Instagram post?
              </h2>
              <p className="mx-auto mt-4 max-w-[480px] text-[18px] leading-[1.7] text-fg-muted">
                Paste a supported Instagram link into Downloadit and check the available media.
              </p>
              <a
                href="#hero"
                className="gradient-btn mt-6 inline-flex min-h-[48px] items-center justify-center px-8 text-[16px]"
              >
                Start downloading
                <span aria-hidden="true">↑</span>
              </a>
            </div>
          </section>
        </ScrollReveal>
      </main>
      <Footer />
    </>
  );
}
