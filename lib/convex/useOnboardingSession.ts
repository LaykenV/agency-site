"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  OnboardingBrief,
  OnboardingField,
  PlanProposal,
  PlanTierOption,
  defaultBrief,
} from "@/types/profile";

const SESSION_STORAGE_KEY = "onboarding_session";

type StoredSession = {
  sessionId: string;
  resumeToken: string;
};

type UseOnboardingSessionOptions = {
  onError?: () => void;
  authStatusLoaded?: boolean;
};

type SessionState = {
  sessionId: string | null;
  resumeToken: string | null;
  brief: OnboardingBrief;
  plan: PlanProposal | undefined;
  selectedTier: PlanTierOption | null;
  recommendedTier: PlanTierOption | null;
};

export function useOnboardingSession({
  onError,
  authStatusLoaded = true,
}: UseOnboardingSessionOptions = {}) {
  const [sessionState, setSessionState] = useState<SessionState>({
    sessionId: null,
    resumeToken: null,
    brief: defaultBrief,
    plan: undefined,
    selectedTier: null,
    recommendedTier: null,
  });
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [dirtyFields, setDirtyFields] = useState<Set<OnboardingField>>(new Set());
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const initializingRef = useRef(false);

  const initSession = useMutation(api.onboarding_sessions.initSession);
  const updateBrief = useMutation(api.onboarding_sessions.updateBrief);
  const regeneratePlanMutation = useMutation(api.plans.regeneratePlan);
  const setSelectedTier = useMutation(api.onboarding_sessions.setSelectedTier);

  const sessionQuery = useQuery(
    api.onboarding_sessions.getSession,
    sessionState.sessionId ? { sessionId: sessionState.sessionId } : "skip",
  );
  const currentUserProfile = useQuery(api.auth.getCurrentUserProfile);

  useEffect(() => {
    if (!authStatusLoaded) return;
    if (currentUserProfile === undefined) return;

    if (currentUserProfile && currentUserProfile.sessionId) {
      setSessionState({
        sessionId: currentUserProfile.sessionId,
        resumeToken: currentUserProfile.resumeToken,
        brief: {
          ...defaultBrief,
          ...currentUserProfile.brief,
        },
        plan: currentUserProfile.plan,
        selectedTier: currentUserProfile.planTier ?? null,
        recommendedTier: currentUserProfile.plan?.recommendedTier ?? null,
      });
      setIsHydrated(true);
      if (typeof window !== "undefined") {
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
      return;
    }

    if (!sessionState.sessionId && !initializingRef.current) {
      initializeAnonymousSession().catch(() => onError?.());
    }
  }, [authStatusLoaded, currentUserProfile]);

  useEffect(() => {
    if (!sessionState.sessionId) return;
    if (sessionQuery === undefined) return;
    if (!sessionQuery) return;
    if (isHydrated && currentUserProfile) return;

    setSessionState((prev) => ({
      ...prev,
      sessionId: sessionQuery.sessionId,
      resumeToken: sessionQuery.resumeToken,
      brief: {
        ...defaultBrief,
        ...sessionQuery.brief,
      },
      plan: sessionQuery.plan ?? undefined,
      selectedTier: sessionQuery.selectedTier,
      recommendedTier: sessionQuery.recommendedTier,
    }));
    setIsHydrated(true);
  }, [sessionQuery, sessionState.sessionId, isHydrated, currentUserProfile]);

  useEffect(() => {
    if (!dirtyFields.size || !sessionState.sessionId) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      const payload = Object.fromEntries(
        Array.from(dirtyFields).map((field) => [field, sessionState.brief[field]]),
      );

      try {
        setIsSaving(true);
        await updateBrief({
          sessionId: sessionState.sessionId!,
          brief: payload,
        });
        setDirtyFields(new Set());
      } catch (error) {
        console.error("Failed to update brief", error);
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
  }, [dirtyFields, sessionState.brief, sessionState.sessionId, updateBrief, onError]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const write = useCallback(
    <K extends OnboardingField>(field: K, value: OnboardingBrief[K]) => {
      setSessionState((prev) => ({
        ...prev,
        brief: {
          ...prev.brief,
          [field]: value,
        },
      }));
      setDirtyFields((prev) => {
        const next = new Set(prev);
        next.add(field);
        return next;
      });
    },
    [],
  );

  const regeneratePlan = useCallback(async () => {
    if (!sessionState.sessionId) return;
    try {
      setIsGeneratingPlan(true);
      await regeneratePlanMutation({ sessionId: sessionState.sessionId });
    } catch (error) {
      console.error("Failed to regenerate plan", error);
      onError?.();
    } finally {
      setIsGeneratingPlan(false);
    }
  }, [regeneratePlanMutation, sessionState.sessionId, onError]);

  const selectTier = useCallback(
    async (tier: PlanTierOption | null) => {
      if (!sessionState.sessionId) return;
      try {
        await setSelectedTier({ sessionId: sessionState.sessionId, tier });
        setSessionState((prev) => ({
          ...prev,
          selectedTier: tier,
        }));
      } catch (error) {
        console.error("Failed to set selected tier", error);
        onError?.();
      }
    },
    [sessionState.sessionId, setSelectedTier, onError],
  );

  const session = useMemo(() => {
    if (!sessionState.sessionId) {
      return null;
    }

    return {
      sessionId: sessionState.sessionId,
      resumeToken: sessionState.resumeToken,
      brief: sessionState.brief,
      plan: sessionState.plan,
      selectedTier: sessionState.selectedTier,
      recommendedTier: sessionState.recommendedTier,
    };
  }, [sessionState]);

  const initializeAnonymousSession = useCallback(async () => {
    if (!authStatusLoaded) return;
    if (initializingRef.current) return;

    initializingRef.current = true;
    try {
      const stored = typeof window !== "undefined" ? localStorage.getItem(SESSION_STORAGE_KEY) : null;
      if (stored) {
        const parsed: StoredSession = JSON.parse(stored);
        setSessionState((prev) => ({
          ...prev,
          sessionId: parsed.sessionId,
          resumeToken: parsed.resumeToken,
        }));
        return;
      }

      const result = await initSession({});
      setSessionState((prev) => ({
        ...prev,
        sessionId: result.sessionId,
        resumeToken: result.resumeToken,
      }));

      if (typeof window !== "undefined") {
        localStorage.setItem(
          SESSION_STORAGE_KEY,
          JSON.stringify({ sessionId: result.sessionId, resumeToken: result.resumeToken }),
        );
      }
    } catch (error) {
      console.error("Failed to initialize session", error);
      onError?.();
    } finally {
      initializingRef.current = false;
    }
  }, [authStatusLoaded, initSession, onError]);

  return {
    sessionId: session?.sessionId ?? null,
    session,
    brief: sessionState.brief,
    plan: sessionState.plan,
    selectedTier: sessionState.selectedTier,
    recommendedTier: sessionState.recommendedTier,
    isHydrated,
    isSaving,
    isGeneratingPlan,
    dirtyFields,
    write,
    regeneratePlan,
    selectTier,
  } as const;
}
