"use node";
import { v } from "convex/values";
import { action } from "./_generated/server";
import crypto from "crypto";

export const processCalWebhook = action({
  args: {
    signature: v.string(),
    secret: v.string(),
    body: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    try {
      const computedSignature = crypto.createHmac("sha256", args.secret).update(args.body).digest("hex");
      console.log(computedSignature);
      console.log(args.signature);
      console.log(crypto.timingSafeEqual(Buffer.from(computedSignature), Buffer.from(args.signature)));
      const payload = JSON.parse(args.body);
      console.log(payload);
      return { success: true, payload };
    } catch (error: unknown) {
      console.error(error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});
