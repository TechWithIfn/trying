import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Monitor,
  Smartphone,
  Wrench,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import KeywordToolBox from "@/components/KeywordToolBox";
import { SITE_URL } from "@/config/site";
import { KEYWORD_PAGES, type KeywordPage } from "@/config/keywordPages";
import { PLATFORM_CATEGORIES } from "@/config/categories";
import { breadcrumbLabel } from "@/config/routeLabels";

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  twitter: "Twitter/X",
  pinterest: "Pinterest",
  threads: "Threads",
};

const PLATFORM_PATHS: Record<string, string> = {
  instagram: "/instagram-video-downloader",
  facebook: "/facebook-video-downloader",
  twitter: "/twitter-video-downloader",
  pinterest: "/pinterest-video-downloader",
  threads: "/threads-video-downloader",
};

function toolPlaceholder(page: KeywordPage): string {
  if (page.platform === "instagram") return "Paste an Instagram post link";
  if (page.platform === "facebook") return "Paste a Facebook Reel or video link";
  if (page.platform === "twitter") return "Paste an X / Twitter post link";
  if (page.platform === "pinterest") return "Paste a Pinterest Pin or pin.it link";
  return "Paste a Threads post link";
}

function toolLabel(page: KeywordPage): string {
  if (page.platform === "instagram") return "Download Media";
  if (page.platform === "facebook") return "Get Video";
  if (page.platform === "twitter") return "Get Video";
  if (page.platform === "pinterest") return "Download Pin";
  return "Get Media";
}

function relatedName(slug: string): string {
  const keyword = KEYWORD_PAGES.find((item) => item.slug === slug);
  if (keyword) return keyword.name;
  return breadcrumbLabel(`/${slug}`);
}

