import { describe, expect, test } from "bun:test";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { internalAction, internalQuery } from "../convex/_generated/server";
import { v } from "convex/values";
import { defineSchema } from "convex/server";

const modules = {
  "../convex/agencyIntake.ts": () => import("../convex/agencyIntake"),
  "../convex/_generated/api.js": () => import("../convex/_generated/api"),
  "../convex/clientLeads.ts": () => import("../convex/clientLeads"),
  "../convex/adminLeads.ts": () => import("../convex/adminLeads"),
  "../convex/leadTriage.ts": async () => ({
    triageLead: internalAction({
      args: { leadId: v.id("client_leads") },
      returns: v.null(),
      handler: async () => null,
    }),
  }),
};
const args = {
  projectId: "awd-test",
  source: "agency-quote-form",
  requestId: "6fdf5a63-7c52-4c9d-9976-8a2abfe1d19a",
  data: {
    name: "Owner",
    email: "owner@example.com",
    message: "Website request",
  },
};

describe("lead retry protection", () => {
  test("repeated requests create one row and one scheduled triage job", async () => {
    const t = convexTest(schema, modules);
    const first = await t.mutation(internal.clientLeads.create, args);
    const second = await t.mutation(internal.clientLeads.create, args);
    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(second.leadId).toBe(first.leadId);
    expect(
      await t.run((ctx) => ctx.db.query("client_leads").collect()),
    ).toHaveLength(1);
    expect(
      await t.run((ctx) =>
        ctx.db.system.query("_scheduled_functions").collect(),
      ),
    ).toHaveLength(1);
    const lead = await t.query(internal.clientLeads.getLeadById, {
      leadId: first.leadId,
    });
    expect(lead?.requestId).toBe(args.requestId);
    await new Promise((resolve) => setTimeout(resolve, 10));
    await t.finishInProgressScheduledFunctions();
  });
  test("idempotency is scoped to a project and preserves the first fanout decision", async () => {
    const t = convexTest(schema, modules);
    const first = await t.mutation(internal.clientLeads.create, {
      ...args,
      fanoutPaused: true,
    });
    const retry = await t.mutation(internal.clientLeads.create, args);
    expect(retry.fanoutPaused).toBe(true);
    expect(retry.leadId).toBe(first.leadId);
    const other = await t.mutation(internal.clientLeads.create, {
      ...args,
      projectId: "other-project",
      fanoutPaused: true,
    });
    expect(other.leadId).not.toBe(first.leadId);
    expect(
      await t.run((ctx) =>
        ctx.db.system.query("_scheduled_functions").collect(),
      ),
    ).toHaveLength(0);
  });
  test("rejects a reused ID with changed content", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.clientLeads.create, {
      ...args,
      fanoutPaused: true,
    });
    let rejected = false;
    try {
      await t.mutation(internal.clientLeads.create, {
        ...args,
        data: { ...args.data, message: "different" },
        fanoutPaused: true,
      });
    } catch {
      rejected = true;
    }
    expect(rejected).toBe(true);
    expect(
      await t.run((ctx) => ctx.db.query("client_leads").collect()),
    ).toHaveLength(1);
  });
  test("anonymous users cannot read the lead inbox", async () => {
    const t = convexTest(schema, modules);
    let rejected = false;
    try {
      await t.query(api.adminLeads.list, {
        filter: "all",
        paginationOpts: { numItems: 10, cursor: null },
      });
    } catch {
      rejected = true;
    }
    expect(rejected).toBe(true);
  });
});

test("AWD setup requires consent, records an admin action, and is safe to repeat", async () => {
  const previousAdmin = process.env.ADMIN_EMAIL;
  process.env.ADMIN_EMAIL = "owner@example.com";
  try {
    const t = convexTest(schema, modules);
    t.registerComponent("betterAuth", defineSchema({}), {
      "./_generated/api.js": async () => ({}),
      "./adapter.ts": async () => ({
        findOne: internalQuery({
          args: { model: v.string(), where: v.any() },
          returns: v.any(),
          handler: async (_ctx, args) =>
            args.model === "session"
              ? { _id: "session" }
              : { _id: "admin", email: "owner@example.com" },
        }),
      }),
    });
    const admin = t.withIdentity({ subject: "admin", sessionId: "session" });
    const configuration = {
      email: "quotes@example.com",
      notificationPhone: "+13375550123",
      smsConsentAccepted: true,
    };
    let rejected = false;
    try {
      await admin.mutation(internal.agencyIntake.configure, {
        ...configuration,
        smsConsentAccepted: false,
      });
    } catch {
      rejected = true;
    }
    expect(rejected).toBe(true);
    const first = await admin.mutation(
      internal.agencyIntake.configure,
      configuration,
    );
    const again = await admin.mutation(
      internal.agencyIntake.configure,
      configuration,
    );
    expect(again.projectId).toBe(first.projectId);
    expect(first.rawKey?.startsWith("sk_live_")).toBe(true);
    expect(again.rawKey).toBeNull();
    const project = await t.run((ctx) => ctx.db.get(first.projectId));
    expect(project?.buildDetails?.smsConsent?.source).toBe(
      "admin_recorded_explicit_owner_consent",
    );
    expect(
      await t.run((ctx) => ctx.db.query("projects").collect()),
    ).toHaveLength(1);
    expect(
      await t.run((ctx) => ctx.db.query("project_credentials").collect()),
    ).toHaveLength(1);
    expect(
      await t.run((ctx) => ctx.db.query("order_forms").collect()),
    ).toHaveLength(0);
    expect(
      await t.run((ctx) => ctx.db.query("activity_log").collect()),
    ).toHaveLength(2);
  } finally {
    if (previousAdmin === undefined) delete process.env.ADMIN_EMAIL;
    else process.env.ADMIN_EMAIL = previousAdmin;
  }
});
