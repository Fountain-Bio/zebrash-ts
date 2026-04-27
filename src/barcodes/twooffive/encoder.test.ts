import { describe, expect, it } from "vitest";
import { encodeInterleaved } from "./encoder.js";

const bitsToString = (bits: boolean[]): string => bits.map((b) => (b ? "1" : "0")).join("");

describe("twooffive.encodeInterleaved", () => {
  it("encodes '12345' with a leading zero pad", () => {
    const result = encodeInterleaved("12345", false);
    expect(result.content).toBe("012345");

    // start | (0,1) | (2,3) | (4,5) | end
    const expected = [
      "1010",
      "100010111011101000",
      "100011100010101110",
      "100010111000101110",
      "11101",
    ].join("");
    expect(bitsToString(result.bits.toArray())).toBe(expected);
  });

  it("encodes '1234567890' with no padding", () => {
    const result = encodeInterleaved("1234567890", false);
    expect(result.content).toBe("1234567890");

    // start | (1,2) | (3,4) | (5,6) | (7,8) | (9,0) | end
    const expected = [
      "1010",
      // (1,2) a=10001 b=01001
      "111010001010111000",
      // (3,4) a=11000 b=00101
      "111011101000101000",
      // (5,6) a=10100 b=01100
      "111010001110001010",
      // (7,8) a=00011 b=10010
      "100010101110001110",
      // (9,0) a=01010 b=00110
      "101110100011100010",
      "11101",
    ].join("");
    expect(bitsToString(result.bits.toArray())).toBe(expected);
  });

  it("appends a check digit when requested", () => {
    // "12345": sum = 1*3 + 2*1 + 3*3 + 4*1 + 5*3 = 3+2+9+4+15 = 33 → mod 10 = 3 → check = 7.
    // → "123457", even length, no padding.
    const result = encodeInterleaved("12345", true);
    expect(result.content).toBe("123457");
  });

  it("computes a zero check digit when sum % 10 is zero", () => {
    // "0": sum = 0*3 = 0 → check digit = 0; "00" is already even-length.
    const result = encodeInterleaved("0", true);
    expect(result.content).toBe("00");
  });

  it("rejects non-digit input", () => {
    expect(() => encodeInterleaved("12a45", false)).toThrow(/can not encode/);
  });

  it("rejects non-digit input when computing the check digit", () => {
    expect(() => encodeInterleaved("12a45", true)).toThrow(/can not encode/);
  });
});
