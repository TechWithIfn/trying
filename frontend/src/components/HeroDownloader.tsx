"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Download as DownloadIcon, Clipboard, Link as LinkIcon, Sparkles } from "lucide-react";
import dynamic from "next/dynamic";
import { useLanguage } from "@/i18n";

const MediaResult = dynamic(() => import("./ResultPanel").then((m) => m.MediaResult), {
  loading: () => (
    <div className="mx-auto mt-6 w-full max-w-[720px] sm:mt-10 sm:px-5" aria-hidden="true">
      <div className="rounded-[20px] p-5 sm:p-8 animate-shimmer" style={{ minHeight: "320px" }} />
    </div>
  ),
});

type UIState = "IDLE" | "PREPARING" | "SUCCESS" | "ERROR";

export type DownloaderTab = "reels" | "videos" | "photos" | "stories" | "audio";

const HERO_CATEGORIES = [
  { id: "reels" as const, title: "Reels", icon: DownloadIcon },
  { id: "videos" as const, title: "Videos", icon: DownloadIcon },
  { id: "photos" as const, title: "Photos", icon: DownloadIcon },
  { id: "stories" as const, title: "Stories", icon: DownloadIcon },
  { id: "audio" as const, title: "Audio", icon: DownloadIcon },
];

function resolveTabFromResultType(type: string): DownloaderTab | null {
  switch (type) {
    case "REEL": return "reels";
    case "VIDEO": return "videos";
    case "POST":
    case "PHOTO":
    case "CAROUSEL": return "photos";
    case "STORY": return "stories";
    case "AUDIO": return "audio";
    default: return null;
  }
}

const PROGRESS_RING_ID = "downloadit-progress-ring";

