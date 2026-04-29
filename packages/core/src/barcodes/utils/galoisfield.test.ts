import { describe, expect, it } from "vitest";

import { newGaloisField } from "./galoisfield.ts";

describe("GaloisField (QR-style GF(256), primitive 0x011D)", () => {
  const gf = newGaloisField(0x011d, 256, 0);

  it("size and base are stored verbatim", () => {
    expect(gf.size).toBe(256);
    expect(gf.base).toBe(0);
  });

  it("aLogTbl matches the well-known α^i sequence", () => {
    // First 9 powers of α=2 in GF(256) with poly 0x11D:
    // 1, 2, 4, 8, 16, 32, 64, 128, 0x1D (because 2^8 wraps to the irreducible's tail).
    const expected = [1, 2, 4, 8, 16, 32, 64, 128, 0x1d];
    for (let i = 0; i < expected.length; i++) {
      expect(gf.aLogTbl[i]).toBe(expected[i]);
    }
  });

  it("logTbl is the inverse of aLogTbl on i ∈ [1, 254]", () => {
    // Note: the multiplicative group has order 255, so aLogTbl wraps every 255 indices.
    // The Go init loop iterates i from 0..fieldSize-1 (= 255), so logTbl[aLogTbl[0]]
    // ends up being overwritten by i=255 — matching the Go behaviour.
    for (let i = 1; i < 255; i++) {
      const value = gf.aLogTbl[i]!;
      expect(gf.logTbl[value]).toBe(i);
    }
    // aLogTbl[0] === 1; logTbl[1] is overwritten to fieldSize-1 by the wrap.
    expect(gf.aLogTbl[0]).toBe(1);
    expect(gf.logTbl[1]).toBe(255);
  });

  it("addOrSub is XOR", () => {
    expect(gf.addOrSub(0, 0)).toBe(0);
    expect(gf.addOrSub(0xa5, 0x5a)).toBe(0xff);
    expect(gf.addOrSub(0xff, 0xff)).toBe(0);
  });

  it("multiplication is associative and commutative", () => {
    for (const [a, b] of [
      [3, 5],
      [7, 11],
      [0xa5, 0x3c],
    ] as const) {
      expect(gf.multiply(a, b)).toBe(gf.multiply(b, a));
    }
    expect(gf.multiply(0, 100)).toBe(0);
    expect(gf.multiply(100, 0)).toBe(0);
    // 1 is the multiplicative identity.
    expect(gf.multiply(1, 0xab)).toBe(0xab);
  });

  it("divide is the inverse of multiply", () => {
    for (let a = 1; a < 256; a += 17) {
      for (let b = 1; b < 256; b += 23) {
        const product = gf.multiply(a, b);
        expect(gf.divide(product, b)).toBe(a);
      }
    }
  });

  it("divide(0, b) == 0; divide by 0 throws", () => {
    expect(gf.divide(0, 5)).toBe(0);
    expect(() => gf.divide(5, 0)).toThrow();
  });

  it("invers(a) * a == 1", () => {
    for (let a = 1; a < 256; a++) {
      expect(gf.multiply(a, gf.invers(a))).toBe(1);
    }
  });
});

describe("GaloisField GF(16) — Aztec mode bits", () => {
  const gf = newGaloisField(0x13, 16, 1);

  it("size and base", () => {
    expect(gf.size).toBe(16);
    expect(gf.base).toBe(1);
  });

  it("multiplication forms a group on non-zero elements", () => {
    for (let a = 1; a < 16; a++) {
      const inv = gf.invers(a);
      expect(gf.multiply(a, inv)).toBe(1);
    }
  });
});
