"use client";

// Post-resolve UI (video/audio players + result card). Split from
// HeroDownloader so none of it ships in the initial page JavaScript.
// Loaded on demand when the first resolve succeeds; the hero form,
// progress ring, and error states stay in the critical bundle.
import { useState, useCallback, useRef, useEffect } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import {
  Download as DownloadIcon,
  Pause,
  Play,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Image as ImageIcon,
  X,
} from "lucide-react";
import {
  resolveInstagramUrl,
  getStreamUrl,
  getDownloadUrl,
  getApiBase,
  logApiFailure,
  refreshMediaItemUrl,
  stripStreamRetryParam,
  type MediaItem,
  type ResolveData,
} from "@/services/api";
import { useLanguage } from "@/i18n";
import type { Strings } from "@/i18n/types";


function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
    "&mdash;": "\u2014",
    "&ndash;": "\u2013",
    "&lsquo;": "\u2018",
    "&rsquo;": "\u2019",
    "&ldquo;": "\u201c",
    "&rdquo;": "\u201d",
    "&bull;": "\u2022",
    "&hellip;": "\u2026",
  };
  let decoded = text;
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.split(entity).join(char);
  }
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
    String.fromCodePoint(parseInt(hex, 16))
  );
  decoded = decoded.replace(/&#(\d+);/g, (_, dec) =>
    String.fromCodePoint(parseInt(dec, 10))
  );
  return decoded;
}

