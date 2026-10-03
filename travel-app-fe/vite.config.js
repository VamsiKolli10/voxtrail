import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Service worker (ADR-006): precache the app so it works offline after one
// online visit, the Emergency page above all. Never cache /api/** (auth and
// user data) or Firebase's reserved /__/ paths (sign-in handlers).
const pwa = VitePWA({
  registerType: "prompt", // users choose when to reload into a new version
  injectRegister: false, // registered by components/common/UpdatePrompt.jsx
  manifest: false, // offline support only; installability is a separate step
  workbox: {
    globPatterns: [
      "**/*.{js,css,html,svg,woff2}",
      "data/emergency-aliases.*.json",
    ],
    // The map bundle (~1 MB) is useless offline: tiles need the network.
    globIgnores: ["**/vendor-map-*"],
    maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
    navigateFallback: "/index.html",
    navigateFallbackDenylist: [/^\/api\//, /^\/__\//],
    cleanupOutdatedCaches: true,
    runtimeCaching: [],
  },
});

export default defineConfig({
  plugins: [react(), pwa],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("maplibre-gl")) return "vendor-map";
          if (id.includes("@mui") || id.includes("@emotion")) return "vendor-mui";
          // App Check loads lazily only when configured (ADR-002); keep it
          // out of the eager Firebase vendor chunk.
          if (id.includes("app-check")) return undefined;
          if (id.includes("@firebase") || id.includes("/firebase/")) {
            return "vendor-firebase";
          }
          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("react-router")
          ) {
            return "vendor-react";
          }
          return undefined;
        },
      },
    },
  },
});
