import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Downloadit — Multi-Platform Media Downloader",
    short_name: "Downloadit",
    description:
      "Download public videos, photos and audio from Instagram, Pinterest, Facebook, Twitter/X and Threads.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f4fa",
    theme_color: "#7c4df5",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}