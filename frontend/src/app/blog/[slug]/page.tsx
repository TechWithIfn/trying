import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { renderArticleBlocks } from "@/components/BlogArticle";
import ProseSection from "@/components/ProseSection";
import ReadMore from "@/components/ReadMore";
import { SITE_URL } from "@/config/site";
import { getAllPosts, getPostBySlug, splitFaq } from "@/lib/blog";

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return {
    title: { absolute: `${post.title} | Downloadit Blog` },
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: { absolute: `${post.title} | Downloadit Blog` },
      description: post.description,
      url: `${SITE_URL}/blog/${post.slug}`,
      type: "article",
      images: [{ url: "/og-downloadit.png", width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: { absolute: `${post.title} | Downloadit Blog` },
      description: post.description,
      images: ["/og-downloadit.png"],
    },
  };
}

const TOOL_LABELS: Record<string, string> = {
  "/instagram-reels-downloader": "Instagram Reels Downloader",
  "/instagram-video-downloader": "Instagram Video Downloader",
  "/instagram-photo-downloader": "Instagram Photo & Carousel Downloader",
  "/instagram-story-downloader": "Instagram Story Downloader",
  "/instagram-audio-downloader": "Instagram Audio Downloader",
};

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const { article, faqs } = splitFaq(post.body);
  const related = getAllPosts()
    .filter((p) => p.slug !== post.slug)
    .slice(0, 3);
  const toolLabel = TOOL_LABELS[post.tool] ?? "Instagram Downloader";

  return (
    <>
      <Header />
      <main id="main-content" className="flex-1">
        <section className="mx-auto max-w-[900px] px-5 sm:px-6 lg:px-12 pb-12 pt-8 sm:pt-12">
          <nav className="flex min-h-[44px] flex-wrap items-center gap-1 text-[14px] font-semibold text-fg-muted" aria-label="Breadcrumb">
            <Link href="/" className="transition-colors hover:text-primary">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <Link href="/blog" className="transition-colors hover:text-primary">
              Blog
            </Link>
          </nav>
          <h1 className="mt-4 text-[32px] font-extrabold tracking-[-0.02em] text-fg sm:text-[42px] leading-[1.1]">
            {post.title}
          </h1>
          <p className="mt-3 text-[15px] text-fg-subtle">
            By {post.author}
            {post.date ? ` · ${post.date}` : ""} · Downloadit Blog · about{" "}
            {Math.max(1, Math.round(post.words / 200))} min read
          </p>

          <ProseSection>
          <ReadMore label="guide">
          {renderArticleBlocks(article)}
          </ReadMore>
          <p>
            A reminder that applies to every guide here: only download content
            you own or have permission to reuse. Saving your own posts is
            always fine; republishing someone else&apos;s work needs their
            permission first.
          </p>
          </ProseSection>

          {faqs.length > 0 && (
            <ProseSection>
            <section className="mt-12">
              <h2>Frequently asked questions</h2>
              <div className="mt-4">
                {faqs.map((item) => (
                  <div key={item.q}>
                    <h3>{item.q}</h3>
                    <p>{item.a}</p>
                  </div>
                ))}
              </div>
            </section>
            </ProseSection>
          )}

          <div
            className="mt-10 rounded-2xl p-5 sm:p-6"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            <p className="text-[16px] font-bold text-fg">Try it on a real link</p>
            <p className="mt-2 text-[14px] leading-[1.6] text-fg-muted">
              Open the{" "}
              <Link href={post.tool} className="font-semibold text-primary-strong hover:underline">
                {toolLabel}
              </Link>{" "}
              and paste a public link to put this guide into practice.
            </p>
          </div>

          <h2 className="mt-10 text-[18px] font-bold text-fg">More guides</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/blog/${r.slug}`}
                className="rounded-2xl p-4 hover:bg-primary-light transition-colors"
                style={{ border: "1px solid var(--border)", background: "var(--card)" }}
              >
                <span className="text-[14px] font-semibold text-primary-strong">{r.title}</span>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: post.description,
            url: `${SITE_URL}/blog/${post.slug}`,
            inLanguage: "en",
            isPartOf: { "@id": `${SITE_URL}/blog#blog` },
            author: { "@type": "Organization", name: post.author, url: SITE_URL },
            publisher: { "@type": "Organization", name: "Downloadit", url: SITE_URL },
            ...(post.date ? { datePublished: post.date } : {}),
          }),
        }}
      />
      {faqs.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faqs.map((item) => ({
                "@type": "Question",
                name: item.q,
                acceptedAnswer: { "@type": "Answer", text: item.a },
              })),
            }),
          }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
              { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
              { "@type": "ListItem", position: 3, name: post.title, item: `${SITE_URL}/blog/${post.slug}` },
            ],
          }),
        }}
      />
    </>
  );
}
