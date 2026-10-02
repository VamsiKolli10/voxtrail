import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { createAppTheme } from "../theme";

const STORAGE_KEY = "stc:appearance";

function readAppearancePreference() {
  try {
    const storage = window.localStorage;
    if (typeof storage?.getItem === "function") return storage.getItem(STORAGE_KEY);
    if (typeof Storage?.prototype?.getItem === "function") {
      return Storage.prototype.getItem.call(storage, STORAGE_KEY);
    }
    return null;
  } catch {
    return null;
  }
}

const AppearanceContext = createContext({
  mode: "light",
  setMode: () => {},
  toggleMode: () => {},
});

export function AppearanceProvider({ children }) {
  const [mode, setMode] = useState(() => {
    if (typeof window === "undefined") return "light";
    const stored = readAppearancePreference();
    if (stored === "light" || stored === "dark") return stored;
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    return prefersDark ? "dark" : "light";
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(mode);
    root.dataset.theme = mode;
    try {
        const storage = window.localStorage;
        if (typeof storage?.setItem === "function") storage.setItem(STORAGE_KEY, mode);
        else if (typeof Storage?.prototype?.setItem === "function")
          Storage.prototype.setItem.call(storage, STORAGE_KEY, mode);
    } catch (error) {
      // Silently handle localStorage errors (e.g., quota exceeded)
      console.warn(
        "Failed to save appearance preference to localStorage:",
        error
      );
    }
  }, [mode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (event) => {
      setMode((prev) => {
        const stored = readAppearancePreference();
        if (stored === "light" || stored === "dark") return stored;
        return event.matches ? "dark" : "light";
      });
    };
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      toggleMode: () =>
        setMode((prev) => (prev === "light" ? "dark" : "light")),
    }),
    [mode]
  );

  const theme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <AppearanceContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  return useContext(AppearanceContext);
}
