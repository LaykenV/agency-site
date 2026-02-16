"use client";

import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

type DemoViewTrackerProps = {
  token: string;
};

export function DemoViewTracker({ token }: DemoViewTrackerProps) {
  const recordDemoView = useMutation(api.marketing.public.recordDemoView);

  useEffect(() => {
    void recordDemoView({ token });
  }, [recordDemoView, token]);

  return null;
}
