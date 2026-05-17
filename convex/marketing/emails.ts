"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import {
  EMAIL_STYLES,
  FOUNDER_EMAIL,
  FOUNDER_FROM_LINE,
  FOUNDER_PHONE_DISPLAY,
  escapeHtml,
  getBaseUrl,
  getEmailWrapper,
  getFounderSignatureHtml,
  getFounderSignatureText,
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

// Conversational opening line tied to whatever we actually know about the
// prospect's site — score > technology > nothing. Avoids generic "we ran a
// free audit" framing that signals bulk outreach.
function buildAuditOpener(args: {
  businessName: string;
  websiteUrl?: string;
  score?: number;
  technology?: string;
}): string {
  if (!args.websiteUrl) {
    return `I couldn't find a website for ${args.businessName} — every Google search for your business right now is a missed customer.`;
  }
  if (typeof args.score === "number") {
    return `Pulled up ${args.businessName}'s site this morning and ran it through Google's mobile speed test. It scored ${args.score}/100 — Google penalizes anything under 90 in local search rankings.`;
  }
  if (args.technology && args.technology !== "custom") {
    return `Pulled up ${args.businessName}'s site this morning. It's built on ${args.technology}, which caps how fast it can load on mobile — and Google penalizes slow sites in local search.`;
  }
  return `Pulled up ${args.businessName}'s site this morning and ran it through a few of the tools Google uses to rank local businesses. Found a couple things worth knowing.`;
}

