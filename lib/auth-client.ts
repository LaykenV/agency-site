import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { oneTapClient } from "better-auth/client/plugins";

/**
 * Better Auth Client Configuration
 * 
 * Phase 4: Client Provider & Auth Client
 * 
 * This client is used throughout the application for authentication operations:
 * - Google OAuth sign-in
 * - Google One Tap sign-in
 * - Sign-out
 * - Session management
 * 
 * Plugins:
 * - convexClient(): Integrates with Convex's authentication system
 * - oneTapClient(): Enables Google One Tap for frictionless sign-in
 */
export const authClient = createAuthClient({
  plugins: [
    // Convex integration plugin (required)
    convexClient(),
    // Google One Tap client plugin
    oneTapClient({
      // Google Client ID (must match the one in Google Console)
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      // Don't auto-select account - let user choose
      autoSelect: false,
      // Cancel One Tap when user taps outside
      cancelOnTapOutside: true,
      // Context for One Tap (signin or signup)
      context: "signin",
      // Exponential backoff configuration for prompt retries
      promptOptions: {
        baseDelay: 1000, // Start with 1 second delay
        maxAttempts: 5, // Try up to 5 times before giving up
      },
    }),
  ],
});

