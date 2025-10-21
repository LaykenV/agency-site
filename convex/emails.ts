import { components } from "./_generated/api";
import { Resend } from "@convex-dev/resend";
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const resend: Resend = new Resend(components.resend, {});

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
      from: "Me <test@mydomain.com>",
      to: "delivered@resend.dev",
      subject: "Hi there",
      html: "This is a test email",
    });
    return null;
  },
});
