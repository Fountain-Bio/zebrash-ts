import { describe, expect, it } from "vitest";
import { newGaloisField } from "./galoisfield.ts";
import { newGFPoly, newMonominalPoly } from "./gfpoly.ts";

describe("GFPoly", () => {
  const gf = newGaloisField(0x011d, 256, 0);

  it("strips leading zero coefficients (but keeps at least one)", () => {
    const p = newGFPoly(gf, [0, 0, 1, 2, 3]);
    expect(Array.from(p.coefficients)).toEqual([1, 2, 3]);
    expect(p.degree()).toBe(2);

    const z = newGFPoly(gf, [0, 0, 0]);
    expect(Array.from(z.coefficients)).toEqual([0]);
    expect(z.zero()).toBe(true);
  });

  it("getCoefficient indexes by degree", () => {
    // p(x) = 3 x^2 + 4 x + 5
    const p = newGFPoly(gf, [3, 4, 5]);
    expect(p.getCoefficient(0)).toBe(5);
    expect(p.getCoefficient(1)).toBe(4);
    expect(p.getCoefficient(2)).toBe(3);
  });

  it("addOrSubstract is XOR-based addition over the GF", () => {
    // (x + 1) + (x + 2) = (1^1) x + (1^2) = 3
    const a = newGFPoly(gf, [1, 1]);
    const b = newGFPoly(gf, [1, 2]);
    const sum = a.addOrSubstract(b);
    expect(Array.from(sum.coefficients)).toEqual([3]);

    // adding 0 is identity
    const zero = gf.zero();
    expect(Array.from(a.addOrSubstract(zero).coefficients)).toEqual([1, 1]);
    expect(Array.from(zero.addOrSubstract(a).coefficients)).toEqual([1, 1]);
  });

  it("multByMonominal scales every coefficient and shifts by `degree`", () => {
    // (2 x + 3) * (5 x^2) = 10 x^3 + 15 x^2 (in normal arithmetic; in GF use multiply)
    const a = newGFPoly(gf, [2, 3]);
    const product = a.multByMonominal(2, 5);
    expect(Array.from(product.coefficients)).toEqual([gf.multiply(2, 5), gf.multiply(3, 5), 0, 0]);
  });

  it("multiply with zero is zero", () => {
    const a = newGFPoly(gf, [1, 2, 3]);
    expect(a.multiply(gf.zero()).zero()).toBe(true);
    expect(gf.zero().multiply(a).zero()).toBe(true);
  });

  it("multiply (x + α^0)(x + α^1) is the QR generator-2 polynomial", () => {
    // For QR base = 0, generator of degree 2 is (x - α^0)(x - α^1) = x^2 + 3 x + 2.
    const a = newGFPoly(gf, [1, gf.aLogTbl[0]!]); // x + 1
    const b = newGFPoly(gf, [1, gf.aLogTbl[1]!]); // x + 2
    const g = a.multiply(b);
    expect(Array.from(g.coefficients)).toEqual([1, 3, 2]);
  });

  it("divide returns quotient and remainder", () => {
    // (x^2 + 3x + 2) / (x + 1) = (x + 2), remainder 0
    const num = newGFPoly(gf, [1, 3, 2]);
    const den = newGFPoly(gf, [1, 1]);
    const { quotient, remainder } = num.divide(den);
    expect(Array.from(quotient.coefficients)).toEqual([1, 2]);
    expect(remainder.zero()).toBe(true);
  });

  it("newMonominalPoly produces coeff * x^degree", () => {
    const m = newMonominalPoly(gf, 3, 7);
    expect(Array.from(m.coefficients)).toEqual([7, 0, 0, 0]);
    expect(m.degree()).toBe(3);

    const z = newMonominalPoly(gf, 5, 0);
    expect(z.zero()).toBe(true);
  });
});
