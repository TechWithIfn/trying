import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import { SITE_URL } from "@/config/site";
import { getAllPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: { absolute: "Downloadit Blog – Instagram, Pinterest & YouTube Guides" },
  description:
    "Practical guides from Downloadit for saving public Instagram, Pinterest and YouTube media, fixing common issues, and understanding copyright.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: { absolute: "Downloadit Blog – Instagram, Pinterest & YouTube Guides" },
    description:
      "Practical guides from Downloadit for saving public Instagram, Pinterest and YouTube media, fixing common issues, and understanding copyright.",
    url: `${SITE_URL}/blog`,
    type: "website",
    images: [{ url: "/og-downloadit.png", width: 1200, height: 630, alt: "Downloadit Blog" }],
  },
  twitter: {
    card: "summary_large_image",
    title: { absolute: "Blog – Instagram Saving Guides & Copyright Help | Downloadit" },
    description:
      "Practical guides from Downloadit: save your own Instagram content, back up reels, fix common issues, and understand copyright and permission basics.",
    images: ["/og-downloadit.png"],
  },
};

export default function BlogIndexPage() {
  const posts = getAllPosts();
  return (
    <>
      <Header />
      <main id="main-content" className="flex-1">
        <Breadcrumb
          items={[
            { name: "Home", path: "/" },
            { name: "Blog", path: "/blog" },
          ]}
          containerClassName="mx-auto max-w-[900px] px-5 sm:px-6 lg:px-12 pt-4"
        />
        <section className="mx-auto max-w-[900px] px-5 sm:px-6 lg:px-12 pb-12 pt-4 sm:pt-6">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center text-[14px] font-semibold text-fg-muted transition-colors hover:text-primary"
          >
            ← Back to Downloadit
          </Link>
          <h1 className="mt-4 text-[32px] font-extrabold tracking-[-0.02em] text-fg sm:text-[42px] leading-[1.1]">
            Downloadit Blog
          </h1>
          <p className="mt-4 text-[18px] leading-[1.7] text-fg-muted">
            Practical guides to saving public Instagram, Pinterest and YouTube
            media, fixing what goes wrong, and using other people&apos;s work
            the right way. No filler —
            every article answers its question first.
          </p>
          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {posts.map((p) => (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                className="rounded-2xl p-5 hover:bg-primary-light transition-colors"
                style={{ border: "1px solid var(--border)", background: "var(--card)" }}
              >
                <span className="text-[16px] font-bold text-fg">{p.title}</span>
                <span className="mt-2 block text-[14px] leading-[1.6] text-fg-muted">
                  {p.description}
                </span>
                <span className="mt-3 block text-[13px] font-semibold text-primary-strong">
                  Read guide →
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
            "@type": "Blog",
            "@id": `${SITE_URL}/blog#blog`,
            url: `${SITE_URL}/blog`,
            name: "Downloadit Blog",
            description:
              "Practical guides to saving public Instagram, Pinterest and YouTube media responsibly.",
            inLanguage: "en",
            isPartOf: { "@id": `${SITE_URL}/#website` },
            blogPost: posts.map((p) => ({
              "@type": "BlogPosting",
              headline: p.title,
              description: p.description,
              url: `${SITE_URL}/blog/${p.slug}`,
              inLanguage: "en",
            })),
          }),
        }}
      />
    </>
  );
}
