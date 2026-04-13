import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/line/webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const payload = (await req.json()) as {
      events?: Array<{
        type?: string;
        source?: {
          type?: "group" | "room" | "user";
          groupId?: string;
          roomId?: string;
          userId?: string;
        };
      }>;
    };

    for (const event of payload.events ?? []) {
      const sourceType = event.source?.type;
      const sourceId =
        sourceType === "group"
          ? event.source?.groupId
          : sourceType === "room"
            ? event.source?.roomId
            : event.source?.userId;

      if (!sourceType || !sourceId || !event.type) {
        continue;
      }

      await ctx.runMutation(internal.lineWebhook.captureSource, {
        sourceType,
        sourceId,
        eventType: event.type,
      });
    }

    return new Response("ok", { status: 200 });
  }),
});

export default http;
