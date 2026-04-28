import { defineWorkspace } from "vitest/config";

// Two projects:
//   - `node`    — unit tests + Node golden suite (uses @napi-rs/canvas).
//   - `browser` — same fixtures, but rendered in a real Chromium via the
//                 browser entry of zebrash. Catches platform-specific drift
//                 the Node suite cannot (OffscreenCanvas vs Skia, font
//                 fetch races, reverse-print compositing in browser canvas).
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
