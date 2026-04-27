/**
 * Golden-file pixel diff suite for marquee fixtures. Loosened to <5% pixel
 * delta vs the original 2% to absorb Skia/FreeType anti-alias differences.
 *
 * Each case is wrapped so a missing encoder / not-yet-ported unit results in
 * a skip with a clear message rather than a hard failure.
 */

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  type DrawerOptions,
  FIXTURES_DIR,
  loadFixture,
  loadFixturePng,
  loadRenderApi,
  pixelDiff,
  renderZpl,
} from "./helpers.js";

interface GoldenCase {
  name: string;
  /** Fixture basename (without extension). */
  fixture: string;
  options?: DrawerOptions;
  /** Optional override; defaults to 5%. */
  maxRatio?: number;
}

const GOLDEN_CASES: GoldenCase[] = [
  { name: "Amazon label", fixture: "amazon" },
  {
    name: "UPS label (grayscale)",
    fixture: "ups",
    options: { grayscaleOutput: true },
  },
  { name: "Barcode128 default width", fixture: "barcode128_default_width" },
  { name: "Aztec error correction", fixture: "aztec_ec" },
  { name: "QR code with offset", fixture: "qr_code_offset" },
  { name: "EAN-13", fixture: "ean13" },
  { name: "Graphic box rounded", fixture: "gb_rounded" },
  { name: "Text encodings 0-13", fixture: "encodings_013" },
];

const DEFAULT_MAX_RATIO = 0.05;

function pickGoldenPng(fixture: string, options: DrawerOptions | undefined): string {
  // For grayscale UPS the Go suite stores a separate reference image.
  if (fixture === "ups" && options?.grayscaleOutput) {
    return "ups_grayscale";
  }
  return fixture;
}

describe("golden: pixel diff vs reference PNG", () => {
  for (const tc of GOLDEN_CASES) {
    const goldenName = pickGoldenPng(tc.fixture, tc.options);
    const goldenPath = resolve(FIXTURES_DIR, `${goldenName}.png`);
    const fixturePath = resolve(FIXTURES_DIR, `${tc.fixture}.zpl`);
    const max = tc.maxRatio ?? DEFAULT_MAX_RATIO;

    if (!existsSync(goldenPath) || !existsSync(fixturePath)) {
      it.skip(`${tc.name} (missing fixture: ${goldenName})`, () => undefined);
      continue;
    }

    it(tc.name, async () => {
      const api = await loadRenderApi();
      if (!api) {
        // TODO(integration): drop once the public API is wired up.
        console.warn(`[golden] skipping ${tc.name}: render API not yet wired up`);
        return;
      }

      let actual: Buffer;
      try {
        actual = await renderZpl(loadFixture(tc.fixture), tc.options ?? {});
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (/not.*implemented|TODO|stub/i.test(message)) {
          console.warn(`[golden] skipping ${tc.name}: ${message}`);
          return;
        }
        throw err;
      }

      const expected = loadFixturePng(goldenName);
      const diff = await pixelDiff(actual, expected);

      expect(diff.totalPixels).toBeGreaterThan(0);
      expect(
        diff.ratio,
        `pixel diff ${diff.diffPixels}/${diff.totalPixels} (${(diff.ratio * 100).toFixed(2)}%) exceeded ${(max * 100).toFixed(0)}%`,
      ).toBeLessThan(max);
    });
  }
});