function getContentTypeLabel(type: string, badges: Strings["typeBadges"]): string {
  const labels: Record<string, string> = {
    REEL: badges.reel,
    POST: badges.post,
    CAROUSEL: badges.carousel,
    STORY: badges.story,
    VIDEO: badges.video,
    PHOTO: badges.photo,
    AUDIO: badges.content,
    UNKNOWN: badges.content,
  };
  return labels[type] || badges.content;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (hours > 0) return `${hours}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function sanitizeHandle(username: string | null | undefined): string {
  if (!username) return "downloadit";
  return username.replace(/[^a-zA-Z0-9._-]/g, "").replace(/^\.+|\.+$/g, "").slice(0, 60) || "downloadit";
}

function aspectRatioStyle(width?: number | null, height?: number | null, fallback = "9/16"): CSSProperties {
  if (width && height && width > 0 && height > 0) {
    return { aspectRatio: `${width} / ${height}` };
  }
  return { aspectRatio: fallback };
}

function VideoPlayer({ src, poster, mediaType, width, height, audioSrc, onDurationChange, onResolution, onRequestFreshMedia }: { src: string; poster?: string; mediaType?: string; width?: number | null; height?: number | null; audioSrc?: string | null; onDurationChange?: (duration: number) => void; onResolution?: (w: number, h: number) => void; onRequestFreshMedia?: (failedSrc: string) => Promise<boolean> }) {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  // Diagnostics mirror the real element (never drive it) and are asserted by
  // the DOM checks in tests. No UI reads them, so they cost no re-renders.
  const [mediaError, setMediaError] = useState(false);
  // Loading state: true until the element reports usable data (loadedmetadata
  // covers the poster frame; canplay/loadeddata cover playback readiness).
  const [loading, setLoading] = useState(true);
  // Preview always plays the backend streaming endpoint (proxy-only: the raw
  // Instagram CDN URL is never mounted). Recovery is bounded and ordered:
  // first one same-URL retry with a cache-buster (transient failures), then
  // exactly one parent-owned fresh resolve (expired signed URLs), then the
  // honest unavailable tile. No path ever loops.
  const triedFallbackRef = useRef(false);
  const freshTriedRef = useRef(false);
  const mountedRef = useRef(true);
  const [currentSrc, setCurrentSrc] = useState(src);
  const currentSrcRef = useRef(currentSrc);
  useEffect(() => {
    currentSrcRef.current = currentSrc;
  });
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  // Latest callbacks, so the media listeners below attach exactly once for the
  // lifetime of the element instead of being torn down and re-added whenever a
  // parent render passes new inline closures.
  const onDurationChangeRef = useRef(onDurationChange);
  const onResolutionRef = useRef(onResolution);
  const onRequestFreshMediaRef = useRef(onRequestFreshMedia);
  useEffect(() => {
    onDurationChangeRef.current = onDurationChange;
    onResolutionRef.current = onResolution;
    onRequestFreshMediaRef.current = onRequestFreshMedia;
  });

  // Reflect element state onto the wrapper as data-* attributes. This is a
  // read-only mirror of the HTMLVideoElement, so React state can never drift
  // out of sync with real playback.
  const syncState = useCallback(() => {
    const v = videoRef.current;
    const host = playerRef.current;
    if (!v || !host) return;
    host.dataset.paused = String(v.paused);
    host.dataset.ended = String(v.ended);
    host.dataset.playing = String(!v.paused && !v.ended);
    host.dataset.muted = String(v.muted);
    host.dataset.volume = v.volume.toFixed(2);
    host.dataset.currentTime = v.currentTime.toFixed(2);
    host.dataset.duration = Number.isFinite(v.duration) ? v.duration.toFixed(2) : "0";
    host.dataset.controls = "native";
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    // Audio: the element is never muted and never has its volume forced to 0.
    // Playback is started from the Preview button's real click (a user
    // gesture), which satisfies the autoplay policy, so audible playback is
    // permitted from the first frame. No state here pretends audio is on — the
    // browser's own policy is the only thing allowed to refuse it.
    v.muted = false;
    v.defaultMuted = false;
    v.volume = 1;

    // Single set of listeners for the whole element lifetime: no duplicated
    // play/pause/ended handlers and no listener churn per render.
    const onPlay = () => syncState();
    const onPlaying = () => syncState();
    const onPause = () => syncState();
    const onTime = () => syncState();
    const onVolume = () => syncState();
    const onSeeked = () => syncState();
    const onLoadStart = () => {
      setLoading(true);
    };
    const onMeta = () => {
      const nextDuration = Number.isFinite(v.duration) && v.duration >= 0 ? v.duration : 0;
      onDurationChangeRef.current?.(nextDuration);
      if (v.videoWidth > 0 && v.videoHeight > 0) {
        onResolutionRef.current?.(v.videoWidth, v.videoHeight);
      }
      // A source switch resets the audio properties to their defaults; reassert
      // the audible state for the newly loaded media.
      v.muted = false;
      v.volume = 1;
      setLoading(false);
      syncState();
    };
    const onReady = () => {
      setLoading(false);
      syncState();
    };
    const onEnd = () => {
      // End of media: stop at the end, stay paused, let the native control bar
      // reappear showing Play. No restart, no loop, no play() call — the Reel
      // must not play itself again. currentTime is deliberately left at the
      // end so the user sees the final frame.
      syncState();
    };
    const onError = () => {
      // Production-safe stream diagnostic: backend host, endpoint, and media
      // error code only. The proxied stream URL's signed query is never logged.
      logApiFailure({
        requestType: "media-stream",
        requestUrl: `${getApiBase()}/api/stream`,
        status: null,
        error: new Error(`media-stream-error-${v.error?.code ?? "unknown"}`),
      });
      if (process.env.NODE_ENV === "development") {
        try {
          console.debug("[Downloadit Preview] video error", {
            mediaType: mediaType ?? "unknown",
            streamHost: new URL(currentSrc).hostname,
            retried: triedFallbackRef.current,
            mediaErrorCode: v.error?.code ?? null,
            mediaErrorMessage: v.error?.message || null,
            readyState: v.readyState,
            networkState: v.networkState,
          });
        } catch {
          /* ignore logging failures */
        }
      }
      // Bounded recovery, in order:
      // 1. Same proxy URL with a cache-buster (transient failure; the backend
      //    already retried with a freshly resolved URL server-side when the
      //    CDN reported expiry).
      // 2. Exactly one parent-owned fresh resolve (the signed CDN URL itself
      //    is stale — the parent swaps in the fresh media URL and remounts).
      // 3. Anything else is genuine → show the unavailable state. No loops.
      if (!triedFallbackRef.current) {
        triedFallbackRef.current = true;
        setCurrentSrc((prev) => {
          const base = stripStreamRetryParam(prev);
          const bust = base.includes("?") ? "&" : "?";
          return `${base}${bust}_retry=${Date.now()}`;
        });
        return;
      }
      if (!freshTriedRef.current && onRequestFreshMediaRef.current) {
        freshTriedRef.current = true;
        const failed = currentSrcRef.current;
        let pending: Promise<boolean>;
        try {
          pending = onRequestFreshMediaRef.current(failed);
        } catch {
          if (mountedRef.current) {
            setLoading(false);
            setMediaError(true);
          }
          return;
        }
        pending.then(
          (recovered) => {
            if (!mountedRef.current) return;
            // Recovered means the parent swapped in a fresh media URL and this
            // element is about to remount on it — keep the spinner until then.
            if (!recovered) {
              setLoading(false);
              setMediaError(true);
            }
          },
          () => {
            if (!mountedRef.current) return;
            setLoading(false);
            setMediaError(true);
          }
        );
        return;
      }
      setLoading(false);
      setMediaError(true);
    };
    v.addEventListener("play", onPlay);
    v.addEventListener("playing", onPlaying);
    v.addEventListener("pause", onPause);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("loadeddata", onReady);
    v.addEventListener("canplay", onReady);
    v.addEventListener("ended", onEnd);
    v.addEventListener("volumechange", onVolume);
    v.addEventListener("seeked", onSeeked);
    // `loadstart` only drives the spinner; a source switch is not an error.
    v.addEventListener("loadstart", onLoadStart);
    v.addEventListener("error", onError);
    // `abort` accompanies source switches/unmounts and carries no failure
    // signal on its own, so it never triggers the fallback or error state.
    syncState();

    // Cleanup: remove every listener and stop playback so the Reel can never
    // keep playing (or hold its decoder) after the Result card goes away.
    // The `src` attribute is deliberately NOT removed: React does not re-apply
    // an unchanged `src` prop, and StrictMode's double-invoked effects would
    // then leave the element with no source at all (readyState 0, nothing
    // loads). Detaching the element from the DOM already releases its network
    // activity.
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("loadeddata", onReady);
      v.removeEventListener("canplay", onReady);
      v.removeEventListener("ended", onEnd);
      v.removeEventListener("volumechange", onVolume);
      v.removeEventListener("seeked", onSeeked);
      v.removeEventListener("loadstart", onLoadStart);
      v.removeEventListener("error", onError);
      try {
        v.pause();
      } catch {
        /* element may already be detached */
      }
    };
  }, [currentSrc, mediaType, syncState]);

  // Instagram publishes a Reel as SPLIT TRACKS: a video-only MP4 plus a
  // separate audio-only MP4 for the same clip. The backend pairs them, and the
  // preview plays both from ONE <video> that keeps the native controls and
  // stays the only visible player. The companion <audio> is invisible and has
  // no controls of its own: the video's native volume/mute remains
  // authoritative and is mirrored onto it, so the speaker button still really
  // mutes the sound instead of leaving a hidden track playing.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const v = videoRef.current;
    // Fixed, generous-enough threshold: absorbs ordinary decode jitter without
    // re-seeking the audio on every timeupdate tick.
    const DRIFT_TOLERANCE = 0.35;
    const mirrorVolume = () => {
      if (!v) return;
      a.volume = v.volume;
      a.muted = v.muted;
    };
    const alignToVideo = (force: boolean) => {
      if (!v || !Number.isFinite(v.currentTime)) return false;
      if (force || Math.abs(a.currentTime - v.currentTime) > DRIFT_TOLERANCE) {
        try {
          a.currentTime = v.currentTime;
          return true;
        } catch {
          // Seeking before metadata is legal to fail; fall through to play.
        }
      }
      return false;
    };
    // Called from the video's own play event, i.e. still inside the user
    // gesture that started playback, which is what lets the browser permit
    // audible playback without a second gesture.
    const playAudio = () => {
      mirrorVolume();
      a.play().catch((error: unknown) => {
        // A policy refusal is actionable, not background noise: the user can
        // press Play/Pause or Unmute, and those real gestures retry below.
        // Never log the media URL; only the endpoint/host/category.
        logApiFailure({
          requestType: "media-stream",
          requestUrl: `${getApiBase()}/api/stream`,
          status: null,
          error,
        });
      });
    };
    const startAudio = () => {
      alignToVideo(true);
      playAudio();
    };
    const onVideoPlay = () => startAudio();
    const onVideoPause = () => a.pause();
    const onVideoEnd = () => a.pause();
    const onVideoSeeked = () => alignToVideo(true);
    const onVideoTime = () => alignToVideo(false);
    const onVolumeChange = () => {
      mirrorVolume();
      // A successful gesture on the native speaker control is itself user
      // activation. If autoplay policy had blocked the companion track, this
      // retries it; if the video is paused, the companion stays paused.
      if (v && !v.paused && !v.ended && a.paused) startAudio();
    };
    // The audio can finish loading after the video is already running. Align
    // without forcing when already close: a forced seek from inside canplay
    // can itself retrigger canplay and turn one blocked play() into a loop.
    const onAudioReady = () => {
      if (alignToVideo(false)) return;
      if (v && !v.paused && !v.ended) playAudio();
    };

    v?.addEventListener("play", onVideoPlay);
    v?.addEventListener("playing", onVideoPlay);
    v?.addEventListener("pause", onVideoPause);
    v?.addEventListener("ended", onVideoEnd);
    v?.addEventListener("seeked", onVideoSeeked);
    v?.addEventListener("timeupdate", onVideoTime);
    v?.addEventListener("volumechange", onVolumeChange);
    a.addEventListener("loadedmetadata", onAudioReady);
    a.addEventListener("canplay", onAudioReady);

    return () => {
      v?.removeEventListener("play", onVideoPlay);
      v?.removeEventListener("playing", onVideoPlay);
      v?.removeEventListener("pause", onVideoPause);
      v?.removeEventListener("ended", onVideoEnd);
      v?.removeEventListener("seeked", onVideoSeeked);
      v?.removeEventListener("timeupdate", onVideoTime);
      v?.removeEventListener("volumechange", onVolumeChange);
      a.removeEventListener("loadedmetadata", onAudioReady);
      a.removeEventListener("canplay", onAudioReady);
      try {
        a.pause();
      } catch {
        /* element may already be detached */
      }
    };
  }, [audioSrc]);

  if (mediaError) {
    return (
      <div className="flex aspect-[9/16] w-full flex-col items-center justify-center gap-2 rounded-[20px] bg-black/5">
        <ImageIcon className="h-10 w-10" style={{ color: "var(--fg-subtle)", opacity: 0.4 }} />
        <p className="text-xs" style={{ color: "var(--fg-subtle)" }}>{t.result.previewUnavailable}</p>
      </div>
    );
  }

  return (
    <div
      ref={playerRef}
      className="media-mount relative overflow-hidden rounded-[20px]"
      style={{ background: "#0a0a14" }}
      data-paused="true"
      data-ended="false"
      data-playing="false"
      data-muted="false"
      data-volume="1.00"
      data-controls="native"
    >
      <div className="relative w-full media-frame" style={aspectRatioStyle(width, height, "9/16")}>
        {/* ONE control system: the browser's native video controls. The custom
            control bar that used to sit below this element (duplicate progress
            bar, time, mute and fullscreen buttons) was removed, so play/pause,
            seek, volume/mute, fullscreen and the auto-hide/show behaviour are
            all handled natively against the real element. There is deliberately
            no onClick here: the native bar owns the play/pause interaction, and
            a click handler on the video surface fought with it. */}
        <video
          ref={videoRef}
          src={currentSrc}
          poster={poster || undefined}
          controls
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-contain"
        />

        {/* Paired audio track for split-track Reels. Hidden and control-less on
            purpose: this is the same clip's audio, driven by the video element
            above, never a second player the user could see or unmute alone. */}
        {audioSrc && <audio ref={audioRef} src={audioSrc} preload="auto" className="hidden" />}

        {loading && !mediaError && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <svg className="h-8 w-8 animate-spin text-white/60" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
              <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

function AudioPlayer({ src, onDurationChange }: { src: string; onDurationChange?: (duration: number) => void }) {
  const { t } = useLanguage();
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => setCurrent(a.currentTime);
    const onMeta = () => {
      const nextDuration = Number.isFinite(a.duration) && a.duration >= 0 ? a.duration : 0;
      setDuration(nextDuration);
      onDurationChange?.(nextDuration);
    };
    const onEnd = () => { setPlaying(false); setCurrent(0); };
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnd);
    };
    // onDurationChange is a stable parent setter; re-subscribing on each
    // render would churn listeners for no benefit (same as VideoPlayer).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  }, []);

  const handleSeek = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      const bar = progressRef.current;
      const a = audioRef.current;
      if (!bar || !a || !duration) return;
      const rect = bar.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      a.currentTime = pct * duration;
    },
    [duration]
  );

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="media-mount overflow-hidden rounded-[20px]" style={{ background: "linear-gradient(145deg, #1a1028 0%, #0f0c1b 100%)" }}>
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />

      {/* Waveform + Play */}
      <div className="flex flex-col items-center justify-center gap-5 px-6 pt-8 pb-4">
        {/* Waveform bars */}
        <div className="flex items-end gap-[3px] h-16" aria-hidden="true">
          {Array.from({ length: 28 }).map((_, i) => {
            const baseHeight = 8 + Math.sin(i * 0.7) * 12 + Math.cos(i * 1.3) * 8;
            return (
              <div
                key={i}
                className="w-[3px] rounded-full waveform-bar"
                style={{
                  height: `${Math.max(4, baseHeight)}px`,
                  background: "var(--brand-gradient)",
                  opacity: 0.3,
                  animation: playing ? `wave-bounce 0.6s ease-in-out ${i * 0.04}s infinite alternate` : "none",
                }}
              />
            );
          })}
        </div>

        <button
          type="button"
          onClick={togglePlay}
          className="flex h-16 w-16 items-center justify-center rounded-full backdrop-blur-md transition-transform hover:scale-105 active:scale-95"
          style={{ background: "rgba(255,255,255,0.12)", border: "1.5px solid rgba(255,255,255,0.2)" }}
          aria-label={playing ? t.result.pauseAudio : t.result.playAudio}
        >
          {playing ? (
            <Pause className="h-6 w-6 text-white" fill="white" strokeWidth={0} />
          ) : (
            <Play className="ml-1 h-6 w-6 text-white" fill="white" strokeWidth={0} />
          )}
        </button>
      </div>

      {/* Progress */}
      <div className="px-4 pb-4">
        <div
          ref={progressRef}
          onClick={handleSeek}
          className="group relative h-1.5 w-full cursor-pointer rounded-full"
          style={{ background: "rgba(255,255,255,0.12)" }}
          role="slider"
          aria-label={t.result.audioProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ width: `${progress}%`, background: "var(--brand-gradient)" }}
          />
          <div
            className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white opacity-0 transition-opacity group-hover:opacity-100"
            style={{ left: `${progress}%`, background: "var(--primary)" }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[12px] font-medium tabular-nums text-white/60">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Media Result ─────────────────────────────────────────

interface MediaResultProps {
  result: ResolveData;
  mode: "video" | "audio";
  onReset: () => void;
}

function formatBytes(size: number | null | undefined): string {
  if (typeof size !== "number" || !isFinite(size) || size <= 0) return "Unknown";
  if (size < 1024) return `${size} B`;
  const units = ["KB", "MB", "GB"];
  let v = size / 1024;
  let u = 0;
  while (v >= 1024 && u < units.length - 1) { v /= 1024; u++; }
  return `${v >= 100 ? Math.round(v) : v.toFixed(1)} ${units[u]}`;
}

function formatResolution(w: number | null | undefined, h: number | null | undefined): string {
  if (typeof w === "number" && w > 0 && typeof h === "number" && h > 0) return `${w} × ${h}`;
  return "Unknown";
}

/**
 * True only for a directly playable remote video URL: a non-empty http(s)
 * string. Rejects javascript:/data:/blob: and other non-http(s) schemes so
 * an unsafe or empty value can never be mounted into a <video> element
 * (which would instantly error and show "Preview unavailable").
 */
function isPlayableVideoUrl(u: unknown): u is string {
  if (typeof u !== "string") return false;
  const v = u.trim();
  if (!v) return false;
  try {
    const parsed = new URL(v);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * A poster is only passed to <video> when it is a plausible remote image:
 * non-empty http(s) URL, never blob:/data:/javascript:. Query-signed CDN
 * URLs carry no file extension, so no extension is required.
 */
function isValidImagePoster(u: unknown): u is string {
  if (!isPlayableVideoUrl(u)) return false;
  const v = u.trim().toLowerCase();
  if (v.endsWith(".mp4") || v.includes(".mp4?") || v.includes(".mp4#")) return false;
  return true;
}

function formatMetaDuration(d: number | null | undefined, fallback: number | null): string {
  const v = typeof d === "number" && isFinite(d) && d > 0 ? d : (typeof fallback === "number" && isFinite(fallback) && fallback > 0 ? fallback : null);
  if (v === null) return "Unknown";
  return formatTime(v);
}

function extForMedia(m: { type: string; format?: string | null; url: string }): string {
  const f = (m.format || "").toLowerCase();
  if (m.type === "audio") return f === "m4a" ? "m4a" : "mp3";
  if (m.type === "video") return "mp4";
  if (f.includes("png")) return "png";
  if (f.includes("webp")) return "webp";
  if (f.includes("jpg") || f.includes("jpeg")) return "jpg";
  if (m.url.includes(".png")) return "png";
  if (m.url.includes(".webp")) return "webp";
  return "jpg";
}

function labelForMedia(m: { type: string; format?: string | null }): string {
  if (m.type === "audio") {
    const f = (m.format || "").toUpperCase();
    return f === "M4A" ? "M4A" : "MP3";
  }
  if (m.type === "video") return "MP4";
  const f = (m.format || "").toUpperCase();
  if (f === "JPG" || f === "JPEG") return "JPG";
  if (f === "PNG" || f === "WEBP" || f === "MP4") return f;
  return m.type === "image" ? "JPG" : "—";
}

export function MediaResult({ result, mode, onReset }: MediaResultProps) {
  const { t } = useLanguage();
  const [downloading, setDownloading] = useState<"idle" | "preparing" | "error">("idle");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(true);
  const [audioError, setAudioError] = useState<string | null>(null);
  // Real MP3 metadata: byte size from the downloaded blob, duration from the
  // audio element. Shown in the details tiles — never hardcoded.
  const [audioSize, setAudioSize] = useState<number | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  // Carousel navigation: one item visible at a time. When the
  // pasted URL carried `?img_index=N`, open the carousel on that slide
  // (clamped to the resolved items). MediaResult remounts per result, so the
  // initializer runs fresh for every new resolve.
  const [currentIndex, setCurrentIndex] = useState(() => {
    const s = result.startIndex;
    if (typeof s === "number" && Number.isFinite(s) && s > 0) {
      return Math.min(s, Math.max(0, result.media.length - 1));
    }
    return 0;
  });
  // Long captions are clamped with a Show more/less toggle.
  const [captionExpanded, setCaptionExpanded] = useState(false);
  // Real duration/resolution observed from the <video> element (never faked).
  const [realDuration, setRealDuration] = useState<number | null>(null);
  const [realResolution, setRealResolution] = useState<{ w: number; h: number } | null>(null);
  // Image-preview retry state (video uses VideoPlayer's own retry).
  // MediaResult remounts per result (parent key), so these reset naturally.
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);
  // Tracks the current slide's decode so the reserved-space loading state
  // shows until the bitmap is ready, then fades in (opacity only, no layout).
  const [imgLoaded, setImgLoaded] = useState(false);
  const imgRetriedRef = useRef(false);
  // Stable fallback message for the audio fetch below: reading it from a ref
  // keeps the fetch effect from re-running on language switches.
  const audioFallbackRef = useRef(t.result.audioErrorFallback);
  useEffect(() => {
    audioFallbackRef.current = t.result.audioErrorFallback;
  });

  // Refreshed media after the single stale-URL recovery: the item at the
  // current index carries the freshly resolved CDN URL (never the expired
  // one). Null until recovery succeeds. MediaResult remounts per result, so
  // this resets naturally for every new resolve.
  const [freshItems, setFreshItems] = useState<MediaItem[] | null>(null);
  const items = freshItems ?? result.media;
  const safeIndex = items.length === 0 ? 0 : Math.min(currentIndex, items.length - 1);
  const currentMedia = items[safeIndex] ?? null;
  const isAudio = mode === "audio";

  // URLs a recovery resolve was already attempted for (stripped of our own
  // cache-buster). One entry per failed media URL, shared by the video and
  // image paths: the fresh resolve runs at most once per stale URL, so the
  // preview can never turn into a resolve loop.
  const recoveryAttemptedRef = useRef<Set<string>>(new Set());

  /**
   * Single stale-media recovery: POST a fresh resolve that bypasses the
   * server's resolved-URL cache, swap the current item to the fresh CDN URL,
   * and report whether a remount with fresh bytes is coming. False means the
   * caller must show the honest unavailable state.
   */
  const recoverStaleMedia = useCallback(
    async (failedProxySrc: string): Promise<boolean> => {
      const base = stripStreamRetryParam(failedProxySrc);
      if (!base || recoveryAttemptedRef.current.has(base)) return false;
      recoveryAttemptedRef.current.add(base);
      const requestUrl = `${getApiBase()}/api/resolve`;
      let data;
      try {
        data = await resolveInstagramUrl(result.sourceUrl, undefined, { refresh: true });
      } catch (err) {
        logApiFailure({ requestType: "resolve-post", requestUrl, status: null, error: err });
        return false;
      }
      if (!data.success) {
        logApiFailure({
          requestType: "resolve-post",
          requestUrl,
          status: null,
          error: new Error(`media-refresh-${data.error.code}`),
        });
        return false;
      }
      const next = refreshMediaItemUrl(items, data.data.media, safeIndex);
      if (!next) return false;
      const freshItem = next[Math.min(safeIndex, next.length - 1)];
      recoveryAttemptedRef.current.add(
        stripStreamRetryParam(getStreamUrl(freshItem.url, result.sourceUrl))
      );
      // The image path caches its retry URL locally; drop it so the fresh
      // proxy URL takes effect on the next render.
      setImgSrc(null);
      setFreshItems(next);
      return true;
    },
    [result.sourceUrl, items, safeIndex]
  );

  // Frontend safety: NEVER display profile/avatar as Story media
  const isProfileImageUrlFrontend = (u: string) => {
    try {
      const url = new URL(u);
      const p = url.pathname.toLowerCase();
      const s = (url.search + url.hash).toLowerCase();
      if (p.includes("s150x150") || p.includes("s320x320") || p.includes("profile_pic") || p.includes("avatar")) return true;
      if (/\/t51\.[^/]+-19\//.test(p)) return true;
      if (s.includes("150x150") || s.includes("320x320")) return true;
      return false;
    } catch {
      return false;
    }
  };
  const isProfileMediaFrontend = Boolean(
    currentMedia &&
      (isProfileImageUrlFrontend(currentMedia.url) ||
        (currentMedia.width === 206 && currentMedia.height === 206) ||
        (currentMedia.type === "image" && currentMedia.width === 150 && currentMedia.height === 150))
  );
  const isStoryProfileFallback = result.type === "STORY" && isProfileMediaFrontend;
  // Carousel controls ONLY for real carousel posts. Reels, single videos,
  // single photos, stories and audio never show a counter/arrows —
  // even if the backend returned more than one media item for them.
  const isCarouselPost = !isAudio && (result.type === "CAROUSEL" || (result.type === "POST" && items.length > 1));
  const showCarouselNav = isCarouselPost && items.length > 1;

  const resetPerItemState = useCallback(() => {
    setImgSrc(null);
    setImgFailed(false);
    imgRetriedRef.current = false;
    setRealDuration(null);
    setRealResolution(null);
  }, []);

  // ── Carousel flicker fix: keep current image visible until next is preloaded ──
  // Stable container + Image() preload prevents white/black flash and layout shift.
  // Only `currentIndex` (hence currentMedia) is changed, and only after the
  // target src has loaded. Rapid clicks are de-duplicated via version counter.
  const carouselVersionRef = useRef(0);
  const carouselTargetRef = useRef<number | null>(null);

  const preloadAndSwitch = useCallback(
    (targetIndex: number) => {
      if (targetIndex < 0 || targetIndex >= items.length) return;
      const safe = Math.min(currentIndex, items.length - 1);
      if (targetIndex === safe && carouselTargetRef.current === null) return;
      const version = ++carouselVersionRef.current;
      carouselTargetRef.current = targetIndex;
      const targetMedia = items[targetIndex];
      if (!targetMedia || targetMedia.type === "video") {
        // Video slides are handled by VideoPlayer (remount is cheap and video
        // has its own poster); switch immediately without preload.
        setCurrentIndex(targetIndex);
        resetPerItemState();
        carouselTargetRef.current = null;
        return;
      }
      const targetSrc = getStreamUrl(targetMedia.url, result.sourceUrl);
      const img = new Image();
      img.onload = () => {
        if (carouselVersionRef.current !== version) return;
        // Switch only when target is decoded and cached → no flash
        setCurrentIndex(targetIndex);
        setImgSrc(null);
        setImgFailed(false);
        imgRetriedRef.current = false;
        // Do not reset video-only states abruptly for images
        carouselTargetRef.current = null;
      };
      img.onerror = () => {
        if (carouselVersionRef.current !== version) return;
        // Still switch to let retry/error UI appear, avoiding blank
        setCurrentIndex(targetIndex);
        setImgSrc(null);
        setImgFailed(false);
        imgRetriedRef.current = false;
        carouselTargetRef.current = null;
      };
      img.src = targetSrc;
    },
    [items, result.sourceUrl, currentIndex, resetPerItemState]
  );

  // Preload neighbours after a slide is displayed (instant next navigation)
  useEffect(() => {
    if (!isCarouselPost || items.length <= 1) return;
    const preload = (idx: number) => {
      if (idx < 0 || idx >= items.length) return;
      const m = items[idx];
      if (!m || m.type === "video") return;
      const src = getStreamUrl(m.url, result.sourceUrl);
      const img = new Image();
      img.src = src;
    };
    preload(safeIndex + 1);
    preload(safeIndex - 1);
  }, [safeIndex, isCarouselPost, items, result.sourceUrl]);

  // For audio mode: fetch the MP3 from the backend
  useEffect(() => {
    if (!isAudio) return;
    if (audioUrl || audioError) return;

    const controller = new AbortController();
    const API_BASE = getApiBase();
    const requestUrl = `${API_BASE}/api/audio`;
    const fallback = audioFallbackRef.current;

    fetch(requestUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: result.sourceUrl }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          logApiFailure({
            requestType: "audio-post",
            requestUrl,
            status: res.status,
            error: new Error(
              typeof body?.error?.code === "string" ? `audio-post-${body.error.code}` : "audio-post-http-error"
            ),
          });
          throw new Error(body?.error?.message || fallback);
        }
        const blob = await res.blob();
        if (Number.isFinite(blob.size) && blob.size > 0) setAudioSize(blob.size);
        setAudioUrl(URL.createObjectURL(blob));
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        logApiFailure({ requestType: "audio-post", requestUrl, status: null, error: err });
        if (err instanceof Error) {
          setAudioError(err.message || fallback);
        } else {
          setAudioError(fallback);
        }
      })
      .finally(() => setAudioLoading(false));

    return () => controller.abort();
  }, [isAudio, result.sourceUrl, audioUrl, audioError]);

  // Revoke blob object URLs when superseded or unmounted — otherwise every
  // audio resolve leaks the full MP3 blob for the lifetime of the tab.
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const handleDownloadVideo = useCallback(() => {
    if (!currentMedia || downloading === "preparing") return;
    setDownloading("preparing");
    try {
      const safeHandle = sanitizeHandle(result.author?.username);
      const ext = extForMedia(currentMedia);
      const filename = items.length > 1
        ? `${safeHandle}-${safeIndex + 1}.${ext}`
        : `${safeHandle}-${currentMedia.type === "video" ? "video" : "photo"}.${ext}`;
      const downloadUrl = getDownloadUrl(currentMedia.url, filename, result.sourceUrl);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.rel = "noopener";
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      setDownloading("error");
      return;
    }
    window.setTimeout(() => {
      setDownloading((s) => (s === "preparing" ? "idle" : s));
    }, 4000);
  }, [currentMedia, result.author, result.sourceUrl, downloading, items.length, safeIndex]);

  const handleDownloadAudio = useCallback(() => {
    if (!audioUrl) return;
    const safeHandle = sanitizeHandle(result.author?.username);
    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = `${safeHandle}-audio.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [audioUrl, result.author?.username]);

  // Media stream URL through our proxy (source allows stale-URL recovery)
  const streamSrc = currentMedia ? getStreamUrl(currentMedia.url, result.sourceUrl) : "";

  // Preview source selection from the actual API shape (media.url): a video
  // item always previews through <VideoPlayer> and is never rendered as an
  // image. The preview is proxy-only: it always plays the backend streaming
  // endpoint (same backend + encoding as Download, with server-side stale-URL
  // recovery and SSRF validation), and the raw Instagram CDN URL is never
  // mounted in the client. The URL must be a playable http(s) value —
  // otherwise the shared "Preview unavailable" tile is shown instead of
  // mounting a broken player. No cookies/session ever leave the client.
  const isVideoItem = currentMedia?.type === "video";
  const mediaUrl = currentMedia?.url ?? "";
  const proxyVideoSrc = isVideoItem && isPlayableVideoUrl(mediaUrl) ? streamSrc : "";
  // Split-track Reels ship their sound as a separate audio-only rendition. It
  // is proxied exactly like the video (never the raw CDN URL) and only mounted
  // when the resolver actually paired it with this video.
  const pairedAudioRaw = currentMedia?.audioUrl ?? null;
  const pairedAudioSrc =
    isVideoItem && typeof pairedAudioRaw === "string" && isPlayableVideoUrl(pairedAudioRaw)
      ? getStreamUrl(pairedAudioRaw, result.sourceUrl)
      : null;
  const rawPoster = currentMedia?.thumbnail ?? undefined;
  const validPoster = isValidImagePoster(rawPoster) ? rawPoster : undefined;

  // Reserve the image's own ratio before the bytes arrive (CLS fix): with
  // width 100% + aspect-ratio, the box has its final height pre-load, so
  // neither the first paint nor slide switches move surrounding layout.
  const imgAspect =
    currentMedia &&
    currentMedia.type !== "video" &&
    currentMedia.width &&
    currentMedia.height &&
    currentMedia.width > 0 &&
    currentMedia.height > 0
      ? `${currentMedia.width} / ${currentMedia.height}`
      : undefined;

  // Reset the loaded flag per media item during render (React "adjust state
  // on change" pattern — synchronous, so the fresh slide never inherits the
  // previous slide's loaded flag for even one frame). The slide was
  // preloaded + cached before the switch, so the fade is instant.
  const [loadedSrc, setLoadedSrc] = useState(streamSrc);
  if (loadedSrc !== streamSrc) {
    setLoadedSrc(streamSrc);
    setImgLoaded(false);
  }

  const logPreviewDiag = useCallback(
    (mediaType: string | undefined) => {
      if (process.env.NODE_ENV !== "development") return;
      try {
        console.debug("[Downloadit Preview]", {
          mediaType: mediaType ?? "unknown",
          streamHost: new URL(streamSrc).hostname,
          hasSource: Boolean(result.sourceUrl),
        });
      } catch {
        /* ignore logging failures */
      }
    },
    [streamSrc, result.sourceUrl]
  );

  // Image preview: retry once with a cache-buster, then the single
  // fresh-resolve recovery (same policy as video), then the honest error
  // state. (The backend already retried with a freshly resolved URL when
  // possible.)
  const handleImgError = useCallback(() => {
    logPreviewDiag(currentMedia?.type);
    if (!imgRetriedRef.current) {
      imgRetriedRef.current = true;
      const bust = streamSrc.includes("?") ? "&" : "?";
      setImgSrc(`${streamSrc}${bust}_retry=${Date.now()}`);
      return;
    }
    const failed = imgSrc ?? streamSrc;
    const base = stripStreamRetryParam(failed);
    if (!base || recoveryAttemptedRef.current.has(base)) {
      setImgFailed(true);
      return;
    }
    recoverStaleMedia(failed).then(
      (ok) => {
        if (!ok) setImgFailed(true);
        // On success freshItems swaps in the fresh URL (and setImgSrc(null)
        // above drops the stale retry URL), so the <img> remounts on fresh
        // bytes with no further action here.
      },
      () => setImgFailed(true)
    );
  }, [currentMedia, streamSrc, imgSrc, logPreviewDiag, recoverStaleMedia]);

  const goPrev = useCallback(() => {
    const target = Math.max(0, (carouselTargetRef.current ?? safeIndex) - 1);
    preloadAndSwitch(target);
  }, [safeIndex, preloadAndSwitch]);
  const goNext = useCallback(() => {
    const target = Math.min(items.length - 1, (carouselTargetRef.current ?? safeIndex) + 1);
    preloadAndSwitch(target);
  }, [safeIndex, items.length, preloadAndSwitch]);

  const effW = realResolution?.w ?? currentMedia?.width ?? null;
  const effH = realResolution?.h ?? currentMedia?.height ?? null;

  // Derived metadata for the new two-column card
  const previewRef = useRef<HTMLDivElement>(null);
  const handlePreview = useCallback(() => {
    const v = previewRef.current?.querySelector<HTMLVideoElement>("video");
    if (v) {
      // This runs inside the Preview button's real click, i.e. a user gesture,
      // which is what lets the browser start playback WITH audio. The element
      // is never muted and its volume is never forced to 0, so a successful
      // play() here is audible. If the browser still refuses (its own policy),
      // the rejection is swallowed and the element's real paused state stays
      // visible in the native controls — no audio state is ever faked.
      v.muted = false;
      if (v.volume === 0) v.volume = 1;
      if (v.ended) v.currentTime = 0;
      if (v.paused) v.play().catch(() => {});
      else v.pause();
      v.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const a = previewRef.current?.querySelector<HTMLAudioElement>("audio");
    if (a) {
      if (a.paused) a.play().catch(() => {});
      else a.pause();
    }
    previewRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  // Strict validation: for Story, never show profile/avatar as success
  if (isStoryProfileFallback) {
    return (
      <div className="result-card animate-fade-in-up mx-auto mt-6 w-[calc(100%-32px)] max-w-[900px] sm:mt-10 sm:w-full sm:px-5">
        <div
          className="overflow-hidden rounded-[24px] p-4 sm:p-5 text-center"
          style={{ background: "var(--card)", boxShadow: "0 20px 60px rgba(60,40,120,0.12)", border: "1px solid var(--border)" }}
        >
          <div className="flex flex-col items-center gap-3 py-6">
            <AlertCircle className="h-10 w-10 text-danger" />
            <p className="text-[16px] font-semibold text-danger">The actual Story media could not be resolved.</p>
            <p className="max-w-[420px] text-[14px] leading-[1.6] text-fg-muted">
              Instagram did not expose the requested Story media. The Story may have expired, been removed, or is not publicly accessible. Please try a different Story link or verify the Story is still viewable publicly.
            </p>
            <button
              type="button"
              onClick={onReset}
              className="mt-2 inline-flex min-h-[44px] items-center justify-center rounded-xl px-5 text-[14px] font-semibold text-white"
              style={{ background: "var(--brand-gradient)" }}
            >
              Try another link
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="result-card animate-fade-in-up mx-auto mt-6 w-[calc(100%-32px)] max-w-[900px] sm:mt-10 sm:w-full sm:px-5">
      <div
        className="overflow-hidden rounded-[24px] p-3 sm:p-4 md:p-5"
        style={{ background: "var(--card)", boxShadow: "0 20px 60px rgba(60,40,120,0.12)", border: "1px solid var(--border)" }}
      >
        {/* Card header: badge + handle + New */}
        <div className="result-top-row mb-3 flex items-center justify-between gap-2 px-1">
          <span
            className="inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-bold text-white"
            style={{ background: isAudio ? "linear-gradient(135deg, #7c4df5, #ec5fa8)" : "var(--brand-gradient)" }}
          >
            {isAudio ? t.result.audio : getContentTypeLabel(result.type, t.typeBadges)}
          </span>
          {result.author && (
            <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5 sm:justify-start">
              <div className="h-[22px] w-[22px] shrink-0 rounded-full" style={{ background: "var(--brand-gradient)" }} />
              <span className="truncate text-[14px] font-semibold text-fg sm:text-[14px]">@{result.author.username}</span>
            </div>
          )}
          <button
            type="button"
            onClick={onReset}
            className="flex min-h-[44px] shrink-0 items-center gap-1 px-1 text-[14px] font-semibold text-fg-subtle transition-colors hover:text-fg"
          >
            <X className="h-3.5 w-3.5" />
            {t.result.newBtn}
          </button>
        </div>

        {result.title && (() => {
          const caption = decodeHtmlEntities(result.title);
          const isLong = caption.length > 160;
          return (
            <div className="result-title px-1 pb-3">
              <p className={`text-[14px] leading-[1.5] text-fg-muted break-words ${!captionExpanded && isLong ? "line-clamp-3" : ""}`}>
                {caption}
              </p>
              {isLong && (
                <button
                  type="button"
                  onClick={() => setCaptionExpanded((v) => !v)}
                  className="mt-1 min-h-[32px] text-[12px] font-semibold text-primary-strong transition-colors hover:text-primary-hover"
                  aria-expanded={captionExpanded}
                >
                  {captionExpanded ? "Show less" : "Show more"}
                </button>
              )}
            </div>
          );
        })()}

        {/* ── Two-column body: LEFT preview / RIGHT info ── */}
        <div className="result-grid grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,1fr)] lg:gap-6">
          {/* LEFT: large preview */}
          <div ref={previewRef} className="result-video-wrap min-w-0">
            <div className="relative">
            {isAudio ? (
              <>
                {audioLoading && (
                  <div
                    className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 rounded-[20px] md:aspect-[4/3]"
                    style={{ background: "linear-gradient(145deg, #1a1028 0%, #0f0c1b 100%)" }}
                  >
                    <svg className="h-8 w-8 animate-spin text-white/60" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                      <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" />
                    </svg>
                    <p className="text-xs text-white/60">{t.result.extractingAudio}</p>
                  </div>
                )}
                {audioError && (
                  <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-[20px] bg-danger-light">
                    <AlertCircle className="h-8 w-8 text-danger" />
                    <p className="break-words px-4 text-center text-xs text-danger">{audioError}</p>
                  </div>
                )}
                {audioUrl && <AudioPlayer src={audioUrl} onDurationChange={(d) => setAudioDuration(d)} />}
              </>
            ) : !currentMedia ? null : isVideoItem ? (
              proxyVideoSrc ? (
                // NOTE: keying by the proxied source intentionally remounts
                // per source. That resets playing/time/mute/error state for the
                // new video AND unmounts the old <video> element, which stops
                // its decode — so the previous video can never keep playing (or
                // play simultaneously) after a slide switch, a new search, or
                // leaving the preview. A stale/expired signed URL therefore
                // can never linger and wrongly report "Preview unavailable"
                // for a valid video.
                <VideoPlayer
                  key={proxyVideoSrc}
                  src={proxyVideoSrc}
                  poster={validPoster}
                  mediaType={currentMedia.type}
                  width={currentMedia.width}
                  height={currentMedia.height}
                  audioSrc={pairedAudioSrc}
                  onDurationChange={(d) => setRealDuration(d)}
                  onResolution={(w, h) => setRealResolution({ w, h })}
                  onRequestFreshMedia={recoverStaleMedia}
                />
              ) : (
                <div className="flex min-h-[180px] w-full flex-col items-center justify-center gap-2 rounded-[20px] bg-black/5">
                  <ImageIcon className="h-10 w-10" style={{ color: "var(--fg-subtle)", opacity: 0.4 }} />
                  <p className="text-xs" style={{ color: "var(--fg-subtle)" }}>
                    {t.result.previewUnavailable}
                  </p>
                </div>
              )
            ) : imgFailed ? (
              <div className="flex min-h-[180px] w-full flex-col items-center justify-center gap-2 rounded-[20px] bg-black/5">
                <ImageIcon className="h-10 w-10" style={{ color: "var(--fg-subtle)", opacity: 0.4 }} />
                <p className="text-xs" style={{ color: "var(--fg-subtle)" }}>
                  {t.result.previewUnavailable}
                </p>
              </div>
            ) : (
              // Natural-height render: the image keeps its own aspect ratio
              // (portrait / landscape / square) with object-fit contain, so it
              // is never cropped, stretched, or boxed into a fixed ratio.
              // The wrapper reserves that ratio pre-load (no CLS); the bitmap
              // fades in on decode (opacity only, no layout, no flash).
              <div
                className="relative w-full overflow-hidden rounded-[20px]"
                style={{ background: "#0a0a14", aspectRatio: imgAspect ?? "auto" }}
              >
                {!imgLoaded && !imgFailed && (
                  <div aria-hidden="true" className="absolute inset-0 flex min-h-[180px] items-center justify-center">
                    <svg className="h-8 w-8 animate-spin text-white/60" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                      <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" />
                    </svg>
                  </div>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element -- next/image cannot serve our dynamic backend /api/stream proxy URLs; plain img streams from our own backend exactly like <video> does */}
                <img
                  key={currentMedia.url}
                  src={imgSrc ?? streamSrc}
                  alt={result.title ? decodeHtmlEntities(result.title).slice(0, 120) : t.typeBadges.photo}
                  onLoad={() => setImgLoaded(true)}
                  onError={handleImgError}
                  className="media-frame media-natural relative w-full rounded-[20px] object-contain"
                  style={{ background: "transparent", aspectRatio: imgAspect ?? "auto", height: "auto", display: "block", opacity: imgLoaded ? 1 : 0, transition: "opacity 180ms ease-out" } as CSSProperties}
                />
              </div>
            )}
              {/* Overlay carousel arrows: vertically centered on the media
                  edges, visible without covering important content. */}
              {showCarouselNav && currentMedia && (
                <>
                  <button
                    type="button"
                    onClick={goPrev}
                    disabled={safeIndex === 0}
                    aria-label="Previous image"
                    className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-white backdrop-blur-md transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
                    style={{ background: "rgba(10,10,20,0.55)", border: "1px solid rgba(255,255,255,0.25)" }}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={safeIndex === items.length - 1}
                    aria-label="Next image"
                    className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-white backdrop-blur-md transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
                    style={{ background: "rgba(10,10,20,0.55)", border: "1px solid rgba(255,255,255,0.25)" }}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
            {showCarouselNav && currentMedia && (
              <p className="mt-1.5 text-center text-[12px] font-bold tabular-nums text-fg-subtle" aria-live="polite">
                {safeIndex + 1} / {items.length}
              </p>
            )}
          </div>

          {/* Actions + metadata */}
          <div className="result-details flex min-w-0 flex-col gap-3 md:gap-4">
            <div className="result-actions flex flex-col gap-2.5 sm:flex-row">
              <button
                type="button"
                onClick={handlePreview}
                className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 text-[14px] font-semibold text-fg transition-colors hover:bg-primary-light hover:text-primary"
              >
                <Play className="h-4 w-4" />
                Preview
              </button>

              <button
                type="button"
                onClick={isAudio ? handleDownloadAudio : handleDownloadVideo}
                disabled={(isAudio && !audioUrl) || downloading === "preparing" || (isAudio && audioLoading)}
                aria-label={isAudio ? t.result.downloadAudioLabel : t.result.downloadVideoLabel}
                className="gradient-btn min-h-[48px] flex-1 text-[14px] disabled:opacity-60"
              >
                {downloading === "preparing" ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                      <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" />
                    </svg>
                    {t.result.downloading}
                  </>
                ) : downloading === "error" ? (
                  <>
                    <DownloadIcon className="h-4 w-4" />
                    {t.result.tryAgain}
                  </>
                ) : (
                  <>
                    <DownloadIcon className="h-4 w-4" />
                    {isAudio ? t.result.downloadAudio : t.result.download}
                  </>
                )}
              </button>
            </div>
            {downloading === "error" && !isAudio && (
              <p className="text-center text-[12px] font-medium text-danger" role="alert">
                {t.result.downloadFailed}
              </p>
            )}
            <dl className="grid grid-cols-2 gap-2 text-[12px]">
              {!isAudio && (
                <div className="rounded-xl px-3 py-2" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                  <dt className="font-medium text-fg-subtle">Resolution</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums text-fg">{formatResolution(effW, effH)}</dd>
                </div>
              )}
              <div className="rounded-xl px-3 py-2" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                <dt className="font-medium text-fg-subtle">File Size</dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-fg">{isAudio ? (audioSize !== null ? formatBytes(audioSize) : "MP3 · 192k") : formatBytes(currentMedia?.size)}</dd>
              </div>
              {(isAudio || currentMedia?.type === "video") && (
                <div className="rounded-xl px-3 py-2" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                  <dt className="font-medium text-fg-subtle">Duration</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums text-fg">{isAudio ? (audioDuration !== null && audioDuration > 0 ? formatTime(audioDuration) : "Audio · MP3") : formatMetaDuration(currentMedia?.duration, realDuration)}</dd>
                </div>
              )}
              <div className="rounded-xl px-3 py-2" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                <dt className="font-medium text-fg-subtle">Format</dt>
                <dd className="mt-0.5 font-semibold text-fg">{isAudio ? "MP3" : (currentMedia ? labelForMedia(currentMedia) : "Unknown")}</dd>
              </div>
            </dl>
          </div>
        </div>

      </div>

      <p className="mt-4 break-words px-2 text-center text-[12px] text-fg-subtle sm:text-[12px]">{t.result.tempNote}</p>
    </div>
  );
}

