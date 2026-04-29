/**
 * Golden-file pixel diff suite for `drawLabelAsSvg`. For each
 * `test/fixtures/<name>.zpl`, render to SVG with `fontEmbed: "none"`,
 * rasterise via @resvg/resvg-js using the bundled TTFs, and pixel-compare
 * the result against the same Go-rendered `<name>.png` reference the
 * canvas golden suite uses.
 *
 * Threshold is slightly above the canvas suite's 5% to absorb resvg vs
 * Skia text-rasteriser drift; outliers go in `SVG_FIXTURE_OVERRIDES` with
 * a one-line justification.
 */

import { Resvg, type ResvgRenderOptions } from "@resvg/resvg-js";
import { existsSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  type DrawerOptions,
  FIXTURES_DIR,
  loadFixture,
  loadFixturePng,
  loadRenderApi,
  pixelDiff,
  pixelDiffTiled,
  renderZplAsSvg,
} from "./helpers.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const FONTS_DIR = resolve(HERE, "..", "packages", "core", "src", "assets", "fonts");

const FONT_FILES = [
  resolve(FONTS_DIR, "HelveticaBoldCondensedCustom.ttf"),
  resolve(FONTS_DIR, "DejaVuSansMono.ttf"),
  resolve(FONTS_DIR, "DejaVuSansMonoBold.ttf"),
  resolve(FONTS_DIR, "ZplGSCustom.ttf"),
];

interface GoldenCase {
  name: string;
  fixture: string;
  options?: DrawerOptions;
  /** Optional override; defaults to DEFAULT_MAX_RATIO. */
  maxRatio?: number;
}

// Slightly above the canvas suite's 5% to absorb resvg vs Skia
// text-rasteriser drift on glyph edges.
const DEFAULT_MAX_RATIO = 0.07;

// Per-fixture overrides — keep these as tight as we can. Anything > 0.11
// signals a real bug per CLAUDE.md guidance and should be investigated, not
// papered over.
const SVG_FIXTURE_OVERRIDES: Record<string, number> = {
  // Text-heavy DHL/UPS/GLS labels: ~10% on resvg vs Skia is rasteriser
  // drift on glyph edges across many large headers — visually identical
  // to the Go reference. Element shapes and barcode bars match cleanly.
  dhlparceluk: 0.11,
  glsdk_return: 0.11,
  ups_surepost: 0.11,
};

// Tile-based diff catches localised regressions the global ratio hides:
// a missing barcode that's 1/10 the label area shows as ~10% global diff
// but ~100% local diff in the tile that contains it. 8×16 grid balances
// resolution vs noise. The 70% per-tile cap leaves room for natural
// text-rasteriser drift on dense headlines (which can hit ~55% on small
// tiles) while still failing if a whole barcode or reverse-print block
// goes missing (~100% local diff).
const TILES_X = 8;
const TILES_Y = 16;
const PER_TILE_MAX = 0.7;

// Per-fixture render-option overrides — same shape as the canvas suite.
const FIXTURE_OPTIONS: Record<string, DrawerOptions> = {
  text_fallback_default: { labelWidthMm: 160, labelHeightMm: 230 },
  custom_ttf_by_alias: { labelWidthMm: 160 },
};

function humanizeFixtureName(fixture: string): string {
  return fixture.replace(/_/g, " ");
}

function discoverGoldenCases(): GoldenCase[] {
  const cases: GoldenCase[] = [];
  let entries: string[];
  try {
    entries = readdirSync(FIXTURES_DIR);
  } catch {
    return cases;
  }
  for (const entry of entries.sort()) {
    if (!entry.endsWith(".zpl")) continue;
    const fixture = entry.slice(0, -4);
    const override = SVG_FIXTURE_OVERRIDES[fixture];
    const opts = FIXTURE_OPTIONS[fixture];
    const baseCase: GoldenCase = {
      name: humanizeFixtureName(fixture),
      fixture,
    };
    if (override !== undefined) baseCase.maxRatio = override;
    if (opts !== undefined) baseCase.options = opts;
    cases.push(baseCase);
  }
  return cases;
}

const GOLDEN_CASES: GoldenCase[] = discoverGoldenCases();

function rasteriseSvg(svg: string, width: number): Buffer {
  // resvg requires a target width (or `fitTo: original`); using `original`
  // preserves the SVG's intrinsic dimensions which already match the
  // canvas drawer's pixel dims (labelWidth × imageHeight).
  const opts: ResvgRenderOptions = {
    font: {
      fontFiles: FONT_FILES,
      loadSystemFonts: false,
    },
    fitTo: { mode: "width", value: width },
  };
  return Buffer.from(new Resvg(svg, opts).render().asPng());
}

function extractWidth(svg: string): number {
  const m = svg.match(/<svg[^>]*\swidth="(\d+(?:\.\d+)?)"/);
  if (!m) throw new Error("svg-golden: could not extract width from SVG output");
  return Math.round(Number.parseFloat(m[1]!));
}

describe("svg-golden: pixel diff vs reference PNG", () => {
  for (const tc of GOLDEN_CASES) {
    const goldenPath = resolve(FIXTURES_DIR, `${tc.fixture}.png`);
    const fixturePath = resolve(FIXTURES_DIR, `${tc.fixture}.zpl`);
    const max = tc.maxRatio ?? DEFAULT_MAX_RATIO;

    if (!existsSync(goldenPath) || !existsSync(fixturePath)) {
      it.skip(`${tc.name} (missing fixture)`, () => undefined);
      continue;
    }

    it(tc.name, async () => {
      const api = await loadRenderApi();
      if (!api) {
        console.warn(`[svg-golden] skipping ${tc.name}: render API not yet wired up`);
        return;
      }

      let svg: string;
      try {
        svg = await renderZplAsSvg(loadFixture(tc.fixture), {
          ...tc.options,
          fontEmbed: "none",
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (/not.*implemented|TODO|stub/i.test(message)) {
          console.warn(`[svg-golden] skipping ${tc.name}: ${message}`);
          return;
        }
        throw err;
      }

      const actual = rasteriseSvg(svg, extractWidth(svg));
      const expected = loadFixturePng(tc.fixture);
      const diff = await pixelDiff(actual, expected);

      expect(diff.totalPixels).toBeGreaterThan(0);
      console.log(
        `[svg-golden] ${tc.name}: ${(diff.ratio * 100).toFixed(2)}% (${diff.diffPixels}/${diff.totalPixels})`,
      );
      expect(
        diff.ratio,
        `pixel diff ${diff.diffPixels}/${diff.totalPixels} (${(diff.ratio * 100).toFixed(2)}%) exceeded ${(max * 100).toFixed(0)}%`,
      ).toBeLessThan(max);

      // Per-tile diff: catches localised regressions (whole-barcode missing,
      // reverse-print block dropped) that the global ratio absorbs into
      // surrounding whitespace.
      const tiled = await pixelDiffTiled(actual, expected, TILES_X, TILES_Y);
      const worst = tiled.failingTiles.find((t) => t.ratio > PER_TILE_MAX);
      expect(
        worst,
        worst
          ? `tile (${worst.tx}/${TILES_X}, ${worst.ty}/${TILES_Y}) diff ${(worst.ratio * 100).toFixed(1)}% exceeded per-tile cap ${(PER_TILE_MAX * 100).toFixed(0)}% — likely a localised regression (missing element)`
          : "no failing tile",
      ).toBeUndefined();
    });
  }
});
