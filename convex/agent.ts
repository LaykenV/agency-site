import { groq } from "@ai-sdk/groq";
import { Agent } from "@convex-dev/agent";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { components } from "./_generated/api";
import {
  PLAN_TIER_BASELINES,
  PlanTierOption,
} from "../types/profile";

type TierPayload = {
  headline: string;
  tierSummary: string;
  summary: string;
  pages: Array<string>;
  features: Array<string>;
  deliverableNotes: string;
};

type PlanGenerationResponse = {
  promptVersion: string;
  recommendedTier: PlanTierOption | null;
  tiers: Record<PlanTierOption, TierPayload>;
};

const onboardingAgentGroq = new Agent(components.agent, {
  name: "onboarding-agent-groq",
  languageModel: groq("openai/gpt-oss-120b"),
  instructions: [
    "You are the Agency Site onboarding strategist.",
    "Use the Agency build blueprint and today's prompts to recommend website plans in plain English.",
    "Starter keeps it simple for credibility. Professional adds one custom feature and conversions. Enterprise builds tailored workflows and portals.",
    "Respect pricing: Starter $1,000 setup + $99/mo, Professional $2,500 setup + $149/mo, Enterprise $5,000+ setup + $249+/mo.",
    "Never mention CMS, RBAC, SEO, or KPI. Use plain alternatives like ‘Blog you can update yourself’.",
    "Always include delivery timing inside deliverableNotes and mention the planning call for Professional and Enterprise tiers.",
    "Return JSON only, matching the schema. Do not include explanations outside JSON.",
  ].join(" "),
});

function buildPrompt(args: {
  brief: {
    contactName: string;
    contactEmail: string;
    companyName: string;
    businessDescription: string;
    industry: string;
    primaryNeed: string;
    primaryAction: string;
    timeline: { option: string; date: string | null };
    additionalNotes: string;
    termsAccepted: boolean;
  };
  priorTierId: PlanTierOption | null;
}) {
  const { brief, priorTierId } = args;
  const timelineSummary =
    brief.timeline.option === "date"
      ? `Target launch date: ${brief.timeline.date ?? "TBD"}.`
      : "Timeline: As soon as possible.";
  const emailLine = brief.contactEmail ? `- Email: ${brief.contactEmail}\n` : "";

  const baselineDescription = (tier: PlanTierOption) => {
    const baseline = PLAN_TIER_BASELINES[tier];
    return `- ${tier.toUpperCase()} baseline: ${baseline.headline}. Pricing: ${baseline.deliverableNotes}.`;
  };

  return `Craft tailored website project plans for an agency onboarding flow.

CLIENT BRIEF
- Contact: ${brief.contactName || "Prospect"}
- Email: ${brief.contactEmail || "Unavailable"}
- Company: ${brief.companyName || "Unknown"}
- Industry: ${brief.industry || "General"}
- Need: ${brief.primaryNeed}
- Primary action: ${brief.primaryAction}
- Summary: ${brief.businessDescription}
- Additional notes: ${brief.additionalNotes || "None"}
- ${timelineSummary}

TIERS & PRICING
${baselineDescription("starter")}
${baselineDescription("professional")}
${baselineDescription("enterprise")}

GUIDELINES
- Starter: focus on credibility, fast launch, and a clear contact path.
- Professional: include one custom feature, booking or inquiry flow, and marketing follow-up.
- Enterprise: emphasize outcomes, tailored workflows, and ongoing partnership.
- Do not repeat the global inclusions list. Focus on tier-specific value.
- Headline should sell the tier; tierSummary is one sentence for the card; summary gives extra context.
- Pages must be relevant to the brief and tier. Features should be benefits, not jargon.
- deliverableNotes must contain the delivery timeline exactly as provided in baselines.
- Return recommendedTier when it is obvious based on need or timeline; otherwise use null.
- If priorTierId is provided, ensure output still helps compare tiers even if that tier is preselected.
- Respond with JSON only, matching this TypeScript type:
{
  "promptVersion": "string",
  "recommendedTier": "starter" | "professional" | "enterprise" | null,
  "tiers": {
    "starter": {
      "headline": "string",
      "tierSummary": "string",
      "summary": "string",
      "pages": string[],
      "features": string[],
      "deliverableNotes": "string"
    },
    "professional": {
      "headline": "string",
      "tierSummary": "string",
      "summary": "string",
      "pages": string[],
      "features": string[],
      "deliverableNotes": "string"
    },
    "enterprise": {
      "headline": "string",
      "tierSummary": "string",
      "summary": "string",
      "pages": string[],
      "features": string[],
      "deliverableNotes": "string"
    }
  }
}

ONLY OUTPUT JSON.`;
}

