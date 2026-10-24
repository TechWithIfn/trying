import Link from "next/link";
import { SITE_URL } from "@/config/site";

export interface BreadcrumbItem {
  name: string;
  path?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  /** Container CSS classes to match the layout width of the hosting page. */
  containerClassName?: string;
}

/**
 * Reusable Breadcrumb component that renders both:
 * 1. Accessible, responsive visible breadcrumbs (<nav aria-label="Breadcrumb">).
 * 2. Valid Schema.org BreadcrumbList JSON-LD server-rendered in the HTML.
 *
 * Ensures visible navigation and structured data agree 100%, with sequential
 * positions starting at 1, canonical HTTPS URLs, and non-empty item names.
 */
export default function Breadcrumb({
  items,
  containerClassName = "mx-auto w-full max-w-[1240px] px-4 sm:px-6 lg:px-8 xl:px-12",
}: BreadcrumbProps) {
  // Filter out any items with missing or whitespace-only names to prevent GSC "N/A" errors
  const validItems = items.filter((item) => item && typeof item.name === "string" && item.name.trim().length > 0);

  if (validItems.length <= 1) {
    // Single item or empty list does not form a breadcrumb trail
    return null;
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: validItems.map((item, index) => {
      const canonicalUrl = item.path ? `${SITE_URL}${item.path === "/" ? "/" : item.path}` : undefined;
      return {
        "@type": "ListItem",
        position: index + 1,
        name: item.name.trim(),
        ...(canonicalUrl ? { item: canonicalUrl } : {}),
      };
    }),
  };

  return (
    <div className={containerClassName}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav
        aria-label="Breadcrumb"
        className="py-2.5 text-[13px] sm:text-[14px] leading-tight text-fg-muted"
      >
        <ol className="flex flex-wrap items-center gap-1.5 list-none p-0 m-0">
          {validItems.map((item, index) => {
            const isLast = index === validItems.length - 1;
            return (
              <li key={index} className="inline-flex items-center min-w-0">
                {index > 0 && (
                  <span
                    aria-hidden="true"
                    className="mr-1.5 select-none text-fg-subtle"
                  >
                    /
                  </span>
                )}
                {isLast || !item.path ? (
                  <span
                    aria-current="page"
                    className="font-medium text-fg truncate max-w-[280px] sm:max-w-[420px]"
                    title={item.name}
                  >
                    {item.name}
                  </span>
                ) : (
                  <Link
                    href={item.path}
                    className="text-fg-muted hover:text-primary transition-colors underline-offset-2 hover:underline"
                  >
                    {item.name}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
