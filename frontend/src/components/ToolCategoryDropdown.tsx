"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Film, Video, Image as ImageIcon, Clock, Music2, Pin, ImagePlay, Play } from "lucide-react";

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

export type DropdownToolItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number; strokeWidth?: number }>;
  iconBg: string;
  iconColor: string;
};

export const DROPDOWN_TOOLS: DropdownToolItem[] = [
  {
    href: "/instagram-reels-downloader",
    label: "Instagram Reels Downloader",
    icon: Film,
    iconBg: "rgba(236, 95, 168, 0.12)",
    iconColor: "var(--primary)",
  },
  {
    href: "/instagram-video-downloader",
    label: "Instagram Video Downloader",
    icon: Video,
    iconBg: "rgba(124, 77, 245, 0.12)",
    iconColor: "var(--primary)",
  },
  {
    href: "/instagram-photo-downloader",
    label: "Instagram Photo & Carousel Downloader",
    icon: ImageIcon,
    iconBg: "rgba(245, 142, 91, 0.14)",
    iconColor: "var(--primary)",
  },
  {
    href: "/instagram-story-downloader",
    label: "Instagram Story Downloader",
    icon: Clock,
    iconBg: "rgba(14, 165, 233, 0.12)",
    iconColor: "var(--primary)",
  },
  {
    href: "/instagram-audio-downloader",
    label: "Instagram Audio Downloader",
    icon: Music2,
    iconBg: "rgba(16, 185, 129, 0.12)",
    iconColor: "var(--primary)",
  },
  {
    href: "/pinterest-video-downloader",
    label: "Pinterest Video Downloader",
    icon: Pin,
    iconBg: "rgba(230, 0, 35, 0.10)",
    iconColor: "var(--primary)",
  },
  {
    href: "/pinterest-image-downloader",
    label: "Pinterest Image & Carousel Downloader",
    icon: ImagePlay,
    iconBg: "rgba(230, 0, 35, 0.10)",
    iconColor: "var(--primary)",
  },
  {
    href: "/youtube-video-downloader",
    label: "YouTube Video Downloader",
    icon: Play,
    iconBg: "rgba(255, 0, 0, 0.09)",
    iconColor: "var(--primary)",
  },
  {
    href: "/facebook-video-downloader",
    label: "Facebook Video Downloader",
    icon: FacebookIcon,
    iconBg: "rgba(24, 119, 242, 0.10)",
    iconColor: "var(--primary)",
  },
  {
    href: "/twitter-video-downloader",
    label: "Twitter/X Video Downloader",
    icon: TwitterIcon,
    iconBg: "rgba(15, 23, 42, 0.10)",
    iconColor: "var(--primary)",
  },
  {
    href: "/threads-video-downloader",
    label: "Threads Video Downloader",
    icon: ThreadsIcon,
    iconBg: "rgba(15, 23, 42, 0.10)",
    iconColor: "var(--primary)",
  },
];

