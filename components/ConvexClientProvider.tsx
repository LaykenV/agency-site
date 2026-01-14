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
 * - initialToken: Pre-fetched server-side auth token to avoid client-side hydration delays
 *   (Fixes magic link redirect issues on mobile browsers where session sync could stall)
 */
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!, {
  // Don't pause queries waiting for authentication
  // This is critical for anonymous onboarding flow
  expectAuth: false,
});

export default function ConvexClientProvider({
  children,
  initialToken,
}: {
  children: ReactNode;
  initialToken?: string | null;
}) {
  return (
    <ConvexBetterAuthProvider 
      client={convex} 
      authClient={authClient}
      initialToken={initialToken}
    >
      {children}
    </ConvexBetterAuthProvider>
  );
}
