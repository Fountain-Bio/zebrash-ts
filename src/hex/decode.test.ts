import { Buffer } from "node:buffer";
import { deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";

import { decodeEscapedString, decodeFontData, decodeGraphicFieldData } from "./decode.ts";

describe("decodeGraphicFieldData", () => {
  it("decodes plain hex without RLE", () => {
    const out = decodeGraphicFieldData("DEADBEEF", 4);
    expect(Array.from(out)).toEqual([0xde, 0xad, 0xbe, 0xef]);
  });

  it("expands a single uppercase compress count", () => {
    // J = 4. "JF" with rowBytes=2 (rowHex=4) -> "FFFF"
    const out = decodeGraphicFieldData("JF", 2);
    expect(Array.from(out)).toEqual([0xff, 0xff]);
  });

  it("supports two-letter (lowercase) compress shortcuts", () => {
    // h = 40 zeros. With rowBytes=20 (rowHex=40) we get one 40-char row of '0'.
    const out = decodeGraphicFieldData("h0", 20);
    expect(out).toHaveLength(20);
    expect(out.every((b) => b === 0)).toBe(true);
  });

  it("combines lowercase and uppercase compress counts", () => {
    // h (40) + I (3) = 43, applied to '1' -> "1" * 43.
    // rowBytes=22 (rowHex=44). Final unfilled line of 43 chars is preserved on flush.
    // 43 hex chars is odd, so use rowBytes=21+remainder approach: instead test a
    // multiple of 2: g (20) + I (3) = 23, applied to 'F' -> 23 'F's. Use rowBytes=12
    // so rowHex=24 and the 23-char line is padded with a trailing comma below.
    const out = decodeGraphicFieldData("gIF,", 12);
    // Expected: 23 Fs + 1 zero = "FFFFFFFFFFFFFFFFFFFFFFF0"
    expect(out.toString("hex").toUpperCase()).toBe("FFFFFFFFFFFFFFFFFFFFFFF0");
  });

  it("handles ',' (zero-fill remainder of row)", () => {
    const out = decodeGraphicFieldData("F,", 2);
    expect(Array.from(out)).toEqual([0xf0, 0x00]);
  });

  it("handles '!' (one-fill remainder of row)", () => {
    const out = decodeGraphicFieldData("F!", 2);
    expect(Array.from(out)).toEqual([0xf1, 0x11]);
  });

  it("handles ':' (repeat previous row)", () => {
    // "JF:" with rowBytes=2 (rowHex=4):
    // - J=4 -> compressCount=4
    // - F -> "FFFF" (fills row)
    // - : -> flush prev row "FFFF", then append prev row again -> line "FFFF"
    // - end -> push "FFFF"; result = "FFFFFFFF"
    const out = decodeGraphicFieldData("JF:", 2);
    expect(Array.from(out)).toEqual([0xff, 0xff, 0xff, 0xff]);
  });

  it("decodes Z64-encoded data", () => {
    const payload = Buffer.from([0xde, 0xad, 0xbe, 0xef, 0x00, 0x01, 0x02, 0x03]);
    const compressed = deflateSync(payload);
    const z64 = `:Z64:${compressed.toString("base64")}:DEAD`;
    const out = decodeGraphicFieldData(z64, payload.length);
    expect(Array.from(out)).toEqual(Array.from(payload));
  });

  it("decodes Z64 without trailing CRC", () => {
    const payload = Buffer.from("hello world", "utf8");
    const compressed = deflateSync(payload);
    const z64 = `:Z64:${compressed.toString("base64")}`;
    const out = decodeGraphicFieldData(z64, payload.length);
    expect(out.toString("utf8")).toBe("hello world");
  });

  it("rejects malformed hex", () => {
    expect(() => decodeGraphicFieldData("XYZ", 4)).toThrow(/encoding\/hex/);
  });
});

describe("decodeFontData", () => {
  it("decodes plain hex font data", () => {
    const out = decodeFontData("00FF00FF", 4);
    expect(Array.from(out)).toEqual([0x00, 0xff, 0x00, 0xff]);
  });
});

describe("decodeEscapedString", () => {
  it("replaces hex escape sequences with the corresponding bytes", () => {
    const out = decodeEscapedString("ab_41_42cd", "_");
    expect(out).toBe("abABcd");
  });

  it("handles regex-special escape characters", () => {
    const out = decodeEscapedString("x.41y", ".");
    expect(out).toBe("xAy");
  });

  it("leaves plain text untouched", () => {
    const out = decodeEscapedString("no escapes here", "_");
    expect(out).toBe("no escapes here");
  });

  it("decodes high-byte escapes as Latin-1 code points", () => {
    const out = decodeEscapedString("\\E9", "\\");
    expect(out).toBe("é");
  });
});
