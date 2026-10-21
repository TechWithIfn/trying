"use client";

// Post-resolve UI (video/audio players + result card). Split from
// HeroDownloader so none of it ships in the initial page JavaScript.
// Loaded on demand when the first resolve succeeds; the hero form,
// progress ring, and error states stay in the critical bundle.
import { useState, useCallback, useRef, useEffect } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from "react";
import { createPortal } from "react-dom";
import {
  Download as DownloadIcon,
  Pause,
  Play,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Image as ImageIcon,
  Images as ImagesIcon,
  X,
} from "lucide-react";
import {
  resolveInstagramUrl,
  resolvePinterestUrl,
  getStreamUrl,
  getDownloadUrl,
  getZipDownloadUrl,
  buildDownloadFilename,
  isVideoPlaying,
  videoOverlayState,
  imageDownloadPlan,
  mediaPreviewPlan,
  mediaSurfaceAction,
  proxiedPosterUrl,
  isPlayableVideoUrl,
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

const TITLE_PREVIEW_LENGTH = 20;

function titlePreview(text: string): { text: string; isLong: boolean } {
  let chars: string[];
  try {
    chars =
      typeof Intl.Segmenter === "function"
        ? Array.from(
            new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text),
            (part) => part.segment
          )
        : Array.from(text);
  } catch {
    chars = Array.from(text);
  }
  if (chars.length <= TITLE_PREVIEW_LENGTH) return { text, isLong: false };
  return { text: chars.slice(0, TITLE_PREVIEW_LENGTH).join(""), isLong: true };
}

