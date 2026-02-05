# The Agency Blueprint: Client Template (Product Factory)

**Document Version:** 7.5  
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
- **Server Actions:** Contact forms use `'use server'` actions with honeypot spam protection and POST to the hub.
- **Client Islands:** Only interactive elements (mobile nav, form inputs) are hydrated client-side.
- **NOT static export:** We do not use `output: "export"`. We need serverless runtime for Server Actions.

### 5. Client Component Data Flow

**Critical Rule:** Never import `siteConfig` in client components (`"use client"` files). This would bundle the entire config into client JS.

Instead, server components extract the specific data needed and pass it as props:

```
Server Component (imports siteConfig) → passes minimal props → Client Component
```

**Current data flows:**
| Server Component | Props Passed | Client Component |
|-----------------|--------------|------------------|
| `layout.tsx` | `projectId` | `AnalyticsPixel` |
| `Header.tsx` | `links, cta, phone, archetype` | `MobileNav` → `MobileMenu` |
| `SectionRenderer.tsx` | `identity` (phone, email, name, address, geo) | `ContactSplitMap` |

**Key types:**
- `IdentityContactProps` — Subset of identity data for contact components (defined in `types/config.ts`)

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
├── site.ts                 # PUBLIC CONFIG: Content + Layout + Routing (server components only)
├── registry.ts             # Component mapping
└── theme.ts                # Archetype definitions (Tailwind classes)
/lib
├── secrets.ts              # SERVER-ONLY: API keys (never import in client components)
└── utils.ts
/types
└── config.ts               # TypeScript interfaces + Zod schemas for the Config Engine
/actions
├── contact.ts              # Server Action (honeypot spam protection + POST to WaaS)
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

#### Icons in config (string → registry lookup)

Several section content types include icon fields (all are **strings**), for example:

- `HeroSplitContent.trustBadges[].icon`
- `FeaturesGridContent.items[].icon`
- `CredentialsBadgesContent.items[].icon`
- `ProcessStepsContent.steps[].icon`

At render time, these strings are resolved by the `Icon` component (`components/ui/Icon.tsx`), which calls `getIcon(name)` from the central registry (`lib/icons/index.tsx`).

**Server-First Architecture:**
- `Icon` is a **server component** — icons render as static SVG on the server with zero client JS overhead.
- `ClientIcon` is available for the rare cases where icons must be inside interactive client islands (e.g., icons that change based on `useState`).
- This keeps Lucide imports **out of the client bundle** entirely.

**Icon Registry:**
- **Available icons**: Only names registered in `lib/icons/index.tsx` (plus aliases) are available by default. This keeps Lucide **tree-shakeable**.
- **Unknown icon names**: Gracefully fall back to a neutral `Circle` icon (no runtime error).
- **Adding a Lucide icon**: Import it from `lucide-react` and add it to the `lucideIcons` map in `lib/icons/index.tsx`.
- **Custom SVG icons**: Add a component to the `customIcons` map (custom icons take precedence), or register at runtime with `registerCustomIcon(name, component)`.

#### Custom Industry Icons

The template includes custom industry-specific icons that aren't available in Lucide:

| Icon | Use Case | Industries |
|------|----------|------------|
| `Chainsaw` | Tree removal, cutting | Tree service, forestry |
| `StumpGrinder` | Stump grinding services | Tree service, landscaping |
| `WoodChipper` | Debris processing, land clearing | Tree service, landscaping |
| `BucketTruck` | Elevated work, power line clearing | Tree service, utilities |

Custom icons follow Lucide's design principles:
- Stroke-only design (no fills)
- 24x24 viewBox with rounded caps/joins
- Accept `LucideProps` for consistent styling (`className`, `strokeWidth`, etc.)
- Clear silhouettes that work at small sizes (16x16 to 28x28)

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
// HERO BRANDING (Optional logo/name above hero content)
// ============================================
export type HeroBrandingLayout =
  | "logo-left"    // Logo left, name right (horizontal)
  | "logo-right"   // Name left, logo right (horizontal)
  | "logo-above"   // Logo above name (vertical)
  | "logo-below";  // Name above logo (vertical)

export type HeroBrandingContent = {
  logo?: ImageConfig;           // Optional logo image
  name?: string;                // Optional business name
  layout?: HeroBrandingLayout;  // Only used when both are present, defaults to "logo-left"
};

// ============================================
// SECTION CONTENT TYPES (Discriminated Unions)
// Each variant has strictly typed content - NO `any` types
// ============================================

