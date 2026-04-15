"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";

const LINE_PUSH_ENDPOINT = "https://api.line.me/v2/bot/message/push";

const formatLocation = (parts: Array<string | undefined>) =>
  parts.map((part) => part?.trim()).filter((part): part is string => Boolean(part)).join(", ");

export const sendGroupMessage = internalAction({
  args: {
    event: v.union(
      v.literal("created"),
      v.literal("updated"),
      v.literal("theme_changed"),
      v.literal("comment_opened"),
      v.literal("liked"),
      v.literal("disliked"),
    ),
    title: v.optional(v.string()),
    category: v.optional(v.string()),
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    streetAddress: v.optional(v.string()),
    brandColor: v.optional(v.string()),
    secondaryColor: v.optional(v.string()),
    accentColor: v.optional(v.string()),
    textColor: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
    const groupId = process.env.LINE_GROUP_ID?.trim();

    if (!accessToken || !groupId) {
      return { sent: false, reason: "missing_config" as const };
    }

    const location = formatLocation([args.streetAddress, args.city, args.country]);
    const title = args.title?.trim() || "Untitled image";
    const category = args.category?.trim() || "Uncategorized";

    const text =
      args.event === "theme_changed"
        ? `Jayden changed gallery colors: ${[args.brandColor, args.secondaryColor, args.accentColor, args.textColor].filter(Boolean).join(", ")}`
        : args.event === "comment_opened"
          ? `Someone opened comments for: ${title} | ${category} | ${location}`
          : args.event === "liked"
            ? `Someone liked: ${title} | ${category} | ${location}`
            : args.event === "disliked"
              ? `Someone disliked: ${title} | ${category} | ${location}`
              : `Jayden ${args.event === "created" ? "added" : "updated"}: ${title} | ${category} | ${location}`;

    const response = await fetch(LINE_PUSH_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        to: groupId,
        messages: [
          {
            type: "text",
            text,
          },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`LINE push failed (${response.status}): ${body}`);
    }

    return { sent: true };
  },
});
