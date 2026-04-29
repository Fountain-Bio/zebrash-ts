import { describe, expect, it } from "vitest";

import { BitArray, newBitArray, newEmptyBitArray } from "./bit_array.ts";

describe("BitArray", () => {
  it("set/get round-trip", () => {
    const a = newBitArray(64);
    expect(a.getSize()).toBe(64);
    expect(a.get(0)).toBe(false);
    a.set(0);
    a.set(31);
    a.set(32);
    a.set(63);
    expect(a.get(0)).toBe(true);
    expect(a.get(1)).toBe(false);
    expect(a.get(31)).toBe(true);
    expect(a.get(32)).toBe(true);
    expect(a.get(63)).toBe(true);
  });

  it("flip toggles", () => {
    const a = newBitArray(10);
    a.flip(3);
    expect(a.get(3)).toBe(true);
    a.flip(3);
    expect(a.get(3)).toBe(false);
  });

  it("getSizeInBytes rounds up", () => {
    expect(newBitArray(0).getSizeInBytes()).toBe(0);
    expect(newBitArray(1).getSizeInBytes()).toBe(1);
    expect(newBitArray(8).getSizeInBytes()).toBe(1);
    expect(newBitArray(9).getSizeInBytes()).toBe(2);
    expect(newBitArray(64).getSizeInBytes()).toBe(8);
  });

  it("setRange sets exactly the requested bits", () => {
    const a = newBitArray(40);
    a.setRange(5, 13);
    for (let i = 0; i < 40; i++) {
      expect(a.get(i)).toBe(i >= 5 && i < 13);
    }
  });

  it("setRange spanning a word boundary", () => {
    const a = newBitArray(80);
    a.setRange(28, 45);
    for (let i = 0; i < 80; i++) {
      expect(a.get(i)).toBe(i >= 28 && i < 45);
    }
  });

  it("isRange detects all-set / all-clear", () => {
    const a = newBitArray(50);
    a.setRange(10, 20);
    expect(a.isRange(10, 20, true)).toBe(true);
    expect(a.isRange(10, 21, true)).toBe(false);
    expect(a.isRange(0, 10, false)).toBe(true);
    expect(a.isRange(20, 50, false)).toBe(true);
  });

  it("clear zeroes everything", () => {
    const a = newBitArray(40);
    a.setRange(0, 40);
    a.clear();
    for (let i = 0; i < 40; i++) {
      expect(a.get(i)).toBe(false);
    }
  });

  it("getNextSet finds next set bit", () => {
    const a = newBitArray(100);
    a.set(7);
    a.set(33);
    a.set(99);
    expect(a.getNextSet(0)).toBe(7);
    expect(a.getNextSet(8)).toBe(33);
    expect(a.getNextSet(34)).toBe(99);
    expect(a.getNextSet(100)).toBe(100);
  });

  it("getNextUnset finds next unset bit", () => {
    const a = newBitArray(40);
    a.setRange(0, 10);
    expect(a.getNextUnset(0)).toBe(10);
    a.setRange(10, 20);
    expect(a.getNextUnset(0)).toBe(20);
  });

  it("appendBit grows the buffer", () => {
    const a = newEmptyBitArray();
    expect(a.getSize()).toBe(0);
    for (let i = 0; i < 200; i++) {
      a.appendBit(i % 3 === 0);
    }
    expect(a.getSize()).toBe(200);
    for (let i = 0; i < 200; i++) {
      expect(a.get(i)).toBe(i % 3 === 0);
    }
  });

  it("appendBits encodes values MSB-first", () => {
    const a = newEmptyBitArray();
    a.appendBits(0b101, 3); // bits 1, 0, 1 → indices 0, 1, 2
    expect(a.get(0)).toBe(true);
    expect(a.get(1)).toBe(false);
    expect(a.get(2)).toBe(true);
    expect(a.getSize()).toBe(3);
  });

  it("toBytes packs bits into bytes (MSB-first)", () => {
    const a = newBitArray(16);
    // Bit pattern 1010 0001 1100 0011 → 0xA1 0xC3
    for (const i of [0, 2, 7, 8, 9, 14, 15]) a.set(i);
    const out = new Uint8Array(2);
    a.toBytes(0, out, 0, 2);
    expect(out[0]).toBe(0xa1);
    expect(out[1]).toBe(0xc3);
  });

  it("xor two arrays", () => {
    const a = newBitArray(40);
    const b = newBitArray(40);
    a.setRange(0, 20);
    b.setRange(10, 30);
    a.xor(b);
    for (let i = 0; i < 40; i++) {
      const expected = (i >= 0 && i < 10) || (i >= 20 && i < 30);
      expect(a.get(i)).toBe(expected);
    }
  });

  it("reverse reverses the bit order", () => {
    const a = newBitArray(16);
    // Pattern: 1100 1010 1010 0000 → after reverse: 0000 0101 0101 0011
    for (const i of [0, 1, 4, 6, 8, 10]) a.set(i);
    a.reverse();
    const expectedSetBits = [5, 7, 9, 11, 14, 15];
    for (let i = 0; i < 16; i++) {
      expect(a.get(i)).toBe(expectedSetBits.includes(i));
    }
  });

  it("toString formats as expected", () => {
    const a = newBitArray(16);
    a.set(0);
    a.set(7);
    a.set(8);
    a.set(15);
    expect(a.toString()).toBe(" X......X X......X");
  });

  it("setBulk sets a whole word at once", () => {
    const a = newBitArray(64);
    a.setBulk(0, 0xffffffff);
    for (let i = 0; i < 32; i++) {
      expect(a.get(i)).toBe(true);
    }
    for (let i = 32; i < 64; i++) {
      expect(a.get(i)).toBe(false);
    }
  });

  it("setRange / isRange edge: empty range", () => {
    const a = newBitArray(8);
    a.setRange(3, 3); // no-op
    expect(a.isRange(3, 3, true)).toBe(true);
  });

  it("setRange invalid args throw", () => {
    const a = newBitArray(8);
    expect(() => a.setRange(-1, 4)).toThrow();
    expect(() => a.setRange(4, 1)).toThrow();
    expect(() => a.setRange(0, 9)).toThrow();
  });
});

describe("BitArray.empty()", () => {
  it("starts with size 0 and one backing word", () => {
    const a = BitArray.empty();
    expect(a.getSize()).toBe(0);
    expect(a.bits.length).toBe(1);
  });
});
