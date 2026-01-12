"use node";

import { components, internal } from "./_generated/api";
import { Resend } from "@convex-dev/resend";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { TERMS_SUMMARY_POINTS, TERMS_VERSION } from "../lib/legal/terms";

export const resend: Resend = new Resend(components.resend, {
  testMode: false,
});

// =============================================================================
// EMAIL BRANDING CONSTANTS & HELPERS
// =============================================================================

const EMAIL_STYLES = {
  primaryColor: '#3b82f6',
  primaryDark: '#1e40af',
  amberAccent: '#d19a34',
  textDark: '#111827',
  textMuted: '#6b7280',
  textLight: '#9ca3af',
  background: '#f9fafb',
  cardBackground: '#ffffff',
  border: '#e5e7eb',
  infoBg: '#eff6ff',
  infoBorder: '#3b82f6',
  infoText: '#1e40af',
  warningBg: '#fef3c7',
  warningBorder: '#f59e0b',
  warningText: '#92400e',
};

const COMPANY_NAME = 'Acadiana Web Design';

// Get the base URL for email assets and links
function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL 
    ? `https://${process.env.NEXT_PUBLIC_APP_URL}` 
    : (process.env.SITE_URL ?? "http://localhost:3000");
}

// Inline SVG logo for email (simplified, works in most email clients)
function getEmailLogoSvg(): string {
  return `
    <svg width="48" height="48" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto 16px auto;">
      <path d="M434.271903 467.915408s-39.444109 19.335347-39.444108 60.326284 39.444109 60.326284 39.444108 60.326284 39.444109-19.335347 39.444109-60.326284-39.444109-60.326284-39.444109-60.326284z m11.601209-246.719033s-39.444109 19.335347-39.444109 60.326284 39.444109 60.326284 39.444109 60.326284 39.444109-19.335347 39.444109-60.326284-39.444109-60.326284-39.444109-60.326284zM350.743202 367.371601s39.444109-19.335347 39.444109-60.326284-39.444109-60.326284-39.444109-60.326284-39.444109 19.335347-39.444108 60.326284 39.444109 60.326284 39.444108 60.326284z m37.123867-125.293051s39.444109-19.335347 39.444109-60.326284-39.444109-60.326284-39.444109-60.326284-39.444109 19.335347-39.444108 60.326284 39.444109 60.326284 39.444108 60.326284z m88.169185-163.190332s-39.444109 19.335347-39.444109 60.326284 39.444109 60.326284 39.444109 60.326283 39.444109-19.335347 39.444109-60.326283c0-41.76435-39.444109-60.326284-39.444109-60.326284z m203.407855 164.73716S718.888218 224.29003 718.888218 183.299094s-39.444109-60.326284-39.444109-60.326284-39.444109 19.335347-39.444109 60.326284 39.444109 60.326284 39.444109 60.326284z m-78.888218 60.326284c0 40.990937 39.444109 60.326284 39.444109 60.326284s39.444109-19.335347 39.444109-60.326284-39.444109-60.326284-39.444109-60.326284-39.444109 19.335347-39.444109 60.326284z m-293.897281 186.392749s-19.335347-39.444109-60.326284-39.444109-60.326284 39.444109-60.326284 39.444109 19.335347 39.444109 60.326284 39.444109 60.326284-39.444109 60.326284-39.444109z" fill="#ffffff"/>
      <path d="M640.773414 385.160121c-16.241692-4.640483-23.975831 39.444109-37.897281 57.232628-12.374622 15.468278-29.389728 13.92145-51.818731 13.148036-1.546828-42.537764-3.093656-78.114804-4.640484-101.31722-1.546828-21.655589-6.960725-29.389728-23.202416-29.389728s-22.429003 8.507553-23.202417 29.389728c-3.093656 51.818731-6.187311 163.963746-10.054381 278.429003-37.123867-1.546828-80.435045-17.015106-105.957704-48.725076-26.296073-32.483384-36.350453-129.160121-51.818731-125.293051-15.468278 3.093656-11.601208 113.691843 25.522658 160.870091 29.389728 37.123867 74.247734 64.966767 131.480363 67.287009-3.867069 146.94864-6.960725 283.069486-6.960725 283.069486h82.755287s-6.187311-279.975831-12.374622-471.009063c36.350453-1.546828 56.459215-8.507553 71.154078-25.522659 17.015106-18.561934 33.256798-82.755287 17.015106-88.169184" fill="${EMAIL_STYLES.amberAccent}"/>
    </svg>
  `;
}

// Email header with gradient background and logo
export function getEmailHeader(title: string, subtitle?: string): string {
  return `
    <div style="background: linear-gradient(135deg, ${EMAIL_STYLES.primaryColor} 0%, ${EMAIL_STYLES.primaryDark} 100%); padding: 32px 24px; text-align: center;">
      ${getEmailLogoSvg()}
      <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600;">
        ${title}
      </h1>
      ${subtitle ? `<p style="margin: 8px 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">${subtitle}</p>` : ''}
    </div>
  `;
}

