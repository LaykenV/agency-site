import { v } from "convex/values";
import { query } from "./_generated/server";
import { isCurrentUserAdmin } from "./adminGuard";

/**
 * Header convenience signal only. Admin routes and functions still enforce
 * authorization independently.
 */
export const currentUserIsAdmin = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => isCurrentUserAdmin(ctx),
});
