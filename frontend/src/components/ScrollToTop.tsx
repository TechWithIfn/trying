"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * ScrollToTop — one global route-change scroll behavior.
 *
 * Every client-side navigation without a hash opens the new page at the
 * very top (scrollY = 0). Browser Back/Forward is left alone so the
 * previous scroll position restores, and hash links (/#faq) are left for
 * the browser's own anchor scrolling.
 *
 * Why this exists on top of Next.js' built-in handling: programmatic
 * scrolls from page effects (tab-bar scrollIntoView, download-flow
 * auto-scroll) can run while a route transition is still settling and
 * steal the final position. An explicit, instant reset on pathname change
 * wins that race deterministically — except after popstate, where it
 * yields so restoration survives.
 */
export default function ScrollToTop() {
  const pathname = usePathname();
  // Set by the popstate listener (fires before the pathname update
  // propagates), consumed once by the pathname effect below.
  const isPopRef = useRef(false);

  useEffect(() => {
    const onPopState = () => {
      isPopRef.current = true;
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Back/Forward scroll restoration must stay automatic; "manual" would
    // strand every history traversal wherever the last page left it.
    try {
      if (window.history.scrollRestoration !== "auto") {
        window.history.scrollRestoration = "auto";
      }
    } catch {
      /* non-standard environment */
    }
    if (isPopRef.current) {
      isPopRef.current = false;
      return;
    }
    // Hash navigation: the browser scrolls to the anchor itself (with the
    // section scroll-margin offsetting the sticky header).
    if (window.location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return null;
}
