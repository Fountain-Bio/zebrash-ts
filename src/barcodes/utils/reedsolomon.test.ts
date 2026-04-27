import { describe, expect, it } from "vitest";
import { newGaloisField } from "./galoisfield.ts";
import { newGFPoly } from "./gfpoly.ts";
import { newReedSolomonEncoder } from "./reedsolomon.ts";

describe("ReedSolomonEncoder", () => {
  it("matches the canonical QR Version 1-M test vector", () => {
    // Reference: QR Code spec, also reproduced at
    // https://www.thonky.com/qr-code-tutorial/error-correction-coding
    // 16 data codewords + 10 ECC codewords (QR v1-M).
    const gf = newGaloisField(0x011d, 256, 0);
    const rs = newReedSolomonEncoder(gf);

    const data = [
      0x10, 0x20, 0x0c, 0x56, 0x61, 0x80, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11, 0xec,
      0x11,
    ];
    const expected = [0xa5, 0x24, 0xd4, 0xc1, 0xed, 0x36, 0xc7, 0x87, 0x2c, 0x55];
    const ecc = rs.encode(data, 10);
    expect(Array.from(ecc)).toEqual(expected);
  });

  it("produces deterministic output for repeated calls (cached generator polynomials)", () => {
    const gf = newGaloisField(0x011d, 256, 0);
    const rs = newReedSolomonEncoder(gf);
    const data = [1, 2, 3, 4, 5, 6, 7, 8];
    const a = Array.from(rs.encode(data, 8));
    const b = Array.from(rs.encode(data, 8));
    const c = Array.from(rs.encode(data, 4));
    const d = Array.from(rs.encode(data, 8));
    expect(a).toEqual(b);
    expect(a).toEqual(d);
    expect(c.length).toBe(4);
  });

  it("encoded message + ECC is divisible by the generator polynomial", () => {
    // Property: encode(data, k) yields ECC bytes such that the polynomial
    // [data || ECC] is divisible by the generator polynomial of degree k.
    // We verify this directly using GFPoly.divide.
    const gf = newGaloisField(0x011d, 256, 0);
    const rs = newReedSolomonEncoder(gf);
    const data = [42, 17, 99, 200, 5, 250, 1, 128];
    const eccCount = 6;
    const ecc = rs.encode(data, eccCount);
    const message = [...data, ...Array.from(ecc)];

    // Build the generator polynomial: ∏_{d=0}^{eccCount-1} (x + α^(d + base))
    // and reduce `message * x^0` by it — the remainder should be zero.
    let generator = newGFPoly(gf, [1]);
    for (let d = 0; d < eccCount; d++) {
      generator = generator.multiply(newGFPoly(gf, [1, gf.aLogTbl[d]!]));
    }
    const messagePoly = newGFPoly(gf, message);
    const { remainder } = messagePoly.divide(generator);
    expect(remainder.zero()).toBe(true);
  });

  it("supports the Aztec GF(256) base=1 configuration", () => {
    const gf = newGaloisField(0x012d, 256, 1);
    const rs = newReedSolomonEncoder(gf);
    const ecc = rs.encode([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 6);
    expect(ecc.length).toBe(6);

    // Verify divisibility for the base-1 Aztec generator: ∏_{d=0}^{eccCount-1}(x + α^(d+1)).
    let generator = newGFPoly(gf, [1]);
    for (let d = 0; d < 6; d++) {
      generator = generator.multiply(newGFPoly(gf, [1, gf.aLogTbl[d + 1]!]));
    }
    const message = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, ...Array.from(ecc)];
    const messagePoly = newGFPoly(gf, message);
    const { remainder } = messagePoly.divide(generator);
    expect(remainder.zero()).toBe(true);
  });
});
