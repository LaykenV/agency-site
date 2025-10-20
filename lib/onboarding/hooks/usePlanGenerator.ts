"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ProspectDetails, ProspectPlan } from "@/types/prospect";

type UsePlanGeneratorOptions = {
  sessionId: string | null;
  resumeToken: string | null;
  details: ProspectDetails;
  remotePlan: ProspectPlan | undefined;
  onError?: () => void;
};

type UsePlanGeneratorResult = {
  isGenerating: boolean;
  generate: () => Promise<void>;
};

export function usePlanGenerator({
  sessionId,
  resumeToken,
  details,
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
        details,
      });
    } catch (error) {
      console.error("Failed to generate plan", error);
      setIsGenerating(false);
      onError?.();
      throw error;
    }
  }, [sessionId, resumeToken, details, generatePlanMutation, onError]);

  return {
    isGenerating,
    generate,
  };
}