// Hero Variants
export type HeroSplitContent = {
  branding?: HeroBrandingContent; // Optional logo/name above title
  title: string;
  subtitle: string;
  cta: { label: string; href: string };
  image: ImageConfig;
  trustBadges?: Array<{ text: string; icon?: string }>;
  socialProof?: {
    count: string;    // e.g., "500+"
    label: string;    // e.g., "happy clients"
  };
  testimonial?: {
    quote: string;
    author: string;
    role?: string;    // e.g., "Verified Customer"
  };
};

export type HeroSimpleContent = {
  title: string;
  subtitle?: string;
  image?: ImageConfig;    // Optional image rendered below the header
  imageText?: string;     // Optional caption/description text below the image
};

export type HeroCenteredContent = {
  branding?: HeroBrandingContent; // Optional logo/name above title
  title: string;
  subtitle: string;
  cta: { label: string; href: string };
  backgroundImage?: ImageConfig;
  backgroundImageMobile?: ImageConfig; // Optional mobile-specific background for art direction
};

export type HeroVideoContent = {
  branding?: HeroBrandingContent; // Optional logo/name above title
  title: string;
  subtitle: string;
  cta: { label: string; href: string };
  videoUrl: string;
  posterImage: ImageConfig;
  posterImageMobile?: ImageConfig; // Optional mobile-specific poster for art direction
};

export type HeroWithStatsContent = {
  branding?: HeroBrandingContent; // Optional logo/name above title
  title: string;
  subtitle: string;
  cta: { label: string; href: string };
  stats: Array<{
    value: string;
    label: string;
    description?: string;
  }>;
  backgroundImage?: ImageConfig;
  backgroundImageMobile?: ImageConfig; // Optional mobile-specific background for art direction
};

// Note: HeroSplitAngled reuses HeroSplitContent type

// ============================================
// VIDEO SHOWCASE (Non-hero video section)
// ============================================
export type VideoShowcaseHeader = {
  text?: string;               // e.g., "As featured on"
  logo?: ImageConfig;          // Optional logo displayed alongside text
  logoHref?: string;           // Optional link target for logo
  ariaLabel?: string;          // Accessible label
};

export type VideoShowcaseSource =
  | { kind: "file"; mp4Url: string; webmUrl?: string; posterImage: ImageConfig; preload?: "none" | "metadata" | "auto" }
  | { kind: "youtube"; videoId: string; posterImage: ImageConfig }
  | { kind: "vimeo"; videoId: string; posterImage: ImageConfig }
  | { kind: "iframe"; src: string; title: string; posterImage: ImageConfig };

export type VideoShowcaseFeaturedContent = {
  featuredOn: VideoShowcaseHeader;
  heading?: string;
  subheading?: string;
  video: VideoShowcaseSource;
  aspectRatio?: "16:9" | "4:3" | "1:1" | "9:16";
  caption?: string;
};

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

export type FeaturesSplitImageContent = {
  heading: string;
  subheading?: string;
  items: Array<{ title: string; description: string; icon?: string }>;
  image: ImageConfig;
  imagePosition?: "left" | "right"; // defaults to "right"
};

export type FeaturesColorCardsContent = {
  heading: string;
  subheading?: string;
  items: Array<{ title: string; description: string; icon: string }>;
};

// Reviews Variants
export type ReviewSource = "google" | "facebook" | "yelp" | "bbb" | "thumbtack" | "angi" | "other";

