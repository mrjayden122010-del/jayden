import { useMemo } from "react";
import { useQuery } from "convex/react";
import { CssBaseline } from "@mui/material";
import {
  ThemeProvider,
  alpha,
  createTheme,
  darken,
  getContrastRatio,
  lighten,
} from "@mui/material/styles";
import { api } from "../convex/_generated/api";
import App from "./App";

const DEFAULT_BRAND_COLOR = "#6B7280";
const HEX_COLOR_PATTERN = /^#([0-9A-F]{6})$/;

const normalizeHexColor = (value: string) => {
  const normalized = value.trim().toUpperCase();
  return HEX_COLOR_PATTERN.test(normalized) ? normalized : null;
};

const buildTheme = (brandColor: string) => {
  const safeBrandColor = normalizeHexColor(brandColor) ?? DEFAULT_BRAND_COLOR;
  const baseTheme = createTheme({
    palette: {
      mode: "light",
      contrastThreshold: 4.5,
      tonalOffset: 0.24,
    },
  });

  const primary = baseTheme.palette.augmentColor({
    color: { main: safeBrandColor },
    name: "primary",
  });
  const secondaryMain = lighten(safeBrandColor, 0.4);
  const secondary = baseTheme.palette.augmentColor({
    color: { main: secondaryMain },
    name: "secondary",
  });

  const backgroundDefault = lighten(safeBrandColor, 0.91);
  const backgroundPaper = alpha(lighten(safeBrandColor, 0.97), 0.92);
  const textPrimary = darken(safeBrandColor, 0.76);
  const textSecondary = alpha(darken(safeBrandColor, 0.62), 0.78);
  const buttonText =
    getContrastRatio(primary.main, "#ffffff") >= 4.5 ? "#ffffff" : textPrimary;

  return createTheme(baseTheme, {
    palette: {
      primary,
      secondary,
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
          },
          body: {
            background: [
              `radial-gradient(circle at 12% 18%, ${alpha(lighten(safeBrandColor, 0.12), 0.34)}, transparent 0 26%)`,
              `radial-gradient(circle at 88% 12%, ${alpha(primary.dark, 0.18)}, transparent 0 24%)`,
              `linear-gradient(180deg, ${lighten(safeBrandColor, 0.82)} 0%, ${backgroundDefault} 34%, ${lighten(safeBrandColor, 0.76)} 100%)`,
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
            backgroundImage: `linear-gradient(135deg, ${primary.dark}, ${primary.main})`,
            boxShadow: `0 16px 34px ${alpha(primary.dark, 0.28)}`,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            background: `linear-gradient(180deg, ${lighten(safeBrandColor, 0.98)}, ${lighten(
              safeBrandColor,
              0.88,
            )})`,
            boxShadow: `0 30px 80px ${alpha(primary.dark, 0.22)}, inset 0 0 0 1px rgba(255, 255, 255, 0.72)`,
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
              borderColor: alpha(primary.main, 0.5),
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: primary.main,
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
  const savedThemeSettings = useQuery(api.gallery.getThemeSettings);
  const savedBrandColor = savedThemeSettings?.brandColor ?? DEFAULT_BRAND_COLOR;
  const theme = useMemo(() => buildTheme(savedBrandColor), [savedBrandColor]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App defaultBrandColor={savedBrandColor} />
    </ThemeProvider>
  );
}
