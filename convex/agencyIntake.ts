import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireAdmin } from "./adminGuard";
import { generateCredential } from "./credentialCrypto";

/** Admin-authenticated setup for AWD's own inbound lead recipient. Never creates billing. */
export const configure = mutation({
  args: {
    email: v.string(),
    notificationPhone: v.string(),
    smsConsentAccepted: v.boolean(),
  },
  returns: v.object({
    projectId: v.id("projects"),
    rawKey: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const email = args.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200)
      throw new Error("Invalid email");
    if (!/^\+[1-9]\d{7,14}$/.test(args.notificationPhone))
      throw new Error("Use an E.164 notification phone");
    if (!args.smsConsentAccepted)
      throw new Error(
        "Record the owner's SMS consent before enabling quote alerts",
      );
    const now = Date.now();
    const existing = await ctx.db
      .query("projects")
      .withIndex("by_projectId", (q) =>
        q.eq("projectId", "acadiana-web-design"),
      )
      .unique();
    if (existing && (existing.authUserId !== admin._id || !existing.prospectId || existing.projectStatus !== "LIVE" || existing.deployment?.liveUrl !== "acadianawebdesign.com"))
      throw new Error("Existing AWD recipient needs manual review");
    const details = {
      contactName: "Layken Varholdt",
      contactEmail: email,
      companyName: "Acadiana Web Design",
      phone: "+13373063705",
      currentWebsite: "https://acadianawebdesign.com",
      businessDescription:
        "Custom managed websites for local service businesses in Acadiana. Quote requests for new websites, redesigns, and website help.",
      prospectNotes:
        "Internal AWD lead recipient. No client billing or agreement is required.",
    };
    const prospectId =
      existing?.prospectId ??
      (await ctx.db.insert("prospects", {
        sessionId: crypto.randomUUID(),
        resumeToken: crypto.randomUUID(),
        details,
        planGenerationInProgress: false,
        createdAt: now,
        updatedAt: now,
      }));
    if (existing) {
      const prospect = await ctx.db.get(prospectId);
      if (!prospect) throw new Error("AWD recipient prospect is missing");
      await ctx.db.patch(prospectId, {
        details: { ...prospect.details, contactEmail: email },
        updatedAt: now,
      });
    }
    const samePhone =
      existing?.buildDetails?.notificationPhone === args.notificationPhone;
    const buildDetails = {
      headline: null,
      domainPreference: "acadianawebdesign.com",
      inspirationLinks: [],
      myNotes: "AWD organic quote intake",
      notificationPhone: args.notificationPhone,
      smsConsent:
        samePhone && existing?.buildDetails?.smsConsent
          ? existing.buildDetails.smsConsent
          : {
              acceptedAt: now,
              disclosureVersion: "owner-quote-alerts-2026-09-07",
              source: "admin_recorded_explicit_owner_consent",
            },
      brand: { colorScheme: { primary: "#2b7cee", accent: "#d19a34" } },
      brandAssetsUploaded: false,
    };
    const projectId =
      existing?._id ??
      (await ctx.db.insert("projects", {
        authUserId: admin._id,
        projectId: "acadiana-web-design",
        prospectId,
        projectStatus: "LIVE",
        deployment: { liveUrl: "acadianawebdesign.com" },
        buildDetails,
        createdAt: now,
        updatedAt: now,
      }));
    if (existing)
      await ctx.db.patch(projectId, {
        buildDetails: existing.buildDetails
          ? {
              ...existing.buildDetails,
              notificationPhone: buildDetails.notificationPhone,
              smsConsent: buildDetails.smsConsent,
            }
          : buildDetails,
        updatedAt: now,
      });
    const credentials = await ctx.db
      .query("project_credentials")
      .withIndex("by_projectId_and_kind", (q) =>
        q.eq("projectId", projectId).eq("kind", "secret"),
      )
      .take(100);
    let rawKey: string | null = null;
    if (!credentials.some((credential) => !credential.revokedAt)) {
      if (credentials.length === 100)
        throw new Error("Review credential history before issuing another key");
      const generated = await generateCredential("secret");
      await ctx.db.insert("project_credentials", {
        projectId,
        keyId: generated.keyId,
        kind: "secret",
        credentialHash: generated.credentialHash,
        createdAt: now,
        label: "awd-site production",
      });
      rawKey = generated.rawKey;
    }
    await ctx.db.insert("activity_log", {
      projectId,
      prospectId,
      actor: "admin",
      kind: "agency.quote_recipient_configured",
      payload: { smsConsentRecorded: true },
      createdAt: now,
    });
    return { projectId, rawKey };
  },
});
