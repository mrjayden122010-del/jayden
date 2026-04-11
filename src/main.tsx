import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import "./index.css";
import ThemeShell from "./ThemeShell";

const convexUrl =
  import.meta.env.VITE_CONVEX_URL ?? "https://coordinated-malamute-149.convex.cloud";

const convex = new ConvexReactClient(convexUrl);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <ThemeShell />
    </ConvexProvider>
  </StrictMode>,
);
