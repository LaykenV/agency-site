import { query } from "./_generated/server";
import { v } from "convex/values";
import { prospectValidator } from "./validators";

export const getProspectBySessionId = query({
  args: { sessionId: v.string() },
  returns: v.union(prospectValidator, v.null()),
  handler: async (ctx, args) => {
    const prospect = await ctx.db
      .query("prospects")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();

    return prospect ?? null;
  },
});

