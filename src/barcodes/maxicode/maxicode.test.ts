import { createHash } from "node:crypto";
import { describe, expect, test } from "vitest";

import { EOT, GS, RS, encode } from "./maxicode.js";
import { SYMBOL_GRID_HEIGHT, SYMBOL_GRID_WIDTH } from "./symbolgrid.js";

// Canonical UPS structured carrier message inputs taken from the upstream
// Go test suite (github.com/ingridhq/maxicode/maxicode_test.go).
const MODE_2_INPUT =
  `[)>${RS}01${GS}96841706672${GS}840${GS}001${GS}1Z12345673${GS}UPSN${GS}` +
  `1X2X3X${GS}187${GS}${GS}1/1${GS}10${GS}N${GS}19 SOUTH ST${GS}` +
  `SALTLAKE CITY${GS}UT${RS}${EOT}`;

const MODE_2_CR_INPUT =
  `[)>${RS}01${GS}96948509751${GS}840${GS}988${GS}1Z28945956${GS}UPSN${GS}` +
  `4X7V81${RS}07P${String.fromCharCode(28)}:3 0+"MY&.M8JMZ*CMB$2-4W#2W6UBTXR/PTKAZ-7H\r${RS}${EOT}`;

const MODE_3_INPUT =
  `[)>${RS}01${GS}09651147${GS}276${GS}066${GS}1Z12345677${GS}UPSN${GS}` +
  `1X2X3X${GS}187${GS}${GS}1/1${GS}10${GS}N${GS}5 WALDSTRASSE${GS}COLOGNE${GS}${RS}${EOT}`;

const ORIENTATION_MARKERS: ReadonlyArray<readonly [number, number]> = [
  [0, 28],
  [0, 29],
  [9, 10],
  [9, 11],
  [10, 11],
  [15, 7],
  [16, 8],
  [16, 20],
  [17, 20],
  [22, 10],
  [23, 10],
  [22, 17],
  [23, 17],
];

function cellsToString(cells: boolean[][]): string {
  return cells.map((row) => row.map((c) => (c ? "1" : "0")).join("")).join("\n");
}

function hashCells(cells: boolean[][]): string {
  return createHash("sha256").update(cellsToString(cells)).digest("hex");
}

