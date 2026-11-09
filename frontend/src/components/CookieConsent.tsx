"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "downloadit-cookie-consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Defer mounting until the browser is idle and above-the-fold content has painted.
    // Mounting immediately on hydration causes this fixed dialog's text to become the LCP
    // element instead of the hero heading, inflating mobile LCP from ~1.2s to 3.7-5.6s.
    const show = () => {
      if (typeof window !== "undefined" && window.localStorage.getItem(STORAGE_KEY) === null) {
        setVisible(true);
      }
    };

    let idleId: number | null = null;
    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(show, { timeout: 3000 });
    } else {
      idleId = window.setTimeout(show, 2500);
    }

    return () => {
      if (idleId !== null) {
        if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idleId);
        else window.clearTimeout(idleId);
      }
    };
  }, []);

  if (!visible) return null;

  const choose = (value: "accepted" | "rejected") => {
    window.localStorage.setItem(STORAGE_KEY, value);
    setVisible(false);
  };

  return (
    <aside
      aria-label="Cookie preferences"
      className={[
        // Compact card: white background, rounded corners, subtle shadow,
        // thin low-contrast border, readable wrapping text.
        "fixed z-50 rounded-2xl border border-border bg-card p-5 shadow-xl text-fg",
        // Mobile: within viewport, 12-16px side/bottom spacing, safe-area
        // insets, full available width, buttons stacked.
        "bottom-[16px] left-[16px] right-[16px] max-w-none",
        "pb-[max(16px,env(safe-area-inset-bottom))]",
        // Desktop: bottom-right corner, comfortable spacing from edges,
        // compact max width (~448px), buttons side-by-side (wrap as fallback).
        "sm:bottom-6 sm:right-6 sm:left-auto sm:max-w-[448px] sm:pb-6",
      ].join(" ")}
    >
      <p className="text-[13px] leading-[1.4] text-fg-muted">
        We use essential storage for functionality and optional advertising cookies with your consent.
        See our <a href="/privacy" className="font-semibold text-primary-strong hover:underline">
          Privacy Policy
        </a>.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={() => choose("accepted")}
          className="w-full sm:w-auto rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
        >
          Accept optional cookies
        </button>
        <button
          type="button"
          onClick={() => choose("rejected")}
          className="w-full sm:w-auto rounded-xl border border-border px-4 py-2 text-sm font-semibold text-fg transition-colors hover:bg-primary-light"
        >
          Reject optional cookies
        </button>
      </div>
    </aside>
  );
}
