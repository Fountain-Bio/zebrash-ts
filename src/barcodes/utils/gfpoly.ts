// Port of gfpoly.go — polynomial over a Galois Field.

import type { GaloisField } from "./galoisfield.ts";

export class GFPoly {
  private gf: GaloisField;
  // Coefficients are stored highest-degree-first to mirror Go's []int layout.
  coefficients: Int32Array;

  constructor(field: GaloisField, coefficients: Int32Array | readonly number[]) {
    this.gf = field;
    // Strip leading zeros, but keep at least one coefficient.
    let coeffs = coefficients instanceof Int32Array ? coefficients : Int32Array.from(coefficients);
    let start = 0;
    while (coeffs.length - start > 1 && coeffs[start] === 0) {
      start++;
    }
    if (start > 0) {
      coeffs = coeffs.slice(start);
    }
    this.coefficients = coeffs;
  }

  degree(): number {
    return this.coefficients.length - 1;
  }

  zero(): boolean {
    return this.coefficients[0] === 0;
  }

  // Returns the coefficient of x ^ degree.
  getCoefficient(degree: number): number {
    return this.coefficients[this.degree() - degree]!;
  }

  addOrSubstract(other: GFPoly): GFPoly {
    if (this.zero()) return other;
    if (other.zero()) return this;
    let smallCoeff = this.coefficients;
    let largeCoeff = other.coefficients;
    if (smallCoeff.length > largeCoeff.length) {
      const tmp = largeCoeff;
      largeCoeff = smallCoeff;
      smallCoeff = tmp;
    }
    const sumDiff = new Int32Array(largeCoeff.length);
    const lenDiff = largeCoeff.length - smallCoeff.length;
    sumDiff.set(largeCoeff.subarray(0, lenDiff));
    for (let i = lenDiff; i < largeCoeff.length; i++) {
      sumDiff[i] = this.gf.addOrSub(smallCoeff[i - lenDiff]!, largeCoeff[i]!);
    }
    return new GFPoly(this.gf, sumDiff);
  }

  multByMonominal(degree: number, coeff: number): GFPoly {
    if (coeff === 0) return this.gf.zero();
    const size = this.coefficients.length;
    const result = new Int32Array(size + degree);
    for (let i = 0; i < size; i++) {
      result[i] = this.gf.multiply(this.coefficients[i]!, coeff);
    }
    return new GFPoly(this.gf, result);
  }

  multiply(other: GFPoly): GFPoly {
    if (this.zero() || other.zero()) return this.gf.zero();
    const aCoeff = this.coefficients;
    const aLen = aCoeff.length;
    const bCoeff = other.coefficients;
    const bLen = bCoeff.length;
    const product = new Int32Array(aLen + bLen - 1);
    for (let i = 0; i < aLen; i++) {
      const ac = aCoeff[i]!;
      for (let j = 0; j < bLen; j++) {
        const bc = bCoeff[j]!;
        product[i + j] = this.gf.addOrSub(product[i + j]!, this.gf.multiply(ac, bc));
      }
    }
    return new GFPoly(this.gf, product);
  }

  divide(other: GFPoly): { quotient: GFPoly; remainder: GFPoly } {
    let quotient = this.gf.zero();
    let remainder: GFPoly = this;
    const fld = this.gf;
    const denomLeadTerm = other.getCoefficient(other.degree());
    const inversDenomLeadTerm = fld.invers(denomLeadTerm);
    while (remainder.degree() >= other.degree() && !remainder.zero()) {
      const degreeDiff = remainder.degree() - other.degree();
      const scale = fld.multiply(remainder.getCoefficient(remainder.degree()), inversDenomLeadTerm);
      const term = other.multByMonominal(degreeDiff, scale);
      const itQuot = newMonominalPoly(fld, degreeDiff, scale);
      quotient = quotient.addOrSubstract(itQuot);
      remainder = remainder.addOrSubstract(term);
    }
    return { quotient, remainder };
  }
}

export function newMonominalPoly(field: GaloisField, degree: number, coeff: number): GFPoly {
  if (coeff === 0) return field.zero();
  const result = new Int32Array(degree + 1);
  result[0] = coeff;
  return new GFPoly(field, result);
}

export function newGFPoly(
  field: GaloisField,
  coefficients: readonly number[] | Int32Array,
): GFPoly {
  return new GFPoly(field, coefficients);
}
