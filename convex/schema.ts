import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  images: defineTable({
    storageId: v.id("_storage"),
    title: v.string(),
    caption: v.string(),
  }),
});
