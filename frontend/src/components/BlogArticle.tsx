import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Minimal markdown renderer for the site's own blog files (static,
 * author-controlled content — never user input). Supports exactly what the
 * blog corpus uses: `## ` headings, paragraphs, `**bold**`, `` `code` ``
 * and `[text](url)` links. Anything else renders as plain paragraphs, so an
 * unexpected construct degrades to readable text rather than breaking.
 */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // Split on code spans first so markup inside code is never interpreted.
  const codeParts = text.split(/(`[^`]+`)/g);
  let key = 0;
  const pushInline = (segment: string) => {
    // Links, then bold, in one pass.
    const re = /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(segment)) !== null) {
      if (m.index > last) nodes.push(segment.slice(last, m.index));
      const token = m[0];
      if (token.startsWith("[")) {
        const lm = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (lm) {
          const [, label, href] = lm;
          nodes.push(
            href.startsWith("/") ? (
              <Link
                key={`${keyPrefix}-l${key++}`}
                href={href}
                className="font-semibold text-primary-strong hover:underline"
              >
                {label}
              </Link>
            ) : (
              <a
                key={`${keyPrefix}-l${key++}`}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary-strong hover:underline"
              >
                {label}
              </a>
            )
          );
        } else {
          nodes.push(token);
        }
      } else {
        nodes.push(
          <strong key={`${keyPrefix}-b${key++}`} className="font-semibold text-fg">
            {token.slice(2, -2)}
          </strong>
        );
      }
      last = m.index + token.length;
    }
    if (last < segment.length) nodes.push(segment.slice(last));
  };

  for (const part of codeParts) {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      nodes.push(
        <code
          key={`${keyPrefix}-c${key++}`}
          className="rounded bg-primary-light px-1.5 py-0.5 text-[0.9em] font-semibold text-primary-strong"
        >
          {part.slice(1, -1)}
        </code>
      );
    } else if (part) {
      pushInline(part);
    }
  }
  return nodes;
}

export function renderArticleBlocks(md: string): ReactNode[] {
  const blocks = md.replace(/\r\n/g, "\n").split(/\n{2,}/);
  const out: ReactNode[] = [];
  let key = 0;
  let firstPara = true;
  for (const raw of blocks) {
    const block = raw.trim();
    if (!block || block === "---") continue;
    if (block.startsWith("## ")) {
      firstPara = false;
      out.push(
        <h2 key={`h${key++}`} className="mt-12 text-[24px] font-bold text-fg">
          {renderInline(block.slice(3).trim(), `h${key}`)}
        </h2>
      );
    } else {
      const text = block.replace(/\n/g, " ");
      out.push(
        <p
          key={`p${key++}`}
          className={
            firstPara
              ? "mt-4 text-[18px] leading-[1.7] text-fg-muted"
              : "mt-3 text-[16px] leading-[1.7] text-fg-muted"
          }
        >
          {renderInline(text, `p${key}`)}
        </p>
      );
      firstPara = false;
    }
  }
  return out;
}
