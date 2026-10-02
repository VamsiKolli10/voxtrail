import { alpha, createTheme } from "@mui/material/styles";

/**
 * VoxTrail theme — single source of truth for design tokens.
 * See /DESIGN_SYSTEM.md for usage rules.
 *
 * Custom (non-MUI) tokens exposed on the theme:
 *   palette.border.{subtle,strong}         hairlines and card outlines
 *   palette.surface.{glass,tint,soft}      translucent / tinted surfaces
 *   palette.marketing.*                    Landing page surfaces
 *   theme.radius.{sm,md,lg,xl,pill}        px values (use `${theme.radius.md}px`)
 *   theme.motion.{duration,easing}         transition timing
 *   theme.customShadows.*                  elevation levels
 *
 * shape.borderRadius is 4, so numeric sx radii follow MUI defaults:
 *   sx={{ borderRadius: 2 }} → 8px, 3 → 12px, 4 → 16px.
 */

const FONT_STACK =
  '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const typography = {
  fontFamily: FONT_STACK,
  h1: {
    fontSize: "2.75rem",
    fontWeight: 800,
    lineHeight: 1.15,
    letterSpacing: "-0.045em",
  },
  h2: {
    fontSize: "2.25rem",
    fontWeight: 800,
    lineHeight: 1.2,
    letterSpacing: "-0.035em",
  },
  h3: { fontSize: "1.75rem", fontWeight: 700, lineHeight: 1.25 },
  h4: { fontSize: "1.5rem", fontWeight: 700, lineHeight: 1.3 },
  h5: { fontSize: "1.25rem", fontWeight: 700, lineHeight: 1.35 },
  h6: { fontSize: "1.125rem", fontWeight: 600, lineHeight: 1.4 },
  body1: { fontSize: "1rem", lineHeight: 1.6 },
  body2: { fontSize: "0.95rem", lineHeight: 1.55 },
};

export const radius = { sm: 8, md: 12, lg: 20, xl: 24, pill: 999 };

export const motion = {
  duration: { fast: 150, base: 250, slow: 400 },
  easing: {
    standard: "cubic-bezier(0.16, 1, 0.3, 1)",
    ease: "ease",
  },
};

/**
 * Build a CSS transition string from motion tokens.
 *   transitionFor("all")                              → "all 250ms cubic-bezier(...)"
 *   transitionFor(["transform", "box-shadow"], "fast") → 150ms each
 */
export function transitionFor(props = "all", speed = "base") {
  const list = Array.isArray(props) ? props : [props];
  return list
    .map((prop) => `${prop} ${motion.duration[speed]}ms ${motion.easing.standard}`)
    .join(", ");
}

const BRAND = {
  teal: "#21808D",
  tealLight: "#32B8C6",
  tealDark: "#1D7480",
  warm: "#5E5240",
  warmLight: "#A37E52",
  ink: "#13343B",
  mist: "#EDF2F3",
};

