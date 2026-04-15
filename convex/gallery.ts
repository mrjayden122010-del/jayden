import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { paginationOptsValidator } from "convex/server";

const ADMIN_PASSWORD = "Jayden612";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;
const THEME_SETTINGS_KEY = "theme";
const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{6})$/;
const MAX_COMMENT_AUTHOR_LENGTH = 60;
const MAX_COMMENT_BODY_LENGTH = 500;
const MAX_VISITOR_ID_LENGTH = 120;

const normalizeHexColor = (value: string) => value.trim().toUpperCase();
const now = () => Date.now();
const THEME_SURFACES = ["ai", "art"] as const;

const countCommentsForImage = async (
  ctx: QueryCtx | MutationCtx,
  imageId: Id<"images">,
) => {
  let commentCount = 0;

  for await (const _comment of ctx.db
    .query("imageComments")
    .withIndex("by_image_id", (q) => q.eq("imageId", imageId))) {
    commentCount += 1;
  }

  return commentCount;
};

const getReactionSummaryForImage = async (
  ctx: QueryCtx | MutationCtx,
  imageId: Id<"images">,
) => {
  let likeCount = 0;
  let dislikeCount = 0;

  for await (const reaction of ctx.db
    .query("imageReactions")
    .withIndex("by_image_id", (q) => q.eq("imageId", imageId))) {
    if (reaction.value === "like") {
      likeCount += 1;
    } else {
      dislikeCount += 1;
    }
  }

  return { likeCount, dislikeCount };
};

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
    surface: v.union(v.literal("ai"), v.literal("art")),
    storageId: v.id("_storage"),
    category: v.string(),
    title: v.string(),
    caption: v.string(),
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    streetAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.sessionToken);
    const category = args.category.trim();
    const title = args.title.trim();
    const caption = args.caption.trim();
    const country = args.country?.trim();
    const city = args.city?.trim();
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

    const imageId = await ctx.db.insert("images", {
      storageId: args.storageId,
      surface: args.surface,
      category,
      title,
      caption,
      commentCount: 0,
      country: country || undefined,
      city: city || undefined,
      streetAddress: streetAddress || undefined,
    });

    await ctx.scheduler.runAfter(0, internal.lineNotifications.sendGroupMessage, {
      event: "created",
      surface: args.surface,
      title,
      category,
      country: country || undefined,
      city: city || undefined,
      streetAddress: streetAddress || undefined,
    });

    return imageId;
  },
});

export const updateImageEntry = mutation({
  args: {
    sessionToken: v.string(),
    surface: v.union(v.literal("ai"), v.literal("art")),
    imageId: v.id("images"),
    category: v.string(),
    title: v.string(),
    caption: v.string(),
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    streetAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.sessionToken);
    const existingImage = await ctx.db.get(args.imageId);

    if (!existingImage) {
      throw new Error("This photo no longer exists.");
    }

    const category = args.category.trim();
    const title = args.title.trim();
    const caption = args.caption.trim();
    const country = args.country?.trim();
    const city = args.city?.trim();
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

    await ctx.db.patch("images", args.imageId, {
      surface: args.surface,
      category,
      title,
      caption,
      country: country || undefined,
      city: city || undefined,
      streetAddress: streetAddress || undefined,
    });

    await ctx.scheduler.runAfter(0, internal.lineNotifications.sendGroupMessage, {
      event: "updated",
      surface: args.surface,
      title,
      category,
      country: country || undefined,
      city: city || undefined,
      streetAddress: streetAddress || undefined,
    });

    return { imageId: args.imageId };
  },
});

export const listImages = query({
  args: {
    surface: v.union(v.literal("ai"), v.literal("art")),
    category: v.union(v.string(), v.null()),
    visitorId: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const category = args.category?.trim() ?? "";
    const visitorId = args.visitorId?.trim() ?? "";
    const images = category
      ? await ctx.db
          .query("images")
          .withIndex("by_surface_and_category", (q) =>
            q.eq("surface", args.surface).eq("category", category),
          )
          .order("desc")
          .collect()
      : await ctx.db
          .query("images")
          .withIndex("by_surface", (q) => q.eq("surface", args.surface))
          .order("desc")
          .collect();

    return await Promise.all(
      images.map(async (image) => {
        const commentCount = await countCommentsForImage(ctx, image._id);
        const { likeCount, dislikeCount } = await getReactionSummaryForImage(ctx, image._id);
        const viewerReaction = visitorId
          ? await ctx.db
              .query("imageReactions")
              .withIndex("by_image_id_and_visitor_id", (q) =>
                q.eq("imageId", image._id).eq("visitorId", visitorId),
              )
              .unique()
          : null;

        return {
          _id: image._id,
          _creationTime: image._creationTime,
          category: image.category ?? "",
          title: image.title,
          caption: image.caption,
          commentCount,
          likeCount,
          dislikeCount,
          viewerReaction: viewerReaction?.value ?? null,
          country: image.country ?? "",
          city: image.city ?? "",
          streetAddress: image.streetAddress ?? "",
          imageUrl: await ctx.storage.getUrl(image.storageId),
        };
      }),
    );
  },
});

