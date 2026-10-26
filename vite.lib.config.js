import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Builds the npm package into lib/. The demo site uses vite.config.js.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "lib",
    emptyOutDir: true,
    copyPublicDir: false,
    minify: false,
    sourcemap: true,
    lib: {
      entry: { index: "src/index.js", "ai-sdk": "src/aiSdk.js" },
      formats: ["es"],
    },
    rollupOptions: {
      external: ["react", "react/jsx-runtime", "react-dom"],
      // the bundler drops module directives, so add it back for Next.js
      output: { banner: (chunk) => (chunk.name === "index" ? '"use client";' : "") },
    },
  },
});