function buildPalette(mode = "light") {
  const isDark = mode === "dark";
  return {
    mode,
    marketing: isDark
      ? {
          background: "#0F1C22",
          backgroundSoft: "#13252E",
          surface: "#162A33",
          accent: BRAND.tealLight,
          onHero: "#FFFFFF",
          onHeroMuted: "#EAF4F6",
          heroBorder: alpha("#FFFFFF", 0.24),
          textPrimary: "#E6EEF1",
          textSecondary: "#B1C1C6",
          // Page backdrop (Landing.css reads these via CSS variables)
          backdropTop: "#0C171C",
          backdropMid: "#0F1C22",
          backdropBottom: "#0F1C22",
          glowStrong: alpha(BRAND.tealLight, 0.2),
          glowSoft: alpha(BRAND.tealLight, 0.12),
          // Hero card: fixed dark-teal panel, always light text
          heroGradient: "linear-gradient(160deg, #071218 0%, #1A606C 100%)",
          ctaGradient: `linear-gradient(160deg, ${alpha(BRAND.teal, 0.28)} 0%, ${alpha("#101C24", 0.92)} 100%)`,
        }
      : {
          background: "#F6F9FB",
          backgroundSoft: "#EEF3F6",
          surface: "#FFFFFF",
          accent: BRAND.teal,
          onHero: "#FFFFFF",
          onHeroMuted: "#EAF4F6",
          heroBorder: alpha("#FFFFFF", 0.24),
          textPrimary: "#0F1D23",
          textSecondary: "#627079",
          backdropTop: "#F6F9FB",
          backdropMid: "#FFFFFF",
          backdropBottom: "#F6F9FB",
          glowStrong: alpha(BRAND.teal, 0.16),
          glowSoft: alpha(BRAND.teal, 0.08),
          // #EAF4F6 on #1D7480 = 4.9:1 (the old #4EB1BF end stop was 2.2:1)
          heroGradient: "linear-gradient(155deg, #1A6872 0%, #1D7480 100%)",
          ctaGradient: `linear-gradient(160deg, ${alpha(BRAND.teal, 0.14)} 0%, ${alpha(BRAND.teal, 0.08)} 100%)`,
        },
    // In dark mode the brand teal is lifted so text/links keep ≥4.5:1 contrast.
    primary: isDark
      ? {
          main: BRAND.tealLight,
          light: "#6FD3DE",
          dark: BRAND.teal,
          contrastText: "#0D1F24",
        }
      : {
          main: BRAND.teal,
          light: BRAND.tealLight,
          dark: BRAND.tealDark,
          contrastText: "#FCFCF9",
        },
    secondary: {
      main: BRAND.warm,
      light: BRAND.warmLight,
      dark: "#3F362A",
      contrastText: "#FCFCF9",
    },
    background: {
      default: isDark ? "#0D1F24" : "#FCFCF9",
      paper: isDark ? "#102027" : "#FFFFFD",
    },
    text: {
      primary: isDark ? BRAND.mist : BRAND.ink,
      secondary: isDark ? alpha(BRAND.mist, 0.75) : "#626C71",
    },
    divider: isDark ? alpha(BRAND.mist, 0.16) : alpha(BRAND.teal, 0.18),
    border: {
      subtle: isDark ? alpha(BRAND.mist, 0.12) : alpha(BRAND.warm, 0.12),
      strong: isDark ? alpha(BRAND.mist, 0.24) : alpha(BRAND.warm, 0.24),
    },
    surface: {
      glass: isDark ? alpha("#102027", 0.82) : alpha("#FFFFFF", 0.9),
      tint: isDark ? alpha(BRAND.tealLight, 0.12) : alpha(BRAND.teal, 0.08),
      soft: isDark ? "#13252E" : "#EEF3F6",
    },
    error: isDark
      ? { main: "#FF6B6F", light: "#FF9A9D", dark: "#C0152F" }
      : { main: "#C0152F", light: "#FF5459", dark: "#8E0F22" },
    warning: isDark
      ? { main: "#E8A23A", light: "#F2C27A", dark: "#9A5B13" }
      : { main: "#9A5B13", light: "#E8A23A", dark: "#6E400D" },
    success: isDark
      ? { main: "#5CC98A", light: "#8FDCAE", dark: "#2E7D4F" }
      : { main: "#2E7D4F", light: "#5CC98A", dark: "#1F5A38" },
    info: isDark ? { main: "#A9B6BB" } : { main: "#626C71" },
    rating: { main: "#F5B301" },
    // Categorical accents for feature tiles / service types. Not for text on
    // tinted backgrounds in light mode unless checked for contrast.
    accent: isDark
      ? {
          teal: BRAND.tealLight,
          sky: "#7CC6D1",
          violet: "#C792EA",
          amber: "#F2A65A",
          green: "#7BC98F",
          red: "#FF7A7A",
          blue: "#7AB4F5",
        }
      : {
          teal: BRAND.teal,
          sky: "#2F7F8C",
          violet: "#7B1FA2",
          amber: "#B45309",
          green: "#2E7D32",
          red: "#C62828",
          blue: "#1565C0",
        },
  };
}

