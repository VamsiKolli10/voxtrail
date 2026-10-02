/*
 * Runs before the app bundle: applies the saved (or OS) color scheme to
 * <html data-theme> so dark-mode users don't see a flash of the light page.
 * Must stay in sync with the storage key in src/contexts/AppearanceContext.jsx.
 */
(function () {
  try {
    var mode = window.localStorage.getItem("stc:appearance");
    if (mode !== "light" && mode !== "dark") {
      mode = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    document.documentElement.setAttribute("data-theme", mode);
  } catch (e) {
    /* storage blocked: fall back to the light default */
  }
})();
