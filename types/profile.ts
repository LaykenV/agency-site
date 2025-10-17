export const PLAN_TIERS = [
  "starter",
  "professional",
  "enterprise",
] as const;

export type PlanTierOption = (typeof PLAN_TIERS)[number];

export type NeedOption =
  | "simple_site"
  | "lead_generation"
  | "blog_cms"
  | "ecommerce"
  | "custom";

export type PrimaryActionOption = "contact" | "book_call" | "not_sure";

export type TimelineOption = "asap" | "date";

export type Timeline = {
  option: TimelineOption;
  date: string | null;
};

export type PlanTierDetails = {
  headline: string;
  tierSummary: string;
  summary: string;
  pages: Array<string>;
  features: Array<string>;
  deliverableNotes: string;
};

export type PlanProposal = {
  generatedAt: number;
  promptVersion: string;
  recommendedTier: PlanTierOption | null;
  tiers: Record<PlanTierOption, PlanTierDetails>;
};

export type OnboardingBrief = {
  contactName: string;
  contactEmail: string;
  companyName: string;
  businessDescription: string;
  industry: string;
  primaryNeed: NeedOption;
  primaryAction: PrimaryActionOption;
  timeline: Timeline;
  additionalNotes: string;
  termsAccepted: boolean;
};

export type OnboardingField = keyof OnboardingBrief;

export type OnboardingSession = {
  sessionId: string;
  resumeToken: string;
  brief: OnboardingBrief;
  plan?: PlanProposal;
  selectedTier: PlanTierOption | null;
  recommendedTier: PlanTierOption | null;
  createdAt: number;
  updatedAt: number;
};

export const PLAN_TIER_BASELINES: Record<PlanTierOption, PlanTierDetails> = {
  starter: {
    headline: "Launch a confident website fast.",
    tierSummary: "A clean, professional site that clearly explains what you do.",
    summary:
      "Get a polished marketing site with guided content so visitors know why to choose you.",
    pages: ["Home", "About", "Services", "Contact", "Legal"],
    features: [
      "Contact form that emails you",
      "Looks great on phones and desktops",
      "Shows up well on Google",
      "Built-in writing assistant (AI editor access)",
    ],
    deliverableNotes: "Delivery: 48 hours.",
  },
  professional: {
    headline: "Turn visitors into booked calls or inquiries.",
    tierSummary:
      "Everything in Starter plus one custom feature your business needs.",
    summary:
      "Add booking flows, content tools, and automations so leads convert while you work.",
    pages: ["Home", "About", "Services", "Case Studies", "Blog", "Contact"],
    features: [
      "Calendar booking or inquiry flow",
      "Blog you can update yourself",
      "Connect your mailing list",
      "One custom feature (we help you choose)",
    ],
    deliverableNotes: "Delivery: ~1 week. Planning call included.",
  },
  enterprise: {
    headline: "Custom website and tools tailored to your workflow.",
    tierSummary: "We design and build what you need, with room to grow.",
    summary:
      "Launch bespoke experiences, portals, and integrations that match how your team operates.",
    pages: ["Home", "Solutions", "Pricing", "Resources", "Client Area", "Contact"],
    features: [
      "Sign-in area for your team or clients",
      "Connect to the tools you already use",
      "Ongoing hosting and care",
    ],
    deliverableNotes: "Delivery: 2–3 weeks+. Planning call included.",
  },
};

export const defaultBrief: OnboardingBrief = {
  contactName: "",
  contactEmail: "",
  companyName: "",
  businessDescription: "",
  industry: "",
  primaryNeed: "simple_site",
  primaryAction: "contact",
  timeline: {
    option: "asap",
    date: null,
  },
  additionalNotes: "",
  termsAccepted: false,
};

export const NEED_OPTIONS: Array<{
  id: NeedOption;
  title: string;
  description: string;
}> = [
  {
    id: "simple_site",
    title: "Credible site",
    description: "Launch a simple, polished site to explain what you do.",
  },
  {
    id: "lead_generation",
    title: "Capture leads/booking",
    description: "Turn visitors into booked calls, demos, or consultations.",
  },
  {
    id: "blog_cms",
    title: "Blog / CMS",
    description: "Publish content regularly with modern authoring tools.",
  },
  {
    id: "ecommerce",
    title: "E-commerce",
    description: "Sell products with checkout, inventory, and tracking.",
  },
  {
    id: "custom",
    title: "Something custom",
    description: "I have a workflow or product experience in mind.",
  },
];

export const PRIMARY_ACTION_OPTIONS: Array<{
  id: PrimaryActionOption;
  title: string;
  description: string;
}> = [
  {
    id: "contact",
    title: "Contact us",
    description: "Visitors submit a form and we follow up manually.",
  },
  {
    id: "book_call",
    title: "Book a call",
    description: "Visitors schedule time directly on our calendar.",
  },
  {
    id: "not_sure",
    title: "Not sure",
    description: "We'll recommend the best fit once we learn more.",
  },
];

export const BRIEF_STEPS = {
  contact: {
    id: "contact",
    title: "Start with the basics",
    caption: "Tell us how to reach you and what you call your business.",
    fields: [
      "contactName",
      "contactEmail",
      "companyName",
    ] satisfies Array<OnboardingField>,
  },
  needs: {
    id: "needs",
    title: "What are you trying to accomplish?",
    caption: "Pick the option that best fits what you need right now.",
    fields: [
      "businessDescription",
      "industry",
      "primaryNeed",
      "primaryAction",
      "timeline",
    ] satisfies Array<OnboardingField>,
  },
  notes: {
    id: "notes",
    title: "Share context & confirm terms",
    caption: "Optional notes plus a quick agreement so we can craft your plan.",
    fields: ["additionalNotes", "termsAccepted"] satisfies Array<OnboardingField>,
  },
  summary: {
    id: "summary",
    title: "Review your plan",
    caption: "Preview the recommendations tailored to what you shared.",
    fields: [] satisfies Array<OnboardingField>,
  },
} as const;

export const orderedSteps = [
  {
    ...BRIEF_STEPS.contact,
    position: 1,
    nextEnabled: (state: OnboardingBrief) =>
      Boolean(state.contactName && state.contactEmail && state.companyName),
  },
  {
    ...BRIEF_STEPS.needs,
    position: 2,
    nextEnabled: (state: OnboardingBrief) => {
      if (!state.businessDescription || !state.primaryNeed) {
        return false;
      }
      if (state.timeline.option === "date") {
        return Boolean(state.timeline.date);
      }
      return true;
    },
  },
  {
    ...BRIEF_STEPS.notes,
    position: 3,
    nextEnabled: (state: OnboardingBrief) => state.termsAccepted,
  },
  {
    ...BRIEF_STEPS.summary,
    position: 4,
    nextEnabled: () => true,
  },
] as const;

export type OrderedStep = (typeof orderedSteps)[number];

