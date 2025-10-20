import type { Doc } from "@/convex/_generated/dataModel";

type ProspectDoc = Doc<"prospects">;

export type ProspectDetails = ProspectDoc["details"];
export type ProspectPlan = NonNullable<ProspectDoc["aiGeneratedPlan"]>;
export type ProspectPlanCore = Omit<ProspectPlan, "generatedAt">;

export type ProspectField = keyof ProspectDetails;

export type ProspectSession = Pick<
  ProspectDoc,
  | "sessionId"
  | "resumeToken"
  | "details"
  | "aiGeneratedPlan"
  | "createdAt"
  | "updatedAt"
>;

export const defaultProspectDetails: ProspectDetails = {
  contactName: "",
  contactEmail: "",
  companyName: "",
  phone: "",
  currentWebsite: "",
  businessDescription: "",
  goals: "",
  notes: "",
};

