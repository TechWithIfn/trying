"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Download as DownloadIcon,
  Clipboard,
  Link as LinkIcon,
  AlertCircle,
  Image as ImageIcon,
  Sparkles,
  X,
  Film,
  Video,
  Clock,
  Music,
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


/**
 * Media mode ids accepted by the hero. "carousel" was deliberately removed:
 * carousels resolve to "photos", the tab that has always represented
 * photo/carousel posts, so the active state can never disappear.
 */
export type DownloaderTab = "reels" | "videos" | "photos" | "stories" | "audio";

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
    subtitle: "Photos & Carousels",
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

import { useAutoScrollFlow, type FlowStatus } from "@/hooks/useAutoScrollFlow";

function resolveTabFromResultType(type: string): DownloaderTab | null {
  switch (type) {
    case "REEL":
      return "reels";
    case "VIDEO":
      return "videos";
    case "POST":
    case "PHOTO":
    case "CAROUSEL":
      // Carousels and single photos share ONE tab id ("photos"). Returning a
      // separate "carousel" id here used to deselect every tab after a
      // carousel resolved, because no category is registered under it.
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
    <div className="animate-fade-in-up mx-auto mt-6 w-full sm:mt-10" style={{ maxWidth: "400px" }}>
      <div
        className="relative overflow-hidden rounded-[24px] p-px"
        style={{
          background:
            "linear-gradient(135deg, rgba(236,95,168,0.85), rgba(124,77,245,0.85), rgba(245,142,91,0.85))",
          boxShadow: "0 20px 60px rgba(60,40,120,0.14)",
        }}
      >
        <div
          className="flex flex-col items-center rounded-[23px] px-6 py-8 text-center"
          style={{ background: "var(--card)" }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={clamped}
          aria-label={label || t.hero.analyzing}
        >
          <div className="relative h-[132px] w-[132px]">
            <div
              aria-hidden="true"
              className="absolute inset-0 rounded-full"
              style={{ border: "2px dashed rgba(124,77,245,0.35)", animation: "spin 14s linear infinite" }}
            />
            <svg width="132" height="132" viewBox="0 0 132 132" aria-hidden="true" className="relative z-10">
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
                style={{
                  transition: "stroke-dashoffset 0.35s ease",
                  filter: "drop-shadow(0 0 6px rgba(236,95,168,0.35))",
                }}
              />
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

          <div
            className="mt-5 inline-flex items-center gap-2 rounded-full px-4 py-1.5"
            style={{ background: "var(--primary-light)" }}
          >
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse-soft" />
            <p className="text-[13px] font-semibold text-primary-strong">{label}</p>
          </div>

          <div
            className="mt-5 h-2 w-full max-w-[260px] overflow-hidden rounded-full"
            style={{ background: "var(--primary-light)" }}
            role="presentation"
          >
            <div
              className="relative h-full rounded-full"
              style={{
                width: `${clamped}%`,
                background: "var(--brand-gradient)",
                boxShadow: "0 0 12px rgba(124,77,245,0.5)",
                transition: "width 0.35s ease",
              }}
            >
              <div className="animate-progress-sheen" aria-hidden="true" />
            </div>
          </div>
        </div>
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
   * Tag used for the hero heading. Default "h1" — every tool route keeps its
   * single, page-specific H1 at the very top of the page, directly above the
   * download box. Only pass "p" when the page renders its own <h1> elsewhere.
   */
  titleAs?: "h1" | "p";
  /** URL field placeholder. Tool pages pass route-specific copy. */
  placeholder?: string;
  /** Eyebrow badge text. Tool pages pass route-specific copy. */
  badge?: string;
  /** Primary button label. */
  buttonLabel?: string;
  /**
   * Which media shortcuts this route offers. Omitted = all five (homepage).
   * Tool pages pass only their own media type so a Story page never shows a
   * Carousels control, an Audio page never shows a Stories control, etc.
   */
  tabs?: DownloaderTab[];
  /**
   * Supporting note shown next to the media chip when `tabs` has a single
   * entry (a lone button would read as a broken tab bar).
   */
  mediaNote?: string;
  /** Trust indicators under the input. Omitted = the shared three. */
  trust?: string[];
}

const DEFAULT_SUBTITLE =
  "Download Instagram Reels, Videos & Carousels in HD — paste a public link and save public Reels, videos, carousels, stories and audio to your phone or desktop with Downloadit. No login required.";

export default function HeroDownloader({
  activeTab,
  onActiveTabChange,
  titleA = "Instagram Video ",
  titleB = "Downloader",
  subtitle = DEFAULT_SUBTITLE,
  titleAs = "h1",
  placeholder = "Paste Instagram link here...",
  badge,
  buttonLabel,
  tabs,
  mediaNote,
  trust,
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

  // Shared auto-scroll flow (progress → result → error), keyed per request.
  // Declared before handleSubmit, which blurs the keyboard on submit.
  // Tool pages reuse this component, so the same flow runs everywhere.
  const { anchorRef: resultAnchorRef, notifyTransition, blurForKeyboard } =
    useAutoScrollFlow();

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
      // Dismiss the on-screen keyboard first: with it open the visual
      // viewport is shrunk and the auto-scroll below lands wrong on both
      // iOS Safari and Android Chrome.
      blurForKeyboard();
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
      // Auto-scroll #1 fires from the PREPARING transition effect below (once
      // per request), not here: a synchronous scroll right after setState
      // races the commit and can silently miss on mobile. Validation, offline
      // and duplicate paths return before this point and never scroll.
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
    [url, t, activeTab, invalidateRequest, clearWatchdog, closeStream, onActiveTabChange, storyFlowLog, blurForKeyboard]
  );

  const isAudioMode = activeTab === "audio" || (audioExtractionRequested && state === "SUCCESS");

  const tabsRef = useRef<HTMLDivElement>(null);
  const prevStateRef = useRef<UIState>("IDLE");

  // Keep the active tab fully visible inside the horizontal scroller —
  // but never on mount. This effect fires on first render with the
  // preselected tab, and on mobile (where the tab bar can start below the
  // fold) block:"nearest" would scroll the fresh page down on load. Only
  // user- or resolve-driven tab switches recentre the bar.
  const tabsMountedRef = useRef(false);
  useEffect(() => {
    if (!tabsMountedRef.current) {
      tabsMountedRef.current = true;
      return;
    }
    const el = tabsRef.current?.querySelector<HTMLElement>("[data-active='true']");
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeTab]);

  // Auto-scrolls on every request transition — loading (progress card),
  // success (result preview) and error (message + retry) — each at most
  // once per request via the shared hook. The error scroll is deliberate:
  // validation failures and keyboard-open layout shifts can leave the
  // message below the fold on mobile.
  useEffect(() => {
    if (prevStateRef.current === state) return;
    const flowStatus: FlowStatus | null =
      state === "PREPARING" ? "loading" : state === "SUCCESS" ? "success" : state === "ERROR" ? "error" : null;
    if (flowStatus) notifyTransition(flowStatus, requestSeqRef.current);
    prevStateRef.current = state;
  }, [state, notifyTransition]);

  const TitleTag = titleAs as "h1" | "p";

  // Media controls this route offers: all five on the homepage, only the
  // page's own type on a tool route (rendered as one informational chip).
  const mediaCategories = tabs
    ? HERO_CATEGORIES.filter((cat) => tabs.includes(cat.id))
    : HERO_CATEGORIES;
  const singleMedia = mediaCategories.length === 1 ? mediaCategories[0] : null;
  const trustItems =
    trust && trust.length > 0 ? trust : [t.hero.foot1, t.hero.foot2, t.hero.foot3];

  return (
    <section
      id="hero"
      className="hero-section relative overflow-hidden scroll-mt-24 pt-6 sm:pt-8 lg:pt-10 pb-8 sm:pb-12 lg:pb-14"
    >
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        {/* Static radial wash instead of a filter-blurred layer: a 160px
            backdrop blur over a 1000px area forces a huge raster on every
            scroll frame on phones. Same look, zero per-frame cost. */}
        <div
          className="absolute left-1/2 top-0 h-[420px] w-full max-w-[1000px] -translate-x-1/2 -translate-y-1/3 rounded-full sm:h-[700px]"
          style={{
            background:
              "radial-gradient(ellipse 60% 55% at 50% 40%, rgba(124,77,245,0.07) 0%, rgba(124,77,245,0.0) 70%)",
          }}
        />
      </div>

      <div className="mx-auto w-full max-w-[1240px] min-w-0 px-4 sm:px-6 lg:px-8 xl:px-12">
        {/* Centered downloader column: badge → heading → description →
            media shortcuts → URL input → trust badges. */}
        <div className="mx-auto flex w-full max-w-[840px] min-w-0 flex-col items-center text-center">
          {/* Above-the-fold hero content renders immediately: no entrance
              animation or delay here — animating the LCP element (or holding
              it at opacity 0 during a delay) directly inflates LCP. */}
          <div
            className="mb-4 inline-flex max-w-full items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold tracking-wide text-fg-muted sm:mb-5 sm:gap-2 sm:px-4 sm:text-xs"
            style={{ background: "var(--card)", boxShadow: "var(--shadow-card)", border: "1px solid var(--border)" }}
          >
            <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-accent" />
            <Sparkles size={14} color="var(--accent)" strokeWidth={2} className="shrink-0" />
            <span className="truncate">{badge || t.hero.badge}</span>
          </div>

          <TitleTag className="max-w-full text-balance break-words" style={{ lineHeight: 1.12 }}>
            <span
              className="hero-title-a block text-balance break-words text-[32px] sm:text-[42px] font-extrabold text-fg tracking-tight"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              {titleA}
            </span>
            <span
              className="hero-title-b block text-balance break-words text-[28px] sm:text-[38px] font-semibold italic"
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

          <p className="hero-subtitle mt-4 text-[16px] leading-[1.65] text-fg-muted mx-auto max-w-2xl">
            {subtitle}
          </p>

          {/* Supported media controls. The homepage (no `tabs`) offers all
              five types as mode-select tabs feeding the input. A tool route
              passes only its own type, which renders as one informational
              chip — a single-button tab bar would look broken, and listing
              another route's media here is exactly how pages ended up with
              controls that did not match them. */}
          {mediaCategories.length > 1 && (
            <div className="mt-6 w-full">
              <div
                role="tablist"
                aria-label="Supported downloaders"
                className="mx-auto grid w-full max-w-[700px] gap-1.5 sm:gap-2"
                style={{ gridTemplateColumns: `repeat(${mediaCategories.length}, minmax(0, 1fr))` }}
              >
                {mediaCategories.map((cat) => {
                  const active = activeTab === cat.id;
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => onActiveTabChange(cat.id)}
                      className={`group flex min-w-0 flex-col items-center gap-1 rounded-xl border-2 px-0.5 py-1.5 sm:px-1.5 sm:py-2 transition-all duration-200 text-center cursor-pointer ${
                        active
                          ? "bg-primary-light border-primary/50 shadow-xs ring-2 ring-primary/15"
                          : "bg-card border-transparent hover:border-primary/30 hover:bg-primary-light/40"
                      }`}
                    >
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full sm:h-6 sm:w-6"
                        style={{ background: cat.iconBg, color: cat.iconColor }}
                      >
                        <Icon size={12} strokeWidth={2.2} />
                      </span>
                      <span
                        className={`min-w-0 truncate text-[11px] sm:text-[12px] font-bold leading-none transition-colors ${active ? "text-primary-strong" : "text-fg group-hover:text-primary"}`}
                      >
                        {cat.title}
                      </span>
                      <span className="hidden min-w-0 truncate text-[10.5px] leading-none text-fg-subtle sm:block">
                        {cat.subtitle}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {singleMedia && (
            <div className="mt-6 flex w-full justify-center">
              <div
                className="inline-flex max-w-full items-center gap-2.5 rounded-xl border px-3.5 py-2"
                style={{ background: "var(--card)", borderColor: "var(--border)" }}
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                  style={{ background: singleMedia.iconBg, color: singleMedia.iconColor }}
                  aria-hidden="true"
                >
                  <singleMedia.icon size={14} strokeWidth={2.2} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[12px] font-bold leading-tight text-fg">
                    {singleMedia.title}
                  </span>
                  {mediaNote && (
                    <span className="block text-[11px] leading-tight text-fg-subtle">
                      {mediaNote}
                    </span>
                  )}
                </span>
              </div>
            </div>
          )}

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
                      placeholder={placeholder}
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
                        <span>{buttonLabel || t.common.getMedia}</span>
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
                      placeholder={placeholder}
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
                          <span className="btn-label truncate">{buttonLabel || t.common.getMedia}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </form>

            {/* Trust indicators */}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 px-1 text-[12px] text-fg-subtle sm:mt-4 sm:gap-x-5 sm:text-[14px]">
              {trustItems.map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
        {/* Result / Error Area */}
        <div ref={resultAnchorRef} aria-live="polite" aria-atomic="true" className="scroll-mt-[calc(80px+env(safe-area-inset-top,0px))]">
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
    // Short share links (/s/<code>, often with ?story_media_id=) are what
    // Instagram's own Share button produces for Stories. The backend follows
    // the redirect to the canonical URL, so accept them here instead of
    // rejecting a perfectly good Story link before any request is made.
    const pathSegments = pathname.split("/").filter(Boolean);
    if (pathSegments[0]?.toLowerCase() === "s" && pathSegments.length >= 2 && pathSegments[1]) {
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
