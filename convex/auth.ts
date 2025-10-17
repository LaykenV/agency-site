import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { betterAuth } from "better-auth";
import { v } from "convex/values";

const siteUrl = process.env.SITE_URL!;

// The component client has methods needed for integrating Convex with Better Auth,
// as well as helper methods for general use.
export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (
  ctx: GenericCtx<DataModel>,
  { optionsOnly } = { optionsOnly: false },
) => {
  return betterAuth({
    // Disable logging when createAuth is called just to generate options.
    // This is not required, but there's a lot of noise in logs without it.
    logger: {
      disabled: optionsOnly,
    },
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    // Disable email/password authentication per Phase 2 requirements
    emailAndPassword: {
      enabled: false,
    },
    // Configure Google OAuth with minimal scopes
    socialProviders: {
      google: {
        enabled: true,
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        // Minimal scopes: email and profile only
        scope: ["email", "profile"],
        // Prompt for account selection on every sign-in
        prompt: "select_account",
      },
    },
    plugins: [
      // The Convex plugin is required for Convex compatibility
      convex(),
    ],
  });
};

// Example function for getting the current user
// Feel free to edit, omit, etc.
export const getCurrentUser = query({
  args: {},
  returns: v.union(v.any(), v.null()), // Can return user or null if not authenticated
  handler: async (ctx) => {
    try {
      return await authComponent.getAuthUser(ctx);
    } catch {
      // Return null if user is not authenticated (expected for anonymous users)
      return null;
    }
  },
});

/**
 * Links an anonymous onboarding session to an authenticated user.
 * 
 * Phase 5: Anonymous → Authenticated Profile Handoff
 * 
 * This mutation is idempotent and race-safe:
 * - If profile not linked yet: links to current authenticated user
 * - If already linked to same user: noop
 * - If already linked to different user: throws error
 * 
 * Called from client after successful Google OAuth sign-in.
 */
export const linkAnonymousSession = mutation({
  args: {
    sessionId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Require authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get authUserId from the token identity
    // Better Auth stores user ID in the tokenIdentifier or subject
    const authUserId = identity.subject || identity.tokenIdentifier;

    // Load profile by sessionId
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (!profile) {
      throw new Error("Profile not found for session");
    }

    // Idempotent behavior
    if (profile.authUserId) {
      if (profile.authUserId === authUserId) {
        // Already linked to the same user - noop
        return null;
      } else {
        // Already linked to a different user - error
        throw new Error(
          "This session is already linked to a different user account"
        );
      }
    }

    // Link the profile to the authenticated user
    await ctx.db.patch(profile._id, {
      authUserId,
    });

    // Log the session linking event
    await ctx.db.insert("events", {
      sessionId: args.sessionId,
      projectId: profile.projectId,
      kind: "auth.session_linked",
      payload: {
        sessionId: args.sessionId,
        authUserId,
        linkedAt: Date.now(),
      },
    });

    return null;
  },
});

/**
 * Retrieves the current authenticated user's profile.
 * 
 * Phase 7: Portal AuthN/AuthZ Patterns
 * 
 * Used in the client portal to hydrate user data after authentication.
 * Queries the by_authUserId index for efficient lookups.
 */
export const getCurrentUserProfile = query({
  args: {},
  returns: v.union(
    v.object({
      sessionId: v.string(),
      resumeToken: v.string(),
      projectId: v.optional(v.string()),
      brief: v.object({
        contactName: v.string(),
        contactEmail: v.string(),
        companyName: v.string(),
        businessDescription: v.string(),
        industry: v.string(),
        primaryNeed: v.string(),
        primaryAction: v.string(),
        timeline: v.object({
          option: v.string(),
          date: v.union(v.string(), v.null()),
        }),
        additionalNotes: v.string(),
        termsAccepted: v.boolean(),
      }),
      plan: v.optional(
        v.object({
          tierId: v.union(v.string(), v.null()),
          recommendedOn: v.union(v.number(), v.null()),
          aiProposal: v.optional(
            v.object({
              generatedAt: v.number(),
              promptVersion: v.string(),
              tiers: v.object({
                starter: v.object({
                  headline: v.string(),
                  summary: v.string(),
                  price: v.string(),
                  pages: v.array(v.string()),
                  features: v.array(v.string()),
                  aiEditorAccess: v.boolean(),
                  deliverableNotes: v.optional(v.string()),
                }),
                professional: v.object({
                  headline: v.string(),
                  summary: v.string(),
                  price: v.string(),
                  pages: v.array(v.string()),
                  features: v.array(v.string()),
                  aiEditorAccess: v.boolean(),
                  deliverableNotes: v.optional(v.string()),
                }),
                enterprise: v.object({
                  headline: v.string(),
                  summary: v.string(),
                  price: v.string(),
                  pages: v.array(v.string()),
                  features: v.array(v.string()),
                  aiEditorAccess: v.boolean(),
                  deliverableNotes: v.optional(v.string()),
                }),
              }),
            }),
          ),
        }),
      ),
      projectStatus: v.optional(
        v.union(
          v.literal("AWAITING_PAYMENT"),
          v.literal("AWAITING_ASSETS"),
          v.literal("IN_PROGRESS"),
          v.literal("IN_REVIEW"),
          v.literal("LIVE"),
          v.literal("ARCHIVED"),
        ),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    // Get the authenticated user's identity
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null; // User not authenticated
    }

    // Get authUserId from the token identity (same as linkAnonymousSession)
    const authUserId = identity.subject || identity.tokenIdentifier;

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
      .unique();

    if (!profile) {
      return null;
    }

    return {
      sessionId: profile.sessionId,
      resumeToken: profile.resumeToken,
      projectId: profile.projectId,
      brief: profile.brief,
      plan: profile.plan,
      projectStatus: profile.projectStatus,
    };
  },
});
