import { groq } from "@ai-sdk/groq";
import { Agent } from "@convex-dev/agent";
import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import type { ActionCtx } from "../_generated/server";
import { components } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { briefValidator, PLAN_TEXT_MAX_LENGTH } from "../validators";

type OnboardingBrief = Doc<"onboarding_sessions">["brief"];
type OnboardingPlan = NonNullable<Doc<"onboarding_sessions">["plan"]>;
type OnboardingPlanCore = Omit<OnboardingPlan, "generatedAt">;

const onboardingAgentGroq = new Agent(components.agent, {
  name: "onboarding-agent-groq",
  languageModel: groq("openai/gpt-oss-120b"),
  instructions: [
    "You are the Agency Site onboarding strategist.",
    "Create a compelling one-plan recommendation for our All-Inclusive Plan (single $199/mo offering).",
    "Speak plainly to small service businesses—no jargon. Highlight partnership, ongoing support, and fast execution.",
    "Return JSON only, matching the schema. Do not include explanations outside JSON.",
  ].join(" "),
});

function buildPrompt(brief: OnboardingBrief) {
  const intro = [
    `Contact: ${brief.contactName || "Prospect"}`,
    `Email: ${brief.contactEmail || "Unavailable"}`,
    `Company: ${brief.companyName || "Unknown"}`,
  ];

  const optionalLines = [
    brief.phone ? `Phone: ${brief.phone}` : null,
    brief.currentWebsite ? `Current site: ${brief.currentWebsite}` : null,
  ].filter(Boolean);

  const briefLines = `Client brief:\n${[...intro, ...optionalLines,
    `Business description: ${brief.businessDescription || "Not provided"}`,
    `Primary goals: ${brief.goals || "Not provided"}`,
    `Additional notes: ${brief.notes || "None"}`,
  ].join("\n")}`;

  return `You are devising a single website proposal for our All-Inclusive Plan ($199 per month, $0 down).

${briefLines}

Create a persuasive yet practical recommendation that covers:
- headline: one short sentence describing the experience/outcome we will deliver.
- summary: a concise paragraph explaining how we will approach their needs.
- highlights: an array of 3-5 bullet points showing specific deliverables or benefits tailored to the brief (plain language, no jargon, <= 80 characters each).
- nextSteps: an array of 3 actionable steps the prospect should take (book call, share assets, etc.).

Tone: confident, collaborative, service-oriented. Focus on outcomes the client cares about (credibility, leads, peace of mind). Avoid technical jargon like CMS/RBAC; use plain equivalents.

Return JSON only with this exact TypeScript shape:
{
  "promptVersion": "string",
  "headline": "string",
  "summary": "string",
  "highlights": string[],
  "nextSteps": string[]
}

JSON only.`;
}

export const generateOnboardingPlan = internalAction({
  args: {
    brief: briefValidator,
  },
  returns: v.object({
    promptVersion: v.string(),
    headline: v.string(),
    summary: v.string(),
    highlights: v.array(v.string()),
    nextSteps: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    return await generatePlanWithAgent(ctx as ActionCtx, args.brief);
  },
});

export async function generatePlanWithAgent(
  ctx: ActionCtx,
  brief: OnboardingBrief,
): Promise<OnboardingPlanCore> {
  const prompt = buildPrompt(brief);

  const thread = await onboardingAgentGroq.createThread(ctx, {
    title: `Onboarding plan for ${brief.companyName || "prospect"}`,
    summary: brief.businessDescription.slice(0, 200),
  });

  const response = await onboardingAgentGroq.generateText(ctx, thread, {
    prompt,
  });

  let parsed: OnboardingPlanCore | null = null;
  try {
    parsed = JSON.parse(response.text ?? "");
  } catch (error) {
    console.error("[generateProjectPlans] Failed to parse AI response", error, {
      text: response.text,
    });
  }

  if (!parsed || !Array.isArray(parsed.highlights) || !Array.isArray(parsed.nextSteps)) {
    return fallbackPlan();
  }

  return {
    promptVersion: parsed.promptVersion || "groq.v1",
    headline: sanitizeString(parsed.headline, "Launch a site that works as hard as you do"),
    summary: sanitizeString(
      parsed.summary,
      "We’ll design, build, host, and maintain a high-performing site so you can stay focused on the business."
    ),
    highlights: sanitizeList(parsed.highlights, [
      "Custom-designed Next.js site tailored to your brand",
      "Unlimited updates handled by our team",
      "Domain, hosting, security, and analytics included",
    ]),
    nextSteps: sanitizeList(parsed.nextSteps, [
      "Book a 15-minute call to confirm fit",
      "Share brand assets or inspiration",
      "We’ll align on launch timeline and kickoff",
    ]),
  } satisfies OnboardingPlanCore;
}
function sanitizeString(value: unknown, fallback: string): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed.slice(0, PLAN_TEXT_MAX_LENGTH);
    }
  }
  return fallback;
}

function sanitizeList(value: unknown, fallback: Array<string>): Array<string> {
  if (Array.isArray(value)) {
    const cleaned = value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean)
      .slice(0, 6);
    if (cleaned.length) {
      return cleaned;
    }
  }
  return fallback;
}

export function fallbackPlan(): OnboardingPlanCore {
  return {
    promptVersion: "fallback.v1",
    headline: "Launch a confident website with an on-call web team",
    summary:
      "We’ll design, build, host, and iterate on your site so you get a polished online presence without juggling freelancers or DIY builders.",
    highlights: [
      "Custom Next.js site tailored to your services",
      "Unlimited copy and design updates",
      "Domain, hosting, security, and analytics included",
    ],
    nextSteps: [
      "Schedule a 15-minute fit call",
      "Share any brand assets or inspiration",
      "We’ll confirm goals and align launch timeline",
    ],
  } satisfies OnboardingPlanCore;
}
