"use client";

import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

type AuditViewTrackerProps = {
  token: string;
  skipTracking?: boolean;
};

export function AuditViewTracker({ token, skipTracking = false }: AuditViewTrackerProps) {
  const recordAuditView = useMutation(api.marketing.public.recordAuditView);

  useEffect(() => {
    if (skipTracking) {
      return;
    }
    void recordAuditView({ token });
  }, [recordAuditView, skipTracking, token]);

  return null;
}
