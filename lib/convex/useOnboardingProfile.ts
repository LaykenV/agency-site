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
  authStatusLoaded?: boolean;
};

type DirtySet = Set<OnboardingField>;

const SESSION_STORAGE_KEY = "onboarding_session";

type StoredSession = {
  sessionId: string;
  resumeToken: string;
};

export function useOnboardingProfile({
  onError,
  authStatusLoaded = true,
}: UseOnboardingProfileOptions = {}) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [state, setState] = useState<OnboardingBrief>(defaultProfile);
  const [plan, setPlan] = useState<PlanState | undefined>(undefined);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [dirtyFields, setDirtyFields] = useState<DirtySet>(new Set());
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const initializingRef = useRef(false);
  const hasCheckedProfile = useRef(false);
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

  // Get current authenticated user's profile if they're signed in
  const authProfile = useQuery(
    api.auth.getCurrentUserProfile
  );

  useEffect(() => {
    if (!authStatusLoaded) return;
    if (!authProfile) return;
    if (authProfile === undefined || authProfile === null) return;
    if (typeof window === "undefined") return;
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }, [authStatusLoaded, authProfile]);

  // Initialize session from localStorage or create new one
  useEffect(() => {
    const initialise = async () => {
      if (!authStatusLoaded) return;
      if (authProfile) return; // Skip if user is already authenticated with a profile
      if (sessionId || initializingRef.current) return;

      initializingRef.current = true;

      try {
        // Try to restore from localStorage first
        const stored = localStorage.getItem(SESSION_STORAGE_KEY);
        if (stored) {
          try {
            const parsed: StoredSession = JSON.parse(stored);
            setSessionId(parsed.sessionId);
            return;
          } catch (error) {
            console.error("Failed to parse session from localStorage:", error);
            localStorage.removeItem(SESSION_STORAGE_KEY);
          }
        }

        // Create new session if none exists
        const result = await initSession({});
        setSessionId(result.sessionId);
        
        // Persist to localStorage
        const sessionData: StoredSession = {
          sessionId: result.sessionId,
          resumeToken: result.resumeToken,
        };
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
      } catch (error) {
        console.error("Failed to initialize session:", error);
        onError?.();
      } finally {
        initializingRef.current = false;
      }
    };
    void initialise();
  }, [authProfile, authStatusLoaded, initSession, onError, sessionId]);

  useEffect(() => {
    if (!authStatusLoaded) return;
    if (authProfile === undefined) return; // Still loading
    if (authProfile === null) return; // Not authenticated or no profile yet

    // User is authenticated and has a profile - hydrate from it
    setSessionId(authProfile.sessionId);
    if (!isHydrated) {
      setState({
        ...defaultProfile,
        ...authProfile.brief,
      } as OnboardingBrief);
      setIsHydrated(true);
    } else {
      setState((prev) => ({
        ...prev,
        ...authProfile.brief,
      } as OnboardingBrief));
    }
    setPlan(authProfile.plan as PlanState | undefined);
    hasCheckedProfile.current = true;
  }, [authProfile, authStatusLoaded, isHydrated]);

  useEffect(() => {
    if (!sessionId) return;

    // Wait for initial query to complete
    if (profile === undefined) return; // Still loading

    // Handle stale localStorage: profile deleted but sessionId persists
    if (!authProfile && profile === null && !hasCheckedProfile.current) {
      console.warn("Stale session detected, clearing and reinitializing");
      localStorage.removeItem(SESSION_STORAGE_KEY);
      setSessionId(null); // Trigger reinitialization
      hasCheckedProfile.current = true;
      return;
    }

    // Hydrate state from profile (only for anonymous sessions)
    if (profile && !isHydrated && !authProfile) {
      setState({
        ...defaultProfile,
        ...profile.brief,
      } as OnboardingBrief);
      setIsHydrated(true);
      hasCheckedProfile.current = true;
    }

    // Update plan state (only for anonymous sessions)
    if (profile && !authProfile) {
      setPlan(profile.plan as PlanState | undefined);
    }
  }, [profile, isHydrated, sessionId, authProfile]);

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

