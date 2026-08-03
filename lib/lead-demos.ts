export type LeadDemoService = {
  name: string;
  description: string;
};

export type LeadDemoImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption: string;
};

type LeadDemoBase = {
  slug: string;
  businessName: string;
  tagline: string;
  location: string;
  phoneDisplay: string;
  phoneHref: string;
  smsHref: string;
  logo: LeadDemoImage;
  hero: LeadDemoImage;
  services: LeadDemoService[];
};

/** Blush editorial template — soft consumer services (cleaning, care, hospitality). */
export type LeadDemoSoftService = LeadDemoBase & {
  template: "soft-service";
  headline: string;
  description: string;
  serviceArea: string;
  email: string;
  recommendation: {
    score: string;
    count: string;
    sourceLabel: string;
    sourceHref: string;
  };
  work: LeadDemoImage[];
  steps: Array<{
    title: string;
    description: string;
  }>;
};

/**
 * Photographic template — licensed trades whose proof is the finished work
 * (marine construction, fencing, concrete, roofing, site work).
 */
export type LeadDemoTradeField = LeadDemoBase & {
  template: "trade-field";
  /** Short credential line under the wordmark. Only facts the business states publicly. */
  credential: string;
  lede: {
    heading: string;
    body: string;
  };
  scope: {
    heading: string;
    note: string;
  };
  /** Full-bleed photo bands between the text bands. */
  plates: LeadDemoImage[];
  starting: {
    heading: string;
    body: string[];
  };
  contact: {
    heading: string;
    note: string;
  };
  email?: string;
};

export type LeadDemo = LeadDemoSoftService | LeadDemoTradeField;

const leadDemos: Record<string, LeadDemo> = {
  "shays-cleaning-services": {
    slug: "shays-cleaning-services",
    template: "soft-service",
    businessName: "Shay’s Cleaning Services",
    tagline: "Where clean meets chic.",
    headline: "Come home to clean.",
    description:
      "High-quality home and office cleaning with a personal touch—from deep cleans and organization to the details most people miss.",
    location: "Lafayette, Louisiana",
    serviceArea: "Serving local areas, with travel available",
    phoneDisplay: "337-280-1584",
    phoneHref: "tel:+13372801584",
    smsHref: "sms:+13372801584",
    email: "shaylaestelle@gmail.com",
    logo: {
      src: "/demos/shays-cleaning-services/logo.jpg",
      alt: "Shay’s Cleaning Services floral logo",
      width: 1320,
      height: 1320,
      caption: "Shay’s Cleaning Services",
    },
    hero: {
      src: "/demos/shays-cleaning-services/hero.jpg",
      alt: "Cleaning supplies arranged on a soft pink background",
      width: 1320,
      height: 850,
      caption: "A personal touch, down to the last detail.",
    },
    recommendation: {
      score: "100%",
      count: "8 recommendations",
      sourceLabel: "Facebook",
      sourceHref: "https://www.facebook.com/profile.php?id=61586946914344",
    },
    services: [
      {
        name: "Home cleaning",
        description:
          "Reliable upkeep shaped around the way your household lives.",
      },
      {
        name: "Deep cleaning",
        description:
          "Extra attention for built-up grime, overlooked corners, and hard-working rooms.",
      },
      {
        name: "Organization",
        description:
          "Calmer, more useful spaces without adding another project to your list.",
      },
      {
        name: "Office cleaning",
        description:
          "A cleaner workspace for local teams, customers, and busy weekdays.",
      },
      {
        name: "Light yard work",
        description:
          "A little help outside when the finishing touches extend past the front door.",
      },
    ],
    work: [
      {
        src: "/demos/shays-cleaning-services/work-01.jpg",
        alt: "Oven interior before a deep clean",
        width: 2048,
        height: 1536,
        caption: "Before",
      },
      {
        src: "/demos/shays-cleaning-services/work-02.jpg",
        alt: "Oven door glass after detailed cleaning",
        width: 1536,
        height: 2048,
        caption: "Detail work",
      },
      {
        src: "/demos/shays-cleaning-services/work-03.jpg",
        alt: "Oven interior after a deep clean",
        width: 2048,
        height: 1536,
        caption: "After",
      },
    ],
    steps: [
      {
        title: "Tell Shay what needs attention.",
        description:
          "Home, office, one deep-clean project, or a recurring routine—start with what would help most.",
      },
      {
        title: "Get a free quote.",
        description:
          "Call or text to talk through the space, timing, and the level of cleaning you need.",
      },
      {
        title: "Enjoy the reset.",
        description:
          "Shay handles the details so you can get back to your home, work, and week.",
      },
    ],
  },

  "gator-constructors": {
    slug: "gator-constructors",
    template: "trade-field",
    businessName: "Gator Constructors",
    tagline: "Marine construction",
    credential: "Marine construction · License #07345 · Acadiana, Louisiana",
    location: "Acadiana, Louisiana",
    phoneDisplay: "(337) 302-4814",
    phoneHref: "tel:+13373024814",
    smsHref: "sms:+13373024814",
    logo: {
      src: "/demos/gator-constructors/logo.jpg",
      alt: "Gator Constructors logo — a gator’s eyes above the waterline",
      width: 800,
      height: 800,
      caption: "Gator Constructors",
    },
    hero: {
      src: "/demos/gator-constructors/hero.jpg",
      alt: "A covered boat dock built over a canal, with camps along the far bank",
      width: 946,
      height: 532,
      caption: "Covered slip, canal-side.",
    },
    lede: {
      heading: "Docks, bulkheads, and the ground underneath.",
      body: "Gator Constructors builds on the water — boat docks and covered slips, bulkheads that hold a bank in place, site work, and the permitting that comes with all of it. Licensed marine construction, #07345.",
    },
    scope: {
      heading: "What we build.",
      note: "Call with the spot and the job. Estimates are free.",
    },
    services: [
      {
        name: "Docks",
        description:
          "Boat docks, covered slips, and walkways built for the water they sit in.",
      },
      {
        name: "Bulkheads",
        description:
          "Shoreline and canal bulkheads to hold a bank where it belongs.",
      },
      {
        name: "Barge rentals",
        description:
          "Barge equipment for work that has to be reached from the water.",
      },
      {
        name: "Site work",
        description:
          "Clearing, fill, and grading to get the ground ready before anything goes up.",
      },
      {
        name: "Permitting",
        description:
          "Working through the permits a waterfront project needs before the first piling.",
      },
    ],
    plates: [
      {
        src: "/demos/gator-constructors/plate-01.jpg",
        alt: "A finished wooden dock with an L-shaped head extending over open water",
        width: 944,
        height: 1260,
        caption: "L-head dock, open water.",
      },
      {
        src: "/demos/gator-constructors/plate-02.jpg",
        alt: "A wooden walkway running from a grass bank out to a dock platform",
        width: 944,
        height: 1260,
        caption: "Walkway off the bank.",
      },
    ],
    starting: {
      heading: "How a job starts.",
      body: [
        "Call or text with where the project is and a couple of photos of the spot. That is usually enough to say whether it is something we build.",
        "From there we come look at it, put a number on paper, and tell you straight what the permit picture looks like before anything gets ordered.",
      ],
    },
    contact: {
      heading: "Talk to us about the job.",
      note: "Call or text. Free estimates.",
    },
  },
};

export function getLeadDemo(slug: string) {
  return leadDemos[slug];
}

export function getLeadDemoSlugs() {
  return Object.keys(leadDemos);
}
