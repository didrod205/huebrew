import { defineConfig } from "vite";

// Builds the web studio (web/) into docs/ for free GitHub Pages hosting.
export default defineConfig({
  root: "web",
  base: "./",
  build: {
    outDir: "../docs",
    emptyOutDir: true,
  },
  server: {
    fs: { allow: [".."] },
  },
});
