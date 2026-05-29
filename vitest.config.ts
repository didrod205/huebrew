import { defineConfig } from "vitest/config";

// Separate from vite.config.ts (root: "web") so tests scan the project root.
export default defineConfig({
  test: {
    root: ".",
    include: ["test/**/*.test.ts"],
  },
});