export type ReviewsCarouselContent = {
  heading: string;
  source: "google" | "manual" | "combined"; // "combined" is preferred
  placeId?: string; // For Google reviews (required for "google" or "combined")
  manualReviews?: Array<{
    name: string;
    rating: number;
    text: string;
    date?: string;
    source?: ReviewSource; // Platform attribution (used with "combined")
  }>;
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

export type CredentialsSplitImageContent = {
  heading: string;
  subheading?: string;
  items: Array<{
    title: string;
    description?: string;
    icon?: string;
  }>;
  image: ImageConfig;
  imagePosition?: "left" | "right"; // defaults to "right"
};

// Award Showcase Variants (Trust signals - single award display)
export type AwardShowcaseContent = {
  heading: string;
  subheading?: string;
  award: {
    title: string;           // "Best Contractor of the Year"
    description?: string;    // Award details/significance
    year?: string;           // "2025"
    organization?: string;   // "Austin Chamber of Commerce"
  };
  image: ImageConfig;        // Transparent PNG of award
  imagePosition?: "left" | "right"; // defaults to "right"
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

export type ProcessSplitImageContent = {
  heading: string;
  subheading?: string;
  steps: Array<{
    step: number;
    title: string;
    description: string;
    icon?: string;
  }>;
  image: ImageConfig;
  imagePosition?: "left" | "right"; // defaults to "right"
};

// Find Us Variants (Location/Map display)
export type FindUsContent = {
  heading: string;
  subheading?: string;
  showDirectionsButton?: boolean;
  showHours?: boolean;
};

// Leave Review Variants (CTA to leave Google review)
export type LeaveReviewContent = {
  heading: string;
  subheading?: string;
  placeId: string;          // Google Business Profile place ID
  ctaLabel?: string;        // Default: "Leave a Review"
  showRating?: boolean;
  rating?: number;          // e.g., 4.9
  reviewCount?: number;     // Total review count
};

// Promo Variants (Announcements, special offers, promotions)
export type PromoContent = {
  heading: string;
  subheading?: string;
  cta?: { label: string; href: string };
  badge?: string;           // e.g., "Limited Time", "New", "Sale"
  expirationText?: string;  // e.g., "Ends Dec 31st"
  icon?: string;
};

// ============================================
// IDENTITY CONTACT PROPS (Server → Client prop drilling)
// ============================================
export interface IdentityContactProps {
  phone: string;
  email: string;
  name: string;
  address: AddressConfig;
  geo?: GeoConfig;
}

// ============================================
// SECTION CONFIG (Discriminated Union by type + variant)
// ============================================
export type SectionConfig =
  // Hero variants
  | { id: string; type: "hero"; variant: "split-trust"; content: HeroSplitContent }
  | { id: string; type: "hero"; variant: "split-image-right"; content: HeroSplitContent }
  | { id: string; type: "hero"; variant: "split-angled"; content: HeroSplitContent }
  | { id: string; type: "hero"; variant: "simple-page-header"; content: HeroSimpleContent }
  | { id: string; type: "hero"; variant: "simple-page-header-floating"; content: HeroSimpleContent }
  | { id: string; type: "hero"; variant: "centered"; content: HeroCenteredContent }
  | { id: string; type: "hero"; variant: "video"; content: HeroVideoContent }
  | { id: string; type: "hero"; variant: "with-stats"; content: HeroWithStatsContent }
  // Features variants
  | { id: string; type: "features"; variant: "grid-icons"; content: FeaturesGridContent }
  | { id: string; type: "features"; variant: "bento"; content: FeaturesBentoContent }
  | { id: string; type: "features"; variant: "list"; content: FeaturesListContent }
  | { id: string; type: "features"; variant: "split-image"; content: FeaturesSplitImageContent }
  | { id: string; type: "features"; variant: "color-cards"; content: FeaturesColorCardsContent }
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
  // Video Showcase variants
  | { id: string; type: "video-showcase"; variant: "featured"; content: VideoShowcaseFeaturedContent }
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
  | { id: string; type: "credentials"; variant: "split-image"; content: CredentialsSplitImageContent }
  // Award Showcase variants (trust signals - single award)
  | { id: string; type: "award-showcase"; variant: "split"; content: AwardShowcaseContent }
  // Service Areas variants (local SEO)
  | { id: string; type: "service-areas"; variant: "list"; content: ServiceAreasListContent }
  // Process variants (how it works)
  | { id: string; type: "process"; variant: "steps"; content: ProcessStepsContent }
  | { id: string; type: "process"; variant: "timeline"; content: ProcessTimelineContent }
  | { id: string; type: "process"; variant: "split-image"; content: ProcessSplitImageContent }
  // Find Us variants (location/map display)
  | { id: string; type: "find-us"; variant: "minimal"; content: FindUsContent }
  | { id: string; type: "find-us"; variant: "split"; content: FindUsContent }
  | { id: string; type: "find-us"; variant: "banner"; content: FindUsContent }
  | { id: string; type: "find-us"; variant: "card"; content: FindUsContent }
  | { id: string; type: "find-us"; variant: "floating"; content: FindUsContent }
  // Leave Review variants (CTA to leave Google review)
  | { id: string; type: "leave-review"; variant: "simple"; content: LeaveReviewContent }
  | { id: string; type: "leave-review"; variant: "banner"; content: LeaveReviewContent }
  | { id: string; type: "leave-review"; variant: "card"; content: LeaveReviewContent }
  | { id: string; type: "leave-review"; variant: "split"; content: LeaveReviewContent }
  | { id: string; type: "leave-review"; variant: "floating"; content: LeaveReviewContent }
  // Promo variants (announcements, special offers, promotions)
  | { id: string; type: "promo"; variant: "banner"; content: PromoContent }
  | { id: string; type: "promo"; variant: "ribbon"; content: PromoContent }
  | { id: string; type: "promo"; variant: "card"; content: PromoContent }
  | { id: string; type: "promo"; variant: "split"; content: PromoContent }
  | { id: string; type: "promo"; variant: "marquee"; content: PromoContent };

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
// SITE CONFIG (PUBLIC - server components only, not client components)
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
    variant: "simple" | "split" | "centered" | "floating";
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
  seo?: {
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
    content: z.record(z.string(), z.any()), // Content validated per-variant in registry
  })).min(1, "Page must have at least one section"),
});

