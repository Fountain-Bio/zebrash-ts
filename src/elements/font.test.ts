import { describe, expect, it } from "vitest";

import { FieldOrientation } from "./field_orientation.ts";
import {
  type FontInfo,
  fontExists,
  fontWithAdjustedSizes,
  getFontScaleX,
  getFontSize,
  isCustomFont,
  isStandardFont,
} from "./font.ts";

const baseFont = (overrides: Partial<FontInfo> = {}): FontInfo => ({
  name: "0",
  width: 0,
  height: 0,
  orientation: FieldOrientation.Normal,
  ...overrides,
});

describe("FontInfo", () => {
  it("getFontSize returns Height", () => {
    expect(getFontSize(baseFont({ height: 25 }))).toBe(25);
  });

  it("getFontScaleX returns 1.0 when Height is 0", () => {
    expect(getFontScaleX(baseFont({ width: 10, height: 0 }))).toBe(1.0);
  });

  it("getFontScaleX uses 1.0 ratio for font 0", () => {
    expect(getFontScaleX(baseFont({ name: "0", width: 20, height: 10 }))).toBe(2.0);
  });

  it("getFontScaleX uses 2.0 ratio for bitmap fonts A-H", () => {
    // ratio = 2.0, Width=Height -> scaleX = 2.0 * 1 = 2.0
    expect(getFontScaleX(baseFont({ name: "A", width: 20, height: 20 }))).toBe(2.0);
  });

  it("isStandardFont recognises 0 and named bitmap sizes", () => {
    expect(isStandardFont(baseFont({ name: "0" }))).toBe(true);
    expect(isStandardFont(baseFont({ name: "A" }))).toBe(true);
    expect(isStandardFont(baseFont({ name: "GS" }))).toBe(true);
    expect(isStandardFont(baseFont({ name: "Z" }))).toBe(false);
  });

  it("isCustomFont detects CustomFont presence", () => {
    expect(isCustomFont(baseFont())).toBe(false);
    expect(isCustomFont(baseFont({ customFont: { name: "x", data: new Uint8Array() } }))).toBe(
      true,
    );
  });

  it("fontExists is true for standard or custom fonts", () => {
    expect(fontExists(baseFont({ name: "0" }))).toBe(true);
    expect(fontExists(baseFont({ name: "Z" }))).toBe(false);
    expect(
      fontExists(baseFont({ name: "Z", customFont: { name: "x", data: new Uint8Array() } })),
    ).toBe(true);
  });
});

describe("fontWithAdjustedSizes", () => {
  it("scalable font with both 0 dims clamps to min 10", () => {
    const out = fontWithAdjustedSizes(baseFont({ name: "0", width: 0, height: 0 }));
    expect(out.width).toBe(10);
    expect(out.height).toBe(10);
  });

  it("scalable font with one 0 dimension copies the other", () => {
    const out = fontWithAdjustedSizes(baseFont({ name: "0", width: 0, height: 25 }));
    expect(out.width).toBe(25);
    expect(out.height).toBe(25);
  });

  it("scalable font enforces minimum of 10", () => {
    const out = fontWithAdjustedSizes(baseFont({ name: "0", width: 5, height: 8 }));
    expect(out.width).toBe(10);
    expect(out.height).toBe(10);
  });

  it("bitmap font with both 0 dims uses base size (height=orgSize[0], width=orgSize[1])", () => {
    // font A base sizes [9, 5]
    const out = fontWithAdjustedSizes(baseFont({ name: "A", width: 0, height: 0 }));
    expect(out.width).toBe(5);
    expect(out.height).toBe(9);
  });

  it("bitmap font multiplies width and height by integer factor", () => {
    // font A base [9, 5]; height=18 -> ratio 2 -> width=10, height=18
    const out = fontWithAdjustedSizes(baseFont({ name: "A", width: 0, height: 18 }));
    expect(out.width).toBe(10);
    expect(out.height).toBe(18);
  });

  it("bitmap font with only width set computes both axes", () => {
    // font A base [9, 5]; width=10 -> factor 2 -> width=10, height=18
    const out = fontWithAdjustedSizes(baseFont({ name: "A", width: 10, height: 0 }));
    expect(out.width).toBe(10);
    expect(out.height).toBe(18);
  });

  it("custom font is treated as scalable", () => {
    const out = fontWithAdjustedSizes(
      baseFont({
        name: "anything",
        width: 30,
        height: 0,
        customFont: { name: "x", data: new Uint8Array() },
      }),
    );
    expect(out.width).toBe(30);
    expect(out.height).toBe(30);
  });
});
