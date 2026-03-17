import { MetadataRoute } from "next";
import { ACADIANA_CITIES } from "@/lib/seo/cities";
import { TARGET_INDUSTRIES } from "@/lib/seo/industries";
import { BLOG_POSTS } from "@/lib/seo/blog";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL 
  ? `https://${process.env.NEXT_PUBLIC_APP_URL}` 
  : process.env.SITE_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/onboarding`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/legal/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/legal/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/sms-consent`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];

  // City landing pages (programmatic SEO)
  const cityPages: MetadataRoute.Sitemap = ACADIANA_CITIES.map((city) => ({
    url: `${baseUrl}/${city.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  // Industry landing pages (programmatic SEO)
  const industryPages: MetadataRoute.Sitemap = TARGET_INDUSTRIES.map((industry) => ({
    url: `${baseUrl}/websites-for-${industry.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  // City + Industry combination pages (programmatic SEO - highest intent)
  const cityIndustryPages: MetadataRoute.Sitemap = [];
  for (const city of ACADIANA_CITIES) {
    for (const industry of TARGET_INDUSTRIES) {
      cityIndustryPages.push({
        url: `${baseUrl}/${city.slug}/${industry.slug}`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.7,
      });
    }
  }

  // Blog pages
  const blogIndexPage: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
  ];

  const blogPostPages: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt || post.publishedAt),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [
    ...staticPages, 
    ...cityPages, 
    ...industryPages, 
    ...cityIndustryPages,
    ...blogIndexPage, 
    ...blogPostPages
  ];
}
