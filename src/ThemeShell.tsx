import { useMemo } from "react";
import { useQuery } from "convex/react";
import { CssBaseline } from "@mui/material";
import {
  ThemeProvider,
  alpha,
  createTheme,
  getContrastRatio,
  lighten,
} from "@mui/material/styles";
import { api } from "../convex/_generated/api";
import App from "./App";

export type ThemeColors = {
  brandColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
};

const DEFAULT_THEME_COLORS: ThemeColors = {
  brandColor: "#6B7280",
  secondaryColor: "#D97706",
  accentColor: "#0F766E",
  textColor: "#1F2933",
};

const HEX_COLOR_PATTERN = /^#([0-9A-F]{6})$/;

const normalizeHexColor = (value: string) => {
  const normalized = value.trim().toUpperCase();
  return HEX_COLOR_PATTERN.test(normalized) ? normalized : null;
};

const resolveThemeColors = (themeColors: Partial<ThemeColors> | null | undefined): ThemeColors => ({
  brandColor: normalizeHexColor(themeColors?.brandColor ?? "") ?? DEFAULT_THEME_COLORS.brandColor,
  secondaryColor:
    normalizeHexColor(themeColors?.secondaryColor ?? "") ?? DEFAULT_THEME_COLORS.secondaryColor,
  accentColor: normalizeHexColor(themeColors?.accentColor ?? "") ?? DEFAULT_THEME_COLORS.accentColor,
  textColor: normalizeHexColor(themeColors?.textColor ?? "") ?? DEFAULT_THEME_COLORS.textColor,
});

const buildTheme = (themeColors: ThemeColors) => {
  const safeThemeColors = resolveThemeColors(themeColors);
  const { brandColor, secondaryColor, accentColor, textColor } = safeThemeColors;
  const baseTheme = createTheme({
    palette: {
      mode: "light",
      contrastThreshold: 4.5,
      tonalOffset: 0.24,
    },
  });

  const primary = baseTheme.palette.augmentColor({
    color: { main: brandColor },
    name: "primary",
  });
  const secondary = baseTheme.palette.augmentColor({
    color: { main: secondaryColor },
    name: "secondary",
  });
  const info = baseTheme.palette.augmentColor({
    color: { main: accentColor },
    name: "info",
  });

  const backgroundDefault = lighten(brandColor, 0.92);
  const backgroundPaper = alpha(lighten(brandColor, 0.98), 0.9);
  const textPrimary = textColor;
  const textSecondary = alpha(textColor, 0.78);
  const buttonText =
    getContrastRatio(primary.main, "#ffffff") >= 4.5 ? "#ffffff" : textPrimary;

  return createTheme(baseTheme, {
    palette: {
      primary,
      secondary,
      info,
      background: {
        default: backgroundDefault,
        paper: backgroundPaper,
      },
      text: {
        primary: textPrimary,
        secondary: textSecondary,
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
          ":root": {
            colorScheme: "light",
            "--theme-grid-color": alpha(secondary.main, 0.18),
            "--theme-grid-highlight": alpha("#ffffff", 0.18),
            "--theme-text-color": textPrimary,
          },
          body: {
            color: textPrimary,
            background: [
              `radial-gradient(circle at 14% 20%, ${alpha(lighten(secondary.main, 0.18), 0.3)}, transparent 0 24%)`,
              `radial-gradient(circle at 82% 16%, ${alpha(info.main, 0.18)}, transparent 0 22%)`,
              `radial-gradient(circle at 50% 100%, ${alpha(primary.main, 0.16)}, transparent 0 30%)`,
              `linear-gradient(180deg, ${lighten(secondary.main, 0.88)} 0%, ${backgroundDefault} 42%, ${lighten(info.main, 0.88)} 100%)`,
            ].join(", "),
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 0,
            paddingInline: "1.2rem",
          },
          containedPrimary: {
            color: buttonText,
            backgroundImage: `linear-gradient(135deg, ${primary.dark}, ${secondary.main} 55%, ${info.main})`,
            boxShadow: `0 16px 34px ${alpha(primary.dark, 0.2)}`,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            background: `linear-gradient(180deg, ${lighten(secondary.main, 0.96)}, ${lighten(
              brandColor,
              0.9,
            )} 56%, ${lighten(info.main, 0.95)})`,
            boxShadow: `0 30px 80px ${alpha(primary.dark, 0.14)}, inset 0 0 0 1px rgba(255, 255, 255, 0.72)`,
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: alpha("#ffffff", 0.76),
            borderRadius: 0,
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: alpha(primary.dark, 0.24),
              borderWidth: 1.5,
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: alpha(secondary.main, 0.52),
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: info.main,
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
};

export default function ThemeShell() {
  const savedThemeSettings = useQuery(api.gallery.getThemeSettings, { surface: "ai" });
  const savedThemeColors = resolveThemeColors(savedThemeSettings);
  const theme = useMemo(() => buildTheme(savedThemeColors), [savedThemeColors]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App defaultThemeColors={savedThemeColors} />
    </ThemeProvider>
  );
}
