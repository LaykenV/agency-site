"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  type ProspectDetails,
  type ProspectField,
  defaultProspectDetails,
} from "@/types/prospect";
import { useSessionInit, useSessionData, usePlanGenerator } from "./hooks";

type UseOnboardingSessionOptions = {
  onError?: () => void;
};

export function useOnboardingSession({ onError }: UseOnboardingSessionOptions = {}) {
  const [localDetails, setLocalDetails] = useState<ProspectDetails>(defaultProspectDetails);
  const [dirtyFields, setDirtyFields] = useState<Set<ProspectField>>(new Set());

  const { sessionId, resumeToken, isInitializing, error: initError } = useSessionInit();

  const { remoteDetails, remotePlan, isHydrated } = useSessionData({
    sessionId,
    localDetails,
  });

  const hasSyncedInitialDataRef = useRef(false);

  useEffect(() => {
    if (!hasSyncedInitialDataRef.current && isHydrated) {
      setLocalDetails(remoteDetails);
      setDirtyFields(new Set());
      hasSyncedInitialDataRef.current = true;
    }
  }, [isHydrated, remoteDetails]);

  const details = localDetails;

  const updateDetailsMutation = useMutation(api.onboarding.sessions.updateDetails);

  const { isGenerating, generate } = usePlanGenerator({
    sessionId,
    resumeToken,
    details: localDetails,
    remotePlan,
    onError,
  });

  const write = useCallback(
    <K extends ProspectField>(field: K, value: ProspectDetails[K]) => {
      setLocalDetails((prev) => ({
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

  const saveDetails = useCallback(async () => {
    if (!sessionId || !resumeToken) {
      throw new Error("Session not initialized");
    }

    if (dirtyFields.size === 0) {
      return;
    }

    try {
      await updateDetailsMutation({
        sessionId,
        resumeToken,
        details: localDetails,
      });
      setDirtyFields(new Set());
    } catch (error) {
      console.error("Failed to save prospect details", error);
      onError?.();
      throw error;
    }
  }, [sessionId, resumeToken, dirtyFields.size, updateDetailsMutation, localDetails, onError]);

  const generatePlan = useCallback(async () => {
    if (!sessionId) {
      throw new Error("Session not initialized");
    }

    await saveDetails();

    await generate();
  }, [sessionId, saveDetails, generate]);

  const session = useMemo(() => {
    if (!sessionId) return null;

    return {
      sessionId,
      resumeToken,
      details: localDetails,
      plan: remotePlan,
    };
  }, [sessionId, resumeToken, localDetails, remotePlan]);

  return {
    sessionId,
    session,
    details,
    plan: remotePlan,
    isHydrated: isHydrated && !isInitializing,
    isGeneratingPlan: isGenerating,
    dirtyFields,
    write,
    generatePlan,
    initError,
  } as const;
}
