import type { PlanProposal, PlanTierOption } from "./profile";
import type { ProjectStatus } from "./types";

export type Project = {
  authUserId: string;
  projectId: string;
  onboardingSessionId?: string;
  planTier: PlanTierOption | null;
  planProposal?: PlanProposal;
  projectStatus?: ProjectStatus;
  paymentStatus?: PaymentStatus;
  postPay?: PostPaymentDetails;
  deployment?: DeploymentDetails;
};

export type PaymentStatus = {
  status: string;
  providerIntentId: string | null;
};

export type PostPaymentDetails = {
  headline: string | null;
  domainPreference: string | null;
  inspirationLinks: Array<string>;
  functionalRequirements: string | null;
  brand: {
    logoStatus: "ready" | "not_yet";
    photoStatus: "ready" | "not_yet";
    styleVibe: string | null;
    logoUrl?: string;
    imageUrls?: Array<string>;
  };
  brandAssetsUploaded: boolean;
};

export type DeploymentDetails = {
  liveUrl?: string;
  stagingUrl?: string;
  vercelProjectId?: string;
};
