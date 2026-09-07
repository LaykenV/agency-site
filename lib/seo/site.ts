/**
 * Shared marketing SEO helpers: base URL, FAQs, OG defaults, industry paths.
 */

export function getSiteBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.SITE_URL || "https://acadianawebdesign.com";
  return new URL(/^https?:\/\//.test(configured) ? configured : `https://${configured}`).origin;
}

/** Canonical public path for industry landing pages */
export function industryPath(slug: string): string {
  return `/websites-for-${slug}`;
}

export const DEFAULT_OG_IMAGE = {
  url: "/opengraph-image.png",
  width: 1200,
  height: 630,
  alt: "Acadiana Web Design - $0 Down, from $199/mo",
} as const;

export const SITE_PHONE = "+1-337-306-3705";
export const SITE_EMAIL = "hello@acadianawebdesign.com";
export const SITE_NAME = "Acadiana Web Design";

/**
 * Homepage FAQs — single source of truth for visible UI + FAQPage JSON-LD.
 * Keep answers identical in both places (Google FAQ guidelines).
 */
export const HOMEPAGE_FAQS = [
  {
    question: 'What does "unlimited edits" include?',
    answer:
      "Swap a photo, fix a typo, add a new service, change your hours. Submit requests through your portal anytime. If you want a full redesign, we'll give you a simple quote. No nickel-and-diming.",
  },
  {
    question: "How fast can we launch?",
    answer:
      "We target launch within 72 hours after the scope, content, and assets are ready. We confirm your timeline before the build starts.",
  },
  {
    question: "Do I keep my domain?",
    answer:
      "We register and manage it for you while you're subscribed. After 12 months, it's yours to transfer if you want. Details in the Terms.",
  },
  {
    question: "Who owns the website?",
    answer:
      "Your content is yours — copy, photos, logo. We handle the design and code while you're subscribed. It's all spelled out in the Terms.",
  },
  {
    question: "How do I cancel?",
    answer:
      "Just email us. We ask that you stay for the first 12 months. After that, cancel anytime with a month's notice. No hoops.",
  },
  {
    question: "How much does a website cost for a local Acadiana business?",
    answer:
      "Plans start at $0 down and $199/mo with a 12-month minimum. That covers a custom Next.js site, hosting, SSL, domain, unlimited edits, and support — no hourly redesign fees. Larger sites and custom integrations are scoped separately.",
  },
  {
    question: "What if I only need a few pages?",
    answer:
      "Same price, less for you to manage. Plans start at $199/mo. We agree on the pages and features in your Order Form before work starts. Hosting, security, edits, and support are included.",
  },
  {
    question: "What if I need more than a website?",
    answer:
      "Online booking, e-commerce, customer portals, custom tools, AI chat — we build those too, quoted on top of the base plan. Bring it to the call and we will scope it honestly.",
  },
  {
    question: "Is local SEO included?",
    answer:
      "Yes. We build mobile-first pages with clear service and location structure so you can show up for searches like plumber near me in your city. Ongoing ranking campaigns are scoped separately if you need them.",
  },
] as const;

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
    "@type": "ProfessionalService",
    "@id": `${baseUrl}/#organization`,
    name: SITE_NAME,
    alternateName: "AWD Web Design",
    description:
      "Fast, professional websites for local service businesses in Acadiana. $0 down, from $199/mo. Custom websites with hosting, edits, and ongoing support.",
    image: `${baseUrl}/heroimg.jpg`,
    logo: `${baseUrl}/logo.png`,
    url: baseUrl,
    telephone: SITE_PHONE,
    email: SITE_EMAIL,
    areaServed: [
      { "@type": "City", name: "Lafayette" },
      { "@type": "City", name: "New Iberia" },
      { "@type": "City", name: "Opelousas" },
      { "@type": "City", name: "Crowley" },
      { "@type": "City", name: "Breaux Bridge" },
      { "@type": "City", name: "Youngsville" },
      { "@type": "City", name: "Abbeville" },
      { "@type": "City", name: "Scott" },
    ],
    priceRange: "$$",
    paymentAccepted: "Credit Card, Debit Card",
    serviceType: [
      "Web Design",
      "Website Development",
      "Website Hosting",
      "Local SEO",
      "Website Maintenance",
    ],
    sameAs: ["https://twitter.com/LLVarholdt"],
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "17:00",
    },
    offers: {
      "@type": "Offer",
      name: "Website-as-a-Service All-Inclusive Plan",
      description:
        "Custom Next.js website with hosting, SSL, domain, and unlimited edits",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        minPrice: "199.00",
        priceCurrency: "USD",
        unitText: "MONTH",
      },
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: baseUrl,
      eligibleRegion: {
        "@type": "Place",
        name: "Louisiana",
      },
    },
    // A business cannot earn review snippets from its own self-serving ratings.
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

export function faqPageSchema(
  faqs: ReadonlyArray<{ question: string; answer: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}
