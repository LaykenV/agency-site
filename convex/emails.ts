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