export const listImagesPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    surface: v.union(v.literal("ai"), v.literal("art")),
    category: v.union(v.string(), v.null()),
    visitorId: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const category = args.category?.trim() ?? "";
    const visitorId = args.visitorId?.trim() ?? "";
    const result = category
      ? await ctx.db
          .query("images")
          .withIndex("by_surface_and_category", (q) =>
            q.eq("surface", args.surface).eq("category", category),
          )
          .order("desc")
          .paginate(args.paginationOpts)
      : await ctx.db
          .query("images")
          .withIndex("by_surface", (q) => q.eq("surface", args.surface))
          .order("desc")
          .paginate(args.paginationOpts);

    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (image) => {
          const commentCount = await countCommentsForImage(ctx, image._id);
          const { likeCount, dislikeCount } = await getReactionSummaryForImage(ctx, image._id);
          const viewerReaction = visitorId
            ? await ctx.db
                .query("imageReactions")
                .withIndex("by_image_id_and_visitor_id", (q) =>
                  q.eq("imageId", image._id).eq("visitorId", visitorId),
                )
                .unique()
            : null;

          return {
            _id: image._id,
            _creationTime: image._creationTime,
            category: image.category ?? "",
            title: image.title,
            caption: image.caption,
            commentCount,
            likeCount,
            dislikeCount,
            viewerReaction: viewerReaction?.value ?? null,
            country: image.country ?? "",
            city: image.city ?? "",
            streetAddress: image.streetAddress ?? "",
            imageUrl: await ctx.storage.getUrl(image.storageId),
          };
        }),
      ),
    };
  },
});

export const setImageReaction = mutation({
  args: {
    imageId: v.id("images"),
    surface: v.union(v.literal("ai"), v.literal("art")),
    visitorId: v.string(),
    value: v.union(v.literal("like"), v.literal("dislike"), v.null()),
  },
  handler: async (ctx, args) => {
    const image = await ctx.db.get(args.imageId);

    if (!image) {
      throw new Error("This photo no longer exists.");
    }

    const visitorId = args.visitorId.trim();

    if (!visitorId) {
      throw new Error("A visitor id is required.");
    }

    if (visitorId.length > MAX_VISITOR_ID_LENGTH) {
      throw new Error("That visitor id is too long.");
    }

    const existingReaction = await ctx.db
      .query("imageReactions")
      .withIndex("by_image_id_and_visitor_id", (q) =>
        q.eq("imageId", args.imageId).eq("visitorId", visitorId),
      )
      .unique();

    if (args.value === null) {
      if (existingReaction) {
        await ctx.db.delete(existingReaction._id);
      }

      return { value: null };
    }

    if (existingReaction) {
      await ctx.db.patch("imageReactions", existingReaction._id, {
        value: args.value,
      });
    } else {
      await ctx.db.insert("imageReactions", {
        imageId: args.imageId,
        visitorId,
        value: args.value,
      });
    }

    await ctx.scheduler.runAfter(0, internal.lineNotifications.sendGroupMessage, {
      event: args.value === "like" ? "liked" : "disliked",
      surface: args.surface,
      title: image.title,
      category: image.category ?? undefined,
      country: image.country ?? undefined,
      city: image.city ?? undefined,
      streetAddress: image.streetAddress ?? undefined,
    });

    return { value: args.value };
  },
});

export const notifyImageInteraction = mutation({
  args: {
    imageId: v.id("images"),
    surface: v.union(v.literal("ai"), v.literal("art")),
    interaction: v.literal("comment_opened"),
  },
  handler: async (ctx, args) => {
    const image = await ctx.db.get(args.imageId);

    if (!image) {
      throw new Error("This photo no longer exists.");
    }

    await ctx.scheduler.runAfter(0, internal.lineNotifications.sendGroupMessage, {
      event: args.interaction,
      surface: args.surface,
      title: image.title,
      category: image.category ?? undefined,
      country: image.country ?? undefined,
      city: image.city ?? undefined,
      streetAddress: image.streetAddress ?? undefined,
    });

    return { notified: true };
  },
});

export const listCategories = query({
  args: {
    surface: v.union(v.literal("ai"), v.literal("art")),
  },
  handler: async (ctx, args) => {
    const images = await ctx.db
      .query("images")
      .withIndex("by_surface", (q) => q.eq("surface", args.surface))
      .order("desc")
      .collect();
    return Array.from(
      new Set(
        images
          .map((image) => image.category?.trim() ?? "")
          .filter((category) => category.length > 0),
      ),
    ).sort((left, right) => left.localeCompare(right));
  },
});

