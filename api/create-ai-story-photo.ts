import type { IncomingMessage, ServerResponse } from "node:http";

const OPENROUTER_CHAT_COMPLETIONS_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models?output_modalities=image";
const FREE_ROUTER_MODEL = "openrouter/free";
const MAX_PROMPT_LENGTH = 1_200;

type StoryPayload = {
  title: string;
  caption: string;
  category: string;
  imagePrompt: string;
};

type OpenRouterImageModel = {
  id: string;
  name?: string;
  pricing?: {
    prompt?: string;
    completion?: string;
    image?: string;
  };
  architecture?: {
    output_modalities?: string[];
  };
};

type OpenRouterMessage = {
  content?: unknown;
  images?: Array<{
    image_url?: { url?: string };
    imageUrl?: { url?: string };
  }>;
};

const readRequestBody = async (request: IncomingMessage) =>
  new Promise<string>((resolve, reject) => {
    let body = "";

    request.setEncoding("utf8");

    request.on("data", (chunk: string) => {
      body += chunk;
    });

    request.on("end", () => {
      resolve(body);
    });

    request.on("error", reject);
  });

const sendJson = (response: ServerResponse, statusCode: number, payload: unknown) => {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(payload));
};

const extractText = (content: unknown) => {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((part) => {
      if (part && typeof part === "object" && "text" in part && typeof part.text === "string") {
        return part.text;
      }

      return "";
    })
    .join("\n");
};

const extractJsonObject = (text: string) => {
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fencedMatch?.[1] ?? text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("The story agent did not return structured text.");
  }

  return JSON.parse(candidate.slice(start, end + 1)) as Partial<StoryPayload>;
};

const normalizeStoryPayload = (payload: Partial<StoryPayload>, prompt: string): StoryPayload => {
  const title = payload.title?.trim() || "Jayden's Story";
  const caption = payload.caption?.trim() || prompt.trim();
  const category = payload.category?.trim() || "AI Story";
  const imagePrompt =
    payload.imagePrompt?.trim() ||
    `Create a warm, cinematic, realistic photo inspired by this story: ${prompt.trim()}`;

  return {
    title: title.slice(0, 120),
    caption: caption.slice(0, 2_000),
    category: category.slice(0, 80),
    imagePrompt: imagePrompt.slice(0, 1_500),
  };
};

const callOpenRouter = async (apiKey: string, body: Record<string, unknown>) => {
  const openRouterResponse = await fetch(OPENROUTER_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://jayden-gallery.local",
      "X-Title": "Jayden Gallery",
    },
    body: JSON.stringify(body),
  });

  const responseText = await openRouterResponse.text();

  if (!openRouterResponse.ok) {
    throw new Error(`OpenRouter request failed: ${responseText || openRouterResponse.statusText}`);
  }

  return JSON.parse(responseText) as {
    choices?: Array<{ message?: OpenRouterMessage }>;
    model?: string;
  };
};

const createStoryAgentOutput = async (apiKey: string, prompt: string) => {
  const data = await callOpenRouter(apiKey, {
    model: FREE_ROUTER_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are a concise story-photo agent for a family gallery. Return only valid JSON with title, caption, category, and imagePrompt. The caption should read like a polished story text based on the user's prompt. The imagePrompt should request a realistic photo, not text overlays.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.8,
  });

  const message = data.choices?.[0]?.message;
  const storyText = extractText(message?.content);
  return normalizeStoryPayload(extractJsonObject(storyText), prompt);
};

const isZeroOrMissingPrice = (value: string | undefined) => value === undefined || Number(value) === 0;

