import { describe, expect, it } from "vitest";
import { encode } from "./encoder.ts";

// The `*` start/stop guard pattern (0x094) renders as these 12 bits.
const START_STOP = "100101101101";
const NARROW_GAP = "0";

describe("code39 encode", () => {
  it("frames an empty string with just the start/stop guards and one gap", () => {
    const bits = encode("").toBitString();
    // Empty payload still emits start + inter-character gap + stop.
    expect(bits).toBe(`${START_STOP}${NARROW_GAP}${START_STOP}`);
    expect(bits.length).toBe(25);
  });

  it("encodes 'ABC123' as the expected wide/narrow bit pattern", () => {
    const bits = encode("ABC123").toBitString();

    // codeWidth = 24 + 1 + 13 * length = 24 + 1 + 78 = 103
    expect(bits.length).toBe(103);

    // Manually computed against the Go encoding table.
    expect(bits).toBe(
      [
        "1001011011010", // * + gap
        "1101010010110", // A + gap
        "1011010010110", // B + gap
        "1101101001010", // C + gap
        "1101001010110", // 1 + gap
        "1011001010110", // 2 + gap
        "1101100101010", // 3 + gap
        "100101101101", //  *
      ].join(""),
    );

    expect(bits.startsWith(START_STOP)).toBe(true);
    expect(bits.endsWith(START_STOP)).toBe(true);
  });

  it("encodes the full alphabet length predictably", () => {
    const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%";
    const bits = encode(alphabet).toBitString();
    expect(bits.length).toBe(24 + 1 + 13 * alphabet.length);
    expect(bits.startsWith(START_STOP)).toBe(true);
    expect(bits.endsWith(START_STOP)).toBe(true);
  });

  it("falls back to extended full ASCII mode for lowercase characters", () => {
    // 'a' is encoded in extended mode as "+A"
    const direct = encode("+A").toBitString();
    const extended = encode("a").toBitString();
    expect(extended).toBe(direct);
  });

  it("encodes extended-mode escape sequences for high-bit and special chars", () => {
    // '@' -> "%V"
    expect(encode("@").toBitString()).toBe(encode("%V").toBitString());
    // '`' -> "%W"
    expect(encode("`").toBitString()).toBe(encode("%W").toBitString());
    // NUL (0x00) -> "%U"
    expect(encode(String.fromCharCode(0x00)).toBitString()).toBe(encode("%U").toBitString());
    // '!' (0x21) -> "/A"
    expect(encode("!").toBitString()).toBe(encode("/A").toBitString());
    // '?' (0x3f) -> "%J" (F + (63 - 59) = F + 4 = J)
    expect(encode("?").toBitString()).toBe(encode("%J").toBitString());
    // '_' (0x5f) -> "%O" (K + (95 - 91) = K + 4 = O)
    expect(encode("_").toBitString()).toBe(encode("%O").toBitString());
    // DEL (0x7f) -> "%T" (P + (127 - 123) = P + 4 = T)
    expect(encode(String.fromCharCode(0x7f)).toBitString()).toBe(encode("%T").toBitString());
  });

  it("rejects non-ASCII characters that are unencodable", () => {
    // 0x80 is the first byte beyond the 7-bit ASCII range the Go encoder accepts.
    expect(() => encode(String.fromCharCode(0x80))).toThrow(/non-encodable character/);
  });

  it("rejects payloads longer than 80 characters", () => {
    const tooLong = "0".repeat(81);
    expect(() => encode(tooLong)).toThrow(/less than 80 digits/);
  });

  it("rejects payloads that exceed 80 chars after extended-mode expansion", () => {
    // Each lowercase letter expands to two characters; 41 letters -> 82 chars.
    const tooLongAfterExpansion = "a".repeat(41);
    expect(() => encode(tooLongAfterExpansion)).toThrow(/extended full ASCII mode/);
  });
});
