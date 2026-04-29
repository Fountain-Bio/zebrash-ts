import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

// Three projects:
//   - `core`    — unit tests inside packages/core/src (uses @napi-rs/canvas
//                 for parser, drawer, encoder, and image utilities). Runs
//                 against source `.ts` directly via vitest's transform.
//   - `node`    — repo-root golden + e2e suites against built `@zebrash/node`.
//   - `browser` — browser golden suite against built `@zebrash/browser`,
//                 rendered in a real Chromium via Playwright.
//
// `node` and `browser` projects require `bun run build` to have populated
// `packages/{core,node,browser}/dist/`. The `test` and `test:browser` npm
// scripts do this automatically.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "core",
          include: ["packages/core/src/**/*.test.ts"],
          exclude: ["**/node_modules/**", "**/dist/**", "**/.worktrees/**"],
          testTimeout: 30_000,
        },
      },
      {
        test: {
          name: "node",
          include: [
            "test/golden.test.ts",
            "test/e2e.test.ts",
            "test/svg-golden.test.ts",
            "test/svg-e2e.test.ts",
          ],
          exclude: ["**/node_modules/**", "**/dist/**", "**/.worktrees/**"],
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
            provider: playwright(),
            headless: true,
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
