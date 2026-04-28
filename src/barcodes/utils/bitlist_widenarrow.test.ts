import { describe, expect, it } from "vitest";

import { newBitList } from "./bitlist.ts";
import { toWideNarrowList } from "./bitlist_widenarrow.ts";

describe("toWideNarrowList", () => {
  it("treats single-bit runs as narrow and longer runs as wide", () => {
    const bl = newBitList(16);
    // Pattern: 1 0 11 0 1 0 — alternating bars/spaces with one wide bar.
    bl.addBit(true);
    bl.addBit(false);
    bl.addBit(true, true);
    bl.addBit(false);
    bl.addBit(true);
    bl.addBit(false);

    const list = toWideNarrowList(bl, 3, 1);
    expect(list.data).toEqual([
      [false, true],
      [false, false],
      [true, true],
      [false, false],
      [false, true],
      [false, false],
    ]);
  });

  it("getBarWidth picks wide vs narrow", () => {
    const bl = newBitList(8);
    bl.addBit(true, true, false, true);
    const list = toWideNarrowList(bl, 5, 2);
    expect(list.getBarWidth(0)).toBe(5); // wide bar (2 bits long)
    expect(list.getBarWidth(1)).toBe(2); // narrow space
    expect(list.getBarWidth(2)).toBe(2); // narrow bar
  });

  it("getTotalWidth sums all bar widths and clamps to 1 when empty", () => {
    const empty = newBitList(0);
    const emptyList = toWideNarrowList(empty, 3, 1);
    expect(emptyList.getTotalWidth()).toBe(1);

    const bl = newBitList(8);
    bl.addBit(true, true, false, true);
    const list = toWideNarrowList(bl, 3, 1);
    // wide-bar (3) + narrow-space (1) + narrow-bar (1) = 5
    expect(list.getTotalWidth()).toBe(5);
  });

  it("Code 39 'A' wide/narrow pattern", () => {
    // Code 39 encodes each character as 9 elements (alternating bar / space) where
    // exactly 3 are wide and 6 are narrow. For 'A' the canonical pattern is:
    //   bar(wide) space(narrow) bar(narrow) space(narrow) bar(narrow)
    //     space(wide) bar(narrow) space(narrow) bar(wide)
    // → as a BitList with wide = 2 bits and narrow = 1 bit:
    //   "11" + "0" + "1" + "0" + "1" + "00" + "1" + "0" + "11"
    const bl = newBitList(12);
    bl.addBit(true, true);
    bl.addBit(false);
    bl.addBit(true);
    bl.addBit(false);
    bl.addBit(true);
    bl.addBit(false, false);
    bl.addBit(true);
    bl.addBit(false);
    bl.addBit(true, true);

    const list = toWideNarrowList(bl, 3, 1);
    // Expected 9 elements: W N N N N W N N W (wide pattern 100010001 across the 9 elements,
    // alternating on/off starting with on)
    expect(list.data).toEqual([
      [true, true], // wide bar
      [false, false], // narrow space
      [false, true], // narrow bar
      [false, false], // narrow space
      [false, true], // narrow bar
      [true, false], // wide space
      [false, true], // narrow bar
      [false, false], // narrow space
      [true, true], // wide bar
    ]);
    // Total width: 3 + 1 + 1 + 1 + 1 + 3 + 1 + 1 + 3 = 15
    expect(list.getTotalWidth()).toBe(15);
  });
});
