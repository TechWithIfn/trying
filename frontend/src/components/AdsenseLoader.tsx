"use client";

import { useEffect, useRef } from "react";

const ADSENSE_SRC =
  "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX";
const STORAGE_KEY = "downloadit-cookie-consent";

/**
 * Loads the AdSense library in a consent-aware manner and only after the main
 * content is interactive. Loading ~220KB of advertising scripts (adsbygoogle.js
 * + show_ads_impl) during initial page load blocks mobile rendering, exhausts
 * slow 4G bandwidth, and violates consent policies.
 *
 * Behavior:
 * - If consent is rejected: ads are never loaded.
 * - If consent is accepted: loads on first interaction or idle after main paint.
 * - If no choice yet: loads only after real user interaction (scroll/tap/key),
 *   never blocking the initial viewport or synthetic audit runs.
 */
export default function AdsenseLoader() {
  const doneRef = useRef(false);

  useEffect(() => {
    if (doneRef.current) return;
    if (document.querySelector(`script[src="${ADSENSE_SRC}"]`)) {
      doneRef.current = true;
      return;
    }

    const consent = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (consent === "rejected") {
      // User explicitly opted out
      return;
    }

    const load = () => {
      if (doneRef.current) return;
      const currentConsent = window.localStorage.getItem(STORAGE_KEY);
      if (currentConsent === "rejected") return;

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
      window.removeEventListener("touchstart", onInteract);
    };

    const onInteract = () => load();

    // Passive listeners: load on genuine user engagement
    window.addEventListener("scroll", onInteract, { passive: true, once: true });
    window.addEventListener("pointerdown", onInteract, { passive: true, once: true });
    window.addEventListener("touchstart", onInteract, { passive: true, once: true });
    window.addEventListener("keydown", onInteract, { once: true });

    // If the user previously accepted cookies, load after the main thread is idle
    if (consent === "accepted") {
      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(load, { timeout: 4000 });
      } else {
        window.setTimeout(load, 3500);
      }
    }

    return cleanup;
  }, []);

  return null;
}
