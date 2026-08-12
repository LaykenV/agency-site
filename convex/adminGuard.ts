import type { QueryCtx, MutationCtx } from "./_generated/server";
import { authComponent } from "./auth";

function matchesConfiguredAdmin(email: string) {
  const userEmail = email.trim().toLowerCase();
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminEmailsStr = process.env.ADMIN_EMAILS?.trim();

  if (adminEmail && userEmail === adminEmail) {
    return true;
  }

  if (!adminEmailsStr) {
    return false;
  }

  return adminEmailsStr
    .split(",")
    .map((configuredEmail) => configuredEmail.trim().toLowerCase())
    .includes(userEmail);
}

/** Return whether the current authenticated user is an admin. */
export async function isCurrentUserAdmin(ctx: QueryCtx | MutationCtx) {
  try {
    const user = await authComponent.getAuthUser(ctx);
    return Boolean(user?.email && matchesConfiguredAdmin(user.email));
  } catch {
    return false;
  }
}

/**
 * Require admin authorization. Throws if user is not an admin.
 * Checks user email against ADMIN_EMAIL and optional ADMIN_EMAILS env vars.
 * 
 * @param ctx - Query or Mutation context
 * @returns Admin user info
 * @throws Error if user is not authenticated or not an admin
 */
export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await authComponent.getAuthUser(ctx);
  
  if (!user?._id || !user?.email) {
    throw new Error("Authentication required");
  }

  if (!matchesConfiguredAdmin(user.email)) {
    console.warn("[adminGuard] unauthorized access attempt", {
      userId: user._id,
      email: user.email,
    });
    throw new Error("Admin access required");
  }
  
  return user;
}
