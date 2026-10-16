"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * useAutoScrollFlow — one shared auto-scroll flow for every downloader
 * (homepage hero + all tool pages, which all render through HeroDownloader).
 *
 * Behavior per request (keyed by sequence number, so retries re-arm):
 * - "loading": scroll once to the progress card when the request starts.
 * - "success": scroll once to the result preview + Download button.
 * - "error": scroll once to the error message (covers validation errors and
 *   keyboard-open layout shifts, where the message can sit below the fold).
 *
 * Guarantees:
 * - Never scrolls when the anchor is already fully in the viewport.
 * - At most one programmatic scroll per (status, request), so manual
 *   scrolling is never fought and double taps can't stack scrolls.
 * - Honors prefers-reduced-motion (instant jump instead of smooth scroll).
 * - Reads the anchor's computed `scroll-margin-top` (sticky header clearance
 *   + iOS safe-area inset live in CSS), so JS and CSS can never disagree.
 */
export type FlowStatus = "loading" | "success" | "error";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function isFullyInViewport(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  return rect.top >= 0 && rect.bottom <= window.innerHeight;
}

function readScrollMarginTop(el: HTMLElement): number {
  const raw = window.getComputedStyle(el).scrollMarginTop;
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function useAutoScrollFlow() {
  const pathname = usePathname();
  const anchorRef = useRef<HTMLDivElement | null>(null);
  // Last request sequence already scrolled for each status. Refs — not
  // state — so progress re-renders can never trigger extra scrolls.
  const scrolledRef = useRef<Record<FlowStatus, number>>({
    loading: 0,
    success: 0,
    error: 0,
  });
  // Pending rAF scroll, so unmount can cancel a scroll that would otherwise
  // land on whatever page the user navigated to next.
  const rafRef = useRef<number | null>(null);

  // Route-change reset: the hook must never act on a page it no longer
  // belongs to. Fresh guards per route, plus cancel any queued scroll.
  useEffect(() => {
    scrolledRef.current = { loading: 0, success: 0, error: 0 };
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, [pathname]);

  // Unmount cleanup: a scroll queued just before navigation must not fire
  // on the next page.
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  /** Scroll the anchor into view unless it is already fully visible. */
  const scrollToAnchor = useCallback(() => {
    const el = anchorRef.current;
    if (!el || typeof window === "undefined") return;
    // Do not steal the viewport when everything is already on screen.
    if (isFullyInViewport(el)) return;
    const top = Math.max(
      0,
      el.getBoundingClientRect().top + window.scrollY - readScrollMarginTop(el)
    );
    if (prefersReducedMotion()) {
      window.scrollTo(0, top);
      return;
    }
    window.scrollTo({ top, behavior: "smooth" });
  }, []);

  /**
   * Call on every status transition. Scrolls at most once per
   * (status, requestSeq), after the new card has mounted (rAF) so layout
   * is stable — a synchronous scroll right after setState races the commit
   * and can silently miss on mobile.
   */
  const notifyTransition = useCallback(
    (status: FlowStatus, requestSeq: number) => {
      if (scrolledRef.current[status] === requestSeq) return;
      scrolledRef.current[status] = requestSeq;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        scrollToAnchor();
      });
    },
    [scrollToAnchor]
  );

  /**
   * Dismiss the on-screen keyboard before scrolling. With the keyboard open
   * the visual viewport is shrunk and any scroll lands wrong on both iOS
   * Safari and Android Chrome — blur first, then scroll.
   */
  const blurForKeyboard = useCallback(() => {
    if (typeof document === "undefined") return;
    const active = document.activeElement as HTMLElement | null;
    active?.blur?.();
  }, []);

  return { anchorRef, scrollToAnchor, notifyTransition, blurForKeyboard };
}
