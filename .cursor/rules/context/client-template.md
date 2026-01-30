# The Agency Blueprint: Client Template (Product Factory)

**Document Version:** 7.1  
**Target Stack:** Next.js 15 (App Router), React 19, Tailwind 4, TypeScript 5.7  
**Philosophy:** "Config over Code." The code is standardized; the configuration is bespoke.  
**Related:** `agencyUpdate.md` (backend updates for WaaS hub)

---

## I. Strategic Foundation

### 1. The Business Model
- **Pricing:** **$199/month** (12-month min). Do not drop to $99.
- **Positioning:** You are not selling "hosting"; you are selling a "Digital Employee" (a fully managed web team).
- **Offer:** Up to **7 pages** (Home, About, Services, Gallery, Team, Contact, FAQ), unlimited edits, managed performance.

### 2. The "Anti-Template" Engine
To scale to 100+ clients without them looking identical, we move beyond "swapping colors." We use:
1. **Dynamic Playlists:** Page structure (order of sections) is defined in config, not code.
2. **Design Archetypes:** Purely structural tokens (fonts, radius, spacing, shadows) that drastically change the "physics" of the site. Archetypes are color-agnostic—colors always come from `design.tokens`.
3. **Industry Flavor Packs:** Pre-curated content and layout strategies for specific verticals.

> **Phase 2 Enhancement:** After initial clients, expand archetypes with Motion Profiles (static/subtle/dynamic/dramatic) and Density Profiles (spacious/balanced/compact) for 48+ unique "feels."

### 3. Architecture: Smart Hub, Dumb Spokes
- **Client Sites (Spokes):** SSG-first with Serverless Islands. Pages are statically generated at build time for elite PageSpeed. Server Actions handle forms securely.
- **Agency Backend (Hub):** Convex (DB + Auth + Logic). Handles all leads, analytics, and email notifications. See `agencyUpdate.md` for backend changes.

### 4. Rendering Strategy
- **SSG on Vercel:** All pages are pre-rendered at build time via `generateStaticParams()`. This ensures 95+ PageSpeed scores.
- **Server Actions:** Contact forms use `'use server'` actions for Turnstile validation and POST to the hub.
- **Client Islands:** Only interactive elements (mobile nav, form inputs) are hydrated client-side.
- **NOT static export:** We do not use `output: "export"`. We need serverless runtime for Server Actions.

---

## II. Directory Structure

Optimized for AI Agents and Dynamic Routing. We do **not** use separate folders for `/about` or `/services`.

```text
/app
├── layout.tsx              # Global Shell (Header, Footer, Theme Injection, JSON-LD)
├── [[...slug]]             # THE MAGIC ROUTER
│   └── page.tsx            # Dynamic Page Renderer (Home + Inner Pages)
├── not-found.tsx
├── global-error.tsx
└── robots.ts / sitemap.ts
/components
├── /agency                 # The Registry (Hero, Features, Reviews, etc.)
├── /renderer               # SectionRenderer.tsx (Maps Config -> Components)
├── /ui                     # Primitive UI (Buttons, Inputs)
└── /utils                  # AnalyticsPixel, LocalBusinessSchema, ErrorBoundary
/config
├── site.ts                 # PUBLIC CONFIG: Content + Layout + Routing (safe to import anywhere)
├── registry.ts             # Component mapping
└── theme.ts                # Archetype definitions (Tailwind classes)
/lib
├── secrets.ts              # SERVER-ONLY: Turnstile secret (never import in client components)
└── utils.ts
/types
└── config.ts               # TypeScript interfaces + Zod schemas for the Config Engine
/actions
├── contact.ts              # Server Action (Turnstile + POST to WaaS)
└── reviews.ts              # Server Action (Google Places API)
/scripts
└── validate-config.ts      # Build-time Zod validation
.cursor
└── rules                   # Instructions for the AI Developer
/public
└── /images                 # Client images (Next.js handles optimization)
```

---

## III. The Configuration Engine

This is the most critical part of the codebase. It allows you to build a unique 7-page site without touching a `.tsx` file.

### 1. Type Definitions (`types/config.ts`)

