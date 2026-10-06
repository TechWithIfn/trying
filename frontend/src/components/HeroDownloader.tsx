"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Download as DownloadIcon,
  Clipboard,
  Link as LinkIcon,
  AlertCircle,
  Play,
  Image as ImageIcon,
  Sparkles,
  X,
  Film,
  Video,
  Clock,
  Music,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  Volume2,
} from "lucide-react";
import dynamic from "next/dynamic";
import {
  resolveInstagramUrl,
  startResolveStream,
  getApiBase,
  logApiFailure,
  isBrowserOffline,
  storyErrorMessage,
  type ResolveData,
  type ResolveStreamHandle,
} from "@/services/api";
import { useLanguage } from "@/i18n";

// Post-resolve UI (players + result card) loads on demand: it is not part of
// the initial page bundle. SSR stays enabled so markup is identical; the
// fallback reserves matching space so no layout shift occurs while it loads.
const MediaResult = dynamic(() => import("./ResultPanel").then((m) => m.MediaResult), {
  loading: () => (
    <div className="mx-auto mt-6 w-full max-w-[720px] sm:mt-10 sm:px-5" aria-hidden="true">
      <div className="rounded-[20px] p-5 sm:p-8 animate-shimmer" style={{ minHeight: "320px" }} />
    </div>
  ),
});

type UIState = "IDLE" | "PREPARING" | "SUCCESS" | "ERROR";


export type DownloaderTab = "reels" | "videos" | "photos" | "carousel" | "stories" | "audio";

const HERO_CATEGORIES = [
  {
    id: "reels" as const,
    title: "Reels",
    subtitle: "Download Reels",
    icon: Film,
    iconBg: "rgba(236, 95, 168, 0.12)",
    iconColor: "#ec5fa8",
  },
  {
    id: "videos" as const,
    title: "Videos",
    subtitle: "Save Videos",
    icon: Video,
    iconBg: "rgba(124, 77, 245, 0.12)",
    iconColor: "#7c4df5",
  },
  {
    id: "photos" as const,
    title: "Photos",
    subtitle: "Get Photos",
    icon: ImageIcon,
    iconBg: "rgba(245, 142, 91, 0.14)",
    iconColor: "#f58e5b",
  },
  {
    id: "stories" as const,
    title: "Stories",
    subtitle: "Save Stories",
    icon: Clock,
    iconBg: "rgba(14, 165, 233, 0.12)",
    iconColor: "#0ea5e9",
  },
  {
    id: "audio" as const,
    title: "Audio",
    subtitle: "Extract Audio",
    icon: Music,
    iconBg: "rgba(16, 185, 129, 0.12)",
    iconColor: "#10b981",
  },
];

/**
 * Single auto-scroll entry point for the downloader flow. Targets the shared
 * result anchor (progress, output and error all render inside it), so one
 * helper covers every scroll. `block: "start"` pairs with the anchor's
 * `scroll-mt-20` (80px clears the 72px sticky header); centering would waste
 * half the viewport above the card. Honors reduced-motion. Never called from
 * progress callbacks — only submit and success paths below may call it.
 */
function scrollToSection(ref: { current: HTMLElement | null }) {
  const el = ref.current;
  if (!el || typeof window === "undefined") return;
  const reduceMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
}

function resolveTabFromResultType(type: string): DownloaderTab | null {
  switch (type) {
    case "REEL":
      return "reels";
    case "VIDEO":
      return "videos";
    case "CAROUSEL":
      return "carousel";
    case "POST":
    case "PHOTO":
      return "photos";
    case "STORY":
    case "STORY_PROFILE":
      return "stories";
    case "AUDIO":
      return "audio";
    default:
      return null;
  }
}

// ─── Circular progress (REAL backend stages only) ────────────
// The value shown here comes exclusively from `progress` SSE events sent
// by the backend after each resolution stage actually completes. This
// component never advances itself on a timer.
const PROGRESS_RING_ID = "downloadit-progress-ring";

