"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Download as DownloadIcon,
  Clipboard,
  Link as LinkIcon,
  AlertCircle,
  Sparkles,
  X,
  Video as VideoIcon,
  Images,
  CircleCheckBig,
  UserRound,
  ShieldCheck,
  CirclePlay,
  type LucideIcon,
} from "lucide-react";
import dynamic from "next/dynamic";
import {
  startPinterestResolveStream,
  resolvePinterestUrl,
  isValidPinterestUrl,
  isBrowserOffline,
  type PinterestKind,
  type ResolveData,
  type ResolveStreamHandle,
} from "@/services/api";
import { useLanguage } from "@/i18n";

// Post-resolve UI (players + result card) is shared with the Instagram tools
// and loads on demand — it is not part of the initial page bundle. SSR stays
// enabled so markup is identical; the fallback reserves matching space.
const MediaResult = dynamic(() => import("./ResultPanel").then((m) => m.MediaResult), {
  loading: () => (
    <div className="mx-auto mt-6 w-full max-w-[720px] sm:mt-10 sm:px-5" aria-hidden="true">
      <div className="rounded-[20px] p-5 sm:p-8 animate-shimmer" style={{ minHeight: "320px" }} />
    </div>
  ),
});

type UIState = "IDLE" | "PREPARING" | "SUCCESS" | "ERROR";

const PROGRESS_RING_ID = "downloadit-pinterest-progress-ring";

