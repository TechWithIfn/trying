import { SITE_URL } from "@/config/site";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/download/", "/stream/", "/_next/webpack-hmr"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}