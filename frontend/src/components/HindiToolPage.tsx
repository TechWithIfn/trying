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
import {
  hindiRelated,
  type HindiToolPage as HindiToolPageData,
} from "@/config/hindiPages";

export default function HindiToolPage({ page }: { page: HindiToolPageData }) {
  const canonical = `${SITE_URL}/hi/${page.slug}`;
  const englishUrl = `${SITE_URL}/${page.slug}`;

  const jsonLdWebPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${canonical}/#webpage`,
    url: canonical,
    name: page.title,
    description: page.description,
    inLanguage: "hi",
    dateModified: "2026-11-12",
    isPartOf: { "@id": `${SITE_URL}/#website` },
    breadcrumb: { "@id": `${canonical}/#breadcrumbs` },
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
    inLanguage: "hi",
    featureList: page.formats,
  };

  const jsonLdBreadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `${canonical}/#breadcrumbs`,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "होम", item: `${SITE_URL}/hi` },
      { "@type": "ListItem", position: 2, name: page.name, item: canonical },
    ],
  };

  const jsonLdFaq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: "hi",
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
      <main id="main-content" className="flex-1" lang="hi">
        <Breadcrumb
          items={[
            { name: "होम", path: "/hi" },
            { name: page.name, path: `/hi/${page.slug}` },
          ]}
          showSchema={false}
          containerClassName="mx-auto w-full max-w-[960px] px-4 sm:px-6 lg:px-8 pt-4"
        />

        <KeywordToolBox
          platform={page.platform}
          path={`/hi/${page.slug}`}
          name={page.name}
          titleA={page.titleA}
          titleB={page.titleB}
          subtitle={page.subtitle}
          badge={page.badge}
          placeholder={
            page.platform === "instagram"
              ? "इंस्टाग्राम पोस्ट लिंक पेस्ट करें"
              : page.platform === "pinterest"
                ? "पिनट्रेस्ट पिन या pin.it लिंक पेस्ट करें"
                : page.platform === "facebook"
                  ? "फेसबुक वीडियो या रील लिंक पेस्ट करें"
                  : page.platform === "twitter"
                    ? "X / ट्विटर पोस्ट लिंक पेस्ट करें"
                    : "थ्रेड्स पोस्ट लिंक पेस्ट करें"
          }
          buttonLabel={
            page.platform === "instagram"
              ? "मीडिया डाउनलोड करें"
              : page.platform === "pinterest"
                ? "पिन डाउनलोड करें"
                : page.platform === "threads"
                  ? "मीडिया लाएँ"
                  : "वीडियो लाएँ"
          }
          instagramTab={page.instagramTab}
          pinterestModes={page.pinterestModes}
        />

        <div className="mx-auto w-full max-w-4xl space-y-10 px-4 py-8 text-fg sm:space-y-14 sm:px-6 sm:py-12">
          <p className="text-[13px] font-medium text-fg-subtle">
            अंतिम अपडेट: {page.updated}
          </p>

          <section className="space-y-4">
            <h2 className="text-2xl font-extrabold tracking-tight text-fg sm:text-3xl">
              {page.name} क्या करता है
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
                डाउनलोड कैसे करें
              </h2>
              <p className="mt-1 text-[14.5px] text-fg-muted sm:text-[15.5px]">
                चार आसान स्टेप। कोई ऐप इंस्टॉल नहीं करना है और किसी अकाउंट में
                लॉगिन नहीं करना है।
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
              कौन से लिंक और फ़ॉर्मेट सपोर्टेड हैं
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
                आईफ़ोन, एंड्रॉयड और डेस्कटॉप गाइड
              </h2>
              <p className="mt-1 text-[14.5px] text-fg-muted sm:text-[15.5px]">
                डाउनलोड सामान्य ब्राउज़र में होता है। फ़ाइल कहाँ सेव होगी, यह
                आपके डिवाइस पर निर्भर करता है।
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {page.devices.map((device, index) => {
                const Icon = index === 2 ? Monitor : Smartphone;
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
                डाउनलोड फेल होने पर क्या करें
              </h2>
              <p className="mt-1 text-[14.5px] text-fg-muted sm:text-[15.5px]">
                ज़्यादातर एरर का स्पष्ट कारण होता है। दोबारा कोशिश करने से पहले
                ये बातें जाँचें।
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
                दूसरे डाउनलोडर भी आज़माएँ
              </h2>
              <p className="mt-1 text-[14.5px] text-fg-muted sm:text-[15.5px]">
                हर प्लेटफ़ॉर्म के लिए अलग टूल उपलब्ध है।
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {hindiRelated(page.slug).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-center justify-between rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary/50 hover:shadow-md"
                >
                  <span className="pr-4 text-[15px] font-bold text-fg transition-colors group-hover:text-primary">
                    {item.name}
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-1" />
                </Link>
              ))}
            </div>
            <div className="pt-2 text-center">
              <Link
                href={englishUrl}
                hrefLang="en"
                className="inline-flex items-center gap-2 text-sm font-medium text-fg-muted transition-colors hover:text-primary"
              >
                <span>Read this page in English &rarr;</span>
              </Link>
            </div>
          </section>

          <section className="space-y-6 pt-2">
            <div className="border-b border-border pb-3">
              <h2 className="text-2xl font-extrabold tracking-tight text-fg sm:text-3xl">
                अक्सर पूछे जाने वाले सवाल
              </h2>
              <p className="mt-1 text-[14.5px] text-fg-muted sm:text-[15.5px]">
                {page.name} और पब्लिक-मीडिया सीमाओं से जुड़े जवाब।
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
