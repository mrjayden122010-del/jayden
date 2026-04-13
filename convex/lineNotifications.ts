"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";

const LINE_PUSH_ENDPOINT = "https://api.line.me/v2/bot/message/push";

const formatLocation = (parts: Array<string | undefined>) =>
  parts.map((part) => part?.trim()).filter((part): part is string => Boolean(part)).join(", ");

export const sendGroupMessage = internalAction({
  args: {
    event: v.union(v.literal("created"), v.literal("updated")),
    title: v.string(),
    category: v.string(),
    country: v.string(),
    city: v.string(),
    streetAddress: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
    const groupId = process.env.LINE_GROUP_ID?.trim();

    if (!accessToken || !groupId) {
      return { sent: false, reason: "missing_config" as const };
    }

    const actionLabel = args.event === "created" ? "added" : "updated";
    const location = formatLocation([args.streetAddress, args.city, args.country]);
    const text = `Jayden ${actionLabel}: ${args.title} | ${args.category} | ${location}`;

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
