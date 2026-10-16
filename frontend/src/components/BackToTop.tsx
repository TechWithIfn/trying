"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/** Pixels scrolled before the button fades in. */
const SHOW_AFTER_PX = 400;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * BackToTop — one floating arrow button for the whole site, rendered once
 * in the root layout. Appears after ~400px of scrolling, hides near the top
 * and on every route change, and smooth-scrolls to the top on tap
 * (instant when the user prefers reduced motion).
 *
 * Performance: a single passive scroll listener throttled with rAF, so the
 * state update runs at most once per frame and never on every scroll event.
 * All listeners and pending frames are cleaned up on unmount.
 */
export default function BackToTop() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const visibleRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  // Route-change reset: a new page always starts at the top (see the global
  // ScrollToTop), so the button must never stay visible across navigation.
  // Deferred (repo convention) to avoid a synchronous setState in effect.
  useEffect(() => {
    queueMicrotask(() => {
      visibleRef.current = false;
      setVisible(false);
    });
  }, [pathname]);

  useEffect(() => {
    const update = () => {
      rafRef.current = null;
      const show = window.scrollY > SHOW_AFTER_PX;
      if (show !== visibleRef.current) {
        visibleRef.current = show;
        // Deferred (repo convention) to avoid a synchronous setState.
        queueMicrotask(() => setVisible(show));
      }
    };
    const onScroll = () => {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(update);
    };
    // Sync once in case the page loads already scrolled (e.g. restored).
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, []);

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={`back-to-top${visible ? " is-visible" : ""}`}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 19V5" />
        <path d="M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}
