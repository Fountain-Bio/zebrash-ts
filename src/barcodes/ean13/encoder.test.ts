import { describe, expect, it } from "vitest";

import type { BitList } from "../utils/index.ts";

import { calcCheckNum, encode, encodeEan13, sanitizeContent, withCheckDigit } from "./encoder.ts";

function bitsToString(bits: BitList): string {
  let out = "";
  for (let i = 0; i < bits.len(); i++) {
    out += bits.getBit(i) ? "1" : "0";
  }
  return out;
}

describe("calcCheckNum", () => {
  it("computes the EAN-13 check digit for a 12-digit code", () => {
    // "590123412345" has check digit 7 → "5901234123457"
    expect(calcCheckNum("590123412345")).toBe("7");
  });

  it("computes the check digit for the canonical Wikipedia EAN-13 example", () => {
    // 4006381333931 — check digit is 1.
    expect(calcCheckNum("400638133393")).toBe("1");
  });

  it("computes EAN-8 check digit when called with 7 digits", () => {
    // EAN-8 example: 9638507 → check digit 4 → 96385074
    expect(calcCheckNum("9638507")).toBe("4");
  });

  it("returns 'B' if the input contains a non-digit", () => {
    expect(calcCheckNum("59012341234X")).toBe("B");
  });
});

describe("withCheckDigit", () => {
  it("appends the check digit", () => {
    expect(withCheckDigit("590123412345")).toBe("5901234123457");
  });
});

describe("sanitizeContent", () => {
  it("pads short input with leading zeros and adds a check digit", () => {
    expect(sanitizeContent("12345")).toBe("0000000123457");
  });

  it("replaces non-digits with 0 before computing the check digit", () => {
    expect(sanitizeContent("AB1234")).toBe("0000000012348");
  });

  it("passes 12-digit input straight through and appends the check digit", () => {
    expect(sanitizeContent("590123412345")).toBe("5901234123457");
  });

  it("truncates oversized input keeping first char + last 11 + check digit", () => {
    // 14 chars: '1' followed by '23456789012345' → keep "1" + "45678901234" + check
    const result = sanitizeContent("1234567890123456");
    expect(result).toHaveLength(13);
    expect(result.startsWith("1")).toBe(true);
  });
});

describe("encodeEan13", () => {
  // Canonical EAN-13 bit pattern for 5901234123457
  // (cross-verified against the Wikipedia EAN-13 article).
  const expected =
    "10100010110100111011001100100110111101001110101010110011011011001000010101110010011101000100101";

  it("encodes 5901234123457 to the canonical 95-module pattern", () => {
    const bits = encodeEan13("5901234123457");
    expect(bits).not.toBeNull();
    if (bits === null) return;
    expect(bits.len()).toBe(95);
    expect(bitsToString(bits)).toBe(expected);
  });

  it("starts and ends with the 101 guard pattern", () => {
    const bits = encodeEan13("5901234123457");
    expect(bits).not.toBeNull();
    if (bits === null) return;
    const str = bitsToString(bits);
    expect(str.slice(0, 3)).toBe("101");
    expect(str.slice(-3)).toBe("101");
    // Middle guard at modules 45..49 = "01010"
    expect(str.slice(45, 50)).toBe("01010");
  });

  it("returns null for an input containing a non-digit", () => {
    expect(encodeEan13("5901234X23457")).toBeNull();
  });
});

describe("encode", () => {
  it("returns the sanitized content alongside the rendered barcode", () => {
    const { content, image } = encode("5901234123457", 50, 2);
    expect(content).toBe("5901234123457");
    // 95 modules wide, 2px per bar = 190 px total.
    expect(image.width).toBe(190);
    expect(image.height).toBe(50);
    expect(image.barWidth).toBe(2);
  });

  it("rejects bad check digits by recomputing them (sanitize replaces them)", () => {
    // Input ends with a wrong check digit; sanitizeContent strips the input
    // back to its first 12 digits and recomputes the correct check digit.
    const { content } = encode("5901234123450", 50, 2);
    expect(content).toBe("5901234123457");
    expect(content).not.toBe("5901234123450");
  });

  it("clamps height and barWidth to a minimum of 1", () => {
    const { image } = encode("5901234123457", 0, 0);
    expect(image.height).toBe(1);
    expect(image.barWidth).toBe(1);
    expect(image.width).toBe(95);
  });
});
