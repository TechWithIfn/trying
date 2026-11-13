import React from "react";
import {
  Film,
  Video,
  Image as ImageIcon,
  Clock,
  Music,
  Pin,
  Play,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  FacebookIcon,
  InstagramIcon,
  PinterestIcon,
  ThreadsIcon,
  TwitterIcon,
} from "@/components/ToolCategoryDropdown";

export interface CategorySubItem {
  name: string;
  href: string;
  desc: string;
  icon: React.ComponentType<{ className?: string; size?: number; strokeWidth?: number }>;
  badge?: string;
}

export interface PlatformCategory {
  id: string;
  name: string;
  shortName: string;
  mainHref: string;
  desc: string;
  icon: React.ComponentType<{ className?: string; size?: number; strokeWidth?: number }>;
  color: string;
  badgeBg: string;
  items: CategorySubItem[];
}

export const PLATFORM_CATEGORIES: PlatformCategory[] = [
  {
    id: "instagram",
    name: "Instagram Downloader",
    shortName: "Instagram",
    mainHref: "/instagram-video-downloader",
    desc: "Reels, videos, photos, carousels, stories and audio",
    icon: InstagramIcon,
    color: "#ec5fa8",
    badgeBg: "rgba(236, 95, 168, 0.12)",
    items: [
      {
        name: "Reels Downloader",
        href: "/instagram-reels-downloader",
        desc: "Save public Reels as MP4",
        icon: Film,
      },
      {
        name: "Video Downloader",
        href: "/instagram-video-downloader",
        desc: "Longer video posts",
        icon: Video,
      },
      {
        name: "Photo Downloader",
        href: "/instagram-photo-downloader",
        desc: "Photos and full carousels",
        icon: ImageIcon,
      },
      {
        name: "Carousel Downloader",
        href: "/instagram-carousel-downloader",
        desc: "Every slide from a post",
        icon: Layers,
      },
      {
        name: "Story Downloader",
        href: "/instagram-story-downloader",
        desc: "Live public Stories",
        icon: Clock,
      },
      {
        name: "Audio Downloader",
        href: "/instagram-audio-downloader",
        desc: "Extract sound as MP3",
        icon: Music,
      },
    ],
  },
  {
    id: "pinterest",
    name: "Pinterest Downloader",
    shortName: "Pinterest",
    mainHref: "/pinterest-video-downloader",
    desc: "Video pins, images and carousels",
    icon: PinterestIcon,
    color: "#e60023",
    badgeBg: "rgba(230, 0, 35, 0.10)",
    items: [
      {
        name: "Video Downloader",
        href: "/pinterest-video-downloader",
        desc: "Pin videos as MP4",
        icon: Pin,
      },
      {
        name: "Image Downloader",
        href: "/pinterest-image-downloader",
        desc: "High-resolution images",
        icon: Layers,
      },
      {
        name: "Pinterest to MP4",
        href: "/pinterest-to-mp4",
        desc: "Convert a Pin to MP4",
        icon: Video,
      },
      {
        name: "Idea Pin Downloader",
        href: "/pinterest-idea-pin-downloader",
        desc: "Save Idea Pin pages",
        icon: Sparkles,
      },
    ],
  },
  {
    id: "facebook",
    name: "Facebook Downloader",
    shortName: "Facebook",
    mainHref: "/facebook-video-downloader",
    desc: "Public feed videos and Reels",
    icon: FacebookIcon,
    color: "#1877f2",
    badgeBg: "rgba(24, 119, 242, 0.10)",
    items: [
      {
        name: "Video Downloader",
        href: "/facebook-video-downloader",
        desc: "Public feed videos",
        icon: Video,
      },
      {
        name: "Reels Downloader",
        href: "/facebook-reels-downloader",
        desc: "Public Facebook Reels",
        icon: Film,
      },
      {
        name: "Watch Downloader",
        href: "/facebook-watch-downloader",
        desc: "Watch and longer videos",
        icon: Play,
      },
    ],
  },
  {
    id: "twitter",
    name: "Twitter/X Downloader",
    shortName: "Twitter/X",
    mainHref: "/twitter-video-downloader",
    desc: "Post videos and looped GIFs",
    icon: TwitterIcon,
    color: "#0f172a",
    badgeBg: "rgba(15, 23, 42, 0.10)",
    items: [
      {
        name: "Video Downloader",
        href: "/twitter-video-downloader",
        desc: "MP4 videos and GIFs",
        icon: Video,
      },
      {
        name: "GIF Downloader",
        href: "/twitter-gif-downloader",
        desc: "X GIFs as MP4",
        icon: Film,
      },
      {
        name: "X Video to MP4",
        href: "/twitter-video-to-mp4",
        desc: "Post video as MP4",
        icon: Video,
      },
    ],
  },
  {
    id: "threads",
    name: "Threads Downloader",
    shortName: "Threads",
    mainHref: "/threads-video-downloader",
    desc: "Videos and photos from public posts",
    icon: ThreadsIcon,
    color: "#0f172a",
    badgeBg: "rgba(15, 23, 42, 0.10)",
    items: [
      {
        name: "Video Downloader",
        href: "/threads-video-downloader",
        desc: "Public videos and images",
        icon: Video,
      },
      {
        name: "Photo Downloader",
        href: "/threads-photo-downloader",
        desc: "Photos from public posts",
        icon: ImageIcon,
      },
    ],
  },
];

