import { useMemo } from "react";
import { CssBaseline } from "@mui/material";
import { ThemeProvider, useColorScheme } from "@mui/material/styles";
import { createAppTheme } from "../theme";

/**
 * Light/dark mode is owned by MUI's color-scheme manager:
 * - it sets <html data-theme="light|dark">, which switches the
 *   --mui-palette-* CSS variables,
 * - it persists the choice under "stc:appearance" (same key as before, so
 *   existing preferences carry over) and follows the OS when nothing is
 *   stored.
 * public/theme-init.js applies the stored mode before the app loads, so
 * dark-mode users don't see a light flash.
 */
export const APPEARANCE_STORAGE_KEY = "stc:appearance";

const theme = createAppTheme("light");

export function AppearanceProvider({ children }) {
  return (
    <ThemeProvider
      theme={theme}
      defaultMode="system"
      modeStorageKey={APPEARANCE_STORAGE_KEY}
      colorSchemeStorageKey="stc:color-scheme"
      noSsr
    >
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

/** @returns {{ mode: "light" | "dark", setMode: Function, toggleMode: Function }} */
export function useAppearance() {
  const { mode, systemMode, setMode } = useColorScheme();
  const resolved =
    mode === "light" || mode === "dark" ? mode : systemMode || "light";

  return useMemo(
    () => ({
      mode: resolved,
      setMode,
      toggleMode: () => setMode(resolved === "light" ? "dark" : "light"),
    }),
    [resolved, setMode]
  );
}