// Email footer with copyright and optional extra text
export function getEmailFooter(year: number, extra?: string): string {
  return `
    <div style="background: ${EMAIL_STYLES.background}; padding: 24px; text-align: center; border-top: 1px solid ${EMAIL_STYLES.border};">
      ${extra ? `<p style="margin: 0 0 8px; font-size: 12px; color: ${EMAIL_STYLES.textMuted};">${extra}</p>` : ''}
      <p style="margin: 0; font-size: 12px; color: ${EMAIL_STYLES.textLight};">
        &copy; ${year} ${COMPANY_NAME}. All rights reserved.
      </p>
    </div>
  `;
}

// Primary CTA button
export function getCtaButton(text: string, href: string, variant: 'primary' | 'secondary' | 'dark' = 'primary'): string {
  const styles = {
    primary: `background: ${EMAIL_STYLES.primaryColor}; color: white; border: none;`,
    secondary: `background: ${EMAIL_STYLES.background}; color: ${EMAIL_STYLES.textDark}; border: 1px solid ${EMAIL_STYLES.border};`,
    dark: `background: ${EMAIL_STYLES.textDark}; color: white; border: none;`,
  };
  
  return `
    <a href="${href}" 
       style="display: inline-block; ${styles[variant]} text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
      ${text}
    </a>
  `;
}

