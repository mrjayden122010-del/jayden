import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const createImageEntry = mutation({
  args: {
    storageId: v.id("_storage"),
    title: v.string(),
    caption: v.string(),
  },
  handler: async (ctx, args) => {
    const title = args.title.trim();
    const caption = args.caption.trim();

    if (!title) {
      throw new Error("Title is required.");
    }

    if (!caption) {
      throw new Error("Caption is required.");
    }

    return await ctx.db.insert("images", {
      storageId: args.storageId,
      title,
      caption,
    });
  },
});

export const listImages = query({
  args: {},
  handler: async (ctx) => {
    const images = await ctx.db.query("images").order("desc").collect();

    return await Promise.all(
      images.map(async (image) => ({
        _id: image._id,
        _creationTime: image._creationTime,
        title: image.title,
        caption: image.caption,
        imageUrl: await ctx.storage.getUrl(image.storageId),
      })),
    );
  },
});
