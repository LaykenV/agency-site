import type { NextConfig } from "next";
import { WebpackSha256 } from "./lib/webpackSha256";

/**
 * Website packages are no longer sold. These were the public sales routes:
 * the quote form, city and industry landing pages, the blog, the self-serve
 * audit, and the Facebook cover generator. Old links land on the homepage,
 * which explains the move to Varholdt Labs and links existing clients to the portal.
 */
const CITY_SLUGS =
  "lafayette|new-iberia|opelousas|crowley|breaux-bridge|abbeville|youngsville|scott";

// `/:path*` also matches the bare prefix, so "/blog/:path*" covers "/blog".
export const RETIRED_SALES_ROUTES = [
  "/onboarding",
  "/quote",
  "/fb-cover",
  "/services/:path*",
  "/:page(websites-for-.+)",
  `/:city(${CITY_SLUGS})/:path*`,
  "/blog/:path*",
  "/audit/:path*",
] as const;

const nextConfig: NextConfig = {
  images: { formats: ["image/avif", "image/webp"] },
  /**
   * Vercel builds crash inside webpack's WebAssembly xxhash64 implementation:
   *   TypeError: Cannot read properties of undefined (reading 'length')
   *   at WasmHash._updateWithBuffer
   *
   * Switching the algorithm string to `"sha256"` only changed the error to
   * Node's `Hash.update(undefined)` (`ERR_INVALID_ARG_TYPE`). A custom hasher
   * keeps Node crypto (no WASM) and ignores empty writes. Do not replace the
   * whole `output` object — Next attaches other fields on it.
   */
  webpack: (config, { dev }) => {
    if (!dev && config.output) {
      config.output.hashFunction = WebpackSha256;
    }
    return config;
  },
  async redirects() {
    return RETIRED_SALES_ROUTES.map((source) => ({
      source,
      destination: "/",
      permanent: true,
    }));
  },
};

export default nextConfig;