export const generateProjectPlans = internalAction({
  args: {
    brief: v.object({
      contactName: v.string(),
      contactEmail: v.string(),
      companyName: v.string(),
      businessDescription: v.string(),
      industry: v.string(),
      primaryNeed: v.string(),
      primaryAction: v.string(),
      timeline: v.object({
        option: v.string(),
        date: v.union(v.string(), v.null()),
      }),
      additionalNotes: v.string(),
      termsAccepted: v.boolean(),
    }),
    priorTierId: v.union(
      v.literal("starter"),
      v.literal("professional"),
      v.literal("enterprise"),
      v.null(),
    ),
  },
  returns: v.object({
    promptVersion: v.string(),
    recommendedTier: v.union(
      v.literal("starter"),
      v.literal("professional"),
      v.literal("enterprise"),
      v.null(),
    ),
    tiers: v.object({
      starter: v.object({
        headline: v.string(),
        tierSummary: v.string(),
        summary: v.string(),
        pages: v.array(v.string()),
        features: v.array(v.string()),
        deliverableNotes: v.string(),
      }),
      professional: v.object({
        headline: v.string(),
        tierSummary: v.string(),
        summary: v.string(),
        pages: v.array(v.string()),
        features: v.array(v.string()),
        deliverableNotes: v.string(),
      }),
      enterprise: v.object({
        headline: v.string(),
        tierSummary: v.string(),
        summary: v.string(),
        pages: v.array(v.string()),
        features: v.array(v.string()),
        deliverableNotes: v.string(),
      }),
    }),
  }),
  handler: async (ctx, args) => {
    const prompt = buildPrompt(args);

    const thread = await onboardingAgentGroq.createThread(ctx, {
      title: `Onboarding plan for ${args.brief.companyName || "prospect"}`,
      summary: args.brief.businessDescription.slice(0, 200),
    });

    const response = await onboardingAgentGroq.generateText(ctx, thread, {
      prompt,
    });

    let parsed: PlanGenerationResponse | null = null;
    try {
      parsed = JSON.parse(response.text ?? "");
    } catch (error) {
      console.error("[generateProjectPlans] Failed to parse AI response", error, {
        text: response.text,
      });
    }

    if (!parsed || !parsed.tiers) {
      return fallbackPlanFromBaselines();
    }

    const tiers: Record<PlanTierOption, TierPayload> = {
      starter: normalizeTier(parsed.tiers.starter, "starter"),
      professional: normalizeTier(parsed.tiers.professional, "professional"),
      enterprise: normalizeTier(parsed.tiers.enterprise, "enterprise"),
    };

    return {
      promptVersion: parsed.promptVersion || "groq.v1",
      recommendedTier: parseTierOption(parsed.recommendedTier),
      tiers,
    } satisfies PlanGenerationResponse;
  },
});

function normalizeTier(input: unknown, tier: PlanTierOption): TierPayload {
  const baseline = PLAN_TIER_BASELINES[tier];
  if (!input || typeof input !== "object") {
    return {
      headline: baseline.headline,
      tierSummary: baseline.tierSummary,
      summary: baseline.summary,
      pages: baseline.pages,
      features: baseline.features,
      deliverableNotes: baseline.deliverableNotes,
    } satisfies TierPayload;
  }

  const { headline, tierSummary, summary, pages, features, deliverableNotes } = input as Record<string, unknown>;

  const safePages = Array.isArray(pages)
    ? pages
        .map((page) => (typeof page === "string" ? page.trim() : ""))
        .filter(Boolean)
        .slice(0, 12)
    : baseline.pages;

  const safeFeatures = Array.isArray(features)
    ? features
        .map((feature) => (typeof feature === "string" ? feature.trim() : ""))
        .filter(Boolean)
        .slice(0, 12)
    : baseline.features;

  return {
    headline: typeof headline === "string" && headline.trim() ? headline : baseline.headline,
    tierSummary:
      typeof tierSummary === "string" && tierSummary.trim()
        ? tierSummary
        : baseline.tierSummary,
    summary: typeof summary === "string" && summary.trim() ? summary : baseline.summary,
    pages: safePages,
    features: safeFeatures,
    deliverableNotes:
      typeof deliverableNotes === "string" && deliverableNotes.trim()
        ? deliverableNotes
        : baseline.deliverableNotes,
  } satisfies TierPayload;
}

function parseTierOption(value: unknown): PlanTierOption | null {
  if (value === "starter" || value === "professional" || value === "enterprise") {
    return value;
  }
  return null;
}

export function fallbackPlanFromBaselines(): PlanGenerationResponse {
  return {
    promptVersion: "fallback.v1",
    recommendedTier: null,
    tiers: {
      starter: {
        headline: PLAN_TIER_BASELINES.starter.headline,
        tierSummary: PLAN_TIER_BASELINES.starter.tierSummary,
        summary: PLAN_TIER_BASELINES.starter.summary,
        pages: PLAN_TIER_BASELINES.starter.pages,
        features: PLAN_TIER_BASELINES.starter.features,
        deliverableNotes: PLAN_TIER_BASELINES.starter.deliverableNotes,
      },
      professional: {
        headline: PLAN_TIER_BASELINES.professional.headline,
        tierSummary: PLAN_TIER_BASELINES.professional.tierSummary,
        summary: PLAN_TIER_BASELINES.professional.summary,
        pages: PLAN_TIER_BASELINES.professional.pages,
        features: PLAN_TIER_BASELINES.professional.features,
        deliverableNotes: PLAN_TIER_BASELINES.professional.deliverableNotes,
      },
      enterprise: {
        headline: PLAN_TIER_BASELINES.enterprise.headline,
        tierSummary: PLAN_TIER_BASELINES.enterprise.tierSummary,
        summary: PLAN_TIER_BASELINES.enterprise.summary,
        pages: PLAN_TIER_BASELINES.enterprise.pages,
        features: PLAN_TIER_BASELINES.enterprise.features,
        deliverableNotes: PLAN_TIER_BASELINES.enterprise.deliverableNotes,
      },
    },
  } satisfies PlanGenerationResponse;
}