export const SiteConfigSchema = z.object({
  identity: z.object({
    name: z.string().min(1),
    logo: ImageConfigSchema.optional(),
    domain: z.string().min(1),
    phone: z.string().min(1),
    email: z.union([z.literal(""), z.string().email()]),
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
    variant: z.enum(["simple", "split", "centered", "floating"]),
    links: z.array(z.object({ label: z.string(), href: z.string() })),
    cta: z.object({ label: z.string(), href: z.string() }).optional(),
  }),
  footer: z.object({
    variant: z.enum(["simple", "mega"]),
    social: z.record(z.string(), z.string()),
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

console.log("✓ Schema validation passed");

// 2. Validate all header links exist in pages (or are external)
const pageKeys = Object.keys(siteConfig.pages);
const internalLinks = siteConfig.header.links.filter(l => l.href.startsWith("/"));

for (const link of internalLinks) {
  const path = link.href === "/" ? "home" : link.href.slice(1);
  if (!pageKeys.includes(path)) {
    console.error(`❌ Header link "${link.label}" points to "${link.href}" but no page exists for "${path}"`);
    console.error(`   Available pages: ${pageKeys.join(", ")}`);
    process.exit(1);
  }
}

// Also validate header CTA if it exists and is internal
if (siteConfig.header.cta?.href?.startsWith("/")) {
  const ctaPath = siteConfig.header.cta.href === "/" ? "home" : siteConfig.header.cta.href.slice(1);
  if (!pageKeys.includes(ctaPath)) {
    console.error(`❌ Header CTA "${siteConfig.header.cta.label}" points to "${siteConfig.header.cta.href}" but no page exists for "${ctaPath}"`);
    console.error(`   Available pages: ${pageKeys.join(", ")}`);
    process.exit(1);
  }
}

console.log("✓ Header links validated");

// 3. Validate all section variants exist in registry
for (const [pageKey, page] of Object.entries(siteConfig.pages)) {
  for (const section of page.sections) {
    const registry = ComponentRegistry[section.type as keyof typeof ComponentRegistry];
    if (!registry) {
      console.error(`❌ Page "${pageKey}" uses unknown section type: "${section.type}"`);
      console.error(`   Available types: ${Object.keys(ComponentRegistry).join(", ")}`);
      process.exit(1);
    }
    const component = registry[section.variant as keyof typeof registry];
    if (!component) {
      console.error(`❌ Page "${pageKey}" section "${section.id}" uses unknown variant: "${section.type}/${section.variant}"`);
      console.error(`   Available variants for "${section.type}": ${Object.keys(registry).join(", ")}`);
      process.exit(1);
    }
  }
}

console.log("✓ Section variants validated");

console.log("\n✅ Config is valid!");
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

// 2. SEO Metadata Generation (includes canonical URL, OG, Twitter)
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getPageConfig(slug);
  if (!page) return {};

  const baseUrl = `https://${siteConfig.identity.domain}`;
  const path = slug && slug.length > 0 ? `/${slug.join("/")}` : "";
  const canonicalUrl = `${baseUrl}${path}`;
  
  const title = siteConfig.seo?.titleTemplate 
    ? siteConfig.seo.titleTemplate.replace("%s", page.title)
    : page.title;

  return {
    title,
    description: page.description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description: page.description,
      url: canonicalUrl,
      type: "website",
      images: siteConfig.seo?.defaultOgImage ? [siteConfig.seo.defaultOgImage] : [],
    },
    twitter: {
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
import { ComponentType, memo } from "react";
import { ComponentRegistry } from "@/config/registry";
import { siteConfig } from "@/config/site";
import { SectionConfig, IdentityContactProps } from "@/types/config";

interface SectionRendererProps {
  section: SectionConfig;
}

// Build identity contact props from siteConfig (for contact + find-us sections)
function getIdentityContactProps(): IdentityContactProps {
  return {
    phone: siteConfig.identity.phone,
    email: siteConfig.identity.email,
    name: siteConfig.identity.name,
    address: siteConfig.identity.address,
    geo: siteConfig.identity.geo,
  };
}

// Build identity props with opening hours for find-us sections
function getIdentityWithHours() {
  return {
    ...getIdentityContactProps(),
    openingHours: siteConfig.identity.openingHours,
  };
}

export const SectionRenderer = memo(function SectionRenderer({ section }: SectionRendererProps) {
  const registry = ComponentRegistry[section.type as keyof typeof ComponentRegistry];
  const Component = registry?.[section.variant as keyof typeof registry] as ComponentType<any> | undefined;

  if (!Component) {
    // Development: Show visible error
    if (process.env.NODE_ENV === "development") {
      return (
        <div className="p-6 m-4 bg-red-50 border-2 border-red-300 text-red-700 rounded-lg">
          <strong className="block mb-2">⚠️ Missing Component</strong>
          <code className="text-sm">
            Type: {section.type} | Variant: {section.variant}
          </code>
        </div>
      );
    }
    console.error(`Missing section component: ${section.type}/${section.variant}`);
    return null;
  }

  // Inject identity props for contact sections that need it
  if (section.type === "contact" && section.variant === "split-map") {
    return (
      <section id={section.id} className="w-full">
        <Component {...section.content} identity={getIdentityContactProps()} />
      </section>
    );
  }

  // Inject identity props (with hours) for find-us sections
  if (section.type === "find-us") {
    return (
      <section id={section.id} className="w-full">
        <Component {...section.content} identity={getIdentityWithHours()} />
      </section>
    );
  }

  return (
    <section id={section.id} className="w-full">
      <Component {...section.content} />
    </section>
  );
});
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

The root layout handles font loading for all 4 archetypes, theme CSS variable injection, metadata, and the global shell.

```typescript
import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display, Cormorant_Garamond, Lato, Oswald, Roboto } from "next/font/google";
import { siteConfig } from "@/config/site";
import { Header } from "@/components/agency/Header";
import { Footer } from "@/components/agency/Footer";
import { LocalBusinessSchema, AnalyticsPixel } from "@/components/utils";
import "./globals.css";

// Load all fonts used by the 4 design archetypes (each gets a CSS variable)
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-family-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], display: "swap", variable: "--font-family-playfair" });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], display: "swap", weight: ["400", "500", "600", "700"], variable: "--font-family-cormorant" });
const lato = Lato({ subsets: ["latin"], display: "swap", weight: ["400", "700"], variable: "--font-family-lato" });
const oswald = Oswald({ subsets: ["latin"], display: "swap", variable: "--font-family-oswald" });
const roboto = Roboto({ subsets: ["latin"], display: "swap", weight: ["400", "500", "700"], variable: "--font-family-roboto" });

const fontVariables = [inter.variable, playfair.variable, cormorant.variable, lato.variable, oswald.variable, roboto.variable].join(" ");

export const metadata: Metadata = {
  metadataBase: new URL(`https://${siteConfig.identity.domain}`),
  title: siteConfig.seo?.titleTemplate?.replace("%s", siteConfig.identity.name) || siteConfig.identity.name,
  description: siteConfig.pages.home.description,
  icons: { icon: siteConfig.identity.logo?.src || "/favicon.ico" },
};

export const viewport: Viewport = {
  themeColor: siteConfig.design.tokens.primary,
};

// Inject brand colors as CSS variables for Tailwind usage (bg-primary, text-primary, etc.)
function getThemeStyles() {
  const { primary, secondary } = siteConfig.design.tokens;
  return `:root { --theme-primary: ${primary}; --theme-secondary: ${secondary}; }`;
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={fontVariables}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: getThemeStyles() }} />
        <LocalBusinessSchema />
      </head>
      <body>
        <Header />
        {children}
        <Footer />
        <AnalyticsPixel projectId={siteConfig.waas.projectId} />
      </body>
    </html>
  );
}
```

---

## VII. WaaS Backend Integration & Spam Protection

### Key Design Decision: No Per-Client Secrets

To simplify operations and reduce env var management across client sites, we use:
- **Public `projectId`** for identification (not authentication)
- **Rate limiting by IP** on the backend to prevent spam (see `agencyUpdate.md`)
- **Honeypot + time-based validation** on the client site before POSTing

This means client sites need NO additional environment variables for spam protection.

### Spam Protection: Honeypot + Time-Based Validation

We use two invisible spam filters that require no external dependencies or API keys:

1. **Honeypot field**: A hidden `website` field that humans never see but bots auto-fill
2. **Time-based validation**: Reject submissions within 3 seconds of page load (bots are instant)

```
flowchart LR
    subgraph client [Client Side]
        A[Form renders] --> B[Hidden timestamp set]
        B --> C[Hidden honeypot field]
        C --> D[User fills form]
        D --> E[Submit]
    end
    
    subgraph server [Server Action]
        E --> F{Honeypot empty?}
        F -->|No| G[Reject - Bot detected]
        F -->|Yes| H{Time > 3 seconds?}
        H -->|No| I[Reject - Too fast]
        H -->|Yes| J[Validate form data]
        J --> K[Send to WaaS backend]
    end
```

**Why this approach:**
- Zero user friction (completely invisible)
- No external dependencies or API keys
- No environment variables needed
- Works offline during development
- Privacy-focused (no third-party requests)
- Highly effective against simple bots

### Honeypot Field Implementation

The honeypot field is styled to be invisible to humans but appears as a normal field to bots:

```typescript
<input
  type="text"
  name="website"
  className="hidden"      // Tailwind's display:none
  tabIndex={-1}           // Prevents keyboard focus
  autoComplete="off"      // Prevents browser autofill
  aria-hidden="true"      // Hidden from screen readers
/>
```

Bots see a `website` field and automatically fill it in. Any submission with this field populated is rejected.

### Time-Based Validation

A timestamp is captured when the form mounts and submitted with the form data:

```typescript
const [formLoadedAt, setFormLoadedAt] = useState("");

useEffect(() => {
  setFormLoadedAt(String(Date.now()));
}, []);

// In form JSX:
<input type="hidden" name="_formLoadedAt" value={formLoadedAt} />
```

The server action checks if at least 3 seconds have elapsed:

```typescript
const MIN_SUBMISSION_TIME_MS = 3000; // 3 seconds

const formLoadedAt = Number(formData.get("_formLoadedAt") || 0);
const elapsed = Date.now() - formLoadedAt;

if (elapsed < MIN_SUBMISSION_TIME_MS) {
  return { success: false, message: "Please take your time filling out the form." };
}
```

Bots typically submit forms instantly, so this catches automated submissions.

### Analytics Pixel (`components/utils/AnalyticsPixel.tsx`)

Receives `projectId` as a prop from `layout.tsx` (never imports `siteConfig` directly).

```typescript
'use client';
import { useEffect } from "react";
import { usePathname } from "next/navigation";

interface AnalyticsPixelProps {
  projectId: string;
}

export function AnalyticsPixel({ projectId }: AnalyticsPixelProps) {
  const pathname = usePathname();

  useEffect(() => {
    const payload = {
      projectId,
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
  }, [pathname, projectId]);

  return null;
}
```

### Contact Form Server Action (`actions/contact.ts`)

```typescript
'use server';

import { z } from "zod";
import { siteConfig } from "@/config/site";

// Spam protection constants
const MIN_SUBMISSION_TIME_MS = 3000; // 3 seconds

const ContactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  message: z.string().min(1, "Message is required"),
});

