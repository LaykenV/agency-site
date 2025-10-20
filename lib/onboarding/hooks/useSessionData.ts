"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  ProspectDetails,
  ProspectPlan,
  defaultProspectDetails,
} from "@/types/prospect";

type UseSessionDataOptions = {
  sessionId: string | null;
  localDetails: ProspectDetails;
};

type UseSessionDataResult = {
  remoteDetails: ProspectDetails;
  remotePlan: ProspectPlan | undefined;
  isHydrated: boolean;
};

export function useSessionData({ sessionId, localDetails }: UseSessionDataOptions): UseSessionDataResult {
  const [isHydrated, setIsHydrated] = useState(false);
  const [remoteDetails, setRemoteDetails] = useState<ProspectDetails>(defaultProspectDetails);
  const [remotePlan, setRemotePlan] = useState<ProspectPlan | undefined>(undefined);

  const sessionQuery = useQuery(
    api.onboarding.sessions.getSession,
    sessionId ? { sessionId } : "skip",
  );

  useEffect(() => {
    if (sessionQuery === undefined || !sessionQuery) return;

    setRemoteDetails({
      ...defaultProspectDetails,
      ...sessionQuery.details,
    });

    setRemotePlan(sessionQuery.plan ?? undefined);

    if (!isHydrated) {
      setIsHydrated(true);
    }
  }, [sessionQuery, isHydrated]);

  return {
    remoteDetails: isHydrated ? remoteDetails : localDetails,
    remotePlan,
    isHydrated,
  };
}

