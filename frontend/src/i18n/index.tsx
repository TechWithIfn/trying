"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { LanguageCode, LanguageMeta, Strings } from "./types";
import { en } from "./en";

export const LANGUAGES: LanguageMeta[] = [
  { code: "en", label: "English", short: "EN" },
  { code: "hi", label: "हिन्दी", short: "HI" },
];

const STORAGE_KEY = "downloadit_language";
const DEFAULT_LANG: LanguageCode = "en";

// English is bundled (first paint + SSR use it). Hindi is a separate lazy
// chunk loaded on demand. Other locales were removed from the switcher
// until their translations are finished (EN + HI live only).
type CatalogModule = { [K in string]: Strings };
const catalogLoaders: Record<Exclude<LanguageCode, "en">, () => Promise<Strings>> = {
  hi: () => import("./hi").then((m: CatalogModule) => m.hi),
};

// Loaded non-English catalogs (module-level cache: one network fetch per
// language per page lifetime, then instant).
const loadedCatalogs = new Map<LanguageCode, Strings>();

function loadCatalog(code: LanguageCode): Promise<Strings> {
  if (code === "en") return Promise.resolve(en);
  const cached = loadedCatalogs.get(code);
  if (cached) return Promise.resolve(cached);
  return catalogLoaders[code]().then((catalog) => {
    loadedCatalogs.set(code, catalog);
    return catalog;
  });
}

function isLangCode(value: unknown): value is LanguageCode {
  return (
    typeof value === "string" &&
    (LANGUAGES as LanguageMeta[]).some((l) => l.code === value)
  );
}

// Deep-merge the selected catalog over English so any missing key
// automatically falls back to the English string (arrays by index).
function withFallback(selected: Strings): Strings {
  const merge = (base: unknown, over: unknown): unknown => {
    if (Array.isArray(base)) {
      const o = Array.isArray(over) ? over : [];
      return base.map((b, i) => (i < o.length && o[i] !== undefined ? merge(b, o[i]) : b));
    }
    if (base !== null && typeof base === "object" && over !== null && typeof over === "object") {
      const out: Record<string, unknown> = {};
      for (const key of Object.keys(base as Record<string, unknown>)) {
        const b = (base as Record<string, unknown>)[key];
        const o = (over as Record<string, unknown>)[key];
        out[key] = o === undefined ? b : merge(b, o);
      }
      return out;
    }
    return over === undefined || over === "" ? base : over;
  };
  return merge(en, selected) as Strings;
}

interface LanguageContextValue {
  lang: LanguageCode;
  setLang: (code: LanguageCode) => void;
  t: Strings;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: en,
});

function readStoredLang(): LanguageCode {
  if (typeof window === "undefined") return DEFAULT_LANG;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLangCode(stored)) return stored;
  } catch {
    /* storage unavailable */
  }
  return DEFAULT_LANG;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LanguageCode>(DEFAULT_LANG);
  // Non-English strings arrive asynchronously; until then the UI keeps
  // rendering English (same strings the server prerendered — no hydration
  // mismatch, no layout shift from missing text).
  const [catalog, setCatalog] = useState<Strings>(en);
  // Guards rapid language switches: only the latest request may install
  // its catalog, so a slow earlier fetch can never overwrite a newer one.
  const requestRef = useRef(0);

  const applyLang = useCallback((code: LanguageCode) => {
    setLangState(code);
    if (code === DEFAULT_LANG) {
      requestRef.current += 1;
      setCatalog(en);
      return;
    }
    const request = requestRef.current + 1;
    requestRef.current = request;
    loadCatalog(code).then(
      (strings) => {
        if (requestRef.current === request) setCatalog(strings);
      },
      () => {
        if (requestRef.current === request) setCatalog(en);
      }
    );
  }, []);

  // Restore the saved language after mount (initial render stays English
  // so server and client HTML always match — no hydration mismatch).
  // Deferred (repo convention) to avoid a synchronous setState in effect.
  useEffect(() => {
    queueMicrotask(() => {
      const stored = readStoredLang();
      if (stored !== DEFAULT_LANG) applyLang(stored);
    });
  }, [applyLang]);

  // Keep <html lang> in sync for accessibility and SEO.
  useEffect(() => {
    try {
      document.documentElement.setAttribute("lang", lang);
    } catch {
      /* non-DOM environment */
    }
  }, [lang ]);

  const setLang = useCallback(
    (code: LanguageCode) => {
      if (!isLangCode(code)) return;
      applyLang(code);
      try {
        window.localStorage.setItem(STORAGE_KEY, code);
      } catch {
        /* storage unavailable */
      }
    },
    [applyLang]
  );

  const t = useMemo(() => withFallback(catalog), [catalog]);
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
