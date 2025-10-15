/**
 * Session Handoff Utilities
 * 
 * Phase 5: Anonymous → Authenticated Profile Handoff
 * 
 * These utilities handle the transition from anonymous onboarding to authenticated portal access.
 * After a user signs in via Google/One Tap, we link their anonymous session to their auth user ID.
 */

import { FunctionReference } from "convex/server";

const SESSION_STORAGE_KEY = "onboarding_session";

interface StoredSession {
  sessionId: string;
  resumeToken: string;
}

/**
 * Links the current anonymous session to the authenticated user.
 * 
 * Call this immediately after successful Google/One Tap sign-in.
 * It will:
 * 1. Read the sessionId from localStorage
 * 2. Call the linkAnonymousSession mutation
 * 3. Clear the localStorage on success
 * 
 * @param linkMutation - The linkAnonymousSession mutation from api.auth
 * @returns Promise that resolves when linking is complete
 * 
 * @example
 * ```tsx
 * import { handoffAnonymousSession } from "@/lib/auth/session-handoff";
 * import { useMutation } from "convex/react";
 * import { api } from "@/convex/_generated/api";
 * 
 * const linkSession = useMutation(api.auth.linkAnonymousSession);
 * 
 * const handleAuthSuccess = async () => {
 *   await handoffAnonymousSession(linkSession);
 *   // Redirect to portal
 *   router.push("/portal");
 * };
 * ```
 */
export async function handoffAnonymousSession(
  linkMutation: (args: { sessionId: string }) => Promise<null>
): Promise<void> {
  const stored = getAnonymousSessionId();
  
  if (!stored) {
    // No session to link - user might have started as authenticated
    console.warn("No anonymous session found to link");
    return;
  }

  try {
    // Call the mutation to link the session
    await linkMutation({ sessionId: stored.sessionId });
    
    // Successfully linked - clear localStorage
    clearAnonymousSession();
    
    console.log("Anonymous session successfully linked to authenticated user");
  } catch (error) {
    console.error("Failed to link anonymous session:", error);
    throw error;
  }
}

/**
 * Retrieves the current anonymous session from localStorage.
 * 
 * @returns The stored session object or null if not found
 * 
 * @example
 * ```tsx
 * const session = getAnonymousSessionId();
 * if (session) {
 *   console.log("Current session:", session.sessionId);
 * }
 * ```
 */
export function getAnonymousSessionId(): StoredSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = localStorage.getItem(SESSION_STORAGE_KEY);
  
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as StoredSession;
  } catch (error) {
    console.error("Failed to parse stored session:", error);
    return null;
  }
}

/**
 * Clears the anonymous session from localStorage.
 * 
 * Call this after successfully linking the session or when starting a new application.
 * 
 * @example
 * ```tsx
 * // "Start New Application" button
 * const handleStartNew = () => {
 *   clearAnonymousSession();
 *   router.push("/onboarding");
 * };
 * ```
 */
export function clearAnonymousSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(SESSION_STORAGE_KEY);
}

/**
 * Server-side version of handoffAnonymousSession for use in Server Actions.
 * 
 * This variant uses fetchMutation with a token for server-side authentication.
 * 
 * @param token - Auth token from getToken()
 * @param sessionId - The anonymous session ID to link
 * @param convexUrl - Convex deployment URL
 * 
 * @example
 * ```tsx
 * // In a Server Action
 * "use server";
 * 
 * import { fetchMutation } from "convex/nextjs";
 * import { api } from "@/convex/_generated/api";
 * import { getToken } from "@/lib/auth-server";
 * 
 * export async function linkSessionAction(sessionId: string) {
 *   const token = await getToken();
 *   await fetchMutation(
 *     api.auth.linkAnonymousSession,
 *     { sessionId },
 *     { token }
 *   );
 * }
 * ```
 */
export async function handoffAnonymousSessionServer(
  token: string,
  sessionId: string,
  convexUrl: string,
  linkMutationRef: FunctionReference<"mutation", "public", { sessionId: string }, null>
): Promise<void> {
  const { fetchMutation } = await import("convex/nextjs");
  
  await fetchMutation(
    linkMutationRef,
    { sessionId },
    { token, url: convexUrl }
  );
}