```typescript
import { z } from "zod";

// ============================================
// DESIGN ARCHETYPES (Purely Structural - Colors come from tokens)
// ============================================
export type ThemeArchetype = 
  | "trustworthy-trade"   // Square corners, heavy borders, serif headings (Roofers, Contractors)
  | "modern-minimal"      // Full rounding, flat, sans-serif (Consultants, Legal, Finance)
  | "warm-organic"        // Soft shadows, rounded shapes, elegant serif (Wellness, Beauty, Health)
  | "bold-impact";        // Sharp edges, thick borders, brutalist (Fitness, Auto, Sports)

// ============================================
// IMAGE CONFIG (Enforces accessibility + optimization)
// ============================================
export interface ImageConfig {
  src: string;           // "/images/hero.webp" or remote URL
  alt: string;           // Required for accessibility
  width?: number;        // Hint for next/image optimization
  height?: number;
}

// ============================================
// SECTION CONTENT TYPES (Discriminated Unions)
// Each variant has strictly typed content - NO `any` types
// ============================================

// Hero Variants
export type HeroSplitContent = {
  title: string;
  subtitle: string;
  cta: { label: string; href: string };
  image: ImageConfig;
  trustBadges?: Array<{ text: string; icon?: string }>;
  // Social proof bar (avatar stack + count) - used by split-trust variant
  socialProof?: {
    count: string;    // e.g., "500+"
    label: string;    // e.g., "happy clients"
  };
  // Floating testimonial card - used by split-trust variant
  testimonial?: {
    quote: string;
    author: string;
    role?: string;    // e.g., "Verified Customer"
  };
};

export type HeroSimpleContent = {
  title: string;
  subtitle?: string;
};

export type HeroCenteredContent = {
  title: string;
  subtitle: string;
  cta: { label: string; href: string };
  backgroundImage?: ImageConfig;
};

export type HeroVideoContent = {
  title: string;
  subtitle: string;
  cta: { label: string; href: string };
  videoUrl: string;
  posterImage: ImageConfig;
};

export type HeroWithStatsContent = {
  title: string;
  subtitle: string;
  cta: { label: string; href: string };
  stats: Array<{
    value: string;
    label: string;
    description?: string;
  }>;
  backgroundImage?: ImageConfig;
};

// Note: HeroSplitAngled reuses HeroSplitContent type

// Features Variants
export type FeaturesGridContent = {
  heading: string;
  subheading?: string;
  items: Array<{ title: string; description: string; icon: string }>;
};

export type FeaturesBentoContent = {
  heading: string;
  items: Array<{ title: string; description: string; image?: ImageConfig; span?: "1" | "2" }>;
};

export type FeaturesListContent = {
  heading: string;
  items: Array<{ title: string; description: string }>;
};

// Reviews Variants
export type ReviewsCarouselContent = {
  heading: string;
  source: "google" | "manual";
  placeId?: string; // For Google reviews
  manualReviews?: Array<{ name: string; rating: number; text: string; date?: string }>;
};

export type ReviewsGridContent = {
  heading: string;
  reviews: Array<{ name: string; rating: number; text: string; image?: ImageConfig }>;
};

export type ReviewsStatsContent = {
  stats: Array<{ value: string; label: string }>;
};

// CTA Variants
export type CtaSimpleContent = {
  heading: string;
  subheading?: string;
  cta: { label: string; href: string };
};

export type CtaUrgentContent = {
  heading: string;
  subheading: string;
  cta: { label: string; href: string };
  phone?: string;
};

// Gallery Variants
export type GalleryGridContent = {
  heading: string;
  images: ImageConfig[];
};

export type GalleryMasonryContent = {
  heading: string;
  images: ImageConfig[];
};

// Contact Variants
export type ContactSplitContent = {
  heading: string;
  subheading?: string;
  showMap: boolean;
  showPhone: boolean;
  showEmail: boolean;
  showAddress: boolean;
};

export type ContactSimpleContent = {
  heading: string;
};

// Team Variants
export type TeamGridContent = {
  heading: string;
  members: Array<{
    name: string;
    role: string;
    image: ImageConfig;
    bio?: string;
    social?: Record<string, string>;
  }>;
};

// FAQ Variants
export type FaqAccordionContent = {
  heading: string;
  items: Array<{ question: string; answer: string }>;
};

// Before/After Variants (Essential for trades)
export type BeforeAfterGridContent = {
  heading: string;
  subheading?: string;
  items: Array<{
    before: ImageConfig;
    after: ImageConfig;
    caption?: string;
  }>;
};

export type BeforeAfterSliderContent = {
  heading: string;
  subheading?: string;
  items: Array<{
    before: ImageConfig;
    after: ImageConfig;
    caption?: string;
  }>;
};

// Credentials Variants (Trust signals for trades)
export type CredentialsBadgesContent = {
  heading: string;
  subheading?: string;
  items: Array<{
    title: string;
    description?: string;
    image?: ImageConfig;
    icon?: string;
  }>;
};

// Service Areas Variants (Local SEO)
export type ServiceAreasListContent = {
  heading: string;
  subheading?: string;
  areas: string[]; // "Austin", "Round Rock", "Cedar Park"
  showMap?: boolean;
};

// Process/Timeline Variants ("How it works")
export type ProcessStepsContent = {
  heading: string;
  subheading?: string;
  steps: Array<{
    step: number;
    title: string;
    description: string;
    icon?: string;
  }>;
};

export type ProcessTimelineContent = {
  heading: string;
  subheading?: string;
  steps: Array<{
    title: string;
    description: string;
    duration?: string; // "Day 1", "Week 2", etc.
  }>;
};

// ============================================
// SECTION CONFIG (Discriminated Union by type + variant)
// ============================================
export type SectionConfig =
  // Hero variants
  | { id: string; type: "hero"; variant: "split-trust"; content: HeroSplitContent }
  | { id: string; type: "hero"; variant: "split-image-right"; content: HeroSplitContent }
  | { id: string; type: "hero"; variant: "split-angled"; content: HeroSplitContent }
  | { id: string; type: "hero"; variant: "simple-page-header"; content: HeroSimpleContent }
  | { id: string; type: "hero"; variant: "centered"; content: HeroCenteredContent }
  | { id: string; type: "hero"; variant: "video"; content: HeroVideoContent }
  | { id: string; type: "hero"; variant: "with-stats"; content: HeroWithStatsContent }
  // Features variants
  | { id: string; type: "features"; variant: "grid-icons"; content: FeaturesGridContent }
  | { id: string; type: "features"; variant: "bento"; content: FeaturesBentoContent }
  | { id: string; type: "features"; variant: "list"; content: FeaturesListContent }
  // Reviews variants
  | { id: string; type: "reviews"; variant: "carousel"; content: ReviewsCarouselContent }
  | { id: string; type: "reviews"; variant: "grid"; content: ReviewsGridContent }
  | { id: string; type: "reviews"; variant: "stats-bar"; content: ReviewsStatsContent }
  // CTA variants
  | { id: string; type: "cta"; variant: "simple"; content: CtaSimpleContent }
  | { id: string; type: "cta"; variant: "urgent"; content: CtaUrgentContent }
  // Gallery variants
  | { id: string; type: "gallery"; variant: "grid"; content: GalleryGridContent }
  | { id: string; type: "gallery"; variant: "masonry"; content: GalleryMasonryContent }
  // Contact variants
  | { id: string; type: "contact"; variant: "split-map"; content: ContactSplitContent }
  | { id: string; type: "contact"; variant: "simple"; content: ContactSimpleContent }
  // Team variants
  | { id: string; type: "team"; variant: "grid-cards"; content: TeamGridContent }
  // FAQ variants
  | { id: string; type: "faq"; variant: "accordion"; content: FaqAccordionContent }
  // Before/After variants (trades)
  | { id: string; type: "before-after"; variant: "grid"; content: BeforeAfterGridContent }
  | { id: string; type: "before-after"; variant: "slider"; content: BeforeAfterSliderContent }
  // Credentials variants (trust signals)
  | { id: string; type: "credentials"; variant: "badges"; content: CredentialsBadgesContent }
  // Service Areas variants (local SEO)
  | { id: string; type: "service-areas"; variant: "list"; content: ServiceAreasListContent }
  // Process variants (how it works)
  | { id: string; type: "process"; variant: "steps"; content: ProcessStepsContent }
  | { id: string; type: "process"; variant: "timeline"; content: ProcessTimelineContent };

// ============================================
// PAGE CONFIG
// ============================================
export interface PageConfig {
  title: string;          // Meta Title (SEO)
  description: string;    // Meta Description (SEO)
  sections: SectionConfig[]; // The Playlist
}

// ============================================
// STRUCTURED ADDRESS (For JSON-LD Local SEO)
// ============================================
export interface AddressConfig {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  googleMapsLink?: string;
}

export interface GeoConfig {
  lat: number;
  lng: number;
}

export interface OpeningHoursConfig {
  days: string[];
  open: string;
  close: string;
}

// ============================================
// SITE CONFIG (PUBLIC - safe to import anywhere)
// ============================================
export interface SiteConfig {
  identity: {
    name: string;
    logo?: ImageConfig; // Optional logo image, falls back to text name
    domain: string;
    phone: string;
    email: string;
    address: AddressConfig;
    geo?: GeoConfig;
    openingHours?: OpeningHoursConfig[];
    priceRange?: string; // e.g., "$$" for JSON-LD
  };
  design: {
    archetype: ThemeArchetype;
    tokens: {
      primary: string;    // Hex color
      secondary: string;  // Hex color
    };
  };
  header: {
    variant: "simple" | "split" | "centered";
    links: Array<{ label: string; href: string }>;
    cta?: { label: string; href: string };
  };
  footer: {
    variant: "simple" | "mega";
    social: Record<string, string>;
  };
  pages: Record<string, PageConfig>; // The Routing Dictionary
  waas: {
    projectId: string; // Public project identifier for WaaS backend
  };
  seo: {
    titleTemplate?: string; // e.g., "%s | Apex Legal"
    defaultOgImage?: string;
  };
}

// ============================================
// ZOD SCHEMAS (For build-time validation)
// ============================================
export const ImageConfigSchema = z.object({
  src: z.string().min(1),
  alt: z.string().min(1),
  width: z.number().optional(),
  height: z.number().optional(),
});

export const AddressSchema = z.object({
  street: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  zip: z.string().min(1),
  country: z.string().min(1),
  googleMapsLink: z.string().url().optional(),
});

export const PageConfigSchema = z.object({
  title: z.string().min(1, "Page title is required"),
  description: z.string().min(1, "Page description is required"),
  sections: z.array(z.object({
    id: z.string().min(1),
    type: z.string().min(1),
    variant: z.string().min(1),
    content: z.record(z.any()), // Content validated per-variant in registry
  })).min(1, "Page must have at least one section"),
});

export const SiteConfigSchema = z.object({
  identity: z.object({
    name: z.string().min(1),
    logo: ImageConfigSchema.optional(),
    domain: z.string().min(1),
    phone: z.string().min(1),
    email: z.string().email(),
    address: AddressSchema,
    geo: z.object({ lat: z.number(), lng: z.number() }).optional(),
    openingHours: z.array(z.object({
      days: z.array(z.string()),
      open: z.string(),
      close: z.string(),
    })).optional(),
    priceRange: z.string().optional(),
  }),
  design: z.object({
    archetype: z.enum(["trustworthy-trade", "modern-minimal", "warm-organic", "bold-impact"]),
    tokens: z.object({
      primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be valid hex color"),
      secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be valid hex color"),
    }),
  }),
  header: z.object({
    variant: z.enum(["simple", "split", "centered"]),
    links: z.array(z.object({ label: z.string(), href: z.string() })),
    cta: z.object({ label: z.string(), href: z.string() }).optional(),
  }),
  footer: z.object({
    variant: z.enum(["simple", "mega"]),
    social: z.record(z.string()),
  }),
  pages: z.record(z.string(), PageConfigSchema).refine(
    (pages) => "home" in pages,
    { message: "Config must include a 'home' page" }
  ),
  waas: z.object({
    projectId: z.string().min(1),
  }),
  seo: z.object({
    titleTemplate: z.string().optional(),
    defaultOgImage: z.string().optional(),
  }).optional(),
});
```

### 2. Server-Only Secrets (`lib/secrets.ts`)

