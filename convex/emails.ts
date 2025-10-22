import { components } from "./_generated/api";
import { Resend } from "@convex-dev/resend";
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const resend: Resend = new Resend(components.resend, {
  testMode: false,
});

// Placeholder test email function for debugging
export const sendTestEmail = internalMutation({
  args: { to: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log("[emails] sending test email", { to: args.to });

    await resend.sendEmail(ctx, {
      from: "Acadiana Web Design <welcome@notifications.acadianawebdesign.com>",
      to: args.to,
      subject: "Test Email",
      html: `<p>Test email from the system</p>`,
    });

    return null;
  },
});
