import { describe, expect, it } from "vitest";
import { BitArray } from "./bit_array.ts";
import {
  BitMatrix,
  newBitMatrix,
  newSquareBitMatrix,
  parseBoolMapToBitMatrix,
  parseStringToBitMatrix,
} from "./bit_matrix.ts";

describe("BitMatrix", () => {
  it("set/get/unset round-trip", () => {
    const m = newBitMatrix(50, 30);
    expect(m.get(10, 5)).toBe(false);
    m.set(10, 5);
    m.set(33, 29);
    m.set(0, 0);
    expect(m.get(10, 5)).toBe(true);
    expect(m.get(33, 29)).toBe(true);
    expect(m.get(0, 0)).toBe(true);
    m.unset(10, 5);
    expect(m.get(10, 5)).toBe(false);
  });

  it("rejects zero/negative dimensions", () => {
    expect(() => newBitMatrix(0, 5)).toThrow();
    expect(() => newBitMatrix(5, 0)).toThrow();
    expect(() => newBitMatrix(-1, 5)).toThrow();
  });

  it("get returns false for out-of-bounds coords", () => {
    const m = newBitMatrix(10, 10);
    m.set(5, 5);
    expect(m.get(-1, 0)).toBe(false);
    expect(m.get(0, -1)).toBe(false);
    expect(m.get(10, 0)).toBe(false);
    expect(m.get(0, 10)).toBe(false);
  });

  it("flip toggles", () => {
    const m = newSquareBitMatrix(10);
    m.flip(3, 4);
    expect(m.get(3, 4)).toBe(true);
    m.flip(3, 4);
    expect(m.get(3, 4)).toBe(false);
  });

  it("flipAll inverts every bit (within rowSize words)", () => {
    const m = newBitMatrix(32, 4);
    m.set(0, 0);
    m.flipAll();
    expect(m.get(0, 0)).toBe(false);
    expect(m.get(1, 0)).toBe(true);
    expect(m.get(31, 3)).toBe(true);
  });

  it("clone produces an independent copy", () => {
    const m = newBitMatrix(20, 20);
    m.set(5, 5);
    const c = m.clone();
    expect(c.get(5, 5)).toBe(true);
    c.set(7, 7);
    expect(m.get(7, 7)).toBe(false);
    expect(c.get(5, 5)).toBe(true);
  });

  it("xor of two matrices", () => {
    const a = newBitMatrix(10, 10);
    const b = newBitMatrix(10, 10);
    a.set(1, 1);
    a.set(2, 2);
    b.set(1, 1);
    b.set(3, 3);
    a.xor(b);
    expect(a.get(1, 1)).toBe(false);
    expect(a.get(2, 2)).toBe(true);
    expect(a.get(3, 3)).toBe(true);
  });

  it("xor with mismatched dimensions throws", () => {
    const a = newBitMatrix(10, 10);
    const b = newBitMatrix(11, 10);
    expect(() => a.xor(b)).toThrow();
  });

  it("clear empties matrix", () => {
    const m = newBitMatrix(10, 10);
    m.set(5, 5);
    m.clear();
    expect(m.get(5, 5)).toBe(false);
  });

  it("setRegion fills a rectangular region", () => {
    const m = newBitMatrix(20, 20);
    m.setRegion(2, 3, 5, 4);
    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 20; x++) {
        const inside = x >= 2 && x < 7 && y >= 3 && y < 7;
        expect(m.get(x, y)).toBe(inside);
      }
    }
  });

  it("setRegion validates inputs", () => {
    const m = newBitMatrix(10, 10);
    expect(() => m.setRegion(-1, 0, 1, 1)).toThrow();
    expect(() => m.setRegion(0, 0, 0, 1)).toThrow();
    expect(() => m.setRegion(8, 8, 5, 5)).toThrow();
  });

  it("getRow / setRow round-trip", () => {
    const m = newBitMatrix(40, 5);
    m.set(0, 2);
    m.set(15, 2);
    m.set(39, 2);
    const row = m.getRow(2, null);
    expect(row.get(0)).toBe(true);
    expect(row.get(15)).toBe(true);
    expect(row.get(39)).toBe(true);

    const m2 = newBitMatrix(40, 5);
    m2.setRow(3, row);
    expect(m2.get(0, 3)).toBe(true);
    expect(m2.get(15, 3)).toBe(true);
    expect(m2.get(39, 3)).toBe(true);
  });

  it("getRow reuses the provided BitArray when large enough", () => {
    const m = newBitMatrix(40, 5);
    m.set(10, 1);
    const buffer = new BitArray(40);
    buffer.set(0); // pre-existing bit should be cleared
    const row = m.getRow(1, buffer);
    expect(row).toBe(buffer);
    expect(row.get(0)).toBe(false);
    expect(row.get(10)).toBe(true);
  });

  it("rotate90 transforms width↔height and reflects coords", () => {
    const m = newBitMatrix(4, 3);
    m.set(0, 0);
    m.set(3, 0);
    m.set(2, 1);
    m.rotate90();
    // After 90° rotation: new dims are 3x4, and original (x, y) maps to (y, height-1-x).
    expect(m.getWidth()).toBe(3);
    expect(m.getHeight()).toBe(4);
    expect(m.get(0, 4 - 1 - 0)).toBe(true); // was (0, 0)
    expect(m.get(0, 4 - 1 - 3)).toBe(true); // was (3, 0)
    expect(m.get(1, 4 - 1 - 2)).toBe(true); // was (2, 1)
  });

  it("rotate180 mirrors both axes", () => {
    const m = newBitMatrix(7, 5);
    m.set(0, 0);
    m.set(6, 4);
    m.set(3, 2);
    m.rotate180();
    expect(m.get(6, 4)).toBe(true); // (0,0) → (6,4)
    expect(m.get(0, 0)).toBe(true); // (6,4) → (0,0)
    expect(m.get(3, 2)).toBe(true); // center stays
  });

  it("getEnclosingRectangle returns bounding box of set bits", () => {
    const m = newBitMatrix(50, 50);
    expect(m.getEnclosingRectangle()).toBeNull();
    m.set(5, 7);
    m.set(20, 35);
    m.set(45, 12);
    const rect = m.getEnclosingRectangle();
    expect(rect).toEqual([5, 7, 45 - 5 + 1, 35 - 7 + 1]);
  });

  it("getTopLeftOnBit / getBottomRightOnBit", () => {
    const m = newBitMatrix(50, 50);
    expect(m.getTopLeftOnBit()).toBeNull();
    expect(m.getBottomRightOnBit()).toBeNull();
    m.set(5, 7);
    m.set(20, 35);
    m.set(45, 12);
    expect(m.getTopLeftOnBit()).toEqual([5, 7]);
    expect(m.getBottomRightOnBit()).toEqual([20, 35]);
  });

  it("toString renders set/unset as configured", () => {
    const m = newBitMatrix(3, 2);
    m.set(0, 0);
    m.set(2, 1);
    expect(m.toString("X", ".", "\n")).toBe("X..\n..X\n");
  });

  it("parseBoolMapToBitMatrix reads a 2D bool array", () => {
    const m = parseBoolMapToBitMatrix([
      [true, false, true],
      [false, true, false],
    ]);
    expect(m.getWidth()).toBe(3);
    expect(m.getHeight()).toBe(2);
    expect(m.get(0, 0)).toBe(true);
    expect(m.get(1, 0)).toBe(false);
    expect(m.get(2, 0)).toBe(true);
    expect(m.get(0, 1)).toBe(false);
    expect(m.get(1, 1)).toBe(true);
  });

  it("parseStringToBitMatrix parses set/unset glyphs", () => {
    const m = parseStringToBitMatrix("X.X\n.X.\n", "X", ".");
    expect(m.getWidth()).toBe(3);
    expect(m.getHeight()).toBe(2);
    expect(m.get(0, 0)).toBe(true);
    expect(m.get(1, 0)).toBe(false);
    expect(m.get(2, 0)).toBe(true);
    expect(m.get(1, 1)).toBe(true);
  });
});

describe("BitMatrix.square", () => {
  it("creates an N x N matrix", () => {
    const m = BitMatrix.square(5);
    expect(m.getWidth()).toBe(5);
    expect(m.getHeight()).toBe(5);
  });
});
