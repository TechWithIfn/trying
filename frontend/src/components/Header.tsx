"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Globe,
  HelpCircle,
  Download,
  Menu,
  X,
  Check,
  Home as HomeIcon,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useLanguage, LANGUAGES } from "@/i18n";
import type { DownloaderTab } from "@/components/HeroDownloader";
import ToolCategoryDropdown, {
  FacebookIcon,
  InstagramIcon,
  PinterestIcon,
  ThreadsIcon,
  TwitterIcon,
  YouTubeIcon,
} from "@/components/ToolCategoryDropdown";
import { PLATFORM_CATEGORIES } from "@/config/categories";

interface HeaderProps {
  activeDownloaderTab?: DownloaderTab | null;
  onDownloaderTabChange?: (tab: DownloaderTab | null) => void;
}

export default function Header({ activeDownloaderTab }: HeaderProps) {
  const { t, lang, setLang } = useLanguage();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    instagram: true, // open first by default for quick access
  });
  const langRef = useRef<HTMLDivElement>(null);

  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];
  const onHelp = pathname === "/help";
  const onHome = pathname === "/" && !activeDownloaderTab;
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock background scrolling while drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Close language dropdown on outside click or Escape
  useEffect(() => {
    if (!langOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLangOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [langOpen]);

  const closeMobileMenu = useCallback(() => {
    setMobileOpen(false);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    queueMicrotask(() => {
      setMobileOpen(false);
      setLangOpen(false);
    });
  }, [pathname]);

  // Close on Escape
  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMobileMenu();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen, closeMobileMenu]);

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const iconBtn =
    "site-icon-btn flex h-10 items-center justify-center gap-1.5 rounded-xl px-2.5 text-[14px] font-semibold text-fg-muted transition-colors hover:bg-primary-light hover:text-primary";

  const platformLinks = [
    { href: "/instagram-video-downloader", label: "Instagram", Icon: InstagramIcon, color: "#ec5fa8" },
    { href: "/pinterest-video-downloader", label: "Pinterest", Icon: PinterestIcon, color: "#e60023" },
    { href: "/youtube-video-downloader", label: "YouTube", Icon: YouTubeIcon, color: "#ff0000" },
    { href: "/facebook-video-downloader", label: "Facebook", Icon: FacebookIcon, color: "#1877f2" },
    { href: "/twitter-video-downloader", label: "Twitter/X", Icon: TwitterIcon, color: "#0f172a" },
    { href: "/threads-video-downloader", label: "Threads", Icon: ThreadsIcon, color: "#0f172a" },
  ] as const;

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full transition-all duration-200 ${
          scrolled
            ? "bg-bg-elevated/95 backdrop-blur-xl border-b border-border/70 shadow-[var(--shadow-xs)]"
            : "bg-bg/90 backdrop-blur-xl border-b border-border/50"
        }`}
      >
        <div className="site-header-inner mx-auto flex h-[68px] max-w-[1240px] items-center px-4 sm:px-6 lg:px-8 xl:px-12">
          {/* LEFT: Downloadit logo */}
          <div className="flex flex-1 items-center justify-start min-w-0">
            <Link
              href="/"
              className="flex shrink-0 items-center gap-2.5 text-fg no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-xl"
              aria-label={t.footer.homeLabel}
            >
              <span
                className="site-logo-badge flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-xl text-white"
                style={{ background: "var(--brand-gradient)", boxShadow: "0 4px 16px rgba(124,77,245,0.28)" }}
              >
                <Download className="h-5 w-5" strokeWidth={2.4} />
              </span>
              <span className="site-logo-text truncate text-[22px] font-bold tracking-[-0.01em]">
                Download<span className="text-primary">it</span>
              </span>
            </Link>
          </div>

          {/* CENTER: Home + Categories (Desktop only, mathematically centered) */}
          <nav
            className="hidden md:flex shrink-0 items-center justify-center gap-2"
            aria-label="Main Navigation"
          >
            <Link
              href="/"
              className={`rounded-full px-4 py-1.5 text-[14px] font-semibold transition-colors ${
                onHome
                  ? "bg-primary-light text-primary-strong"
                  : "text-fg-muted hover:bg-primary-light hover:text-primary"
              }`}
            >
              Home
            </Link>

            <ToolCategoryDropdown />
          </nav>

          {/* RIGHT: Platform icons + Language selector + Help (Desktop) + Hamburger (Mobile) */}
          <div className="flex flex-1 items-center justify-end gap-2 sm:gap-2.5 min-w-0">
            {/* Supported platform icons (Desktop) */}
            <div
              className="hidden lg:flex items-center gap-1 border-r border-border/60 pr-2.5"
              aria-label="Supported platforms"
            >
              {platformLinks.map(({ href, label, Icon, color }) => (
                <Link
                  key={href}
                  href={href}
                  aria-label={`${label} downloader`}
                  title={`${label} Downloader`}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-muted transition-all duration-150 hover:bg-primary-light hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  style={{ color }}
                >
                  <Icon size={18} />
                </Link>
              ))}
            </div>

            {/* Language Selector */}
            <div className="relative" ref={langRef}>
              <button
                type="button"
                onClick={() => setLangOpen((o) => !o)}
                className={iconBtn}
                aria-label={t.common.language}
                aria-haspopup="menu"
                aria-expanded={langOpen}
              >
                <Globe className="h-4 w-4 shrink-0" strokeWidth={2} />
                <span className="text-[13px]">{current.short}</span>
                <ChevronDown
                  className="h-3 w-3 shrink-0 opacity-60 transition-transform duration-200"
                  style={{ transform: langOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </button>

              {langOpen && (
                <div
                  role="menu"
                  aria-label={t.common.language}
                  className="absolute right-0 top-full z-50 mt-2 max-h-[60vh] w-[14rem] overflow-y-auto rounded-2xl p-1.5 animate-fade-in"
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    boxShadow: "var(--shadow-card-hover)",
                  }}
                >
                  <p className="flex items-center gap-2 px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
                    <Globe className="h-3.5 w-3.5" strokeWidth={2} />
                    {t.common.language}
                  </p>
                  {LANGUAGES.map((l) => {
                    const active = l.code === lang;
                    return (
                      <button
                        key={l.code}
                        type="button"
                        role="menuitemradio"
                        aria-checked={active}
                        onClick={() => {
                          setLang(l.code);
                          setLangOpen(false);
                        }}
                        className="flex min-h-[40px] w-full items-center gap-2.5 rounded-xl px-3 text-left text-[13.5px] transition-colors hover:bg-primary-light"
                        style={{
                          background: active ? "var(--primary-light)" : "transparent",
                          color: active ? "var(--primary)" : "var(--fg)",
                          fontWeight: active ? 700 : 500,
                        }}
                      >
                        {active ? (
                          <Check className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} />
                        ) : (
                          <span className="h-4 w-4 shrink-0" aria-hidden="true" />
                        )}
                        <span className="flex-1">{l.label}</span>
                        <span className="text-[11.5px] font-semibold text-fg-subtle">{l.short}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Help Link */}
            <Link
              href="/help"
              className={`${iconBtn} hidden sm:flex`}
              aria-label={t.common.help}
              aria-current={onHelp ? "page" : undefined}
              style={onHelp ? { color: "var(--primary)" } : undefined}
            >
              <HelpCircle className="h-4 w-4 shrink-0" strokeWidth={2} />
              <span style={onHelp ? { fontWeight: 700 } : undefined}>
                {t.common.help}
              </span>
            </Link>

            {/* Mobile Hamburger Button */}
            <button
              ref={menuButtonRef}
              type="button"
              className="site-menu-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-fg-muted transition-colors hover:bg-primary-light hover:text-primary md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label={t.header.openMenu}
              aria-expanded={mobileOpen}
              aria-controls="downloadit-mobile-menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm animate-fade-in md:hidden"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer Navigation */}
      <div
        id="downloadit-mobile-menu"
        className={`mobile-drawer fixed inset-y-0 right-0 z-50 flex h-full w-[min(92vw,400px)] flex-col overflow-hidden rounded-l-[24px] bg-bg-elevated shadow-[var(--shadow-xl)] transition-transform duration-300 ease-out md:hidden ${
          mobileOpen ? "translate-x-0 pointer-events-auto" : "translate-x-full pointer-events-none"
        }`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!mobileOpen}
        aria-label={t.common.mobileNav}
        inert={!mobileOpen}
      >
        {/* Mobile Drawer Header */}
        <div className="mobile-drawer-header flex h-[64px] shrink-0 items-center justify-between border-b border-border px-5">
          <Link
            href="/"
            onClick={closeMobileMenu}
            className="flex items-center gap-2 text-fg no-underline"
            aria-label={t.footer.homeLabel}
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
              style={{ background: "var(--brand-gradient)" }}
            >
              <Download className="h-4 w-4" strokeWidth={2.4} />
            </span>
            <span className="text-[17px] font-bold">
              Download<span className="text-primary">it</span>
            </span>
          </Link>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-fg-muted transition-colors hover:bg-primary-light hover:text-primary"
            onClick={() => {
              closeMobileMenu();
              menuButtonRef.current?.focus({ preventScroll: true });
            }}
            aria-label={t.header.closeMenu}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mobile Drawer Content */}
        <nav
          className="mobile-drawer-nav flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain p-4"
          aria-label={t.common.mobileNav}
        >
          {/* Home Link */}
          <Link
            href="/"
            onClick={closeMobileMenu}
            className={`flex min-h-[44px] items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[15px] font-semibold transition-colors ${
              onHome ? "bg-primary-light text-primary-strong" : "text-fg hover:bg-primary-light hover:text-primary"
            }`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary">
              <HomeIcon className="h-4 w-4" />
            </span>
            <span>Home</span>
          </Link>

          {/* Categories Title */}
          <div className="mt-2 flex items-center justify-between px-2 pt-2 pb-1 border-t border-border-light">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-fg-subtle">
              Categories
            </p>
            <span className="text-[11px] font-semibold text-primary">6 Platforms</span>
          </div>

          {/* Expandable Platform Categories */}
          <div className="space-y-2">
            {PLATFORM_CATEGORIES.map((cat) => {
              const CatIcon = cat.icon;
              const isExpanded = !!expandedCategories[cat.id];
              return (
                <div
                  key={cat.id}
                  className="rounded-2xl border border-border/80 overflow-hidden bg-card transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    aria-expanded={isExpanded}
                    className="flex w-full min-h-[46px] items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-primary-light/50"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                        style={{ background: cat.badgeBg, color: cat.color }}
                      >
                        <CatIcon size={18} />
                      </span>
                      <div className="min-w-0">
                        <span className="block text-[14px] font-bold text-fg truncate">
                          {cat.name}
                        </span>
                        <span className="block text-[11px] text-fg-subtle truncate">
                          {cat.desc}
                        </span>
                      </div>
                    </div>
                    <ChevronDown
                      className="h-4 w-4 shrink-0 text-fg-muted transition-transform duration-200"
                      style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                      strokeWidth={2}
                    />
                  </button>

                  {/* Expanded Sub-Downloaders */}
                  {isExpanded && (
                    <div className="border-t border-border-light bg-bg/50 px-2 py-1.5 space-y-1">
                      <Link
                        href={cat.mainHref}
                        onClick={closeMobileMenu}
                        className="flex items-center justify-between rounded-xl px-2.5 py-2 text-[12.5px] font-bold text-primary hover:bg-primary-light transition-colors"
                      >
                        <span>Visit {cat.shortName} Main Hub</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                      {cat.items.map((item) => {
                        const ItemIcon = item.icon;
                        const isSelected = pathname === item.href;
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            onClick={closeMobileMenu}
                            className={`flex min-h-[42px] items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium transition-colors ${
                              isSelected
                                ? "bg-primary-light text-primary font-bold"
                                : "text-fg hover:bg-primary-light hover:text-primary"
                            }`}
                          >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-card text-primary shadow-xs">
                              <ItemIcon size={13} strokeWidth={2.2} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <span className="block text-[13px] font-semibold leading-tight text-fg truncate">
                                {item.name}
                              </span>
                              <span className="block text-[10.5px] text-fg-muted truncate">
                                {item.desc}
                              </span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="my-2 border-t border-border-light" />

          {/* Help link */}
          <Link
            href="/help"
            onClick={closeMobileMenu}
            className={`flex min-h-[44px] items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[14.5px] font-semibold transition-colors ${
              onHelp ? "bg-primary-light text-primary" : "text-fg hover:bg-primary-light hover:text-primary"
            }`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary">
              <HelpCircle className="h-4 w-4" />
            </span>
            <span>{t.common.help} &amp; FAQ</span>
          </Link>
        </nav>

        {/* Mobile Drawer Footer: Language Selection */}
        <div className="mobile-drawer-footer border-t border-border bg-card/60 p-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
            {t.common.language}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {LANGUAGES.map((l) => {
              const active = l.code === lang;
              return (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setLang(l.code)}
                  className={`rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${
                    active
                      ? "bg-primary text-white shadow-xs"
                      : "border border-border bg-card text-fg-muted hover:bg-primary-light hover:text-primary"
                  }`}
                >
                  {l.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