export default function ToolCategoryDropdown() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // Stable plain ID (no useId): guaranteed resolvable by aria-controls and
  // stable across SSR/hydration without framework-mangled characters.
  const menuId = "downloadit-tool-menu";

  const isToolActive =
    pathname === "/" || DROPDOWN_TOOLS.some((tool) => tool.href === pathname);
  const activeTool = DROPDOWN_TOOLS.find((tool) => tool.href === pathname);
  const triggerLabel =
    activeTool?.label ?? (pathname === "/" ? "Downloaders" : "Tools");

  const close = useCallback((refocusToggle = false) => {
    setOpen(false);
    if (refocusToggle) toggleRef.current?.focus({ preventScroll: true });
  }, []);

  // Close on outside click / touch
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

  // Close on Escape (anywhere) and return focus to the toggle
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

  // Arrow-key navigation inside the menu: Up/Down/Home/End move between
  // items, Tab closes the menu (focus moves naturally, no trap).
  const onMenuKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const items = Array.from(
        menuRef.current?.querySelectorAll<HTMLElement>("[role='menuitem']") ?? []
      );
      if (items.length === 0) return;
      const active = document.activeElement as HTMLElement | null;
      const idx = active ? items.indexOf(active) : -1;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        items[(idx + 1 + items.length) % items.length]?.focus({ preventScroll: true });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        items[(idx - 1 + items.length) % items.length]?.focus({ preventScroll: true });
      } else if (e.key === "Home") {
        e.preventDefault();
        items[0]?.focus({ preventScroll: true });
      } else if (e.key === "End") {
        e.preventDefault();
        items[items.length - 1]?.focus({ preventScroll: true });
      } else if (e.key === "Tab") {
        close();
      }
    },
    [close]
  );

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen((prev) => !prev);
  };

  // ArrowDown on the toggle opens the menu and focuses the first item.
  const onToggleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      if (!open && (e.key === "ArrowDown" || e.key === " ")) e.preventDefault();
      if (e.key === "ArrowDown" && !open) {
        setOpen(true);
        requestAnimationFrame(() => {
          menuRef.current?.querySelector<HTMLElement>("[role='menuitem']")?.focus({ preventScroll: true });
        });
      }
    }
  };

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      {/* Single tool-menu trigger: label + chevron in one control. The label
          follows the current tool page, with the Instagram Reels downloader
          as the homepage/default label. */}
      <button
        ref={toggleRef}
        type="button"
        onClick={toggle}
        onKeyDown={onToggleKeyDown}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Downloader tools menu"
        className={`inline-flex items-center gap-1 rounded-full border py-1.5 pl-3 pr-2 text-[14px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
          isToolActive || open
            ? "bg-primary-light text-primary-strong border-primary/25 shadow-xs"
            : "border-transparent text-fg-muted hover:bg-primary-light hover:text-primary"
        }`}
      >
        <span>{triggerLabel}</span>
        <ChevronDown
          className="h-4 w-4 shrink-0 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          strokeWidth={2.2}
          aria-hidden="true"
        />
      </button>

      {/* Clean, compact white dropdown directly below the trigger. Geometry
          (width/max-height/scroll) lives in the scoped `.tool-category-menu`
          class so it stays aligned to the trigger yet never overflows the
          viewport. Always mounted so open/close animates smoothly (opacity +
          transform only — never layout geometry, never a layout shift). */}
      <div
        ref={menuRef}
        id={menuId}
        role="menu"
        aria-label="Downloader tools"
        aria-hidden={!open}
        onKeyDown={onMenuKeyDown}
        className={`tool-category-menu absolute left-0 top-full z-50 rounded-2xl p-1 transition-all duration-200 ease-out ${
          open
            ? "visible mt-2 translate-y-0 scale-100 opacity-100"
            : "invisible mt-2 -translate-y-1 scale-[0.98] opacity-0 pointer-events-none"
        }`}
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          boxShadow: "0 14px 40px rgba(60, 40, 120, 0.12), 0 4px 12px rgba(0, 0, 0, 0.05)",
        }}
      >
          <div className="space-y-0.5">
            {DROPDOWN_TOOLS.map((tool) => {
              const Icon = tool.icon;
              const isSelected = pathname === tool.href;
              return (
                <Link
                  key={tool.href}
                  href={tool.href}
                  role="menuitem"
                  tabIndex={open ? 0 : -1}
                  onClick={() => close()}
                  className={`flex min-h-[44px] items-start gap-2.5 rounded-xl px-2.5 py-2.5 text-[14px] font-medium leading-6 transition-all duration-150 ${
                    isSelected
                      ? "bg-primary-light text-primary-strong font-semibold"
                      : "text-fg hover:bg-primary-light hover:text-primary"
                  }`}
                >
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: tool.iconBg, color: tool.iconColor }}
                  >
                    <Icon size={14} strokeWidth={2.2} />
                  </span>
                  <span className="min-w-0 flex-1 break-words">{tool.label}</span>
                </Link>
              );
            })}
          </div>
      </div>
    </div>
  );
}
