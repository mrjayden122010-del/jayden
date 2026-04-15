import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  adminSessions: defineTable({
    token: v.string(),
    expiresAt: v.number(),
  }).index("by_token", ["token"]),
  imageComments: defineTable({
    imageId: v.id("images"),
    authorName: v.string(),
    body: v.string(),
  }).index("by_image_id", ["imageId"]),
  imageReactions: defineTable({
    imageId: v.id("images"),
    visitorId: v.string(),
    value: v.union(v.literal("like"), v.literal("dislike")),
  })
    .index("by_image_id", ["imageId"])
    .index("by_image_id_and_visitor_id", ["imageId", "visitorId"]),
  images: defineTable({
    storageId: v.id("_storage"),
    surface: v.optional(v.union(v.literal("ai"), v.literal("art"))),
    category: v.optional(v.string()),
    title: v.string(),
    caption: v.string(),
    commentCount: v.optional(v.number()),
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    streetAddress: v.optional(v.string()),
  })
    .index("by_surface", ["surface"])
    .index("by_surface_and_category", ["surface", "category"])
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
    surface: v.optional(v.union(v.literal("ai"), v.literal("art"))),
    brandColor: v.string(),
    secondaryColor: v.optional(v.string()),
    accentColor: v.optional(v.string()),
    textColor: v.optional(v.string()),
  })
    .index("by_key", ["key"])
    .index("by_surface_and_key", ["surface", "key"]),
});
