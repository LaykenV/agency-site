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
  {
    slug: "pressure-washing",
    name: "Pressure Washing Pro",
    plural: "Pressure Washing Companies",
    keywords: [
      "pressure washing website",
      "power washing website design",
      "pressure washing company website",
      "exterior cleaning website",
    ],
    painPoints: [
      "Hard to showcase the dramatic before/after results online",
      "Seasonal business makes consistent leads essential",
      "Competing with lowball operators who undercut prices",
      "Customers don't understand the value of professional equipment",
    ],
    benefits: [
      "Stunning before/after galleries that sell your work",
      "Service pages for driveways, decks, siding, and commercial",
      "Online quote request forms that qualify serious customers",
      "Local SEO to rank for 'pressure washing near me' searches",
    ],
    faqs: [
      {
        question: "Can you showcase my before/after photos?",
        answer:
          "Absolutely. We create eye-catching before/after sliders and galleries that demonstrate the dramatic transformation your service provides.",
      },
      {
        question: "How do I compete with cheaper operators?",
        answer:
          "We highlight your professional equipment, insurance, experience, and reviews—positioning you as the quality choice worth paying for.",
      },
    ],
  },
  {
    slug: "cleaning-services",
    name: "Cleaning Service",
    plural: "Cleaning Companies",
    keywords: [
      "cleaning service website",
      "house cleaning website design",
      "maid service website",
      "commercial cleaning website",
    ],
    painPoints: [
      "Trust is essential when customers let you into their homes",
      "Hard to differentiate from competitors on Google",
      "Booking and scheduling is often done manually",
      "Recurring customers are the lifeblood but hard to retain",
    ],
    benefits: [
      "Trust signals like background checks and insurance front and center",
      "Service pages for residential, commercial, and deep cleaning",
      "Easy online booking and quote request forms",
      "Reviews and testimonials that build instant credibility",
    ],
    faqs: [
      {
        question: "Can you add online booking to my website?",
        answer:
          "We integrate simple quote request forms that capture customer details. For full scheduling, we can recommend and link to booking platforms.",
      },
      {
        question: "How do you help build trust with potential customers?",
        answer:
          "We prominently display your insurance, background check policies, reviews, and years of experience—everything that makes customers comfortable.",
      },
    ],
  },
  {
    slug: "pest-control",
    name: "Pest Control Pro",
    plural: "Pest Control Companies",
    keywords: [
      "pest control website",
      "exterminator website design",
      "pest control company website",
      "termite control website",
    ],
    painPoints: [
      "Emergency calls go to whoever shows up first in search",
      "Customers want immediate solutions for urgent pest problems",
      "Seasonal pest issues require year-round marketing",
      "Competing with national chains with big marketing budgets",
    ],
    benefits: [
      "Emergency service visibility for urgent pest problems",
      "Dedicated pages for termites, mosquitoes, rodents, and more",
      "Recurring service plan signups and promotions",
      "Local SEO to beat national chains in your service area",
    ],
    faqs: [
      {
        question: "Can you help me rank for emergency pest searches?",
        answer:
          "Yes. We optimize for urgent keywords like 'emergency pest control' and '24 hour exterminator near me' so you're there when customers need you most.",
      },
      {
        question: "What about recurring service plans?",
        answer:
          "We create dedicated pages that explain your prevention plans with clear pricing and easy signup—helping you build predictable recurring revenue.",
      },
    ],
  },
  {
    slug: "tree-services",
    name: "Tree Service",
    plural: "Tree Service Companies",
    keywords: [
      "tree service website",
      "tree removal website design",
      "arborist website",
      "tree trimming website",
    ],
    painPoints: [
      "Storm damage creates sudden spikes in demand",
      "High-risk work requires trust and credibility online",
      "Large jobs need detailed quotes and customer education",
      "Seasonal work makes year-round lead generation critical",
    ],
    benefits: [
      "Emergency service pages for storm damage response",
      "Portfolio showcasing large removals and technical climbs",
      "Certification and insurance displayed prominently",
      "Service area pages targeting neighborhoods you serve",
    ],
    faqs: [
      {
        question: "Can you help me get storm damage leads?",
        answer:
          "We create emergency service pages optimized for 'storm damage tree removal' and similar urgent searches that spike after severe weather.",
      },
      {
        question: "How do you showcase my certifications?",
        answer:
          "We display your ISA certification, insurance, and safety credentials prominently—building trust for high-stakes tree work.",
      },
    ],
  },
  {
    slug: "fencing",
    name: "Fence Contractor",
    plural: "Fence Companies",
    keywords: [
      "fence company website",
      "fencing contractor website",
      "fence installation website",
      "fence builder website design",
    ],
    painPoints: [
      "Customers want to see examples of your fence styles",
      "Price shoppers make it hard to compete on value",
      "Seasonal demand creates feast-or-famine lead flow",
      "Material options are confusing for homeowners",
    ],
    benefits: [
      "Photo galleries organized by fence type (wood, vinyl, chain link, iron)",
      "Material comparison pages that educate and pre-qualify customers",
      "Quote request forms that capture project details",
      "Local SEO for 'fence company near me' searches",
    ],
    faqs: [
      {
        question: "Can you show different fence styles on my site?",
        answer:
          "Yes. We organize your portfolio by material and style—wood privacy, ornamental iron, vinyl, chain link—so customers can find exactly what they want.",
      },
      {
        question: "How do you help me compete with cheaper installers?",
        answer:
          "We highlight your quality materials, warranties, installation expertise, and reviews—showing customers why you're worth the investment.",
      },
    ],
  },
  {
    slug: "garage-doors",
    name: "Garage Door Tech",
    plural: "Garage Door Companies",
    keywords: [
      "garage door website",
      "garage door repair website",
      "garage door company website",
      "garage door installation website design",
    ],
    painPoints: [
      "Emergency repairs are time-sensitive—customers call whoever appears first",
      "Competing with national franchises with big ad budgets",
      "Customers don't understand repair vs. replacement options",
      "Reviews are crucial but hard to collect consistently",
    ],
    benefits: [
      "Emergency repair visibility for broken spring and opener searches",
      "Clear service pages for repair, replacement, and maintenance",
      "Before/after galleries showing transformations",
      "Local SEO to outrank national chains in your area",
    ],
    faqs: [
      {
        question: "Can you help me rank for emergency garage door searches?",
        answer:
          "Absolutely. We optimize for 'garage door repair near me' and 'broken garage door spring' searches so you appear when customers have urgent needs.",
      },
      {
        question: "How do I compete with big garage door franchises?",
        answer:
          "We emphasize your local presence, fast response times, and personal service—advantages big franchises can't match.",
      },
    ],
  },
  {
    slug: "concrete",
    name: "Concrete Contractor",
    plural: "Concrete Companies",
    keywords: [
      "concrete contractor website",
      "concrete company website",
      "concrete driveway website",
      "stamped concrete website design",
    ],
    painPoints: [
      "High-ticket projects require serious trust and credibility",
      "Customers can't visualize stamped or decorative options",
      "Seasonal weather limits work windows in some regions",
      "Competition from general contractors doing concrete on the side",
    ],
    benefits: [
      "Portfolio galleries showing driveways, patios, stamped designs",
      "Service pages for residential, commercial, and decorative concrete",
      "Before/after transformations that showcase your craftsmanship",
      "Local SEO for 'concrete contractor near me' searches",
    ],
    faqs: [
      {
        question: "Can you showcase my decorative concrete work?",
        answer:
          "Yes. We create galleries for stamped concrete, exposed aggregate, colored concrete, and more—helping customers visualize the possibilities.",
      },
      {
        question: "How do you help me stand out from general contractors?",
        answer:
          "We position you as a concrete specialist with dedicated expertise, showing the quality and finish that generalists can't match.",
      },
    ],
  },
  {
    slug: "pool-services",
    name: "Pool Service",
    plural: "Pool Service Companies",
    keywords: [
      "pool service website",
      "pool cleaning website design",
      "pool maintenance website",
      "pool repair company website",
    ],
    painPoints: [
      "Recurring maintenance customers are hard to acquire online",
      "Seasonal opening/closing creates demand spikes",
      "Customers don't understand the value of professional maintenance",
      "Competing with DIY and big-box store alternatives",
    ],
    benefits: [
      "Recurring maintenance plan pages with easy signup",
      "Seasonal service pages for opening, closing, and winterization",
      "Educational content that positions you as the expert",
      "Local SEO to rank for 'pool service near me' searches",
    ],
    faqs: [
      {
        question: "Can you help me sign up recurring maintenance customers?",
        answer:
          "We create dedicated maintenance plan pages that explain your services, pricing tiers, and benefits—making it easy for customers to commit.",
      },
      {
        question: "What about seasonal pool services?",
        answer:
          "We build pages for pool opening, closing, and winterization that rank when homeowners search for these seasonal services.",
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
