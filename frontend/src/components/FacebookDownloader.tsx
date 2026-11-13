"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, Clipboard, Download as DownloadIcon, Link as LinkIcon, Loader2, Sparkles, X } from "lucide-react";
import { resolveFacebookUrl, type ResolveData, type ResolveResponse } from "@/services/api";
import { trackEvent } from "@/lib/analytics";
import { useAutoScrollFlow, type FlowStatus } from "@/hooks/useAutoScrollFlow";

const MediaResult = dynamic(() => import("./ResultPanel").then((module) => module.MediaResult), {
  loading: () => (
    <div className="mx-auto mt-6 w-full max-w-[720px] sm:mt-10 sm:px-5" aria-hidden="true">
      <div className="rounded-[20px] p-5 sm:p-8 animate-shimmer" style={{ minHeight: "320px" }} />
    </div>
  ),
});

interface Props {
  badge: string;
  titleA: string;
  titleB: string;
  subtitle: string;
  placeholder: string;
  buttonLabel?: string;
  benefits: string[];
  resolveUrl?: (url: string, signal?: AbortSignal) => Promise<ResolveResponse>;
  inputLabel?: string;
  platformName?: string;
  resultMode?: "video" | "audio" | "auto";
}

export default function FacebookDownloader({
  badge,
  titleA,
  titleB,
  subtitle,
  placeholder,
  buttonLabel,
  benefits,
  resolveUrl = resolveFacebookUrl,
  inputLabel = "Facebook video URL",
  platformName = "Facebook",
  resultMode = "video",
}: Props) {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<ResolveData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  const requestSeqRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { anchorRef, notifyTransition, scrollToAnchor, blurForKeyboard } = useAutoScrollFlow();
  const [flowStatus, setFlowStatus] = useState<FlowStatus | null>(null);
  const resultScrollDoneRef = useRef(false);

  useEffect(() => () => requestRef.current?.abort(), []);

  useEffect(() => {
    if (flowStatus) notifyTransition(flowStatus, requestSeqRef.current);
  }, [flowStatus, notifyTransition]);

  useEffect(() => {
    if (flowStatus !== "success" || !result) return;
    const anchor = anchorRef.current;
    if (!anchor || typeof ResizeObserver === "undefined") return;

    let completed = false;
    const scrollAfterRender = (): void => {
      if (completed || resultScrollDoneRef.current || anchor.getBoundingClientRect().height < 200) return;
      completed = true;
      resultScrollDoneRef.current = true;
      observer.disconnect();
      scrollToAnchor();
    };
    const observer = new ResizeObserver(scrollAfterRender);
    observer.observe(anchor);
    requestAnimationFrame(scrollAfterRender);
    return () => observer.disconnect();
  }, [anchorRef, flowStatus, result, scrollToAnchor]);

  function clear() {
    requestRef.current?.abort();
    requestRef.current = null;
    setUrl("");
    setResult(null);
    setError(null);
    setBusy(false);
    setFlowStatus(null);
    resultScrollDoneRef.current = false;
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  async function paste() {
    try {
      const value = await navigator.clipboard.readText();
      if (value) {
        setUrl(value);
        setResult(null);
        setError(null);
        trackEvent("paste_link", { platform: platformName });
      }
    } catch {
      inputRef.current?.focus();
    }
  }

  async function submit(event?: React.FormEvent) {
    event?.preventDefault();
    if (!url.trim() || busy) return;

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    requestSeqRef.current += 1;
    resultScrollDoneRef.current = false;
    setBusy(true);
    setError(null);
    setResult(null);
    setFlowStatus("loading");
    blurForKeyboard();

    try {
      const response = await resolveUrl(url.trim(), controller.signal);
      if (response.success) {
        setResult(response.data);
        setFlowStatus("success");
        trackEvent("get_media", { platform: platformName });
      } else {
        setError(response.error.message);
        setFlowStatus("error");
        trackEvent("error_shown", { platform: platformName });
      }
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === "AbortError") return;
      setError("We could not reach the downloader. Please try again.");
      setFlowStatus("error");
      trackEvent("error_shown", { platform: platformName });
    } finally {
      if (requestRef.current === controller) setBusy(false);
    }
  }

  return (
    <>
    <section
      id="hero"
      className="hero-section tool-hero relative overflow-hidden scroll-mt-24"
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
        <div className="mx-auto flex w-full max-w-[840px] min-w-0 flex-col items-center text-center">
          <div
            className="mb-4 inline-flex max-w-full items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold tracking-wide text-fg-muted sm:mb-5 sm:gap-2 sm:px-4 sm:text-xs"
            style={{ background: "var(--card)", boxShadow: "var(--shadow-card)", border: "1px solid var(--border)" }}
          >
            <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-accent" />
            <Sparkles size={14} color="var(--accent)" strokeWidth={2} className="shrink-0" />
            <span className="truncate">{badge}</span>
          </div>

          <h1 className="max-w-full text-balance break-words" style={{ lineHeight: 1.12 }}>
            <span
              className="hero-title-a block text-balance break-words text-[32px] font-extrabold tracking-tight text-fg sm:text-[42px]"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              {titleA}
            </span>
            <span
              className="hero-title-b block text-balance break-words text-[28px] font-semibold italic sm:text-[38px]"
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

          <p className="hero-subtitle mx-auto mt-4 max-w-2xl text-[16px] leading-[1.65] text-fg-muted">{subtitle}</p>

          <div className="mt-5 sm:mt-6 w-full max-w-[760px] mx-auto" style={{ marginInline: "auto" }}>
            <form onSubmit={submit} className="relative w-full min-w-0" noValidate>
              <div
                className="url-card rounded-[20px] p-2.5 transition-shadow focus-within:ring-2 focus-within:ring-primary/25"
                style={{
                  background: "var(--card)",
                  boxShadow: "var(--shadow-card), 0 0 40px rgba(124,77,245,0.06)",
                  border: "1px solid var(--border)",
                }}
              >
                <div className="hidden sm:flex sm:flex-row sm:items-center sm:justify-center sm:gap-2">
                <div className="relative min-w-0 flex-1">
                  <LinkIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-fg-subtle" />
                  <input
                    ref={inputRef}
                    name="media-url"
                    type="text"
                    value={url}
                    onChange={(event) => {
                      setUrl(event.target.value);
                      setResult(null);
                      setError(null);
                    }}
                    placeholder={placeholder}
                    className="h-13 w-full rounded-xl border-0 bg-transparent pl-12 pr-12 text-[16px] font-medium text-fg placeholder:text-fg-subtle focus:outline-none"
                    aria-label={inputLabel}
                    aria-invalid={error ? true : undefined}
                    autoComplete="off"
                    spellCheck={false}
                    disabled={busy}
                  />
                  {url && !busy && (
                    <button type="button" onClick={clear} className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-primary-light hover:text-primary" aria-label="Clear URL">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <button type="button" onClick={() => void paste()} disabled={busy} className="flex h-13 shrink-0 items-center gap-1.5 rounded-xl border border-border px-3.5 text-xs font-semibold text-fg transition-colors hover:bg-primary-light hover:text-primary disabled:opacity-50" style={{ background: "var(--bg)" }}>
                  <Clipboard className="h-3.5 w-3.5" />
                  Paste
                </button>
                <button type="submit" disabled={busy || !url.trim()} className="gradient-btn h-13 shrink-0 px-7 text-[16px]">
                  {busy ? <><Loader2 className="h-5 w-5 animate-spin" />Processing…</> : <><DownloadIcon className="h-5 w-5" /><span>{buttonLabel || "Get Video"}</span></>}
                </button>
              </div>

              <div className="flex flex-col gap-2 sm:hidden">
                <div className="relative">
                  <LinkIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-fg-subtle" />
                  <input
                    ref={inputRef}
                    name="media-url-mobile"
                    type="text"
                    value={url}
                    onChange={(event) => {
                      setUrl(event.target.value);
                      setResult(null);
                      setError(null);
                    }}
                    placeholder={placeholder}
                    className="h-13 w-full rounded-xl border-0 bg-transparent pl-12 pr-20 text-[16px] font-medium text-fg placeholder:text-fg-subtle focus:outline-none"
                    aria-label={inputLabel}
                    autoComplete="off"
                    spellCheck={false}
                    disabled={busy}
                  />
                  {url && !busy && (
                    <button type="button" onClick={clear} className="absolute right-3 top-1/2 flex h-8 -translate-y-1/2 items-center gap-1 rounded-xl border border-border px-2.5 text-xs font-medium text-fg-muted" style={{ background: "var(--bg)" }} aria-label="Clear URL">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="url-actions flex min-w-0 flex-col gap-2 w-full">
                  <button type="button" onClick={() => void paste()} disabled={busy} className="flex h-12 min-h-[48px] w-full min-w-0 items-center justify-center gap-1.5 rounded-xl border border-border px-3 text-[14px] font-semibold text-fg transition-colors hover:bg-primary-light hover:text-primary disabled:opacity-50" style={{ background: "var(--bg)" }} aria-label="Paste">
                    <Clipboard className="h-4 w-4 shrink-0" />
                    <span className="btn-label truncate">Paste</span>
                  </button>
                  <button type="submit" disabled={busy || !url.trim()} className="gradient-btn flex h-12 min-h-[48px] w-full min-w-0 items-center justify-center gap-2 px-4 text-[16px]">
                    {busy ? <><Loader2 className="h-5 w-5 animate-spin" />Processing…</> : <><DownloadIcon className="h-5 w-5" /><span>{buttonLabel || "Get Video"}</span></>}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>

          {flowStatus && (
            <div ref={anchorRef} className="scroll-mt-[calc(80px+env(safe-area-inset-top,0px))]" aria-live="polite" aria-atomic="true">
              {busy && (
                <div className="mt-6 w-full max-w-[720px] rounded-[20px] p-5 text-center sm:p-8" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" aria-hidden="true" />
                  <p className="mt-3 text-sm font-medium text-fg-muted">Finding your {platformName} video…</p>
                </div>
              )}
              {error && (
                <div className="mt-6 w-full max-w-[720px] rounded-[20px] p-5 text-center sm:p-8" style={{ background: "var(--card)", border: "1px solid var(--border)" }} role="alert">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "rgba(220,38,38,0.1)" }}>
                    <AlertCircle className="h-6 w-6 text-danger" />
                  </div>
                  <p className="break-words text-sm font-medium text-danger">{error}</p>
                  <button type="button" onClick={() => void submit()} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-danger/20 bg-white px-5 py-2.5 text-sm font-medium text-danger transition-colors hover:bg-danger-light">
                    Try again
                  </button>
                </div>
              )}
              {result && (
                <MediaResult result={result} mode={resultMode === "auto" ? result.media[0]?.type === "audio" ? "audio" : "video" : resultMode} variant={platformName.toLowerCase() === "twitter/x" ? "twitter" : platformName.toLowerCase() === "threads" ? "threads" : "facebook"} onReset={clear} />
              )}
            </div>
          )}
        </div>
      </div>
    </section>

    {/* Trust indicators rendered outside the hero so they appear below the fold */}
    <div className="mx-auto w-full max-w-[840px] px-4 sm:px-6 lg:px-8 xl:px-12">
      <div className="mx-auto flex max-w-[840px] flex-wrap items-center justify-center gap-x-4 gap-y-1.5 px-1 pb-6 pt-3 text-[12px] text-fg-subtle sm:gap-x-5 sm:pb-8 sm:pt-4 sm:text-[14px]">
        {benefits.map((benefit) => (
          <span key={benefit} className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
            {benefit}
          </span>
        ))}
      </div>
    </div>
    </>
  );
}
