import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  adminSessions: defineTable({
    token: v.string(),
    expiresAt: v.number(),
  }).index("by_token", ["token"]),
  images: defineTable({
    storageId: v.id("_storage"),
    category: v.optional(v.string()),
    title: v.string(),
    caption: v.string(),
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    streetAddress: v.optional(v.string()),
  })
    .index("by_category", ["category"])
    .index("by_country_and_city", ["country", "city"]),
  lineWebhookSources: defineTable({
    sourceType: v.union(v.literal("group"), v.literal("room"), v.literal("user")),
    sourceId: v.string(),
    lastEventType: v.string(),
    lastSeenAt: v.number(),
  })
    .index("by_source_type_and_source_id", ["sourceType", "sourceId"])
    .index("by_last_seen_at", ["lastSeenAt"]),
  siteSettings: defineTable({
    key: v.string(),
    brandColor: v.string(),
    secondaryColor: v.optional(v.string()),
    accentColor: v.optional(v.string()),
    textColor: v.optional(v.string()),
  }).index("by_key", ["key"]),
});
