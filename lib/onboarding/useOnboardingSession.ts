"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { OnboardingBrief, OnboardingField, defaultBrief } from "@/types/onboarding";
import { useSessionInit, useSessionData, usePlanGenerator } from "./hooks";

type UseOnboardingSessionOptions = {
  onError?: () => void;
};

export function useOnboardingSession({ onError }: UseOnboardingSessionOptions = {}) {
  const [localBrief, setLocalBrief] = useState<OnboardingBrief>(defaultBrief);
  const [dirtyFields, setDirtyFields] = useState<Set<OnboardingField>>(new Set());

  const { sessionId, resumeToken, isInitializing, error: initError } = useSessionInit();

  const { remoteBrief, remotePlan, isHydrated } = useSessionData({
    sessionId,
    localBrief,
  });

  const hasSyncedInitialDataRef = useRef(false);

  useEffect(() => {
    if (!hasSyncedInitialDataRef.current && isHydrated) {
      setLocalBrief(remoteBrief);
      setDirtyFields(new Set());
      hasSyncedInitialDataRef.current = true;
    }
  }, [isHydrated, remoteBrief]);

  const brief = localBrief;

  const updateBriefMutation = useMutation(api.onboarding.sessions.updateBrief);

  const { isGenerating, generate } = usePlanGenerator({
    sessionId,
    resumeToken,
    brief: localBrief,
    remotePlan,
    onError,
  });

  const write = useCallback(
    <K extends OnboardingField>(field: K, value: OnboardingBrief[K]) => {
      setLocalBrief((prev) => ({
        ...prev,
        [field]: value,
      }));
      setDirtyFields((prev) => {
        const next = new Set(prev);
        next.add(field);
        return next;
      });
    },
    [],
  );

  const saveBrief = useCallback(async () => {
    if (!sessionId || !resumeToken) {
      throw new Error("Session not initialized");
    }

    if (dirtyFields.size === 0) {
      return;
    }

    try {
      await updateBriefMutation({
        sessionId,
        resumeToken,
        brief: localBrief,
      });
      setDirtyFields(new Set());
    } catch (error) {
      console.error("Failed to save onboarding brief", error);
      onError?.();
      throw error;
    }
  }, [sessionId, resumeToken, dirtyFields.size, updateBriefMutation, localBrief, onError]);

  const generatePlan = useCallback(async () => {
    if (!sessionId) {
      throw new Error("Session not initialized");
    }

    await saveBrief();

    await generate();
  }, [sessionId, saveBrief, generate]);

  const session = useMemo(() => {
    if (!sessionId) return null;

    return {
      sessionId,
      resumeToken,
      brief: localBrief,
      plan: remotePlan,
    };
  }, [sessionId, resumeToken, localBrief, remotePlan]);

  return {
    sessionId,
    session,
    brief,
    plan: remotePlan,
    isHydrated: isHydrated && !isInitializing,
    isGeneratingPlan: isGenerating,
    dirtyFields,
    write,
    generatePlan,
    initError,
  } as const;
}
