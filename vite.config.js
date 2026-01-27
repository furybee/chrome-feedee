import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      events: "events",
      stream: "stream-browserify",
      timers: "timers-browserify",
    },
  },
  build: {
    rollupOptions: {
      input: {
        background: resolve(__dirname, "src/background.js"),
      },
      output: {
        entryFileNames: "[name].js",
        format: "es",
      },
    },
    outDir: "dist",
    emptyOutDir: true,
  },
});
