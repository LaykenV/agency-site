"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { getTwilioClient } from "./twilio";

export const sendLeadNotificationSms = internalAction({
  args: {
    to: v.string(),
    leadName: v.string(),
    leadPhone: v.optional(v.string()),
    leadEmail: v.string(),
    leadMessage: v.optional(v.string()),
    projectName: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const twilio = getTwilioClient();
    if (!twilio) {
      console.warn(
        "[notifications] Twilio credentials missing (TWILIO_PHONE_NUMBER, TWILIO_ACCOUNT_SID, or TWILIO_AUTH_TOKEN); skipping SMS",
      );
      return null;
    }

    const body = [
      `New lead for ${args.projectName}`,
      `Name: ${args.leadName}`,
      `Email: ${args.leadEmail}`,
      args.leadPhone ? `Phone: ${args.leadPhone}` : undefined,
      args.leadMessage?.trim()
        ? `Message: ${args.leadMessage.trim()}`
        : "Message: (none provided)",
      "Reply to this lead ASAP for the best chance of closing.",
    ]
      .filter((line): line is string => Boolean(line))
      .join("\n");

    try {
      await twilio.sendMessage(ctx, {
        to: args.to,
        body,
      });
    } catch (error) {
      console.error("[notifications] Failed to send lead SMS", {
        to: args.to,
        projectName: args.projectName,
        error,
      });
    }

    return null;
  },
});
