import { describe, expect, it } from "vitest";
import { Code128, newCode128 } from "./code128.ts";
import {
  CODE_A,
  CODE_B,
  CODE_C,
  CODE_PATTERNS,
  ESCAPE_FNC_1,
  ESCAPE_FNC_2,
  EncodeAuto,
  EncodeNoMode,
  FNC_1,
  FNC_2,
  START_A,
  START_B,
  START_C,
  STOP,
  code128CType_FNC_1,
  code128CType_ONE_DIGIT,
  code128CType_TWO_DIGITS,
  code128CType_UNCODABLE,
  code128ChooseCode,
  code128FindCType,
} from "./encoder.ts";

const bitsToString = (bits: ReadonlyArray<boolean>): string =>
  bits.map((b) => (b ? "1" : "0")).join("");

describe("CODE_PATTERNS", () => {
  it("has 107 entries", () => {
    expect(CODE_PATTERNS).toHaveLength(107);
  });

  it("first 106 patterns have 6 widths summing to 11", () => {
    for (let i = 0; i < 106; i++) {
      const p = CODE_PATTERNS[i]!;
      expect(p).toHaveLength(6);
      const sum = p.reduce((acc, n) => acc + n, 0);
      expect(sum, `pattern ${i} should sum to 11`).toBe(11);
    }
  });

  it("stop pattern (106) has 7 widths summing to 13", () => {
    const stop = CODE_PATTERNS[106]!;
    expect(stop).toHaveLength(7);
    expect(stop.reduce((acc, n) => acc + n, 0)).toBe(13);
  });
});

describe("code128FindCType", () => {
  it("classifies single digit", () => {
    expect(code128FindCType("1", 0)).toBe(code128CType_ONE_DIGIT);
  });

  it("classifies two digits", () => {
    expect(code128FindCType("12", 0)).toBe(code128CType_TWO_DIGITS);
  });

  it("classifies FNC1 escape", () => {
    expect(code128FindCType(ESCAPE_FNC_1, 0)).toBe(code128CType_FNC_1);
  });

  it("classifies non-digit as uncodable", () => {
    expect(code128FindCType("A", 0)).toBe(code128CType_UNCODABLE);
  });

  it("returns UNCODABLE past end of string", () => {
    expect(code128FindCType("A", 5)).toBe(code128CType_UNCODABLE);
  });
});

describe("code128ChooseCode", () => {
  it("starts in code C for >=2 leading digits", () => {
    expect(code128ChooseCode("12", 0, 0)).toBe(CODE_C);
  });

  it("starts in code B for letters", () => {
    expect(code128ChooseCode("ABC", 0, 0)).toBe(CODE_B);
  });

  it("does not switch to C for only 2 digits inside B", () => {
    // "ABC123": after 'C', lookahead at "123" -> TWO_DIGITS, then start+2 -> ONE_DIGIT.
    // Expected: stay in B.
    expect(code128ChooseCode("ABC123", 3, CODE_B)).toBe(CODE_B);
  });

  it("switches to C inside B with 4+ digits", () => {
    expect(code128ChooseCode("AB1234", 2, CODE_B)).toBe(CODE_C);
  });

  it("stays in C while in C with two digits", () => {
    expect(code128ChooseCode("1234", 0, CODE_C)).toBe(CODE_C);
  });
});

