import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("maplibre-gl")) return "vendor-map";
          if (id.includes("@mui") || id.includes("@emotion")) return "vendor-mui";
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