function CircularProgress({ value, label }: { value: number; label: string }) {
  const { t } = useLanguage();
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const R = 52;
  const C = 2 * Math.PI * R;
  const offset = C - (C * clamped) / 100;
  return (
    <div className="animate-fade-in-up mx-auto mt-6 w-full sm:mt-10" style={{ maxWidth: "380px" }}>
      <div
        className="flex flex-col items-center rounded-[24px] px-6 py-8 text-center"
        style={{ background: "var(--card)", boxShadow: "0 20px 60px rgba(60,40,120,0.12)", border: "1px solid var(--border)" }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        aria-label={t.hero.analyzing}
      >
        <div className="relative h-[132px] w-[132px]">
          <svg width="132" height="132" viewBox="0 0 132 132" aria-hidden="true">
            <defs>
              <linearGradient id={PROGRESS_RING_ID} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7c4df5" />
                <stop offset="55%" stopColor="#ec5fa8" />
                <stop offset="100%" stopColor="#f58e5b" />
              </linearGradient>
            </defs>
            <circle cx="66" cy="66" r={R} fill="none" strokeWidth="11" style={{ stroke: "var(--border)" }} />
            <circle
              cx="66"
              cy="66"
              r={R}
              fill="none"
              stroke={`url(#${PROGRESS_RING_ID})`}
              strokeWidth="11"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={offset}
              transform="rotate(-90 66 66)"
              style={{ transition: "stroke-dashoffset 0.35s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[26px] font-extrabold tabular-nums text-fg">{clamped}%</span>
          </div>
        </div>
        <p className="mt-4 text-[14px] font-semibold text-fg">{label}</p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────

interface HeroDownloaderProps {
  activeTab: DownloaderTab | null;
  onActiveTabChange: (tab: DownloaderTab | null) => void;
  /** Heading override for tool pages. Homepage passes nothing (defaults below). */
  titleA?: string;
  titleB?: string;
  subtitle?: string;
  /**
   * Tool pages render the hero heading as a styled <p> so each page keeps a
   * single <h1>. Default "h1" preserves the homepage exactly.
   */
  titleAs?: "h1" | "p";
}

const DEFAULT_SUBTITLE =
  "Download Instagram Reels, Videos & Photos in HD — paste a public link and save public Reels, videos, photos, stories and audio to your phone or desktop with Downloadit. No login required.";

export default function HeroDownloader({
  activeTab,
  onActiveTabChange,
  titleA = "Instagram Video ",
  titleB = "Downloader",
  subtitle = DEFAULT_SUBTITLE,
  titleAs = "h1",
}: HeroDownloaderProps) {
  const { t } = useLanguage();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [state, setState] = useState<UIState>("IDLE");
  const [result, setResult] = useState<ResolveData | null>(null);
  // Default to the primary mode (Reels). The tab is ONLY ever changed by an
  // explicit user click — resolve results, validation and errors never touch it.
  // Real processing progress: updated exclusively from backend SSE stage
  // events. Never advanced by timers.
  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState("");
  const [audioExtractionRequested, setAudioExtractionRequested] = useState(false);
  const streamRef = useRef<ResolveStreamHandle | null>(null);
  const requestSeqRef = useRef(0);
  const watchdogRef = useRef<number | null>(null);
  const postAbortRef = useRef<AbortController | null>(null);
  // URL currently being resolved (null when idle): used to swallow a
  // duplicate submit of the SAME link while it is already in flight, so one
  // user action never produces two API requests. A different URL still
  // supersedes the in-flight request instead of being ignored.
  const inFlightUrlRef = useRef<string | null>(null);
  // Highest progress shown for the active request: backend fallback stages
  // can repeat a value, but progress must never visibly rewind mid-request
  // (the 75% → 35% loop). Reset only when a genuinely new extraction begins
  // in handleSubmit/handleRetry/handleClear — never on a transport fallback.
  const maxProgressRef = useRef(0);
  // The single plain-POST fallback may run at most once per submitted
  // request (only when the SSE stream drops WITHOUT a server verdict). This
  // flag — not render state — is the source of truth, so re-renders and
  // duplicate error events can never turn one user action into a retry loop.
  const fallbackTriedRef = useRef(false);

  // Request-lifecycle tracing for the Network-tab audit (one click = one
  // request). Development only: compiled out of production behaviour — the
  // guard is a NODE_ENV check around console.debug, so prod emits nothing.
  const storyFlowLog = useCallback((stage: string, extra?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== "development") return;
    console.debug(`[STORY-FLOW] ${stage}`, { seq: requestSeqRef.current, ...extra });
  }, []);

  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current !== null) {
      window.clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  }, []);

  const closeStream = useCallback(() => {
    streamRef.current?.close();
    streamRef.current = null;
  }, []);

  const invalidateRequest = useCallback(() => {
    // Supersede any in-flight stream so a late event can never paint a
    // stale result over the current request. Clearing the in-flight marker
    // here (and on every terminal settle below) is what keeps the
    // single-flight guard truthful: a ref, never stale React state.
    if (inFlightUrlRef.current !== null && process.env.NODE_ENV === "development") {
      console.debug("[STORY-FLOW] resolve-abort", {
        seq: requestSeqRef.current,
        url: inFlightUrlRef.current,
      });
    }
    requestSeqRef.current++;
    closeStream();
    clearWatchdog();
    postAbortRef.current?.abort();
    postAbortRef.current = null;
    inFlightUrlRef.current = null;
  }, [closeStream, clearWatchdog]);

  // Cleanup on unmount: supersede any in-flight stream and stop the watchdog.
  useEffect(() => {
    return () => {
      invalidateRequest();
    };
  }, [invalidateRequest]);

  // Fail an in-flight resolve fast when the browser itself drops connectivity.
  // Without this the job lingers until an SSE error event or the 60s silence
  // watchdog fires. Reconnecting never auto-starts a job: the user retries
  // explicitly with "Try again" → submit, which creates exactly one new job.
  // NOTE: Next.js dev HMR WebSocket warnings are build tooling, not
  // connectivity signals — nothing here listens to HMR sockets, and their
  // console noise must never trigger a resolve, retry, or progress reset.
  useEffect(() => {
    const onOffline = () => {
      if (inFlightUrlRef.current === null) return;
      invalidateRequest();
      setError(t.errors.unreachable);
      setState("ERROR");
    };
    window.addEventListener("offline", onOffline);
    return () => window.removeEventListener("offline", onOffline);
  }, [invalidateRequest, t]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
      setError("");
    } catch {
      /* clipboard denied */
    }
  }, []);

  const handleClear = useCallback(() => {
    invalidateRequest();
    onActiveTabChange(null);
    setUrl("");
    setError("");
    setState("IDLE");
    setResult(null);
    setAudioExtractionRequested(false);
    setProgress(0);
    setProgressStage("");
  }, [invalidateRequest, onActiveTabChange]);

  const handleRetry = useCallback(() => {
    invalidateRequest();
    onActiveTabChange(null);
    setError("");
    setState("IDLE");
    setAudioExtractionRequested(false);
    maxProgressRef.current = 0;
    fallbackTriedRef.current = false;
    setProgress(0);
    setProgressStage("");
  }, [invalidateRequest, onActiveTabChange]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      storyFlowLog("click");
      const trimmed = url.trim();
      if (!trimmed) {
        setError(t.errors.empty);
        setState("ERROR");
        return;
      }
      if (!isValidInstagramUrl(trimmed)) {
        setError(t.errors.invalid);
        setState("ERROR");
        return;
      }
      // Double-submit guard: the same link is already resolving — one user
      // action must produce exactly one API request. The ref (not React
      // state) is the source of truth, so the guard can never go stale
      // across re-renders. Comparison ignores trailing slashes because the
      // backend normalizes them: without this, the same Story pasted with
      // and without "/" would start a second request that merely coalesces
      // server-side. (A different link still supersedes the in-flight one
      // below.)
      const normalizedTrimmed = trimmed.replace(/\/+$/, "");
      if (
        inFlightUrlRef.current !== null &&
        inFlightUrlRef.current.replace(/\/+$/, "") === normalizedTrimmed
      ) {
        storyFlowLog("resolve-duplicate-suppressed", { url: trimmed });
        return;
      }
      storyFlowLog("resolve-start", { url: trimmed });
      // Offline gate: submitting or retrying with no connectivity must create
      // zero API requests instead of a doomed SSE + POST pair that only logs
      // ERR_INTERNET_DISCONNECTED. Placed after the guard (an active job is
      // left alone) and before invalidate (nothing is torn down for a submit
      // that cannot run).
      if (isBrowserOffline()) {
        setError(t.errors.unreachable);
        setState("ERROR");
        return;
      }
      // Single active request: supersede anything still in flight so rapid
      // clicks can never spawn parallel resolutions.
      invalidateRequest();
      // Audio is an output preference, not an input type selector. Preserve
      // it for Reel/Video -> MP3 while still updating the detected source tab.
      setAudioExtractionRequested(activeTab === "audio");
      const seq = ++requestSeqRef.current;
      inFlightUrlRef.current = trimmed;
      // A genuinely new extraction begins here — and only here — so progress
      // restarts exactly once per user submit.
      maxProgressRef.current = 0;
      fallbackTriedRef.current = false;
      setResult(null);
      setError("");
      setProgress(0);
      setProgressStage(t.hero.analyzing);
      setState("PREPARING");
      // Auto-scroll #1 (once per request): the request genuinely started, so
      // guide to the progress area. Validation/offline/duplicate paths return
      // before this point and never scroll. The anchor always exists, so the
      // scroll is safe even before the progress UI commits.
      if (submitScrollSeqRef.current !== seq) {
        submitScrollSeqRef.current = seq;
        scrollToSection(resultAnchorRef);
      }
      // Silence watchdog, not a total-request timer. It fires only when the backend
      // sends no SSE stage, error, or completion for this long. Resetting it on
      // every real backend event prevents a slow-but-working serverless resolve
      // from being misreported as "Could not reach the server." Sixty seconds
      // matches the backend's maximum serverless invocation budget.
      const RESOLVE_SILENCE_TIMEOUT_MS = 60_000;
      const armSilenceWatchdog = (seq: number) => {
        clearWatchdog();
        watchdogRef.current = window.setTimeout(() => {
          if (requestSeqRef.current !== seq) return;
          logApiFailure({
            requestType: "resolve-sse",
            requestUrl: `${getApiBase()}/api/resolve/stream`,
            status: null,
            error: new Error("resolve-sse-silence-timeout"),
          });
          requestSeqRef.current++;
          closeStream();
          postAbortRef.current?.abort();
          postAbortRef.current = null;
          inFlightUrlRef.current = null;
          setError(t.errors.unreachable);
          setState("ERROR");
        }, RESOLVE_SILENCE_TIMEOUT_MS);
      };
      const postController = new AbortController();
      postAbortRef.current = postController;
      armSilenceWatchdog(seq);
      storyFlowLog("resolve-request", { transport: "sse", url: trimmed });
      const handle = startResolveStream(trimmed, {
        onProgress: (p, stage) => {
          if (requestSeqRef.current !== seq) return;
          armSilenceWatchdog(seq);
          // Never restart/rewind progress mid-request: the stream may repeat
          // a value across resolver fallback stages, but only a new submit
          // (handleSubmit above) resets the bar.
          if (!Number.isFinite(p) || p < maxProgressRef.current) {
            if (stage) setProgressStage(stage);
            return;
          }
          maxProgressRef.current = p;
          setProgress(p);
          if (stage) setProgressStage(stage);
        },
        onComplete: (data) => {
          if (requestSeqRef.current !== seq) return;
          storyFlowLog("resolve-complete", { mediaType: data.type });
          clearWatchdog();
          closeStream();
          inFlightUrlRef.current = null;
          setProgress(100);
          setProgressStage("");
          const detectedTab = resolveTabFromResultType(data.type);
          if (detectedTab) onActiveTabChange(detectedTab);
          setResult(data);
          setState("SUCCESS");
        },
        onError: (err) => {
          if (requestSeqRef.current !== seq) return;
          storyFlowLog("resolve-error", { code: err.code });
          clearWatchdog();
          closeStream();
          inFlightUrlRef.current = null;
          // Per-class Story error mapping: the real backend reason is shown,
          // and an auth/rate-limit/challenge/timeout failure can never render
          // as "no active Story".
          setError(storyErrorMessage(err.code, err.message) || t.errors.failed);
          setState("ERROR");
        },
        onTransportError: () => {
          if (requestSeqRef.current !== seq) return;
          storyFlowLog("resolve-transport-error", { fallback: "single-post" });
          // Exactly ONE fallback per request: a second transport error for
          // the same submit reports the connection failure instead of
          // starting another extraction (no retry loop, ever).
          if (fallbackTriedRef.current) {
            clearWatchdog();
            closeStream();
            inFlightUrlRef.current = null;
            logApiFailure({
              requestType: "resolve-sse",
              requestUrl: `${getApiBase()}/api/resolve/stream`,
              status: null,
              error: new Error("resolve-sse-duplicate-transport-error"),
            });
            setError(t.errors.unreachable);
            setState("ERROR");
            return;
          }
          fallbackTriedRef.current = true;
          // Offline now: the POST fallback could never succeed, so skip it
          // and report the connection failure directly — one user action
          // then costs exactly one (failed) stream and zero retries.
          if (isBrowserOffline()) {
            clearWatchdog();
            closeStream();
            inFlightUrlRef.current = null;
            logApiFailure({
              requestType: "resolve-sse",
              requestUrl: `${getApiBase()}/api/resolve/stream`,
              status: null,
              error: new Error("resolve-sse-offline"),
              category: "offline",
            });
            setError(t.errors.unreachable);
            setState("ERROR");
            return;
          }
          // The event stream dropped without a server verdict — fall back to
          // one plain POST resolve (same URL coalesces server-side) instead
          // of reporting a false connection failure. Restart silence timing
          // because the fallback is a new request that can also be slow.
          // This single fallback is the only automatic retry in the resolve
          // flow; anything after it needs an explicit user retry.
          armSilenceWatchdog(seq);
          storyFlowLog("resolve-request", { transport: "post-fallback", url: trimmed });
          resolveInstagramUrl(trimmed, postController.signal)
            .then((data) => {
              if (requestSeqRef.current !== seq) return;
              clearWatchdog();
              closeStream();
              inFlightUrlRef.current = null;
              if (!data.success) {
                setError(storyErrorMessage(data.error?.code ?? "", data.error?.message) || t.errors.failed);
                setState("ERROR");
                return;
              }
              const detectedTab = resolveTabFromResultType(data.data.type);
              if (detectedTab) onActiveTabChange(detectedTab);
              setProgress(100);
              setProgressStage("");
              setResult(data.data);
              setState("SUCCESS");
            })
            .catch((err) => {
              if (requestSeqRef.current !== seq) return;
              if (err instanceof DOMException && err.name === "AbortError") return;
              clearWatchdog();
              closeStream();
              inFlightUrlRef.current = null;
              // Transport-level failure only (the backend-verdict branch
              // above keeps the server message): without a server verdict
              // the connection message is the only honest one, so a
              // disconnect can never surface as an Instagram/rate-limit
              // or resolver error. The log category (offline/network) is
              // classified inside logApiFailure.
              logApiFailure({ requestType: "resolve-post", requestUrl: `${getApiBase()}/api/resolve`, status: null, error: err });
              setError(t.errors.unreachable);
              setState("ERROR");
            });
        },
      });
      streamRef.current = handle;
    },
    [url, t, activeTab, invalidateRequest, clearWatchdog, closeStream, onActiveTabChange, storyFlowLog]
  );

  const isAudioMode = activeTab === "audio" || (audioExtractionRequested && state === "SUCCESS");

  const tabsRef = useRef<HTMLDivElement>(null);
  const resultAnchorRef = useRef<HTMLDivElement>(null);
  const prevStateRef = useRef<UIState>("IDLE");
  // Auto-scroll guards: each fires at most once per request, keyed by the
  // request sequence (which strictly increases per submit, so a new URL or
  // retry automatically re-arms both). Refs — not state — so SSE progress
  // events and re-renders can never trigger extra scrolls.
  const submitScrollSeqRef = useRef(0);
  const successScrollSeqRef = useRef(0);

  // Keep the active tab fully visible inside the horizontal scroller.
  useEffect(() => {
    const el = tabsRef.current?.querySelector<HTMLElement>("[data-active='true']");
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeTab]);

  // Auto-scroll #2 (once per successful request, all viewports): the actual
  // output just rendered, so bring the result card into view — Preview and
  // Download land under the header offset instead of below the fold. Fires on
  // the SUCCESS transition only (never on progress percentages), and never on
  // ERROR (the user is already at the progress/error area from scroll #1) or
  // reset. rAF lets the result mount first. At most two programmatic scrolls
  // per request exist, so manual scrolling is never fought.
  useEffect(() => {
    if (state === "SUCCESS" && prevStateRef.current !== "SUCCESS") {
      if (successScrollSeqRef.current !== requestSeqRef.current) {
        successScrollSeqRef.current = requestSeqRef.current;
        requestAnimationFrame(() => {
          scrollToSection(resultAnchorRef);
        });
      }
    }
    prevStateRef.current = state;
  }, [state]);

  const TitleTag = titleAs as "h1" | "p";

  return (
    <section
      id="hero"
      className="hero-section relative overflow-hidden scroll-mt-24 pt-6 sm:pt-8 lg:pt-10 pb-12 sm:pb-20 lg:pb-24"
    >
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute left-1/2 top-0 h-[420px] w-full max-w-[1000px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-primary/[0.03] blur-[160px] sm:h-[700px]" />
      </div>

      <div className="mx-auto w-full max-w-[1240px] min-w-0 px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 xl:gap-12 items-center">
          {/* Left Content Column */}
          <div className="lg:col-span-7 min-w-0 flex flex-col text-left">
            {/* Above-the-fold hero content renders immediately: no entrance
                animation or delay here — animating the LCP element (or holding
                it at opacity 0 during a delay) directly inflates LCP. */}
            <div
              className="mb-4 inline-flex max-w-full items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold tracking-wide text-fg-muted sm:mb-5 sm:gap-2 sm:px-4 sm:text-xs self-start"
              style={{ background: "var(--card)", boxShadow: "var(--shadow-card)", border: "1px solid var(--border)" }}
            >
              <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-accent" />
              <Sparkles size={14} color="var(--accent)" strokeWidth={2} className="shrink-0" />
              <span className="truncate">{t.hero.badge}</span>
            </div>

            <TitleTag className="max-w-full text-balance break-words" style={{ lineHeight: 1.12 }}>
              <span
                className="hero-title-a block text-balance break-words text-[32px] sm:text-[42px] xl:text-[48px] font-extrabold text-fg tracking-tight"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                {titleA}
              </span>
              <span
                className="hero-title-b block text-balance break-words text-[28px] sm:text-[38px] xl:text-[44px] font-semibold italic"
                style={{
                  fontFamily: "var(--font-accent)",
                  background: "var(--brand-gradient-text)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {titleB}
              </span>
            </TitleTag>

            <p className="hero-subtitle mt-4 text-[16px] sm:text-[16px] leading-[1.65] text-fg-muted max-w-xl">
              {subtitle}
            </p>

            {/* Hero Category Row — 5 types: Reels, Videos, Photos, Stories, Audio.
                Mobile order (reference layout): the search/download box must
                render directly below the description and ABOVE these cards, so
                below the lg breakpoint this block is ordered last within the
                flex column. Desktop (lg+) keeps the existing DOM order.
                No duplication: same nodes, same tablist semantics. */}
            <div className="mt-6 w-full max-lg:order-last">
              <div
                role="tablist"
                aria-label="Supported downloaders"
                className="grid grid-cols-2 sm:grid-cols-5 gap-2"
              >
                {HERO_CATEGORIES.map((cat) => {
                  const active = activeTab === cat.id;
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => onActiveTabChange(cat.id)}
                      className={`group flex flex-col items-start p-2.5 xl:p-3 rounded-xl transition-all duration-200 text-left cursor-pointer border-2 ${
                        active
                          ? "bg-primary-light border-primary/50 shadow-xs ring-2 ring-primary/15"
                          : "bg-card border-transparent hover:border-primary/30 hover:bg-primary-light/40"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1.5">
                        <span className={`text-[12px] font-bold transition-colors ${active ? "text-primary-strong" : "text-fg group-hover:text-primary"}`}>
                          {cat.title}
                        </span>
                        <span
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                          style={{ background: cat.iconBg, color: cat.iconColor }}
                        >
                          <Icon size={12} strokeWidth={2.2} />
                        </span>
                      </div>
                      <span className="text-[10px] leading-tight text-fg-subtle truncate max-w-full">
                        {cat.subtitle}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Input Bar */}
            <div className="mt-5 w-full">
              <form onSubmit={handleSubmit} className="relative min-w-0" noValidate>
                <div
                  className="url-card rounded-[20px] p-2.5 transition-shadow"
                  style={{
                    background: "var(--card)",
                    boxShadow: "var(--shadow-card), 0 0 40px rgba(124,77,245,0.06)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {/* Desktop: horizontal */}
                  <div className="hidden sm:flex sm:flex-row sm:gap-2">
                    <div className="relative min-w-0 flex-1">
                      <LinkIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-fg-subtle" />
                      <input
                        id="downloadit-url-input"
                        name="instagram-url"
                        type="text"
                        value={url}
                        onChange={(e) => {
                          setUrl(e.target.value);
                          if (error) setError("");
                        }}
                        placeholder="Paste Instagram link here..."
                        className="h-13 w-full rounded-xl border-0 bg-transparent pl-12 pr-12 text-[16px] text-fg placeholder:text-fg-subtle focus:outline-none"
                        style={{ fontFamily: "var(--font-sans)", fontWeight: 500 }}
                        aria-label={t.hero.inputLabel}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? "downloadit-url-error" : undefined}
                        autoComplete="off"
                        spellCheck={false}
                        disabled={state === "PREPARING"}
                      />
                      {url && state !== "PREPARING" && (
                        <button
                          type="button"
                          onClick={handleClear}
                          className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-primary-light hover:text-primary"
                          aria-label={t.common.clear}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handlePaste}
                      disabled={state === "PREPARING"}
                      className="flex h-13 shrink-0 items-center gap-1.5 rounded-xl border border-border px-3.5 text-xs font-semibold text-fg transition-colors hover:bg-primary-light hover:text-primary disabled:opacity-50"
                      style={{ background: "var(--bg)" }}
                      aria-label={t.common.paste}
                    >
                      <Clipboard className="h-3.5 w-3.5" />
                      {t.common.paste}
                    </button>

                    <button
                      type="submit"
                      disabled={state === "PREPARING"}
                      className="gradient-btn h-13 shrink-0 px-7 text-[16px]"
                    >
                      {state === "PREPARING" ? (
                        <>
                          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                            <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" />
                          </svg>
                          {t.common.resolving}
                        </>
                      ) : (
                        <>
                          <DownloadIcon className="h-5 w-5" />
                          <span>Download</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Mobile: stacked */}
                  <div className="flex flex-col gap-2 sm:hidden">
                    <div className="relative">
                      <LinkIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-fg-subtle" />
                      <input
                        id="downloadit-url-input-mobile"
                        name="instagram-url"
                        type="text"
                        value={url}
                        onChange={(e) => {
                          setUrl(e.target.value);
                          if (error) setError("");
                        }}
                        placeholder="Paste Instagram link here..."
                        className="h-13 w-full rounded-xl border-0 bg-transparent pl-12 pr-20 text-[16px] text-fg placeholder:text-fg-subtle focus:outline-none"
                        style={{ fontFamily: "var(--font-sans)", fontWeight: 500 }}
                        aria-label={t.hero.inputLabel}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? "downloadit-url-error" : undefined}
                        autoComplete="off"
                        spellCheck={false}
                        disabled={state === "PREPARING"}
                      />
                      {url && state !== "PREPARING" && (
                        <button
                          type="button"
                          onClick={handleClear}
                          className="absolute right-3 top-1/2 flex h-8 -translate-y-1/2 items-center gap-1 rounded-xl border border-border px-2.5 text-xs font-medium text-fg-muted"
                          style={{ background: "var(--bg)" }}
                          aria-label={t.common.clear}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="url-actions flex min-w-0 flex-col gap-2">
                      <button
                        type="button"
                        onClick={handlePaste}
                        disabled={state === "PREPARING"}
                        className="flex h-12 min-h-[48px] w-full min-w-0 items-center justify-center gap-1.5 rounded-xl border border-border px-3 text-[14px] font-semibold text-fg transition-colors hover:bg-primary-light hover:text-primary disabled:opacity-50"
                        style={{ background: "var(--bg)" }}
                        aria-label={t.common.paste}
                      >
                        <Clipboard className="h-4 w-4 shrink-0" />
                        <span className="btn-label truncate">{t.common.paste}</span>
                      </button>
                      <button
                        type="submit"
                        disabled={state === "PREPARING"}
                        className="gradient-btn h-12 min-h-[48px] w-full min-w-0 px-3 text-[16px]"
                      >
                        {state === "PREPARING" ? (
                          <>
                            <svg className="h-5 w-5 shrink-0 animate-spin" viewBox="0 0 24 24" fill="none">
                              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                              <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" />
                            </svg>
                            <span className="btn-label truncate">{t.common.resolving}</span>
                          </>
                        ) : (
                          <>
                            <DownloadIcon className="h-5 w-5 shrink-0" />
                            <span className="btn-label truncate">Download</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </form>

              {/* Trust Badges */}
              <div className="mt-3 flex flex-wrap items-center justify-start gap-x-4 gap-y-1.5 px-1 text-[12px] text-fg-subtle sm:mt-4 sm:gap-x-5 sm:text-[14px]">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
                  {t.hero.foot1}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
                  {t.hero.foot2}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
                  {t.hero.foot3}
                </span>
              </div>
            </div>
          </div>

          {/* Right Visual Column (Phone + 4 Floating Cards: Reels, Photos, Stories, Audio - NO highlights) */}
          {/* Purely decorative marketing mockup: hidden from assistive tech so
              screen readers skip the fake post, counts, and timestamps. */}
          <div className="hidden lg:flex lg:col-span-5 min-w-0 items-center justify-center relative py-6" aria-hidden="true">
            <div className="relative w-full max-w-[320px] xl:max-w-[340px] flex items-center justify-center">
              {/* Phone Mockup Frame */}
              <div
                className="relative w-[275px] xl:w-[290px] h-[510px] xl:h-[530px] rounded-[28px] p-2 shadow-2xl select-none"
                style={{
                  background: "#0b0c16",
                  border: "8px solid #1c1d2e",
                  boxShadow: "0 25px 60px -12px rgba(124, 77, 245, 0.25), 0 12px 30px rgba(0, 0, 0, 0.4)",
                }}
              >
                {/* Dynamic Island */}
                <div className="mx-auto h-4 w-20 rounded-full bg-black mb-2" />

                {/* Mock Phone Screen */}
                <div className="h-[calc(100%-24px)] rounded-[24px] bg-slate-900 overflow-hidden flex flex-col justify-between text-white p-3 border border-white/5">
                  {/* Mock IG Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <span className="text-[14px] font-bold italic tracking-wide" style={{ background: "var(--brand-gradient-text)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      Instagram
                    </span>
                    <div className="flex items-center gap-2 text-white/60">
                      <Heart size={14} />
                      <Send size={14} />
                    </div>
                  </div>

                  {/* Mock Post Account */}
                  <div className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full p-[1.5px]" style={{ background: "var(--brand-gradient)" }}>
                        <div className="h-full w-full rounded-full bg-slate-950 flex items-center justify-center text-[10px] font-bold text-accent">
                          D
                        </div>
                      </div>
                      <span className="text-[12px] font-semibold text-white">downloadit.pro</span>
                    </div>
                    <span className="text-white/60 text-[12px]">•••</span>
                  </div>

                  {/* Mock Video / Reel Area */}
                  <div className="relative aspect-[4/5] rounded-2xl overflow-hidden flex flex-col justify-between p-3" style={{ background: "linear-gradient(135deg, #4c1d95 0%, #831843 50%, #9a3412 100%)" }}>
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-medium backdrop-blur-md">
                        <Film size={10} /> Reels
                      </span>
                      <span className="rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-medium backdrop-blur-md">
                        0:45
                      </span>
                    </div>

                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-md shadow-lg border border-white/30">
                      <Play size={20} className="ml-1 text-white fill-white" />
                    </div>

                    <div className="flex items-center justify-between text-[12px] text-white">
                      <span className="truncate flex items-center gap-1">
                        <Music size={11} /> Original Audio · Viral Hits
                      </span>
                      <Volume2 size={13} />
                    </div>
                  </div>

                  {/* Mock Post Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-3 text-white text-[12px]">
                      <span className="flex items-center gap-1"><Heart size={14} className="text-accent fill-accent" /> 84.2k</span>
                      <span className="flex items-center gap-1"><MessageCircle size={14} /> 1.4k</span>
                      <Send size={14} />
                    </div>
                    <Bookmark size={14} className="text-white" />
                  </div>
                </div>
              </div>

              {/* Floating Card 1: Reels (Top-Left) */}
              <div
                className="animate-float-1 absolute -left-4 xl:-left-8 top-10 flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 backdrop-blur-xl transition-transform hover:scale-105"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  boxShadow: "0 14px 30px rgba(236, 95, 168, 0.15), var(--shadow-card)",
                }}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: "linear-gradient(135deg, #7c4df5, #ec5fa8)" }}>
                  <Film size={18} strokeWidth={2.2} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[14px] font-bold text-fg">Reels</span>
                    <span className="rounded-full px-1.5 py-0.2 text-[10px] font-bold text-fg-muted bg-pink-500/10">1080p</span>
                  </div>
                  <span className="block text-[12px] font-medium text-fg-subtle">Download Reels</span>
                </div>
              </div>

              {/* Floating Card 2: Stories (Top-Right) */}
              <div
                className="animate-float-2 absolute -right-4 xl:-right-8 top-20 flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 backdrop-blur-xl transition-transform hover:scale-105"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  boxShadow: "0 14px 30px rgba(14, 165, 233, 0.15), var(--shadow-card)",
                }}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: "linear-gradient(135deg, #0ea5e9, #38bdf8)" }}>
                  <Clock size={18} strokeWidth={2.2} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[14px] font-bold text-fg">Stories</span>
                    <span className="rounded-full px-1.5 py-0.2 text-[10px] font-bold text-fg-muted bg-sky-500/10">24h</span>
                  </div>
                  <span className="block text-[12px] font-medium text-fg-subtle">Save Stories</span>
                </div>
              </div>

              {/* Floating Card 3: Audio (Bottom-Left) */}
              <div
                className="animate-float-2 absolute -left-4 xl:-left-8 bottom-16 flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 backdrop-blur-xl transition-transform hover:scale-105"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  boxShadow: "0 14px 30px rgba(16, 185, 129, 0.15), var(--shadow-card)",
                }}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: "linear-gradient(135deg, #059669, #10b981)" }}>
                  <Music size={18} strokeWidth={2.2} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[14px] font-bold text-fg">Audio</span>
                    <span className="rounded-full px-1.5 py-0.2 text-[10px] font-bold text-fg-muted bg-emerald-500/10">MP3</span>
                  </div>
                  <span className="block text-[12px] font-medium text-fg-subtle">Extract Audio</span>
                </div>
              </div>

              {/* Floating Card 4: Photos (Bottom-Right) */}
              <div
                className="animate-float-1 absolute -right-4 xl:-right-8 bottom-8 flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 backdrop-blur-xl transition-transform hover:scale-105"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  boxShadow: "0 14px 30px rgba(245, 142, 91, 0.15), var(--shadow-card)",
                }}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: "linear-gradient(135deg, #f58e5b, #fb923c)" }}>
                  <ImageIcon size={18} strokeWidth={2.2} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[14px] font-bold text-fg">Photos</span>
                    <span className="rounded-full px-1.5 py-0.2 text-[10px] font-bold text-fg-muted bg-amber-500/10">Original</span>
                  </div>
                  <span className="block text-[12px] font-medium text-fg-subtle">Get Photos</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Result / Error Area */}
        <div ref={resultAnchorRef} aria-live="polite" aria-atomic="true" className="scroll-mt-20">
          {state === "PREPARING" && (
            <CircularProgress value={progress} label={progressStage || t.hero.analyzing} />
          )}

          {state === "SUCCESS" && result && (
            <MediaResult
              key={result.mediaId || result.sourceUrl}
              result={result}
              mode={isAudioMode ? "audio" : "video"}
              onReset={handleClear}
            />
          )}

          {state === "ERROR" && error && (
            <div className="animate-fade-in-up mx-auto mt-6 w-full max-w-[720px] sm:mt-10 sm:px-5">
              <div
                id="downloadit-url-error"
                className="rounded-[20px] p-5 text-center sm:p-8"
                style={{ border: "1px solid rgba(220,38,38,0.15)", background: "var(--danger-light)" }}
                role="alert"
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "rgba(220,38,38,0.1)" }}>
                  <AlertCircle className="h-6 w-6 text-danger" />
                </div>
                <p className="text-sm font-medium break-words text-danger">{error}</p>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-danger/20 bg-white px-5 py-2.5 text-sm font-medium text-danger transition-colors hover:bg-danger-light"
                >
                  {t.common.tryAgain}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

const RESERVED_PROFILE_SEGMENTS = new Set([
  "accounts",
  "direct",
  "explore",
  "stories",
  "story",
  "s",
  "reel",
  "reels",
  "p",
  "tv",
  "about",
  "developer",
  "embed",
]);

function isValidInstagramUsername(value: string): boolean {
  return /^[a-zA-Z0-9._]{1,30}$/.test(value);
}

function isValidInstagramUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (
      parsed.hostname !== "www.instagram.com" &&
      parsed.hostname !== "instagram.com" &&
      parsed.hostname !== "m.instagram.com"
    ) {
      return false;
    }
    const pathname = parsed.pathname;
    // Standard Reel/Post/Video/Story paths (includes() preserves existing
    // behavior; /stories/USERNAME/ profile URLs contain "/stories/").
    if (
      pathname.includes("/p/") ||
      pathname.includes("/reel/") ||
      pathname.includes("/reels/") ||
      pathname.includes("/tv/") ||
      pathname.includes("/stories/") ||
      pathname.includes("/story/")
    ) {
      return true;
    }
    // Bare profile URL (/USERNAME/) used for public Story lookup: a single
    // clean username segment that is not a reserved/system route.
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 1) {
      const candidate = segments[0];
      if (RESERVED_PROFILE_SEGMENTS.has(candidate.toLowerCase())) return false;
      return isValidInstagramUsername(candidate);
    }
    return false;
  } catch {
    return false;
  }
}
