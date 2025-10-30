import { QueryCtx, MutationCtx } from "./_generated/server";
import { authComponent } from "./auth";

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

  const userEmail = user.email.trim().toLowerCase();
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminEmailsStr = process.env.ADMIN_EMAILS?.trim();
  
  let isAdmin = false;
  
  if (adminEmail && userEmail === adminEmail) {
    isAdmin = true;
  }
  
  if (!isAdmin && adminEmailsStr) {
    const adminEmails = adminEmailsStr.split(",").map(e => e.trim().toLowerCase());
    isAdmin = adminEmails.includes(userEmail);
  }
  
  if (!isAdmin) {
    console.warn("[adminGuard] unauthorized access attempt", {
      userId: user._id,
      email: user.email,
    });
    throw new Error("Admin access required");
  }
  
  return user;
}
