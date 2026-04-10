import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import "./index.css";
import App from "./App.tsx";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);
const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1a73e8",
    },
    secondary: {
      main: "#d93025",
    },
    background: {
      default: "#e8f0fe",
      paper: "#f8fbff",
    },
    text: {
      primary: "#202124",
      secondary: "#5f6368",
    },
  },
  shape: {
    borderRadius: 20,
  },
  typography: {
    fontFamily: '"Roboto", "Arial", sans-serif',
    h2: {
      fontFamily: '"Roboto", "Arial", sans-serif',
      fontWeight: 700,
    },
    h4: {
      fontFamily: '"Roboto", "Arial", sans-serif',
      fontWeight: 700,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ConvexProvider client={convex}>
        <App />
      </ConvexProvider>
    </ThemeProvider>
  </StrictMode>,
);
