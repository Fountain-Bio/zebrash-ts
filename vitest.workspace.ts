import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  {
    test: {
      name: "node",
      include: ["src/**/*.test.ts", "test/**/*.test.ts"],
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/.worktrees/**",
        "test/golden.browser.test.ts",
      ],
      testTimeout: 30_000,
    },
  },
  {
    test: {
      name: "browser",
      include: ["test/golden.browser.test.ts"],
      testTimeout: 60_000,
      browser: {
        enabled: true,
        provider: "playwright",
        headless: true,
        name: "chromium",
      },
    },
  },
]);