// Form Handler
export async function submitContactForm(
  _prevState: { success: boolean; message: string } | null,
  formData: FormData
) {
  // 1. Honeypot check (bots fill this hidden field, humans don't see it)
  const honeypot = formData.get("website");
  if (honeypot) {
    return { success: false, message: "Spam detected." };
  }

  // 2. Time-based validation (reject instant bot submissions)
  const formLoadedAt = Number(formData.get("_formLoadedAt") || 0);
  const elapsed = Date.now() - formLoadedAt;

  if (elapsed < MIN_SUBMISSION_TIME_MS) {
    return { success: false, message: "Please take your time filling out the form." };
  }

  // 3. Validate form data
  const parsed = ContactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return { success: false, message: parsed.error.errors[0].message };
  }

  // 4. Send to WaaS Backend (no secret needed - backend validates projectId + rate limits)
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

Contact form components follow the template's dynamic rendering pattern:
- `components/agency/contact/ContactSplitMap.tsx` — Full contact page with form + map (receives `identity` prop from `SectionRenderer`)
- `components/agency/contact/ContactSimple.tsx` — Minimal centered form

**Note:** `ContactSplitMap` is a client component that needs identity data (phone, email, address, geo) for displaying contact info. The `SectionRenderer` (server component) injects this as an `identity` prop—it never imports `siteConfig` directly.

