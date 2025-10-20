import type { Doc } from "@/convex/_generated/dataModel";

type OnboardingSessionDoc = Doc<"onboarding_sessions">;

export type OnboardingBrief = OnboardingSessionDoc["brief"];
export type OnboardingPlan = NonNullable<OnboardingSessionDoc["plan"]>;
export type OnboardingPlanCore = Omit<OnboardingPlan, "generatedAt">;
export type PlanProposal = OnboardingPlan;

export type OnboardingField = keyof OnboardingBrief;

export type OnboardingSession = Pick<
  OnboardingSessionDoc,
  "sessionId" | "resumeToken" | "brief" | "plan" | "createdAt" | "updatedAt"
>;

export const defaultBrief: OnboardingBrief = {
  contactName: "",
  contactEmail: "",
  companyName: "",
  phone: "",
  currentWebsite: "",
  businessDescription: "",
  goals: "",
  notes: "",
};

