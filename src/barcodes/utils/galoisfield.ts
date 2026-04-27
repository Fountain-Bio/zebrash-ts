// Port of galoisfield.go — Galois Field arithmetic for Reed-Solomon.

import { type GFPoly, newGFPoly } from "./gfpoly.ts";

// GaloisField encapsulates Galois field arithmetic.
export class GaloisField {
  size: number;
  base: number;
  // Antilog and log tables backed by Int32Array — matches Go's []int.
  aLogTbl: Int32Array;
  logTbl: Int32Array;

  constructor(pp: number, fieldSize: number, b: number) {
    this.size = fieldSize;
    this.base = b;
    this.aLogTbl = new Int32Array(fieldSize);
    this.logTbl = new Int32Array(fieldSize);

    let x = 1;
    for (let i = 0; i < fieldSize; i++) {
      this.aLogTbl[i] = x;
      x = x * 2;
      if (x >= fieldSize) {
        x = (x ^ pp) & (fieldSize - 1);
      }
    }
    for (let i = 0; i < fieldSize; i++) {
      this.logTbl[this.aLogTbl[i]!] = i;
    }
  }

  zero(): GFPoly {
    return newGFPoly(this, [0]);
  }

  // Add or subtract two numbers (XOR in GF(2^k)).
  addOrSub(a: number, b: number): number {
    return a ^ b;
  }

  // Multiplies two numbers.
  multiply(a: number, b: number): number {
    if (a === 0 || b === 0) return 0;
    const idx = (this.logTbl[a]! + this.logTbl[b]!) % (this.size - 1);
    return this.aLogTbl[idx]!;
  }

  // Divides two numbers.
  divide(a: number, b: number): number {
    if (b === 0) throw new Error("divide by zero");
    if (a === 0) return 0;
    // Mirrors Go: ALogTbl[(LogTbl[a]-LogTbl[b]) % (Size-1)]
    // Go's % preserves sign of the dividend; we replicate by allowing negative indices and
    // wrapping into range using a true modulo.
    const diff = this.logTbl[a]! - this.logTbl[b]!;
    const m = this.size - 1;
    // Match Go semantics: in Go (-5) % 7 == -5, then ALogTbl[-5] would be out-of-range.
    // In practice the multiply's result >= 0 because logTbl values are always in [0, size-1).
    // If diff is negative, use a positive modulo to stay in range — matches the actual lookup.
    const idx = ((diff % m) + m) % m;
    return this.aLogTbl[idx]!;
  }

  invers(num: number): number {
    return this.aLogTbl[this.size - 1 - this.logTbl[num]!]!;
  }
}

export function newGaloisField(pp: number, fieldSize: number, b: number): GaloisField {
  return new GaloisField(pp, fieldSize, b);
}