```typescript
// ⚠️ NEVER import this file in client components or shared config
// This file should ONLY be imported in:
// - Server Actions (actions/*.ts)
// - API Routes (if any)
// - Server Components that don't pass data to client

export const secrets = {
  turnstileSecret: process.env.TURNSTILE_SECRET_KEY!,
  googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY,
} as const;

// Build-time check
if (typeof window !== "undefined") {
  throw new Error("lib/secrets.ts was imported in client code!");
}
```

### 3. Public Site Config (`config/site.ts`)

```typescript
import { SiteConfig } from "@/types/config";

export const siteConfig: SiteConfig = {
  identity: {
    name: "Apex Legal Group",
    domain: "apexlegal.com",
    phone: "(312) 555-0199",
    email: "help@apexlegal.com",
    address: {
      street: "123 Wacker Dr",
      city: "Chicago",
      state: "IL",
      zip: "60601",
      country: "US",
      googleMapsLink: "https://maps.google.com/?q=...",
    },
    geo: {
      lat: 41.8867,
      lng: -87.6353,
    },
    openingHours: [
      { days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], open: "09:00", close: "17:00" },
    ],
    priceRange: "$$",
  },
  
  design: {
    archetype: "modern-minimal",
    tokens: {
      primary: "#1e293b",
      secondary: "#c2410c",
    },
  },

  header: {
    variant: "split",
    links: [
      { label: "Home", href: "/" },
      { label: "About", href: "/about" },
      { label: "Practice Areas", href: "/practice-areas" },
      { label: "Attorneys", href: "/attorneys" },
      { label: "Results", href: "/results" },
      { label: "FAQ", href: "/faq" },
    ],
    cta: { label: "Free Consultation", href: "/contact" },
  },

  // 7-Page Site Definition
  pages: {
    "home": {
      title: "Chicago's Top Personal Injury Lawyers",
      description: "Recovering millions for our clients. Free consultations available.",
      sections: [
        { 
          id: "hero", 
          type: "hero", 
          variant: "split-trust", 
          content: {
            title: "Fighting For Justice in Chicago",
            subtitle: "Over $50 million recovered for our clients.",
            cta: { label: "Free Case Review", href: "/contact" },
            image: { src: "/images/hero.webp", alt: "Apex Legal team" },
            trustBadges: [
              { text: "500+ Cases Won", icon: "Trophy" },
              { text: "No Fee Unless We Win", icon: "Shield" },
            ],
          },
        },
        { 
          id: "stats", 
          type: "reviews", 
          variant: "stats-bar", 
          content: {
            stats: [
              { value: "$50M+", label: "Recovered" },
              { value: "500+", label: "Cases Won" },
              { value: "25+", label: "Years Experience" },
            ],
          },
        },
        { 
          id: "services", 
          type: "features", 
          variant: "grid-icons", 
          content: {
            heading: "Practice Areas",
            items: [
              { title: "Personal Injury", description: "Car accidents, slip & fall, workplace injuries.", icon: "Scale" },
              { title: "Medical Malpractice", description: "Hospital negligence, misdiagnosis.", icon: "Stethoscope" },
              { title: "Workers Comp", description: "Get the benefits you deserve.", icon: "HardHat" },
            ],
          },
        },
        { 
          id: "cta", 
          type: "cta", 
          variant: "urgent", 
          content: {
            heading: "Injured? Get Help Now.",
            subheading: "Free consultation. No fee unless we win.",
            cta: { label: "Call Now", href: "/contact" },
            phone: "(312) 555-0199",
          },
        },
      ],
    },
    "about": {
      title: "About Our Firm",
      description: "Learn about Apex Legal Group and our commitment to justice.",
      sections: [
        { id: "hero", type: "hero", variant: "simple-page-header", content: { title: "About Us" } },
        // ... additional sections
      ],
    },
    "practice-areas": {
      title: "Practice Areas",
      description: "Explore our legal practice areas.",
      sections: [
        { id: "hero", type: "hero", variant: "simple-page-header", content: { title: "Practice Areas" } },
        // ... additional sections
      ],
    },
    "attorneys": {
      title: "Our Attorneys",
      description: "Meet the lawyers fighting for you.",
      sections: [
        { id: "hero", type: "hero", variant: "simple-page-header", content: { title: "Our Team" } },
        { 
          id: "team", 
          type: "team", 
          variant: "grid-cards", 
          content: {
            heading: "Meet Our Attorneys",
            members: [
              { 
                name: "Sarah Mitchell", 
                role: "Senior Partner", 
                image: { src: "/images/team/sarah.webp", alt: "Sarah Mitchell" },
                bio: "20+ years of personal injury experience.",
              },
            ],
          },
        },
        { id: "cta", type: "cta", variant: "simple", content: { heading: "Ready to discuss your case?", cta: { label: "Contact Us", href: "/contact" } } },
      ],
    },
    "results": {
      title: "Case Results",
      description: "See our track record of success.",
      sections: [
        { id: "hero", type: "hero", variant: "simple-page-header", content: { title: "Our Results" } },
        // ... case results sections
      ],
    },
    "faq": {
      title: "Frequently Asked Questions",
      description: "Answers to common legal questions.",
      sections: [
        { id: "hero", type: "hero", variant: "simple-page-header", content: { title: "FAQ" } },
        { 
          id: "faq", 
          type: "faq", 
          variant: "accordion", 
          content: {
            heading: "Common Questions",
            items: [
              { question: "How much does a consultation cost?", answer: "Consultations are always free." },
              { question: "Do I have to pay if we lose?", answer: "No. We work on contingency." },
            ],
          },
        },
      ],
    },
    "contact": {
      title: "Contact Us",
      description: "Get a free case evaluation today.",
      sections: [
        { id: "hero", type: "hero", variant: "simple-page-header", content: { title: "Contact Us" } },
        { 
          id: "contact", 
          type: "contact", 
          variant: "split-map", 
          content: {
            heading: "Get Your Free Consultation",
            subheading: "We'll review your case within 24 hours.",
            showMap: true,
            showPhone: true,
            showEmail: true,
            showAddress: true,
          },
        },
      ],
    },
  },
  
  footer: {
    variant: "mega",
    social: { 
      facebook: "https://facebook.com/apexlegal", 
      linkedin: "https://linkedin.com/company/apexlegal",
    },
  },

  waas: {
    projectId: "proj_apex123",
  },

  seo: {
    titleTemplate: "%s | Apex Legal Group",
    defaultOgImage: "/images/og-default.jpg",
  },
};
```

---

## IV. Build-Time Validation

### Validation Script (`scripts/validate-config.ts`)

```typescript
import { siteConfig } from "../config/site";
import { SiteConfigSchema } from "../types/config";
import { ComponentRegistry } from "../config/registry";

console.log("🔍 Validating site config...\n");

// 1. Validate against Zod schema
const result = SiteConfigSchema.safeParse(siteConfig);

if (!result.success) {
  console.error("❌ Config validation failed:\n");
  console.error(result.error.format());
  process.exit(1);
}

// 2. Validate all header/footer links exist in pages (or are external)
const pageKeys = Object.keys(siteConfig.pages);
const internalLinks = siteConfig.header.links.filter(l => l.href.startsWith("/"));

for (const link of internalLinks) {
  const path = link.href === "/" ? "home" : link.href.slice(1);
  if (!pageKeys.includes(path)) {
    console.error(`❌ Header link "${link.label}" points to "${link.href}" but no page exists for "${path}"`);
    process.exit(1);
  }
}

// 3. Validate all section variants exist in registry
for (const [pageKey, page] of Object.entries(siteConfig.pages)) {
  for (const section of page.sections) {
    const registry = ComponentRegistry[section.type as keyof typeof ComponentRegistry];
    if (!registry) {
      console.error(`❌ Page "${pageKey}" uses unknown section type: "${section.type}"`);
      process.exit(1);
    }
    const component = registry[section.variant as keyof typeof registry];
    if (!component) {
      console.error(`❌ Page "${pageKey}" uses unknown variant: "${section.type}/${section.variant}"`);
      console.error(`   Available variants: ${Object.keys(registry).join(", ")}`);
      process.exit(1);
    }
  }
}

console.log("✅ Config is valid!");
console.log(`   ${pageKeys.length} pages defined`);
console.log(`   ${siteConfig.header.links.length} nav links`);
console.log(`   Archetype: ${siteConfig.design.archetype}`);
```

### Package.json Scripts

```json
{
  "scripts": {
    "validate": "tsx scripts/validate-config.ts",
    "build": "bun run validate && next build",
    "dev": "next dev"
  }
}
```