export const listImageComments = query({
  args: {
    imageId: v.id("images"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("imageComments")
      .withIndex("by_image_id", (q) => q.eq("imageId", args.imageId))
      .order("desc")
      .take(100);
  },
});

export const addImageComment = mutation({
  args: {
    imageId: v.id("images"),
    authorName: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const image = await ctx.db.get(args.imageId);

    if (!image) {
      throw new Error("This photo no longer exists.");
    }

    const authorName = args.authorName.trim();
    const body = args.body.trim();

    if (!authorName) {
      throw new Error("Please enter your name.");
    }

    if (authorName.length > MAX_COMMENT_AUTHOR_LENGTH) {
      throw new Error(`Names must be ${MAX_COMMENT_AUTHOR_LENGTH} characters or fewer.`);
    }

    if (!body) {
      throw new Error("Please enter a comment.");
    }

    if (body.length > MAX_COMMENT_BODY_LENGTH) {
      throw new Error(`Comments must be ${MAX_COMMENT_BODY_LENGTH} characters or fewer.`);
    }

    const existingCommentCount = await countCommentsForImage(ctx, args.imageId);

    const commentId = await ctx.db.insert("imageComments", {
      imageId: args.imageId,
      authorName,
      body,
    });

    await ctx.db.patch("images", args.imageId, {
      commentCount: existingCommentCount + 1,
    });

    return { commentId };
  },
});

export const getThemeSettings = query({
  args: {
    surface: v.union(v.literal("ai"), v.literal("art")),
  },
  handler: async (ctx) => {
    const settings =
      (await ctx.db
        .query("siteSettings")
        .withIndex("by_surface_and_key", (q) =>
          q.eq("surface", "ai").eq("key", THEME_SETTINGS_KEY),
        )
        .unique()) ??
      (await ctx.db
        .query("siteSettings")
        .withIndex("by_surface_and_key", (q) =>
          q.eq("surface", "art").eq("key", THEME_SETTINGS_KEY),
        )
        .unique()) ??
      (await ctx.db
        .query("siteSettings")
        .withIndex("by_key", (q) => q.eq("key", THEME_SETTINGS_KEY))
        .unique());

    return settings
      ? {
          brandColor: settings.brandColor,
          secondaryColor: settings.secondaryColor ?? settings.brandColor,
          accentColor: settings.accentColor ?? settings.brandColor,
          textColor: settings.textColor ?? settings.brandColor,
        }
      : null;
  },
});

export const saveThemeSettings = mutation({
  args: {
    sessionToken: v.string(),
    surface: v.union(v.literal("ai"), v.literal("art")),
    brandColor: v.string(),
    secondaryColor: v.string(),
    accentColor: v.string(),
    textColor: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdminSession(ctx, args.sessionToken);
    const brandColor = normalizeHexColor(args.brandColor);
    const secondaryColor = normalizeHexColor(args.secondaryColor);
    const accentColor = normalizeHexColor(args.accentColor);
    const textColor = normalizeHexColor(args.textColor);

    if (
      !HEX_COLOR_PATTERN.test(brandColor) ||
      !HEX_COLOR_PATTERN.test(secondaryColor) ||
      !HEX_COLOR_PATTERN.test(accentColor) ||
      !HEX_COLOR_PATTERN.test(textColor)
    ) {
      throw new Error("Please provide four valid 6-digit hex colors.");
    }

    for (const surface of THEME_SURFACES) {
      const existingSettings = await ctx.db
        .query("siteSettings")
        .withIndex("by_surface_and_key", (q) =>
          q.eq("surface", surface).eq("key", THEME_SETTINGS_KEY),
        )
        .unique();

      if (existingSettings) {
        await ctx.db.patch("siteSettings", existingSettings._id, {
          surface,
          brandColor,
          secondaryColor,
          accentColor,
          textColor,
        });
      } else {
        await ctx.db.insert("siteSettings", {
          key: THEME_SETTINGS_KEY,
          surface,
          brandColor,
          secondaryColor,
          accentColor,
          textColor,
        });
      }
    }

    await ctx.scheduler.runAfter(0, internal.lineNotifications.sendGroupMessage, {
      event: "theme_changed",
      surface: args.surface,
      brandColor,
      secondaryColor,
      accentColor,
      textColor,
    });

    return { brandColor, secondaryColor, accentColor, textColor };
  },
});

export const backfillLegacyAiSurfaceData = mutation({
  args: {},
  handler: async (ctx) => {
    let updatedImageCount = 0;

    for await (const image of ctx.db.query("images")) {
      if (image.surface !== undefined) {
        continue;
      }

      await ctx.db.patch("images", image._id, {
        surface: "ai",
      });
      updatedImageCount += 1;
    }

    let updatedThemeCount = 0;

    for await (const setting of ctx.db.query("siteSettings")) {
      if (setting.surface !== undefined || setting.key !== THEME_SETTINGS_KEY) {
        continue;
      }

      await ctx.db.patch("siteSettings", setting._id, {
        surface: "ai",
      });
      updatedThemeCount += 1;
    }

    return {
      updatedImageCount,
      updatedThemeCount,
    };
  },
});