function buildShadows(mode) {
  const isDark = mode === "dark";
  return {
    card: isDark
      ? "0 25px 60px -40px rgba(3, 6, 12, 0.85)"
      : "0 18px 55px -35px rgba(12, 32, 44, 0.22)",
    cardHover: isDark
      ? "0 28px 65px -38px rgba(5, 9, 16, 0.9)"
      : "0 22px 60px -32px rgba(10, 48, 62, 0.25)",
    button: `0 12px 24px -14px ${alpha(BRAND.teal, 0.8)}`,
    buttonHover: `0 22px 45px -18px ${alpha(BRAND.teal, 0.65)}`,
    appBar: isDark
      ? "0 18px 55px -30px rgba(2, 8, 18, 0.8)"
      : "0 18px 45px -30px rgba(12, 32, 44, 0.18)",
    // Large, soft elevation for marketing/landing panels.
    section: isDark
      ? "0 30px 80px -48px rgba(2, 8, 18, 0.85)"
      : "0 24px 70px -45px rgba(12, 32, 44, 0.45)",
    overlay: isDark
      ? "0 8px 24px rgba(0, 0, 0, 0.45)"
      : "0 8px 24px rgba(12, 32, 44, 0.14)",
  };
}

export function createAppTheme(mode = "light") {
  const palette = buildPalette(mode);
  const customShadows = buildShadows(mode);
  const transition = (props, duration = motion.duration.base) =>
    props.map((p) => `${p} ${duration}ms ${motion.easing.standard}`).join(", ");

  return createTheme({
    palette,
    typography,
    shape: { borderRadius: 4 },
    spacing: 8,
    radius,
    motion,
    customShadows,
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            fontFamily: typography.fontFamily,
            backgroundColor: palette.background.default,
            color: palette.text.primary,
            transition: `background-color ${motion.duration.base}ms ease, color ${motion.duration.base}ms ease`,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          rounded: { borderRadius: radius.lg - 4 },
        },
      },
      MuiChip: {
        styleOverrides: {
          // Outlined primary chips sit on tinted/marketing backgrounds where
          // primary.main drops below 4.5:1 in light mode; primary.dark keeps AA.
          outlinedPrimary: ({ theme }) =>
            theme.palette.mode === "light"
              ? {
                  color: theme.palette.primary.dark,
                  borderColor: alpha(theme.palette.primary.main, 0.5),
                }
              : {},
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: radius.md },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 700,
            borderRadius: radius.pill,
            padding: "11px 20px",
            transition: transition(["all"]),
            fontFamily: typography.fontFamily,
          },
          contained: {
            boxShadow: customShadows.button,
            "&:hover": { boxShadow: customShadows.buttonHover },
          },
          outlined: {
            borderColor: palette.divider,
            "&:hover": {
              backgroundColor: alpha(palette.primary.main, 0.08),
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: radius.lg,
            border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
            boxShadow: customShadows.card,
            backgroundImage: "none",
            transition: `transform ${motion.duration.fast + 50}ms ease, box-shadow ${motion.duration.fast + 50}ms ease`,
            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow: customShadows.cardHover,
            },
          }),
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: ({ theme }) => ({
            "& .MuiOutlinedInput-root": {
              borderRadius: radius.md,
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: alpha(theme.palette.primary.main, 0.3),
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: theme.palette.primary.main,
                borderWidth: 2,
              },
            },
          }),
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: alpha(theme.palette.background.paper, 0.95),
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
            backdropFilter: "blur(16px)",
            boxShadow: customShadows.appBar,
          }),
        },
      },
      MuiBottomNavigation: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: theme.palette.background.paper,
            borderTop: `1px solid ${alpha(theme.palette.divider, 0.85)}`,
          }),
        },
      },
      MuiTypography: {
        styleOverrides: {
          root: { fontFamily: typography.fontFamily },
        },
      },
    },
  });
}

const defaultTheme = createAppTheme("light");
export default defaultTheme;
