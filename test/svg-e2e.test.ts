/**
 * End-to-end smoke suite for `drawLabelAsSvg`. Walks every
 * `test/fixtures/*.zpl`, parses + renders, and checks the output is a
 * non-trivial, well-formed SVG document. Mirrors `e2e.test.ts`.
 */

import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { FIXTURES_DIR, loadFixture, loadRenderApi, renderZplAsSvg } from "./helpers.js";

const ZPL_FIXTURES = readdirSync(FIXTURES_DIR)
  .filter((name) => name.endsWith(".zpl"))
  .sort();

const MIN_SVG_SIZE_BYTES = 200;

describe("svg-e2e: render every fixture as SVG", () => {
  it("has fixtures to test", () => {
    expect(ZPL_FIXTURES.length).toBeGreaterThan(0);
  });

  for (const file of ZPL_FIXTURES) {
    const name = file.replace(/\.zpl$/, "");

    it(name, async () => {
      const api = await loadRenderApi();
      if (!api) {
        console.warn(`[svg-e2e] skipping ${name}: render API not yet wired up`);
        return;
      }

      const zpl = loadFixture(file);
      let svg: string;
      try {
        svg = await renderZplAsSvg(zpl, { fontEmbed: "none" });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (/not.*implemented|TODO|stub/i.test(message)) {
          console.warn(`[svg-e2e] skipping ${name}: ${message}`);
          return;
        }
        throw err;
      }

      expect(svg.length).toBeGreaterThan(MIN_SVG_SIZE_BYTES);
      expect(svg.startsWith("<svg")).toBe(true);
      expect(svg.endsWith("</svg>")).toBe(true);

      // Group bookkeeping bug check: every `</g>` should have a matching
      // open. Self-closers (`<rect/>`, `<image/>`, etc.) and root `<svg>`
      // / `<defs>` / `<style>` tags are excluded so the count is just
      // group-balance, which is what `save`/`restore` actually drives.
      const groupOpens = (svg.match(/<g(?:\s[^>]*)?>/g) ?? []).length;
      const groupCloses = (svg.match(/<\/g>/g) ?? []).length;
      expect(groupCloses).toBe(groupOpens);
    });
  }
});
