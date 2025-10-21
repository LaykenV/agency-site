import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
//import crypto from "crypto";

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const normalizeString = (value: string | undefined | null): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeOptionalNumber = (value: unknown): number | undefined => {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
};

export const upsertProspectFromBooking = internalMutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    booking: v.object({
      scheduledAt: v.number(),
      meetingUrl: v.optional(v.string()),
      notes: v.optional(v.string()),
      calEventId: v.string(),
      attendeeMetadata: v.optional(
        v.object({
          name: v.optional(v.string()),
          email: v.optional(v.string()),
          phone: v.optional(v.string()),
        }),
      ),
      status: v.optional(v.string()),
      eventTypeKey: v.optional(v.string()),
      durationMinutes: v.optional(v.number()),
      externalBookingId: v.optional(v.string()),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const normalizedEmail = normalizeEmail(args.email);
    const now = Date.now();

    const booking: {
      scheduledAt: number;
      meetingUrl?: string;
      notes?: string;
      calEventId: string;
      attendeeMetadata?: {
        name?: string;
        email?: string;
        phone?: string;
      };
      status?: string;
      eventTypeKey?: string;
      durationMinutes?: number;
      externalBookingId?: string;
    } = {
      scheduledAt: args.booking.scheduledAt,
      calEventId: args.booking.calEventId,
    };

    const meetingUrl = normalizeString(args.booking.meetingUrl ?? undefined);
    if (meetingUrl) {
      booking.meetingUrl = meetingUrl;
    }

    const notes = normalizeString(args.booking.notes ?? undefined);
    if (notes) {
      booking.notes = notes;
    }

    const status = normalizeString(args.booking.status ?? undefined);
    if (status) {
      booking.status = status;
    }

    const eventTypeKey = normalizeString(args.booking.eventTypeKey ?? undefined);
    if (eventTypeKey) {
      booking.eventTypeKey = eventTypeKey;
    }

    const externalBookingId = normalizeString(args.booking.externalBookingId ?? undefined);
    if (externalBookingId) {
      booking.externalBookingId = externalBookingId;
    }

    const durationMinutes = normalizeOptionalNumber(args.booking.durationMinutes);
    if (typeof durationMinutes === "number") {
      booking.durationMinutes = durationMinutes;
    }

    if (args.booking.attendeeMetadata) {
      const attendeeMetadata = {
        name: normalizeString(args.booking.attendeeMetadata.name ?? undefined),
        email: normalizeString(args.booking.attendeeMetadata.email ?? undefined),
        phone: normalizeString(args.booking.attendeeMetadata.phone ?? undefined),
      };
      const hasMetadata = Object.values(attendeeMetadata).some((value) => typeof value === "string");
      if (hasMetadata) {
        booking.attendeeMetadata = attendeeMetadata;
      }
    }

    const existingProspect = await ctx.db
      .query("prospects")
      .withIndex("by_contactEmail", (q) => q.eq("details.contactEmail", normalizedEmail))
      .unique();

    if (existingProspect) {
      const updatedDetails = { ...existingProspect.details, contactEmail: normalizedEmail };

      const normalizedName = normalizeString(args.name ?? undefined);
      if (normalizedName) {
        updatedDetails.contactName = normalizedName;
      }

      const normalizedPhone = normalizeString(args.phone ?? undefined);
      if (normalizedPhone) {
        updatedDetails.phone = normalizedPhone;
      }

      await ctx.db.patch(existingProspect._id, {
        details: updatedDetails,
        calProspectBooking: booking,
        updatedAt: now,
      });

      console.log("[cal] prospect updated from booking", {
        email: normalizedEmail,
        calEventId: booking.calEventId,
      });

      return null;
    }

    const sessionId = crypto.randomUUID();
    const resumeToken = crypto.randomUUID();

    const normalizedName = normalizeString(args.name ?? undefined) ?? "";
    const normalizedPhone = normalizeString(args.phone ?? undefined) ?? "";

    await ctx.db.insert("prospects", {
      sessionId,
      resumeToken,
      details: {
        contactName: normalizedName,
        contactEmail: normalizedEmail,
        companyName: "",
        phone: normalizedPhone,
        currentWebsite: "",
        businessDescription: "",
        goals: "",
        notes: "",
      },
      calProspectBooking: booking,
      planGenerationInProgress: false,
      createdAt: now,
      updatedAt: now,
    });

    console.log("[cal] prospect created from booking", {
      email: normalizedEmail,
      calEventId: booking.calEventId,
    });

    return null;
  },
});