function buildAuditPreheader(args: {
  businessName: string;
  score?: number;
  websiteUrl?: string;
}): string {
  if (!args.websiteUrl) {
    return `No website on Google for ${args.businessName} — here's what that's costing you.`;
  }
  if (typeof args.score === "number") {
    return `Your mobile speed score is ${args.score}/100 — here's what's costing you customers.`;
  }
  return `Quick look at ${args.businessName}'s site — a couple of things worth knowing.`;
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
    const businessName = escapeHtml(rawBusinessName);
    const websiteUrl = lead.googleData.websiteUrl;
    const technology = lead.websiteData?.technology;
    const trimmedName = args.recipientName?.trim();

    const rawOpener = buildAuditOpener({
      businessName: rawBusinessName,
      websiteUrl,
      score,
      technology,
    });
    const opener = escapeHtml(rawOpener);

    // Personal greeting only when we actually know their first name. Generic
    // "Hi there," reads as bulk and trains the recipient to skim past.
    const greetingHtml = trimmedName
      ? `<p style="margin:0 0 16px;color:${EMAIL_STYLES.textDark};font-size:16px;">Hi ${escapeHtml(trimmedName)},</p>`
      : "";

    // Lightweight proof-of-work: keep the screenshot (shows we actually
    // looked at their site) but drop the gradient banner and bullet boxes
    // that scream "template".
    const screenshotUrl = lead.websiteData?.screenshotUrl;
    const screenshotSection = screenshotUrl
      ? `<div style="margin:20px 0;border-radius:8px;overflow:hidden;border:1px solid ${EMAIL_STYLES.border};">
           <img src="${escapeHtml(screenshotUrl)}" alt="${businessName} website" width="552" style="display:block;width:100%;height:auto;" />
         </div>`
      : "";

    const reportLink = `
      <p style="margin:20px 0 8px;font-size:15px;color:${EMAIL_STYLES.textDark};line-height:1.6;">
        I put the full breakdown on one page — no signup, no follow-up sequence:
      </p>
      <p style="margin:0 0 4px;">
        <a href="${auditUrl}" style="color:${EMAIL_STYLES.primaryColor};font-weight:600;font-size:16px;text-decoration:underline;">See your audit report &rarr;</a>
      </p>
      <p style="margin:0 0 20px;font-size:12px;color:${EMAIL_STYLES.textLight};word-break:break-all;">${auditUrl}</p>
    `;

    const permissionLine = `
      <p style="margin:0 0 20px;color:${EMAIL_STYLES.textMuted};line-height:1.6;font-size:15px;">
        If now's not the right time, no worries &mdash; I'll send one more note next week and then close the file.
      </p>
    `;

    const psLine = `
      <p style="margin:24px 0 0;color:${EMAIL_STYLES.textMuted};line-height:1.6;font-size:14px;">
        P.S. &mdash; Built <a href="https://tbtreeservice.org" style="color:${EMAIL_STYLES.textMuted};">tbtreeservice.org</a> in 9 days. Same setup I'd use for ${businessName}.
      </p>
    `;

    const preheader = buildAuditPreheader({
      businessName: rawBusinessName,
      score,
      websiteUrl,
    });

    const html = getEmailWrapper(
      `
      <div style="padding:32px 28px;">
        ${greetingHtml}
        <p style="margin:0 0 16px;color:${EMAIL_STYLES.textDark};font-size:16px;line-height:1.6;">${opener}</p>
        ${screenshotSection}
        ${reportLink}
        ${permissionLine}
        ${getFounderSignatureHtml()}
        ${psLine}
      </div>
    `,
      preheader,
    );

    const text = [
      trimmedName ? `Hi ${trimmedName},` : "",
      "",
      rawOpener,
      "",
      "I put the full breakdown on one page — no signup, no follow-up sequence:",
      auditUrl,
      "",
      "If now's not the right time, no worries — I'll send one more note next week and then close the file.",
      "",
      getFounderSignatureText(),
      "",
      `P.S. — Built tbtreeservice.org in 9 days. Same setup I'd use for ${rawBusinessName}.`,
    ]
      .filter((line) => line !== undefined && line !== null)
      .join("\n");

    await resend.sendEmail(ctx, {
      from: FOUNDER_FROM_LINE,
      to: args.recipientEmail,
      subject: `quick thing about ${rawBusinessName}'s site`,
      html,
      text,
      replyTo: [FOUNDER_EMAIL],
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

// Alternative first-touch: instead of an audit, lead with a side-by-side
// comparison against a real site we built. One concrete reference beats a
// portfolio gallery — the prospect can see the gap, not browse it.
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
    const businessName = escapeHtml(rawBusinessName);
    const trimmedName = args.recipientName?.trim();

    const greetingHtml = trimmedName
      ? `<p style="margin:0 0 16px;color:${EMAIL_STYLES.textDark};font-size:16px;">Hi ${escapeHtml(trimmedName)},</p>`
      : "";

    // Three differences the prospect can verify in 30 seconds — concrete >
    // adjectives. Speed line uses their real number if we have it.
    const speedDiff =
      typeof score === "number"
        ? `Mobile load time &mdash; theirs scores 95+/100, yours scores ${score}/100`
        : `Mobile load time &mdash; theirs scores 95+/100, most sites in your category score below 50`;

    const differences = [
      speedDiff,
      "Phone number visible the second the page loads &mdash; not buried in a header menu",
      "One tap from Google search to a call &mdash; no contact form maze",
    ];
    const diffsHtml = differences
      .map(
        (d, i) =>
          `<tr>
             <td style="padding:8px 12px 8px 0;vertical-align:top;color:${EMAIL_STYLES.primaryColor};font-weight:700;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:14px;">${String(i + 1).padStart(2, "0")}</td>
             <td style="padding:8px 0;color:${EMAIL_STYLES.textDark};font-size:15px;line-height:1.6;">${d}</td>
           </tr>`,
      )
      .join("");

    const preheader = `Three differences between ${rawBusinessName} and a site I built last quarter.`;

    const html = getEmailWrapper(
      `
      <div style="padding:32px 28px;">
        ${greetingHtml}
        <p style="margin:0 0 18px;color:${EMAIL_STYLES.textDark};font-size:16px;line-height:1.6;">
          Looked at ${businessName}'s site next to one I built last quarter for a local tree service (<a href="${portfolioUrl}" style="color:${EMAIL_STYLES.primaryColor};">tbtreeservice.org</a>).
        </p>
        <p style="margin:0 0 12px;color:${EMAIL_STYLES.textDark};font-size:16px;line-height:1.6;">
          Three differences that matter for ranking on Google for local searches:
        </p>
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px;">
          ${diffsHtml}
        </table>
        <p style="margin:0 0 12px;color:${EMAIL_STYLES.textDark};font-size:15px;line-height:1.6;">
          If any of that sounds worth fixing on ${businessName}, reply "yes" and I'll send a 3-page plan tailored to your site.
        </p>
        <p style="margin:0 0 20px;color:${EMAIL_STYLES.textMuted};line-height:1.6;font-size:15px;">
          If not, no worries &mdash; I'll send one more note next week and then close the file.
        </p>
        ${getFounderSignatureHtml()}
        <p style="margin:24px 0 0;color:${EMAIL_STYLES.textMuted};line-height:1.6;font-size:14px;">
          P.S. &mdash; $199/mo flat. Custom design, fast hosting, unlimited edits. No upfront.
        </p>
      </div>
    `,
      preheader,
    );

    const text = [
      trimmedName ? `Hi ${trimmedName},` : "",
      "",
      `Looked at ${rawBusinessName}'s site next to one I built last quarter for a local tree service (${portfolioUrl}).`,
      "",
      "Three differences that matter for ranking on Google for local searches:",
      "",
      typeof score === "number"
        ? `01  Mobile load time — theirs scores 95+/100, yours scores ${score}/100`
        : "01  Mobile load time — theirs scores 95+/100, most sites in your category score below 50",
      "02  Phone number visible the second the page loads — not buried in a header menu",
      "03  One tap from Google search to a call — no contact form maze",
      "",
      `If any of that sounds worth fixing on ${rawBusinessName}, reply "yes" and I'll send a 3-page plan tailored to your site.`,
      "",
      "If not, no worries — I'll send one more note next week and then close the file.",
      "",
      getFounderSignatureText(),
      "",
      "P.S. — $199/mo flat. Custom design, fast hosting, unlimited edits. No upfront.",
    ]
      .filter((line) => line !== undefined && line !== null)
      .join("\n");

    await resend.sendEmail(ctx, {
      from: FOUNDER_FROM_LINE,
      to: args.recipientEmail,
      subject: `built one of these for a tree service`,
      html,
      text,
      replyTo: [FOUNDER_EMAIL],
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

// 7-day bump. Doesn't re-pitch — gives the recipient an easy graceful exit
// ("close the file?") which paradoxically lifts replies because saying no
// is frictionless and saying yes feels like the rescue.
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

    const preheader = `Should I close the file on ${rawBusinessName} or hold it open?`;

    const html = getEmailWrapper(
      `
      <div style="padding:32px 28px;">
        <p style="margin:0 0 16px;color:${EMAIL_STYLES.textDark};font-size:16px;line-height:1.6;">
          Hey &mdash; last time I'll bump this. Should I close the file or hold it open?
        </p>
        <p style="margin:0 0 20px;color:${EMAIL_STYLES.textMuted};font-size:15px;line-height:1.6;">
          Your audit's still here if it helps:
          <a href="${auditUrl}" style="color:${EMAIL_STYLES.primaryColor};font-weight:600;text-decoration:underline;">view report &rarr;</a>
        </p>
        <p style="margin:0 0 20px;color:${EMAIL_STYLES.textMuted};font-size:14px;line-height:1.6;">
          Either way works &mdash; just a one-word reply ("close" or "hold") and I'll do the rest. Or call/text me direct: <a href="tel:+13373063705" style="color:${EMAIL_STYLES.textMuted};">${FOUNDER_PHONE_DISPLAY}</a>.
        </p>
        ${getFounderSignatureHtml()}
      </div>
    `,
      preheader,
    );

    const text = [
      "Hey — last time I'll bump this. Should I close the file or hold it open?",
      "",
      `Your audit's still here if it helps: ${auditUrl}`,
      "",
      `Either way works — just a one-word reply ("close" or "hold") and I'll do the rest. Or call/text me direct: ${FOUNDER_PHONE_DISPLAY}.`,
      "",
      getFounderSignatureText(),
    ].join("\n");

    await resend.sendEmail(ctx, {
      from: FOUNDER_FROM_LINE,
      to: args.recipientEmail,
      subject: `close the file?`,
      html,
      text,
      replyTo: [FOUNDER_EMAIL],
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
