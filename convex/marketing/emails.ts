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

function getScoreColor(score: number): { color: string; bg: string; label: string } {
  if (score >= 80) return { color: "#10b981", bg: "#ecfdf5", label: "Good" };
  if (score >= 50) return { color: "#f59e0b", bg: "#fffbeb", label: "Needs Work" };
  return { color: "#ef4444", bg: "#fef2f2", label: "Poor" };
}

function getSpeedGauge(score: number): string {
  const { color, label } = getScoreColor(score);
  const barWidth = Math.max(4, score);

  return `
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0;">
      <tr>
        <td align="center" style="padding:0;">
          <div style="font-size:48px;font-weight:800;color:${color};letter-spacing:-2px;line-height:1;">${score}</div>
          <div style="font-size:13px;color:${color};font-weight:600;text-transform:uppercase;letter-spacing:1px;margin:4px 0 12px;">${label}</div>
          <div style="background:#e5e7eb;border-radius:4px;height:8px;width:100%;max-width:200px;margin:0 auto;">
            <div style="background:${color};border-radius:4px;height:8px;width:${barWidth}%;"></div>
          </div>
          <div style="font-size:11px;color:#9ca3af;margin-top:6px;">Mobile Speed Score</div>
        </td>
      </tr>
    </table>
  `;
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

    // Screenshot + speed gauge section
    const screenshotUrl = lead.websiteData?.screenshotUrl;
    const screenshotSection = screenshotUrl
      ? `<div style="margin:0 0 8px;border-radius:8px;overflow:hidden;border:1px solid ${EMAIL_STYLES.border};">
           <img src="${escapeHtml(screenshotUrl)}" alt="${businessName} website" width="552" style="display:block;width:100%;height:auto;border-radius:8px 8px 0 0;" />
         </div>`
      : "";

    const gaugeSection =
      typeof score === "number"
        ? `<div style="background:${getScoreColor(score).bg};border-radius:8px;padding:20px 16px;margin:0 0 20px;border:1px solid ${EMAIL_STYLES.border};">
             ${getSpeedGauge(score)}
           </div>`
        : "";

    const tech = lead.websiteData?.technology;
    const techLine =
      tech && tech !== "custom"
        ? `<tr><td style="padding:6px 0 6px 20px;color:${EMAIL_STYLES.textMuted};font-size:14px;line-height:1.6;">&#x26A0; Built on <strong>${escapeHtml(tech)}</strong> &mdash; limited speed &amp; flexibility</td></tr>`
        : "";

    const painPoints = lead.aiAnalysis?.painPoints ?? [];
    const issueRows =
      painPoints.length > 0
        ? painPoints
            .slice(0, 4)
            .map(
              (point) =>
                `<tr><td style="padding:6px 0 6px 20px;color:${EMAIL_STYLES.textMuted};font-size:14px;line-height:1.6;">&#x2022; ${escapeHtml(point)}</td></tr>`
            )
            .join("")
        : `<tr><td style="padding:6px 0 6px 20px;color:${EMAIL_STYLES.textMuted};font-size:14px;line-height:1.6;">&#x2022; Mobile speed below top local competitors</td></tr>
           <tr><td style="padding:6px 0 6px 20px;color:${EMAIL_STYLES.textMuted};font-size:14px;line-height:1.6;">&#x2022; Conversion layout can be improved</td></tr>`;

    const issuesSection = `
      <div style="margin:0 0 24px;">
        <h3 style="margin:0 0 8px;font-size:15px;font-weight:600;color:${EMAIL_STYLES.textDark};">Issues we found</h3>
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          ${issueRows}
          ${techLine}
        </table>
      </div>
    `;

    // Branded footer section — logo + minimal copy
    const logoUrl = `${getBaseUrl()}/logo.png`;
    const brandSection = `
      <div style="text-align:center;margin:32px 0 8px;padding:24px 16px 0;border-top:1px solid ${EMAIL_STYLES.border};">
        <img src="${logoUrl}" alt="Acadiana Web Design" width="36" height="36" style="display:inline-block;margin:0 auto 10px;" />
        <p style="margin:0 0 4px;font-size:15px;font-weight:600;color:${EMAIL_STYLES.textDark};">Acadiana Web Design</p>
        <p style="margin:0;font-size:13px;color:${EMAIL_STYLES.textMuted};line-height:1.5;">Fast, modern websites for local businesses &mdash; $199/mo, everything included.</p>
      </div>
    `;

    const html = getEmailWrapper(`
      <div style="background: linear-gradient(135deg, ${escapeHtml(primaryColor)} 0%, ${EMAIL_STYLES.primaryDark} 100%); padding: 28px 24px; text-align:center;">
        <div class="gmail-blend-screen">
          <div class="gmail-blend-difference">
            <h1 style="margin:0;color:#ffffff !important;-webkit-text-fill-color:#ffffff !important;font-size:22px;font-weight:700;">Website Audit for ${businessName}</h1>
            <p style="margin:8px 0 0;color:#ffffff !important;-webkit-text-fill-color:#ffffff !important;opacity:0.92;font-size:14px;">We found issues that may be costing you customers</p>
          </div>
        </div>
      </div>
      <div style="padding:28px 24px;">
        <p style="margin:0 0 16px;color:${EMAIL_STYLES.textDark};font-size:16px;">Hi ${name},</p>
        <p style="margin:0 0 20px;color:${EMAIL_STYLES.textMuted};line-height:1.6;">We ran a free audit on ${businessName}'s website. Here's a snapshot of what we found:</p>
        ${screenshotSection}
        ${gaugeSection}
        ${issuesSection}
        <div style="text-align:center;margin:28px 0;">
          ${getCtaButton("See Your Full Audit Report", auditUrl)}
        </div>
        <p style="margin:0;text-align:center;color:${EMAIL_STYLES.textMuted};font-size:13px;">Reply to this email if you'd like a quick walkthrough.</p>
        ${brandSection}
      </div>
      ${getEmailFooter(new Date().getFullYear(), "Acadiana Web Design, Lafayette, LA")}
    `);

    const text = [
      `Hi ${rawName},`,
      "",
      `We ran a free website audit for ${rawBusinessName}.`,
      `View your full report: ${auditUrl}`,
      "",
      typeof score === "number" ? `Mobile speed score: ${score}/100` : "",
      ...(painPoints.length
        ? ["Issues found:", ...painPoints.slice(0, 4).map((point) => `- ${point}`)]
        : []),
      "",
      "Acadiana Web Design",
      "Fast, modern websites for local businesses — $199/mo, everything included.",
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
