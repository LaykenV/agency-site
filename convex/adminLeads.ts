import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireAdmin } from "./adminGuard";
import {
  projectStatusValidator,
  triageObjectValidator,
  triageVerdictValidator,
} from "./validators";

const leadStatusValidator = v.union(
  v.literal("new"),
  v.literal("contacted"),
  v.literal("qualified"),
  v.literal("won"),
  v.literal("lost"),
);

const leadDataValidator = v.object({
  name: v.string(),
  email: v.string(),
  phone: v.optional(v.string()),
  message: v.optional(v.string()),
});

const clientLeadValidator = v.object({
  _id: v.id("client_leads"),
  _creationTime: v.number(),
  projectId: v.string(),
  status: leadStatusValidator,
  source: v.string(),
  data: leadDataValidator,
  createdAt: v.number(),
  triageVerdict: v.optional(triageVerdictValidator),
  triage: v.optional(triageObjectValidator),
  fanoutPaused: v.optional(v.boolean()),
  fanoutPausedReason: v.optional(v.string()),
});

const leadFilterValidator = v.union(
  v.literal("allowed"),
  v.literal("spam"),
  v.literal("untriaged"),
  v.literal("fanout_paused"),
  v.literal("all"),
);

/**
 * Cross-client lead stream for the admin dashboard.
 * Each filter branch uses an index so pagination never scans unrelated rows.
 */
export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    filter: leadFilterValidator,
    projectId: v.optional(v.string()),
  },
  returns: paginationResultValidator(clientLeadValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    if (args.filter === "fanout_paused") {
      // Index is by fanoutPaused + createdAt; only true rows are written.
      if (args.projectId) {
        // No project+fanout composite index yet. Volume is low in Stage 1A;
        // load recent project leads and filter rather than post-filter a page
        // (which would return empty pages while continueCursor still advances).
        const recent = await ctx.db
          .query("client_leads")
          .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId!))
          .order("desc")
          .take(200);
        const page = recent
          .filter((lead) => lead.fanoutPaused === true)
          .slice(0, args.paginationOpts.numItems);
        return {
          page,
          isDone: true,
          continueCursor: "",
        };
      }
      return await ctx.db
        .query("client_leads")
        .withIndex("by_fanoutPaused_and_createdAt", (q) =>
          q.eq("fanoutPaused", true),
        )
        .order("desc")
        .paginate(args.paginationOpts);
    }

    const triageVerdict =
      args.filter === "allowed"
        ? ("allow" as const)
        : args.filter === "spam"
          ? ("spam" as const)
          : args.filter === "untriaged"
            ? ("untriaged" as const)
            : null;

    if (args.projectId && triageVerdict) {
      return await ctx.db
        .query("client_leads")
        .withIndex("by_projectId_and_triageVerdict", (q) =>
          q.eq("projectId", args.projectId!).eq("triageVerdict", triageVerdict),
        )
        .order("desc")
        .paginate(args.paginationOpts);
    }

    if (args.projectId) {
      return await ctx.db
        .query("client_leads")
        .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId!))
        .order("desc")
        .paginate(args.paginationOpts);
    }

    if (triageVerdict) {
      return await ctx.db
        .query("client_leads")
        .withIndex("by_triageVerdict", (q) =>
          q.eq("triageVerdict", triageVerdict),
        )
        .order("desc")
        .paginate(args.paginationOpts);
    }

    return await ctx.db
      .query("client_leads")
      .withIndex("by_createdAt")
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

/**
 * Stage 1A containment counters for the admin leads header.
 *
 * Every scan is bounded — these are dashboard counters, not a reporting API,
 * and an unbounded `.collect()` would eventually exceed Convex read limits and
 * take the whole admin page down. When a scan hits its cap the corresponding
 * `*Capped` flag is set so the UI can render "500+" instead of quietly
 * under-reporting. These numbers are Stage 1 exit evidence; a silently
 * truncated count would undermine the gate it exists to prove.
 */
const STATS_SCAN_LIMIT = 500;

