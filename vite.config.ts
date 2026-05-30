import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import createAiStoryPhotoHandler from "./api/create-ai-story-photo";

const sendJson = (response: import("node:http").ServerResponse, statusCode: number, message: string) => {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify({ message }));
};

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const openRouterApiKey =
    env.OPENROUTER_API_KEY ||
    env.OPENROUTER ||
    process.env.OPENROUTER_API_KEY ||
    process.env.OPENROUTER;

  if (openRouterApiKey && !process.env.OPENROUTER_API_KEY && !process.env.OPENROUTER) {
    process.env.OPENROUTER_API_KEY = openRouterApiKey;
  }

  return {
    plugins: [
      {
        name: "jayden-openrouter-story-photo-api",
        configureServer(server) {
          server.middlewares.use("/api/create-ai-story-photo", async (request, response) => {
            try {
              await createAiStoryPhotoHandler(request, response);
            } catch {
              sendJson(response, 500, "Unable to create the AI story photo.");
            }
          });
        },
      },
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
