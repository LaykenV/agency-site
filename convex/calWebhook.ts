"use node";
import { v } from "convex/values";
import { action } from "./_generated/server";
import crypto from "crypto";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

type CalPayload = {
  triggerEvent?: string;
  payload?: {
    type?: string;
    uid?: string;
    bookingId?: string | number;
    status?: string;
    length?: number;
    title?: string;
    startTime?: string;
    endTime?: string;
    additionalNotes?: string;
    location?: string | null;
    iCalUID?: string;
    attendees?: Array<{
      email?: string | null;
      name?: string | null;
    }>;
    responses?: Record<string, { answer?: unknown }>;
    metadata?: Record<string, unknown>;
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

const mapEventTypeToCallType = (eventTypeKey?: string): "confirmation" | "kickoff" | "review" | "support" => {
  if (eventTypeKey === "agency-prospect") return "confirmation";
  if (eventTypeKey === "agency-kickoff" || eventTypeKey === "website-kickoff-call") return "kickoff";
  if (eventTypeKey === "agency-review" || eventTypeKey === "website-review-call") return "review";
  return "support";
};

interface ParsedBookingData {
  primaryEmail?: string;
  primaryName?: string;
  phone?: string;
  meetingUrl?: string;
  notes?: string;
  startTime?: number;
  endTime?: number;
  title?: string;
  calEventId?: string;
  iCalUID?: string;
  externalBookingId?: string;
  status?: string;
  eventTypeKey?: string;
  durationMinutes?: number;
  location?: string;
  attendeeMetadata?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  projectIdFromMetadata?: string;
}

const parseCalBookingPayload = (payload: CalPayload["payload"]): ParsedBookingData => {
  if (!payload) {
    return {};
  }

  const responses = payload.responses as CalPayload["payload"] extends { responses?: infer R }
    ? R
    : Record<string, { answer?: unknown }> | undefined;

  const primaryEmail = normalizeEmail(
    extractResponseString(responses, "email") ?? payload.attendees?.[0]?.email ?? undefined,
  );

  const primaryName = normalizeString(
    extractResponseString(responses, "name") ?? payload.attendees?.[0]?.name ?? undefined,
  );

  const responsePhone = extractResponseString(responses, "attendeePhoneNumber");
  let phone = normalizeString(responsePhone);
  let meetingUrl: string | undefined;

  const location = normalizeString(payload.location ?? undefined);
  if (location) {
    if (looksLikeUrl(location)) {
      meetingUrl = location;
    } else if (!phone && looksLikePhone(location)) {
      phone = location;
    }
  }

  // Check metadata.videoCallUrl for actual meeting URL (when location is a placeholder like "integrations:google:meet")
  if (!meetingUrl && payload.metadata && typeof payload.metadata === "object" && "videoCallUrl" in payload.metadata) {
    const videoCallUrl = normalizeString(payload.metadata.videoCallUrl);
    if (videoCallUrl && looksLikeUrl(videoCallUrl)) {
      meetingUrl = videoCallUrl;
    }
  }

  const notes = normalizeString(payload.additionalNotes) ?? extractResponseString(responses, "notes");
  const scheduledAtRaw = normalizeString(payload.startTime);
  const endTimeRaw = normalizeString(payload.endTime);

  let startTime: number | undefined;
  let endTime: number | undefined;

  if (scheduledAtRaw) {
    const parsedStartTime = Date.parse(scheduledAtRaw);
    if (!Number.isNaN(parsedStartTime)) {
      startTime = parsedStartTime;
    }
  }

  if (endTimeRaw) {
    const parsedEndTime = Date.parse(endTimeRaw);
    if (!Number.isNaN(parsedEndTime)) {
      endTime = parsedEndTime;
    }
  } else if (startTime && typeof payload.length === "number") {
    // Calculate endTime from startTime + duration
    endTime = startTime + payload.length * 60 * 1000;
  }

  const uid = normalizeString(payload.uid);
  const iCalUID = normalizeString(payload.iCalUID);
  const title = normalizeString(payload.title);
  const status = normalizeString(payload.status);
  const eventTypeKey = normalizeString(payload.type);

  const durationMinutes = typeof payload.length === "number" ? payload.length : undefined;

  const externalBookingId =
    payload.bookingId !== undefined && payload.bookingId !== null ? String(payload.bookingId) : undefined;

  const attendeeMetadata = {
    name: primaryName,
    email: primaryEmail,
    phone,
  };

  const projectIdFromMetadata = normalizeString(payload.metadata?.projectId);

  return {
    primaryEmail,
    primaryName,
    phone,
    meetingUrl,
    notes,
    startTime,
    endTime,
    title,
    calEventId: uid,
    iCalUID,
    externalBookingId,
    status,
    eventTypeKey,
    durationMinutes,
    location,
    attendeeMetadata,
    projectIdFromMetadata,
  };
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

      // Handle all three booking event types
      if (
        triggerEvent === "BOOKING_CREATED" ||
        triggerEvent === "BOOKING_RESCHEDULED" ||
        triggerEvent === "BOOKING_CANCELED"
      ) {
        const data = parseCalBookingPayload(payload);

        if (!data.primaryEmail) {
          console.warn("[cal-webhook] missing attendee email", { triggerEvent });
          return { success: true };
        }

        if (!data.startTime) {
          console.warn("[cal-webhook] missing or invalid startTime", { triggerEvent });
          return { success: true };
        }

        if (!data.calEventId) {
          console.warn("[cal-webhook] missing uid", { triggerEvent });
          return { success: true };
        }

        // Determine projectId and prospectId
        let projectId: Id<"projects"> | undefined;
        let prospectId: Id<"prospects"> | undefined;

        if (data.projectIdFromMetadata) {
          // Validate that it's a valid project ID
          projectId = data.projectIdFromMetadata as Id<"projects">;
        } else {
          // Look up prospect by email
          const prospect = await ctx.runQuery(internal.cal.findProspectByEmail, {
            email: data.primaryEmail,
          });
          if (prospect) {
            prospectId = prospect._id;
            // Find project associated with this prospect
            const foundProjectId = await ctx.runQuery(internal.cal.findProjectByProspectId, {
              prospectId: prospect._id,
            });
            if (foundProjectId) {
              projectId = foundProjectId;
            }
          }
        }

        const callType = mapEventTypeToCallType(data.eventTypeKey);

        // Calculate endTime if not provided
        const endTime = data.endTime ?? (data.startTime + (data.durationMinutes ?? 15) * 60 * 1000);

        // For confirmation calls, ensure prospect exists first
        if (callType === "confirmation" && triggerEvent !== "BOOKING_CANCELED" && !prospectId) {
          prospectId = await ctx.runMutation(internal.cal.upsertProspectFromBooking, {
            email: data.primaryEmail,
            name: data.primaryName,
            phone: data.phone,
            booking: {
              scheduledAt: data.startTime,
              endTime,
              title: data.title,
              meetingUrl: data.meetingUrl,
              notes: data.notes,
              calEventId: data.calEventId,
              iCalUID: data.iCalUID,
              attendeeMetadata: data.attendeeMetadata,
              status: data.status,
              eventTypeKey: data.eventTypeKey,
              durationMinutes: data.durationMinutes,
              externalBookingId: data.externalBookingId,
            },
          });
        }

        // Upsert scheduled_calls entry
        await ctx.runMutation(internal.cal.upsertScheduledCall, {
          projectId,
          prospectId,
          type: callType,
          title: data.title,
          startTime: data.startTime,
          endTime,
          status: data.status ?? "UNKNOWN",
          meetingUrl: data.meetingUrl,
          location: data.location,
          notes: data.notes,
          calEventId: data.calEventId,
          iCalUID: data.iCalUID,
          eventTypeKey: data.eventTypeKey,
          durationMinutes: data.durationMinutes,
          externalBookingId: data.externalBookingId,
          attendeeMetadata: data.attendeeMetadata,
        });

        // Update snapshot fields based on call type
        if (triggerEvent !== "BOOKING_CANCELED") {
          if (callType === "kickoff" && projectId) {
            // Update projects.calKickoffBooking
            await ctx.runMutation(internal.cal.updateProjectBooking, {
              projectId,
              bookingType: "kickoff",
              booking: {
                scheduledAt: data.startTime,
                endTime,
                title: data.title,
                meetingUrl: data.meetingUrl,
                notes: data.notes,
                calEventId: data.calEventId,
                iCalUID: data.iCalUID,
                attendeeMetadata: data.attendeeMetadata,
                status: data.status,
                eventTypeKey: data.eventTypeKey,
                durationMinutes: data.durationMinutes,
                externalBookingId: data.externalBookingId,
              },
            });
          } else if (callType === "review" && projectId) {
            // Update projects.calReviewBooking
            await ctx.runMutation(internal.cal.updateProjectBooking, {
              projectId,
              bookingType: "review",
              booking: {
                scheduledAt: data.startTime,
                endTime,
                title: data.title,
                meetingUrl: data.meetingUrl,
                notes: data.notes,
                calEventId: data.calEventId,
                iCalUID: data.iCalUID,
                attendeeMetadata: data.attendeeMetadata,
                status: data.status,
                eventTypeKey: data.eventTypeKey,
                durationMinutes: data.durationMinutes,
                externalBookingId: data.externalBookingId,
              },
            });
          }
        }

        // Clear booking snapshots on cancellation and track success
        let snapshotCleared = false;
        if (triggerEvent === "BOOKING_CANCELED") {
          if (callType === "kickoff" && projectId) {
            const cleared: boolean = await ctx.runMutation(internal.cal.clearProjectBooking, {
              projectId,
              bookingType: "kickoff",
            });
            snapshotCleared = cleared;
          } else if (callType === "review" && projectId) {
            const cleared: boolean = await ctx.runMutation(internal.cal.clearProjectBooking, {
              projectId,
              bookingType: "review",
            });
            snapshotCleared = cleared;
          }
        }

        // Log activity
        const activityKind =
          triggerEvent === "BOOKING_CREATED"
            ? "call.booked"
            : triggerEvent === "BOOKING_RESCHEDULED"
              ? "call.rescheduled"
              : "call.canceled";

        await ctx.runMutation(internal.activityLog.logActivity, {
          projectId,
          prospectId,
          actor: "system",
          kind: activityKind,
          payload: {
            triggerEvent,
            calEventId: data.calEventId,
            externalBookingId: data.externalBookingId,
            eventType: data.eventTypeKey,
            email: data.primaryEmail,
            startTime: data.startTime,
            endTime,
            title: data.title,
            status: data.status,
            snapshotCleared,
            fullPayload: payload,
          },
        });

        console.log("[cal-webhook] processed booking event", {
          triggerEvent,
          eventType: data.eventTypeKey,
          calEventId: data.calEventId,
          email: data.primaryEmail,
          callType,
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
