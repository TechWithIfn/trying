"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * ScrollReveal — hardened against "stuck hidden" states.
 *
 * Root causes this guards (mostly mobile, after client-side navigation or
 * back/forward restore):
 * 1. An IntersectionObserver that never fires (throttled tab during route
 *    transition, element inside a transformed ancestor, observer created
 *    while the page is hidden) would previously leave the section at
 *    opacity:0 forever. A safety timeout now forces visibility.
 * 2. bfcache restores can replay without re-running effects in edge cases;
 *    a `pageshow` listener re-checks visibility on every arrival.
 * 3. The CSS `.visible` class existed but was never applied (state lived
 *    only in inline styles). Both are now kept in sync.
 * 4. The stagger `transition-delay` used to persist after reveal, which
 *    delayed every later transition on the wrapper. It is cleared once
 *    visible.
 * Server-rendered HTML stays visible without JS via the `html:not(.js)`
 * CSS fallback, and prefers-reduced-motion skips the animation entirely.
 */
const SAFETY_TIMEOUT_MS = 1200;

export default function ScrollReveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  /** Extra classes on the observed wrapper (e.g. flex/grid sizing). */
  className?: string;
  /** Stagger entrance in ms; applied as transition-delay until revealed. */
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let cancelled = false;
    let observer: IntersectionObserver | null = null;
    const reveal = () => {
      if (cancelled) return;
      cancelled = true;
      observer?.disconnect();
      // Deferred (repo convention) to avoid a synchronous setState.
      queueMicrotask(() => setVisible(true));
    };

    // Respect prefers-reduced-motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      reveal();
      return () => {
        cancelled = true;
      };
    }

    observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) reveal();
      },
      { threshold: 0.1 }
    );
    observer.observe(el);

    // Fallback: nothing on this site may stay invisible. If the observer
    // never fires (backgrounded tab, odd mobile-Safari cases), reveal anyway.
    const safety = window.setTimeout(reveal, SAFETY_TIMEOUT_MS);

    // bfcache / back-forward restore: re-check on every arrival. If the
    // section is already in view, reveal immediately instead of trusting
    // a stale observer.
    const onPageShow = () => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) reveal();
    };
    window.addEventListener("pageshow", onPageShow);

    return () => {
      cancelled = true;
      window.clearTimeout(safety);
      window.removeEventListener("pageshow", onPageShow);
      observer?.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`fade-section${visible ? " visible" : ""}${className ? ` ${className}` : ""}`}
      style={
        visible
          ? { opacity: 1, transform: "translateY(0)" }
          : delay > 0
            ? { transitionDelay: `${delay}ms` }
            : undefined
      }
    >
      {children}
    </div>
  );
}