// Email wrapper with consistent styling
export function getEmailWrapper(content: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: ${EMAIL_STYLES.background};">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: ${EMAIL_STYLES.cardBackground}; border-radius: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); overflow: hidden;">
            ${content}
          </div>
        </div>
      </body>
    </html>
  `;
}

// Info box with left border accent
export function getInfoBox(title: string, items: string[]): string {
  const listHtml = items.map(item => `<li style="margin-bottom: 8px;">${item}</li>`).join('');
  return `
    <div style="margin: 32px 0; padding: 20px; background: ${EMAIL_STYLES.infoBg}; border-left: 4px solid ${EMAIL_STYLES.infoBorder}; border-radius: 4px;">
      <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: ${EMAIL_STYLES.infoText};">
        ${title}
      </h3>
      <ol style="margin: 0; padding-left: 20px; color: ${EMAIL_STYLES.primaryDark};">
        ${listHtml}
      </ol>
    </div>
  `;
}

// Warning/tip box with amber styling
export function getWarningBox(content: string): string {
  return `
    <div style="margin: 24px 0 0 0; padding: 16px 20px; background: ${EMAIL_STYLES.warningBg}; border-radius: 8px; border-left: 4px solid ${EMAIL_STYLES.warningBorder};">
      <p style="margin: 0; font-size: 14px; color: ${EMAIL_STYLES.warningText}; line-height: 1.5;">
        ${content}
      </p>
    </div>
  `;
}

// Escape HTML to prevent XSS in emails
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Re-export EMAIL_STYLES for use in auth.ts
export { EMAIL_STYLES, COMPANY_NAME, getBaseUrl };

// Placeholder test email function for debugging
export const sendTestEmail = internalAction({
  args: { to: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log("[emails] sending test email", { to: args.to });

    const htmlContent = getEmailWrapper(`
      ${getEmailHeader('Test Email', 'System verification')}
      <div style="padding: 32px 24px;">
        <p style="margin: 0 0 16px 0; font-size: 16px; color: ${EMAIL_STYLES.textDark};">
          Hello,
        </p>
        <p style="margin: 0 0 24px 0; font-size: 16px; color: ${EMAIL_STYLES.textMuted}; line-height: 1.6;">
          This is a test email from ${COMPANY_NAME}. If you received this, the email system is working correctly.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          ${getCtaButton('Visit Our Website', getBaseUrl())}
        </div>
        <p style="margin: 24px 0 0 0; font-size: 14px; color: ${EMAIL_STYLES.textMuted}; line-height: 1.6;">
          This is an automated test message. No action is required.
        </p>
      </div>
      ${getEmailFooter(new Date().getFullYear())}
    `);

    await resend.sendEmail(ctx, {
      from: "Acadiana Web Design <welcome@acadianawebdesign.com>",
      to: args.to,
      subject: "Test Email - Acadiana Web Design",
      html: htmlContent,
    });

    return null;
  },
});

export const sendWelcomeEmail = internalAction({
  args: {
    projectId: v.id("projects"),
    userEmail: v.string(),
    userName: v.string(),
    companyName: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log("[emails] sending welcome email", { 
      projectId: args.projectId, 
      userEmail: args.userEmail 
    });

    // Fetch the agreement details
    const agreement = await ctx.runQuery(internal.agreement.internalGetLatestAgreementForProject, {
      projectId: args.projectId,
    });

    // Build the summary points HTML
    const summaryPointsHtml = TERMS_SUMMARY_POINTS.map((point) => `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid ${EMAIL_STYLES.border};">
          <strong style="color: ${EMAIL_STYLES.textDark};">${point.label}</strong>
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid ${EMAIL_STYLES.border}; color: ${EMAIL_STYLES.textMuted};">
          ${point.value}
        </td>
      </tr>
    `).join("");

    const snapshotLink = agreement?.snapshotUrl 
      ? `<p style="margin: 16px 0; font-size: 14px; color: ${EMAIL_STYLES.textMuted};">
           <a href="${agreement.snapshotUrl}" style="color: ${EMAIL_STYLES.primaryColor}; text-decoration: underline;">
             View your signed agreement (Version ${agreement.termsVersion})
           </a>
         </p>`
      : "";

    const htmlContent = getEmailWrapper(`
      ${getEmailHeader('Welcome Aboard!', 'Your website project starts now')}
      
      <!-- Content -->
      <div style="padding: 32px 24px;">
        <p style="margin: 0 0 16px 0; font-size: 16px; color: ${EMAIL_STYLES.textDark};">
          Hi ${args.userName},
        </p>
        
        <p style="margin: 0 0 24px 0; font-size: 16px; color: ${EMAIL_STYLES.textMuted}; line-height: 1.6;">
          Thank you for choosing ${COMPANY_NAME}! Your subscription is now active, and we're excited to build something amazing for ${args.companyName}.
        </p>
        
        <div style="background: ${EMAIL_STYLES.background}; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: ${EMAIL_STYLES.textDark};">
            Order Summary
          </h2>
          <table style="width: 100%; border-collapse: collapse; background: ${EMAIL_STYLES.cardBackground}; border-radius: 6px; overflow: hidden;">
            ${summaryPointsHtml}
          </table>
        </div>
        
        ${snapshotLink}
        
        ${getInfoBox("What's Next?", [
          "Log in to your portal to schedule your kickoff call",
          "Upload your brand assets (logo, photos, copy)",
          "We'll begin building your high-performance website"
        ])}
        
        <div style="text-align: center; margin: 32px 0;">
          ${getCtaButton('Go to Your Portal', `${getBaseUrl()}/portal`)}
        </div>
        
        <p style="margin: 24px 0 0 0; font-size: 14px; color: ${EMAIL_STYLES.textMuted}; line-height: 1.6;">
          Questions? We're here to help. Reply to this email or contact us at 
          <a href="mailto:support@acadianawebdesign.com" style="color: ${EMAIL_STYLES.primaryColor}; text-decoration: underline;">
            support@acadianawebdesign.com
          </a>.
        </p>
      </div>
      
      ${getEmailFooter(new Date().getFullYear(), `Agreement Version: ${agreement?.termsVersion || TERMS_VERSION}`)}
    `);

    await resend.sendEmail(ctx, {
      from: "Acadiana Web Design <welcome@acadianawebdesign.com>",
      to: args.userEmail,
      subject: `Welcome Aboard, ${args.userName}! Your Website Project Starts Now`,
      html: htmlContent,
    });

    return null;
  },
});

export const sendLeadNotification = internalAction({
  args: {
    projectId: v.string(),
    leadId: v.id("client_leads"),
    leadData: v.object({
      name: v.string(),
      email: v.string(),
      phone: v.optional(v.string()),
      message: v.optional(v.string()),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log("[emails] sending lead notification", {
      projectId: args.projectId,
      leadName: args.leadData.name,
    });

    // Get project to find the prospect/client email
    const project = await ctx.runQuery(internal.projects.getByProjectIdSlug, {
      projectId: args.projectId,
    });

    if (!project || !project.prospectId) {
      console.warn("[emails] No project or prospect found for lead notification", {
        projectId: args.projectId,
      });
      return null;
    }

    // Get prospect details
    const prospect = await ctx.runQuery(internal.prospects.internalGetProspectById, {
      prospectId: project.prospectId,
    });

    if (!prospect) {
      console.warn("[emails] Prospect not found for lead notification", {
        prospectId: project.prospectId,
      });
      return null;
    }

    const clientEmail = prospect.details.contactEmail;
    const clientName = prospect.details.contactName || "there";
    const companyName = prospect.details.companyName || "your business";

    const leadName = escapeHtml(args.leadData.name);
    const leadEmail = escapeHtml(args.leadData.email);
    const leadPhone = args.leadData.phone ? escapeHtml(args.leadData.phone) : null;
    const leadMessage = args.leadData.message
      ? escapeHtml(args.leadData.message).replace(/\n/g, "<br>")
      : null;

    const htmlContent = getEmailWrapper(`
      ${getEmailHeader('New Lead from Your Website!', 'Someone just reached out')}
      
      <!-- Content -->
      <div style="padding: 32px 24px;">
        <p style="margin: 0 0 16px 0; font-size: 16px; color: ${EMAIL_STYLES.textDark};">
          Hi ${escapeHtml(clientName)},
        </p>
        
        <p style="margin: 0 0 24px 0; font-size: 16px; color: ${EMAIL_STYLES.textMuted}; line-height: 1.6;">
          Great news! Someone just submitted a contact form on your <strong style="color: ${EMAIL_STYLES.textDark};">${escapeHtml(companyName)}</strong> website. Here are the details:
        </p>
        
        <!-- Lead Details Card -->
        <div style="background: ${EMAIL_STYLES.background}; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid ${EMAIL_STYLES.border};">
          <h2 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 600; color: ${EMAIL_STYLES.textDark}; display: flex; align-items: center;">
            <span style="display: inline-block; width: 8px; height: 8px; background: ${EMAIL_STYLES.primaryColor}; border-radius: 50%; margin-right: 10px;"></span>
            Lead Details
          </h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 12px 0; color: ${EMAIL_STYLES.textMuted}; font-size: 14px; width: 100px; vertical-align: top;">Name</td>
              <td style="padding: 12px 0; color: ${EMAIL_STYLES.textDark}; font-size: 14px; font-weight: 500;">${leadName}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-top: 1px solid ${EMAIL_STYLES.border}; color: ${EMAIL_STYLES.textMuted}; font-size: 14px; vertical-align: top;">Email</td>
              <td style="padding: 12px 0; border-top: 1px solid ${EMAIL_STYLES.border}; color: ${EMAIL_STYLES.textDark}; font-size: 14px;">
                <a href="mailto:${leadEmail}" style="color: ${EMAIL_STYLES.primaryColor}; text-decoration: none; font-weight: 500;">${leadEmail}</a>
              </td>
            </tr>
            ${
              leadPhone
                ? `
            <tr>
              <td style="padding: 12px 0; border-top: 1px solid ${EMAIL_STYLES.border}; color: ${EMAIL_STYLES.textMuted}; font-size: 14px; vertical-align: top;">Phone</td>
              <td style="padding: 12px 0; border-top: 1px solid ${EMAIL_STYLES.border}; color: ${EMAIL_STYLES.textDark}; font-size: 14px;">
                <a href="tel:${leadPhone}" style="color: ${EMAIL_STYLES.primaryColor}; text-decoration: none; font-weight: 500;">${leadPhone}</a>
              </td>
            </tr>
            `
                : ""
            }
            ${
              leadMessage
                ? `
            <tr>
              <td style="padding: 12px 0; border-top: 1px solid ${EMAIL_STYLES.border}; color: ${EMAIL_STYLES.textMuted}; font-size: 14px; vertical-align: top;">Message</td>
              <td style="padding: 12px 0; border-top: 1px solid ${EMAIL_STYLES.border}; color: ${EMAIL_STYLES.textDark}; font-size: 14px; line-height: 1.6;">${leadMessage}</td>
            </tr>
            `
                : ""
            }
          </table>
        </div>
        
        <!-- Quick Actions -->
        <div style="text-align: center; margin: 28px 0;">
          <a href="mailto:${leadEmail}" 
             style="display: inline-block; background: ${EMAIL_STYLES.primaryColor}; color: white; text-decoration: none; padding: 14px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; text-align: center; margin-right: 8px;">
            Reply to ${leadName.split(" ")[0]}
          </a>
          ${
            leadPhone
              ? `
          <a href="tel:${leadPhone}" 
             style="display: inline-block; background: ${EMAIL_STYLES.background}; color: ${EMAIL_STYLES.textDark}; text-decoration: none; padding: 14px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; text-align: center; border: 1px solid ${EMAIL_STYLES.border};">
            Call Now
          </a>
          `
              : ""
          }
        </div>
        
        <div style="text-align: center; margin: 32px 0 24px 0;">
          ${getCtaButton('View All Leads in Portal', `${getBaseUrl()}/portal`, 'dark')}
        </div>
        
        ${getWarningBox('<strong>Pro tip:</strong> Responding within 5 minutes increases your chances of converting this lead by 9x. The sooner you reach out, the better!')}
      </div>
      
      ${getEmailFooter(new Date().getFullYear(), 'This lead was submitted via your website\'s contact form.')}
    `);

    await resend.sendEmail(ctx, {
      from: "Acadiana Web Design <leads@acadianawebdesign.com>",
      to: clientEmail,
      subject: `New Lead: ${args.leadData.name} - ${companyName}`,
      html: htmlContent,
    });

    console.log("[emails] lead notification sent successfully", {
      projectId: args.projectId,
      clientEmail,
    });

    return null;
  },
});
