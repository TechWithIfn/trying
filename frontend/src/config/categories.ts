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
    desc: "Reels, videos, photos, carousels, stories & audio",
    icon: InstagramIcon,
    color: "#ec5fa8",
    badgeBg: "rgba(236, 95, 168, 0.12)",
    items: [
      {
        name: "Reels Downloader",
        href: "/instagram-reels-downloader",
        desc: "Save public Reels as high-definition MP4",
        icon: Film,
      },
      {
        name: "Video Downloader",
        href: "/instagram-video-downloader",
        desc: "Download longer video posts in original quality",
        icon: Video,
      },
      {
        name: "Photo Downloader",
        href: "/instagram-photo-downloader",
        desc: "Save single photos and complete swipe carousels",
        icon: ImageIcon,
      },
      {
        name: "Story Downloader",
        href: "/instagram-story-downloader",
        desc: "Save live public stories before they expire",
        icon: Clock,
      },
      {
        name: "Audio Downloader",
        href: "/instagram-audio-downloader",
        desc: "Extract background tracks and sound as MP3",
        icon: Music,
      },
    ],
  },
  {
    id: "pinterest",
    name: "Pinterest Downloader",
    shortName: "Pinterest",
    mainHref: "/pinterest-video-downloader",
    desc: "Pins, idea videos, high-res photos & carousels",
    icon: PinterestIcon,
    color: "#e60023",
    badgeBg: "rgba(230, 0, 35, 0.10)",
    items: [
      {
        name: "Video Downloader",
        href: "/pinterest-video-downloader",
        desc: "Save Pinterest pin videos and idea clips as MP4",
        icon: Pin,
      },
      {
        name: "Image Downloader",
        href: "/pinterest-image-downloader",
        desc: "Download full-resolution pin photos & image boards",
        icon: Layers,
      },
    ],
  },
  {
    id: "facebook",
    name: "Facebook Downloader",
    shortName: "Facebook",
    mainHref: "/facebook-video-downloader",
    desc: "Public Facebook feed videos, Reels and Watch clips",
    icon: FacebookIcon,
    color: "#1877f2",
    badgeBg: "rgba(24, 119, 242, 0.10)",
    items: [
      {
        name: "Video Downloader",
        href: "/facebook-video-downloader",
        desc: "Download public Facebook feed videos & Reels",
        icon: Video,
      },
    ],
  },
  {
    id: "twitter",
    name: "Twitter/X Downloader",
    shortName: "Twitter/X",
    mainHref: "/twitter-video-downloader",
    desc: "X / Twitter post videos and looped GIF animations",
    icon: TwitterIcon,
    color: "#0f172a",
    badgeBg: "rgba(15, 23, 42, 0.10)",
    items: [
      {
        name: "Video Downloader",
        href: "/twitter-video-downloader",
        desc: "Save high-quality MP4 videos & GIFs from tweets",
        icon: Video,
      },
    ],
  },
  {
    id: "threads",
    name: "Threads Downloader",
    shortName: "Threads",
    mainHref: "/threads-video-downloader",
    desc: "Videos and pictures from public Threads posts",
    icon: ThreadsIcon,
    color: "#0f172a",
    badgeBg: "rgba(15, 23, 42, 0.10)",
    items: [
      {
        name: "Video Downloader",
        href: "/threads-video-downloader",
        desc: "Download public Threads videos and images",
        icon: Video,
      },
    ],
  },
];

