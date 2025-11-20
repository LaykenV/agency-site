import { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL 
  ? `https://${process.env.NEXT_PUBLIC_APP_URL}` 
  : process.env.SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/portal/*", "/admin/*", "/api/*"],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/portal/*", "/admin/*", "/api/*"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