describe("EncodeAuto", () => {
  it("rejects empty input", () => {
    expect(() => EncodeAuto("")).toThrowError(/length should be between 1 and 80/);
  });

  it("rejects oversized input", () => {
    expect(() => EncodeAuto("a".repeat(81))).toThrowError(/length should be between 1 and 80/);
  });

  it("rejects non-ASCII", () => {
    expect(() => EncodeAuto("")).toThrowError(/bad character/);
  });

  it("encodes ABC123 with the expected pattern indices", () => {
    const out = EncodeAuto("ABC123");
    // START_B, A=33, B=34, C=35, '1'=17, '2'=18, '3'=19, checksum, STOP.
    expect(out.patternsIdx.slice(0, -2)).toEqual([START_B, 33, 34, 35, 17, 18, 19]);

    // Checksum: (104 + 33 + 68 + 105 + 68 + 90 + 114) % 103 = 582 % 103 = 67
    const data = [START_B, 33, 34, 35, 17, 18, 19];
    const expectedChecksum = data.reduce((acc, idx, i) => acc + (i === 0 ? idx : idx * i), 0) % 103;
    expect(expectedChecksum).toBe(67);
    expect(out.patternsIdx).toEqual([...data, expectedChecksum, STOP]);

    // Total bits: 8 patterns * 11 + stop pattern 13 = 101
    expect(out.bits.length).toBe(8 * 11 + 13);

    // First bit of any Code 128 symbol must be a bar (true).
    expect(out.bits[0]).toBe(true);
  });

  it("encodes mode-A only data using START_A and code A indices", () => {
    // Use ESC (0x1B) which is below space and forces code A.
    const out = EncodeAuto("A");
    expect(out.patternsIdx[0]).toBe(START_A);
    // ASCII 0x1B is index (0x1B - 0x20 + 0x60) = -5 + 96 = 91 in code A.
    expect(out.patternsIdx[1]).toBe(91);
    // 'A' = 0x41 -> 0x41 - 0x20 = 33 in code A (same as B for printable).
    expect(out.patternsIdx[2]).toBe(33);
    expect(out.patternsIdx[out.patternsIdx.length - 1]).toBe(STOP);
  });

  it("encodes a numeric run via code C", () => {
    const out = EncodeAuto("12345678");
    // START_C, then 12, 34, 56, 78, checksum, STOP.
    expect(out.patternsIdx).toEqual([
      START_C,
      12,
      34,
      56,
      78,
      // checksum: (105 + 12 + 68 + 168 + 312) % 103 = 665 % 103 = 47
      (105 + 12 + 34 * 2 + 56 * 3 + 78 * 4) % 103,
      STOP,
    ]);
  });

  it("emits FNC_1 for the FNC1 escape character", () => {
    const out = EncodeAuto(`${ESCAPE_FNC_1}HELLO`);
    // FNC1 alone at start picks code B (FNC1 is ignored when choosing initial code).
    expect(out.patternsIdx[0]).toBe(START_B);
    expect(out.patternsIdx[1]).toBe(FNC_1);
  });

  it("emits FNC_2 for the FNC2 escape character", () => {
    const out = EncodeAuto(`${ESCAPE_FNC_2}HELLO`);
    expect(out.patternsIdx[0]).toBe(START_B);
    expect(out.patternsIdx[1]).toBe(FNC_2);
  });

  it("produces the exact bit pattern for '12'", () => {
    // Hand-traced bit string for input "12":
    //   START_C (105) = [2,1,1,2,3,2]    -> 11010011100
    //   12              [1,1,2,2,3,2]    -> 10110011100
    //   checksum 14     [1,2,2,2,3,1]    -> 10011001110
    //   STOP (106)      [2,3,3,1,1,1,2]  -> 1100011101011
    const out = EncodeAuto("12");
    expect(out.patternsIdx).toEqual([START_C, 12, 14, STOP]);
    expect(bitsToString(out.bits)).toBe(
      ["11010011100", "10110011100", "10011001110", "1100011101011"].join(""),
    );
  });
});

describe("EncodeNoMode", () => {
  it("defaults to subset B", () => {
    // Mirrors ZPL ^BC mode N: the loop is index-driven starting at i=1,
    // so each non-'>' character (including the first) is encoded as code B.
    const out = EncodeNoMode("_HELLO");
    expect(out.patternsIdx[0]).toBe(START_B);
    expect(out.humanReadable).toBe("_HELLO");
  });

  it("switches to subset C via '>;' prefix", () => {
    // ">;1234" -> START_C, 12, 34
    const out = EncodeNoMode(">;1234");
    expect(out.patternsIdx[0]).toBe(START_C);
    expect(out.humanReadable).toBe("1234");
  });

  it("emits FNC_1 for '>8' escape", () => {
    const out = EncodeNoMode("_>8AB");
    // After START_B and FNC_1 we should see 'A' (33) and 'B' (34)
    expect(out.patternsIdx).toContain(FNC_1);
  });
});

describe("Code128 wrapper", () => {
  it("clamps height and barWidth to 1", () => {
    const c = newCode128([true, false, true], 0, 0);
    expect(c.height).toBe(1);
    expect(c.barWidth).toBe(1);
    expect(c.width).toBe(3);
  });

  it("scales width by barWidth", () => {
    const c = new Code128([true, false], 5, 4);
    expect(c.width).toBe(8);
    expect(c.height).toBe(5);
    expect(c.isBlackAt(0)).toBe(true);
    expect(c.isBlackAt(3)).toBe(true);
    expect(c.isBlackAt(4)).toBe(false);
    expect(c.isBlackAt(7)).toBe(false);
    expect(c.isBlackAt(99)).toBe(false);
  });
});
