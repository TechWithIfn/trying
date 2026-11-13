import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import { renderArticleBlocks } from "@/components/BlogArticle";
import ProseSection from "@/components/ProseSection";
import ReadMore from "@/components/ReadMore";
import { SITE_URL } from "@/config/site";
import {
  getAllPosts,
  getHindiPostBySlug,
  getHindiPosts,
  splitFaq,
} from "@/lib/blog";

export const dynamicParams = false;

export function generateStaticParams() {
  return getHindiPosts().map((post) => ({ slug: post.slug }));
}

/**
 * Devanagari renders wider than Latin at the same character count, so only
 * append the brand when the headline still fits a ~60-character budget.
 */
function serpTitle(title: string): string {
  const suffix = " | Downloadit";
  return title.length + suffix.length <= 60 ? `${title}${suffix}` : title;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getHindiPostBySlug(slug);
  if (!post) return {};
  const hasEnglish = getAllPosts().some((item) => item.slug === post.slug);
  return {
    title: { absolute: serpTitle(post.title) },
    description: post.description,
    alternates: {
      canonical: `/hi/blog/${post.slug}`,
      languages: {
        ...(hasEnglish ? { en: `${SITE_URL}/blog/${post.slug}` } : {}),
        hi: `${SITE_URL}/hi/blog/${post.slug}`,
        "x-default": hasEnglish
          ? `${SITE_URL}/blog/${post.slug}`
          : `${SITE_URL}/hi/blog/${post.slug}`,
      },
    },
    openGraph: {
      title: { absolute: serpTitle(post.title) },
      description: post.description,
      url: `${SITE_URL}/hi/blog/${post.slug}`,
      type: "article",
      siteName: "Downloadit",
      locale: "hi_IN",
      images: [
        {
          url: "/og-downloadit.png",
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: { absolute: serpTitle(post.title) },
      description: post.description,
      images: ["/og-downloadit.png"],
    },
  };
}

const TOOL_LABELS: Record<string, string> = {
  "/hi/instagram-video-downloader": "इंस्टाग्राम डाउनलोडर",
  "/hi/instagram-reels-downloader": "इंस्टाग्राम रील्स डाउनलोडर",
  "/hi/pinterest-video-downloader": "पिनट्रेस्ट डाउनलोडर",
  "/hi/facebook-video-downloader": "फेसबुक वीडियो डाउनलोडर",
  "/hi/twitter-video-downloader": "ट्विटर/X वीडियो डाउनलोडर",
  "/hi/threads-video-downloader": "थ्रेड्स डाउनलोडर",
};

export default async function HindiBlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getHindiPostBySlug(slug);
  if (!post) notFound();

  const { article, faqs } = splitFaq(post.body);
  const related = getHindiPosts()
    .filter((item) => item.slug !== post.slug)
    .slice(0, 3);
  const toolLabel = TOOL_LABELS[post.tool] ?? "डाउनलोडर";
  const hasEnglish = getAllPosts().some((item) => item.slug === post.slug);

  return (
    <>
      <Header showBreadcrumbs={false} />
      <main id="main-content" className="flex-1" lang="hi">
        <Breadcrumb
          items={[
            { name: "होम", path: "/hi" },
            { name: "ब्लॉग", path: "/hi/blog" },
            { name: post.title, path: `/hi/blog/${post.slug}` },
          ]}
          containerClassName="mx-auto max-w-[900px] px-5 sm:px-6 lg:px-12 pt-4"
        />
        <section className="mx-auto max-w-[900px] px-5 pb-16 pt-2 sm:px-6 sm:pt-4 lg:px-12">
          <h1 className="mt-4 text-[30px] font-extrabold leading-[1.2] tracking-[-0.02em] text-fg sm:text-[40px]">
            {post.title}
          </h1>
          <p className="mt-3 text-[14.5px] text-fg-subtle">
            {post.author}
            {post.date ? ` · ${post.date}` : ""} · Downloadit ब्लॉग · लगभग{" "}
            {Math.max(1, Math.round(post.words / 200))} मिनट
          </p>

          <ProseSection>
            <ReadMore label="गाइड">{renderArticleBlocks(article)}</ReadMore>
            <p>
              याद रखें: केवल वही सामग्री डाउनलोड करें जो आपकी है या जिसे दोबारा
              इस्तेमाल करने की अनुमति आपके पास है। किसी और का काम अपने नाम से
              पोस्ट करने से पहले क्रिएटर से अनुमति लें।
            </p>
          </ProseSection>

          {faqs.length > 0 && (
            <ProseSection>
              <section className="mt-12">
                <h2>अक्सर पूछे जाने वाले सवाल</h2>
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
            <p className="text-[16px] font-bold text-fg">असली लिंक पर आज़माएँ</p>
            <p className="mt-2 text-[14px] leading-[1.7] text-fg-muted">
              <Link
                href={post.tool}
                className="font-semibold text-primary-strong hover:underline"
              >
                {toolLabel}
              </Link>{" "}
              खोलें, पब्लिक लिंक पेस्ट करें और इस गाइड को प्रैक्टिस में लगाएँ।
            </p>
            {hasEnglish && (
              <p className="mt-2 text-[13px] text-fg-subtle">
                पढ़ें{" "}
                <Link
                  href={`/blog/${post.slug}`}
                  hrefLang="en"
                  className="font-semibold text-primary-strong hover:underline"
                >
                  English version
                </Link>
              </p>
            )}
          </div>

          <h2 className="mt-10 text-[18px] font-bold text-fg">और हिंदी गाइड</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {related.map((item) => (
              <Link
                key={item.slug}
                href={`/hi/blog/${item.slug}`}
                className="rounded-2xl p-4 transition-colors hover:bg-primary-light"
                style={{ border: "1px solid var(--border)", background: "var(--card)" }}
              >
                <span className="text-[14px] font-semibold text-primary-strong">
                  {item.title}
                </span>
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
            url: `${SITE_URL}/hi/blog/${post.slug}`,
            inLanguage: "hi",
            isPartOf: { "@id": `${SITE_URL}/hi/blog#blog` },
            author: { "@type": "Organization", name: post.author, url: SITE_URL },
            publisher: { "@type": "Organization", name: "Downloadit", url: SITE_URL },
            ...(post.date ? { datePublished: post.date } : {}),
            ...(post.date ? { dateModified: post.date } : {}),
            ...(hasEnglish
              ? {
                  translationOfWork: {
                    "@type": "BlogPosting",
                    url: `${SITE_URL}/blog/${post.slug}`,
                    inLanguage: "en",
                  },
                }
              : {}),
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
              inLanguage: "hi",
              mainEntity: faqs.map((item) => ({
                "@type": "Question",
                name: item.q,
                acceptedAnswer: { "@type": "Answer", text: item.a },
              })),
            }),
          }}
        />
      )}
    </>
  );
}
