import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: "@/lib/crypto",
        replacement: path.resolve(__dirname, "tests/mocks/crypto.ts"),
      },
      {
        find: "@",
        replacement: path.resolve(__dirname),
      },
    ],
  },
  test: {
    fileParallelism: false,
    globals: true,
    pool: "threads",
    restoreMocks: true,
    testTimeout: 15_000,
    projects: [
      {
        extends: true,
        test: {
          name: "ui",
          environment: "jsdom",
          setupFiles: ["./tests/setup.tsx"],
          include: ["tests/app.test.tsx"],
          css: false,
        },
      },
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          setupFiles: [],
          include: [
            "tests/week1-import.test.ts",
            "tests/content-pack.test.ts",
            "tests/content-pack-review-script.test.ts",
            "tests/crypto.node.test.ts",
            "tests/smmpro-sync.test.ts",
          ],
        },
      },
    ],
  },
});