const discoverFreeImageModel = async () => {
  const modelsResponse = await fetch(OPENROUTER_MODELS_URL);

  if (!modelsResponse.ok) {
    return null;
  }

  const payload = (await modelsResponse.json()) as { data?: OpenRouterImageModel[] };
  const freeImageModels =
    payload.data?.filter((model) => {
      const outputs = model.architecture?.output_modalities ?? [];
      return (
        outputs.includes("image") &&
        isZeroOrMissingPrice(model.pricing?.prompt) &&
        isZeroOrMissingPrice(model.pricing?.completion) &&
        isZeroOrMissingPrice(model.pricing?.image)
      );
    }) ?? [];

  const rankedModels = [...freeImageModels].sort((left, right) => {
    const score = (model: OpenRouterImageModel) => {
      const searchable = `${model.id} ${model.name ?? ""}`.toLowerCase();
      let value = 0;

      if (searchable.includes("flux")) value += 8;
      if (searchable.includes("seedream")) value += 6;
      if (searchable.includes("riverflow")) value += 5;
      if (searchable.includes("photo")) value += 3;
      if (searchable.includes("vector")) value -= 8;
      if (searchable.includes("utility")) value -= 6;
      if (searchable.includes("pro")) value -= 2;

      return value;
    };

    return score(right) - score(left);
  });

  return rankedModels[0]?.id ?? null;
};

const extractImageUrl = (message: OpenRouterMessage | undefined) => {
  const directImage = message?.images?.find((image) => image.image_url?.url || image.imageUrl?.url);

  if (directImage?.image_url?.url) {
    return directImage.image_url.url;
  }

  if (directImage?.imageUrl?.url) {
    return directImage.imageUrl.url;
  }

  const text = extractText(message?.content);
  const dataUrlMatch = text.match(/data:image\/(?:png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+/);

  return dataUrlMatch?.[0] ?? "";
};

const normalizeImageUrlForClient = async (imageUrl: string) => {
  if (imageUrl.startsWith("data:image/")) {
    return imageUrl;
  }

  const imageResponse = await fetch(imageUrl);

  if (!imageResponse.ok) {
    throw new Error("The generated image could not be downloaded.");
  }

  const contentType = imageResponse.headers.get("content-type") ?? "image/png";
  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

  return `data:${contentType};base64,${imageBuffer.toString("base64")}`;
};

const createImage = async (apiKey: string, story: StoryPayload) => {
  const messages = [
    {
      role: "user",
      content: `${story.imagePrompt}\n\nCreate one gallery-ready realistic photo. Do not add readable text, captions, logos, frames, or watermarks inside the image.`,
    },
  ];
  const baseBody = {
    messages,
    stream: false,
  };

  const routerBody = {
    ...baseBody,
    modalities: ["image", "text"],
  };

  let routerImageUrl = "";
  let routerModel = FREE_ROUTER_MODEL;

  try {
    const routerData = await callOpenRouter(apiKey, {
      model: FREE_ROUTER_MODEL,
      ...routerBody,
    });
    routerImageUrl = extractImageUrl(routerData.choices?.[0]?.message);
    routerModel = routerData.model ?? FREE_ROUTER_MODEL;
  } catch {
    routerImageUrl = "";
  }

  if (routerImageUrl) {
    return {
      imageUrl: await normalizeImageUrlForClient(routerImageUrl),
      imageModel: routerModel,
    };
  }

  const freeImageModel = await discoverFreeImageModel();

  if (!freeImageModel) {
    throw new Error("No free OpenRouter image model is available right now.");
  }

  const imageData = await callOpenRouter(apiKey, {
    model: freeImageModel,
    ...baseBody,
    modalities: ["image"],
  });
  const imageUrl = extractImageUrl(imageData.choices?.[0]?.message);

  if (!imageUrl) {
    throw new Error("OpenRouter did not return an image.");
  }

  return { imageUrl: await normalizeImageUrlForClient(imageUrl), imageModel: freeImageModel };
};

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { message: "Method not allowed." });
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY ?? process.env.OPENROUTER;

  if (!apiKey) {
    sendJson(response, 500, { message: "Error" });
    return;
  }

  try {
    const body = await readRequestBody(request);
    const payload = JSON.parse(body) as { prompt?: unknown };
    const prompt = typeof payload.prompt === "string" ? payload.prompt.trim() : "";

    if (!prompt) {
      sendJson(response, 400, { message: "Error" });
      return;
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      sendJson(response, 400, { message: "Error" });
      return;
    }

    const story = await createStoryAgentOutput(apiKey, prompt);
    const image = await createImage(apiKey, story);

    sendJson(response, 200, {
      ...story,
      imageUrl: image.imageUrl,
      textModel: FREE_ROUTER_MODEL,
      imageModel: image.imageModel,
    });
  } catch {
    sendJson(response, 500, { message: "Error" });
  }
}
