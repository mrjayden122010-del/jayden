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
      main: "#f24b9a",
      light: "#ff84bd",
      dark: "#cb2e78",
    },
    secondary: {
      main: "#ffb4d2",
      light: "#ffd4e5",
      dark: "#e884ae",
    },
    background: {
      default: "#fff2f8",
      paper: "#fff9fc",
    },
    text: {
      primary: "#4f1334",
      secondary: "#8d4d6d",
    },
  },
  shape: {
    borderRadius: 0,
  },
  typography: {
    fontFamily: '"Inter", sans-serif',
    h1: {
      fontFamily: '"Inter", sans-serif',
      fontWeight: 700,
      letterSpacing: "-0.04em",
    },
    h2: {
      fontFamily: '"Inter", sans-serif',
      fontWeight: 700,
      letterSpacing: "-0.04em",
    },
    h3: {
      fontFamily: '"Inter", sans-serif',
      fontWeight: 700,
      letterSpacing: "-0.03em",
    },
    h4: {
      fontFamily: '"Inter", sans-serif',
      fontWeight: 700,
      letterSpacing: "-0.03em",
    },
    h5: {
      fontFamily: '"Inter", sans-serif',
      fontWeight: 600,
    },
    h6: {
      fontFamily: '"Inter", sans-serif',
      fontWeight: 600,
    },
    button: {
      fontWeight: 700,
      letterSpacing: "0.03em",
      textTransform: "none",
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background:
            "radial-gradient(circle at top left, rgba(255, 171, 212, 0.85), transparent 30%), radial-gradient(circle at top right, rgba(255, 103, 173, 0.22), transparent 24%), linear-gradient(180deg, #ffe6f1 0%, #fff3f8 38%, #ffd7e8 100%)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          paddingInline: "1.2rem",
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          background:
            "linear-gradient(180deg, rgba(255, 248, 252, 0.98), rgba(255, 234, 244, 0.97))",
          boxShadow:
            "0 30px 80px rgba(168, 39, 95, 0.22), inset 0 0 0 1px rgba(255, 255, 255, 0.72)",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: "rgba(255, 255, 255, 0.76)",
          borderRadius: 0,
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(198, 82, 133, 0.28)",
            borderWidth: 1.5,
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(214, 63, 132, 0.5)",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#f24b9a",
            borderWidth: 2,
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: "outlined",
      },
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
