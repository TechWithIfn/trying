import { NextResponse } from "next/server";

/**
 * HTTP 410 Gone handler for the decommissioned YouTube downloader URL.
 * Instructs search engine crawlers and browsers that this feature has been
 * permanently removed in compliance with content provider and AdSense policies.
 */
export function GET() {
  return new NextResponse(
    "The YouTube downloader feature has been permanently discontinued on Downloadit.pro in compliance with content provider policies.",
    {
      status: 410,
      statusText: "Gone",
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=86400",
      },
    }
  );
}

