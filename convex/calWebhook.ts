import { httpAction } from "./_generated/server";
import crypto from "crypto";

export const calWebhook = httpAction(async (ctx, req) => {
  try {
    const signature = req.headers.get("x-cal-signature-256");
    if (!signature) {
      return new Response("Unauthorized", { status: 401 });
    }
    const secret = process.env.CAL_WEBHOOK_SECRET;
    if (!secret) {
      return new Response("Missing CAL_WEBHOOK_SECRET", { status: 500 });
    }
    const body = await req.text();
    const computedSignature = crypto.createHmac("sha256", secret).update(body).digest("hex");
    console.log(computedSignature);
    console.log(signature);
    console.log(crypto.timingSafeEqual(Buffer.from(computedSignature), Buffer.from(signature)));
    const payload = JSON.parse(body);
    console.log(payload);
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response("Error", { status: 500 });
  }
});