Both contain an internal `ContactForm` function with honeypot + time-based spam protection.

**Imports:**
```typescript
import { useActionState, useRef, useEffect, useState } from 'react';
import { submitContactForm } from '@/actions/contact';
```

**ContactForm function:**
```typescript
function ContactForm() {
  const tokens = useArchetype();
  const [state, formAction, isPending] = useActionState(submitContactForm, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [formLoadedAt, setFormLoadedAt] = useState("");

  // Set timestamp when form mounts (used for time-based spam protection)
  useEffect(() => {
    setFormLoadedAt(String(Date.now()));
  }, []);

  // Reset form on success
  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      setFormLoadedAt(String(Date.now()));
    }
  }, [state?.success]);

  return (
    <form ref={formRef} action={formAction} className="space-y-6">
      {/* Form fields... */}

      {/* Honeypot field - hidden from humans, bots fill it */}
      <input
        type="text"
        name="website"
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      {/* Timestamp for time-based spam protection */}
      <input type="hidden" name="_formLoadedAt" value={formLoadedAt} />

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

### Why Not CAPTCHA?

We chose honeypot + time-based validation over traditional CAPTCHA solutions because:

| Factor | Honeypot + Time | CAPTCHA (Turnstile, reCAPTCHA) |
|--------|-----------------|--------------------------------|
| User friction | None (invisible) | Low to medium |
| Dependencies | None | External package + API |
| Environment vars | None | 2 (site key + secret) |
| API calls | None | 1 per submission |
| Privacy | No third-party | Third-party verification |
| Effectiveness | Good for simple bots | Better for sophisticated bots |

For most small business sites, honeypot + time-based validation is sufficient. If you experience sophisticated bot attacks, consider adding rate limiting on the backend or upgrading to a CAPTCHA solution.

---

## VIII. Google Reviews Widget

Google Reviews are fetched at **build time** via a server component to comply with Google Places API Terms of Service (client-side fetch is prohibited). This keeps the API key secure on the server and eliminates post-hydration loading states.

### Architecture: Server Component + Client Carousel

```
Build Time: ReviewsCarousel (server) → fetchGoogleReviews() → Reviews baked into static HTML
Runtime: User gets instant HTML → ReviewsCarouselClient (client) handles scrolling/controls only
```

**Key Benefits:**
- **No loading state** — Reviews are pre-rendered in HTML, visible immediately
- **Zero runtime fetches** — No post-hydration network requests
- **Reduced client JS** — Client component only handles carousel UI (~5KB vs ~15KB)
- **SEO-friendly** — Reviews in initial HTML are crawlable
- **Stale-while-revalidate** — Reviews cached for 1 hour, then refreshed in background

### Places API (New)

**Endpoint:** `https://places.googleapis.com/v1/places/{placeId}`

