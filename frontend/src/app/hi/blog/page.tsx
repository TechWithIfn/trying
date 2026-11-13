import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import { SITE_URL } from "@/config/site";
import { getHindiPosts } from "@/lib/blog";

const HI_BLOG_TITLE = "Downloadit ब्लॉग – डाउनलोड गाइड, फ़िक्स और टिप्स";
const HI_BLOG_DESCRIPTION =
  "इंस्टाग्राम, पिनट्रेस्ट, फेसबुक, X और थ्रेड्स से पब्लिक मीडिया सेव करने की हिंदी गाइड। डाउनलोड एरर, क्वालिटी और कॉपीराइट से जुड़े आसान जवाब।";

export const metadata: Metadata = {
  title: { absolute: HI_BLOG_TITLE },
  description: HI_BLOG_DESCRIPTION,
  alternates: {
    canonical: "/hi/blog",
    languages: {
      en: `${SITE_URL}/blog`,
      hi: `${SITE_URL}/hi/blog`,
      "x-default": `${SITE_URL}/blog`,
    },
  },
  openGraph: {
    title: { absolute: HI_BLOG_TITLE },
    description: HI_BLOG_DESCRIPTION,
    url: `${SITE_URL}/hi/blog`,
    type: "website",
    siteName: "Downloadit",
    locale: "hi_IN",
    images: [
      {
        url: "/og-downloadit.png",
        width: 1200,
        height: 630,
        alt: "Downloadit हिंदी ब्लॉग",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: { absolute: HI_BLOG_TITLE },
    description: HI_BLOG_DESCRIPTION,
    images: ["/og-downloadit.png"],
  },
};

export default function HindiBlogIndexPage() {
  const posts = getHindiPosts();
  return (
    <>
      <Header showBreadcrumbs={false} />
      <main id="main-content" className="flex-1" lang="hi">
        <Breadcrumb
          items={[
            { name: "होम", path: "/hi" },
            { name: "ब्लॉग", path: "/hi/blog" },
          ]}
          containerClassName="mx-auto max-w-[900px] px-5 sm:px-6 lg:px-12 pt-4"
        />
        <section className="mx-auto max-w-[900px] px-5 pb-16 pt-2 sm:px-6 sm:pt-4 lg:px-12">
          <Link
            href="/hi"
            className="inline-flex min-h-[44px] items-center text-[14px] font-semibold text-fg-muted transition-colors hover:text-primary"
          >
            &larr; Downloadit होम
          </Link>
          <h1 className="mt-4 text-[32px] font-extrabold leading-[1.15] tracking-[-0.02em] text-fg sm:text-[42px]">
            Downloadit हिंदी ब्लॉग
          </h1>
          <p className="mt-4 text-[17px] leading-[1.8] text-fg-muted">
            पब्लिक मीडिया सेव करने की सरल हिंदी गाइड। हर लेख में पहले सीधा जवाब,
            फिर स्टेप-बाय-स्टेप तरीका, आम गलतियाँ और ज़रूरी सावधानियाँ दी गई हैं।
            कॉपीराइट का सम्मान करें और केवल अपनी या अनुमति वाली सामग्री डाउनलोड
            करें।
          </p>

          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/hi/blog/${post.slug}`}
                className="rounded-2xl p-5 transition-colors hover:bg-primary-light"
                style={{ border: "1px solid var(--border)", background: "var(--card)" }}
              >
                <span className="text-[16px] font-bold text-fg">{post.title}</span>
                <span className="mt-2 block text-[14px] leading-[1.65] text-fg-muted">
                  {post.description}
                </span>
                <span className="mt-3 block text-[13px] font-semibold text-primary-strong">
                  गाइड पढ़ें &rarr;
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-12 rounded-2xl border border-border bg-card p-5">
            <h2 className="text-[18px] font-bold text-fg">टूल सीधे आज़माएँ</h2>
            <p className="mt-2 text-[14.5px] leading-relaxed text-fg-muted">
              गाइड पढ़ने के बाद किसी भी प्लेटफ़ॉर्म का डाउनलोडर खोलें और पब्लिक
              लिंक से मीडिया सेव करें।
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { label: "इंस्टाग्राम", href: "/hi/instagram-video-downloader" },
                { label: "पिनट्रेस्ट", href: "/hi/pinterest-video-downloader" },
                { label: "फेसबुक", href: "/hi/facebook-video-downloader" },
                { label: "ट्विटर/X", href: "/hi/twitter-video-downloader" },
                { label: "थ्रेड्स", href: "/hi/threads-video-downloader" },
              ].map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="rounded-full border border-border px-4 py-2 text-[13px] font-semibold text-fg transition-colors hover:border-primary/50 hover:text-primary"
                >
                  {tool.label}
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Blog",
            "@id": `${SITE_URL}/hi/blog#blog`,
            url: `${SITE_URL}/hi/blog`,
            name: "Downloadit हिंदी ब्लॉग",
            description: HI_BLOG_DESCRIPTION,
            inLanguage: "hi",
            isPartOf: { "@id": `${SITE_URL}/#website` },
            blogPost: posts.map((post) => ({
              "@type": "BlogPosting",
              headline: post.title,
              description: post.description,
              url: `${SITE_URL}/hi/blog/${post.slug}`,
              inLanguage: "hi",
            })),
          }),
        }}
      />
    </>
  );
}
