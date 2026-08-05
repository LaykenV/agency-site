import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { requireAdmin } from "./adminGuard";
import {
  projectCredentialKindValidator,
  projectCredentialPublicValidator,
} from "./validators";
import { generateCredential } from "./credentialCrypto";

const MAX_LABEL_LEN = 80;

function normalizeLabel(label: string | undefined): string | undefined {
  if (label === undefined) return undefined;
  const trimmed = label.trim().slice(0, MAX_LABEL_LEN);
  return trimmed.length > 0 ? trimmed : undefined;
}

// ---------------------------------------------------------------------------
// Admin: list / issue / revoke
// ---------------------------------------------------------------------------

/** List credentials for a project. Never returns hashes or raw keys. */
export const listForProject = query({
  args: { projectId: v.id("projects") },
  returns: v.array(projectCredentialPublicValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const rows = await ctx.db
      .query("project_credentials")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .collect();

    // Newest first
    rows.sort((a, b) => b.createdAt - a.createdAt);

    return rows.map((row) => ({
      _id: row._id,
      _creationTime: row._creationTime,
      projectId: row.projectId,
      keyId: row.keyId,
      kind: row.kind,
      createdAt: row.createdAt,
      lastUsedAt: row.lastUsedAt,
      revokedAt: row.revokedAt,
      label: row.label,
    }));
  },
});

/**
 * Issue a new credential. The raw key is returned exactly once in the
 * mutation response and is never stored or written to activity_log / console.
 */
export const issue = mutation({
  args: {
    projectId: v.id("projects"),
    kind: projectCredentialKindValidator,
    label: v.optional(v.string()),
  },
  returns: v.object({
    credentialId: v.id("project_credentials"),
    keyId: v.string(),
    kind: projectCredentialKindValidator,
    rawKey: v.string(),
    label: v.optional(v.string()),
    createdAt: v.number(),
  }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    const label = normalizeLabel(args.label);

    // Extremely unlikely keyId collision — retry a few times if needed.
    let generated = await generateCredential(args.kind);
    for (let attempt = 0; attempt < 5; attempt++) {
      const existing = await ctx.db
        .query("project_credentials")
        .withIndex("by_keyId", (q) => q.eq("keyId", generated.keyId))
        .first();
      if (!existing) break;
      generated = await generateCredential(args.kind);
    }

    const createdAt = Date.now();
    const credentialId = await ctx.db.insert("project_credentials", {
      projectId: args.projectId,
      keyId: generated.keyId,
      kind: generated.kind,
      credentialHash: generated.credentialHash,
      createdAt,
      ...(label ? { label } : {}),
    });

    await ctx.db.insert("activity_log", {
      projectId: args.projectId,
      actor: "admin",
      kind: "credential.issued",
      payload: {
        keyId: generated.keyId,
        kind: generated.kind,
        ...(label ? { label } : {}),
        // Never store rawKey or credentialHash in activity_log
      },
      createdAt,
    });

    // Redacted log — keyId only, never Authorization / raw key / hash
    console.log("[admin] credential issued", {
      projectId: args.projectId,
      keyId: generated.keyId,
      kind: generated.kind,
    });

    return {
      credentialId,
      keyId: generated.keyId,
      kind: generated.kind,
      rawKey: generated.rawKey,
      ...(label ? { label } : {}),
      createdAt,
    };
  },
});

/** Soft-revoke a credential. Existing uses with this keyId will 401. */
export const revoke = mutation({
  args: {
    credentialId: v.id("project_credentials"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const row = await ctx.db.get(args.credentialId);
    if (!row) {
      throw new Error("Credential not found");
    }
    if (row.revokedAt) {
      return null; // already revoked — idempotent
    }

    const revokedAt = Date.now();
    await ctx.db.patch(args.credentialId, { revokedAt });

    await ctx.db.insert("activity_log", {
      projectId: row.projectId,
      actor: "admin",
      kind: "credential.revoked",
      payload: {
        keyId: row.keyId,
        kind: row.kind,
        ...(row.label ? { label: row.label } : {}),
      },
      createdAt: revokedAt,
    });

    console.log("[admin] credential revoked", {
      projectId: row.projectId,
      keyId: row.keyId,
      kind: row.kind,
    });

    return null;
  },
});

// ---------------------------------------------------------------------------
// Internal: HTTP verification helpers
// ---------------------------------------------------------------------------

/**
 * Look up a non-revoked secret credential by public keyId.
 * Returns credentialHash for constant-time compare in the HTTP action.
 * Does not distinguish "not found" vs "revoked" to the caller beyond null —
 * the HTTP layer returns a generic 401 either way.
 */
export const getActiveSecretByKeyId = internalQuery({
  args: { keyId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("project_credentials"),
      projectId: v.id("projects"),
      keyId: v.string(),
      kind: v.literal("secret"),
      credentialHash: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("project_credentials")
      .withIndex("by_keyId", (q) => q.eq("keyId", args.keyId))
      .first();

    if (!row) return null;
    if (row.kind !== "secret") return null;
    if (row.revokedAt) return null;

    return {
      _id: row._id,
      projectId: row.projectId,
      keyId: row.keyId,
      kind: "secret" as const,
      credentialHash: row.credentialHash,
    };
  },
});

/** Update lastUsedAt after a successful authenticated request. */
export const touchLastUsed = internalMutation({
  args: { credentialId: v.id("project_credentials") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.credentialId);
    if (!row || row.revokedAt) return null;
    await ctx.db.patch(args.credentialId, { lastUsedAt: Date.now() });
    return null;
  },
});