**Constraints:**
- Returns a **maximum of 5 reviews** per request
- Reviews are sorted by relevance by default
- **Filtered to 5-star reviews only** (ensures only positive reviews are displayed)
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

        // Filter to only return 5-star reviews
        return (data.reviews ?? []).filter((review) => review.rating === 5);
      } catch (error) {
        console.error('[Reviews] Failed to fetch:', error);
        return [];
      }
    },
    ['google-reviews', placeId],
    { revalidate: 3600, tags: ['reviews'] }
  );

// Fetches 5-star reviews only
export async function fetchGoogleReviews(placeId: string): Promise<GoogleReview[]> {
  return getCachedReviews(placeId)();
}
```

### Reviews Component Architecture

The reviews system uses a **server/client split** pattern:

| Component | Type | Responsibility |
|-----------|------|----------------|
| `ReviewsCarousel.tsx` | Server (async) | Fetches Google reviews, processes source logic, passes data to client |
| `ReviewsCarouselClient.tsx` | Client | Carousel UI, scrolling, navigation controls |

**Data Flow:**
```typescript
// ReviewsCarousel.tsx (Server Component)
export async function ReviewsCarousel({ heading, source, placeId, manualReviews }) {
  // Fetch reviews on the server (at build time for SSG)
  const googleReviews = shouldFetchGoogle ? await fetchGoogleReviews(placeId) : [];
  
  // Process and merge reviews based on source mode
  const reviews = processReviews(googleReviews, manualReviews, source);
  
  // Pass pre-fetched reviews to client carousel
  return <ReviewsCarouselClient heading={heading} reviews={reviews} />;
}
```

**Source Modes:**
- `"combined"` (Preferred) — Fetches 5-star Google reviews AND displays static reviews with source badges
- `"google"` — 5-star Google reviews only, falls back to manual if API fails or no 5-star reviews
- `"manual"` — Static reviews only (no API calls)

**Features:**
- **Reviewer Photos:** Uses `authorAttribution.photoUri` from Google API response
- **Source Badges:** Shows platform-specific icons (Google, Facebook, Yelp, BBB, Thumbtack, Angi)
- **Graceful Fallback:** Falls back to initials if no photo
- **No Loading State:** Reviews are pre-rendered in HTML

```typescript
// DisplayReview interface (shared between server and client)
export interface DisplayReview {
  author_name: string;
  author_url?: string;
  photo_url?: string;
  rating: number;
  text: string;
  date?: string;
  source: "google" | "facebook" | "yelp" | "bbb" | "thumbtack" | "angi" | "other" | "manual";
}
```

**Caching Behavior:**
- Reviews are cached for 1 hour via `unstable_cache`
- After cache expires, Next.js uses stale-while-revalidate: serves cached data immediately, fetches fresh data in background
- New reviews appear on next request after revalidation completes

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

**Preferred: Combined Source (Google + Static Reviews)**

```typescript
{
  id: "reviews",
  type: "reviews",
  variant: "carousel",
  content: {
    heading: "What Our Clients Say",
    source: "combined", // Fetches Google + shows static reviews together
    placeId: "ChIJN1t_tDeuEmsRUsoyG83frY4",
    manualReviews: [
      { name: "Sarah M.", rating: 5, text: "Amazing service!", date: "2 weeks ago", source: "facebook" },
      { name: "John D.", rating: 5, text: "Best contractor in town.", source: "yelp" },
      { name: "Mike R.", rating: 5, text: "Highly recommend!", source: "bbb" },
    ],
  },
}
```

**Available Source Modes:**
| Mode | Behavior |
|------|----------|
| `"combined"` | **Preferred.** Fetches up to 5 Google reviews AND displays static reviews with source badges |
| `"google"` | Fetches Google reviews only, falls back to manual if API fails |
| `"manual"` | Static reviews only (no API calls) |

**Supported Review Sources for Attribution:**
`google`, `facebook`, `yelp`, `bbb`, `thumbtack`, `angi`, `other`

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
| Hero (full/desktop) | 1920x1080 | 16:9 |
| Hero (full/mobile) | 800x1200 | 2:3 (portrait) |
| Team photos | 400x400 | 1:1 |
| Gallery | 800x600 | 4:3 |
| Before/After | 800x600 | 4:3 |
| OG Image | 1200x630 | ~1.9:1 |

**Mobile Art Direction:** Hero variants `centered`, `video`, and `with-stats` support optional mobile-specific images (`backgroundImageMobile` or `posterImageMobile`). Uses the HTML `<picture>` element for optimal performance — browser only downloads the relevant image.

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
- [ ] Create `lib/secrets.ts` (Google Places API key)

### Registry Build (52+ variants across 17 section types)
- [x] Create 8 Hero variants (split-trust, split-image-right, simple-page-header, simple-page-header-floating, centered, video, with-stats, split-angled)
- [x] Create 5 Features variants (grid-icons, bento, list, split-image, color-cards)
- [x] Create 3 Reviews variants (carousel, grid, stats-bar) + Google Reviews Server Action
- [x] Create `actions/reviews.ts` Server Action for Google Places API
- [x] Create 2 CTA variants (simple, urgent)
- [x] Create 2 Gallery variants (grid, masonry)
- [x] Create 1 Video Showcase variant (featured)
- [x] Create 2 Contact variants (split-map, simple)
- [x] Create 1 Team variant (grid-cards)
- [x] Create 1 FAQ variant (accordion)
- [x] Create 2 Before/After variants (grid, slider)
- [x] Create 2 Credentials variants (badges, split-image)
- [x] Create 1 Award Showcase variant (split)
- [x] Create 1 Service Areas variant (list)
- [x] Create 3 Process variants (steps, timeline, split-image)
- [x] Create 5 Find Us variants (minimal, split, banner, card, floating)
- [x] Create 5 Leave Review variants (simple, banner, card, split, floating)
- [x] Create 5 Promo variants (banner, ribbon, card, split, marquee)
- [x] Create 2 Header variants
- [x] Create 2 Footer variants

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

# Server-only (never exposed)
GOOGLE_PLACES_API_KEY=AIza... # For Google Reviews (server-side only)
```

> **Note:** No `WAAS_SECRET_KEY` needed! The backend uses rate limiting + CORS validation via `liveUrl` instead of per-client secrets. Spam protection uses honeypot + time-based validation (no API keys required). See `agencyUpdate.md` for backend implementation.

---

## XVIII. Phase 2 Roadmap (Template Enhancements)

1. **Enhanced Archetypes:** Add Motion Profiles and Density Profiles
2. **Per-Variant Content Validation:** Add Zod schemas for each section variant's content at build time
3. **NPM Package:** Publish template as versioned package (after 20+ clients)
4. **CLI Tooling:** One-command client setup
5. **AI Content Generation:** Auto-generate service descriptions and FAQs
6. **Background Patterns:** Add configurable section backgrounds
7. **Error Monitoring:** Add Sentry with shared DSN, filter by projectId tag
8. **Conditional Font Loading:** Only load fonts required by the active archetype

---

**Document Version:** 7.5  
**Last Updated:** February 5, 2026  
**Status:** Active (52+ component variants built — Backend updates in `agencyUpdate.md`)
