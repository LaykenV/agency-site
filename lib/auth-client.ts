import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { magicLinkClient } from "better-auth/client/plugins";

/**
 * Better Auth Client Configuration
 * 
 * Phase 4: Client Provider & Auth Client
 * 
 * This client is used throughout the application for authentication operations:
 * - Magic link authentication
 * - Google OAuth sign-in
 * - Sign-out
 * - Session management
 * 
 * Plugins:
 * - convexClient(): Integrates with Convex's authentication system
 * - magicLinkClient(): Enables magic link authentication
 */
export const authClient = createAuthClient({
  plugins: [
    // Convex integration plugin (required)
    convexClient(),
    // Magic link plugin for passwordless authentication
    magicLinkClient(),
  ],
});

