import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setupTests.js",
    globals: true,
    css: false,
    include: ["src/**/*.{test,spec}.{js,jsx,ts,tsx}"],
    exclude: ["node_modules", "dist"],
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    // Run test files serially to prevent EMFILE errors on Windows when many
    // icon modules are opened at once.
    fileParallelism: false,
    maxWorkers: 1,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/coverage/**",
        "**/.{idea,git,cache,output,temp}/**",
        "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
      ],
    },
  },
  resolve: {
    alias: [
      // Mock CSS imports
      { find: "maplibre-gl/dist/maplibre-gl.css", replacement: "/src/test/mockStyles.js" },
      { find: "./Landing.css", replacement: "/src/test/mockStyles.js" },
      { find: "@/styles/global.css", replacement: "/src/test/mockStyles.js" },
      // Mock MUI icons to reduce file handle usage on Windows
      { find: /^@mui\/icons-material\/.*$/, replacement: "/src/test/mockMuiIcons.js" },
      { find: "@mui/icons-material", replacement: "/src/test/mockMuiIcons.js" },
      // Mock MapLibre GL JS
      { find: "maplibre-gl", replacement: "/src/test/mockMapLibre.js" },
    ],
  },
});
