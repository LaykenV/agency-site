import { v } from "convex/values";

export const briefValidator = v.object({
  contactName: v.string(),
  contactEmail: v.string(),
  companyName: v.string(),
  phone: v.string(),
  currentWebsite: v.string(),
  businessDescription: v.string(),
  goals: v.string(),
  notes: v.string(),
});

export const planValidator = v.object({
  generatedAt: v.number(),
  promptVersion: v.string(),
  headline: v.string(),
  summary: v.string(),
  highlights: v.array(v.string()),
  nextSteps: v.array(v.string()),
});

export const PLAN_GENERATION_THROTTLE_MS = 15_000;
export const PLAN_TEXT_MAX_LENGTH = 280;
export const SESSION_EXPIRY_DAYS = 30;

