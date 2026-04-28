import { describe, expect, test } from "vitest";

import { Encoder, newEncoder } from "./readsolomon.js";

describe("readsolomon Encoder", () => {
  test("produces zero ecc for all-zero input", () => {
    const enc = newEncoder(0x43, 10, 1);
    const data = new Uint8Array(10);
    const ecc = new Uint8Array(10);
    enc.encode(10, data, ecc);
    expect(Array.from(ecc)).toEqual(Array.from({ length: 10 }, () => 0));
  });

  test("encoding is deterministic", () => {
    const enc = newEncoder(0x43, 10, 1);
    const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const ecc1 = new Uint8Array(10);
    const ecc2 = new Uint8Array(10);
    enc.encode(10, data, ecc1);
    enc.encode(10, data, ecc2);
    expect(Array.from(ecc1)).toEqual(Array.from(ecc2));
  });

  test("constructor matches `newEncoder` factory", () => {
    const a = newEncoder(0x43, 10, 1);
    const b = new Encoder(0x43, 10, 1);
    const data = new Uint8Array([0xaa, 0x55, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
    const eccA = new Uint8Array(10);
    const eccB = new Uint8Array(10);
    a.encode(10, data, eccA);
    b.encode(10, data, eccB);
    expect(Array.from(eccA)).toEqual(Array.from(eccB));
  });

  test("different ECC sizes produce different lengths", () => {
    const enc20 = newEncoder(0x43, 20, 1);
    const enc28 = newEncoder(0x43, 28, 1);
    const data = new Uint8Array(34);
    for (let i = 0; i < data.length; i++) data[i] = i;
    const ecc20 = new Uint8Array(20);
    const ecc28 = new Uint8Array(28);
    enc20.encode(34, data, ecc20);
    enc28.encode(34, data, ecc28);
    expect(ecc20.some((b) => b !== 0)).toBe(true);
    expect(ecc28.some((b) => b !== 0)).toBe(true);
  });
});
