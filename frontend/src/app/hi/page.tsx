import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Globe,
  Link2,
  ShieldCheck,
  Smartphone,
  Zap,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  FacebookIcon,
  InstagramIcon,
  PinterestIcon,
  ThreadsIcon,
  TwitterIcon,
} from "@/components/ToolCategoryDropdown";
import { SITE_URL } from "@/config/site";
import { HINDI_TOOL_PAGES } from "@/config/hindiPages";
import { getHindiPosts } from "@/lib/blog";

const HI_TITLE = "Downloadit – इंस्टाग्राम, फेसबुक, पिनट्रेस्ट और X डाउनलोडर";
const HI_DESCRIPTION =
  "इंस्टाग्राम, फेसबुक, पिनट्रेस्ट, X और थ्रेड्स से पब्लिक वीडियो, फोटो और ऑडियो डाउनलोड करें। मुफ़्त में प्रीव्यू करें और सेव करें — लॉगिन की ज़रूरत नहीं।";

export const metadata: Metadata = {
  title: { absolute: HI_TITLE },
  description: HI_DESCRIPTION,
  alternates: {
    canonical: "/hi",
    languages: {
      en: SITE_URL,
      hi: `${SITE_URL}/hi`,
      "x-default": SITE_URL,
    },
  },
  openGraph: {
    title: { absolute: HI_TITLE },
    description: HI_DESCRIPTION,
    url: `${SITE_URL}/hi`,
    type: "website",
    siteName: "Downloadit",
    locale: "hi_IN",
    images: [
      {
        url: "/og-downloadit.png",
        width: 1200,
        height: 630,
        alt: "Downloadit — पब्लिक मीडिया डाउनलोडर",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: { absolute: HI_TITLE },
    description: HI_DESCRIPTION,
    images: ["/og-downloadit.png"],
  },
};

const PLATFORM_ICONS = {
  instagram: InstagramIcon,
  pinterest: PinterestIcon,
  facebook: FacebookIcon,
  twitter: TwitterIcon,
  threads: ThreadsIcon,
} as const;

const FAQS = [
  {
    q: "क्या Downloadit मुफ़्त है?",
    a: "हाँ। पब्लिक इंस्टाग्राम, फेसबुक, पिनट्रेस्ट, X और थ्रेड्स मीडिया डाउनलोड करने के लिए कोई शुल्क, सब्सक्रिप्शन या अकाउंट नहीं चाहिए।",
  },
  {
    q: "क्या मुझे किसी प्लेटफ़ॉर्म में लॉगिन करना होगा?",
    a: "नहीं। Downloadit आपका पासवर्ड, ईमेल या सेशन कुकी नहीं मांगता। केवल पब्लिक पोस्ट का लिंक पर्याप्त है।",
  },
  {
    q: "क्या प्राइवेट अकाउंट की पोस्ट डाउनलोड हो सकती है?",
    a: "नहीं। प्राइवेट अकाउंट, फ़ॉलोअर्स-ओनली कंटेंट, लॉगिन वॉल और पेड कंटेंट इस टूल के दायरे से बाहर हैं।",
  },
  {
    q: "डाउनलोड की गई फ़ाइल कहाँ सेव होती है?",
    a: "फ़ाइल ब्राउज़र की Downloads में जाती है। iPhone पर Files से Photos में और Android पर Downloads से Gallery या Google Photos में सेव किया जा सकता है।",
  },
  {
    q: "क्या Downloadit मीडिया को अपने सर्वर पर रखता है?",
    a: "नहीं। टूल मीडिया को स्टोर या आर्काइव नहीं करता। फ़ाइल सीधे प्लेटफ़ॉर्म से आपके ब्राउज़र तक स्ट्रीम होती है।",
  },
];

export default function HindiHomePage() {
  const posts = getHindiPosts().slice(0, 5);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${SITE_URL}/hi#webpage`,
        url: `${SITE_URL}/hi`,
        name: HI_TITLE,
        description: HI_DESCRIPTION,
        inLanguage: "hi",
        isPartOf: { "@id": `${SITE_URL}/#website` },
      },
      {
        "@type": "FAQPage",
        "@id": `${SITE_URL}/hi#faq`,
        inLanguage: "hi",
        mainEntity: FAQS.map((faq) => ({
          "@type": "Question",
          name: faq.q,
          acceptedAnswer: { "@type": "Answer", text: faq.a },
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <main id="main-content" className="flex-1" lang="hi">
        <section className="mx-auto w-full max-w-[1100px] px-4 pb-10 pt-10 sm:px-6 sm:pb-14 sm:pt-16">
          <div className="mx-auto max-w-[820px] text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-[12px] font-semibold text-fg-muted">
              <Globe className="h-3.5 w-3.5 text-primary" />
              पब्लिक मीडिया के लिए मुफ़्त टूल
            </span>
            <h1 className="mt-5 text-balance text-[32px] font-extrabold leading-[1.15] tracking-tight text-fg sm:text-[46px]">
              Downloadit – इंस्टाग्राम, फेसबुक, पिनट्रेस्ट और X डाउनलोडर
            </h1>
            <p className="mx-auto mt-5 max-w-[700px] text-[16px] leading-[1.8] text-fg-muted sm:text-[18px]">
              पाँच प्लेटफ़ॉर्म की पब्लिक रील्स, वीडियो, फोटो और ऑडियो एक ही जगह
              सेव करें। लिंक पेस्ट करें, प्रीव्यू देखें और मुफ़्त में डाउनलोड
              करें — कोई अकाउंट या ऐप इंस्टॉल नहीं करना है।
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/hi/instagram-video-downloader"
                className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-primary px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-primary-hover"
              >
                डाउनलोडर खोलें <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/"
                hrefLang="en"
                className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-[15px] font-semibold text-fg transition-colors hover:border-primary/50 hover:text-primary"
              >
                English version
              </Link>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {HINDI_TOOL_PAGES.map((tool) => {
              const Icon = PLATFORM_ICONS[tool.platform];
              return (
                <Link
                  key={tool.slug}
                  href={`/hi/${tool.slug}`}
                  className="group rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary/50 hover:shadow-md"
                >
                  <Icon className="h-7 w-7" />
                  <h2 className="mt-3 text-[16px] font-bold text-fg group-hover:text-primary">
                    {tool.name}
                  </h2>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">
                    {tool.platform === "instagram"
                      ? "रील्स, वीडियो, फोटो और कैरोसेल"
                      : tool.platform === "pinterest"
                        ? "वीडियो पिन और इमेज पिन"
                        : tool.platform === "facebook"
                          ? "पब्लिक वीडियो, रील्स और वॉच"
                          : tool.platform === "twitter"
                            ? "पोस्ट वीडियो और GIF एनिमेशन"
                            : "वीडियो और फोटो पोस्ट"}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary">
                    टूल खोलें <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="border-y border-border bg-card/40">
          <div className="mx-auto w-full max-w-[1000px] px-4 py-12 sm:px-6 sm:py-16">
            <h2 className="text-center text-2xl font-extrabold tracking-tight text-fg sm:text-3xl">
              Downloadit कैसे काम करता है
            </h2>
            <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
              {[
                {
                  icon: Link2,
                  title: "पब्लिक लिंक कॉपी करें",
                  body: "प्लेटफ़ॉर्म ऐप या वेबसाइट पर पोस्ट खोलें, Share > Copy link चुनें। प्रोफ़ाइल का नहीं, उस पोस्ट का लिंक लें।",
                },
                {
                  icon: Zap,
                  title: "लिंक पेस्ट करके प्रीव्यू देखें",
                  body: "ऊपर संबंधित टूल खोलें, लिंक पेस्ट करें और Get Media दबाएँ। टूल उपलब्ध मीडिया और फ़ॉर्मेट दिखाएगा।",
                },
                {
                  icon: Smartphone,
                  title: "फ़ाइल सेव करें",
                  body: "Download दबाकर फ़ाइल अपने डिवाइस में सेव करें। iPhone पर Photos और Android पर Gallery में ले जाएँ।",
                },
              ].map((step, index) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.title}
                    className="rounded-2xl border border-border bg-card p-6"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                        {index + 1}
                      </span>
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="mt-3 text-[16px] font-bold text-fg">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-[14px] leading-relaxed text-fg-muted">
                      {step.body}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1000px] px-4 py-12 sm:px-6 sm:py-16">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-fg sm:text-3xl">
                क्या डाउनलोड किया जा सकता है
              </h2>
              <ul className="mt-5 space-y-3">
                {[
                  "इंस्टाग्राम रील्स, वीडियो, फोटो, कैरोसेल और पब्लिक स्टोरी",
                  "फेसबुक पब्लिक वीडियो, रील्स और वॉच वीडियो",
                  "पिनट्रेस्ट वीडियो पिन, इमेज पिन और कैरोसेल",
                  "X/ट्विटर पोस्ट वीडियो और GIF स्टाइल एनिमेशन",
                  "थ्रेड्स पब्लिक वीडियो और फोटो",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 text-[15px] leading-relaxed text-fg-muted"
                  >
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 text-primary">
                <ShieldCheck className="h-5 w-5" />
                <h2 className="text-[18px] font-bold text-fg">
                  सुरक्षा और सीमाएँ
                </h2>
              </div>
              <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
                Downloadit केवल वही मीडिया प्रोसेस करता है जो प्लेटफ़ॉर्म
                सार्वजनिक रूप से दिखाते हैं। यह प्राइवेट अकाउंट, लॉगिन वॉल,
                पेड कंटेंट, DRM या ऐसी सामग्री को बायपास नहीं करता जिसे देखने
                के लिए अनुमति चाहिए। कॉपीराइट और प्लेटफ़ॉर्म की शर्तें फिर भी
                लागू रहती हैं — केवल अपनी या अनुमति वाली सामग्री सेव करें।
              </p>
              <Link
                href="/hi/blog"
                className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-primary hover:underline"
              >
                हिंदी गाइड पढ़ें <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto w-full max-w-[900px] px-4 py-12 sm:px-6 sm:py-16">
            <h2 className="text-2xl font-extrabold tracking-tight text-fg sm:text-3xl">
              अक्सर पूछे जाने वाले सवाल
            </h2>
            <div className="mt-6 space-y-3">
              {FAQS.map((faq) => (
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
          </div>
        </section>

        {posts.length > 0 && (
          <section className="border-t border-border">
            <div className="mx-auto w-full max-w-[1000px] px-4 py-12 sm:px-6 sm:py-16">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 className="text-2xl font-extrabold tracking-tight text-fg sm:text-3xl">
                  हिंदी में डाउनलोड गाइड
                </h2>
                <Link
                  href="/hi/blog"
                  className="text-[14px] font-semibold text-primary hover:underline"
                >
                  सभी गाइड देखें
                </Link>
              </div>
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {posts.map((post) => (
                  <Link
                    key={post.slug}
                    href={`/hi/blog/${post.slug}`}
                    className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/50"
                  >
                    <span className="text-[15.5px] font-bold text-fg">
                      {post.title}
                    </span>
                    <span className="mt-2 block text-[13.5px] leading-relaxed text-fg-muted">
                      {post.description}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
