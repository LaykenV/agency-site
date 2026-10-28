import { MetadataRoute } from "next";
import { getSiteBaseUrl } from "@/lib/seo/site";

const baseUrl = getSiteBaseUrl();

// Website packages are retired, so the city, industry, blog, and quote pages
// redirect home and are no longer listed.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: baseUrl,
      lastModified: new Date("2026-10-28"),
      changeFrequency: "monthly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/legal/terms`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/legal/privacy`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/sms-consent`,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    // NOTE: /sms-consent/screenshot is intentionally absent — it stays live for
    // Twilio A2P reviewers but is noindex'd, so submitting it here would conflict.
  ];
}
