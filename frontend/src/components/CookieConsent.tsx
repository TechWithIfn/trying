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
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl rounded-2xl border border-border bg-card p-4 shadow-xl"
    >
      <p className="text-sm leading-6 text-fg-muted">
        Downloadit uses essential storage to remember this choice. If advertising
        is enabled, optional advertising cookies are used only with your consent.
        See our <a href="/privacy" className="font-semibold text-primary-strong hover:underline">Privacy Policy</a>.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => choose("accepted")} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white">
          Accept optional cookies
        </button>
        <button type="button" onClick={() => choose("rejected")} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-fg">
          Reject optional cookies
        </button>
      </div>
    </aside>
  );
}
