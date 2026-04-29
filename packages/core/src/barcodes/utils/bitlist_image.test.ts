import { describe, expect, it } from "vitest";

import { newBitList } from "./bitlist.ts";
import { bitListToImageRow } from "./bitlist_image.ts";

describe("bitListToImageRow", () => {
  it("clamps widthRatio into [2, 3]", () => {
    const bl = newBitList(4);
    bl.addBit(true, true, false, true);
    const a = bitListToImageRow(bl, 2, 10, 1.0); // ratio clamped up to 2
    const b = bitListToImageRow(bl, 2, 10, 2.0);
    expect(a.pixels).toEqual(b.pixels);

    const c = bitListToImageRow(bl, 2, 10, 5.0); // ratio clamped down to 3
    const d = bitListToImageRow(bl, 2, 10, 3.0);
    expect(c.pixels).toEqual(d.pixels);
  });

  it("renders wide vs narrow bars to pixels", () => {
    // Pattern: wide-bar (2 ones) narrow-space (1 zero) narrow-bar (1 one)
    const bl = newBitList(4);
    bl.addBit(true, true, false, true);

    // narrow width = 2 px, ratio = 2 → wide = 4 px
    const row = bitListToImageRow(bl, 2, 5, 2.0);
    // wide bar (on,4) + narrow space (off,2) + narrow bar (on,2)  → total 8 px
    expect(row.pixels.length).toBe(8);
    expect(Array.from(row.pixels)).toEqual([1, 1, 1, 1, 0, 0, 1, 1]);
    expect(row.height).toBe(5);
  });

  it("returns the requested target height unchanged", () => {
    const bl = newBitList(2);
    bl.addBit(true, false);
    const row = bitListToImageRow(bl, 1, 42, 2.5);
    expect(row.height).toBe(42);
  });
});
