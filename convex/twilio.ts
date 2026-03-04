"use node";

import { Twilio } from "@convex-dev/twilio";
import { components } from "./_generated/api";

function createTwilioClient() {
  const { TWILIO_PHONE_NUMBER, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
  if (!TWILIO_PHONE_NUMBER || !TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    return null;
  }

  return new Twilio(components.twilio, {
    defaultFrom: TWILIO_PHONE_NUMBER,
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
  });
}

let twilioClient: ReturnType<typeof createTwilioClient> | undefined;

export function getTwilioClient() {
  if (twilioClient !== undefined) {
    return twilioClient;
  }
  twilioClient = createTwilioClient();
  return twilioClient;
}
