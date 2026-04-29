import { describe, expect, it } from "vitest";

import { BitList, newBitList } from "./bitlist.ts";

describe("BitList", () => {
  it("addBit/getBit round-trip MSB-first", () => {
    const bl = newBitList(8);
    bl.addBit(true, false, true, true);
    expect(bl.len()).toBe(4);
    expect(bl.getBit(0)).toBe(true);
    expect(bl.getBit(1)).toBe(false);
    expect(bl.getBit(2)).toBe(true);
    expect(bl.getBit(3)).toBe(true);
  });

  it("setBit overwrites an existing bit", () => {
    const bl = newBitList(8);
    bl.addBit(false, false, false);
    bl.setBit(1, true);
    expect(bl.getBit(0)).toBe(false);
    expect(bl.getBit(1)).toBe(true);
    expect(bl.getBit(2)).toBe(false);
    bl.setBit(1, false);
    expect(bl.getBit(1)).toBe(false);
  });

  it("addByte appends 8 bits MSB-first", () => {
    const bl = newBitList(8);
    bl.addByte(0xa5); // 1010 0101
    const expected = [true, false, true, false, false, true, false, true];
    expect(bl.len()).toBe(8);
    for (let i = 0; i < 8; i++) {
      expect(bl.getBit(i)).toBe(expected[i]);
    }
  });

  it("addBits appends the last N bits MSB-first", () => {
    const bl = newBitList(8);
    bl.addBits(0b1011, 4);
    expect(bl.len()).toBe(4);
    expect(bl.getBit(0)).toBe(true);
    expect(bl.getBit(1)).toBe(false);
    expect(bl.getBit(2)).toBe(true);
    expect(bl.getBit(3)).toBe(true);
  });

  it("getBytes packs bits MSB-first", () => {
    const bl = newBitList(16);
    bl.addByte(0xa5);
    bl.addByte(0xc3);
    expect(Array.from(bl.getBytes())).toEqual([0xa5, 0xc3]);
  });

  it("getBytes pads incomplete final byte", () => {
    const bl = newBitList(8);
    bl.addBits(0b101, 3);
    const bytes = bl.getBytes();
    expect(bytes.length).toBe(1);
    expect(bytes[0]).toBe(0b101_00000);
  });

  it("grows beyond the initial capacity", () => {
    const bl = new BitList(8);
    for (let i = 0; i < 1000; i++) {
      bl.addBit(i % 2 === 0);
    }
    expect(bl.len()).toBe(1000);
    for (let i = 0; i < 1000; i++) {
      expect(bl.getBit(i)).toBe(i % 2 === 0);
    }
  });

  it("iterateBytes yields the same bytes as getBytes", () => {
    const bl = newBitList(24);
    bl.addByte(0x01);
    bl.addByte(0x80);
    bl.addByte(0xff);
    const expected = Array.from(bl.getBytes());
    const seen = Array.from(bl.iterateBytes());
    expect(seen).toEqual(expected);
  });
});
