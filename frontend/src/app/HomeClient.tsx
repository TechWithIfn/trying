"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import HeroDownloader, { type DownloaderTab } from "@/components/HeroDownloader";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";
import { useLanguage } from "@/i18n";

import { Film, Video, Image as ImageIcon, Clock, Music, Link2, Search, Download, Eye, ShieldCheck } from "lucide-react";

const MEDIA_ROWS = [
  { href: "/instagram-reels-downloader", label: "Reels", note: "Supported video downloads", Icon: Film },
  { href: "/instagram-video-downloader", label: "Videos", note: "Supported video posts", Icon: Video },
  { href: "/instagram-photo-downloader", label: "Photos & Carousels", note: "Single photos and multi-slide posts", Icon: ImageIcon },
  { href: "/instagram-story-downloader", label: "Stories", note: "Active public Stories", Icon: Clock },
  { href: "/instagram-audio-downloader", label: "Audio", note: "MP3 extraction", Icon: Music },
] as const;

const FORMAT_ROWS = [
  { label: "Video", value: "MP4", Icon: Video },
  { label: "Images", value: "JPG, PNG or WebP when provided", Icon: ImageIcon },
  { label: "Audio", value: "MP3", Icon: Music },
] as const;

const FLOW_STAGES = [
  { n: "01", title: "Paste link", desc: "Drop in a supported public link.", Icon: Link2 },
  { n: "02", title: "Check media", desc: "The service identifies what is available.", Icon: Search },
  { n: "03", title: "Preview", desc: "Review the file before saving.", Icon: Eye },
  { n: "04", title: "Save", desc: "Download it to your device.", Icon: Download },
] as const;

export default function HomeClient() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<DownloaderTab | null>(null);

  useEffect(() => {
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    if (requestedTab === "reels" || requestedTab === "videos" || requestedTab === "photos" || requestedTab === "stories" || requestedTab === "audio") {
      queueMicrotask(() => setActiveTab(requestedTab));
    }
  }, []);

  const handleDownloaderTabChange = (tab: DownloaderTab | null) => {
    setActiveTab(tab);
    if (tab) {
      document.querySelector("section#hero")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const renderDownloader = () => (
    <HeroDownloader
        activeTab={activeTab}
        onActiveTabChange={setActiveTab}
        titleA={t.hero.titleA}
        titleB={t.hero.titleB}
        subtitle={t.hero.subtitle}
        placeholder={activeTab === "audio" ? t.hero.audioPlaceholder : t.hero.placeholder}
    />
  );

  return (
    <>
      <Header activeDownloaderTab={activeTab} onDownloaderTabChange={handleDownloaderTabChange} />
      <main id="main-content" className="flex-1">
        <div id="home-downloader">{renderDownloader()}</div>
      </main>
      <Footer />
    </>
  );
}