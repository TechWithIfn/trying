import Link from "next/link";
import React from "react";

interface DownloaderContentLayoutProps {
  /** 5. Supported features / media types / formats & benefits */
  supportedFeatures: React.ReactNode;
  /** 6. How to Use: step-by-step instructions */
  howToUse: React.ReactNode;
  /** 7. Platform-specific educational content / troubleshooting */
  educationalContent: React.ReactNode;
  /** 8. What the Downloader Does (SEO explanation & mechanics) */
  whatItDoes: React.ReactNode;
  /** 9. Frequently Asked Questions */
  faqs?: React.ReactNode;
  /** 10. Related downloaders */
  relatedDownloaders?: React.ReactNode;
}

/**
 * Shared layout component for all dedicated downloader pages.
 * Enforces the visual and semantic ordering:
 *  5. Supported features
 *  6. How to Use
 *  7. Platform-specific educational content
 *  8. What the Downloader Does
 *  9. Frequently Asked Questions
 *  10. Related downloaders (+ Back to Home Downloader)
 *
 * This guarantees that in-depth SEO articles ("What the Downloader Does")
 * always appear below the practical tools and instructions, preventing
 * content crowding above the fold.
 */
export default function DownloaderContentLayout({
  supportedFeatures,
  howToUse,
  educationalContent,
  whatItDoes,
  faqs,
  relatedDownloaders,
}: DownloaderContentLayoutProps) {
  return (
    <section className="mx-auto max-w-[920px] px-5 sm:px-6 lg:px-12 pt-6 pb-16 sm:pt-8">
      <div className="space-y-10 text-fg">
        {/* 5. Supported features */}
        {supportedFeatures}

        {/* 6. How to Use */}
        {howToUse}

        {/* 7. Platform-specific educational content */}
        {educationalContent}

        {/* 8. What the Downloader Does */}
        {whatItDoes}

        {/* 9. Frequently Asked Questions */}
        {faqs}

        {/* 10. Related downloaders */}
        {relatedDownloaders && (
          <div className="pt-2">
            {relatedDownloaders}
            <div className="mt-8 text-center">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-fg-subtle transition-colors hover:text-primary"
              >
                <span aria-hidden="true">←</span>
                <span>Back to Home Downloader</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

