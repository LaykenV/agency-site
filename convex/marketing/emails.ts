"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import {
  EMAIL_STYLES,
  SUPPORT_EMAIL,
  escapeHtml,
  getBaseUrl,
  getCtaButton,
  getEmailFooter,
  getEmailHeader,
  getEmailWrapper,
  getInfoBox,
  getListUnsubscribeHeaders,
  resend,
} from "../emails";

function getAuditUrl(token: string): string {
  return `${getBaseUrl()}/audit/${token}`;
}

function clampScore(score?: number): number | undefined {
  if (typeof score !== "number" || Number.isNaN(score)) return undefined;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export const sendAuditEmail = internalAction({
  args: {
    leadId: v.id("scraped_leads"),
    recipientEmail: v.string(),
    recipientName: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const lead = await ctx.runQuery(internal.marketing.search.internalGetLeadById, {
      leadId: args.leadId,
    });

    if (!lead || !lead.demoToken) {
      return null;
    }

    const auditUrl = getAuditUrl(lead.demoToken);
    const score = clampScore(lead.pageSpeedData?.performanceScore);
    const rawBusinessName = lead.googleData.businessName;
    const rawName = args.recipientName?.trim() || "there";
    const businessName = escapeHtml(rawBusinessName);
    const name = escapeHtml(rawName);
    const primaryColor = lead.websiteData?.primaryColor ?? EMAIL_STYLES.primaryColor;

    const scoreBox =
      typeof score === "number"
        ? `<div style="margin:16px 0;padding:12px;border-left:4px solid ${score >= 80 ? "#10b981" : "#f59e0b"};background:${score >= 80 ? "#ecfdf5" : "#fffbeb"};color:${score >= 80 ? "#065f46" : "#92400e"};">Current mobile speed score: <strong>${score}/100</strong>${score < 80 ? " (below our 90+ target)." : "."}</div>`
        : "";

    const tech = lead.websiteData?.technology;
    const techBox = tech
      ? `<div style="margin:16px 0;padding:12px;border-left:4px solid ${escapeHtml(primaryColor)};background:#eff6ff;color:#1e3a8a;">Current platform detected: <strong>${escapeHtml(tech)}</strong>. We can improve speed and conversions with a modern custom build.</div>`
      : "";

    const painPoints = lead.aiAnalysis?.painPoints ?? [];
    const painPointsList =
      painPoints.length > 0
        ? `<ul style="margin:16px 0;padding-left:20px;color:${EMAIL_STYLES.textMuted};line-height:1.8;">${painPoints
            .slice(0, 5)
            .map((point) => `<li>${escapeHtml(point)}</li>`)
            .join("")}</ul>`
        : `<ul style="margin:16px 0;padding-left:20px;color:${EMAIL_STYLES.textMuted};line-height:1.8;"><li>Site speed appears lower than top local competitors.</li><li>Mobile-first conversion layout can be improved.</li><li>Clearer service structure can help local rankings.</li></ul>`;

    const html = getEmailWrapper(`
      <div style="background: linear-gradient(135deg, ${escapeHtml(primaryColor)} 0%, ${EMAIL_STYLES.primaryDark} 100%); padding: 28px 24px; text-align:center;">
        <div class="gmail-blend-screen">
          <div class="gmail-blend-difference">
            <h1 style="margin:0;color:#ffffff !important;-webkit-text-fill-color:#ffffff !important;font-size:24px;font-weight:700;">Free Website Audit for ${businessName}</h1>
            <p style="margin:10px 0 0;color:#ffffff !important;-webkit-text-fill-color:#ffffff !important;opacity:0.92;">We found issues that may be costing you calls</p>
          </div>
        </div>
      </div>
      <div style="padding:28px 24px;">
        <p style="margin:0 0 16px;color:${EMAIL_STYLES.textDark};font-size:16px;">Hi ${name},</p>
        <p style="margin:0 0 20px;color:${EMAIL_STYLES.textMuted};line-height:1.6;">We reviewed ${businessName}'s current online presence and put together a free audit report with specific opportunities to improve speed and conversions.</p>
        ${scoreBox}
        ${painPointsList}
        ${techBox}
        <div style="text-align:center;margin:24px 0;">
          ${getCtaButton("See Your Full Audit Report", auditUrl)}
        </div>
        ${getInfoBox("What you get with our $199/mo plan", [
          "Custom site design and build",
          "Unlimited edits handled for you",
          "Fast hosting + ongoing maintenance",
          "Clear local-service conversion focused layout",
        ])}
        <p style="margin:20px 0 0;color:${EMAIL_STYLES.textMuted};">Reply here if you want to walk through the audit together on a quick 15-minute call.</p>
      </div>
      ${getEmailFooter(new Date().getFullYear(), "Acadiana Web Design, Lafayette, LA")}
    `);

    const text = [
      `Hi ${rawName},`,
      "",
      `We ran a free website audit for ${rawBusinessName}.`,
      `View it here: ${auditUrl}`,
      "",
      typeof score === "number" ? `Current mobile PageSpeed score: ${score}/100` : "PageSpeed score: unavailable",
      ...(painPoints.length
        ? ["Key issues:", ...painPoints.slice(0, 5).map((point) => `- ${point}`)]
        : []),
      "",
      "Our $199/mo plan includes:",
      "- Custom site build",
      "- Unlimited edits",
      "- Fast hosting and maintenance",
      "",
      `Reply to this email or contact ${SUPPORT_EMAIL} to schedule a call.`,
    ]
      .filter(Boolean)
      .join("\n");

    await resend.sendEmail(ctx, {
      from: "Acadiana Web Design <outreach@acadianawebdesign.com>",
      to: args.recipientEmail,
      subject: `${rawBusinessName}: we found issues with your website`,
      html,
      text,
      replyTo: [SUPPORT_EMAIL],
      headers: getListUnsubscribeHeaders(),
    });

    await ctx.runMutation(internal.marketing.search.internalMarkEmailSent, {
      leadId: args.leadId,
      followUpAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      isFollowUp: false,
    });

    await ctx.scheduler.runAfter(0, internal.activityLog.logActivity, {
      actor: "admin",
      kind: "marketing.outreach_sent",
      payload: {
        leadId: args.leadId,
        recipientEmail: args.recipientEmail,
      },
    });

    return null;
  },
});

export const sendPortfolioEmail = internalAction({
  args: {
    leadId: v.id("scraped_leads"),
    recipientEmail: v.string(),
    recipientName: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const lead = await ctx.runQuery(internal.marketing.search.internalGetLeadById, {
      leadId: args.leadId,
    });

    if (!lead) {
      return null;
    }

    const portfolioUrl = "https://tbtreeservice.org";
    const score = clampScore(lead.pageSpeedData?.performanceScore);
    const rawBusinessName = lead.googleData.businessName;
    const rawName = args.recipientName?.trim() || "there";
    const businessName = escapeHtml(rawBusinessName);
    const name = escapeHtml(rawName);

    const outreachAngle = lead.aiAnalysis?.outreachAngle
      ? `<p style="margin:0 0 20px;color:${EMAIL_STYLES.textMuted};line-height:1.6;">${escapeHtml(lead.aiAnalysis.outreachAngle)}</p>`
      : "";

    const scoreBox =
      typeof score === "number" && score < 80
        ? `<div style="margin:16px 0;padding:12px;border-left:4px solid #f59e0b;background:#fffbeb;color:#92400e;">Your current mobile speed score is <strong>${score}/100</strong>. We typically target 90+.</div>`
        : "";

    const tech = lead.websiteData?.technology;
    const techBox = tech
      ? `<div style="margin:16px 0;padding:12px;border-left:4px solid ${EMAIL_STYLES.primaryColor};background:#eff6ff;color:#1e3a8a;">We can outperform your current ${escapeHtml(tech)} setup with a faster custom build.</div>`
      : "";

    const painPoints = lead.aiAnalysis?.painPoints;
    const painPointsList =
      painPoints && painPoints.length > 0
        ? `<ul style="margin:16px 0;padding-left:20px;color:${EMAIL_STYLES.textMuted};line-height:1.8;">${painPoints.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>`
        : "";

    const html = getEmailWrapper(`
      ${getEmailHeader(`A faster website for ${businessName}`, "Here's what we can do")}
      <div style="padding:28px 24px;">
        <p style="margin:0 0 16px;color:${EMAIL_STYLES.textDark};font-size:16px;">Hi ${name},</p>
        <p style="margin:0 0 20px;color:${EMAIL_STYLES.textMuted};line-height:1.6;">We took a look at ${businessName}'s web presence and wanted to show you what a modern, high-performance site looks like for a local service business.</p>
        ${outreachAngle}
        <div style="text-align:center;margin:24px 0;">
          ${getCtaButton("See a Site We Built", portfolioUrl)}
        </div>
        <p style="margin:0 0 16px;color:${EMAIL_STYLES.textMuted};font-size:14px;text-align:center;">This is a real site we built for a local tree service company.</p>
        ${scoreBox}
        ${techBox}
        ${painPointsList}
        ${getInfoBox("What you get with our $199/mo plan", [
          "Custom site design and build",
          "Unlimited edits handled for you",
          "Fast hosting + ongoing maintenance",
          "Clear local-service conversion focused layout",
        ])}
        <p style="margin:20px 0 0;color:${EMAIL_STYLES.textMuted};">Interested? Reply here and we can schedule a quick call to talk about ${businessName}.</p>
      </div>
      ${getEmailFooter(new Date().getFullYear(), "Acadiana Web Design, Lafayette, LA")}
    `);

    const text = [
      `Hi ${rawName},`,
      "",
      `We looked at ${rawBusinessName}'s web presence and wanted to show you what a faster site looks like.`,
      "",
      `See a site we built for a local service business: ${portfolioUrl}`,
      "",
      typeof score === "number" ? `Current mobile PageSpeed score: ${score}/100` : "",
      "",
      "Our $199/mo plan includes:",
      "- Custom site build",
      "- Unlimited edits",
      "- Fast hosting and maintenance",
      "",
      `Reply to this email or contact ${SUPPORT_EMAIL} to schedule a call.`,
    ]
      .filter(Boolean)
      .join("\n");

    await resend.sendEmail(ctx, {
      from: "Acadiana Web Design <outreach@acadianawebdesign.com>",
      to: args.recipientEmail,
      subject: `${rawBusinessName}: see what a faster website looks like`,
      html,
      text,
      replyTo: [SUPPORT_EMAIL],
      headers: getListUnsubscribeHeaders(),
    });

    await ctx.runMutation(internal.marketing.search.internalMarkEmailSent, {
      leadId: args.leadId,
      followUpAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      isFollowUp: false,
    });

    await ctx.scheduler.runAfter(0, internal.activityLog.logActivity, {
      actor: "admin",
      kind: "marketing.outreach_sent",
      payload: {
        leadId: args.leadId,
        recipientEmail: args.recipientEmail,
      },
    });

    return null;
  },
});

export const sendFollowUpEmail = internalAction({
  args: {
    leadId: v.id("scraped_leads"),
    recipientEmail: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const lead = await ctx.runQuery(internal.marketing.search.internalGetLeadById, {
      leadId: args.leadId,
    });

    if (!lead || !lead.demoToken) {
      return null;
    }

    const auditUrl = getAuditUrl(lead.demoToken);
    const rawBusinessName = lead.googleData.businessName;
    const businessName = escapeHtml(rawBusinessName);

    const html = getEmailWrapper(`
      ${getEmailHeader(`Quick follow-up on your website audit for ${businessName}`)}
      <div style="padding:28px 24px;">
        <p style="margin:0 0 16px;color:${EMAIL_STYLES.textDark};font-size:16px;">Wanted to bump this in case it got buried.</p>
        <p style="margin:0 0 18px;color:${EMAIL_STYLES.textMuted};line-height:1.6;">Your website audit report for ${businessName} is still available:</p>
        <div style="text-align:center;margin:24px 0;">
          ${getCtaButton("View Your Audit Report", auditUrl)}
        </div>
        <p style="margin:0;color:${EMAIL_STYLES.textMuted};">If you'd like, we can walk through the issues and fix plan together in a short call.</p>
      </div>
      ${getEmailFooter(new Date().getFullYear(), "Acadiana Web Design, Lafayette, LA")}
    `);

    const text = [
      "Quick follow-up:",
      "",
      `Your audit report for ${rawBusinessName} is here: ${auditUrl}`,
      "",
      "Reply to this email if you want a quick walkthrough.",
    ].join("\n");

    await resend.sendEmail(ctx, {
      from: "Acadiana Web Design <outreach@acadianawebdesign.com>",
      to: args.recipientEmail,
      subject: `${rawBusinessName}: your website audit is still available`,
      html,
      text,
      replyTo: [SUPPORT_EMAIL],
      headers: getListUnsubscribeHeaders(),
    });

    await ctx.runMutation(internal.marketing.search.internalMarkEmailSent, {
      leadId: args.leadId,
      followUpAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      isFollowUp: true,
    });

    await ctx.scheduler.runAfter(0, internal.activityLog.logActivity, {
      actor: "admin",
      kind: "marketing.followup_sent",
      payload: {
        leadId: args.leadId,
        recipientEmail: args.recipientEmail,
      },
    });

    return null;
  },
});