// ─── Circular progress (REAL backend stages only) ────────────
// The value shown comes exclusively from `progress` SSE events the backend
// emits after each resolution stage actually completes. It never advances on a
// timer, so the percentage is honest.
function CircularProgress({ value, label }: { value: number; label: string }) {
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
          aria-label={label}
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

interface PinterestDownloaderProps {
  titleA: string;
  titleB: string;
  subtitle: string;
  /** Eyebrow badge copy above the headline. Falls back to the shared hero badge. */
  badge?: string;
  /**
   * Media controls this route exposes. Auto Detect is always listed first so
   * classification stays automatic; a route only offers the types it actually
   * serves — the video page never offers Carousel, the image page never
   * offers Video. Omitted = all three.
   */
  modes?: PinterestKind[];
  /** Trust indicator labels under the input. Plain strings: pages are server
   *  components and cannot pass component references as props. */
  benefits?: string[];
  /** URL field placeholder — defaults to generic URL copy. */
  placeholder?: string;
  /** Primary button label. */
  buttonLabel?: string;
}

/**
 * Selectable media types. "any" (Auto Detect) is the default and lets the
 * backend classify the pin from its actual media. "image" is presented as
 * "Carousel" because a pin can expose a single picture or several; it resolves
 * images without ever requiring a video. The manual buttons state which type
 * the user wants and the backend answers honestly when the pin lacks it.
 */
const MODE_OPTIONS: { value: PinterestKind; icon: LucideIcon }[] = [
  { value: "any", icon: Sparkles },
  { value: "video", icon: VideoIcon },
  { value: "image", icon: Images },
];

/**
 * Honest, factual reassurances shown directly under the input card. Each claim
 * is literally true of the tool: it is free, it needs no account, it only works
 * with publicly accessible pins, and it always previews before downloading.
 */
const BENEFITS: { icon: LucideIcon; label: string }[] = [
  { icon: CircleCheckBig, label: "Free to use" },
  { icon: UserRound, label: "No account required" },
  { icon: ShieldCheck, label: "Public pins supported" },
  { icon: CirclePlay, label: "Preview before downloading" },
];

/**
 * Pinterest downloader tool. Mirrors the Instagram hero layout and reuses the
 * shared result panel (preview + proxy download), but resolves through the
 * dedicated /api/pinterest endpoints. Auto Detect is the default; the manual
 * Video / Carousel controls state the expected media type so the backend can
 * still answer honestly when the pin lacks it.
 */
export default function PinterestDownloader({
  titleA,
  titleB,
  subtitle,
  badge,
  modes,
  benefits,
  placeholder = "Paste URL",
  buttonLabel,
}: PinterestDownloaderProps) {
  const { t } = useLanguage();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [state, setState] = useState<UIState>("IDLE");
  const [mode, setMode] = useState<PinterestKind>("any");
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [result, setResult] = useState<ResolveData | null>(null);

  const streamRef = useRef<ResolveStreamHandle | null>(null);
  const fallbackAbortRef = useRef<AbortController | null>(null);
  const requestSeqRef = useRef(0);
  // Stable scroll targets: the live progress/status section, the rendered
  // result card, and the error/status message. Each is scrolled to once per
  // request-lifecycle transition — never on unrelated re-renders.
  const progressRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  // True only when the CURRENT error came from a real resolve request, so a
  // pre-flight validation failure never scrolls (spec: an invalid URL shows the
  // error without scrolling to a nonexistent progress section).
  const scrollOnErrorRef = useRef(false);
  // The URL input has a desktop and a mobile variant (only one is laid out at a
  // time). "New" and Clear return focus to whichever is currently visible.
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  const mediaLabel = mode === "video" ? "video" : mode === "image" ? "image" : "media";
  const inputId = "downloadit-pinterest-url-input";
  const badgeText = badge ?? t.hero.badge;
  /** Media controls offered by this route (auto detection stays available). */
  const availableModes = modes
    ? MODE_OPTIONS.filter((opt) => modes.includes(opt.value))
    : MODE_OPTIONS;
  /** Trust labels; icons follow the default list's order. */
  const benefitItems = (benefits && benefits.length > 0 ? benefits : BENEFITS.map((b) => b.label))
    .slice(0, BENEFITS.length)
    .map((label, i) => ({ icon: BENEFITS[i].icon, label }));

  /** Supersede any in-flight job and mint a new request sequence. */
  const invalidate = useCallback((): number => {
    requestSeqRef.current += 1;
    streamRef.current?.close();
    streamRef.current = null;
    // Abort any in-flight POST fallback so a superseded request cannot keep
    // running (or be retried twice) after the user starts a new resolve.
    fallbackAbortRef.current?.abort();
    fallbackAbortRef.current = null;
    return requestSeqRef.current;
  }, []);

  // Stop any in-flight resolve when the page unmounts (no browser work is
  // left running on the server for a client that is gone).
  useEffect(() => {
    return () => {
      invalidate();
    };
  }, [invalidate]);

  /** Focus whichever URL input is currently laid out (desktop or mobile). */
  const focusUrlInput = useCallback(() => {
    const el = [desktopInputRef.current, mobileInputRef.current].find(
      (node): node is HTMLInputElement => Boolean(node && node.getClientRects().length > 0)
    );
    el?.focus({ preventScroll: true });
  }, []);

  /**
   * Single reset for every result-specific piece of state: the resolved result
   * (which owns the media preview, carousel, title, author and download UI),
   * the progress/status, and the error message — plus superseding any in-flight
   * resolve. The URL text, the Video/Carousel selector and unrelated site
   * settings are deliberately left untouched.
   *
   * `state` is the single source of truth for what the output area shows, so
   * dropping it back to IDLE immediately hides the result card and unmounts the
   * shared result panel — whose own cleanup pauses any playing video and
   * revokes temporary object URLs. No page reload is involved.
   */
  const resetOutput = useCallback(() => {
    invalidate();
    setState("IDLE");
    setProgress(0);
    setStage("");
    setResult(null);
    setError("");
    scrollOnErrorRef.current = false;
  }, [invalidate]);

  const start = useCallback(
    (target: string) => {
      const seq = invalidate();
      setState("PREPARING");
      setProgress(0);
      setStage("Contacting Pinterest…");
      setResult(null);
      setError("");

      let fallbackUsed = false;

      const handle = startPinterestResolveStream(target, mode, {
        onProgress: (p, s) => {
          if (seq !== requestSeqRef.current) return;
          setProgress(p);
          if (s) setStage(s);
        },
        onComplete: (data) => {
          if (seq !== requestSeqRef.current) return;
          streamRef.current = null;
          setResult(data);
          setState("SUCCESS");
        },
        onError: (err) => {
          if (seq !== requestSeqRef.current) return;
          streamRef.current = null;
          setError(err.message || `The pin's ${mediaLabel} could not be resolved.`);
          setState("ERROR");
        },
        onTransportError: () => {
          if (seq !== requestSeqRef.current || fallbackUsed) return;
          fallbackUsed = true;
          // Exactly one plain-POST fallback when the stream dropped without a
          // server verdict; no reconnect loop. Bounded by its own timeout so a
          // hung request can never leave the UI spinning forever.
          const controller = new AbortController();
          fallbackAbortRef.current = controller;
          const timer = setTimeout(() => controller.abort(), 30_000);
            resolvePinterestUrl(target, mode, controller.signal)
            .then((res) => {
              if (seq !== requestSeqRef.current) return;
              if (res.success) {
                setResult(res.data);
                setState("SUCCESS");
              } else {
                setError(res.error.message || `The pin's ${mediaLabel} could not be resolved.`);
                setState("ERROR");
              }
            })
            .catch(() => {
              if (seq !== requestSeqRef.current) return;
              setError(
                controller.signal.aborted
                  ? "The request took too long. Please try again."
                  : "Connection to the server was lost. Please check your network and try again."
              );
              setState("ERROR");
            })
            .finally(() => {
              clearTimeout(timer);
              if (fallbackAbortRef.current === controller) fallbackAbortRef.current = null;
              if (seq === requestSeqRef.current) streamRef.current = null;
            });
        },
      });
      streamRef.current = handle;
    },
    [invalidate, mode, mediaLabel]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      // A submit while a resolve is already running is a duplicate: ignore it so
      // only one request runs and only one progress-scroll ever happens.
      if (state === "PREPARING") return;
      // Pre-flight errors (empty/invalid URL) must NOT scroll.
      scrollOnErrorRef.current = false;
      const trimmed = url.trim();
      // A new submission makes every previous output stale: drop the old result
      // (and progress/error) and supersede any in-flight resolve BEFORE
      // validating, so an invalid or empty URL can never leave a stale result
      // card visible behind the new error.
      resetOutput();
      if (!trimmed) {
        setError("Paste a Pinterest pin link to continue.");
        setState("ERROR");
        return;
      }
      if (!isValidPinterestUrl(trimmed)) {
        setError("That does not look like a Pinterest link. Copy a pin URL such as pinterest.com/pin/… or a pin.it short link.");
        setState("ERROR");
        return;
      }
      // The URL is valid, so any error from here on is a real flow error that
      // should be scrolled into view.
      scrollOnErrorRef.current = true;
      if (isBrowserOffline()) {
        setError("You appear to be offline. Reconnect and try again.");
        setState("ERROR");
        return;
      }
      start(trimmed);
    },
    [url, start, state, resetOutput]
  );

  /**
   * Single source of truth for input edits: update the URL, and — the moment it
   * changes away from whatever the previous URL produced — hide the result,
   * drop progress/success/error, and cancel the in-flight resolve so a delayed
   * response can never reappear against a different (or empty) URL.
   */
  const handleUrlChange = useCallback(
    (next: string) => {
      setUrl(next);
      if (state !== "IDLE" || error) resetOutput();
    },
    [state, error, resetOutput]
  );

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) handleUrlChange(text);
    } catch {
      /* clipboard permission denied — the user can paste manually */
    }
  }, [handleUrlChange]);

  const handleClearInput = useCallback(() => {
    setUrl("");
    // Emptying the input must immediately remove the previous output.
    resetOutput();
    if (typeof window !== "undefined") window.requestAnimationFrame(focusUrlInput);
  }, [resetOutput, focusUrlInput]);

  const handleReset = useCallback(() => {
    // "New" hides/clears the previous result and all result-specific state, then
    // returns focus to the input. The typed URL is intentionally preserved.
    resetOutput();
    if (typeof window !== "undefined") window.requestAnimationFrame(focusUrlInput);
  }, [resetOutput, focusUrlInput]);

  const handleRetry = useCallback(() => {
    // Ignore repeat clicks while a resolve is already running: `invalidate`
    // would supersede the live job and the guard keeps it from being started
    // twice by a rapid double-click.
    if (state === "PREPARING") return;
    const trimmed = url.trim();
    if (trimmed && isValidPinterestUrl(trimmed)) start(trimmed);
  }, [url, start, state]);

  const modeLabelOf = useCallback(
    (value: PinterestKind): string =>
      value === "any" ? t.pinterest.auto : value === "video" ? t.pinterest.video : t.pinterest.carousel,
    [t.pinterest.auto, t.pinterest.carousel, t.pinterest.video]
  );

  /**
   * Smooth-scroll a section so its top sits just below the sticky header.
   * Used for the progress/status and error targets. Honors
   * prefers-reduced-motion (instant jump, no animation) and falls back to the
   * legacy `scrollIntoView(true)` signature on engines that ignore the options
   * object. `scroll-margin-top` on the target supplies the header offset.
   */
  const scrollTargetIntoView = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    const prefersReduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    try {
      el.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
    } catch {
      el.scrollIntoView(true);
    }
  }, []);

  /**
   * Measured-scroll the finished result card to the vertical centre of the
   * space actually available below the fixed/sticky header.
   *
   * `scrollIntoView({ block: "center" })` centres against the whole viewport,
   * which pushes a tall card's heading under the sticky header and can hide the
   * bottom controls. Instead we measure the live header height and the card's
   * settled height and:
   *   - centre the card within `[header, viewport bottom]` when it fits there
   *     (desktop and short cards — true vertical centring), and
   *   - top-align it just below the header when the card is taller than that
   *     space, so nothing is cropped and the media + Preview/Download controls
   *     stay reachable on mobile (320/375/430px).
   * Horizontal position is left untouched — the card is already centred by its
   * own `mx-auto`/max-width layout, so no horizontal scroll is ever needed and
   * `inline: "nearest"` is a no-op. Honours prefers-reduced-motion.
   */
  const scrollResultIntoView = useCallback((el: HTMLElement | null) => {
    if (!el || typeof window === "undefined") return;
    const prefersReduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior: ScrollBehavior = prefersReduced ? "auto" : "smooth";

    const headerEl = document.querySelector("header");
    const headerH = headerEl ? headerEl.getBoundingClientRect().height : 72;
    const topGap = headerH + 12;
    const bottomGap = 16;

    const rect = el.getBoundingClientRect();
    const viewportH = window.innerHeight || document.documentElement.clientHeight;
    const available = Math.max(0, viewportH - topGap - bottomGap);

    const top =
      rect.height <= available
        ? window.scrollY + rect.top - topGap - (available - rect.height) / 2
        : window.scrollY + rect.top - topGap;
    const target = Math.max(0, Math.round(top));

    try {
      window.scrollTo({ top: target, behavior });
    } catch {
      window.scrollTo(0, target);
    }
  }, []);

  // Scroll on each lifecycle transition, but centre the RESULT differently:
  // progress/status and error targets keep their existing top-aligned scroll,
  // while the success result is centred only once it has rendered AND its
  // layout has settled. The lazily-loaded result card replaces its reserved
  // fallback a frame or two after mount, so a ResizeObserver + debounce waits
  // for the settled height before scrolling — and re-scrolls only when that
  // height meaningfully changes, so React re-renders (which never resize the
  // element) can't cause repeat animations. Keyed on `state` only.
  useEffect(() => {
    if (state === "PREPARING") {
      scrollTargetIntoView(progressRef.current);
      return;
    }
    if (state === "ERROR") {
      if (scrollOnErrorRef.current) scrollTargetIntoView(errorRef.current);
      return;
    }
    if (state !== "SUCCESS") return;

    const el = resultRef.current;
    if (!el) return;

    let cancelled = false;
    let debounce: ReturnType<typeof setTimeout> | null = null;
    let stopTimer: ReturnType<typeof setTimeout> | null = null;
    let observer: ResizeObserver | null = null;
    let raf1 = 0;
    let raf2 = 0;
    let lastHeight = -1;

    const centerNow = () => {
      if (cancelled) return;
      const h = el.getBoundingClientRect().height;
      if (lastHeight >= 0 && Math.abs(h - lastHeight) < 8) return;
      lastHeight = h;
      scrollResultIntoView(el);
    };

    const settleThenCenter = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        debounce = null;
        centerNow();
      }, 200);
    };

    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(settleThenCenter);
      observer.observe(el);
      settleThenCenter();
      stopTimer = setTimeout(() => {
        observer?.disconnect();
        observer = null;
      }, 3000);
    } else {
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          raf2 = 0;
          centerNow();
        });
      });
    }

    return () => {
      cancelled = true;
      if (debounce) clearTimeout(debounce);
      if (stopTimer) clearTimeout(stopTimer);
      if (raf1) cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
      observer?.disconnect();
    };
  }, [state, scrollTargetIntoView, scrollResultIntoView]);

  const busy = state === "PREPARING";

  return (
    <section
      id="hero"
      className="hero-section relative mb-12 overflow-hidden scroll-mt-24 pt-6 pb-16 sm:mb-16 sm:pt-8 sm:pb-20 lg:mb-20 lg:pt-10 lg:pb-24"
    >
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <div
          className="absolute left-1/2 top-0 h-[420px] w-full max-w-[1000px] -translate-x-1/2 -translate-y-1/3 rounded-full sm:h-[700px]"
          style={{
            background:
              "radial-gradient(ellipse 60% 55% at 50% 40%, rgba(124,77,245,0.07) 0%, rgba(124,77,245,0.0) 70%)",
          }}
        />
      </div>

      <div className="mx-auto w-full max-w-[1240px] min-w-0 px-4 sm:px-6 lg:px-8 xl:px-12">
        {/* Centered hero composition: badge → headline → copy → card → benefits */}
        <div className="mx-auto flex w-full max-w-[800px] min-w-0 flex-col items-center text-center">
          <div
            className="mb-4 inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-wide text-fg-muted sm:mb-5 sm:gap-2 sm:px-4 sm:text-xs"
            style={{ background: "var(--card)", boxShadow: "var(--shadow-card)", border: "1px solid var(--border)" }}
          >
            <Sparkles size={14} color="var(--accent)" strokeWidth={2} className="shrink-0" />
            <span className="truncate">{badgeText}</span>
          </div>

          <h1 className="w-full max-w-full text-balance break-words" style={{ lineHeight: 1.12 }}>
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
          </h1>

          <p className="hero-subtitle mx-auto mt-4 max-w-[640px] text-[16px] leading-[1.65] text-fg-muted">
            {subtitle}
          </p>

          {/* Input Bar */}
          <div className="mt-7 w-full">
            <form onSubmit={handleSubmit} className="relative min-w-0" noValidate>
              <div
                className="url-card rounded-[20px] p-2.5 transition-shadow focus-within:ring-2 focus-within:ring-primary/25"
                  style={{
                    background: "var(--card)",
                    boxShadow: "var(--shadow-card), 0 0 40px rgba(124,77,245,0.06)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {/* Media selector: Auto Detect / Video / Carousel. Auto
                      (the default) lets the backend classify the pin from its
                      real media; the manual buttons state the type wanted and
                      only appear when this route actually serves that type. */}
                  {availableModes.length > 1 && (
                    <div
                      className="mb-2.5 flex items-center justify-center border-b px-1 pb-2.5"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <div role="tablist" aria-label={t.pinterest.groupLabel} className="flex flex-wrap items-center justify-center gap-1.5">
                        {availableModes.map((opt) => {
                        const active = mode === opt.value;
                        const Icon = opt.icon;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            disabled={busy}
                            onClick={() => {
                              if (opt.value === mode) return;
                              setMode(opt.value);
                              // A different media type makes any shown result
                              // mismatched: clear result-specific state so no
                              // stale Video/Carousel output remains.
                              resetOutput();
                            }}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                              active
                                ? "border-primary/50 bg-primary-light text-primary-strong ring-2 ring-primary/15"
                                : "border-border text-fg-muted hover:bg-primary-light hover:text-primary"
                            }`}
                          >
                            <Icon size={13} strokeWidth={2.2} />
                            {modeLabelOf(opt.value)}
                          </button>
                        );
                      })}
                      </div>
                    </div>
                  )}

                  {/* Desktop: horizontal */}
                  <div className="hidden sm:flex sm:flex-row sm:gap-2">
                    <div className="relative min-w-0 flex-1">
                      <LinkIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-fg-subtle" />
                      <input
                        ref={desktopInputRef}
                        id={inputId}
                        name="pinterest-url"
                        type="text"
                        value={url}
                        onChange={(e) => handleUrlChange(e.target.value)}
                        placeholder={placeholder}
                        className="h-13 w-full rounded-xl border-0 bg-transparent pl-12 pr-12 text-[16px] text-fg placeholder:text-fg-subtle focus:outline-none"
                        style={{ fontFamily: "var(--font-sans)", fontWeight: 500 }}
                        aria-label="Pinterest URL input"
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? "downloadit-pinterest-url-error" : undefined}
                        autoComplete="off"
                        spellCheck={false}
                        disabled={busy}
                      />
                      {url && !busy && (
                        <button
                          type="button"
                          onClick={handleClearInput}
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
                      disabled={busy}
                      className="flex h-13 shrink-0 items-center gap-1.5 rounded-xl border border-border px-3.5 text-xs font-semibold text-fg transition-colors hover:bg-primary-light hover:text-primary disabled:opacity-50"
                      style={{ background: "var(--bg)" }}
                      aria-label={t.common.paste}
                    >
                      <Clipboard className="h-3.5 w-3.5" />
                      {t.common.paste}
                    </button>

                    <button type="submit" disabled={busy} className="gradient-btn h-13 shrink-0 px-7 text-[16px]">
                      {busy ? (
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
                        ref={mobileInputRef}
                        id={`${inputId}-mobile`}
                        name="pinterest-url"
                        type="text"
                        value={url}
                        onChange={(e) => handleUrlChange(e.target.value)}
                        placeholder={placeholder}
                        className="h-13 w-full rounded-xl border-0 bg-transparent pl-12 pr-20 text-[16px] text-fg placeholder:text-fg-subtle focus:outline-none"
                        style={{ fontFamily: "var(--font-sans)", fontWeight: 500 }}
                        aria-label="Pinterest URL input"
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? "downloadit-pinterest-url-error" : undefined}
                        autoComplete="off"
                        spellCheck={false}
                        disabled={busy}
                      />
                      {url && !busy && (
                        <button
                          type="button"
                          onClick={handleClearInput}
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
                        disabled={busy}
                        className="flex h-12 min-h-[48px] w-full min-w-0 items-center justify-center gap-1.5 rounded-xl border border-border px-3 text-[14px] font-semibold text-fg transition-colors hover:bg-primary-light hover:text-primary disabled:opacity-50"
                        style={{ background: "var(--bg)" }}
                        aria-label={t.common.paste}
                      >
                        <Clipboard className="h-4 w-4 shrink-0" />
                        <span className="btn-label truncate">{t.common.paste}</span>
                      </button>
                      <button type="submit" disabled={busy} className="gradient-btn h-12 min-h-[48px] w-full min-w-0 px-3 text-[16px]">
                        {busy ? (
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

              {/* Honest, factual reassurances — replaces the plain trust dots */}
              <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-1">
                {benefitItems.map(({ icon: Icon, label }) => (
                  <li key={label} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-fg-muted">
                    <Icon size={15} strokeWidth={2.2} className="shrink-0" style={{ color: "var(--primary-strong)" }} />
                    {label}
                  </li>
                ))}
              </ul>
            </div>
        </div>

        {/* Progress / Result / Error area. Each state owns a stable, scroll-
            margined target (clears the 72px sticky header) so the request
            lifecycle can bring exactly the right section into view. The result
            wrapper sits at the identical top position whether the lazily-loaded
            card or its reserved-space fallback is showing, so the scroll lands
            correctly as soon as the result exists in the DOM. */}
        <div aria-live="polite" aria-atomic="true">
          {state === "PREPARING" && (
            <div ref={progressRef} className="scroll-mt-[calc(80px+env(safe-area-inset-top,0px))]">
              <CircularProgress value={progress} label={stage || "Contacting Pinterest…"} />
            </div>
          )}

          {state === "SUCCESS" && result && (
            <div ref={resultRef} className="scroll-mt-[calc(80px+env(safe-area-inset-top,0px))]">
              <MediaResult
                key={result.mediaId || result.sourceUrl}
                result={result}
                mode="video"
                variant="pinterest"
                onReset={handleReset}
              />
            </div>
          )}

          {state === "ERROR" && error && (
            <div ref={errorRef} className="scroll-mt-[calc(80px+env(safe-area-inset-top,0px))]">
              <div className="animate-fade-in-up mx-auto mt-6 w-full max-w-[720px] sm:mt-10 sm:px-5">
                <div
                  id="downloadit-pinterest-url-error"
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
                    disabled={busy}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl border border-danger/20 bg-white px-5 py-2.5 text-sm font-medium text-danger transition-colors hover:bg-danger-light disabled:opacity-50"
                  >
                    {t.common.tryAgain}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
