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
  /**
   * Vercel builds crash inside webpack's WebAssembly xxhash64 implementation:
   *   TypeError: Cannot read properties of undefined (reading 'length')
   *   at WasmHash._updateWithBuffer
   *
   * Not memory pressure — raising the heap to 8 GB and isolating the webpack
   * build worker was deployed first and failed identically, and the whole repo
   * carries under 10 MB of static assets. Next sets `hashFunction: "xxhash64"`
   * by default; this swaps in Node's crypto hasher so the WASM module is never
   * instantiated. Slightly slower hashing, no behavior change in output.
   */
  webpack: (config, { dev }) => {
    if (!dev) {
      config.output = {
        ...config.output,
        hashFunction: "sha256",
      };
    }
    return config;
  },
  async redirects() {
    return [
      {
        source: "/onboarding",
        destination:
          "https://cal.com/layken-varholdt/agency-prospect?utm_source=site&utm_medium=cta&utm_campaign=awdlp&utm_content=retired_onboarding",
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
