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
  Name: "0",
  Width: 0,
  Height: 0,
  Orientation: FieldOrientation.Normal,
  ...overrides,
});

describe("FontInfo", () => {
  it("getFontSize returns Height", () => {
    expect(getFontSize(baseFont({ Height: 25 }))).toBe(25);
  });

  it("getFontScaleX returns 1.0 when Height is 0", () => {
    expect(getFontScaleX(baseFont({ Width: 10, Height: 0 }))).toBe(1.0);
  });

  it("getFontScaleX uses 1.0 ratio for font 0", () => {
    expect(getFontScaleX(baseFont({ Name: "0", Width: 20, Height: 10 }))).toBe(2.0);
  });

  it("getFontScaleX uses 2.0 ratio for bitmap fonts A-H", () => {
    // ratio = 2.0, Width=Height -> scaleX = 2.0 * 1 = 2.0
    expect(getFontScaleX(baseFont({ Name: "A", Width: 20, Height: 20 }))).toBe(2.0);
  });

  it("isStandardFont recognises 0 and named bitmap sizes", () => {
    expect(isStandardFont(baseFont({ Name: "0" }))).toBe(true);
    expect(isStandardFont(baseFont({ Name: "A" }))).toBe(true);
    expect(isStandardFont(baseFont({ Name: "GS" }))).toBe(true);
    expect(isStandardFont(baseFont({ Name: "Z" }))).toBe(false);
  });

  it("isCustomFont detects CustomFont presence", () => {
    expect(isCustomFont(baseFont())).toBe(false);
    expect(isCustomFont(baseFont({ CustomFont: { name: "x", data: new Uint8Array() } }))).toBe(
      true,
    );
  });

  it("fontExists is true for standard or custom fonts", () => {
    expect(fontExists(baseFont({ Name: "0" }))).toBe(true);
    expect(fontExists(baseFont({ Name: "Z" }))).toBe(false);
    expect(
      fontExists(baseFont({ Name: "Z", CustomFont: { name: "x", data: new Uint8Array() } })),
    ).toBe(true);
  });
});

describe("fontWithAdjustedSizes", () => {
  it("scalable font with both 0 dims clamps to min 10", () => {
    const out = fontWithAdjustedSizes(baseFont({ Name: "0", Width: 0, Height: 0 }));
    expect(out.Width).toBe(10);
    expect(out.Height).toBe(10);
  });

  it("scalable font with one 0 dimension copies the other", () => {
    const out = fontWithAdjustedSizes(baseFont({ Name: "0", Width: 0, Height: 25 }));
    expect(out.Width).toBe(25);
    expect(out.Height).toBe(25);
  });

  it("scalable font enforces minimum of 10", () => {
    const out = fontWithAdjustedSizes(baseFont({ Name: "0", Width: 5, Height: 8 }));
    expect(out.Width).toBe(10);
    expect(out.Height).toBe(10);
  });

  it("bitmap font with both 0 dims uses base size (height=orgSize[0], width=orgSize[1])", () => {
    // font A base sizes [9, 5]
    const out = fontWithAdjustedSizes(baseFont({ Name: "A", Width: 0, Height: 0 }));
    expect(out.Width).toBe(5);
    expect(out.Height).toBe(9);
  });

  it("bitmap font multiplies width and height by integer factor", () => {
    // font A base [9, 5]; height=18 -> ratio 2 -> width=10, height=18
    const out = fontWithAdjustedSizes(baseFont({ Name: "A", Width: 0, Height: 18 }));
    expect(out.Width).toBe(10);
    expect(out.Height).toBe(18);
  });

  it("bitmap font with only width set computes both axes", () => {
    // font A base [9, 5]; width=10 -> factor 2 -> width=10, height=18
    const out = fontWithAdjustedSizes(baseFont({ Name: "A", Width: 10, Height: 0 }));
    expect(out.Width).toBe(10);
    expect(out.Height).toBe(18);
  });

  it("custom font is treated as scalable", () => {
    const out = fontWithAdjustedSizes(
      baseFont({
        Name: "anything",
        Width: 30,
        Height: 0,
        CustomFont: { name: "x", data: new Uint8Array() },
      }),
    );
    expect(out.Width).toBe(30);
    expect(out.Height).toBe(30);
  });
});
