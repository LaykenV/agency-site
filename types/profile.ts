export const PROJECT_STATUSES = [
  "AWAITING_PAYMENT",
  "AWAITING_ASSETS",
  "IN_PROGRESS",
  "IN_REVIEW",
  "LIVE",
  "ARCHIVED",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export type NeedOption =
  | "simple_site"
  | "lead_generation"
  | "blog_cms"
  | "ecommerce"
  | "custom";

export type PrimaryActionOption = "contact" | "book_call" | "not_sure";

export type TimelineOption = "asap" | "date";

export type PlanTierOption = "starter" | "professional" | "enterprise";

export type Timeline = {
  option: TimelineOption;
  date: string | null;
};

export type PlanRecommendation = {
  headline: string;
  summary: string;
  price: string;
  pages: Array<string>;
  features: Array<string>;
  aiEditorAccess: boolean;
  deliverableNotes?: string;
};

export type AiProposal = {
  generatedAt: number;
  promptVersion: string;
  tiers: {
    starter: PlanRecommendation;
    professional: PlanRecommendation;
    enterprise: PlanRecommendation;
  };
};

export type PlanState = {
  tierId: string | null;
  recommendedOn: number | null;
  aiProposal?: AiProposal;
};

export type PaymentStatus = {
  status: string;
  providerIntentId: string | null;
};

export type SubscriptionStatus = {
  stripeSubscriptionId: string;
  status: string;
  currentPeriodEnd: number;
};

export type PostPayBrand = {
  logoStatus: "ready" | "not_yet";
  photoStatus: "ready" | "not_yet";
  styleVibe: string | null;
  logoUrl?: string;
  imageUrls?: Array<string>;
};

export type PostPayState = {
  headline: string | null;
  domainPreference: string | null;
  inspirationLinks: Array<string>;
  functionalRequirements: string | null;
  brand: PostPayBrand;
  brandAssetsUploaded: boolean;
};

export type DeploymentState = {
  liveUrl?: string;
  stagingUrl?: string;
  vercelProjectId?: string;
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

export const defaultProfile: OnboardingBrief = {
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
    fields: ["contactName", "contactEmail", "companyName"] satisfies Array<OnboardingField>,
  },
  needs: {
    id: "needs",
    title: "What are you trying to accomplish?",
    caption: "Pick the option that best fits what you need right now.",
    fields: ["businessDescription", "industry", "primaryNeed", "primaryAction", "timeline"] satisfies Array<OnboardingField>,
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