---

## V. Routing & Rendering

### Dynamic Page Router (`app/[[...slug]]/page.tsx`)

```typescript
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { SectionRenderer } from "@/components/renderer/SectionRenderer";

interface PageProps {
  params: Promise<{ slug?: string[] }>;
}

// 1. Helper to resolve URL to Config Key
function getPageConfig(slug?: string[]) {
  if (!slug || slug.length === 0) return siteConfig.pages["home"];
  const path = slug.join("/");
  return siteConfig.pages[path];
}

// 2. SEO Metadata Generation
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getPageConfig(slug);
  if (!page) return {};
  
  const title = siteConfig.seo?.titleTemplate 
    ? siteConfig.seo.titleTemplate.replace("%s", page.title)
    : page.title;

  return {
    title,
    description: page.description,
    openGraph: {
      title,
      description: page.description,
      images: siteConfig.seo?.defaultOgImage ? [siteConfig.seo.defaultOgImage] : [],
    },
  };
}

// 3. Static Path Generation (Crucial for SSG)
export function generateStaticParams() {
  return Object.keys(siteConfig.pages).map((path) => {
    if (path === "home") return { slug: [] };
    // Handle nested routes: "services/roofing" -> ["services", "roofing"]
    return { slug: path.split("/") };
  });
}

// 4. The Page Renderer
export default async function DynamicPage({ params }: PageProps) {
  const { slug } = await params;
  const page = getPageConfig(slug);
  if (!page) return notFound();

  return (
    <main className="flex flex-col w-full">
      {page.sections.map((section, index) => (
        <SectionRenderer 
          key={`${section.id}-${index}`} 
          section={section} 
        />
      ))}
    </main>
  );
}
```

### Section Renderer with Error Boundaries (`components/renderer/SectionRenderer.tsx`)

```typescript
import { ComponentRegistry } from "@/config/registry";
import { SectionConfig } from "@/types/config";

interface SectionRendererProps {
  section: SectionConfig;
}

export function SectionRenderer({ section }: SectionRendererProps) {
  const registry = ComponentRegistry[section.type as keyof typeof ComponentRegistry];
  const Component = registry?.[section.variant as keyof typeof registry];

  if (!Component) {
    // Development: Show visible error
    if (process.env.NODE_ENV === "development") {
      return (
        <div className="p-6 m-4 bg-red-50 border-2 border-red-300 text-red-700 rounded-lg">
          <strong className="block mb-2">⚠️ Missing Component</strong>
          <code className="text-sm">
            Type: {section.type} | Variant: {section.variant}
          </code>
          <details className="mt-2">
            <summary className="cursor-pointer text-sm">View Content</summary>
            <pre className="mt-2 text-xs overflow-auto">
              {JSON.stringify(section.content, null, 2)}
            </pre>
          </details>
        </div>
      );
    }
    // Production: Fail silently, log error
    console.error(`Missing section component: ${section.type}/${section.variant}`);
    return null;
  }

  return (
    <section id={section.id} className="w-full">
      <Component {...section.content} />
    </section>
  );
}
```

---

## VI. SEO & Local Business Schema

### JSON-LD Component (`components/utils/LocalBusinessSchema.tsx`)

```typescript
import { siteConfig } from "@/config/site";

export function LocalBusinessSchema() {
  const { identity } = siteConfig;
  
  const schema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": identity.name,
    "telephone": identity.phone,
    "email": identity.email,
    "url": `https://${identity.domain}`,
    "priceRange": identity.priceRange,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": identity.address.street,
      "addressLocality": identity.address.city,
      "addressRegion": identity.address.state,
      "postalCode": identity.address.zip,
      "addressCountry": identity.address.country,
    },
    ...(identity.geo && {
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": identity.geo.lat,
        "longitude": identity.geo.lng,
      },
    }),
    ...(identity.openingHours && {
      "openingHoursSpecification": identity.openingHours.map((h) => ({
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": h.days,
        "opens": h.open,
        "closes": h.close,
      })),
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
```

### Layout Integration (`app/layout.tsx`)

```typescript
import { LocalBusinessSchema } from "@/components/utils/LocalBusinessSchema";
import { AnalyticsPixel } from "@/components/utils/AnalyticsPixel";
import { Header } from "@/components/agency/Header";
import { Footer } from "@/components/agency/Footer";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <LocalBusinessSchema />
      </head>
      <body>
        <Header />
        {children}
        <Footer />
        <AnalyticsPixel />
      </body>
    </html>
  );
}
```

---

## VII. WaaS Backend Integration & Turnstile Protection

### Key Design Decision: No Per-Client Secrets

To simplify operations and reduce env var management across client sites, we use:
- **Public `projectId`** for identification (not authentication)
- **Rate limiting by IP** on the backend to prevent spam (see `agencyUpdate.md`)
- **Turnstile validation** on the client site before POSTing

This means client sites only need Turnstile env vars, not WaaS secrets.

### Cloudflare Turnstile Overview

Turnstile is Cloudflare's smart CAPTCHA alternative that protects forms without showing visitors a CAPTCHA. It uses non-interactive JavaScript challenges and machine learning to detect bots.

**Why Turnstile:**
- No user friction (invisible or minimal challenge)
- Privacy-focused (no tracking)
- Free tier available
- Works without sending traffic through Cloudflare CDN

### Required Package

```bash
bun add @marsidev/react-turnstile
```

**Package features:**
- TypeScript support with `TurnstileServerValidationResponse` type
- SSR-ready for Next.js
- Automatic script injection
- Ref support for programmatic control

### Testing Keys (Development)

Use these dummy keys during development:

| Type | Key | Description |
|------|-----|-------------|
| **Site Key (visible, passes)** | `1x00000000000000000000AA` | Always passes |
| **Site Key (visible, blocks)** | `2x00000000000000000000AB` | Always blocks |
| **Site Key (invisible, passes)** | `1x00000000000000000000BB` | Invisible, always passes |
| **Site Key (forces challenge)** | `3x00000000000000000000FF` | Forces interactive challenge |
| **Secret Key (passes)** | `1x0000000000000000000000000000000AA` | Validation always passes |
| **Secret Key (fails)** | `2x0000000000000000000000000000000AA` | Validation always fails |
| **Secret Key (token spent)** | `3x0000000000000000000000000000000AA` | Returns "token spent" error |

**Critical notes:**
- Dummy sitekeys produce `XXXX.DUMMY.TOKEN.XXXX` response token
- Production secret keys REJECT dummy tokens
- Dummy secret keys only ACCEPT the dummy token
- Always use matching pairs (dummy site + dummy secret, or prod + prod)

### Turnstile Siteverify API Reference

**Endpoint:** `https://challenges.cloudflare.com/turnstile/v0/siteverify`  
**Method:** POST  
**Content-Type:** `application/x-www-form-urlencoded` or `application/json`

**Request Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `secret` | Yes | Widget's secret key from Cloudflare dashboard |
| `response` | Yes | Token from client-side widget (`cf-turnstile-response`) |
| `remoteip` | No | Visitor's IP address |
| `idempotency_key` | No | UUID for retry protection |

**Response Shape:**
```typescript
interface TurnstileServerValidationResponse {
  success: boolean;           // True if token is valid
  challenge_ts?: string;      // Timestamp of challenge
  hostname?: string;          // Domain where challenge was solved
  'error-codes'?: string[];   // Error codes if success is false
  action?: string;            // Action label if configured
  cdata?: string;             // Custom data if provided
}
```

**Error Codes:**
| Code | Description |
|------|-------------|
| `missing-input-secret` | Secret key not provided |
| `invalid-input-secret` | Secret key is invalid |
| `missing-input-response` | Token not provided |
| `invalid-input-response` | Token is invalid or expired |
| `invalid-widget-id` | Widget ID doesn't match sitekey |
| `invalid-parsed-secret` | Secret key couldn't be parsed |
| `bad-request` | Malformed request |
| `timeout-or-duplicate` | Token expired or already validated |
| `internal-error` | Internal Cloudflare error |

**Important:** The Siteverify API will only validate a token ONCE. Subsequent attempts return `timeout-or-duplicate`.

### Analytics Pixel (`components/utils/AnalyticsPixel.tsx`)

