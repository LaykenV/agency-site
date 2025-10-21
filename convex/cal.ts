import { internalMutation, internalQuery } from "./_generated/server";
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
      endTime: v.optional(v.number()),
      title: v.optional(v.string()),
      meetingUrl: v.optional(v.string()),
      notes: v.optional(v.string()),
      calEventId: v.string(),
      iCalUID: v.optional(v.string()),
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
  returns: v.id("prospects"),
  handler: async (ctx, args) => {
    const normalizedEmail = normalizeEmail(args.email);
    const now = Date.now();

    const booking: {
      scheduledAt: number;
      endTime?: number;
      title?: string;
      meetingUrl?: string;
      notes?: string;
      calEventId: string;
      iCalUID?: string;
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

    const endTime = normalizeOptionalNumber(args.booking.endTime);
    if (typeof endTime === "number") {
      booking.endTime = endTime;
    }

    const title = normalizeString(args.booking.title ?? undefined);
    if (title) {
      booking.title = title;
    }

    const meetingUrl = normalizeString(args.booking.meetingUrl ?? undefined);
    if (meetingUrl) {
      booking.meetingUrl = meetingUrl;
    }

    const notes = normalizeString(args.booking.notes ?? undefined);
    if (notes) {
      booking.notes = notes;
    }

    const iCalUID = normalizeString(args.booking.iCalUID ?? undefined);
    if (iCalUID) {
      booking.iCalUID = iCalUID;
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

      return existingProspect._id;
    }

    const sessionId = crypto.randomUUID();
    const resumeToken = crypto.randomUUID();

    const normalizedName = normalizeString(args.name ?? undefined) ?? "";
    const normalizedPhone = normalizeString(args.phone ?? undefined) ?? "";

    const prospectId = await ctx.db.insert("prospects", {
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

    return prospectId;
  },
});

export const upsertScheduledCall = internalMutation({
  args: {
    projectId: v.optional(v.id("projects")),
    prospectId: v.optional(v.id("prospects")),
    type: v.union(
      v.literal("confirmation"),
      v.literal("kickoff"),
      v.literal("review"),
      v.literal("support"),
    ),
    title: v.optional(v.string()),
    startTime: v.number(),
    endTime: v.number(),
    status: v.string(),
    meetingUrl: v.optional(v.string()),
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
    calEventId: v.optional(v.string()),
    iCalUID: v.optional(v.string()),
    eventTypeKey: v.optional(v.string()),
    durationMinutes: v.optional(v.number()),
    externalBookingId: v.optional(v.string()),
    attendeeMetadata: v.optional(
      v.object({
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
      }),
    ),
  },
  returns: v.id("scheduled_calls"),
  handler: async (ctx, args) => {
    // Try to find existing scheduled call by calEventId first
    let existingCall = null;
    if (args.calEventId) {
      existingCall = await ctx.db
        .query("scheduled_calls")
        .withIndex("by_calEventId", (q) => q.eq("calEventId", args.calEventId))
        .unique();
    }

    // Fallback to externalBookingId if not found
    if (!existingCall && args.externalBookingId) {
      existingCall = await ctx.db
        .query("scheduled_calls")
        .withIndex("by_externalBookingId", (q) => q.eq("externalBookingId", args.externalBookingId))
        .unique();
    }

    const callData = {
      projectId: args.projectId,
      prospectId: args.prospectId,
      type: args.type,
      title: args.title,
      startTime: args.startTime,
      endTime: args.endTime,
      status: args.status,
      meetingUrl: args.meetingUrl,
      location: args.location,
      notes: args.notes,
      calEventId: args.calEventId,
      iCalUID: args.iCalUID,
      eventTypeKey: args.eventTypeKey,
      durationMinutes: args.durationMinutes,
      externalBookingId: args.externalBookingId,
      attendeeMetadata: args.attendeeMetadata,
    };

    if (existingCall) {
      await ctx.db.patch(existingCall._id, callData);
      console.log("[cal] scheduled call updated", {
        id: existingCall._id,
        calEventId: args.calEventId,
        type: args.type,
      });
      return existingCall._id;
    } else {
      const newCallId = await ctx.db.insert("scheduled_calls", callData);
      console.log("[cal] scheduled call created", {
        id: newCallId,
        calEventId: args.calEventId,
        type: args.type,
      });
      return newCallId;
    }
  },
});

export const findProspectByEmail = internalQuery({
  args: {
    email: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("prospects"),
      _creationTime: v.number(),
      sessionId: v.string(),
      resumeToken: v.string(),
      details: v.object({
        contactName: v.string(),
        contactEmail: v.string(),
        companyName: v.string(),
        phone: v.string(),
        currentWebsite: v.string(),
        businessDescription: v.string(),
        goals: v.string(),
        notes: v.string(),
      }),
      aiGeneratedPlan: v.optional(
        v.object({
          generatedAt: v.number(),
          promptVersion: v.string(),
          headline: v.string(),
          summary: v.string(),
          highlights: v.array(v.string()),
          nextSteps: v.array(v.string()),
        }),
      ),
      calProspectBooking: v.optional(v.any()),
      lastPlanRequestedAt: v.optional(v.number()),
      planGenerationInProgress: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const normalizedEmail = normalizeEmail(args.email);
    const prospect = await ctx.db
      .query("prospects")
      .withIndex("by_contactEmail", (q) => q.eq("details.contactEmail", normalizedEmail))
      .unique();

    return prospect ?? null;
  },
});

export const updateProjectBooking = internalMutation({
  args: {
    projectId: v.id("projects"),
    bookingType: v.union(v.literal("kickoff"), v.literal("review")),
    booking: v.object({
      scheduledAt: v.number(),
      endTime: v.optional(v.number()),
      title: v.optional(v.string()),
      meetingUrl: v.optional(v.string()),
      notes: v.optional(v.string()),
      calEventId: v.optional(v.string()),
      iCalUID: v.optional(v.string()),
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
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      console.warn("[cal] project not found", { projectId: args.projectId });
      return null;
    }

    if (args.bookingType === "kickoff") {
      await ctx.db.patch(args.projectId, {
        calKickoffBooking: args.booking,
      });
      console.log("[cal] updated kickoff booking", {
        projectId: args.projectId,
        calEventId: args.booking.calEventId,
      });
    } else {
      await ctx.db.patch(args.projectId, {
        calReviewBooking: args.booking,
      });
      console.log("[cal] updated review booking", {
        projectId: args.projectId,
        calEventId: args.booking.calEventId,
      });
    }

    return null;
  },
});

