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
    projectLiveUrl: v.optional(v.string()),
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

    const source = args.projectLiveUrl ?? "your website";
    const timestamp = new Date().toLocaleString("en-US", {
      timeZone: "America/Chicago",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const body = [
      `New lead from ${source}`,
      "",
      args.leadName,
      args.leadEmail,
      args.leadPhone ?? undefined,
      "",
      args.leadMessage?.trim() || "No message provided.",
      "",
      `Received at ${timestamp}`,
    ]
      .filter((line): line is string => line !== undefined)
      .join("\n");

    try {
      await twilio.sendMessage(ctx, {
        to: args.to,
        body,
      });
    } catch (error) {
      console.error("[notifications] Failed to send lead SMS", {
        to: args.to,
        projectLiveUrl: args.projectLiveUrl,
        error,
      });
    }

    return null;
  },
});