```typescript
'use client';
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { siteConfig } from "@/config/site";

export function AnalyticsPixel() {
  const pathname = usePathname();

  useEffect(() => {
    const payload = {
      projectId: siteConfig.waas.projectId,
      path: pathname,
      referrer: document.referrer || "direct",
    };

    // Fire and forget - analytics failures shouldn't break the site
    fetch(`${process.env.NEXT_PUBLIC_WAAS_API_URL}/api/analytics/pixel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
```

### Contact Form Server Action (`actions/contact.ts`)

```typescript
'use server';

import { z } from "zod";
import type { TurnstileServerValidationResponse } from '@marsidev/react-turnstile';
import { siteConfig } from "@/config/site";
import { secrets } from "@/lib/secrets";

const ContactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  message: z.string().min(1, "Message is required"),
});

// Cloudflare Turnstile Validation
async function validateTurnstile(token: string): Promise<{
  success: boolean;
  error?: string;
}> {
  // Input validation
  if (!token || typeof token !== "string") {
    return { success: false, error: "Missing verification token" };
  }

  if (token.length > 2048) {
    return { success: false, error: "Invalid token format" };
  }

  try {
    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: `secret=${encodeURIComponent(secrets.turnstileSecret)}&response=${encodeURIComponent(token)}`,
      }
    );

    const data: TurnstileServerValidationResponse = await response.json();

    if (!data.success) {
      console.error('Turnstile validation failed:', data['error-codes']);
      return { 
        success: false, 
        error: "Security check failed. Please try again." 
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Turnstile validation error:', error);
    return { success: false, error: "Verification service unavailable" };
  }
}

// Form Handler
export async function submitContactForm(
  _prevState: { success: boolean; message: string } | null,
  formData: FormData
) {
  // 1. Validate Turnstile token
  const token = formData.get("cf-turnstile-response") as string;
  const turnstileResult = await validateTurnstile(token);
  
  if (!turnstileResult.success) {
    return { success: false, message: turnstileResult.error || "Verification failed" };
  }

  // 2. Validate form data
  const parsed = ContactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return { success: false, message: parsed.error.errors[0].message };
  }

  // 3. Send to WaaS Backend (no secret needed - backend validates projectId + rate limits)
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_WAAS_API_URL}/api/ingest-lead`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: siteConfig.waas.projectId,
        source: "contact-form",
        data: parsed.data,
      }),
    });

    if (!res.ok) throw new Error("Backend error");
    return { success: true, message: "Message sent! We'll be in touch soon." };
  } catch {
    return { success: false, message: "System error. Please call us directly." };
  }
}
```

### Contact Form Integration (Existing Components)

Contact form components already exist and follow the template's dynamic rendering pattern:
- `components/agency/contact/ContactSplitMap.tsx` — Full contact page with form + map
- `components/agency/contact/ContactSimple.tsx` — Minimal centered form

Both contain an internal `ContactForm` function that needs to be updated with Turnstile integration.

**Add to imports at top of file:**
```typescript
import { useActionState, useRef, useEffect } from 'react';
import { Turnstile, TurnstileInstance } from '@marsidev/react-turnstile';
import { submitContactForm } from '@/actions/contact';
```

**Replace the internal ContactForm function:**
```typescript
function ContactForm() {
  const tokens = useArchetype();
  const [state, formAction, isPending] = useActionState(submitContactForm, null);
  const turnstileRef = useRef<TurnstileInstance>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Reset Turnstile after submission (token is single-use)
  useEffect(() => {
    if (state?.success || state?.message) {
      turnstileRef.current?.reset();
    }
  }, [state]);

  // Reset form on success
  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
    }
  }, [state?.success]);

  return (
    <form ref={formRef} action={formAction} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Name" name="name" type="text" placeholder="Your name" required disabled={isPending} />
        <Input label="Email" name="email" type="email" placeholder="your@email.com" required disabled={isPending} />
      </div>

      <Input label="Phone" name="phone" type="tel" placeholder="(555) 123-4567" disabled={isPending} />

      <div className="w-full">
        <label htmlFor="message" className={cn("block text-sm font-medium mb-1.5 text-gray-700", tokens.bodyFont)}>
          Message <span className="text-red-500">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          placeholder="How can we help you?"
          required
          disabled={isPending}
          className={cn(
            "block w-full px-4 py-2.5 text-gray-900 placeholder:text-gray-400",
            "transition-colors duration-200 border-gray-300",
            "focus:border-primary focus:ring-primary focus:outline-none focus:ring-2",
            "disabled:bg-gray-50 disabled:cursor-not-allowed",
            tokens.radius, tokens.borderWidth
          )}
        />
      </div>

      {/* Turnstile Widget */}
      <Turnstile
        ref={turnstileRef}
        siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
        options={{ theme: 'light', size: 'normal' }}
      />

      <Button type="submit" variant="primary" size="lg" fullWidth disabled={isPending}>
        {isPending ? 'Sending...' : 'Send Message'}
      </Button>

      {/* Status message */}
      {state?.message && (
        <p className={cn(
          "text-sm text-center p-3 rounded",
          state.success ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200",
          tokens.radius
        )}>
          {state.message}
        </p>
      )}
    </form>
  );
}
```

### Turnstile Widget Options

| Option | Values | Description |
|--------|--------|-------------|
| `theme` | `'light'` \| `'dark'` \| `'auto'` | Widget color scheme |
| `size` | `'normal'` \| `'compact'` \| `'invisible'` | Widget size |
| `appearance` | `'always'` \| `'execute'` \| `'interaction-only'` | When to show widget |
| `execution` | `'render'` \| `'execute'` | When to start challenge |
| `action` | `string` | Custom action label for analytics |
| `cData` | `string` | Custom data returned in validation |
| `retry` | `'auto'` \| `'never'` | Auto-retry on failure |
| `retryInterval` | `number` | Milliseconds between retries |
| `language` | `string` | Widget language (e.g., 'es', 'fr') |

### Production Setup (Cloudflare Dashboard)

1. Navigate to Cloudflare Dashboard → Turnstile
2. Click "Add Widget"
3. Enter widget name (e.g., "Apex Legal Contact Form")
4. Add allowed domains: `apexlegal.com` (add `localhost` only for dev)
5. Choose widget mode:
   - **Managed** (recommended): Cloudflare decides when to challenge
   - **Non-interactive**: Never shows visible challenge
   - **Invisible**: Hidden until needed
6. Copy **Site Key** → `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
7. Copy **Secret Key** → `TURNSTILE_SECRET_KEY`

### Environment Variables

```env
# Public (exposed to browser - needed for widget)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x...

# Server-only (never exposed - for siteverify API)
TURNSTILE_SECRET_KEY=0x...
```

**Development `.env.local`:**
```env
NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

---

## VIII. Google Reviews Widget

Google Reviews are fetched via a Server Action to comply with Google Places API Terms of Service (client-side fetch is prohibited). This keeps the API key secure on the server.

### Places API (New)

**Endpoint:** `https://places.googleapis.com/v1/places/{placeId}`

**Constraints:**
- Returns a **maximum of 5 reviews** per request
- Reviews are sorted by relevance by default
- API key must remain server-side (Google ToS requirement)

### Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `X-Goog-Api-Key` | Yes | Your API key |
| `X-Goog-FieldMask` | Yes | Comma-separated fields to return (controls cost) |

**Field Mask for Reviews:**
```
reviews,rating,userRatingCount
```

### Review Object Structure

```typescript
interface GoogleReview {
  rating: number;                        // 1-5 star rating
  text: {
    text: string;                        // Review content
    languageCode: string;                // "en", "es", etc.
  };
  authorAttribution: {
    displayName: string;                 // "John Smith"
    uri: string;                         // Google Maps profile URL
    photoUri: string;                    // Author's photo URL
  };
  publishTime: string;                   // ISO 8601 timestamp
  relativePublishTimeDescription: string; // "2 weeks ago"
}
```

### Response Example

```json
{
  "rating": 4.5,
  "userRatingCount": 1247,
  "reviews": [
    {
      "rating": 5,
      "text": {
        "text": "Excellent service! The team was professional.",
        "languageCode": "en"
      },
      "authorAttribution": {
        "displayName": "John Smith",
        "uri": "https://www.google.com/maps/contrib/117048986773337874917/reviews",
        "photoUri": "https://lh3.googleusercontent.com/a-/AOh14G..."
      },
      "publishTime": "2023-10-27T10:00:00Z",
      "relativePublishTimeDescription": "2 weeks ago"
    }
  ]
}
```

