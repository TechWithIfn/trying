"use client";

import {
  Children,
  isValidElement,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

/** Words before the fold. Splits only between block-level children. */
const VISIBLE_WORDS = 500;
/** Don't render a toggle for a stub of hidden text. */
const MIN_HIDDEN_WORDS = 80;

function textOf(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join(" ");
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

function countWords(node: ReactNode): number {
  const text = textOf(node).replace(/\s+/g, " ").trim();
  if (!text) return 0;
  return text.split(" ").length;
}

/**
 * ReadMore — SEO-safe folding for long article bodies.
 *
 * - The FULL text is always in the server-rendered HTML. Folding is purely
 *   visual (grid-rows animation + fade hint); nothing is fetched lazily,
 *   nothing leaves the DOM. With JavaScript disabled the `html.js` hook is
 *   absent and everything renders fully open, toggle hidden.
 * - Splits only between top-level blocks near ~500 words, so a paragraph,
 *   list, or heading is never cut in half. Short content renders with no
 *   button at all.
 * - Collapsing scrolls back to the section start only when that start is
 *   out of view. Headings inside the fold stay real H3/H4 elements.
 * - Independent per instance; remounts cleanly on client-side navigation
 *   (fresh collapsed state, nothing stuck hidden, never opacity:0).
 */
export default function ReadMore({
  children,
  label = "article",
}: {
  children: ReactNode;
  /** Accessible label naming what is being expanded, e.g. "reel guide". */
  label?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const bodyId = useId();
  const buttonId = useId();

  const blocks = Children.toArray(children);
  let total = 0;
  let cut = blocks.length;
  for (let i = 0; i < blocks.length; i++) {
    total += countWords(blocks[i]);
  }
  if (total > VISIBLE_WORDS + MIN_HIDDEN_WORDS) {
    let running = 0;
    for (let i = 0; i < blocks.length; i++) {
      running += countWords(blocks[i]);
      if (running >= VISIBLE_WORDS) {
        cut = i + 1;
        break;
      }
    }
    // Never strand a lone heading as the last visible block.
    if (cut > 1 && cut < blocks.length && isHeading(blocks[cut - 1])) cut -= 1;
  }

  if (cut >= blocks.length) {
    return <>{children}</>;
  }

  const visible = blocks.slice(0, cut);
  const hidden = blocks.slice(cut);

  const collapse = () => {
    setExpanded(false);
    // Return to the section start only when it scrolled out of view.
    requestAnimationFrame(() => {
      const el = wrapRef.current;
      if (!el || typeof window === "undefined") return;
      if (el.getBoundingClientRect().top < 0) {
        const reduceMotion =
          typeof window.matchMedia === "function" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        el.scrollIntoView({
          block: "start",
          behavior: reduceMotion ? "auto" : "smooth",
        });
      }
    });
  };

  return (
    <>
      {visible}
      <div
        ref={wrapRef}
        className="readmore"
        data-collapsed={expanded ? "false" : "true"}
      >
        <div id={bodyId} className="readmore-body" role="region" aria-labelledby={buttonId}>
          <div className="readmore-inner">{hidden}</div>
        </div>
        <div className="readmore-fade" aria-hidden="true" />
        <button
          type="button"
          id={buttonId}
          aria-expanded={expanded}
          aria-controls={bodyId}
          onClick={() => (expanded ? collapse() : setExpanded(true))}
          className="readmore-toggle"
        >
          {expanded ? `Show less ${label}` : `Read more ${label}`}
          <svg
            className="readmore-chevron"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {expanded ? <path d="M6 15l6-6 6 6" /> : <path d="M6 9l6 6 6-6" />}
          </svg>
        </button>
      </div>
    </>
  );
}

function isHeading(node: ReactNode): boolean {
  if (!isValidElement<{ children?: ReactNode }>(node)) return false;
  const type = node.type;
  return type === "h2" || type === "h3" || type === "h4";
}
