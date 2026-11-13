export type AnalyticsEventName =
  | "paste_link"
  | "get_media"
  | "download"
  | "error_shown";

type Params = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

/**
 * Privacy-conscious event bridge.
 *
 * Events are always pushed to the local dataLayer so a consent-gated GA4 tag
 * can consume them later. No network request is made unless Analytics has
 * loaded a real measurement ID and the visitor has not rejected optional
 * cookies. Never pass a pasted URL, filename, or any personal data here.
 */
export function trackEvent(name: AnalyticsEventName, params: Params = {}): void {
  if (typeof window === "undefined") return;
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined)
  );
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: name, ...clean });
    window.dispatchEvent(
      new CustomEvent("downloadit:analytics", { detail: { name, params: clean } })
    );
  } catch {
    /* analytics must never break a download */
  }
}