describe("maxicode encode", () => {
  test("rejects mode outside 2..6", () => {
    expect(() => encode(1, 0, "")).toThrow(/modes 2 to 6/);
    expect(() => encode(7, 0, "")).toThrow(/modes 2 to 6/);
  });

  test("mode 2 rejects non-UPS-headered input", () => {
    expect(() => encode(2, 0, "no header here")).toThrow(/header/);
  });

  test("mode 2 rejects too-short input", () => {
    const tooShort = `[)>${RS}01${GS}${EOT}`;
    expect(() => encode(2, 0, tooShort)).toThrow(/UPS requirements/);
  });

  test("mode 2 rejects input without EOT terminator", () => {
    const noEot = MODE_2_INPUT.slice(0, -1);
    expect(() => encode(2, 0, noEot)).toThrow(/EOT/);
  });

  test("mode 2 rejects non-US country code", () => {
    const wrongCountry = MODE_2_INPUT.replace(`${GS}840${GS}`, `${GS}276${GS}`);
    expect(() => encode(2, 0, wrongCountry)).toThrow(/country code 840/);
  });

  test("mode 2 rejects non-numeric postcode", () => {
    // The header is 7 chars and the first two postcode chars are absorbed as
    // the "year" prefix into secondary data; the remaining 9 chars after byte
    // index 9 must be numeric in mode 2.
    const bad = MODE_2_INPUT.replace(`${GS}96841706672${GS}`, `${GS}96AB1234567${GS}`);
    expect(() => encode(2, 0, bad)).toThrow(/postcode must be numeric/);
  });

  test("mode 3 rejects wrong postcode length", () => {
    // Replace the 6-char postcode "651147" with a 4-char one ("1234").
    // The 2-char year prefix "09" is preserved.
    const bad = MODE_3_INPUT.replace(`${GS}09651147${GS}`, `${GS}091234${GS}`);
    // The replaced group still has 6 chars (year + 4-char postcode), but
    // splitting after byte index 9 yields a 4-char first group, triggering
    // the length check.
    expect(() => encode(3, 0, bad)).toThrow(/postcode length/);
  });

  test.each([
    ["mode 2", 2, MODE_2_INPUT],
    ["mode 2 cr", 2, MODE_2_CR_INPUT],
    ["mode 3", 3, MODE_3_INPUT],
  ])("%s grid has correct dimensions and orientation markers", (_label, mode, input) => {
    const grid = encode(mode, 0, input);
    expect(grid.width).toBe(SYMBOL_GRID_WIDTH);
    expect(grid.height).toBe(SYMBOL_GRID_HEIGHT);

    const cells = grid.getCells();
    expect(cells).toHaveLength(SYMBOL_GRID_HEIGHT);
    for (const row of cells) {
      expect(row).toHaveLength(SYMBOL_GRID_WIDTH);
    }

    for (const [r, c] of ORIENTATION_MARKERS) {
      expect(grid.getModule(r, c), `orientation marker (${r}, ${c})`).toBe(true);
    }
  });

  test("mode 4 (no primary) round-trips without error and sets orientation markers", () => {
    const grid = encode(4, 0, "Hello, World!");
    for (const [r, c] of ORIENTATION_MARKERS) {
      expect(grid.getModule(r, c)).toBe(true);
    }
  });

  test("mode 5 (no primary) sets orientation markers", () => {
    const grid = encode(5, 0, "1234567890");
    for (const [r, c] of ORIENTATION_MARKERS) {
      expect(grid.getModule(r, c)).toBe(true);
    }
  });

  test("mode 6 (no primary) accepts payload", () => {
    const grid = encode(6, 0, "ABC123");
    for (const [r, c] of ORIENTATION_MARKERS) {
      expect(grid.getModule(r, c)).toBe(true);
    }
  });

  test("ECI prefix encoding works for various ECI values", () => {
    expect(() => encode(4, 3, "Hello")).not.toThrow();
    expect(() => encode(4, 31, "Hello")).not.toThrow();
    expect(() => encode(4, 100, "Hello")).not.toThrow();
    expect(() => encode(4, 32768, "Hello")).not.toThrow();
  });

  test("encode output is deterministic across runs", () => {
    const a = encode(2, 0, MODE_2_INPUT);
    const b = encode(2, 0, MODE_2_INPUT);
    expect(hashCells(a.getCells())).toBe(hashCells(b.getCells()));
  });

  test("different inputs produce different grids", () => {
    const a = encode(2, 0, MODE_2_INPUT);
    const b = encode(3, 0, MODE_3_INPUT);
    expect(hashCells(a.getCells())).not.toBe(hashCells(b.getCells()));
  });

  // Stable fingerprints to detect regressions in the encoder pipeline.
  // The grids and corresponding hashes are produced by this implementation
  // for the canonical UPS payloads from the upstream Go test suite; visual
  // parity against the Go encoder should be checked separately when feasible.
  test.each([
    ["mode 2", 2, MODE_2_INPUT, "a8de78b1402a06f3d1510c4263db54ee54187348aa25c6f934d2b03386b31cf9"],
    [
      "mode 2 cr",
      2,
      MODE_2_CR_INPUT,
      "4adca4a263a1bf562fd29f97e257001b52456e99f5ca5981473a7ee0c9309a03",
    ],
    ["mode 3", 3, MODE_3_INPUT, "5fb67f52dff37d4d8a08558d5c36890255b3292678cd9332d5509538055bc230"],
  ])("%s grid fingerprint is stable", (_label, mode, input, expected) => {
    const grid = encode(mode, 0, input);
    expect(hashCells(grid.getCells())).toBe(expected);
  });

  test("set module count is in plausible Maxicode range (300..900)", () => {
    const grid = encode(2, 0, MODE_2_INPUT);
    let count = 0;
    for (let r = 0; r < grid.height; r++) {
      for (let c = 0; c < grid.width; c++) {
        if (grid.getModule(r, c)) count++;
      }
    }
    expect(count).toBeGreaterThan(300);
    expect(count).toBeLessThan(900);
  });
});
