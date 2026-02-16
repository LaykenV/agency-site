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

function getDemoUrl(token: string): string {
  return `${getBaseUrl()}/demo/${token}`;
}

function clampScore(score?: number): number | undefined {
  if (typeof score !== "number" || Number.isNaN(score)) return undefined;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export const sendMockupEmail = internalAction({
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

    const demoUrl = getDemoUrl(lead.demoToken);
    const score = clampScore(lead.pageSpeedData?.performanceScore);
    const businessName = escapeHtml(lead.googleData.businessName);
    const name = escapeHtml(args.recipientName?.trim() || "there");
    const primaryColor = lead.websiteData?.primaryColor ?? EMAIL_STYLES.primaryColor;

    const scoreBox =
      typeof score === "number" && score < 80
        ? `<div style="margin:16px 0;padding:12px;border-left:4px solid #f59e0b;background:#fffbeb;color:#92400e;">Your current mobile speed score is <strong>${score}/100</strong>. We typically target 90+.</div>`
        : "";

    const tech = lead.websiteData?.technology;
    const techBox = tech
      ? `<div style="margin:16px 0;padding:12px;border-left:4px solid ${escapeHtml(primaryColor)};background:#eff6ff;color:#1e3a8a;">We can outperform your current ${escapeHtml(tech)} setup with a faster custom build.</div>`
      : "";

    const screenshot = lead.demoScreenshotUrl
      ? `<a href="${escapeHtml(demoUrl)}" target="_blank" rel="noopener noreferrer"><img src="${escapeHtml(lead.demoScreenshotUrl)}" alt="Website preview" style="display:block;width:100%;max-width:560px;border-radius:10px;border:1px solid #e5e7eb;" /></a>`
      : "";

    const html = getEmailWrapper(`
      <div style="background: linear-gradient(135deg, ${escapeHtml(primaryColor)} 0%, ${EMAIL_STYLES.primaryDark} 100%); padding: 28px 24px; text-align:center;">
        <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">We built a preview of your new website</h1>
        <p style="margin:10px 0 0;color:#fff;opacity:0.92;">for ${businessName}</p>
      </div>
      <div style="padding:28px 24px;">
        <p style="margin:0 0 16px;color:${EMAIL_STYLES.textDark};font-size:16px;">Hi ${name},</p>
        <p style="margin:0 0 20px;color:${EMAIL_STYLES.textMuted};line-height:1.6;">We drafted a live website preview for ${businessName} based on your current web presence and local market expectations.</p>
        ${screenshot}
        ${scoreBox}
        ${techBox}
        <div style="text-align:center;margin:24px 0;">
          ${getCtaButton("See Your Website Preview", demoUrl)}
        </div>
        ${getInfoBox("What you get with our $199/mo plan", [
          "Custom site design and build",
          "Unlimited edits handled for you",
          "Fast hosting + ongoing maintenance",
          "Clear local-service conversion focused layout",
        ])}
        <p style="margin:20px 0 0;color:${EMAIL_STYLES.textMuted};">Prefer to talk first? Reply here and we can schedule a quick 15-minute call.</p>
      </div>
      ${getEmailFooter(new Date().getFullYear(), "Acadiana Web Design, Lafayette, LA")}
    `);

    const text = [
      `Hi ${name},`,
      "",
      `We built a website preview for ${businessName}.`,
      `View it here: ${demoUrl}`,
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
      from: "Acadiana Web Design <outreach@marketing.acadianawebdesign.com>",
      to: args.recipientEmail,
      subject: `${businessName}: your website preview is ready`,
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

    const demoUrl = getDemoUrl(lead.demoToken);
    const businessName = escapeHtml(lead.googleData.businessName);

    const html = getEmailWrapper(`
      ${getEmailHeader("Quick follow-up on your website preview")}
      <div style="padding:28px 24px;">
        <p style="margin:0 0 16px;color:${EMAIL_STYLES.textDark};font-size:16px;">Wanted to bump this in case it got buried.</p>
        <p style="margin:0 0 18px;color:${EMAIL_STYLES.textMuted};line-height:1.6;">Your live preview for ${businessName} is still up:</p>
        <div style="text-align:center;margin:24px 0;">
          ${getCtaButton("Open My Preview", demoUrl)}
        </div>
        <p style="margin:0;color:${EMAIL_STYLES.textMuted};">If you'd like, we can also walk through it together in a short call.</p>
      </div>
      ${getEmailFooter(new Date().getFullYear(), "Acadiana Web Design, Lafayette, LA")}
    `);

    const text = [
      "Quick follow-up:",
      "",
      `Your preview for ${businessName} is here: ${demoUrl}`,
      "",
      "Reply to this email if you want a quick walkthrough.",
    ].join("\n");

    await resend.sendEmail(ctx, {
      from: "Acadiana Web Design <outreach@marketing.acadianawebdesign.com>",
      to: args.recipientEmail,
      subject: `${businessName}: quick follow-up on your website preview`,
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
