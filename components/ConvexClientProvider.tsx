"use client";

import { ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { authClient } from "@/lib/auth-client";

/**
 * Convex Client Provider with Better Auth Integration
 * 
 * Phase 4: Client Provider & Auth Client
 * 
 * This provider wraps the app with both Convex and Better Auth functionality.
 * 
 * Key configuration:
 * - expectAuth: false - Allows anonymous onboarding queries to run without authentication
 *   (Pre-pay queries do not require auth, only portal queries do)
 */
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!, {
  // Don't pause queries waiting for authentication
  // This is critical for anonymous onboarding flow
  expectAuth: false,
});

export default function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ConvexBetterAuthProvider client={convex} authClient={authClient}>
      {children}
    </ConvexBetterAuthProvider>
  );
}
