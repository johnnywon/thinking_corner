import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served from https://<user>.github.io/thinking_corner/ in production,
// from the root in dev.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/thinking_corner/" : "/",
  plugins: [react()],
}));
