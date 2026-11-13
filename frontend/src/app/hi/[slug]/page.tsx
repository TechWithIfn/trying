import type { Metadata } from "next";
import { notFound } from "next/navigation";
import HindiToolPage from "@/components/HindiToolPage";
import { HINDI_TOOL_PAGES, getHindiToolPage } from "@/config/hindiPages";
import { SITE_URL } from "@/config/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return HINDI_TOOL_PAGES.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = getHindiToolPage(slug);
  if (!page) return {};
  return {
    title: { absolute: page.title },
    description: page.description,
    alternates: {
      canonical: `/hi/${page.slug}`,
      languages: {
        en: `${SITE_URL}/${page.slug}`,
        hi: `${SITE_URL}/hi/${page.slug}`,
        "x-default": `${SITE_URL}/${page.slug}`,
      },
    },
    openGraph: {
      title: { absolute: page.title },
      description: page.description,
      url: `${SITE_URL}/hi/${page.slug}`,
      type: "website",
      siteName: "Downloadit",
      locale: "hi_IN",
      images: [
        {
          url: "/og-downloadit.png",
          width: 1200,
          height: 630,
          alt: `${page.name} — Downloadit`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: { absolute: page.title },
      description: page.description,
      images: ["/og-downloadit.png"],
    },
  };
}

export default async function HindiToolRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = getHindiToolPage(slug);
  if (!page) notFound();
  return <HindiToolPage page={page} />;
}
