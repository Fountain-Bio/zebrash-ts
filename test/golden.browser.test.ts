/**
 * Browser golden suite. Mirrors `test/golden.test.ts` but executes in a real
 * Chromium under @vitest/browser. Each fixture is rendered through the
 * browser entry of zebrash (OffscreenCanvas + FontFace) and pixel-diffed
 * against the static Go-reference PNG.
 *
 * Vite handles the package.json `"browser"` field swap automatically, so
 * `import { Parser, Drawer } from "zebrash"` resolves to the browser-platform
 * implementation. Run `bun run build` in the repo root before this suite —
 * it consumes `dist/`, not source.
 */

import { describe, expect, it } from "vitest";
import { Drawer, Parser } from "zebrash";

import { pixelDiff } from "./browser-helpers.ts";

// Vite inlines the fixture set at build time. ?raw → ZPL source string,
// ?url → URL string for the reference PNG.
const zplLoaders = import.meta.glob<string>("./fixtures/*.zpl", {
  query: "?raw",
  import: "default",
});
const pngUrls = import.meta.glob<string>("./fixtures/*.png", {
  query: "?url",
  import: "default",
  eager: true,
});

function basename(path: string): string {
  const file = path.split("/").pop() ?? path;
  return file.replace(/\.(zpl|png)$/, "");
}

interface DrawerOptions {
  labelWidthMm?: number;
  labelHeightMm?: number;
  dpmm?: number;
  enableInvertedLabels?: boolean;
  grayscaleOutput?: boolean;
}

interface GoldenCase {
  name: string;
  fixture: string;
  goldenName: string;
  options?: DrawerOptions;
  override?: Override;
}

const FIXTURE_OPTIONS: Record<string, DrawerOptions> = {
  text_fallback_default: { labelWidthMm: 160, labelHeightMm: 230 },
  custom_ttf_by_alias: { labelWidthMm: 160 },
};

// Two complementary thresholds; a fixture must satisfy both.
//
//   - DEFAULT_MAX_RATIO (5 %) — fraction of all pixels that differ. Matches
//     the Node golden suite. Sensitive to wholesale wrongness (e.g. wrong
//     dimensions, fully-blank canvas) but blind to missing text on
//     mostly-white labels — that's what `inkDeltaRatio` is for.
//   - DEFAULT_MAX_INK_DELTA_RATIO (2 %) — symmetric ink-count delta:
//     |inkA - inkB| / max(inkA, inkB). Antialiasing drift pushes pixels
//     symmetrically (ink-to-white ≈ white-to-ink), so this stays small.
//     A missing chunk of text or reverse-print body is asymmetric and
//     drives this above 2 %, even when the absolute pixel ratio is < 1 %.
//
// Per-fixture overrides cover legitimate rasterizer drift between FreeType
// (Go reference) and the browser canvas.
const DEFAULT_MAX_RATIO = 0.05;
const DEFAULT_MAX_INK_DELTA_RATIO = 0.02;

interface Override {
  ratio?: number;
  inkDeltaRatio?: number;
}

const FIXTURE_OVERRIDES: Record<string, Override> = {
  // Grayscale antialiasing diverges from Go's freetype/gg slightly more.
  ups_grayscale: { ratio: 0.06 },
  // Multi-label templating fixture — large text, lots of glyph-edge drift.
  templating: { ratio: 0.06 },
};

function discoverCases(): GoldenCase[] {
  const cases: GoldenCase[] = [];
  const zplKeys = Object.keys(zplLoaders).sort();
  for (const key of zplKeys) {
    const fixture = basename(key);
    const goldenKey = `./fixtures/${fixture}.png`;
    if (!(goldenKey in pngUrls)) continue;
    const baseCase: GoldenCase = {
      name: fixture.replace(/_/g, " "),
      fixture,
      goldenName: fixture,
    };
    const override = FIXTURE_OVERRIDES[fixture];
    if (override !== undefined) baseCase.override = override;
    const opts = FIXTURE_OPTIONS[fixture];
    if (opts !== undefined) baseCase.options = opts;
    cases.push(baseCase);
  }
  // Grayscale UPS variant — different reference PNG.
  if ("./fixtures/ups.zpl" in zplLoaders && "./fixtures/ups_grayscale.png" in pngUrls) {
    const c: GoldenCase = {
      name: "ups (grayscale)",
      fixture: "ups",
      goldenName: "ups_grayscale",
      options: { grayscaleOutput: true },
    };
    const override = FIXTURE_OVERRIDES.ups_grayscale;
    if (override !== undefined) c.override = override;
    cases.push(c);
  }
  return cases;
}

const CASES = discoverCases();

async function loadZpl(fixture: string): Promise<string> {
  const key = `./fixtures/${fixture}.zpl`;
  const loader = zplLoaders[key];
  if (!loader) throw new Error(`fixture not found: ${key}`);
  return loader();
}

async function fetchPng(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url}: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

describe("browser golden: pixel diff vs Go reference", () => {
  for (const tc of CASES) {
    const maxRatio = tc.override?.ratio ?? DEFAULT_MAX_RATIO;
    const maxInkDelta = tc.override?.inkDeltaRatio ?? DEFAULT_MAX_INK_DELTA_RATIO;

    it(tc.name, async () => {
      const zpl = await loadZpl(tc.fixture);
      const labels = new Parser().parse(zpl);
      expect(labels.length, "no labels parsed").toBeGreaterThan(0);
      const first = labels[0];
      if (!first) throw new Error("first label undefined");

      const actual = await new Drawer().drawLabelAsPng(first, tc.options ?? {});
      const expectedUrl = pngUrls[`./fixtures/${tc.goldenName}.png`];
      if (!expectedUrl) throw new Error(`reference PNG missing: ${tc.goldenName}`);
      const expected = await fetchPng(expectedUrl);

      const diff = await pixelDiff(actual, expected);

      expect(diff.totalPixels).toBeGreaterThan(0);
      console.log(
        `[browser-golden] ${tc.name}: ratio=${(diff.ratio * 100).toFixed(2)}% inkDelta=${(diff.inkDeltaRatio * 100).toFixed(2)}% inkRatio=${(diff.inkRatio * 100).toFixed(2)}% (diff=${diff.diffPixels} inkA=${diff.inkA} inkB=${diff.inkB})`,
      );
      expect(
        diff.ratio,
        `pixel ratio ${(diff.ratio * 100).toFixed(2)}% > ${(maxRatio * 100).toFixed(0)}%`,
      ).toBeLessThan(maxRatio);
      expect(
        diff.inkDeltaRatio,
        `ink delta ${(diff.inkDeltaRatio * 100).toFixed(2)}% > ${(maxInkDelta * 100).toFixed(0)}% — likely missing structure (text, reverse-print, etc.)`,
      ).toBeLessThan(maxInkDelta);
    });
  }
});
