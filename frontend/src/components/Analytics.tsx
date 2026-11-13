"use client";

import { useEffect } from "react";

const CONSENT_KEY = "downloadit-cookie-consent";

/**
 * Consent-aware GA4 loader. The measurement ID is a build-time public env
 * value; when it is absent (local/dev or before setup) nothing is downloaded.
 * The tag is deferred until idle and never loads after an explicit rejection.
 */
export default function Analytics() {
  useEffect(() => {
    const measurementId = process.env.NEXT_PUBLIC_GA_ID;
    if (!measurementId) return;
    if (window.localStorage.getItem(CONSENT_KEY) === "rejected") return;
    if (document.querySelector(`script[data-ga4="${measurementId}"]`)) return;

    let cancelled = false;
    const load = () => {
      if (cancelled) return;
      if (window.localStorage.getItem(CONSENT_KEY) === "rejected") return;
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ "gtag-start": Date.now() });

      const script = document.createElement("script");
      script.async = true;
      script.dataset.ga4 = measurementId;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
      document.head.appendChild(script);

      const inline = document.createElement("script");
      inline.text = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${measurementId}',{anonymize_ip:true});`;
      document.head.appendChild(inline);
    };

    let idleId: number | null = null;
    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(load, { timeout: 4000 });
    } else {
      idleId = window.setTimeout(load, 3500);
    }

    return () => {
      cancelled = true;
      if (idleId !== null) {
        if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idleId);
        else window.clearTimeout(idleId);
      }
    };
  }, []);

  return null;
}
