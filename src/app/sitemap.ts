import type { MetadataRoute } from "next";
import { blogPosts } from "@/lib/marketing/blog-posts";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.APP_ENV === "staging" ? "https://test.flodeska.com" : "https://flodeska.com";
  const pages: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/moduller`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/moduller/ik-rfid-personel-takip`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/blog`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/iletisim`, changeFrequency: "yearly", priority: 0.6 },
  ];
  return [...pages, ...blogPosts.map((post) => ({ url: `${baseUrl}/blog/${post.slug}`, lastModified: post.publishedAt, changeFrequency: "monthly" as const, priority: 0.7 }))];
}