function CircularProgress({ value, label }: { value: number; label: string }) {
  const { t } = useLanguage();
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const R = 52;
  const C = 2 * Math.PI * R;
  const offset = C - (C * clamped) / 100;
  return (
    <div className="animate-fade-in-up mx-auto mt-6 w-full sm:mt-10" style={{ maxWidth: "400px" }}>
      <div className="relative overflow-hidden rounded-[24px] p-px" style={{ background: "linear-gradient(135deg, rgba(236,95,168,0.85), rgba(124,77,245,0.85), rgba(245,142,91,0.85))", boxShadow: "0 20px 60px rgba(60,40,120,0.14)" }}>
        <div className="flex flex-col items-center rounded-[23px] px-6 py-8 text-center" style={{ background: "var(--card)" }} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={clamped} aria-label={label || t.hero.analyzing}>
          <div className="relative h-[132px] w-[132px]">
            <div aria-hidden="true" className="absolute inset-0 rounded-full" style={{ border: "2px dashed rgba(124,77,245,0.35)", animation: "spin 14s linear infinite" }} />
            <svg width="132" height="132" viewBox="0 0 132 132" aria-hidden="true" className="relative z-10">
              <defs>
                <linearGradient id={PROGRESS_RING_ID} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#7c4df5" />
                  <stop offset="55%" stopColor="#ec5fa8" />
                  <stop offset="100%" stopColor="#f58e5b" />
                </linearGradient>
              </defs>
              <circle cx="66" cy="66" r={R} fill="none" strokeWidth="11" style={{ stroke: "var(--border)" }} />
              <circle cx="66" cy="66" r={R} fill="none" stroke={`url(#${PROGRESS_RING_ID})`} strokeWidth="11" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={offset} transform="rotate(-90 66 66)" style={{ transition: "stroke-dashoffset 0.35s ease", filter: "drop-shadow(0 0 6px rgba(236,95,168,0.35))" }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[26px] font-extrabold tabular-nums leading-none text-fg">{clamped}%</span>
              <span className="mt-2 flex items-center gap-1" aria-hidden="true">
                <span className="h-1.5 w-1.5 rounded-full animate-pulse-soft" style={{ background: "#7c4df5" }} />
                <span className="h-1.5 w-1.5 rounded-full animate-pulse-soft delay-200" style={{ background: "#ec5fa8" }} />
                <span className="h-1.5 w-1.5 rounded-full animate-pulse-soft delay-400" style={{ background: "#f58e5b" }} />
              </span>
            </div>
          </div>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full px-4 py-1.5" style={{ background: "var(--primary-light)" }}>
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse-soft" />
            <p className="text-[13px] font-semibold text-primary-strong">{label}</p>
          </div>
          <div className="mt-5 h-2 w-full max-w-[260px] overflow-hidden rounded-full" style={{ background: "var(--primary-light)" }} role="presentation">
            <div className="relative h-full rounded-full" style={{ width: `${clamped}%`, background: "var(--brand-gradient)", boxShadow: "0 0 12px rgba(124,77,245,0.5)", transition: "width 0.35s ease" }}><div className="animate-progress-sheen" aria-hidden="true" /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface HeroDownloaderProps {
  activeTab: DownloaderTab | null;
  onActiveTabChange: (tab: DownloaderTab | null) => void;
  titleA?: string;
  titleB?: string;
  subtitle?: string;
  titleAs?: "h1" | "p";
  placeholder?: string;
  badge?: string;
  buttonLabel?: string;
  tabs?: DownloaderTab[];
  mediaNote?: string;
  trust?: string[];
}

const DEFAULT_SUBTITLE = "";

export default function HeroDownloader({
  activeTab,
  onActiveTabChange,
  titleA = "Download Videos & Photos Online",
  titleB = "",
  subtitle = DEFAULT_SUBTITLE,
  titleAs = "h1",
  placeholder = "Paste URL",
  badge,
  buttonLabel,
  tabs,
  mediaNote,
  trust,
}: HeroDownloaderProps) {
  const { t } = useLanguage();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [state, setState] = useState("IDLE");
  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState("");
  const [audioExtractionRequested, setAudioExtractionRequested] = useState(false);
  const streamRef = useRef(null);
  const requestSeqRef = useRef(0);
  const watchdogRef = useRef<number | null>(null);
  const postAbortRef = useRef(null);
  const inFlightUrlRef = useRef(null);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
      setError("");
    } catch {}
  }, []);

  const handleClear = useCallback(() => {
    setUrl("");
    setError("");
    setState("IDLE");
    setProgress(0);
    setProgressStage("");
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Please enter a link");
      setState("ERROR");
      return;
    }
    setState("PREPARING");
    setError("");
    setProgress(0);
    setProgressStage("analyzing");
  }, []);

  const isAudioMode = activeTab === "audio";

  const mediaCategories = tabs ? HERO_CATEGORIES.filter((cat) => tabs.includes(cat.id)) : HERO_CATEGORIES;
  const singleMedia = mediaCategories.length === 1 ? mediaCategories[0] : null;
  const trustItems = trust && trust.length > 0 ? trust : [t.hero.foot1, t.hero.foot2, t.hero.foot3];

  // Category chips
  let categoryChips = null;
  if (mediaCategories.length > 1) {
    categoryChips = (
      <div className="mt-2 w-full">
        <div role="tablist" aria-label="Supported downloaders" className="mx-auto grid w-full max-w-[700px] gap-1.5 sm:gap-2" style={{ gridTemplateColumns: `repeat(${mediaCategories.length}, minmax(0, 1fr))` }}>
          {mediaCategories.map((cat) => {
            const active = activeTab === cat.id;
            return (
              <button key={cat.id} type="button" role="tab" aria-selected={active} onClick={() => onActiveTabChange(cat.id)} className={`flex flex-col items-center gap-1 rounded-xl border px-1.5 py-1.5 transition-all duration-150 text-center cursor-pointer ${active ? "bg-primary-light border-primary/50 shadow-xs ring-2 ring-primary/15" : "border-transparent hover:border-primary/30 hover:bg-primary-light/40"}`}>
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-lg sm:h-5 sm:w-5" style={{ background: "rgba(124,77,245,0.1)", color: "#7c4df5" }}><DownloadIcon size={10} strokeWidth={2.2} /></span>
                <span className={`min-w-0 truncate text-[10px] sm:text-[11px] font-bold leading-none transition-colors ${active ? "text-primary-strong" : "text-fg group-hover:text-primary"} inline-block`}>{cat.title}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Single media note
  let singleMediaNote = null;
  if (singleMedia && mediaNote) {
    singleMediaNote = <p className="mt-1 text-[11px] leading-[1.2] text-fg-subtle mx-auto max-w-[600px]">{mediaNote}</p>;
  }

  return (
    <section id="hero" className="hero-section relative mb-12 overflow-hidden scroll-mt-24 pt-6 pb-16 sm:mb-16 sm:pt-8 sm:pb-20 lg:mb-20 lg:pt-10 lg:pb-24">
      <div className="absolute inset-0 -z-10" aria-hidden="true" />
      <div className="absolute left-1/2 top-0 h-[420px] w-full max-w-[1000px] -translate-x-1/2 -translate-y-1/3 rounded-full sm:h-[700px]" style={{ background: "radial-gradient(ellipse 60% 55% at 50% 40%, rgba(124,77,245,0.07) 0%, rgba(124,77,245,0.0) 70%)" }} />

      <div className="mx-auto w-full max-w-[1240px] min-w-0 px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="mx-auto flex w-full max-w-[840px] min-w-0 flex-col items-center text-center">
          <div className="mb-2 inline-flex max-w-full items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-semibold tracking-wide text-fg-muted sm:mb-3 sm:gap-2 sm:px-4 sm:text-xs">
            <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-accent" />
            <Sparkles size={14} color="var(--accent)" strokeWidth={2} className="shrink-0" />
            <span className="truncate">{badge || t.hero.badge}</span>
          </div>

          <h1 className="max-w-full text-balance break-words">
            <span className="hero-title-a block text-balance break-words text-[24px] sm:text-[32px] font-extrabold text-fg tracking-tight" style={{ fontFamily: "var(--font-sans)" }}>{titleA}</span>
            {titleB && <span className="hero-title-b block text-balance break-words text-[22px] sm:text-[30px] font-semibold italic" style={{ fontFamily: "var(--font-accent)", background: "var(--brand-gradient-text)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>{titleB}</span>}
          </h1>

          {subtitle && <p className="hero-subtitle mt-2 text-[14px] leading-[1.5] text-fg-muted mx-auto max-w-xl">{subtitle}</p>}

          {categoryChips}

          {singleMediaNote}

          <div className="mt-3 w-full">
            <div className="url-card rounded-[20px] p-2.5 transition-shadow" style={{ background: "var(--card)", boxShadow: "var(--shadow-card), 0 0 40px rgba(124,77,245,0.06)", border: "1px solid var(--border)" }}>
              <div className="url-input-wrapper">
                <div className="relative min-w-0 flex-1">
                  <LinkIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
                  <input id="downloadit-url-input" name="instagram-url" type="text" value={url} onChange={(e) => { setUrl(e.target.value); if (error) setError(""); }} placeholder={placeholder} className="h-11 w-full rounded-xl border-0 bg-transparent pl-10 pr-10 text-[14px] text-fg placeholder:text-fg-subtle focus:outline-none" style={{ fontFamily: "var(--font-sans)", fontWeight: 500 }} aria-label={t.hero.inputLabel} aria-invalid={error ? true : undefined} aria-describedby={error ? "downloadit-url-error" : undefined} autoComplete="off" spellCheck={false} disabled={state === "PREPARING"} />
                </div>
                <button type="button" onClick={handlePaste} disabled={state === "PREPARING"} className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-border px-2.5 text-xs font-semibold text-fg transition-colors hover:bg-primary-light hover:text-primary disabled:opacity-50" style={{ background: "var(--bg)" }} aria-label={t.common.paste}><Clipboard className="h-3 w-3" /> Paste</button>
                <button className="gradient-btn h-11 shrink-0 px-4 text-[14px]"><DownloadIcon className="h-4 w-4" /><span>{buttonLabel || "Get Media"}</span></button>
              </div>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 px-1 text-[11px] text-fg-subtle sm:mt-3 sm:gap-x-3 sm:text-[12px]">
            {trustItems.map((item) => <div key={item}>{item}</div>)}
          </div>
        </div>
      </div>
    </section>
  );
}

function isValidInstagramUsername(value: string): boolean { return /^[a-zA-Z0-9._]{1,30}$/.test(value); }

function isValidInstagramUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "www.instagram.com" && parsed.hostname !== "instagram.com" && parsed.hostname !== "m.instagram.com") return false;
    const pathname = parsed.pathname;
    if (pathname.includes("/p/") || pathname.includes("/reel/") || pathname.includes("/reels/") || pathname.includes("/tv/") || pathname.includes("/stories/") || pathname.includes("/story/")) return true;
    const pathSegments = pathname.split("/").filter(Boolean);
    if (pathSegments[0]?.toLowerCase() === "s" && pathSegments.length >= 2 && pathSegments[1]) return true;
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 1) {
      const candidate = segments[0];
      if (["accounts", "direct", "explore", "stories", "story", "s", "reel", "reels", "p", "tv", "about", "developer", "embed"].includes(candidate.toLowerCase())) return false;
      return /^[a-zA-Z0-9._]{1,30}$/.test(candidate);
    }
    return false;
  } catch { return false; }
}