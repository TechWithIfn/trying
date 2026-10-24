"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Clipboard,
  Download as DownloadIcon,
  Link as LinkIcon,
  Loader2,
  Music2,
  ShieldCheck,
  Sparkles,
  UserRound,
  Video as VideoIcon,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  buildDownloadFilename,
  downloadYouTubeFile,
  isBrowserOffline,
  isValidYouTubeUrl,
  resolveYouTubeUrl,
  type YouTubeAudioOption,
  type YouTubeFormat,
  type YouTubeResolveData,
} from "@/services/api";
import { useLanguage } from "@/i18n";

type ResolveState = "IDLE" | "LOADING" | "READY" | "ERROR";

type DownloadPhase = "preparing" | "downloading" | "done" | "error";

interface DownloadState {
  kind: YouTubeFormat;
  audioKey?: string;
  phase: DownloadPhase;
  loaded: number;
  total: number | null;
  message: string;
}

interface YouTubeDownloaderProps {
  titleA: string;
  titleB: string;
  subtitle: string;
  badge?: string;
  placeholder?: string;
  buttonLabel?: string;
  benefits?: string[];
}

const BENEFITS: { icon: LucideIcon; label: string }[] = [
  { icon: CheckCircle2, label: "Free to use" },
  { icon: UserRound, label: "No account required" },
  { icon: ShieldCheck, label: "Public videos only" },
  { icon: VideoIcon, label: "MP4 video or MP3/M4A audio" },
];

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "";
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    : `${minutes}:${String(secs).padStart(2, "0")}`;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(1)} MB`;
}

const MAX_TITLE_WORDS = 40;

function audioOptionKey(option: YouTubeAudioOption): string {
  return `${option.format}:${option.bitrateKbps}`;
}

function audioOptionLabel(option: YouTubeAudioOption): string {
  return option.format === "m4a"
    ? `M4A AAC ${option.bitrateKbps} kbps`
    : `MP3 ${option.bitrateKbps} kbps`;
}

function countTitleWords(title: string): number {
  return title.match(/\S+/g)?.length ?? 0;
}

/** Keep the original text and spacing, cutting only before the 41st word. */
function truncateTitleToWords(title: string, maxWords = MAX_TITLE_WORDS): string {
  let words = 0;
  let inWord = false;
  for (let index = 0; index < title.length; index += 1) {
    if (/\s/.test(title[index])) {
      inWord = false;
      continue;
    }
    if (!inWord) {
      inWord = true;
      words += 1;
      if (words > maxWords) return `${title.slice(0, index).trimEnd()}…`;
    }
  }
  return title;
}

function scrollIntoView(el: HTMLElement | null): void {
  if (!el || typeof window === "undefined") return;
  const reduced =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  try {
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  } catch {
    el.scrollIntoView(true);
  }
}

export default function YouTubeDownloader({
  titleA,
  titleB,
  subtitle,
  badge,
  placeholder = "Paste a YouTube video link here...",
  buttonLabel,
  benefits,
}: YouTubeDownloaderProps) {
  const { t } = useLanguage();
  const [url, setUrl] = useState("");
  const [state, setState] = useState<ResolveState>("IDLE");
  const [error, setError] = useState("");
  const [result, setResult] = useState<YouTubeResolveData | null>(null);
  const [quality, setQuality] = useState<number | null>(null);
  const [titleExpanded, setTitleExpanded] = useState(false);
  const [download, setDownload] = useState<DownloadState | null>(null);

  const resolveAbortRef = useRef<AbortController | null>(null);
  const downloadAbortRef = useRef<AbortController | null>(null);
  const requestSeqRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const scrollOnErrorRef = useRef(false);

  const downloading = download?.phase === "preparing" || download?.phase === "downloading";
  const busy = state === "LOADING";
  const inputId = "downloadit-youtube-url-input";
  const badgeText = badge ?? t.hero.badge;
  const audioOptions = result?.audioOptions ?? [];
  const fullTitle = result?.title ?? "";
  const titleHasMore = countTitleWords(fullTitle) > MAX_TITLE_WORDS;
  const displayTitle =
    titleHasMore && !titleExpanded ? truncateTitleToWords(fullTitle) : fullTitle;
  const benefitItems = (benefits && benefits.length > 0 ? benefits : BENEFITS.map((b) => b.label))
    .slice(0, BENEFITS.length)
    .map((label, i) => ({ icon: BENEFITS[i].icon, label }));

  const abortAll = useCallback(() => {
    requestSeqRef.current += 1;
    resolveAbortRef.current?.abort();
    resolveAbortRef.current = null;
    downloadAbortRef.current?.abort();
    downloadAbortRef.current = null;
  }, []);

  useEffect(() => () => abortAll(), [abortAll]);

  const resetOutput = useCallback(() => {
    abortAll();
    setState("IDLE");
    setError("");
    setResult(null);
    setQuality(null);
    setTitleExpanded(false);
    setDownload(null);
    scrollOnErrorRef.current = false;
  }, [abortAll]);

  const focusInput = useCallback(() => {
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
  }, []);

  const startResolve = useCallback(async (target: string) => {
    const seq = requestSeqRef.current + 1;
    requestSeqRef.current = seq;
    resolveAbortRef.current?.abort();
    downloadAbortRef.current?.abort();
    downloadAbortRef.current = null;

    const controller = new AbortController();
    resolveAbortRef.current = controller;
    const timer = setTimeout(() => controller.abort(), 45_000);

    setState("LOADING");
    setError("");
    setResult(null);
    setQuality(null);
    setTitleExpanded(false);
    setDownload(null);
    scrollOnErrorRef.current = false;

    try {
      const response = await resolveYouTubeUrl(target, controller.signal);
      if (seq !== requestSeqRef.current) return;
      if (response.success) {
        setResult(response.data);
        setQuality(response.data.qualities[0]?.height ?? null);
        setTitleExpanded(false);
        setState("READY");
        window.requestAnimationFrame(() => scrollIntoView(resultRef.current));
      } else {
        setError(response.error.message || "This YouTube video could not be read.");
        setState("ERROR");
        scrollOnErrorRef.current = true;
      }
    } catch {
      if (seq !== requestSeqRef.current) return;
      if (controller.signal.aborted) {
        setError(
          "The request took too long or was cancelled. Please check the link and try again."
        );
      } else if (isBrowserOffline()) {
        setError("You appear to be offline. Reconnect and try again.");
      } else {
        setError("Connection to the server was lost. Please check your network and try again.");
      }
      setState("ERROR");
      scrollOnErrorRef.current = true;
    } finally {
      clearTimeout(timer);
      if (resolveAbortRef.current === controller) resolveAbortRef.current = null;
    }
  }, []);

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      if (busy || downloading) return;
      const trimmed = url.trim();
      resetOutput();
      if (!trimmed) {
        setError("Paste a YouTube video link to continue.");
        setState("ERROR");
        focusInput();
        return;
      }
      if (!isValidYouTubeUrl(trimmed)) {
        setError(
          "That does not look like a YouTube video link. Paste a youtube.com/watch?v=…, youtu.be/…, youtube.com/shorts/… or youtube.com/embed/… URL."
        );
        setState("ERROR");
        focusInput();
        return;
      }
      if (isBrowserOffline()) {
        setError("You appear to be offline. Reconnect and try again.");
        setState("ERROR");
        return;
      }
      void startResolve(trimmed);
    },
    [busy, downloading, focusInput, resetOutput, startResolve, url]
  );

  const handleUrlChange = useCallback(
    (next: string) => {
      setUrl(next);
      if (state !== "IDLE" || error || download) resetOutput();
    },
    [state, error, download, resetOutput]
  );

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) handleUrlChange(text);
    } catch {
      /* clipboard permission denied — manual paste still works */
    }
  }, [handleUrlChange]);

  const handleClear = useCallback(() => {
    setUrl("");
    resetOutput();
    focusInput();
  }, [focusInput, resetOutput]);

  const handleNew = useCallback(() => {
    resetOutput();
    focusInput();
  }, [focusInput, resetOutput]);

  const handleRetry = useCallback(() => {
    if (busy || downloading) return;
    const trimmed = url.trim();
    if (trimmed && isValidYouTubeUrl(trimmed)) void startResolve(trimmed);
  }, [busy, downloading, startResolve, url]);

  useEffect(() => {
    if (state === "ERROR" && scrollOnErrorRef.current) {
      window.requestAnimationFrame(() => scrollIntoView(errorRef.current));
    }
  }, [state]);

  const startDownload = useCallback(
    async (format: YouTubeFormat, bitrateKbps?: number) => {
      if (!result || downloading) return;
      if (format === "mp4" && quality === null) {
        setDownload({
          kind: "mp4",
          phase: "error",
          loaded: 0,
          total: null,
          message: "Choose an available video quality first.",
        });
        return;
      }
      if (format !== "mp4" && (!result.audioAvailable || !bitrateKbps)) return;

      const audioKey = format !== "mp4" && bitrateKbps ? `${format}:${bitrateKbps}` : undefined;
      const controller = new AbortController();
      downloadAbortRef.current = controller;
      setDownload({ kind: format, audioKey, phase: "preparing", loaded: 0, total: null, message: "" });

      try {
        const outcome = await downloadYouTubeFile({
          url: result.sourceUrl || url.trim(),
          format,
          quality: format === "mp4" ? quality ?? undefined : undefined,
          bitrateKbps: format === "mp4" ? undefined : bitrateKbps,
          signal: controller.signal,
          onProgress: ({ loaded, total }) => {
            if (downloadAbortRef.current !== controller) return;
            setDownload({
              kind: format,
              audioKey,
              phase: "downloading",
              loaded,
              total,
              message: "",
            });
          },
        });

        if (downloadAbortRef.current !== controller) return;

        if (!outcome.ok) {
          setDownload({
            kind: format,
            audioKey,
            phase: "error",
            loaded: 0,
            total: null,
            message: outcome.error.message,
          });
          return;
        }

        const objectUrl = URL.createObjectURL(outcome.blob);
        const filename = buildDownloadFilename({
          title: result.title,
          extension: format,
          fallback: format === "mp4" ? "YouTube Video" : "YouTube Audio",
        });
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = filename;
        anchor.rel = "noopener";
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);

        setDownload({
          kind: format,
          audioKey,
          phase: "done",
          loaded: outcome.blob.size,
          total: outcome.blob.size,
          message: "File ready — check your Downloads folder.",
        });
      } catch {
        if (controller.signal.aborted || downloadAbortRef.current !== controller) return;
        setDownload({
          kind: format,
          audioKey,
          phase: "error",
          loaded: 0,
          total: null,
          message: isBrowserOffline()
            ? "You appear to be offline. Reconnect and try again."
            : "Connection to the server was lost while preparing the file. Please try again.",
        });
      } finally {
        if (downloadAbortRef.current === controller) downloadAbortRef.current = null;
      }
    },
    [downloading, quality, result, url]
  );

  const progressPct =
    download && download.phase === "downloading" && download.total
      ? Math.max(0, Math.min(100, Math.round((download.loaded / download.total) * 100)))
      : null;

  const videoLabel = (() => {
    if (download?.kind !== "mp4") return "Download MP4";
    if (download.phase === "preparing") return "Preparing…";
    if (download.phase === "downloading") return progressPct !== null ? `Receiving ${progressPct}%` : "Receiving…";
    return "Download MP4";
  })();

  const isAudioDownload = download?.kind === "mp3" || download?.kind === "m4a";
  const isVideoDownload = download?.kind === "mp4";

  const renderDownloadStatus = () => {
    if (!download) return null;
    if (download.phase === "preparing" || download.phase === "downloading") {
      return (
        <div className="mt-2.5" aria-live="polite">
          <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-fg-muted">
            <span className="min-w-0 truncate">
              {download.phase === "preparing"
                ? `Preparing ${download.kind.toUpperCase()} on the server…`
                : download.total
                  ? `${formatBytes(download.loaded)} of ${formatBytes(download.total)}`
                  : `${formatBytes(download.loaded)} received`}
            </span>
            {progressPct !== null && <span className="shrink-0 tabular-nums">{progressPct}%</span>}
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--primary-light)" }}>
            <div
              className="h-full rounded-full transition-[width] duration-200"
              style={{ width: `${progressPct ?? 0}%`, background: "var(--brand-gradient)" }}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPct ?? undefined}
              aria-label={`${download.kind.toUpperCase()} download progress`}
            />
          </div>
        </div>
      );
    }
    if (download.phase === "done") {
      return (
        <p className="mt-2.5 flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: "var(--success, #059669)" }}>
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          {download.message}
        </p>
      );
    }
    return (
      <p className="mt-2.5 flex items-start gap-1.5 text-[11px] font-medium text-danger" role="alert">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>{download.message}</span>
      </p>
    );
  };

  return (
    <section id="hero" className="hero-section relative overflow-hidden scroll-mt-24 pt-6 sm:pt-8 lg:pt-10 pb-8 sm:pb-12 lg:pb-14">
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
                <div className="hidden sm:flex sm:flex-row sm:gap-2">
                  <div className="relative min-w-0 flex-1">
                    <LinkIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-fg-subtle" />
                    <input
                      ref={inputRef}
                      id={inputId}
                      name="youtube-url"
                      type="text"
                      value={url}
                      onChange={(event) => handleUrlChange(event.target.value)}
                      placeholder={placeholder}
                      className="h-13 w-full rounded-xl border-0 bg-transparent pl-12 pr-12 text-[16px] text-fg placeholder:text-fg-subtle focus:outline-none"
                      style={{ fontFamily: "var(--font-sans)", fontWeight: 500 }}
                      aria-label="YouTube video URL"
                      aria-invalid={error ? true : undefined}
                      aria-describedby={error ? "downloadit-youtube-error" : undefined}
                      autoComplete="off"
                      spellCheck={false}
                      disabled={busy}
                    />
                    {url && !busy && (
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
                        <Loader2 className="h-5 w-5 animate-spin" />
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

                <div className="flex flex-col gap-2 sm:hidden">
                  <div className="relative">
                    <LinkIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-fg-subtle" />
                    <input
                      id={`${inputId}-mobile`}
                      name="youtube-url"
                      type="text"
                      value={url}
                      onChange={(event) => handleUrlChange(event.target.value)}
                      placeholder={placeholder}
                      className="h-13 w-full rounded-xl border-0 bg-transparent pl-12 pr-20 text-[16px] text-fg placeholder:text-fg-subtle focus:outline-none"
                      style={{ fontFamily: "var(--font-sans)", fontWeight: 500 }}
                      aria-label="YouTube video URL"
                      aria-invalid={error ? true : undefined}
                      aria-describedby={error ? "downloadit-youtube-error" : undefined}
                      autoComplete="off"
                      spellCheck={false}
                      disabled={busy}
                    />
                    {url && !busy && (
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
                      disabled={busy}
                      className="flex h-12 min-h-[48px] w-full items-center justify-center gap-1.5 rounded-xl border border-border px-3 text-[14px] font-semibold text-fg transition-colors hover:bg-primary-light hover:text-primary disabled:opacity-50"
                      style={{ background: "var(--bg)" }}
                      aria-label={t.common.paste}
                    >
                      <Clipboard className="h-4 w-4 shrink-0" />
                      <span className="btn-label truncate">{t.common.paste}</span>
                    </button>
                    <button type="submit" disabled={busy} className="gradient-btn h-12 min-h-[48px] w-full px-3 text-[16px]">
                      {busy ? (
                        <>
                          <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
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

        <div aria-live="polite" aria-atomic="true">
          {state === "LOADING" && (
            <div className="mx-auto mt-6 w-full max-w-[720px] sm:mt-10 sm:px-5">
              <div
                className="flex flex-col items-center gap-3 rounded-[20px] p-8 text-center"
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              >
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--primary)" }} />
                <p className="text-sm font-semibold text-fg">Reading video details…</p>
                <p className="text-[13px] text-fg-muted">
                  Asking YouTube which video and audio formats this public video exposes.
                </p>
              </div>
            </div>
          )}

          {state === "READY" && result && (
            <div
              ref={resultRef}
              className="mx-auto mt-6 w-full max-w-[1040px] scroll-mt-[calc(80px+env(safe-area-inset-top,0px))] px-3 sm:mt-10 sm:px-5"
            >
              <div
                className="animate-fade-in-up overflow-hidden rounded-[20px]"
                style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}
                data-youtube-result
              >
                <div className="grid min-w-0 gap-5 p-3 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-6 lg:p-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                  <div className="min-w-0">
                    <div
                      className="relative mx-auto aspect-[4/3] w-full max-w-[480px] overflow-hidden rounded-2xl bg-[#101016]"
                      data-youtube-thumbnail
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={result.thumbnail}
                        alt=""
                        className="h-full w-full object-contain"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div className="mx-auto mt-4 w-full max-w-[480px] min-w-0">
                      <h2
                        id="downloadit-youtube-title"
                        className="break-words text-[16px] font-bold leading-snug text-fg sm:text-[17px] [overflow-wrap:anywhere]"
                        title={result.title}
                      >
                        {displayTitle}
                      </h2>
                      {titleHasMore && (
                        <button
                          type="button"
                          onClick={() => setTitleExpanded((expanded) => !expanded)}
                          aria-expanded={titleExpanded}
                          aria-controls="downloadit-youtube-title"
                          className="mt-1 inline-flex min-h-[28px] items-center text-[12px] font-semibold text-primary-strong transition-colors hover:text-primary"
                        >
                          {titleExpanded ? "Show less" : "Show more"}
                        </button>
                      )}
                      <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-fg-muted">
                        {result.author?.displayName && (
                          <span className="min-w-0 break-words">{result.author.displayName}</span>
                        )}
                        {result.duration ? (
                          <span className="shrink-0 whitespace-nowrap">{formatDuration(result.duration)}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.07em]"
                        style={{ background: "var(--primary-light)", color: "var(--primary-strong)" }}
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--primary)" }} />
                        YouTube {result.qualities[0] ? `${result.qualities[0].height}p available` : "video"}
                      </span>
                      <span className="text-[11px] text-fg-subtle">Public video</span>
                    </div>

                    <div className="grid min-w-0 grid-cols-1 items-stretch gap-3 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                      <div
                        className="box-border flex min-w-0 flex-col rounded-2xl p-3 sm:p-4"
                        style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
                      >
                      <div className="flex min-w-0 items-center gap-2">
                        <Music2
                          size={14}
                          strokeWidth={2}
                          className="shrink-0"
                          style={{ color: "var(--primary-strong)" }}
                        />
                        <h3 className="min-w-0 flex-1 text-[13px] font-bold text-fg">MP3 Audio</h3>
                        {audioOptions.length > 0 && (
                          <span className="shrink-0 text-[10px] font-medium text-fg-subtle">
                            {audioOptions.length} options
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] leading-[1.5] text-fg-muted">
                        {audioOptions.length > 0
                          ? "Choose an MP3 bitrate or M4A/AAC. Every file is encoded on the server."
                          : "This video has no audio track to extract."}
                      </p>

                      {audioOptions.length > 0 ? (
                        <div
                          className="mt-2.5 overflow-hidden rounded-xl border"
                          style={{ borderColor: "var(--border)", background: "var(--card)" }}
                        >
                          <table className="w-full table-fixed border-collapse text-left">
                            <thead style={{ background: "var(--primary-faint)" }}>
                              <tr>
                                <th className="w-[44px] px-1.5 py-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-subtle sm:w-[48px]">
                                  Type
                                </th>
                                <th className="px-1.5 py-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-subtle sm:px-2">
                                  Format
                                </th>
                                <th className="w-[82px] px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-subtle sm:w-[88px]">
                                  Action
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {audioOptions.map((option) => {
                                const key = audioOptionKey(option);
                                const isCurrent = download?.audioKey === key;
                                const rowPhase = isCurrent ? download?.phase : null;
                                const rowBusy = rowPhase === "preparing" || rowPhase === "downloading";
                                const rowDone = rowPhase === "done";
                                const rowError = rowPhase === "error";
                                const rowProgress =
                                  rowPhase === "downloading" ? progressPct : null;

                                return (
                                  <tr key={key} data-audio-key={key}>
                                    <td className="px-1.5 py-1">
                                      <span className="block text-[10.5px] font-semibold text-fg-muted">
                                        {option.format === "m4a" ? "M4A" : "MP3"}
                                      </span>
                                    </td>
                                    <td className="px-1.5 py-1 sm:px-2">
                                      <span className="block truncate text-[11.5px] font-semibold text-fg">
                                        {option.format === "m4a" ? (
                                          <>
                                            <span className="sm:hidden">AAC · {option.bitrateKbps}k</span>
                                            <span className="hidden sm:inline">
                                              AAC · {option.bitrateKbps} kbps
                                            </span>
                                          </>
                                        ) : (
                                          `${option.bitrateKbps} kbps`
                                        )}
                                      </span>
                                    </td>
                                    <td className="px-2 py-1 text-right">
                                      <button
                                        type="button"
                                        onClick={() => void startDownload(option.format, option.bitrateKbps)}
                                        disabled={downloading}
                                        data-audio-key={key}
                                        aria-label={`${
                                          rowBusy ? "Downloading" : rowError ? "Retry" : rowDone ? "Saved" : "Download"
                                        } ${audioOptionLabel(option)}`}
                                        className="gradient-btn h-9 min-h-[36px] w-full justify-center whitespace-nowrap rounded-[10px] text-[10px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                                        style={{ padding: "0 4px", gap: 3, borderRadius: 10, boxShadow: "none" }}
                                      >
                                        {rowBusy ? (
                                          <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
                                        ) : rowDone ? (
                                          <CheckCircle2 className="h-3 w-3 shrink-0" />
                                        ) : rowError ? (
                                          <AlertCircle className="h-3 w-3 shrink-0" />
                                        ) : (
                                          <DownloadIcon className="h-3 w-3 shrink-0" />
                                        )}
                                        {rowBusy ? (
                                          rowProgress !== null ? `${rowProgress}%` : "…"
                                        ) : rowDone ? (
                                          "Saved"
                                        ) : rowError ? (
                                          "Retry"
                                        ) : (
                                          <>
                                            <span className="sm:hidden">Save</span>
                                            <span className="hidden sm:inline">Download</span>
                                          </>
                                        )}
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : null}

                      {isAudioDownload ? renderDownloadStatus() : null}
                    </div>

                    <div
                      className="box-border flex min-w-0 flex-col rounded-2xl p-3 sm:p-4"
                      style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <VideoIcon
                          size={14}
                          strokeWidth={2}
                          className="shrink-0"
                          style={{ color: "var(--primary-strong)" }}
                        />
                        <h3 className="min-w-0 flex-1 text-[13px] font-bold text-fg">MP4 Video</h3>
                        <span className="shrink-0 text-[10px] font-medium text-fg-subtle">Video + audio</span>
                      </div>
                      <div className="flex flex-1 flex-col justify-center py-3">
                        <label
                          className="block text-[11px] font-medium text-fg-muted"
                          htmlFor="downloadit-youtube-quality"
                        >
                          Quality
                        </label>
                        <div className="relative mt-1">
                          <select
                            id="downloadit-youtube-quality"
                            value={quality ?? ""}
                            onChange={(event) => setQuality(Number(event.target.value) || null)}
                            disabled={downloading || result.qualities.length === 0}
                            className="box-border h-10 w-full min-w-0 appearance-none rounded-lg border px-3 pr-8 text-[13px] font-semibold text-fg focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:opacity-50"
                            style={{ borderColor: "var(--border)", background: "var(--card)" }}
                          >
                            {result.qualities.length === 0 && <option value="">No video quality</option>}
                            {result.qualities.map((item) => (
                              <option key={item.height} value={item.height}>
                                {item.label}
                                {item.fps && item.fps >= 50 ? ` · ${item.fps}fps` : ""}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            size={14}
                            aria-hidden="true"
                            className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle"
                          />
                        </div>
                        <p className="mt-1.5 text-[11px] leading-[1.5] text-fg-muted">
                          Video is merged with its audio track when needed.
                        </p>
                      </div>
                      <div className="pt-3">
                        <button
                          type="button"
                          onClick={() => void startDownload("mp4")}
                          disabled={downloading || quality === null}
                          data-mp4-download
                          className="gradient-btn h-11 min-h-[44px] w-full whitespace-nowrap text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                          style={{ padding: "0 10px" }}
                        >
                          {download?.kind === "mp4" && download.phase === "error" ? (
                            <>
                              <DownloadIcon className="h-4 w-4 shrink-0" />
                              Try video again
                            </>
                          ) : (
                            <>
                              <VideoIcon className="h-4 w-4 shrink-0" />
                              {videoLabel}
                            </>
                          )}
                        </button>
                        {isVideoDownload ? renderDownloadStatus() : null}
                      </div>
                    </div>
                    </div>
                  </div>
                </div>

                <div
                  className="flex flex-col gap-2 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 lg:px-6"
                  style={{ borderColor: "var(--border)" }}
                >
                  <p className="max-w-[760px] text-[11px] leading-[1.5] text-fg-subtle">
                    Files are prepared on the server, then sent to this device. Availability depends on the public
                    video, and nothing is stored after the transfer.
                  </p>
                  <button
                    type="button"
                    onClick={handleNew}
                    disabled={downloading}
                    className="inline-flex min-h-[40px] shrink-0 items-center self-start rounded-xl border border-border px-3.5 text-[12px] font-semibold text-fg transition-colors hover:bg-primary-light hover:text-primary disabled:opacity-50 sm:self-auto"
                    style={{ background: "var(--bg)" }}
                  >
                    New
                  </button>
                </div>
              </div>
            </div>
          )}

          {state === "ERROR" && error && (
            <div
              ref={errorRef}
              className="mx-auto mt-6 w-full max-w-[720px] scroll-mt-[calc(80px+env(safe-area-inset-top,0px))] sm:mt-10 sm:px-5"
            >
              <div
                id="downloadit-youtube-error"
                className="animate-fade-in-up rounded-[20px] p-5 text-center sm:p-8"
                style={{ border: "1px solid rgba(220,38,38,0.15)", background: "var(--danger-light)" }}
                role="alert"
              >
                <div
                  className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
                  style={{ background: "rgba(220,38,38,0.1)" }}
                >
                  <AlertCircle className="h-6 w-6 text-danger" />
                </div>
                <p className="break-words text-sm font-medium text-danger">{error}</p>
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={busy || downloading}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-danger/20 bg-white px-5 py-2.5 text-sm font-medium text-danger transition-colors hover:bg-danger-light disabled:opacity-50"
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
