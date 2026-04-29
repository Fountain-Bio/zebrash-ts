// Port of reedsolomon.go — Reed-Solomon encoder.
//
// Note: the Go original guards `getPolynomial` with a sync.Mutex. JavaScript is single-threaded
// per realm, so no explicit lock is needed.

import type { GaloisField } from "./galoisfield.ts";

import { type GFPoly, newGFPoly } from "./gfpoly.ts";

export class ReedSolomonEncoder {
  private gf: GaloisField;
  private polynomes: GFPoly[];

  constructor(gf: GaloisField) {
    this.gf = gf;
    this.polynomes = [newGFPoly(gf, [1])];
  }

  private getPolynomial(degree: number): GFPoly {
    if (degree >= this.polynomes.length) {
      let last = this.polynomes[this.polynomes.length - 1]!;
      for (let d = this.polynomes.length; d <= degree; d++) {
        const next = last.multiply(newGFPoly(this.gf, [1, this.gf.aLogTbl[d - 1 + this.gf.base]!]));
        this.polynomes.push(next);
        last = next;
      }
    }
    return this.polynomes[degree]!;
  }

  encode(data: readonly number[] | Int32Array, eccCount: number): Int32Array {
    const generator = this.getPolynomial(eccCount);
    let info = newGFPoly(this.gf, data);
    info = info.multByMonominal(eccCount, 1);
    const { remainder } = info.divide(generator);

    const result = new Int32Array(eccCount);
    const numZero = eccCount - remainder.coefficients.length;
    result.set(remainder.coefficients, numZero);
    return result;
  }
}

export function newReedSolomonEncoder(gf: GaloisField): ReedSolomonEncoder {
  return new ReedSolomonEncoder(gf);
}
