import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

const now = () => Date.now();

export const captureSource = internalMutation({
  args: {
    sourceType: v.union(v.literal("group"), v.literal("room"), v.literal("user")),
    sourceId: v.string(),
    eventType: v.string(),
  },
  handler: async (ctx, args) => {
    const existingSource = await ctx.db
      .query("lineWebhookSources")
      .withIndex("by_source_type_and_source_id", (q) =>
        q.eq("sourceType", args.sourceType).eq("sourceId", args.sourceId),
      )
      .unique();

    if (existingSource) {
      await ctx.db.patch("lineWebhookSources", existingSource._id, {
        lastEventType: args.eventType,
        lastSeenAt: now(),
      });
      return existingSource._id;
    }

    return await ctx.db.insert("lineWebhookSources", {
      sourceType: args.sourceType,
      sourceId: args.sourceId,
      lastEventType: args.eventType,
      lastSeenAt: now(),
    });
  },
});

export const listCapturedSources = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("adminSessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken.trim()))
      .unique();

    if (!session || session.expiresAt <= now()) {
      throw new Error("Your session has expired. Please log in again.");
    }

    const sources = await ctx.db
      .query("lineWebhookSources")
      .withIndex("by_last_seen_at", (q) => q.gte("lastSeenAt", 0))
      .order("desc")
      .take(20);

    return sources.map((source) => ({
      sourceType: source.sourceType,
      sourceId: source.sourceId,
      lastEventType: source.lastEventType,
      lastSeenAt: source.lastSeenAt,
    }));
  },
});
