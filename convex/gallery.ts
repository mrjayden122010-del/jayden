import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";

const ADMIN_PASSWORD = "Jayden612";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;
const THEME_SETTINGS_KEY = "theme";
const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{6})$/;

const normalizeHexColor = (value: string) => value.trim().toUpperCase();
const now = () => Date.now();

const getSession = async (ctx: MutationCtx, sessionToken: string) => {
  const token = sessionToken.trim();

  if (!token) {
    throw new Error("Please log in to continue.");
  }

  const session = await ctx.db
    .query("adminSessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();

  if (!session) {
    throw new Error("Your session has expired. Please log in again.");
  }

  if (session.expiresAt <= now()) {
    await ctx.db.delete("adminSessions", session._id);
    throw new Error("Your session has expired. Please log in again.");
  }

  return session;
};

const requireAdminSession = async (ctx: MutationCtx, sessionToken: string) => {
  const session = await getSession(ctx, sessionToken);

  const refreshedExpiry = now() + SESSION_DURATION_MS;

  if (session.expiresAt - now() < SESSION_DURATION_MS / 2) {
    await ctx.db.patch("adminSessions", session._id, { expiresAt: refreshedExpiry });
  }

  return session;
};

export const getAuthState = query({
  args: {
    sessionToken: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const token = args.sessionToken?.trim() ?? "";

    if (!token) {
      return { isAuthenticated: false };
    }

    const session = await ctx.db
      .query("adminSessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();

    if (!session) {
      return { isAuthenticated: false };
    }

    if (session.expiresAt <= now()) {
      return { isAuthenticated: false };
    }

    return { isAuthenticated: true };
  },
});

export const logIn = mutation({
  args: {
    password: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.password !== ADMIN_PASSWORD) {
      throw new Error("Incorrect password.");
    }

    const sessionToken = crypto.randomUUID();
    await ctx.db.insert("adminSessions", {
      token: sessionToken,
      expiresAt: now() + SESSION_DURATION_MS,
    });

    return { sessionToken };
  },
});

export const logOut = mutation({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("adminSessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken.trim()))
      .unique();

    if (session) {
      await ctx.db.delete("adminSessions", session._id);
    }

    return { success: true };
  },
});

export const generateUploadUrl = mutation({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.sessionToken);
    return await ctx.storage.generateUploadUrl();
  },
});

export const createImageEntry = mutation({
  args: {
    sessionToken: v.string(),
    storageId: v.id("_storage"),
    category: v.string(),
    title: v.string(),
    caption: v.string(),
    country: v.string(),
    city: v.string(),
    streetAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.sessionToken);
    const category = args.category.trim();
    const title = args.title.trim();
    const caption = args.caption.trim();
    const country = args.country.trim();
    const city = args.city.trim();
    const streetAddress = args.streetAddress?.trim();

    if (!category) {
      throw new Error("Category is required.");
    }

    if (!title) {
      throw new Error("Title is required.");
    }

    if (!caption) {
      throw new Error("Caption is required.");
    }

    if (!country) {
      throw new Error("Country is required.");
    }

    if (!city) {
      throw new Error("City is required.");
    }

    const imageId = await ctx.db.insert("images", {
      storageId: args.storageId,
      category,
      title,
      caption,
      country,
      city,
      streetAddress: streetAddress || undefined,
    });

    await ctx.scheduler.runAfter(0, internal.lineNotifications.sendGroupMessage, {
      event: "created",
      title,
      category,
      country,
      city,
      streetAddress: streetAddress || undefined,
    });

    return imageId;
  },
});

export const updateImageEntry = mutation({
  args: {
    sessionToken: v.string(),
    imageId: v.id("images"),
    category: v.string(),
    title: v.string(),
    caption: v.string(),
    country: v.string(),
    city: v.string(),
    streetAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.sessionToken);
    const category = args.category.trim();
    const title = args.title.trim();
    const caption = args.caption.trim();
    const country = args.country.trim();
    const city = args.city.trim();
    const streetAddress = args.streetAddress?.trim();

    if (!category) {
      throw new Error("Category is required.");
    }

    if (!title) {
      throw new Error("Title is required.");
    }

    if (!caption) {
      throw new Error("Caption is required.");
    }

    if (!country) {
      throw new Error("Country is required.");
    }

    if (!city) {
      throw new Error("City is required.");
    }

    await ctx.db.patch("images", args.imageId, {
      category,
      title,
      caption,
      country,
      city,
      streetAddress: streetAddress || undefined,
    });

    await ctx.scheduler.runAfter(0, internal.lineNotifications.sendGroupMessage, {
      event: "updated",
      title,
      category,
      country,
      city,
      streetAddress: streetAddress || undefined,
    });

    return { imageId: args.imageId };
  },
});

export const listImages = query({
  args: {
    category: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const category = args.category?.trim() ?? "";
    const images = category
      ? await ctx.db
          .query("images")
          .withIndex("by_category", (q) => q.eq("category", category))
          .order("desc")
          .collect()
      : await ctx.db.query("images").order("desc").collect();

    return await Promise.all(
      images.map(async (image) => ({
        _id: image._id,
        _creationTime: image._creationTime,
        category: image.category ?? "",
        title: image.title,
        caption: image.caption,
        country: image.country ?? "",
        city: image.city ?? "",
        streetAddress: image.streetAddress ?? "",
        imageUrl: await ctx.storage.getUrl(image.storageId),
      })),
    );
  },
});

export const listCategories = query({
  args: {},
  handler: async (ctx) => {
    const images = await ctx.db.query("images").order("desc").collect();
    return Array.from(
      new Set(
        images
          .map((image) => image.category?.trim() ?? "")
          .filter((category) => category.length > 0),
      ),
    ).sort((left, right) => left.localeCompare(right));
  },
});

export const getThemeSettings = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", THEME_SETTINGS_KEY))
      .unique();

    return settings
      ? {
          brandColor: settings.brandColor,
        }
      : null;
  },
});

export const saveThemeSettings = mutation({
  args: {
    sessionToken: v.string(),
    brandColor: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.sessionToken);
    const brandColor = normalizeHexColor(args.brandColor);

    if (!HEX_COLOR_PATTERN.test(brandColor)) {
      throw new Error("Please provide a valid 6-digit hex color.");
    }

    const existingSettings = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", THEME_SETTINGS_KEY))
      .unique();

    if (existingSettings) {
      await ctx.db.patch("siteSettings", existingSettings._id, { brandColor });
    } else {
      await ctx.db.insert("siteSettings", {
        key: THEME_SETTINGS_KEY,
        brandColor,
      });
    }

    await ctx.scheduler.runAfter(0, internal.lineNotifications.sendGroupMessage, {
      event: "theme_changed",
      brandColor,
    });

    return { brandColor };
  },
});
