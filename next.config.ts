import type { NextConfig } from "next";

/**
 * Industry slugs for URL rewrites
 * Keep in sync with lib/seo/industries.ts
 */
const INDUSTRY_SLUGS = [
  "plumbers",
  "landscapers", 
  "painters",
  "contractors",
  "electricians",
  "hvac",
  "roofers",
] as const;

const nextConfig: NextConfig = {
  // Rewrite SEO-friendly URLs to dynamic routes
  // Maps /websites-for-{industry} → /services/{industry}
  // Users see /websites-for-plumbers in browser, Next.js routes to /services/plumbers internally
  async rewrites() {
    return INDUSTRY_SLUGS.map((slug) => ({
      source: `/websites-for-${slug}`,
      destination: `/services/${slug}`,
    }));
  },
};

export default nextConfig;
