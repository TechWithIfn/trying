"use client";

import { useEffect, useRef } from "react";

const ADSENSE_SRC =
  "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX";
const IDLE_TIMEOUT_MS = 3000;

/**
 * Loads the AdSense library only after the page is interactive — on first
 * user interaction (scroll/pointer/key) or after ~3s idle, whichever comes
 * first. The ~220KB ad stack (adsbygoogle.js + show_ads_impl) otherwise
 * competes with first paint and hydration on mobile.
 *
 * NOTE (account review): if AdSense site verification ever complains the
 * snippet is not found, switch back to next/script strategy="afterInteractive"
 * in layout.tsx. Verification crawlers don't scroll or wait for idle.
 */
export default function AdsenseLoader() {
  const doneRef = useRef(false);

  useEffect(() => {
    if (doneRef.current) return;
    if (document.querySelector(`script[src="${ADSENSE_SRC}"]`)) {
      doneRef.current = true;
      return;
    }
    const load = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      cleanup();
      const s = document.createElement("script");
      s.src = ADSENSE_SRC;
      s.async = true;
      s.crossOrigin = "anonymous";
      document.head.appendChild(s);
    };
    const cleanup = () => {
      window.removeEventListener("scroll", onInteract);
      window.removeEventListener("pointerdown", onInteract);
      window.removeEventListener("keydown", onInteract);
      if (idleId !== null) {
        if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idleId);
        else window.clearTimeout(idleId);
      }
    };
    const onInteract = () => load();
    // Passive listeners: never block scrolling.
    window.addEventListener("scroll", onInteract, { passive: true, once: true });
    window.addEventListener("pointerdown", onInteract, { passive: true, once: true });
    window.addEventListener("keydown", onInteract, { once: true });
    let idleId: number | null = null;
    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(load, { timeout: IDLE_TIMEOUT_MS });
    } else {
      idleId = window.setTimeout(load, IDLE_TIMEOUT_MS);
    }
    return cleanup;
  }, []);

  return null;
}
