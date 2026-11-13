import type { Metadata } from "next";
import { notFound } from "next/navigation";
import KeywordToolPage from "@/components/KeywordToolPage";
import { KEYWORD_PAGES, getKeywordPage } from "@/config/keywordPages";
import { SITE_URL } from "@/config/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return KEYWORD_PAGES.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = getKeywordPage(slug);
  if (!page) return {};
  return {
    title: { absolute: page.title },
    description: page.description,
    alternates: {
      canonical: `/${page.slug}`,
      languages: {
        en: `${SITE_URL}/${page.slug}`,
        "x-default": `${SITE_URL}/${page.slug}`,
      },
    },
    openGraph: {
      title: { absolute: page.title },
      description: page.description,
      url: `${SITE_URL}/${page.slug}`,
      type: "website",
      siteName: "Downloadit",
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

export default async function KeywordRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = getKeywordPage(slug);
  if (!page) notFound();
  return <KeywordToolPage page={page} />;
}
