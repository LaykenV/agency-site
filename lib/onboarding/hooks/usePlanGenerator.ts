"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { OnboardingBrief, OnboardingPlan } from "@/types/onboarding";

type UsePlanGeneratorOptions = {
  sessionId: string | null;
  resumeToken: string | null;
  brief: OnboardingBrief;
  remotePlan: OnboardingPlan | undefined;
  onError?: () => void;
};

type UsePlanGeneratorResult = {
  isGenerating: boolean;
  generate: () => Promise<void>;
};

export function usePlanGenerator({
  sessionId,
  resumeToken,
  brief,
  remotePlan,
  onError,
}: UsePlanGeneratorOptions): UsePlanGeneratorResult {
  const [isGenerating, setIsGenerating] = useState(false);
  const latestPlanTimestampRef = useRef<number | null>(null);

  const generatePlanMutation = useMutation(api.onboarding.sessions.generatePlan);

  useEffect(() => {
    const planTimestamp = remotePlan?.generatedAt ?? null;
    if (planTimestamp !== latestPlanTimestampRef.current) {
      latestPlanTimestampRef.current = planTimestamp;
      setIsGenerating(false);
    }
  }, [remotePlan]);

  const generate = useCallback(async () => {
    if (!sessionId || !resumeToken) {
      throw new Error("Session not initialized");
    }

    try {
      setIsGenerating(true);
      await generatePlanMutation({
        sessionId,
        resumeToken,
        brief,
      });
    } catch (error) {
      console.error("Failed to generate plan", error);
      setIsGenerating(false);
      onError?.();
      throw error;
    }
  }, [sessionId, resumeToken, brief, generatePlanMutation, onError]);

  return {
    isGenerating,
    generate,
  };
}