function getContentTypeLabel(type: string, badges: Strings["typeBadges"]): string {
  const labels: Record<string, string> = {
    REEL: badges.reel,
    POST: badges.post,
    CAROUSEL: badges.carousel,
    STORY: badges.story,
    STORY_PROFILE: badges.story,
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

function aspectRatioStyle(width?: number | null, height?: number | null, fallback = "9/16"): CSSProperties {
  if (width && height && width > 0 && height > 0) {
    return { aspectRatio: `${width} / ${height}` };
  }
  return { aspectRatio: fallback };
}

/**
 * Parse an `aspect-ratio` string ("1920 / 1080", "9 / 16", "1 / 1") into the
 * number CSS needs for the media height cap (`max-width = max-height × ratio`).
 * Falls back to portrait 9/16 for anything unparseable.
 */
function ratioToNumber(s: string | undefined): number {
  if (!s) return 9 / 16;
  const m = s.match(/^\s*([\d.]+)\s*\/\s*([\d.]+)\s*$/);
  if (m) {
    const a = parseFloat(m[1]);
    const b = parseFloat(m[2]);
    if (a > 0 && b > 0) return a / b;
  }
  const n = parseFloat(s);
  return n > 0 ? n : 9 / 16;
}

function VideoPlayer({ src, poster, mediaType, width, height, audioSrc, autoPlay, onDurationChange, onResolution, onRequestFreshMedia, onPlayingChange, onPlaybackError }: { src: string; poster?: string; mediaType?: string; width?: number | null; height?: number | null; audioSrc?: string | null; autoPlay?: boolean; onDurationChange?: (duration: number) => void; onResolution?: (w: number, h: number) => void; onRequestFreshMedia?: (failedSrc: string) => Promise<boolean>; onPlayingChange?: (playing: boolean) => void; onPlaybackError?: () => void }) {
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
  const onPlayingChangeRef = useRef(onPlayingChange);
  const onPlaybackErrorRef = useRef(onPlaybackError);
  // Last playing state mirrored to the parent: firing the callback on every
  // timeupdate would re-render the card ~4×/s for no visual change.
  const lastPlayingRef = useRef(false);
  useEffect(() => {
    onDurationChangeRef.current = onDurationChange;
    onResolutionRef.current = onResolution;
    onRequestFreshMediaRef.current = onRequestFreshMedia;
    onPlayingChangeRef.current = onPlayingChange;
    onPlaybackErrorRef.current = onPlaybackError;
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
    // Reflect real play/pause/ended to the parent (drives the on-video
    // overlay) — only on an actual change, never on every timeupdate tick.
    const playing = isVideoPlaying(v.paused, v.ended);
    if (playing !== lastPlayingRef.current) {
      lastPlayingRef.current = playing;
      onPlayingChangeRef.current?.(playing);
    }
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

    // The element only mounts after the user explicitly opened the preview, so
    // starting here is still "after a user action" and within the click's user
    // activation, which is what lets the browser permit audible playback. A
    // policy refusal (or any other rejected play() promise) is surfaced to the
    // parent as a real, useful error — never swallowed into a fake state.
    if (autoPlay) {
      try {
        const p = v.play();
        if (p && typeof p.catch === "function") {
          p.catch(() => {
            if (mountedRef.current) onPlaybackErrorRef.current?.();
          });
        }
      } catch {
        // element may be mid-mount; the native controls remain usable
        if (mountedRef.current) onPlaybackErrorRef.current?.();
      }
    }

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
  }, [currentSrc, mediaType, syncState, autoPlay]);

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
  /**
   * Which platform produced the result. Drives only the honest media-type
   * fallback in the download filename (`Instagram Video` vs `Pinterest Video`);
   * the card layout, overlay controls and download flow are identical for every
   * video/image result on every platform.
   */
  variant?: "default" | "pinterest";
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
 * `isPlayableVideoUrl` / `isValidImagePoster` / `proxiedPosterUrl` now live in
 * `@/services/api` so the preview-source, poster and preview-first decisions are
 * shared and unit-tested in one place.
 */

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

export function MediaResult({ result, mode, onReset, variant = "default" }: MediaResultProps) {
  const { t } = useLanguage();
  const isPinterest = variant === "pinterest";
  const [downloading, setDownloading] = useState<"idle" | "preparing" | "error">("idle");
  // ZIP state for the multi-image "Download all" action, kept separate from the
  // single-item download so the two spinners never collide.
  const [zipState, setZipState] = useState<"idle" | "preparing" | "error">("idle");
  // Real playing state lifted from the <video> element (drives the overlay).
  const [videoPlaying, setVideoPlaying] = useState(false);
  // Preview-first: the real <video> is mounted only after the user opens the
  // preview. Until then a compact poster is shown (the video is never fetched
  // just to render the thumbnail). Closing returns to the poster and releases
  // the decoder through the player's own unmount cleanup.
  const [videoPreviewOpen, setVideoPreviewOpen] = useState(false);
  // True when the resolved thumbnail image failed to load, so the branded
  // fallback tile is shown instead of a broken image.
  const [posterFailed, setPosterFailed] = useState(false);
  // Real playback failure from the <video> element's own play() promise (e.g. a
  // browser autoplay-policy refusal). Surfaced as an honest message; cleared the
  // moment real playback starts. Never a simulated state.
  const [, setPlaybackError] = useState<string | null>(null);
  // Full-size lightbox for static images/carousel slides.
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
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
  // Story results can hold several live segments (photo + video with music).
  // They get the same item navigation as carousels, and default to the first
  // VIDEO segment so a photo thumbnail never blocks the MP4 download.
  const isStoryResult =
    result.type === "STORY" || result.type === "STORY_PROFILE" || result.type === "HIGHLIGHT";
  const [currentIndex, setCurrentIndex] = useState(() => {
    const s = result.startIndex;
    if (typeof s === "number" && Number.isFinite(s) && s > 0) {
      return Math.min(s, Math.max(0, result.media.length - 1));
    }
    if (isStoryResult) {
      const firstVideo = result.media.findIndex((m) => m.type === "video");
      if (firstVideo > 0) return firstVideo;
    }
    return 0;
  });
  // Titles longer than 20 characters collapse behind Show more/less.
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
  // Real bitmap size from onLoad — preferred over provider dims so the
  // preview frame matches the photo and stays centered (no forced 4:5 crop).
  const [imgNatural, setImgNatural] = useState<{ w: number; h: number } | null>(null);
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
  // Media-first layout for EVERY video and image result (Instagram Reels,
  // videos, photos, carousels, Stories; Pinterest videos and images/carousels):
  // one compact column with the media as the focus and its Preview/Download
  // controls on or directly beside the media. Only the audio result — which has
  // its own waveform player and no video surface — keeps the two-column card.
  const isMediaFirst = !isAudio;
  // Platform label for the honest filename fallback (`Instagram Video`,
  // `Pinterest Image`, ...). Pinterest is the only non-Instagram downloader.
  const platformLabel = isPinterest ? "Pinterest" : "Instagram";

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
      // The fresh resolve MUST go through the SAME platform resolver that
      // produced the original media. A Pinterest pin can never be re-resolved
      // by the Instagram resolver (and vice versa), so hardcoding one endpoint
      // made every Pinterest refresh fail and turned a transient stream error
      // into a permanent "Preview unavailable" with no recovery.
      const requestType = isPinterest ? "pinterest-resolve" : "resolve-post";
      const requestUrl = isPinterest
        ? `${getApiBase()}/api/pinterest/resolve`
        : `${getApiBase()}/api/resolve`;
      let data;
      try {
        data = isPinterest
          ? await resolvePinterestUrl(result.sourceUrl, result.type === "VIDEO" ? "video" : "image")
          : await resolveInstagramUrl(result.sourceUrl, undefined, { refresh: true });
      } catch (err) {
        logApiFailure({ requestType, requestUrl, status: null, error: err });
        return false;
      }
      if (!data.success) {
        logApiFailure({
          requestType,
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
    [result.sourceUrl, result.type, items, safeIndex, isPinterest]
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
  const isStoryProfileFallback =
    (result.type === "STORY" || result.type === "STORY_PROFILE") && isProfileMediaFrontend;
  // Carousel controls for real carousel posts AND multi-segment stories
  // (each live story segment is its own image or video). Reels, single
  // videos, single photos and audio never show a counter/arrows.
  const isCarouselPost = !isAudio && (result.type === "CAROUSEL" || (result.type === "POST" && items.length > 1));
  const showCarouselNav = (isCarouselPost || isStoryResult) && items.length > 1;

  const resetPerItemState = useCallback(() => {
    setImgSrc(null);
    setImgFailed(false);
    setImgNatural(null);
    imgRetriedRef.current = false;
    setRealDuration(null);
    setRealResolution(null);
    setVideoPlaying(false);
    setVideoPreviewOpen(false);
    setPosterFailed(false);
    setPlaybackError(null);
  }, []);

  // Carousel navigation must never wait on the stream proxy — a hung preload
  // used to freeze Next/Back. Switch the index immediately; warm neighbours
  // in the background so the next click is usually cache-hit. The ref tracks
  // the latest requested slide so rapid clicks can advance before re-render.
  const carouselTargetRef = useRef<number | null>(null);

  const preloadAndSwitch = useCallback(
    (targetIndex: number) => {
      if (targetIndex < 0 || targetIndex >= items.length) return;
      const base = carouselTargetRef.current ?? Math.min(currentIndex, items.length - 1);
      if (targetIndex === base) return;
      carouselTargetRef.current = targetIndex;
      setCurrentIndex(targetIndex);
      resetPerItemState();
    },
    [items.length, currentIndex, resetPerItemState]
  );

  useEffect(() => {
    carouselTargetRef.current = safeIndex;
  }, [safeIndex]);

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
      const ext = extForMedia(currentMedia);
      // ONE filename pattern for every platform and media type:
      // `Downloadit - {original title}.{ext}`, with an honest media-type
      // fallback (`Instagram Video`, `Pinterest Image`, ...) — never the
      // uploader's username.
      const filename = buildDownloadFilename({
        title: result.title,
        extension: ext,
        fallback: `${platformLabel} ${currentMedia.type === "video" ? "Video" : "Image"}`,
      });
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
  }, [currentMedia, result.sourceUrl, result.title, downloading, platformLabel]);

  /**
   * Multi-image download: one backend ZIP of every real image the backend
   * returned. Only reachable for a genuine multi-image set (the control that
   * calls it is hidden otherwise); the guard below keeps a stray call from
   * packaging a single image.
   */
  const handleDownloadAll = useCallback(() => {
    if (zipState === "preparing") return;
    const targets = items.filter((m) => m.type === "image");
    if (targets.length < 2) {
      handleDownloadVideo();
      return;
    }
    setZipState("preparing");
    try {
      const filename = buildDownloadFilename({
        title: result.title,
        extension: "zip",
        fallback: `${platformLabel} Images`,
      });
      const url = getZipDownloadUrl(targets.map((m) => m.url), filename, result.sourceUrl);
      const a = document.createElement("a");
      a.href = url;
      a.rel = "noopener";
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      setZipState("error");
      return;
    }
    window.setTimeout(() => {
      setZipState((s) => (s === "preparing" ? "idle" : s));
    }, 4000);
  }, [items, result.title, result.sourceUrl, zipState, handleDownloadVideo, platformLabel]);

  const handleDownloadAudio = useCallback(() => {
    if (!audioUrl) return;
    // Same pattern as every other media type (`Downloadit - {title}.mp3`); the
    // audio blob is same-origin, so the `download` attribute is honored.
    const filename = buildDownloadFilename({
      title: result.title,
      extension: "mp3",
      fallback: `${platformLabel} Audio`,
    });
    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [audioUrl, result.title, platformLabel]);

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
  // Poster/thumbnail source for the preview-first video surface: the item's own
  // thumbnail, then the result-level thumbnail. Streamed through our own
  // backend like the full preview; a missing/invalid thumbnail yields a branded
  // fallback tile — never a broken image or a huge empty player. Only the poster
  // image is fetched; the video itself is never downloaded to render it.
  const rawPoster = currentMedia?.thumbnail ?? result.thumbnail ?? undefined;
  const videoThumbSrc = proxiedPosterUrl(rawPoster, result.sourceUrl);

  // Every image/carousel and every previewable video gets Preview + Download
  // as an on-media overlay at the top edge. A video whose preview could not be
  // mounted keeps an under-media download so the action is never unreachable.
  const isImageItem = Boolean(currentMedia && currentMedia.type === "image");
  const videoOverlay = videoOverlayState({
    isVideo: isVideoItem && !isAudio,
    hasPlayableSrc: Boolean(proxyVideoSrc),
    playing: videoPlaying,
  });
  // Preview-first: show a compact poster with Preview + Download and mount the
  // real <video> only after the user opens the preview.
  const mediaPlan = mediaPreviewPlan({
    isVideo: isVideoItem && !isAudio,
    hasPlayableVideo: Boolean(proxyVideoSrc),
    previewOpen: videoPreviewOpen,
  });
  // The poster's own click action (whole surface + center Play). Inert once the
  // real <video> is mounted, where the native controls own play/pause.
  const surfaceAction = mediaSurfaceAction({
    isVideo: isVideoItem && !isAudio,
    hasPlayableVideo: Boolean(proxyVideoSrc),
    previewOpen: videoPreviewOpen,
  });
  const posterIsClickable = surfaceAction === "open-preview";
  const showMediaDownloadControls =
    Boolean(currentMedia) && !isAudio && isVideoItem && !proxyVideoSrc;
  const showTopMediaControls =
    Boolean(currentMedia) && !isAudio && (isImageItem || videoOverlay.showOverlay);
  // A genuine multi-image set is the only thing that offers "Download all
  // images"; the plan is derived from the real backend items.
  const imagePlan = imageDownloadPlan(items);

  // Frame the photo with its real aspect ratio (bitmap → provider → 1:1).
  // Matching the image prevents tall empty bars and keeps the subject centered.
  const imgAspect = (() => {
    if (!currentMedia || currentMedia.type === "video") return undefined;
    if (imgNatural && imgNatural.w > 0 && imgNatural.h > 0) {
      return `${imgNatural.w} / ${imgNatural.h}`;
    }
    const w = currentMedia.width;
    const h = currentMedia.height;
    if (w && h && w > 0 && h > 0) return `${w} / ${h}`;
    return isCarouselPost || result.type === "POST" || result.type === "CAROUSEL" || result.type === "PHOTO"
      ? "1 / 1"
      : undefined;
  })();

  // Video/thumbnail frame ratio (provider dimensions, portrait fallback).
  const videoAspectStr = (() => {
    const w = currentMedia?.width;
    const h = currentMedia?.height;
    if (w && h && w > 0 && h > 0) return `${w} / ${h}`;
    return "9 / 16";
  })();
  // Numeric ratio handed to CSS as `--media-ar`, so the media frame can be
  // height-capped on every screen: the frame caps its width at
  // `max-media-height × ratio`. Portrait media stays narrow and centered,
  // landscape stays within the container, and the original ratio is never
  // distorted (object-fit: contain does the letterboxing).
  const mediaAspectNum = isVideoItem ? ratioToNumber(videoAspectStr) : ratioToNumber(imgAspect ?? "1 / 1");

  // Once a photo/carousel image reports its real pixel size, cap both the image
  // frame AND its shrink-wrapped `.media-stage` to that size (intersected with
  // the CSS max-height-based cap). Two wins: a small source is never enlarged
  // (stays sharp) and never sits in a blank letterbox, while the overlay arrows
  // — positioned against the stage — land exactly on the image's own edges for
  // portrait, landscape and square images alike.
  const imageCapMaxWidth =
    isImageItem && imgNatural
      ? `min(100%, ${imgNatural.w}px, calc(var(--media-post-max-h, 560px) * var(--media-ar, 1)))`
      : undefined;
  const imageCapMaxHeight =
    isImageItem && imgNatural
      ? `min(var(--media-post-max-h, 560px), ${imgNatural.h}px)`
      : undefined;

  // Reset the loaded flag per media item during render (React "adjust state
  // on change" pattern — synchronous, so the fresh slide never inherits the
  // previous slide's loaded flag for even one frame). The slide was
  // preloaded + cached before the switch, so the fade is instant.
  const [loadedSrc, setLoadedSrc] = useState(streamSrc);
  if (loadedSrc !== streamSrc) {
    setLoadedSrc(streamSrc);
    setImgLoaded(false);
    setImgNatural(null);
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
  // Touch swipe for the carousel (buttons remain the primary control and keep
  // working): horizontal swipe past 50px with horizontal dominance navigates.
  // Vertical gestures are ignored so page scroll never fights the carousel.
  // Taps (including on the arrow buttons) have ~zero travel and never trigger.
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const onPreviewTouchStart = useCallback((e: ReactTouchEvent<HTMLDivElement>) => {
    const t = e.touches[0];
    if (!t) return;
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  }, []);
  const onPreviewTouchEnd = useCallback(
    (e: ReactTouchEvent<HTMLDivElement>) => {
      const start = touchStartRef.current;
      touchStartRef.current = null;
      if (!start) return;
      // Taps on controls must never swipe: buttons handle their own clicks.
      if ((e.target as HTMLElement | null)?.closest?.("button")) return;
      if (!showCarouselNav || items.length <= 1) return;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      if (Math.abs(dx) < 50 || Math.abs(dx) <= Math.abs(dy)) return;
      if (dx < 0) goNext();
      else goPrev();
    },
    [showCarouselNav, items.length, goNext, goPrev]
  );
  const handlePreview = useCallback(() => {
    // Preview-first: the poster is showing and the user asked to open the real
    // player. Mounting the <video> here is the explicit user action; the element
    // then auto-plays from the same click. A rejected play() is reported back by
    // VideoPlayer's own onPlaybackError. Scroll it into view once mounted.
    if (mediaPlan.canPreviewVideo && !videoPreviewOpen) {
      setPlaybackError(null);
      setVideoPreviewOpen(true);
      if (typeof window !== "undefined") {
        window.requestAnimationFrame(() => {
          previewRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      }
      return;
    }
    const v = previewRef.current?.querySelector<HTMLVideoElement>("video");
    if (v) {
      // This runs inside the Preview button's real click, i.e. a user gesture,
      // which is what lets the browser start playback WITH audio. The element
      // is never muted and its volume is never forced to 0, so a successful
      // play() here is audible. A rejected promise (browser policy, decode
      // failure) is surfaced as a real message instead of being swallowed.
      v.muted = false;
      if (v.volume === 0) v.volume = 1;
      if (v.ended) v.currentTime = 0;
      if (!v.paused && !v.ended) {
        v.pause();
      } else {
        setPlaybackError(null);
        const p = v.play();
        if (p && typeof p.catch === "function") {
          p.catch(() => setPlaybackError(t.result.playbackError));
        }
      }
      v.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const a = previewRef.current?.querySelector<HTMLAudioElement>("audio");
    if (a) {
      if (a.paused) a.play().catch(() => {});
      else a.pause();
    }
    previewRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [mediaPlan.canPreviewVideo, videoPreviewOpen, t.result.playbackError]);

  // Return to the compact poster: unmounts the player, whose own cleanup pauses
  // playback and removes every listener (releasing the decoder), and resets the
  // overlay back to the Preview state.
  const closeVideoPreview = useCallback(() => {
    setVideoPreviewOpen(false);
    setVideoPlaying(false);
    setPlaybackError(null);
  }, []);

  const openImagePreview = useCallback(() => {
    if (!isImageItem || imgFailed) return;
    setImagePreviewOpen(true);
  }, [isImageItem, imgFailed]);

  useEffect(() => {
    if (!imagePreviewOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setImagePreviewOpen(false);
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [imagePreviewOpen, goPrev, goNext]);

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

  const spinner = (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" />
    </svg>
  );

  // Image/carousel controls live on the media's top edge, matching video.
  // A carousel exposes both actions as separate buttons so the choices stay
  // visible without a dropdown covering the photo.
  const imageDownloadControl = !isImageItem ? null : (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleDownloadVideo();
        }}
        disabled={downloading === "preparing"}
        aria-label={t.result.downloadSingleImage}
        className="media-cta media-cta-download h-11 w-11 px-0 text-[13px] disabled:opacity-60 sm:h-auto sm:w-auto sm:min-h-[42px] sm:px-4"
      >
        {downloading === "preparing" ? (
          spinner
        ) : downloading === "error" ? (
          <>
            <DownloadIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{t.result.tryAgain}</span>
          </>
        ) : (
          <>
            <DownloadIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{t.result.download}</span>
          </>
        )}
      </button>
      {imagePlan.canDownloadAll && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleDownloadAll();
          }}
          disabled={zipState === "preparing"}
          aria-label={`${t.result.downloadAllImages} (${imagePlan.imageCount})`}
          className="media-cta media-cta-download h-11 px-3 text-[12px] disabled:opacity-60 sm:h-auto sm:min-h-[42px] sm:px-4 sm:text-[13px]"
        >
          {zipState === "preparing" ? (
            spinner
          ) : (
            <>
              <ImagesIcon className="h-4 w-4" />
              <span>All {imagePlan.imageCount}</span>
            </>
          )}
        </button>
      )}
    </>
  );

  /**
   * Fallback download for a video whose preview could not be mounted, kept
   * directly under the media so the action is never unreachable.
   */
  const mediaDownloadControls = (
    <div className="mt-3 w-full">
      <button
        type="button"
        onClick={handleDownloadVideo}
        disabled={downloading === "preparing"}
        aria-label={t.result.downloadVideoLabel}
        className="media-cta media-cta-download min-h-[48px] w-full text-[14px] disabled:opacity-60"
      >
        {downloading === "preparing" ? (
          <>
            {spinner}
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
            {t.result.download}
          </>
        )}
      </button>
    </div>
  );

  return (
    <div
      className={`result-card animate-fade-in-up mx-auto ${
        isMediaFirst
          ? `result-card--media${isImageItem ? " result-card--photo" : ""} mt-4 sm:mt-6`
          : "mt-6 w-[calc(100%-32px)] max-w-[900px] sm:mt-10 sm:w-full sm:px-5"
      }`}
      style={isMediaFirst ? ({ ["--media-ar"]: mediaAspectNum } as CSSProperties) : undefined}
    >
      <div
        className="result-surface overflow-hidden rounded-[24px] p-3 sm:p-4 md:p-5"
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
          const preview = titlePreview(caption);
          const visibleTitle = captionExpanded || !preview.isLong ? caption : preview.text;
          return (
            <div className="result-title px-1 pb-3">
              <p className="text-[14px] leading-[1.5] text-fg-muted break-words">
                {visibleTitle}
                {preview.isLong && !captionExpanded && (
                  <button
                    type="button"
                    onClick={() => setCaptionExpanded(true)}
                    className="ml-1 inline align-baseline text-[12px] font-semibold text-primary-strong transition-colors hover:text-primary-hover"
                    aria-expanded={false}
                  >
                    Show more
                  </button>
                )}
              </p>
              {preview.isLong && captionExpanded && (
                <button
                  type="button"
                  onClick={() => setCaptionExpanded(false)}
                  className="mt-1 min-h-[32px] text-[12px] font-semibold text-primary-strong transition-colors hover:text-primary-hover"
                  aria-expanded={true}
                >
                  Show less
                </button>
              )}
            </div>
          );
        })()}

        {/* ── Body: video and image results (all platforms) use the single
            media-first column with their controls on/beside the media and no
            metadata tiles; only the audio result keeps the two-column card
            (waveform preview / actions + real audio metadata). ── */}
        <div className={`result-grid grid grid-cols-1 gap-4 ${isMediaFirst ? "" : "lg:grid-cols-[minmax(0,1fr)_minmax(300px,1fr)] lg:gap-6"}`}>
          {/* LEFT: large preview */}
          <div
            ref={previewRef}
            className={`result-video-wrap min-w-0 ${isMediaFirst ? "mx-auto w-full max-w-[560px]" : ""}`}
            style={isMediaFirst ? ({ ["--media-ar"]: mediaAspectNum } as CSSProperties) : undefined}
          >
            <div
              className={`media-stage relative ${isImageItem ? "media-stage--post" : ""}`}
              style={imageCapMaxWidth ? ({ maxWidth: imageCapMaxWidth } as CSSProperties) : undefined}
              onTouchStart={showCarouselNav ? onPreviewTouchStart : undefined}
              onTouchEnd={showCarouselNav ? onPreviewTouchEnd : undefined}
            >
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
                mediaPlan.mountVideo ? (
                  // NOTE: keying by the proxied source intentionally remounts
                  // per source. That resets playing/time/mute/error state for the
                  // new video AND unmounts the old <video> element, which stops
                  // its decode — so the previous video can never keep playing (or
                  // play simultaneously) after closing the preview, a slide
                  // switch, a new search, or leaving the card. A stale/expired
                  // signed URL therefore can never linger and wrongly report
                  // "Preview unavailable" for a valid video.
                  <VideoPlayer
                    key={proxyVideoSrc}
                    src={proxyVideoSrc}
                    // Poster MUST stream through our own backend like the video
                    // itself. The raw CDN thumbnail is a different origin that
                    // the page's Content-Security-Policy does not (and should
                    // not) allow, so mounting it here produced a blocked-poster
                    // request on every Pinterest video. The proxied URL is
                    // same-origin/allowed and renders the same frame. When the
                    // thumbnail is unusable there is simply no poster (the
                    // branded poster tile/fallback handles that case).
                    poster={videoThumbSrc ?? undefined}
                    mediaType={currentMedia.type}
                    width={currentMedia.width}
                    height={currentMedia.height}
                    audioSrc={pairedAudioSrc}
                    autoPlay
                    onDurationChange={(d) => setRealDuration(d)}
                    onResolution={(w, h) => setRealResolution({ w, h })}
                    onRequestFreshMedia={recoverStaleMedia}
                    onPlayingChange={(playing) => {
                      setVideoPlaying(playing);
                      // Real playback started, so any earlier play() rejection
                      // (e.g. a transient autoplay-policy refusal) is resolved.
                      if (playing) setPlaybackError(null);
                    }}
                    onPlaybackError={() => setPlaybackError(t.result.playbackError)}
                  />
                ) : (
                  // Preview-first default: a compact poster (never the full
                  // video). Clicking the poster — or its center Play control —
                  // opens the preview and starts playback, exactly like the
                  // Preview button. The poster image streams through our own
                  // backend; a missing/broken poster falls back to a branded
                  // tile of the SAME capped size, never a huge empty player.
                  <div
                    className="media-frame media-mount relative mx-auto flex w-full items-center justify-center overflow-hidden rounded-[20px]"
                    style={{
                      background: "linear-gradient(145deg, #1a1028 0%, #0f0c1b 100%)",
                      aspectRatio: videoAspectStr,
                      cursor: posterIsClickable ? "pointer" : undefined,
                    }}
                    onClick={posterIsClickable ? handlePreview : undefined}
                  >
                    {videoThumbSrc && !posterFailed && (
                      // eslint-disable-next-line @next/next/no-img-element -- next/image cannot serve our dynamic backend /api/stream proxy URLs; the poster streams from our own backend exactly like <video> does
                      <img
                        src={videoThumbSrc}
                        alt={
                          result.title
                            ? decodeHtmlEntities(result.title).slice(0, 120)
                            : t.typeBadges.video
                        }
                        draggable={false}
                        onError={() => setPosterFailed(true)}
                        className="h-full w-full object-contain"
                        style={{ opacity: 0.92 }}
                      />
                    )}
                    {/* Center Play: the same handler as Preview, so the user
                        never has to click Preview first. A real <button> is
                        keyboard-focusable and works with touch; it swallows the
                        click so the surrounding poster surface doesn't
                        double-fire the identical action. */}
                    {posterIsClickable && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreview();
                        }}
                        aria-label={t.result.playVideo}
                        className="media-play-center"
                      >
                        <Play className="ml-0.5 h-7 w-7" fill="currentColor" strokeWidth={0} />
                      </button>
                    )}
                    {(!videoThumbSrc || posterFailed) && (
                      <p
                        className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[12px] font-semibold"
                        style={{ color: "rgba(255,255,255,0.8)" }}
                      >
                        {t.result.playVideo}
                      </p>
                    )}
                  </div>
                )
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
              // Centered photo preview: frame matches the bitmap's own ratio so
              // the full picture sits in the middle — clear, uncropped, no
              // tall empty crop from a forced Story/4:5 box.
              <div
                className="media-frame media-post relative mx-auto flex w-full items-center justify-center overflow-hidden rounded-[20px]"
                style={{
                  background: "#0a0a14",
                  aspectRatio: imgAspect ?? "1 / 1",
                  ...(imageCapMaxWidth ? { maxWidth: imageCapMaxWidth } : null),
                  ...(imageCapMaxHeight ? { maxHeight: imageCapMaxHeight } : null),
                }}
              >
                {!imgLoaded && !imgFailed && (
                  <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
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
                  onLoad={(e) => {
                    const el = e.currentTarget;
                    if (el.naturalWidth > 0 && el.naturalHeight > 0) {
                      setImgNatural({ w: el.naturalWidth, h: el.naturalHeight });
                    }
                    setImgLoaded(true);
                  }}
                  onError={handleImgError}
                  className="m-auto max-h-full max-w-full object-contain object-center"
                  style={{
                    width: "auto",
                    height: "auto",
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                    objectPosition: "center center",
                    opacity: imgLoaded ? 1 : 0,
                    transition: "opacity 180ms ease-out",
                  } as CSSProperties}
                />
              </div>
            )}
              {/* On-media Preview/Download controls for every image/carousel
                  and video. Images open a full-size lightbox; videos mount the
                  real player. Video controls are driven by the element's own
                  play/pause/ended events: before playback Preview + Download
                  show over the poster, while playing only a compact Download
                  remains. A Close control returns to the poster. */}
              {showTopMediaControls && (
                <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2.5 p-2.5 sm:p-3">
                  {isImageItem ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openImagePreview();
                      }}
                      disabled={imgFailed}
                      aria-label="Preview image"
                      className="media-cta media-cta-preview h-11 w-11 px-0 text-[13px] disabled:opacity-60 sm:h-auto sm:w-auto sm:min-h-[42px] sm:px-4"
                    >
                      <Eye className="h-4 w-4" />
                      <span className="hidden sm:inline">Preview</span>
                    </button>
                  ) : videoOverlay.showPreview ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        // Never let this bubble to the poster surface / card.
                        e.stopPropagation();
                        handlePreview();
                      }}
                      aria-label={t.result.playVideo}
                      className="media-cta media-cta-preview h-11 w-11 px-0 text-[13px] sm:h-auto sm:w-auto sm:min-h-[42px] sm:px-4"
                    >
                      <Play className="h-4 w-4" fill="currentColor" strokeWidth={0} />
                      <span className="hidden sm:inline">Preview</span>
                    </button>
                  ) : (
                    <span aria-hidden="true" />
                  )}
                  <div className="ml-auto flex items-center gap-2">
                    {isImageItem ? (
                      imageDownloadControl
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            // Download must never start or pause the video.
                            e.stopPropagation();
                            handleDownloadVideo();
                          }}
                          disabled={downloading === "preparing"}
                          aria-label={t.result.downloadVideoLabel}
                          className={`media-cta media-cta-download text-[13px] ${
                            videoOverlay.compactDownload
                              ? "media-cta--icon"
                              : "h-11 w-11 px-0 sm:h-auto sm:w-auto sm:min-h-[42px] sm:px-4"
                          }`}
                        >
                          {downloading === "preparing" ? (
                            spinner
                          ) : (
                            <DownloadIcon className="h-4 w-4" />
                          )}
                          {videoOverlay.showPreview && <span className="hidden sm:inline">{t.result.download}</span>}
                        </button>
                        {mediaPlan.mountVideo && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              closeVideoPreview();
                            }}
                            aria-label="Close preview"
                            className="media-cta media-cta-close media-cta--icon"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
              {/* Overlay carousel arrows: vertically centered on the media
                  edges, visible without covering important content. */}
              {showCarouselNav && currentMedia && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      goPrev();
                    }}
                    disabled={safeIndex === 0}
                    aria-label="Previous image"
                    className="media-nav media-nav--prev"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      goNext();
                    }}
                    disabled={safeIndex === items.length - 1}
                    aria-label="Next image"
                    className="media-nav media-nav--next"
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
            {showMediaDownloadControls && mediaDownloadControls}
            {isMediaFirst && (downloading === "error" || zipState === "error") && (
              <p className="mt-2 text-center text-[12px] font-medium text-danger" role="alert">
                {t.result.downloadFailed}
              </p>
            )}
          </div>

          {/* Actions + metadata: audio result only. Every video/image result
              uses the on/beside-media controls above and shows no metadata
              tiles. */}
          {isAudio && (
          <div className="result-details flex min-w-0 flex-col gap-3 md:gap-4">
            <div className="result-actions flex flex-col gap-2.5 sm:flex-row">
              <button
                type="button"
                onClick={handlePreview}
                className="media-cta media-cta-preview min-h-[48px] flex-1 text-[14px]"
              >
                <Play className="h-4 w-4" />
                Preview
              </button>

              <button
                type="button"
                onClick={isAudio ? handleDownloadAudio : handleDownloadVideo}
                disabled={(isAudio && !audioUrl) || downloading === "preparing" || (isAudio && audioLoading)}
                aria-label={isAudio ? t.result.downloadAudioLabel : t.result.downloadVideoLabel}
                className="media-cta media-cta-download min-h-[48px] flex-1 text-[14px] disabled:opacity-60"
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
          )}
        </div>

      </div>

      <p className={`break-words px-2 text-center text-[12px] text-fg-subtle sm:text-[12px] ${isMediaFirst ? "mt-3" : "mt-4"}`}>{t.result.tempNote}</p>

      {imagePreviewOpen && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          onClick={() => setImagePreviewOpen(false)}
        >
          <button
            type="button"
            autoFocus
            onClick={(e) => {
              e.stopPropagation();
              setImagePreviewOpen(false);
            }}
            aria-label="Close preview"
            className="media-cta media-cta-close media-cta--icon absolute right-4 top-4 z-20"
          >
            <X className="h-5 w-5" />
          </button>
          <div
            className="relative flex max-h-full max-w-full items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- full-size view of the same backend /api/stream proxy used by the card */}
            <img
              key={currentMedia?.url}
              src={imgSrc ?? streamSrc}
              alt={result.title ? decodeHtmlEntities(result.title).slice(0, 120) : t.typeBadges.photo}
              className="max-h-[86vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl"
            />
            {showCarouselNav && currentMedia && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goPrev();
                  }}
                  disabled={safeIndex === 0}
                  aria-label="Previous image"
                  className="media-nav media-nav--prev"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goNext();
                  }}
                  disabled={safeIndex === items.length - 1}
                  aria-label="Next image"
                  className="media-nav media-nav--next"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
          {showCarouselNav && currentMedia && (
            <p
              className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-[12px] font-bold tabular-nums text-white"
              aria-live="polite"
              onClick={(e) => e.stopPropagation()}
            >
              {safeIndex + 1} / {items.length}
            </p>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

