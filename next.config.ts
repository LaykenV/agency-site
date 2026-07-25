import type { NextConfig } from "next";

/**
 * Industry slugs for URL rewrites / redirects
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
  "pressure-washing",
  "cleaning-services",
  "pest-control",
  "tree-services",
  "fencing",
  "garage-doors",
  "concrete",
  "pool-services",
] as const;

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/demo/:token",
        destination: "/audit/:token",
        permanent: true,
      },
      // Collapse non-canonical industry URLs onto SEO paths
      ...INDUSTRY_SLUGS.map((slug) => ({
        source: `/services/${slug}`,
        destination: `/websites-for-${slug}`,
        permanent: true,
      })),
      {
        source: "/services",
        destination: "/",
        permanent: true,
      },
    ];
  },
  // Rewrite SEO-friendly URLs to the App Router segment under /services/[industry]
  // Public URL stays /websites-for-plumbers; internal route is /services/plumbers
  async rewrites() {
    return INDUSTRY_SLUGS.map((slug) => ({
      source: `/websites-for-${slug}`,
      destination: `/services/${slug}`,
    }));
  },
};

export default nextConfig;
