import { groq } from "@ai-sdk/groq";
import { components } from "./_generated/api";
import { Agent } from "@convex-dev/agent";

export const onboardingAgentGroq = new Agent(components.agent, {
    name: "onboarding-agent-groq",
    languageModel: groq("openai/gpt-oss-120b"),
    instructions: "You are a helpful assistant."
});

// function for creating project plans based on tiers and offers

// function for interacting with vercel domains api?