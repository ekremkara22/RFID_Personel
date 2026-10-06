import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const isStaging = process.env.APP_ENV === "staging";
  const baseUrl = isStaging ? "https://test.flodeska.com" : "https://flodeska.com";
  return {
    rules: isStaging ? { userAgent: "*", disallow: "/" } : { userAgent: "*", allow: "/", disallow: ["/dashboard/", "/api/"] },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
