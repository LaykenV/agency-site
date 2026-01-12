"use node";

import { components, internal } from "./_generated/api";
import { Resend } from "@convex-dev/resend";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { TERMS_SUMMARY_POINTS, TERMS_VERSION } from "../lib/legal/terms";

export const resend: Resend = new Resend(components.resend, {
  testMode: false,
});

// Placeholder test email function for debugging
export const sendTestEmail = internalAction({
  args: { to: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log("[emails] sending test email", { to: args.to });

    await resend.sendEmail(ctx, {
      from: "Acadiana Web Design <welcome@acadianawebdesign.com>",
      to: args.to,
      subject: "Test Email",
      html: `<p>Test email from the system</p>`,
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
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
          <strong style="color: #111827;">${point.label}</strong>
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">
          ${point.value}
        </td>
      </tr>
    `).join("");

    const snapshotLink = agreement?.snapshotUrl 
      ? `<p style="margin: 16px 0; font-size: 14px; color: #6b7280;">
           <a href="${agreement.snapshotUrl}" style="color: #2563eb; text-decoration: underline;">
             View your signed agreement (Version ${agreement.termsVersion})
           </a>
         </p>`
      : "";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome Aboard - Acadiana Web Design</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); overflow: hidden;">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 32px 24px; text-align: center;">
                <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 600;">
                  Welcome Aboard! 🎉
                </h1>
              </div>
              
              <!-- Content -->
              <div style="padding: 32px 24px;">
                <p style="margin: 0 0 16px 0; font-size: 16px; color: #111827;">
                  Hi ${args.userName},
                </p>
                
                <p style="margin: 0 0 24px 0; font-size: 16px; color: #6b7280; line-height: 1.6;">
                  Thank you for choosing Acadiana Web Design! Your subscription is now active, and we're excited to build something amazing for ${args.companyName}.
                </p>
                
                <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0;">
                  <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #111827;">
                    Order Summary
                  </h2>
                  <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 6px; overflow: hidden;">
                    ${summaryPointsHtml}
                  </table>
                </div>
                
                ${snapshotLink}
                
                <div style="margin: 32px 0; padding: 20px; background: #eff6ff; border-left: 4px solid #2563eb; border-radius: 4px;">
                  <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #1e40af;">
                    What's Next?
                  </h3>
                  <ol style="margin: 0; padding-left: 20px; color: #1e3a8a;">
                    <li style="margin-bottom: 8px;">Log in to your portal to schedule your kickoff call</li>
                    <li style="margin-bottom: 8px;">Upload your brand assets (logo, photos, copy)</li>
                    <li style="margin-bottom: 8px;">We'll begin building your high-performance website</li>
                  </ol>
                </div>
                
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL ? `https://${process.env.NEXT_PUBLIC_APP_URL}` : (process.env.SITE_URL ?? "http://localhost:3000")}/portal" 
                     style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Go to Your Portal
                  </a>
                </div>
                
                <p style="margin: 24px 0 0 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                  Questions? We're here to help. Reply to this email or contact us at 
                  <a href="mailto:support@acadianawebdesign.com" style="color: #2563eb; text-decoration: underline;">
                    support@acadianawebdesign.com
                  </a>.
                </p>
              </div>
              
              <!-- Footer -->
              <div style="background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                  © ${new Date().getFullYear()} Acadiana Web Design. All rights reserved.
                </p>
                <p style="margin: 8px 0 0 0; font-size: 12px; color: #9ca3af;">
                  Agreement Version: ${agreement?.termsVersion || TERMS_VERSION}
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

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

    const portalUrl = process.env.NEXT_PUBLIC_APP_URL
      ? `https://${process.env.NEXT_PUBLIC_APP_URL}`
      : process.env.SITE_URL ?? "http://localhost:3000";

    // Escape HTML to prevent XSS in email
    const escapeHtml = (str: string) =>
      str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const leadName = escapeHtml(args.leadData.name);
    const leadEmail = escapeHtml(args.leadData.email);
    const leadPhone = args.leadData.phone ? escapeHtml(args.leadData.phone) : null;
    const leadMessage = args.leadData.message
      ? escapeHtml(args.leadData.message).replace(/\n/g, "<br>")
      : null;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Lead from Your Website</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); overflow: hidden;">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px 24px; text-align: center;">
                <div style="font-size: 48px; margin-bottom: 8px;">🎉</div>
                <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600;">
                  New Lead from Your Website!
                </h1>
              </div>
              
              <!-- Content -->
              <div style="padding: 32px 24px;">
                <p style="margin: 0 0 16px 0; font-size: 16px; color: #111827;">
                  Hi ${escapeHtml(clientName)},
                </p>
                
                <p style="margin: 0 0 24px 0; font-size: 16px; color: #6b7280; line-height: 1.6;">
                  Great news! Someone just submitted a contact form on your <strong style="color: #111827;">${escapeHtml(companyName)}</strong> website. Here are the details:
                </p>
                
                <!-- Lead Details Card -->
                <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #e5e7eb;">
                  <h2 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 600; color: #111827; display: flex; align-items: center;">
                    <span style="display: inline-block; width: 8px; height: 8px; background: #10b981; border-radius: 50%; margin-right: 10px;"></span>
                    Lead Details
                  </h2>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 12px 0; color: #6b7280; font-size: 14px; width: 100px; vertical-align: top;">Name</td>
                      <td style="padding: 12px 0; color: #111827; font-size: 14px; font-weight: 500;">${leadName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; vertical-align: top;">Email</td>
                      <td style="padding: 12px 0; border-top: 1px solid #e5e7eb; color: #111827; font-size: 14px;">
                        <a href="mailto:${leadEmail}" style="color: #2563eb; text-decoration: none; font-weight: 500;">${leadEmail}</a>
                      </td>
                    </tr>
                    ${
                      leadPhone
                        ? `
                    <tr>
                      <td style="padding: 12px 0; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; vertical-align: top;">Phone</td>
                      <td style="padding: 12px 0; border-top: 1px solid #e5e7eb; color: #111827; font-size: 14px;">
                        <a href="tel:${leadPhone}" style="color: #2563eb; text-decoration: none; font-weight: 500;">${leadPhone}</a>
                      </td>
                    </tr>
                    `
                        : ""
                    }
                    ${
                      leadMessage
                        ? `
                    <tr>
                      <td style="padding: 12px 0; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; vertical-align: top;">Message</td>
                      <td style="padding: 12px 0; border-top: 1px solid #e5e7eb; color: #111827; font-size: 14px; line-height: 1.6;">${leadMessage}</td>
                    </tr>
                    `
                        : ""
                    }
                  </table>
                </div>
                
                <!-- Quick Actions -->
                <div style="display: flex; gap: 12px; margin: 28px 0;">
                  <a href="mailto:${leadEmail}" 
                     style="flex: 1; display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 14px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; text-align: center;">
                    Reply to ${leadName.split(" ")[0]}
                  </a>
                  ${
                    leadPhone
                      ? `
                  <a href="tel:${leadPhone}" 
                     style="flex: 1; display: inline-block; background: #f3f4f6; color: #374151; text-decoration: none; padding: 14px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; text-align: center; border: 1px solid #e5e7eb;">
                    Call Now
                  </a>
                  `
                      : ""
                  }
                </div>
                
                <div style="text-align: center; margin: 32px 0 24px 0;">
                  <a href="${portalUrl}/portal" 
                     style="display: inline-block; background: #111827; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                    View All Leads in Portal
                  </a>
                </div>
                
                <!-- Pro Tip -->
                <div style="margin: 24px 0 0 0; padding: 16px 20px; background: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                  <p style="margin: 0; font-size: 14px; color: #92400e; line-height: 1.5;">
                    <strong>Pro tip:</strong> Responding within 5 minutes increases your chances of converting this lead by 9x. The sooner you reach out, the better!
                  </p>
                </div>
              </div>
              
              <!-- Footer -->
              <div style="background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0 0 8px 0; font-size: 12px; color: #9ca3af;">
                  This lead was submitted via your website's contact form.
                </p>
                <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                  &copy; ${new Date().getFullYear()} Acadiana Web Design. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

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
