import { describe, expect, it } from "vitest";
import { ColorBlack, ColorTransparent, ColorWhite, rgbaToCss } from "./colors.ts";

describe("colors", () => {
  it("ColorBlack is opaque black", () => {
    expect(ColorBlack).toEqual([0, 0, 0, 255]);
  });

  it("ColorWhite is opaque white", () => {
    expect(ColorWhite).toEqual([255, 255, 255, 255]);
  });

  it("ColorTransparent has zero alpha", () => {
    expect(ColorTransparent[3]).toBe(0);
  });

  it("rgbaToCss formats a CSS rgba string", () => {
    expect(rgbaToCss(ColorBlack)).toBe("rgba(0, 0, 0, 1)");
    expect(rgbaToCss(ColorWhite)).toBe("rgba(255, 255, 255, 1)");
    expect(rgbaToCss(ColorTransparent)).toBe("rgba(0, 0, 0, 0)");
  });
});
