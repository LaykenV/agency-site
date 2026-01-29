/**
 * Target industries data for programmatic SEO industry landing pages
 * Each industry gets its own landing page at /websites-for-{slug}
 */

export interface TargetIndustry {
  slug: string;
  name: string;
  plural: string;
  keywords: string[];
  painPoints: string[];
  benefits: string[];
  faqs: Array<{ question: string; answer: string }>;
}

export const TARGET_INDUSTRIES: TargetIndustry[] = [
  {
    slug: "plumbers",
    name: "Plumber",
    plural: "Plumbing Companies",
    keywords: [
      "plumber website",
      "plumbing website design",
      "plumber web design",
      "plumbing company website",
    ],
    painPoints: [
      "Losing jobs to competitors with better online presence",
      "Customers can't find you when searching for emergency plumbers",
      "Your current website looks outdated on mobile phones",
      "No easy way for customers to request service online",
    ],
    benefits: [
      "Show up when locals search 'plumber near me'",
      "24/7 lead capture even when you're on a job",
      "Professional site that builds instant trust",
      "Easy service request forms that go straight to your phone",
    ],
    faqs: [
      {
        question: "Can you add my plumbing services and service areas?",
        answer:
          "Absolutely. We build pages for each service you offer (drain cleaning, water heater repair, etc.) and optimize for the cities you serve.",
      },
      {
        question: "Will the website work on phones?",
        answer:
          "Yes. Over 70% of plumbing searches happen on mobile. Your site will load fast and look great on any device.",
      },
    ],
  },
  {
    slug: "landscapers",
    name: "Landscaper",
    plural: "Landscaping Companies",
    keywords: [
      "landscaper website",
      "landscaping website design",
      "lawn care website",
      "landscaping company website",
    ],
    painPoints: [
      "Beautiful work but no online portfolio to show it off",
      "Competitors are getting leads from Google while you rely on word of mouth",
      "No professional way to showcase before/after photos",
      "Seasonal slowdowns hit harder without steady lead flow",
    ],
    benefits: [
      "Stunning photo galleries that sell your work",
      "Rank for 'landscaper near me' searches in your area",
      "Seasonal service pages that capture year-round leads",
      "Online quote request forms that filter serious customers",
    ],
    faqs: [
      {
        question: "Can you showcase my landscaping portfolio?",
        answer:
          "Yes! We create beautiful before/after galleries that showcase your best work and help convert visitors into customers.",
      },
      {
        question: "Do you optimize for seasonal services?",
        answer:
          "We build dedicated pages for each service—lawn maintenance, hardscaping, irrigation—so you rank for what customers are searching for.",
      },
    ],
  },
  {
    slug: "painters",
    name: "Painter",
    plural: "Painting Companies",
    keywords: [
      "painter website",
      "painting contractor website",
      "house painter website",
      "painting company website design",
    ],
    painPoints: [
      "Hard to show quality craftsmanship without a portfolio",
      "Competing against big franchises with bigger marketing budgets",
      "Customers want to see examples before hiring",
      "Getting leads is inconsistent and unpredictable",
    ],
    benefits: [
      "Project galleries organized by type (interior, exterior, commercial)",
      "Google visibility for 'painters near me' searches",
      "Trust signals like reviews and certifications front and center",
      "Consistent lead flow from organic search traffic",
    ],
    faqs: [
      {
        question: "Can I show different types of painting work?",
        answer:
          "Yes. We organize your portfolio by category—residential interior, exterior, commercial, specialty finishes—so customers find exactly what they need.",
      },
      {
        question: "How do you help me compete with big painting franchises?",
        answer:
          "Local SEO. We optimize for your specific service areas so you show up when homeowners in your town search for painters.",
      },
    ],
  },
  {
    slug: "contractors",
    name: "Contractor",
    plural: "General Contractors",
    keywords: [
      "contractor website",
      "general contractor website",
      "construction company website",
      "home builder website design",
    ],
    painPoints: [
      "Big projects require trust—hard to build online",
      "Your best work speaks for itself but isn't visible online",
      "Potential clients want to research you before the first call",
      "Website builders don't understand construction businesses",
    ],
    benefits: [
      "Project case studies that tell the full story",
      "Credentials and licensing displayed prominently",
      "Client testimonials that build credibility",
      "Service area pages that capture local searches",
    ],
    faqs: [
      {
        question: "Can you feature my completed projects?",
        answer:
          "We create detailed project showcases with photos, scope descriptions, and timelines that demonstrate your expertise and build trust.",
      },
      {
        question: "What about my licenses and certifications?",
        answer:
          "We display your credentials prominently—licensed, bonded, insured—so visitors know they're dealing with a professional.",
      },
    ],
  },
  {
    slug: "electricians",
    name: "Electrician",
    plural: "Electrical Contractors",
    keywords: [
      "electrician website",
      "electrical contractor website",
      "electrician website design",
      "electrical company website",
    ],
    painPoints: [
      "Emergency calls go to whoever shows up first on Google",
      "Customers don't understand the difference between a licensed electrician and a handyman",
      "Your expertise isn't communicated on your current site",
      "No way to capture after-hours service requests",
    ],
    benefits: [
      "Emergency service visibility when customers need you most",
      "Trust badges highlighting licensing and safety certifications",
      "Service pages for residential, commercial, and specialty work",
      "24/7 contact forms that capture leads while you sleep",
    ],
    faqs: [
      {
        question: "Can you help me rank for emergency electrical searches?",
        answer:
          "Yes. We optimize for '24 hour electrician' and 'emergency electrician near me' searches so you're there when customers need urgent help.",
      },
      {
        question: "How do you highlight my licensing?",
        answer:
          "Your license number, certifications, and insurance are displayed prominently throughout the site—building trust before the first call.",
      },
    ],
  },
  {
    slug: "hvac",
    name: "HVAC Technician",
    plural: "HVAC Companies",
    keywords: [
      "hvac website",
      "hvac company website",
      "air conditioning website",
      "heating and cooling website design",
    ],
    painPoints: [
      "Seasonal demand swings make marketing unpredictable",
      "Emergency AC repairs go to whoever answers first",
      "Maintenance plan signups are low without online visibility",
      "Competing with national chains with big ad budgets",
    ],
    benefits: [
      "Emergency service pages that rank for urgent searches",
      "Maintenance plan signups with online scheduling",
      "Seasonal service optimization (heating in winter, AC in summer)",
      "Local visibility that big chains can't match",
    ],
    faqs: [
      {
        question: "Can you help with seasonal HVAC marketing?",
        answer:
          "We optimize different service pages seasonally—AC repair and installation pages rank better in summer, heating in winter.",
      },
      {
        question: "What about maintenance plan signups?",
        answer:
          "We create dedicated maintenance plan pages with clear benefits and easy signup forms to grow your recurring revenue.",
      },
    ],
  },
  {
    slug: "roofers",
    name: "Roofer",
    plural: "Roofing Companies",
    keywords: [
      "roofer website",
      "roofing company website",
      "roofing contractor website",
      "roof repair website design",
    ],
    painPoints: [
      "Storm chasers hurt the industry's reputation",
      "High-ticket jobs require serious trust building",
      "Customers research extensively before a roofing decision",
      "Insurance work requires clear process communication",
    ],
    benefits: [
      "Credibility features that separate you from storm chasers",
      "Project galleries with detailed scope and materials",
      "Insurance claim process pages that educate customers",
      "Local SEO for 'roofer near me' and storm damage searches",
    ],
    faqs: [
      {
        question: "How do you help me stand out from storm chasers?",
        answer:
          "We highlight your local presence, years in business, licensing, warranties, and real customer reviews—everything that shows you're the real deal.",
      },
      {
        question: "Can you explain the insurance claim process on my site?",
        answer:
          "Yes. We create dedicated pages that walk homeowners through the insurance claim process, positioning you as their trusted guide.",
      },
    ],
  },
];

/**
 * Get an industry by its slug
 */
export function getIndustryBySlug(slug: string): TargetIndustry | undefined {
  return TARGET_INDUSTRIES.find((industry) => industry.slug === slug);
}

/**
 * Get all industry slugs for static params generation
 */
export function getAllIndustrySlugs(): string[] {
  return TARGET_INDUSTRIES.map((industry) => industry.slug);
}
