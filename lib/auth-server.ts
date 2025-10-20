/**
 * Better Auth Server-Side Utilities
 * 
 * Phase 3 (Extended): Server-side authentication helpers
 * 
 * These utilities are used in Server Actions, Server Components,
 * and other Next.js server-side code to interact with Better Auth.
 */

import { createAuth } from "@/convex/auth";
import { getToken as getTokenNextjs } from "@convex-dev/better-auth/nextjs";

/**
 * Get the authentication token for the current request.
 * 
 * This token can be used to call authenticated Convex functions
 * from Server Actions or Server Components.
 * 
 * @returns Promise<string> - The authentication token
 * 
 * @example Server Action
 * ```tsx
 * "use server";
 * 
 * import { fetchMutation } from "convex/nextjs";
 * import { api } from "@/convex/_generated/api";
 * import { getToken } from "@/lib/auth-server";
 * 
 * export async function updatePassword(currentPassword: string, newPassword: string) {
 *   const token = await getToken();
 *   
 *   await fetchMutation(
 *     api.users.updatePassword,
 *     { currentPassword, newPassword },
 *     { token }
 *   );
 * }
 * ```
 * 
 * @example Server Component
 * ```tsx
 * import { fetchQuery } from "convex/nextjs";
 * import { api } from "@/convex/_generated/api";
 * import { getToken } from "@/lib/auth-server";
 * 
 * export default async function ProfilePage() {
 *   const token = await getToken();
 *   const profile = await fetchQuery(
 *     api.auth.getCurrentUserProfile,
 *     {},
 *     { token }
 *   );
 *   
 *   return <div>{profile?.details.contactName}</div>;
 * }
 * ```
 */
export const getToken = () => {
  return getTokenNextjs(createAuth);
};

