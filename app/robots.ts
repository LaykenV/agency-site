import { MetadataRoute } from "next";
import { getSiteBaseUrl } from "@/lib/seo/site";

const baseUrl = getSiteBaseUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/portal", "/portal/*", "/admin", "/admin/*", "/api/*"],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/portal", "/portal/*", "/admin", "/admin/*", "/api/*"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