export const containmentStats = query({
  args: {},
  returns: v.object({
    untriaged: v.number(),
    untriagedCapped: v.boolean(),
    fanoutPaused: v.number(),
    fanoutPausedCapped: v.boolean(),
    acceptedTodayUtc: v.number(),
    fanoutPausedTodayUtc: v.number(),
    rateLimitedTodayUtc: v.number(),
    rateLimitedIngestTodayUtc: v.number(),
    rateLimitedVisitorTodayUtc: v.number(),
    rateLimitedNoTrustedTodayUtc: v.number(),
    /** Stage 2: authenticated requests with a mismatched body projectId. */
    projectMismatchTodayUtc: v.number(),
    allowLast24h: v.number(),
    spamLast24h: v.number(),
    reviewLast24h: v.number(),
    leadScanCapped: v.boolean(),
    smsBlockedVerdictLast24h: v.number(),
    smsBlockedCeilingLast24h: v.number(),
    smsSentLast24h: v.number(),
    thresholdAlertsDeliveredLast24h: v.number(),
    activityScanCapped: v.boolean(),
  }),
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const since = Date.now() - 24 * 60 * 60 * 1000;
    const bucketDate = new Date().toISOString().slice(0, 10);

    const counterRows = await ctx.db
      .query("hub_operational_counters")
      .withIndex("by_bucketDate", (q) => q.eq("bucketDate", bucketDate))
      .collect();
    const counterTotal = (kind: (typeof counterRows)[number]["kind"]) =>
      counterRows.reduce(
        (sum, row) => sum + (row.kind === kind ? row.count : 0),
        0,
      );
    const acceptedTodayUtc = counterTotal("lead_accepted");
    const fanoutPausedTodayUtc = counterTotal("lead_fanout_paused");
    const rateLimitedIngestTodayUtc = counterTotal(
      "lead_rate_limited_ingest",
    );
    const rateLimitedVisitorTodayUtc = counterTotal(
      "lead_rate_limited_visitor",
    );
    const rateLimitedNoTrustedTodayUtc = counterTotal(
      "lead_rate_limited_no_trusted",
    );
    const projectMismatchTodayUtc = counterTotal("lead_project_mismatch");
    const rateLimitedTodayUtc =
      rateLimitedIngestTodayUtc +
      rateLimitedVisitorTodayUtc +
      rateLimitedNoTrustedTodayUtc;

    const untriagedRows = await ctx.db
      .query("client_leads")
      .withIndex("by_triageVerdict", (q) => q.eq("triageVerdict", "untriaged"))
      .take(STATS_SCAN_LIMIT + 1);
    const untriagedCapped = untriagedRows.length > STATS_SCAN_LIMIT;

    const fanoutPausedRows = await ctx.db
      .query("client_leads")
      .withIndex("by_fanoutPaused_and_createdAt", (q) =>
        q.eq("fanoutPaused", true),
      )
      .take(STATS_SCAN_LIMIT + 1);
    const fanoutPausedCapped = fanoutPausedRows.length > STATS_SCAN_LIMIT;

    const recent = await ctx.db
      .query("client_leads")
      .withIndex("by_createdAt")
      .order("desc")
      .take(STATS_SCAN_LIMIT + 1);
    // Only a truncated scan whose oldest row is still inside the window can be
    // hiding leads; if we already scanned past 24h the count is complete.
    const leadScanCapped =
      recent.length > STATS_SCAN_LIMIT &&
      (recent[recent.length - 1]?.createdAt ?? 0) >= since;

    let allowLast24h = 0;
    let spamLast24h = 0;
    let reviewLast24h = 0;
    for (const lead of recent.slice(0, STATS_SCAN_LIMIT)) {
      if (lead.createdAt < since) continue;
      if (lead.triageVerdict === "allow") allowLast24h++;
      else if (lead.triageVerdict === "spam") spamLast24h++;
      else if (lead.triageVerdict === "review") reviewLast24h++;
    }

    const activities = await ctx.db
      .query("activity_log")
      .withIndex("by_createdAt")
      .order("desc")
      .take(STATS_SCAN_LIMIT + 1);
    const activityScanCapped =
      activities.length > STATS_SCAN_LIMIT &&
      (activities[activities.length - 1]?.createdAt ?? 0) >= since;

    let smsBlockedVerdictLast24h = 0;
    let smsBlockedCeilingLast24h = 0;
    let smsSentLast24h = 0;
    let thresholdAlertsDeliveredLast24h = 0;
    for (const row of activities.slice(0, STATS_SCAN_LIMIT)) {
      if (row.createdAt < since) continue;
      if (row.kind === "lead.sms_blocked_verdict") smsBlockedVerdictLast24h++;
      else if (row.kind === "lead.sms_blocked_ceiling") smsBlockedCeilingLast24h++;
      else if (row.kind === "lead.sms_notification_sent") smsSentLast24h++;
      // Count delivery receipts rather than claimed/persisted threshold alerts.
      else if (row.kind === "hub.threshold_alert_delivered") {
        thresholdAlertsDeliveredLast24h++;
      }
    }

    return {
      untriaged: Math.min(untriagedRows.length, STATS_SCAN_LIMIT),
      untriagedCapped,
      fanoutPaused: Math.min(fanoutPausedRows.length, STATS_SCAN_LIMIT),
      fanoutPausedCapped,
      acceptedTodayUtc,
      fanoutPausedTodayUtc,
      rateLimitedTodayUtc,
      rateLimitedIngestTodayUtc,
      rateLimitedVisitorTodayUtc,
      rateLimitedNoTrustedTodayUtc,
      projectMismatchTodayUtc,
      allowLast24h,
      spamLast24h,
      reviewLast24h,
      leadScanCapped,
      smsBlockedVerdictLast24h,
      smsBlockedCeilingLast24h,
      smsSentLast24h,
      thresholdAlertsDeliveredLast24h,
      activityScanCapped,
    };
  },
});

/** Projects that currently have at least one stored client lead. */
export const listClients = query({
  args: {},
  returns: v.array(
    v.object({
      projectId: v.string(),
      companyName: v.union(v.string(), v.null()),
      liveUrl: v.union(v.string(), v.null()),
      projectStatus: v.union(projectStatusValidator, v.null()),
    }),
  ),
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const projects = await ctx.db.query("projects").collect();
    const clients = await Promise.all(
      projects.map(async (project) => {
        const firstLead = await ctx.db
          .query("client_leads")
          .withIndex("by_projectId", (q) =>
            q.eq("projectId", project.projectId),
          )
          .first();

        if (!firstLead) return null;

        const prospect = project.prospectId
          ? await ctx.db.get(project.prospectId)
          : null;

        return {
          projectId: project.projectId,
          companyName: prospect?.details.companyName?.trim() || null,
          liveUrl: project.deployment?.liveUrl?.trim() || null,
          projectStatus: project.projectStatus ?? null,
        };
      }),
    );

    return clients.filter((client) => client !== null);
  },
});
