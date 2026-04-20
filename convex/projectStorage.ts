import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type BuildDetails = Doc<"projects">["buildDetails"];
type BuildDetailsDoc = NonNullable<BuildDetails>;
type SmsConsent = BuildDetailsDoc["smsConsent"];

export const DEFAULT_BRAND_COLOR_SCHEME = {
  primary: "#111827",
  accent: "#6EE7B7",
} as const;

export function normalizeStorageIds(
  storageIds?: Array<Id<"_storage">>,
): Array<Id<"_storage">> | undefined {
  if (!storageIds || storageIds.length === 0) {
    return undefined;
  }

  return Array.from(new Set(storageIds));
}

export function hasBrandAssets(
  logoStorageId?: Id<"_storage">,
  imageStorageIds?: Array<Id<"_storage">>,
): boolean {
  return Boolean(logoStorageId || (imageStorageIds?.length ?? 0) > 0);
}

export function getBuildDetailsStorageIds(
  buildDetails?: BuildDetails,
): Set<Id<"_storage">> {
  const storageIds = new Set<Id<"_storage">>();

  if (buildDetails?.brand?.logoStorageId) {
    storageIds.add(buildDetails.brand.logoStorageId);
  }

  for (const storageId of buildDetails?.brand?.imageStorageIds ?? []) {
    storageIds.add(storageId);
  }

  return storageIds;
}

export async function listProjectStorageIds(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<"projects">,
): Promise<Set<Id<"_storage">>> {
  const project = await ctx.db.get(projectId);
  if (!project) {
    return new Set<Id<"_storage">>();
  }

  const storageIds = getBuildDetailsStorageIds(project.buildDetails);

  for await (const request of ctx.db
    .query("edit_requests")
    .withIndex("by_projectId", (q) => q.eq("projectId", projectId))) {
    for (const storageId of request.attachments ?? []) {
      storageIds.add(storageId);
    }
  }

  return storageIds;
}

export function buildBuildDetails(args: {
  existingBuildDetails?: BuildDetails;
  headline?: string | null;
  domainPreference?: string | null;
  inspirationLinks?: Array<string>;
  myNotes?: string | null;
  notificationPhone?: string | null;
  smsConsent?: SmsConsent | null;
  colorScheme?: {
    primary: string;
    accent: string;
  };
  logoStorageId?: Id<"_storage"> | null;
  imageStorageIds?: Array<Id<"_storage">>;
}): BuildDetailsDoc {
  const nextLogoStorageId =
    args.logoStorageId !== undefined
      ? args.logoStorageId ?? undefined
      : args.existingBuildDetails?.brand?.logoStorageId;
  const nextImageStorageIds =
    args.imageStorageIds !== undefined
      ? normalizeStorageIds(args.imageStorageIds)
      : normalizeStorageIds(args.existingBuildDetails?.brand?.imageStorageIds);

  return {
    headline: args.headline ?? args.existingBuildDetails?.headline ?? null,
    domainPreference:
      args.domainPreference ??
      args.existingBuildDetails?.domainPreference ??
      null,
    inspirationLinks:
      args.inspirationLinks ?? args.existingBuildDetails?.inspirationLinks ?? [],
    myNotes: args.myNotes ?? args.existingBuildDetails?.myNotes ?? null,
    notificationPhone:
      args.notificationPhone !== undefined
        ? args.notificationPhone ?? undefined
        : args.existingBuildDetails?.notificationPhone,
    smsConsent:
      args.smsConsent !== undefined
        ? args.smsConsent ?? undefined
        : args.existingBuildDetails?.smsConsent,
    brand: {
      colorScheme:
        args.colorScheme ??
        args.existingBuildDetails?.brand?.colorScheme ??
        DEFAULT_BRAND_COLOR_SCHEME,
      logoStorageId: nextLogoStorageId,
      imageStorageIds: nextImageStorageIds,
    },
    brandAssetsUploaded: hasBrandAssets(
      nextLogoStorageId,
      nextImageStorageIds,
    ),
  };
}

export async function deleteProjectStorageIdsIfUnreferenced(
  ctx: MutationCtx,
  projectId: Id<"projects">,
  storageIds: Array<Id<"_storage">>,
): Promise<Array<Id<"_storage">>> {
  const uniqueStorageIds = normalizeStorageIds(storageIds) ?? [];
  if (uniqueStorageIds.length === 0) {
    return [];
  }

  const activeStorageIds = await listProjectStorageIds(ctx, projectId);
  const deletedStorageIds: Array<Id<"_storage">> = [];

  for (const storageId of uniqueStorageIds) {
    if (activeStorageIds.has(storageId)) {
      continue;
    }

    await ctx.storage.delete(storageId);
    deletedStorageIds.push(storageId);
  }

  return deletedStorageIds;
}
