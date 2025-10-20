"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { OnboardingBrief, OnboardingPlan, defaultBrief } from "@/types/onboarding";

type UseSessionDataOptions = {
  sessionId: string | null;
  localBrief: OnboardingBrief;
};

type UseSessionDataResult = {
  remoteBrief: OnboardingBrief;
  remotePlan: OnboardingPlan | undefined;
  isHydrated: boolean;
};

export function useSessionData({ sessionId, localBrief }: UseSessionDataOptions): UseSessionDataResult {
  const [isHydrated, setIsHydrated] = useState(false);
  const [remoteBrief, setRemoteBrief] = useState<OnboardingBrief>(defaultBrief);
  const [remotePlan, setRemotePlan] = useState<OnboardingPlan | undefined>(undefined);

  const sessionQuery = useQuery(
    api.onboarding.sessions.getSession,
    sessionId ? { sessionId } : "skip",
  );

  useEffect(() => {
    if (sessionQuery === undefined || !sessionQuery) return;

    setRemoteBrief({
      ...defaultBrief,
      ...sessionQuery.brief,
    });

    setRemotePlan(sessionQuery.plan ?? undefined);

    if (!isHydrated) {
      setIsHydrated(true);
    }
  }, [sessionQuery, isHydrated]);

  return {
    remoteBrief: isHydrated ? remoteBrief : localBrief,
    remotePlan,
    isHydrated,
  };
}

