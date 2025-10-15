"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  OnboardingBrief,
  OnboardingField,
  defaultProfile,
  PlanState,
} from "@/types/profile";

type UseOnboardingProfileOptions = {
  onError?: () => void;
};

type DirtySet = Set<OnboardingField>;

export function useOnboardingProfile({
  onError,
}: UseOnboardingProfileOptions = {}) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [state, setState] = useState<OnboardingBrief>(defaultProfile);
  const [plan, setPlan] = useState<PlanState | undefined>(undefined);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [dirtyFields, setDirtyFields] = useState<DirtySet>(new Set());
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const fieldVersionsRef = useRef<Record<OnboardingField, number>>(
    Object.keys(defaultProfile).reduce(
      (acc, key) => {
        acc[key as OnboardingField] = 0;
        return acc;
      },
      {} as Record<OnboardingField, number>,
    ),
  );

  const initSession = useMutation(api.profiles.initSession);
  const updateProfile = useMutation(api.profiles.updateProfileBySession);
  const regeneratePlan = useMutation(api.config.regeneratePlan);
  const profile = useQuery(
    api.profiles.getProfileBySession,
    sessionId ? { sessionId } : "skip"
  );

  useEffect(() => {
    const initialise = async () => {
      if (sessionId) return;
      try {
        const result = await initSession({});
        setSessionId(result.sessionId);
      } catch {
        onError?.();
      }
    };
    void initialise();
  }, [initSession, onError, sessionId]);

  useEffect(() => {
    if (!profile) return;

    if (!isHydrated) {
      setState({
        ...defaultProfile,
        ...profile.brief,
      } as OnboardingBrief);
      setIsHydrated(true);
    }

    setPlan(profile.plan as PlanState | undefined);
  }, [profile, isHydrated]);

  useEffect(() => {
    if (!dirtyFields.size || !sessionId) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      const fieldsToFlush = Array.from(dirtyFields);
      if (!fieldsToFlush.length) {
        return;
      }

      const versionSnapshot = fieldsToFlush.map(
        (field) => fieldVersionsRef.current[field],
      );

      const payload = Object.fromEntries(
        fieldsToFlush.map((field) => [field, state[field]]),
      ) as Partial<OnboardingBrief>;

      try {
        setIsSaving(true);
        await updateProfile({
          sessionId,
          brief: payload,
        });
        setDirtyFields((prev) => {
          const next = new Set(prev);
          fieldsToFlush.forEach((field, index) => {
            if (fieldVersionsRef.current[field] === versionSnapshot[index]) {
              next.delete(field);
            }
          });
          return next;
        });
      } catch {
        onError?.();
      } finally {
        setIsSaving(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [dirtyFields, sessionId, state, updateProfile, onError]);

  const write = useCallback(
    <K extends OnboardingField>(field: K, value: OnboardingBrief[K]) => {
      setState((prev) => ({ ...prev, [field]: value }));
      setDirtyFields((prev) => {
        const next = new Set(prev);
        next.add(field);
        return next;
      });
      fieldVersionsRef.current[field] =
        (fieldVersionsRef.current[field] ?? 0) + 1;
    },
    []
  );

  const triggerPlanGeneration = useCallback(async () => {
    if (!sessionId) return;
    try {
      setIsGeneratingPlan(true);
      await regeneratePlan({ sessionId });
    } catch {
      onError?.();
    } finally {
      setIsGeneratingPlan(false);
    }
  }, [sessionId, regeneratePlan, onError]);

  return useMemo(
    () => ({
      sessionId,
      state,
      plan,
      isHydrated,
      isSaving,
      isGeneratingPlan,
      dirtyFields,
      write,
      regeneratePlan: triggerPlanGeneration,
    }),
    [
      sessionId,
      state,
      plan,
      isHydrated,
      isSaving,
      isGeneratingPlan,
      dirtyFields,
      write,
      triggerPlanGeneration,
    ],
  );
}