### Server Action Implementation (`actions/reviews.ts`)

```typescript
'use server';

import { unstable_cache } from 'next/cache';
import { secrets } from '@/lib/secrets';

export interface GoogleReview {
  rating: number;
  text: { text: string; languageCode: string };
  authorAttribution: { displayName: string; uri: string; photoUri: string };
  publishTime: string;
  relativePublishTimeDescription: string;
}

interface PlaceDetailsResponse {
  rating?: number;
  userRatingCount?: number;
  reviews?: GoogleReview[];
  error?: { code: number; message: string; status: string };
}

const REVIEWS_FIELD_MASK = 'reviews,rating,userRatingCount';

// Factory function with placeId in cache key (explicit and self-documenting)
const getCachedReviews = (placeId: string) =>
  unstable_cache(
    async (): Promise<GoogleReview[]> => {
      const apiKey = secrets.googlePlacesApiKey;
      
      if (!apiKey) {
        console.error('[Reviews] GOOGLE_PLACES_API_KEY not configured');
        return [];
      }

      if (!placeId || !placeId.startsWith('ChIJ')) {
        console.error('[Reviews] Invalid Place ID format:', placeId);
        return [];
      }

      try {
        const response = await fetch(
          `https://places.googleapis.com/v1/places/${placeId}`,
          {
            method: 'GET',
            headers: {
              'X-Goog-Api-Key': apiKey,
              'X-Goog-FieldMask': REVIEWS_FIELD_MASK,
            },
            next: { revalidate: 3600 },
          }
        );

        if (!response.ok) {
          console.error('[Reviews] HTTP error:', response.status);
          return [];
        }

        const data: PlaceDetailsResponse = await response.json();

        if (data.error) {
          console.error('[Reviews] API error:', data.error.message);
          return [];
        }

        return data.reviews ?? [];
      } catch (error) {
        console.error('[Reviews] Failed to fetch:', error);
        return [];
      }
    },
    ['google-reviews', placeId],
    { revalidate: 3600, tags: ['reviews'] }
  );

export async function fetchGoogleReviews(placeId: string): Promise<GoogleReview[]> {
  return getCachedReviews(placeId)();
}
```

### Reviews Component Integration

The `ReviewsCarousel` component fetches reviews from Google Places API and displays them with:
- **Reviewer Photos:** Uses `authorAttribution.photoUri` from the API response
- **Google Branding:** Shows the official Google "G" logo badge on each Google review
- **Graceful Fallback:** Falls back to initials if no photo, and to manual reviews if API fails

```typescript
// DisplayReview interface maps Google API response to unified format
interface DisplayReview {
  author_name: string;
  author_url?: string;
  photo_url?: string;  // From authorAttribution.photoUri
  rating: number;
  text: string;
  date?: string;
}

// Google reviews are converted to DisplayReview format:
const googleDisplayReviews: DisplayReview[] = googleReviews.map((r) => ({
  author_name: r.authorAttribution.displayName,
  author_url: r.authorAttribution.uri,
  photo_url: r.authorAttribution.photoUri,  // Reviewer's Google profile photo
  rating: r.rating,
  text: r.text.text,
  date: r.relativePublishTimeDescription,
}));
```

**Avatar Rendering:** Shows Google profile photo with fallback to initials:
```typescript
{review.photo_url ? (
  <Image src={review.photo_url} alt={review.author_name} fill unoptimized />
) : (
  <div className="bg-primary/10 text-primary">{review.author_name.charAt(0)}</div>
)}
```

**Google Badge:** Displays on each Google-sourced review:
```typescript
{review.photo_url && (
  <div className="flex items-center gap-1.5 text-gray-400">
    <GoogleIcon />  {/* Official 4-color Google "G" logo */}
    <span className="text-xs">Google</span>
  </div>
)}
```

### ReviewsStatsBar Design

The `ReviewsStatsBar` uses individual stat cards on a light background (not a solid primary bar):
- **Background:** `bg-muted/50` (subtle, theme-aware)
- **Cards:** White with `tokens.cardRadius`, `tokens.shadow`, `tokens.borderWidth`
- **Stat Values:** `text-primary` (uses CSS variable)
- **Labels:** Gray text with uppercase tracking

This design is more modern and respects the archetype token system.

### Finding a Place ID

1. **Place ID Finder:** https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder

2. **Text Search API:**
   ```bash
   curl -X POST "https://places.googleapis.com/v1/places:searchText" \
     -H "X-Goog-Api-Key: API_KEY" \
     -H "X-Goog-FieldMask: places.id" \
     -d '{"textQuery": "Business Name City"}'
   ```

### Config Example

```typescript
{
  id: "reviews",
  type: "reviews",
  variant: "carousel",
  content: {
    heading: "What Our Clients Say",
    source: "google",
    placeId: "ChIJN1t_tDeuEmsRUsoyG83frY4",
    manualReviews: [
      { name: "John D.", rating: 5, text: "Excellent service!", date: "2 weeks ago" },
    ],
  },
}
```

### Google Cloud Console Setup

1. **Enable API:** Cloud Console → APIs & Services → Enable **"Places API (New)"**
2. **Create API Key:** Credentials → Create Credentials → API Key
3. **Restrict Key:** IP addresses (server IPs) + Places API (New) only
4. **Billing:** $200/month free credit (~$17/1000 review requests)

### Cost Optimization

| Strategy | Impact |
|----------|--------|
| Cache for 1+ hour | Reduces repeated calls |
| Use field masks | Only pay for requested data |
| Manual review fallback | Avoids API calls entirely |

---

## IX. Design Archetypes (`config/theme.ts`)

Archetypes are **purely structural**—they define typography, spacing, and shape. Colors always come from `design.tokens.primary` and `design.tokens.secondary` in the site config. This allows any archetype to work with any brand colors.

```typescript
export const archetypeTokens = {
  "trustworthy-trade": {
    // Typography
    headingFont: "font-playfair",
    bodyFont: "font-inter",
    headingWeight: "font-bold",
    
    // Spacing & Shape
    radius: "rounded-none",
    buttonRadius: "rounded-sm",
    cardRadius: "rounded-sm",
    
    // Borders & Shadows (color-agnostic)
    borderWidth: "border-2",
    shadow: "shadow-md",
    
    // Button Style
    ctaStyle: "uppercase tracking-wide font-semibold",
    
    // Container
    containerWidth: "max-w-6xl",
    sectionPadding: "py-16 md:py-24",
  },
  
  "modern-minimal": {
    headingFont: "font-inter",
    bodyFont: "font-inter",
    headingWeight: "font-medium",
    
    radius: "rounded-2xl",
    buttonRadius: "rounded-full",
    cardRadius: "rounded-xl",
    
    borderWidth: "border",
    shadow: "shadow-sm",
    
    ctaStyle: "font-medium",
    
    containerWidth: "max-w-5xl",
    sectionPadding: "py-20 md:py-32",
  },
  
  "warm-organic": {
    headingFont: "font-cormorant",
    bodyFont: "font-lato",
    headingWeight: "font-semibold",
    
    radius: "rounded-3xl",
    buttonRadius: "rounded-full",
    cardRadius: "rounded-2xl",
    
    borderWidth: "border",
    shadow: "shadow-lg",
    
    ctaStyle: "font-medium tracking-wide",
    
    containerWidth: "max-w-5xl",
    sectionPadding: "py-16 md:py-28",
  },
  
  "bold-impact": {
    headingFont: "font-oswald",
    bodyFont: "font-roboto",
    headingWeight: "font-black",
    
    radius: "rounded-none",
    buttonRadius: "rounded-none",
    cardRadius: "rounded-none",
    
    borderWidth: "border-4",
    shadow: "shadow-none",
    
    ctaStyle: "uppercase tracking-widest font-bold",
    
    containerWidth: "max-w-7xl",
    sectionPadding: "py-12 md:py-20",
  },
} as const;

export type ArchetypeTokens = typeof archetypeTokens[keyof typeof archetypeTokens];
```

---

## X. The Agentic Workflow (Cursor Rules)

### Strategy: Onboarding Doc as Context

The detailed AI agent workflow is maintained in `onboarding.md` rather than in `.cursor/rules`. This allows:

- **Single source of truth** — All onboarding instructions in one place
- **Easy context passing** — Just attach `onboarding.md` when starting a new client
- **Human-readable** — Same doc works for AI agents and human developers

### Cursor Rules (`.cursor/rules`)

The rules file is kept minimal, pointing to the onboarding doc:

```markdown
# Agency Template Rules

