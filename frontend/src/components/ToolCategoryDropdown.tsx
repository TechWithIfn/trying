"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ArrowRight, X } from "lucide-react";
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

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function ToolCategoryDropdown() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [openPlatform, setOpenPlatform] = useState<string | null>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const dialogId = "downloadit-categories-dialog";
  const titleId = "downloadit-categories-title";
  const tallestCount = Math.max(...PLATFORM_CATEGORIES.map((cat) => cat.items.length));
  const tallestId = PLATFORM_CATEGORIES.find((cat) => cat.items.length === tallestCount)?.id;

  const close = useCallback((refocus = false) => {
    setOpen(false);
    setOpenPlatform(null);
    if (refocus) toggleRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      setOpen(false);
      setOpenPlatform(null);
    });
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const body = document.body;
    const previousHtml = html.style.overflow;
    const previousOverflow = body.style.overflow;
    const previousPad = body.style.paddingRight;
    const before = window.innerWidth - html.clientWidth;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    const removed = before - (window.innerWidth - html.clientWidth);
    if (removed > 0) body.style.paddingRight = `${removed}px`;
    return () => {
      html.style.overflow = previousHtml;
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPad;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusable = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.closest("[hidden]") && el.getClientRects().length > 0
      );

    focusable()[0]?.focus({ preventScroll: true });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close(true);
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  const toggle = () => {
    setOpen((prev) => !prev);
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        ref={toggleRef}
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={dialogId}
        aria-label="Categories"
        className={`site-categories-btn flex min-h-[44px] items-center gap-1.5 rounded-full px-3 py-1.5 text-[14px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:px-3.5 ${open
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

      {mounted && open && createPortal(
        <div className="hub-modal-root">
          <button
            type="button"
            className="hub-modal-backdrop"
            aria-label="Close categories"
            onClick={() => close(true)}
          />
          <div
            ref={dialogRef}
            id={dialogId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="hub-modal"
          >
            <div className="hub-modal-header">
              <h2 id={titleId} className="hub-modal-title">Explore All Downloaders by Platform</h2>
              <span className="hub-modal-badge">{PLATFORM_CATEGORIES.length} Platforms · Fast & Free</span>
              <button type="button" className="hub-modal-close" aria-label="Close" onClick={() => close(true)}>
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="hub-grid">
              {PLATFORM_CATEGORIES.map((cat) => {
                const CatIcon = cat.icon;
                return (
                  <div
                    key={cat.id}
                    className={`hub-card${cat.id === tallestId ? " hub-card--span" : ""}`}
                  >
                    <Link href={cat.mainHref} onClick={() => close()} className="hub-card-head">
                      <span className="hub-card-icon" style={{ background: cat.badgeBg, color: cat.color }}>
                        <CatIcon size={18} />
                      </span>
                      <span className="hub-card-title">{cat.name}</span>
                      <ArrowRight className="hub-card-arrow" aria-hidden="true" />
                    </Link>
                    <div className="hub-card-tools">
                      {cat.items.map((sub) => {
                        const SubIcon = sub.icon;
                        const selected = pathname === sub.href;
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            title={sub.desc}
                            onClick={() => close()}
                            className={`hub-tool${selected ? " is-selected" : ""}`}
                          >
                            <SubIcon size={16} className="hub-tool-icon" strokeWidth={2.2} aria-hidden="true" />
                            <span className="hub-tool-copy">
                              <span className="hub-tool-name">{sub.name}</span>
                              <span className="hub-tool-desc">{sub.desc}</span>
                            </span>
                            <ArrowRight className="hub-tool-arrow" aria-hidden="true" />
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hub-accordion">
              {PLATFORM_CATEGORIES.map((cat) => {
                const CatIcon = cat.icon;
                const expanded = openPlatform === cat.id;
                return (
                  <div key={cat.id} className="hub-acc-item">
                    <button
                      type="button"
                      className="hub-acc-row"
                      aria-expanded={expanded}
                      onClick={() => setOpenPlatform(expanded ? null : cat.id)}
                    >
                      <span className="hub-card-icon" style={{ background: cat.badgeBg, color: cat.color }}>
                        <CatIcon size={18} />
                      </span>
                      <span className="hub-acc-name">{cat.name}</span>
                      <ChevronDown className={`hub-acc-chevron${expanded ? " is-open" : ""}`} aria-hidden="true" />
                    </button>
                    {expanded && (
                      <div className="hub-acc-panel">
                        {cat.items.map((sub) => (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            title={sub.desc}
                            onClick={() => close()}
                            className="hub-tool"
                          >
                            <span className="hub-tool-copy">
                              <span className="hub-tool-name">{sub.name}</span>
                              <span className="hub-tool-desc">{sub.desc}</span>
                            </span>
                            <ArrowRight className="hub-tool-arrow" aria-hidden="true" />
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
