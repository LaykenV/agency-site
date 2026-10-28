/**
 * Shared public SEO helpers: base URL, OG defaults, and schema.
 */

export function getSiteBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.SITE_URL || "https://acadianawebdesign.com";
  return new URL(/^https?:\/\//.test(configured) ? configured : `https://${configured}`).origin;
}

export const DEFAULT_OG_IMAGE = {
  url: "/opengraph-image.png",
  width: 1200,
  height: 630,
  alt: "Acadiana Web Design. New projects now go through Varholdt Labs.",
} as const;

export const SITE_PHONE = "+1-337-306-3705";
export const SITE_EMAIL = "hello@acadianawebdesign.com";
export const SITE_NAME = "Acadiana Web Design";
export const SITE_DESCRIPTION =
  "Acadiana Web Design no longer takes new website projects. Existing clients keep their site, support, and client portal. New custom software and AI projects go through Varholdt Labs.";

export const VARHOLDT_URL = "https://www.varholdt.com/";
export const LEGAL_ENTITY = "Varholdt AI LLC";

/** Shared OG fields for marketing pages (inherits site-wide image when not overridden). */
export function marketingOpenGraph(args: {
  title: string;
  description: string;
  url: string;
}): {
  title: string;
  description: string;
  url: string;
  type: "website";
  siteName: string;
  locale: string;
  images: Array<{ url: string; width: number; height: number; alt: string }>;
} {
  return {
    title: args.title,
    description: args.description,
    url: args.url,
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    images: [{ ...DEFAULT_OG_IMAGE }],
  };
}

export function organizationSchema(baseUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${baseUrl}/#organization`,
    name: SITE_NAME,
    legalName: LEGAL_ENTITY,
    description:
      "Support and client portal for existing Acadiana Web Design clients. New custom software and AI projects go through Varholdt Labs.",
    logo: `${baseUrl}/logo.png`,
    url: baseUrl,
    telephone: SITE_PHONE,
    email: SITE_EMAIL,
  };
}

export function websiteSchema(baseUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${baseUrl}/#website`,
    name: SITE_NAME,
    url: baseUrl,
    publisher: { "@id": `${baseUrl}/#organization` },
    inLanguage: "en-US",
  };
}