You are the Lead Architect for this WaaS (Website as a Service) template.

## Core Mandate

- NEVER modify component code (`/components`) unless explicitly asked to fix a bug
- ALL customization happens in `config/site.ts`
- NEVER put secrets or environment variables in `config/site.ts`

## Onboarding Context

When onboarding a new client, reference `onboarding.md` for the complete workflow including:

- Archetype selection based on industry
- Page structure and section variants
- SEO copywriting guidelines
- Identity configuration for local SEO
- Validation and deployment steps

Pass `onboarding.md` as context when starting a new client setup.
```

### Using This Workflow

1. **Start a new chat** in Cursor
2. **Attach `onboarding.md`** as context
3. **Provide client details** (name, industry, location, services, etc.)
4. **AI generates `config/site.ts`** following the documented workflow

---

## XI. Image Processing

### Simplified Pipeline (Using Next.js Image Optimization)

Next.js automatically optimizes images at request time. No manual processing required!

1. **Receive:** Client sends photos or existing assets
2. **Store:** Save originals to `/public/images/[client-slug]/`
3. **Reference:** Use ImageConfig format:
   ```typescript
   { src: "/images/apex-legal/hero.webp", alt: "Apex Legal office in Chicago" }
   ```
4. **Optimization:** Next.js `<Image>` component handles:
   - Automatic WebP/AVIF conversion
   - Responsive srcset generation
   - Lazy loading
   - Size optimization

### Image Requirements by Section

| Section | Recommended Size | Aspect Ratio |
|---------|-----------------|--------------|
| Hero (split) | 800x600 | 4:3 |
| Hero (full) | 1920x1080 | 16:9 |
| Team photos | 400x400 | 1:1 |
| Gallery | 800x600 | 4:3 |
| Before/After | 800x600 | 4:3 |
| OG Image | 1200x630 | ~1.9:1 |

### Image Workflow (Portal → Template)

For MVP, images are manually transferred from the agency portal to the template:

1. **Client uploads** brand assets via the portal (during AWAITING_ASSETS phase)
2. **Admin downloads** assets from the portal admin panel (brand images, logo)
3. **Admin saves** to `/public/images/[client-slug]/` in the client's repo
4. **Admin commits** and pushes changes
5. **Vercel rebuilds** automatically on push

---

## XII. Domain Management (MVP: Manual)

### Strategy: You Own, You Manage

For MVP, we use the simplest approach: manually purchase domains via registrar.

### Workflow

1. **Client signs up** → Collect domain preference during AWAITING_ASSETS phase
2. **Purchase domain** via Namecheap or Porkbun (~$12/year for .com)
3. **Add to Vercel** → Project Settings → Domains → Add domain
4. **Configure DNS:**
   - If using Vercel DNS: Update nameservers at registrar
   - If using registrar DNS: Add A record pointing to Vercel's IP
5. **Track in admin** → Add domain to `projects.deployment.liveUrl`
6. **Mark checkbox** in admin panel: "Domain purchased ✓" / "DNS configured ✓"

### On Client Cancellation (After 12 months)

Per your Terms of Service:
1. Domain transfers to client if account in good standing
2. Provide auth code/EPP code from registrar
3. Client initiates transfer to their registrar
4. Remove domain from Vercel project

---

## XIII. Multi-Repo Maintenance Strategy

We use a **Git Template + Upstream Remote** strategy that provides:
- ✅ Fast client setup (clone from template)
- ✅ Full client isolation (each client has their own repo)
- ✅ Update capability (`git merge upstream/main`)
- ✅ Client variety (each client frozen at their launch version until you choose to update)

### Repository Structure

```
GitHub Organization
├── agency-template        ← Master template (source of truth)
├── agency-playground      ← Test instance (for experimenting)
├── apex-legal-web         ← Client repo
├── summit-roofing-web     ← Client repo
└── ...
```

### One-Time Setup (Before First Client)

**1. Configure Git Merge Driver:**
```bash
git config --global merge.ours.driver true
```

**2. Create `.gitattributes` in Template Root:**
```gitattributes
# Client-specific files: always keep local version during upstream merges
config/site.ts merge=ours
public/images/** merge=ours
```

**3. Mark as Template Repository:**
On GitHub: **Repository Settings → ☑️ Template repository**

### Phase 1: Upstream Remote Strategy (Current)

Create new clients using GitHub's template feature:

```bash
# 1. Create new repo from template
gh repo create "CLIENT_SLUG-web" --template "your-org/agency-template" --private --clone

# 2. Enter directory
cd CLIENT_SLUG-web

# 3. Add upstream remote (enables future updates)
git remote add upstream git@github.com:your-org/agency-template.git
git remote set-url --push upstream DISABLE

# 4. Create client assets folder
mkdir -p public/images/CLIENT_SLUG

# 5. Open in editor and configure config/site.ts
```

### Pushing Template Updates to Client Sites

When you fix a bug or add a component in `agency-template`:

```bash
cd apex-legal-web

# 1. Fetch latest from template
git fetch upstream

# 2. Merge changes (config/site.ts is protected by merge=ours)
git merge upstream/main --no-edit

# 3. Resolve any conflicts if they arise
# (Conflicts are rare if you only edit config/site.ts in client repos)

# 4. Push to deploy
git push origin main
```

### What Gets Updated vs. Protected

| Updated (from upstream) | Protected (stays local) |
|------------------------|------------------------|
| `/components/*` | `config/site.ts` |
| `/app/*` | `/public/images/*` |
| `/actions/*` | `.env.local` |
| `/lib/*` | |
| `/types/*` | |

### Selective Updates

You don't have to update all clients. Each can stay at their "vintage":

| Client | Template Version | Notes |
|--------|------------------|-------|
| Apex Legal | v1.0 (launch) | Happy, no updates needed |
| Summit Roofing | v1.2 | Updated to get `BeforeAfterSlider` |
| Coastal Plumbing | v1.3 | Latest everything |

### Test/Playground Instance

Create a dedicated sandbox for testing new components:

```bash
# Create playground from template
gh repo create "agency-playground" --template "your-org/agency-template" --private --clone
cd agency-playground
git remote add upstream git@github.com:your-org/agency-template.git
git remote set-url --push upstream DISABLE
mkdir -p public/images/demo
```

Deploy to Vercel at `playground.your-agency.com` for testing before client rollout.

### Phase 2: NPM Package (After 20+ Clients)

Graduate to NPM package when:
- **20+ clients** and `git pull upstream` becomes tedious
- **You hire devs** and want to lock down core code
- **Breaking changes** become frequent and you need semantic versioning

Publish template core as `@your-agency/waas-template`:

```bash
# In client repo
bun add @your-agency/waas-template@latest
```

Benefits:
- One command to update all clients: `bun update`
- Semantic versioning for breaking changes
- Changelog for audit trail

---

## XIV. Operational SLAs (Internal)

### Edit Request Turnaround

| Type | Examples | SLA |
|------|----------|-----|
| **Small** | Text change, image swap, color tweak | 1-3 business days |
| **Medium** | New section, layout change, new team member | 3-5 business days |
| **Large** | New page, major redesign | 5-10 business days |

### Out of Scope (Requires Upsell)

- Pages beyond 7
- Custom functionality (calculators, booking systems)
- E-commerce integration
- Multi-location programmatic pages
- Blog/CMS functionality
- Third-party integrations beyond standard

---

## XV. Client Deployment Runbook

Use this checklist for every new client deployment to ensure consistency and avoid missed steps.

### Pre-Build (During AWAITING_ASSETS Phase)

```markdown
## Client: [CLIENT NAME]
## Project ID: [projects.projectId from agency portal]
## Date Started: YYYY-MM-DD

### 1. Asset Collection
- [ ] Verify payment received (Stripe webhook fired, project status = AWAITING_ASSETS)
- [ ] Client submitted build details form (headline, colors, inspiration)
- [ ] Download logo from portal admin panel
- [ ] Download brand images from portal admin panel
- [ ] Collect any additional photos from client (via email/Dropbox)
- [ ] Confirm domain preference and check availability

### 2. Domain Acquisition
- [ ] Purchase domain via [Namecheap/Porkbun]: ________________
- [ ] Record cost: $_______ (Date: ______)
- [ ] Save registrar login credentials in password manager
```

### Build Phase (During IN_PROGRESS)

```markdown
### 3. Repository Setup
- [ ] Create from template: `gh repo create "[client-slug]-web" --template "your-org/agency-template" --private --clone`
- [ ] Enter directory: `cd [client-slug]-web`
- [ ] Add upstream remote: `git remote add upstream git@github.com:your-org/agency-template.git`
- [ ] Disable upstream push: `git remote set-url --push upstream DISABLE`
- [ ] Create assets folder: `mkdir -p public/images/[client-slug]`

### 4. Configuration
- [ ] Update `config/site.ts`:
  - [ ] identity.name, domain, phone, email
  - [ ] identity.address (street, city, state, zip, country)
  - [ ] identity.geo (lat/lng from Google Maps)
  - [ ] identity.openingHours
  - [ ] design.archetype (select appropriate for industry)
  - [ ] design.tokens.primary and secondary (from client's brand colors)
  - [ ] header.links (all 7 pages)
  - [ ] waas.projectId (must match admin portal)
  - [ ] All page content and sections
- [ ] Run `bun run validate` - must pass with no errors

### 5. Assets
- [ ] Save logo to `/public/images/[client-slug]/logo.webp`
- [ ] Save hero image to `/public/images/[client-slug]/hero.webp`
- [ ] Save team photos to `/public/images/[client-slug]/team/`
- [ ] Save gallery images to `/public/images/[client-slug]/gallery/`
- [ ] Verify all `ImageConfig` paths in config match actual files
- [ ] Optimize images if needed (target <500KB for hero, <200KB for others)

### 6. Local Testing
- [ ] Run `bun run dev` and verify all pages render
- [ ] Test contact form submission (check leads in admin portal)
- [ ] Verify JSON-LD schema in page source (View Source → search for "LocalBusiness")
- [ ] Test mobile responsiveness (Chrome DevTools)
- [ ] Run Lighthouse audit (target: 95+ Performance)
```

### Deployment Phase

```markdown
### 7. Vercel Setup
- [ ] Create new Vercel project linked to GitHub repo
- [ ] Configure environment variables:
  - [ ] `NEXT_PUBLIC_WAAS_API_URL` = https://[your-app].convex.site
  - [ ] `NEXT_PUBLIC_TURNSTILE_SITE_KEY` = 0x...
  - [ ] `TURNSTILE_SECRET_KEY` = 0x...
  - [ ] `GOOGLE_PLACES_API_KEY` = AIza... (if using Google Reviews)
- [ ] Trigger initial deploy
- [ ] Verify staging URL works: https://[client-slug]-web.vercel.app

### 8. Domain Configuration
- [ ] Add custom domain in Vercel: Project Settings → Domains
- [ ] Option A (Vercel DNS): Update nameservers at registrar to Vercel's
- [ ] Option B (External DNS): Add A record pointing to 76.76.21.21
- [ ] Wait for DNS propagation (check via https://dnschecker.org)
- [ ] Verify SSL certificate issued (green padlock)
- [ ] Test https://[domain.com] loads correctly

### 9. Admin Portal Updates
- [ ] Update `projects.deployment.liveUrl` = [domain.com] (without https://)
- [ ] Update `projects.deployment.stagingUrl` = [client-slug]-web.vercel.app
- [ ] Update `projects.deployment.vercelProjectId`
- [ ] Transition project status: IN_PROGRESS → IN_REVIEW
```

### Go-Live Phase

```markdown
### 10. Client Review
- [ ] Send staging link to client for review
- [ ] Schedule 30-min review call via Cal.com
- [ ] Document requested changes
- [ ] Implement changes and push to trigger redeploy
- [ ] Get final approval from client

### 11. Launch
- [ ] Transition project status: IN_REVIEW → LIVE
- [ ] Send launch email with:
  - [ ] Live site URL
  - [ ] Portal login link
  - [ ] Analytics dashboard access
  - [ ] How to submit edit requests
- [ ] Verify analytics pixel is recording (check admin portal)
- [ ] Test contact form on live domain

### 12. Post-Launch
- [ ] Add to monthly analytics report list
- [ ] Set calendar reminder for 30-day check-in
- [ ] Set calendar reminder for 11-month retention outreach
- [ ] Archive build assets in cloud storage

## Deployment Complete ✓
Date: ______ | Deployed By: ______
```

### Quick Reference Commands

```bash
# Create new client from template
gh repo create "CLIENT-web" --template "your-org/agency-template" --private --clone
cd CLIENT-web
git remote add upstream git@github.com:your-org/agency-template.git
git remote set-url --push upstream DISABLE
mkdir -p public/images/CLIENT

# Validate config
bun run validate

# Build and test locally
bun run build
bun run start

# Deploy (after pushing to GitHub)
# Vercel auto-deploys on push to main
git add . && git commit -m "Initial client setup" && git push -u origin main

# Push template updates to client site
git fetch upstream
git merge upstream/main --no-edit
git push origin main
```

---

## XVI. Execution Checklist (Template Only)

### Template Repo Setup
- [ ] Initialize Next.js 15 with App Router
- [ ] Install dependencies: `zod`, `tsx`, `tailwindcss`
- [ ] Set up directory structure per Section II
- [ ] Add `.cursor/rules`

### Type System
- [ ] Create `types/config.ts` with all interfaces and Zod schemas
- [ ] Create `lib/secrets.ts` (Turnstile + Google Places API key)

### Registry Build
- [ ] Create 7 Hero variants (split-trust, split-image-right, simple-page-header, centered, video, with-stats, split-angled)
- [ ] Create 3 Features variants
- [ ] Create 3 Reviews variants (including Google Reviews via Server Action)
- [ ] Create `actions/reviews.ts` Server Action for Google Places API
- [ ] Create 2 CTA variants
- [ ] Create 2 Gallery variants
- [ ] Create 2 Contact variants
- [ ] Create 1 Team variant
- [ ] Create 1 FAQ variant
- [ ] Create 2 Before/After variants (grid, slider)
- [ ] Create 1 Credentials variant (badges)
- [ ] Create 1 Service Areas variant (list)
- [ ] Create 2 Process variants (steps, timeline)
- [ ] Create 2 Header variants
- [ ] Create 2 Footer variants

### Routing
- [ ] Implement `app/[[...slug]]/page.tsx`
- [ ] Implement `SectionRenderer.tsx` with error boundaries
- [ ] Add `generateStaticParams()` for SSG

### SEO
- [ ] Add `LocalBusinessSchema` component
- [ ] Configure metadata generation
- [ ] Create `sitemap.ts` and `robots.ts`

### Validation
- [ ] Create `scripts/validate-config.ts`
- [ ] Add `bun run validate` to build script

### Test
- [ ] Generate a 7-page site for a fake "Miami Landscaping" company
- [ ] Verify all pages render
- [ ] Test contact form submission
- [ ] Verify JSON-LD in page source
- [ ] Run Lighthouse audit (target: 95+ Performance)

---

## XVII. Environment Variables (Template Site)

```env
# Public (exposed to browser)
NEXT_PUBLIC_WAAS_API_URL=https://your-app.convex.site
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x...

# Server-only (never exposed)
TURNSTILE_SECRET_KEY=0x...
GOOGLE_PLACES_API_KEY=AIza... # For Google Reviews (server-side only)
```

> **Note:** No `WAAS_SECRET_KEY` needed! The backend uses rate limiting + CORS validation via `liveUrl` instead of per-client secrets. See `agencyUpdate.md` for backend implementation.

---

## XVIII. Phase 2 Roadmap (Template Enhancements)

1. **Enhanced Archetypes:** Add Motion Profiles and Density Profiles
2. **More Section Variants:** Expand to 25+ total variants
3. **NPM Package:** Publish template as versioned package
4. **CLI Tooling:** One-command client setup
5. **AI Content Generation:** Auto-generate service descriptions and FAQs
6. **Background Patterns:** Add configurable section backgrounds
7. **Error Monitoring:** Add Sentry with shared DSN, filter by projectId tag

---

**Document Version:** 7.2  
**Last Updated:** January 27, 2026  
**Status:** Ready to Build (Template Only - Backend updates in `agencyUpdate.md`)
