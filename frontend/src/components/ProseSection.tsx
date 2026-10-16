import type { ReactNode } from "react";

/**
 * ProseSection — the single shared wrapper for all long-form reading text
 * (tool-page articles, homepage guide sections, blog posts, help/about/
 * contact/legal bodies). Typography comes only from the `.prose-section`
 * CSS rules so every text page looks identical. Children must be plain
 * semantic elements (h2/h3/h4/p/ul/ol/a/blockquote); boxed cards do not
 * belong in here — UI navigation grids live outside it.
 */
export default function ProseSection({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`prose-section${className ? ` ${className}` : ""}`}>
      {children}
    </div>
  );
}