export default function KeywordToolPage({ page }: { page: KeywordPage }) {
  const platformLabel = PLATFORM_LABELS[page.platform];
  const platformPath = PLATFORM_PATHS[page.platform];
  const canonical = `${SITE_URL}/${page.slug}`;

  const jsonLdWebPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${canonical}/#webpage`,
    url: canonical,
    name: page.title,
    description: page.description,
    inLanguage: "en",
    dateModified: "2026-11-12",
    isPartOf: { "@id": `${SITE_URL}/#website` },
    breadcrumb: { "@id": `${canonical}/#breadcrumbs` },
    about: page.keywords.map((keyword) => ({
      "@type": "Thing",
      name: keyword,
    })),
  };

  const jsonLdWebApp = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": `${canonical}/#app`,
    name: page.name,
    url: canonical,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web",
    browserRequirements: "Requires JavaScript. Requires HTML5.",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description: page.description,
    featureList: page.formats,
  };

  const jsonLdBreadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `${canonical}/#breadcrumbs`,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: `${platformLabel} Downloader`,
        item: `${SITE_URL}${platformPath}`,
      },
      { "@type": "ListItem", position: 3, name: page.name, item: canonical },
    ],
  };

  const jsonLdFaq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebPage) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebApp) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
      />

      <Header showBreadcrumbs={false} />
      <main id="main-content" className="flex-1">
        <Breadcrumb
          items={[
            { name: "Home", path: "/" },
            { name: `${platformLabel} Downloader`, path: platformPath },
            { name: page.name, path: `/${page.slug}` },
          ]}
          showSchema={false}
          containerClassName="mx-auto w-full max-w-[960px] px-4 sm:px-6 lg:px-8 pt-4"
        />

        <KeywordToolBox
          platform={page.platform}
          path={`/${page.slug}`}
          name={page.name}
          titleA={page.titleA}
          titleB={page.titleB}
          subtitle={page.subtitle}
          badge={page.badge}
          placeholder={toolPlaceholder(page)}
          buttonLabel={toolLabel(page)}
          instagramTab={page.instagramTab}
          pinterestModes={
            page.platform === "pinterest" ? ["any", "video", "image"] : undefined
          }
        />

        <div className="mx-auto w-full max-w-4xl space-y-10 px-4 py-8 text-fg sm:space-y-14 sm:px-6 sm:py-12">
          <p className="text-[13px] font-medium text-fg-subtle">
            Last updated: {page.updated}
          </p>

          <section className="space-y-4">
            <h2 className="text-2xl font-extrabold tracking-tight text-fg sm:text-3xl">
              {page.name}: what it does
            </h2>
            {page.intro.map((paragraph) => (
              <p
                key={paragraph}
                className="text-[15.5px] leading-relaxed text-fg-muted sm:text-[16.5px]"
              >
                {paragraph}
              </p>
            ))}
          </section>

          <section className="space-y-5">
            <div className="border-b border-border pb-3">
              <h2 className="text-2xl font-extrabold tracking-tight text-fg sm:text-3xl">
                How to download with this tool
              </h2>
              <p className="mt-1 text-[14.5px] text-fg-muted sm:text-[15.5px]">
                Four steps, no app and no account. The tool uses the same resolver
                as the rest of Downloadit.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {page.steps.map((step, index) => (
                <div
                  key={step.title}
                  className="space-y-2 rounded-2xl border border-border bg-card p-5"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                      {index + 1}
                    </span>
                    <h3 className="text-[16px] font-bold text-fg">{step.title}</h3>
                  </div>
                  <p className="text-[14px] leading-relaxed text-fg-muted">
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-extrabold tracking-tight text-fg sm:text-3xl">
              Supported links and formats
            </h2>
            <ul className="space-y-2.5">
              {page.formats.map((format) => (
                <li
                  key={format}
                  className="flex items-start gap-2.5 text-[15px] leading-relaxed text-fg-muted"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span>{format}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-5">
            <div className="border-b border-border pb-3">
              <h2 className="text-2xl font-extrabold tracking-tight text-fg sm:text-3xl">
                Device guide: iPhone, Android and desktop
              </h2>
              <p className="mt-1 text-[14.5px] text-fg-muted sm:text-[15.5px]">
                The download works in a normal browser. Where the file lands
                depends on your operating system.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {page.devices.map((device, index) => {
                const Icon = index === 0 ? Smartphone : index === 1 ? Smartphone : Monitor;
                return (
                  <div
                    key={device.title}
                    className="space-y-2 rounded-xl border border-border bg-card p-5"
                  >
                    <div className="flex items-center gap-2 font-bold text-primary">
                      <Icon className="h-5 w-5" />
                      <span>{device.title}</span>
                    </div>
                    <p className="text-[14px] leading-relaxed text-fg-muted">
                      {device.body}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="space-y-5">
            <div className="border-b border-border pb-3">
              <h2 className="text-2xl font-extrabold tracking-tight text-fg sm:text-3xl">
                Troubleshooting a failed download
              </h2>
              <p className="mt-1 text-[14.5px] text-fg-muted sm:text-[15.5px]">
                Most errors have a concrete cause. Check these before retrying.
              </p>
            </div>
            <div className="space-y-3">
              {page.troubleshooting.map((item) => (
                <details
                  key={item.title}
                  className="group rounded-2xl border border-border bg-card transition-colors hover:border-primary/40 open:border-primary/50"
                >
                  <summary className="flex cursor-pointer select-none items-center justify-between p-5 text-[15.5px] font-bold text-fg">
                    <span className="flex items-center gap-2 pr-4">
                      <Wrench className="h-4 w-4 shrink-0 text-primary" />
                      {item.title}
                    </span>
                    <ChevronDown className="h-5 w-5 shrink-0 text-fg-muted transition-transform duration-200 group-open:rotate-180 group-open:text-primary" />
                  </summary>
                  <div className="border-t border-border/40 px-5 pb-5 pt-3 text-[14.5px] leading-relaxed text-fg-muted">
                    {item.body}
                  </div>
                </details>
              ))}
            </div>
          </section>

          <section className="space-y-5 pt-2">
            <div className="border-b border-border pb-3">
              <h2 className="text-2xl font-extrabold tracking-tight text-fg sm:text-3xl">
                Related {platformLabel} downloaders
              </h2>
              <p className="mt-1 text-[14.5px] text-fg-muted sm:text-[15.5px]">
                Every Downloadit tool has a dedicated page for its media type.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {page.related.map((slug) => (
                <Link
                  key={slug}
                  href={`/${slug}`}
                  className="group flex items-center justify-between rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary/50 hover:shadow-md"
                >
                  <span className="pr-4 text-[15px] font-bold text-fg transition-colors group-hover:text-primary">
                    {relatedName(slug)}
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-1" />
                </Link>
              ))}
            </div>
            <div className="pt-2 text-center">
              <Link
                href={platformPath}
                className="inline-flex items-center gap-2 text-sm font-medium text-fg-muted transition-colors hover:text-primary"
              >
                <span>&larr; All {platformLabel} downloaders</span>
              </Link>
            </div>
          </section>

          <section className="space-y-6 pt-2">
            <div className="border-b border-border pb-3">
              <h2 className="text-2xl font-extrabold tracking-tight text-fg sm:text-3xl">
                Frequently asked questions
              </h2>
              <p className="mt-1 text-[14.5px] text-fg-muted sm:text-[15.5px]">
                Answers about {page.name.toLowerCase()} and public-media limits.
              </p>
            </div>
            <div className="space-y-3">
              {page.faqs.map((faq) => (
                <details
                  key={faq.q}
                  className="group rounded-2xl border border-border bg-card transition-colors hover:border-primary/40 open:border-primary/50"
                >
                  <summary className="flex cursor-pointer select-none items-center justify-between p-5 text-[15.5px] font-bold text-fg">
                    <span className="pr-4">{faq.q}</span>
                    <ChevronDown className="h-5 w-5 shrink-0 text-fg-muted transition-transform duration-200 group-open:rotate-180 group-open:text-primary" />
                  </summary>
                  <div className="border-t border-border/40 px-5 pb-5 pt-3 text-[14.5px] leading-relaxed text-fg-muted">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
