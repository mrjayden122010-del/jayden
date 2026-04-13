import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  adminSessions: defineTable({
    token: v.string(),
    expiresAt: v.number(),
  }).index("by_token", ["token"]),
  images: defineTable({
    storageId: v.id("_storage"),
    title: v.string(),
    caption: v.string(),
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    streetAddress: v.optional(v.string()),
  }).index("by_country_and_city", ["country", "city"]),
  siteSettings: defineTable({
    key: v.string(),
    brandColor: v.string(),
  }).index("by_key", ["key"]),
});
