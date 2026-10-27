"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "downloadit-cookie-consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setVisible(window.localStorage.getItem(STORAGE_KEY) === null);
    }, 0);
    return () => window.clearTimeout(id);
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
      <p className="text-sm leading-6 text-fg-muted">
        Downloadit uses essential storage to remember this choice. If advertising
        is enabled, optional advertising cookies are used only with your consent.
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
