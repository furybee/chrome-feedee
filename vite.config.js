import { defineConfig } from "vite";
import { resolve } from "path";
import { cpSync } from "fs";

function copyStaticFiles() {
  return {
    name: "copy-extension-files",
    closeBundle() {
      const targets = [
        "manifest.json",
        "sidepanel.html",
        "sidepanel.css",
        "sidepanel.js",
        "_locales",
        "icons",
        "lib",
      ];
      for (const target of targets) {
        cpSync(
          resolve(__dirname, target),
          resolve(__dirname, "dist", target),
          { recursive: true }
        );
      }
    },
  };
}

export default defineConfig({
  resolve: {
    alias: {
      events: "events",
      stream: "stream-browserify",
      timers: "timers-browserify",
    },
  },
  plugins: [copyStaticFiles()],
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
