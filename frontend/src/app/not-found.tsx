import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: { absolute: "Page Not Found (404) – Downloadit" },
  robots: {
    index: false,
    follow: true,
  },
};

const POPULAR_TOOLS = [
  { label: "Instagram Reels Downloader", href: "/instagram-reels-downloader" },
  { label: "Instagram Video Downloader", href: "/instagram-video-downloader" },
  { label: "Pinterest Video Downloader", href: "/pinterest-video-downloader" },
  { label: "Facebook Video Downloader", href: "/facebook-video-downloader" },
  { label: "Twitter/X Video Downloader", href: "/twitter-video-downloader" },
  { label: "Threads Video Downloader", href: "/threads-video-downloader" },
  { label: "Instagram Story Downloader", href: "/instagram-story-downloader" },
  { label: "Instagram Photo Downloader", href: "/instagram-photo-downloader" },
] as const;

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col items-center justify-center px-5 py-16 text-center"
    >
      <p className="text-[72px] font-bold leading-none tracking-tight text-fg">404</p>
      <h1 className="mt-5 text-2xl font-semibold text-fg">Page not found</h1>
      <p className="mt-3 max-w-md text-[16px] leading-relaxed text-fg-muted">
        The page you&apos;re looking for doesn&apos;t exist or has been moved. The
        downloaders below all work without an account.
      </p>

      <nav aria-label="Popular downloaders" className="mt-8 w-full">
        <h2 className="text-[14px] font-semibold uppercase tracking-wide text-fg-subtle">
          Popular downloaders
        </h2>
        <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {POPULAR_TOOLS.map((tool) => (
            <li key={tool.href}>
              <Link
                href={tool.href}
                className="flex min-h-[44px] items-center justify-center rounded-xl border border-border bg-card px-4 py-2.5 text-[14px] font-semibold text-fg transition-colors hover:border-primary hover:text-primary-strong"
              >
                {tool.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-primary px-7 py-3 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(67,56,202,0.25)] transition-all hover:bg-primary-hover hover:shadow-[0_4px_12px_rgba(67,56,202,0.35)] active:scale-[0.97]"
        >
          Go Home
        </Link>
        <Link
          href="/blog"
          className="inline-flex min-h-[44px] items-center rounded-xl border border-border px-6 py-3 text-sm font-semibold text-fg transition-colors hover:border-primary hover:text-primary-strong"
        >
          Read the guides
        </Link>
      </div>

      <p className="mt-6 text-[14px] text-fg-muted">
        Still stuck?{" "}
        <Link href="/help" className="font-semibold text-primary-strong hover:underline">
          Visit the Help page
        </Link>{" "}
        or{" "}
        <Link href="/contact" className="font-semibold text-primary-strong hover:underline">
          contact us
        </Link>
        .
      </p>
    </main>
  );
}
