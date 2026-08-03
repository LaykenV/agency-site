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

export type LeadDemo = {
  slug: string;
  template: "soft-service";
  businessName: string;
  tagline: string;
  headline: string;
  description: string;
  location: string;
  serviceArea: string;
  phoneDisplay: string;
  phoneHref: string;
  smsHref: string;
  email: string;
  logo: LeadDemoImage;
  hero: LeadDemoImage;
  recommendation: {
    score: string;
    count: string;
    sourceLabel: string;
    sourceHref: string;
  };
  services: LeadDemoService[];
  work: LeadDemoImage[];
  steps: Array<{
    title: string;
    description: string;
  }>;
};

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
        description: "Reliable upkeep shaped around the way your household lives.",
      },
      {
        name: "Deep cleaning",
        description: "Extra attention for built-up grime, overlooked corners, and hard-working rooms.",
      },
      {
        name: "Organization",
        description: "Calmer, more useful spaces without adding another project to your list.",
      },
      {
        name: "Office cleaning",
        description: "A cleaner workspace for local teams, customers, and busy weekdays.",
      },
      {
        name: "Light yard work",
        description: "A little help outside when the finishing touches extend past the front door.",
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
        description: "Home, office, one deep-clean project, or a recurring routine—start with what would help most.",
      },
      {
        title: "Get a free quote.",
        description: "Call or text to talk through the space, timing, and the level of cleaning you need.",
      },
      {
        title: "Enjoy the reset.",
        description: "Shay handles the details so you can get back to your home, work, and week.",
      },
    ],
  },
};

export function getLeadDemo(slug: string) {
  return leadDemos[slug];
}

export function getLeadDemoSlugs() {
  return Object.keys(leadDemos);
}
