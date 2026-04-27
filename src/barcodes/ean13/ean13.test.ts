import { describe, expect, it } from "vitest";
import { Ean13, calculateGuardExtension, isGuardBar, newEan13 } from "./ean13.ts";
import { encodeEan13 } from "./encoder.ts";

describe("isGuardBar", () => {
  it("identifies start, middle, and end guards", () => {
    for (let i = 0; i < 95; i++) {
      const expected = (i >= 0 && i <= 2) || (i >= 45 && i <= 49) || (i >= 92 && i <= 94);
      expect(isGuardBar(i)).toBe(expected);
    }
  });
});

describe("calculateGuardExtension", () => {
  it("scales with barWidth but caps at 20", () => {
    expect(calculateGuardExtension(1)).toBe(5);
    expect(calculateGuardExtension(2)).toBe(10);
    expect(calculateGuardExtension(4)).toBe(20);
    expect(calculateGuardExtension(8)).toBe(20);
  });
});

describe("Ean13", () => {
  const code = encodeEan13("5901234123457");
  if (code === null) throw new Error("expected encodeEan13 to succeed");
  const img = newEan13(code, 50, 2);

  it("computes width = modules * barWidth", () => {
    expect(img.width).toBe(95 * 2);
  });

  it("bounds height = height + guardExtension", () => {
    const b = img.bounds();
    expect(b).toEqual({ minX: 0, minY: 0, maxX: 190, maxY: 50 + 10 });
  });

  it("returns black for a set bar inside the height region", () => {
    // Module 0 of the start guard is "1".
    expect(img.at(0, 0)).toBe("black");
    expect(img.at(1, 49)).toBe("black"); // still within barWidth=2 and height=50
  });

  it("returns transparent for a cleared module", () => {
    // Module 3 of the canonical pattern is '0'.
    expect(img.at(3 * 2, 0)).toBe("transparent");
  });

  it("guard bars extend past the height into the guard extension area", () => {
    // Module 0 is a guard bar; y >= height should still be black.
    expect(img.at(0, 50)).toBe("black");
    expect(img.at(0, 59)).toBe("black");
  });

  it("non-guard bars stop at the height", () => {
    // Module 6 of the canonical pattern is '1' (within first digit '9') and
    // outside any guard. It draws in the upper region but not below height.
    expect(img.at(6 * 2, 0)).toBe("black");
    expect(img.at(6 * 2, 50)).toBe("transparent");
  });

  it("returns transparent outside the horizontal range", () => {
    expect(img.at(-1, 0)).toBe("transparent");
    expect(img.at(95 * 2, 0)).toBe("transparent");
  });

  it("is constructible directly via the class", () => {
    const direct = new Ean13(code, 30, 3);
    expect(direct.width).toBe(95 * 3);
    expect(direct.height).toBe(30);
    expect(direct.guardExtension).toBe(15);
  });
});
