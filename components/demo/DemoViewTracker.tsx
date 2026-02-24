"use client";

import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

type DemoViewTrackerProps = {
  token: string;
  skipTracking?: boolean;
};

export function DemoViewTracker({ token, skipTracking = false }: DemoViewTrackerProps) {
  const recordDemoView = useMutation(api.marketing.public.recordDemoView);

  useEffect(() => {
    if (skipTracking) {
      return;
    }
    void recordDemoView({ token });
  }, [recordDemoView, skipTracking, token]);

  return null;
}
