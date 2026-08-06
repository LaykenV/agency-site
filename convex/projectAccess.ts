import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { authComponent } from "./auth";

/**
 * Client-facing project authorization.
 *
 * Every portal query and mutation must prove the signed-in user owns the
 * project it is about to read or write. That check was previously retyped at
 * each call site; this module makes it a function you have to call, so a new
 * portal function cannot ship without one.
 *
 * Two return conventions, both intentional:
 *
 * - `require*` throws. Use for mutations and for reads where a caller asking
 *   about someone else's project is a bug worth surfacing.
 * - `get*IfOwner` returns `null`. Use for portal *queries* that render a
 *   default empty state, where throwing would turn a signed-out or
 *   mid-navigation render into an error boundary.
 *
 * Both are equally safe — neither discloses whether the project exists. The
 * choice is purely about how the caller wants to fail.
 *
 * Admin access is a separate axis: see `requireAdmin` in `adminGuard.ts`.
 * These helpers deliberately do **not** grant admins access to client
 * projects, so an admin bug cannot silently write to a client's data through a
 * portal-facing function.
 */

type Ctx = QueryCtx | MutationCtx;

async function currentUserId(ctx: Ctx): Promise<string | null> {
  const user = await authComponent.getAuthUser(ctx);
  return user?._id ?? null;
}

/** Look up by public slug (`projects.projectId`), returning null unless owned. */
export async function getProjectBySlugIfOwner(
  ctx: Ctx,
  slug: string,
): Promise<Doc<"projects"> | null> {
  const userId = await currentUserId(ctx);
  if (!userId) return null;

  const project = await ctx.db
    .query("projects")
    .withIndex("by_projectId", (q) => q.eq("projectId", slug))
    .first();

  if (!project || project.authUserId !== userId) return null;
  return project;
}

/** Look up by public slug, throwing unless owned. */
export async function requireProjectBySlug(
  ctx: Ctx,
  slug: string,
): Promise<Doc<"projects">> {
  const project = await getProjectBySlugIfOwner(ctx, slug);
  // One generic message: a caller must not be able to tell "no such project"
  // from "not yours" and thereby enumerate slugs.
  if (!project) throw new Error("Unauthorized");
  return project;
}

/** Look up by document id, returning null unless owned. */
export async function getProjectIfOwner(
  ctx: Ctx,
  projectId: Id<"projects">,
): Promise<Doc<"projects"> | null> {
  const userId = await currentUserId(ctx);
  if (!userId) return null;

  const project = await ctx.db.get(projectId);
  if (!project || project.authUserId !== userId) return null;
  return project;
}

/** Look up by document id, throwing unless owned. */
export async function requireProjectOwner(
  ctx: Ctx,
  projectId: Id<"projects">,
): Promise<Doc<"projects">> {
  const project = await getProjectIfOwner(ctx, projectId);
  if (!project) throw new Error("Unauthorized");
  return project;
}
