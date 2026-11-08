"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ArrowRight } from "lucide-react";
import { PLATFORM_CATEGORIES } from "@/config/categories";

export function FacebookIcon({ className, size = 24 }: { className?: string; size?: number; strokeWidth?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.5 21v-8h2.75l.4-3h-3.15V8.08c0-.87.24-1.46 1.5-1.46h1.8V3.94c-.31-.04-1.38-.14-2.63-.14-2.6 0-4.38 1.59-4.38 4.5V10H7v3h2.79v8h3.71Z" />
    </svg>
  );
}

export function InstagramIcon({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  );
}

export function PinterestIcon({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.1 2.5c-5.2 0-8.3 3.7-8.3 7.7 0 3 1.7 5.7 4.5 6.7-.1-.6-.1-1.6 0-2.3l1-4.1s-.3-.7-.3-1.7c0-1.6.9-2.8 2-2.8.9 0 1.3.7 1.3 1.5 0 .9-.6 2.2-.9 3.4-.3 1 .5 1.8 1.5 1.8 1.8 0 3.1-1.9 3.1-4.7 0-2.5-1.8-4.2-4.4-4.2-3 0-4.8 2.2-4.8 4.5 0 .9.3 1.8.8 2.3.1.1.1.2.1.4l-.3 1.1c-.1.4-.4.5-.8.3-1.2-.5-2-2.2-2-3.6 0-2.9 2.1-6.9 7.5-6.9 4 0 6.7 2.9 6.7 6.1 0 4.1-2.3 7.2-5.5 7.2-1.1 0-2.1-.6-2.5-1.3l-.7 2.8c-.3 1.1-1.1 2.5-1.6 3.3 1.2.4 2.4.6 3.7.6 5.2 0 9.5-4.2 9.5-9.5S17.3 2.5 12.1 2.5Z" />
    </svg>
  );
}

export function YouTubeIcon({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.6 7.2a2.8 2.8 0 0 0-2-2C17.8 4.7 12 4.7 12 4.7s-5.8 0-7.6.5a2.8 2.8 0 0 0-2 2C1.9 9 1.9 12 1.9 12s0 3 .5 4.8a2.8 2.8 0 0 0 2 2c1.8.5 7.6.5 7.6.5s5.8 0 7.6-.5a2.8 2.8 0 0 0 2-2c.5-1.8.5-4.8.5-4.8s0-3-.5-4.8ZM10 15.7V8.3l6.3 3.7-6.3 3.7Z" />
    </svg>
  );
}

export function TwitterIcon({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.9 2H22l-6.77 7.74L23.2 22h-6.24l-4.89-6.39L6.48 22H3.37l7.24-8.28L2.8 2h6.4l4.42 5.84L18.9 2Zm-1.09 17.87h1.73L8.26 4.03H6.4l11.41 15.84Z" />
    </svg>
  );
}

export function ThreadsIcon({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3.2c-4.9 0-8.3 3.4-8.3 8.5 0 5.3 3.4 9.1 8.3 9.1 4.1 0 7.1-2.5 7.1-6.1 0-2.9-2-4.8-5.3-4.8-2.7 0-4.3 1.3-4.3 3.1 0 1.4 1.1 2.4 2.6 2.4 1.1 0 2-.6 2.4-1.6-.3 2-1.5 3.2-3.5 3.2-2.7 0-4.4-2.1-4.4-5.4 0-3.5 2-5.8 5.3-5.8 2.2 0 3.8 1 4.8 2.8l1.8-1c-1.3-2.8-3.6-4.4-6.5-4.4Z" fill="currentColor" />
    </svg>
  );
}

export default function ToolCategoryDropdown() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = "downloadit-categories-dropdown";

  const close = useCallback((refocus = false) => {
    setOpen(false);
    if (refocus) toggleRef.current?.focus({ preventScroll: true });
  }, []);

  // Close on route change
  useEffect(() => {
    queueMicrotask(() => {
      setOpen(false);
    });
  }, [pathname]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close(true);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen((prev) => !prev);
  };

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      <button
        ref={toggleRef}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Categories menu"
        className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[14px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${open
            ? "bg-primary-light text-primary-strong shadow-xs"
            : "text-fg-muted hover:bg-primary-light hover:text-primary"
          }`}
      >
        <span>Categories</span>
        <ChevronDown
          className="h-3.5 w-3.5 shrink-0 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          strokeWidth={2.2}
          aria-hidden="true"
        />
      </button>

      {/* Categories Dropdown Mega Menu */}
      <div
        ref={menuRef}
        id={menuId}
        role="menu"
        aria-label="Downloader Categories"
        aria-hidden={!open}
        className={`categories-dropdown-menu absolute left-1/2 -translate-x-1/2 top-full z-50 mt-2.5 w-[760px] max-w-[calc(100vw-2rem)] rounded-2xl p-4 transition-all duration-200 ease-out ${open
            ? "visible translate-y-0 scale-100 opacity-100"
            : "invisible -translate-y-1 scale-[0.98] opacity-0 pointer-events-none"
          }`}
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          boxShadow: "0 18px 50px rgba(60, 40, 120, 0.14), 0 4px 16px rgba(0, 0, 0, 0.06)",
        }}
      >
        <div className="mb-3 flex items-center justify-between border-b border-border/60 pb-2.5 px-1">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary-strong">
              Downloadit Hub
            </p>
            <h3 className="text-[15px] font-bold text-fg">Explore All Downloaders by Platform</h3>
          </div>
          <span className="text-[12px] font-medium text-fg-subtle">
            6 Platforms · Fast & Free
          </span>
        </div>

        <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-3 max-h-[75vh] overflow-y-auto p-1">
          {PLATFORM_CATEGORIES.map((cat) => {
            const CatIcon = cat.icon;
            return (
              <div
                key={cat.id}
                className="group/card flex flex-col h-fit rounded-xl border border-border/70 p-2.5 sm:p-3 transition-colors hover:border-primary/30 hover:bg-bg/50"
                style={{ background: "var(--card)" }}
              >
                {/* Platform Header */}
                <Link
                  href={cat.mainHref}
                  role="menuitem"
                  tabIndex={open ? 0 : -1}
                  onClick={() => close()}
                  className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-border/40 group-hover/card:text-primary transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: cat.badgeBg, color: cat.color }}
                    >
                      <CatIcon size={15} />
                    </span>
                    <span className="font-bold text-[13px] sm:text-[13.5px] text-fg group-hover/card:text-primary truncate">
                      {cat.name}
                    </span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-40 group-hover/card:opacity-100 group-hover/card:translate-x-0.5 transition-all text-primary" />
                </Link>

                {/* Sub items */}
                <div className="space-y-0.5">
                  {cat.items.map((sub) => {
                    const SubIcon = sub.icon;
                    const isSubSelected = pathname === sub.href;
                    return (
                      <Link
                        key={sub.name}
                        href={sub.href}
                        role="menuitem"
                        tabIndex={open ? 0 : -1}
                        onClick={() => close()}
                        className={`flex flex-col rounded-lg px-2 py-1 transition-colors ${
                          isSubSelected
                            ? "bg-primary-light text-primary-strong"
                            : "hover:bg-primary-light/60 text-fg"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <SubIcon size={12.5} className="shrink-0 text-primary opacity-80" strokeWidth={2.2} />
                          <span className="text-[12px] font-semibold text-fg leading-tight">
                            {sub.name}
                          </span>
                        </div>
                        <span className="text-[10.5px] leading-tight text-fg-subtle line-clamp-1 pl-4">
                          {sub.desc}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
