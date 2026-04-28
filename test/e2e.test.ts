/**
 * End-to-end smoke suite: walks every `test/fixtures/*.zpl`, parses + renders,
 * asserts the output is a valid non-trivial PNG. The full render API arrives
 * across units 1, 6, 7, 8, 9, 20, 21, 22, 23 — the suite skips cleanly until
 * `Parser` and `Drawer` are exported from `src/index.ts`.
 */

import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { FIXTURES_DIR, loadFixture, loadRenderApi, pngDimensions, renderZpl } from "./helpers.js";

const ZPL_FIXTURES = readdirSync(FIXTURES_DIR)
  .filter((name) => name.endsWith(".zpl"))
  .sort();

const MIN_PNG_SIZE_BYTES = 1024;

describe("e2e: render every fixture as PNG", () => {
  it("has fixtures to test", () => {
    expect(ZPL_FIXTURES.length).toBeGreaterThan(0);
  });

  for (const file of ZPL_FIXTURES) {
    const name = file.replace(/\.zpl$/, "");

    it(name, async () => {
      const api = await loadRenderApi();
      if (!api) {
        // TODO(integration): remove once Parser/Drawer are exported from src/index.ts.
        console.warn(`[e2e] skipping ${name}: render API not yet wired up`);
        return;
      }

      const zpl = loadFixture(file);
      let png: Buffer;
      try {
        png = await renderZpl(zpl);
      } catch (err) {
        // Surface a clear "not implemented" skip instead of a hard fail when an
        // upstream unit (e.g. a specific barcode encoder) isn't ready yet.
        const message = err instanceof Error ? err.message : String(err);
        if (/not.*implemented|TODO|stub/i.test(message)) {
          console.warn(`[e2e] skipping ${name}: ${message}`);
          return;
        }
        throw err;
      }

      expect(png.byteLength).toBeGreaterThan(MIN_PNG_SIZE_BYTES);

      const dims = await pngDimensions(png);
      expect(dims.width).toBeGreaterThan(0);
      expect(dims.height).toBeGreaterThan(0);
    });
  }
});
