/**
 * Better Auth Server-Side Utilities
 * 
 * Server-side authentication helpers for Next.js Server Actions,
 * Server Components, and API routes.
 */

import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";

/**
 * Server-side auth utilities from convexBetterAuthNextJs
 * 
 * - handler: HTTP route handlers (GET, POST) for /api/auth/[...all]
 * - getToken: Extract JWT token from cookies
 * - isAuthenticated: Check if user is authenticated
 * - fetchAuthQuery: Fetch authenticated queries
 * - fetchAuthMutation: Execute authenticated mutations
 * - fetchAuthAction: Execute authenticated actions
 */
export const {
  handler,
  getToken,
  isAuthenticated,
  fetchAuthQuery,
  fetchAuthMutation,
  fetchAuthAction,
} = convexBetterAuthNextJs({
  convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL!,
  convexSiteUrl: process.env.NEXT_PUBLIC_CONVEX_SITE_URL!,
});

