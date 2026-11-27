import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served from https://<user>.github.io/thinking_corner/ in production and by
// `npm run preview`, from the root in dev.
export default defineConfig(({ command, isPreview }) => ({
  base: command === "build" || isPreview ? "/thinking_corner/" : "/",
  plugins: [react()],
}));
