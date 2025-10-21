"use node";
import { v } from "convex/values";
import { action } from "./_generated/server";
import crypto from "crypto";
import { internal } from "./_generated/api";

type CalPayload = {
  triggerEvent?: string;
  payload?: {
    type?: string;
    uid?: string;
    bookingId?: string | number;
    status?: string;
    length?: number;
    startTime?: string;
    additionalNotes?: string;
    location?: string | null;
    attendees?: Array<{
      email?: string | null;
      name?: string | null;
    }>;
    responses?: Record<string, { answer?: unknown }>;
  } & Record<string, unknown>;
};

const normalizeEmail = (raw: unknown): string | undefined => {
  if (typeof raw !== "string") {
    return undefined;
  }
  const normalized = raw.trim().toLowerCase();
  return normalized.length > 0 ? normalized : undefined;
};

const normalizeString = (raw: unknown): string | undefined => {
  if (typeof raw !== "string") {
    return undefined;
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const looksLikeUrl = (value: string): boolean => {
  const lower = value.toLowerCase();
  return lower.startsWith("http") || lower.includes("://");
};

const looksLikePhone = (value: string): boolean => {
  const digits = value.replace(/[\s().-]/g, "");
  return /^[+]?\d{7,}$/.test(digits);
};

const extractResponseString = (
  responses: CalPayload["payload"] extends { responses?: infer R } ? R : Record<string, { answer?: unknown }> | undefined,
  key: string,
): string | undefined => {
  if (!responses) {
    return undefined;
  }
  const entry = responses[key];
  if (!entry) {
    return undefined;
  }
  return normalizeString(entry.answer);
};

const parseSignature = (signature: string): Buffer | null => {
  const normalized = signature.startsWith("sha256=") ? signature.slice("sha256=".length) : signature;
  if (!/^[0-9a-fA-F]+$/.test(normalized)) {
    return null;
  }
  try {
    return Buffer.from(normalized, "hex");
  } catch {
    return null;
  }
};

export const processCalWebhook = action({
  args: {
    signature: v.string(),
    secret: v.string(),
    body: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
    status: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    try {
      const providedSignature = parseSignature(args.signature);
      if (!providedSignature) {
        console.warn("[cal-webhook] invalid signature format");
        return { success: false, error: "Invalid signature", status: 401 };
      }

      const computedSignatureHex = crypto.createHmac("sha256", args.secret).update(args.body).digest("hex");
      const computedSignature = Buffer.from(computedSignatureHex, "hex");

      if (providedSignature.length !== computedSignature.length) {
        console.warn("[cal-webhook] signature length mismatch");
        return { success: false, error: "Signature mismatch", status: 401 };
      }

      if (!crypto.timingSafeEqual(providedSignature, computedSignature)) {
        console.warn("[cal-webhook] signature validation failed");
        return { success: false, error: "Unauthorized", status: 401 };
      }

      const parsedBody: CalPayload = JSON.parse(args.body);
      console.log("[cal-webhook] parsed body", parsedBody);
      const { triggerEvent, payload } = parsedBody;

      if (!payload) {
        console.warn("[cal-webhook] missing payload", { triggerEvent });
        return { success: true };
      }

      if (triggerEvent === "BOOKING_CREATED" && payload.type === "agency-prospect") {
        const responses = payload.responses as CalPayload["payload"] extends { responses?: infer R }
          ? R
          : Record<string, { answer?: unknown }> | undefined;

        const primaryEmail = normalizeEmail(
          extractResponseString(responses, "email") ?? payload.attendees?.[0]?.email ?? undefined,
        );

        if (!primaryEmail) {
          throw new Error("Booking payload missing attendee email");
        }

        const primaryName = normalizeString(
          extractResponseString(responses, "name") ?? payload.attendees?.[0]?.name ?? undefined,
        );
        const responsePhone = extractResponseString(responses, "attendeePhoneNumber");

        let meetingUrl: string | undefined;
        let phone = normalizeString(responsePhone);

        const location = normalizeString(payload.location ?? undefined);
        if (location) {
          if (looksLikeUrl(location)) {
            meetingUrl = location;
          } else if (!phone && looksLikePhone(location)) {
            phone = location;
          }
        }

        const notes = normalizeString(payload.additionalNotes) ?? extractResponseString(responses, "notes");
        const scheduledAtRaw = normalizeString(payload.startTime);

        if (!scheduledAtRaw) {
          throw new Error("Booking payload missing startTime");
        }

        const scheduledAt = Date.parse(scheduledAtRaw);
        if (Number.isNaN(scheduledAt)) {
          throw new Error("Invalid booking startTime");
        }

        const uid = normalizeString(payload.uid);
        if (!uid) {
          throw new Error("Booking payload missing uid");
        }

        const attendeeMetadata = {
          name: primaryName,
          email: primaryEmail,
          phone,
        };

        await ctx.runMutation(internal.cal.upsertProspectFromBooking, {
          email: primaryEmail,
          name: primaryName,
          phone,
          booking: {
            scheduledAt,
            meetingUrl,
            notes,
            calEventId: uid,
            attendeeMetadata,
            status: normalizeString(payload.status),
            eventTypeKey: normalizeString(payload.type),
            durationMinutes: typeof payload.length === "number" ? payload.length : undefined,
            externalBookingId:
              payload.bookingId !== undefined && payload.bookingId !== null
                ? String(payload.bookingId)
                : undefined,
          },
        });

        console.log("[cal-webhook] processed prospect booking", {
          triggerEvent,
          eventType: payload.type,
          uid,
          email: primaryEmail,
        });
      } else {
        console.log("[cal-webhook] ignoring event", {
          triggerEvent,
          eventType: payload.type,
        });
      }

      return { success: true };
    } catch (error: unknown) {
      console.error("[cal-webhook] processing failed", {
        error,
      });
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});
