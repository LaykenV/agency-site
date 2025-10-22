import { components } from "./_generated/api";
import { Resend } from "@convex-dev/resend";
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const resend: Resend = new Resend(components.resend, {
    testMode: false
});

export const sendWelcomeEmail = internalMutation({
  args: {
    prospectId: v.id("prospects"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log("[emails] sending welcome email", {
      prospectId: args.prospectId,
    });

    await resend.sendEmail(ctx, {
      from: "Acadiana Web Design <welcome@notifications.acadianawebdesign.com>",
      to: "laykenv@gmail.com",
      subject: "Welcome to the agency",
      html: `<p>Welcome to the agency</p>`,
    });
    return null;
  },
});
