import { describe, expect, it } from "vitest";
import { decodeCp437, decodeCp850, toUnicodeText } from "./decode.ts";

/** Helper: build a "byte-string" (each char's code unit is the raw byte). */
function bytesAsString(bytes: number[]): string {
  return bytes.map((b) => String.fromCharCode(b)).join("");
}

describe("decodeCp437", () => {
  it("passes ASCII through unchanged", () => {
    const out = decodeCp437(new Uint8Array([0x48, 0x69, 0x21]));
    expect(out).toBe("Hi!");
  });

  it("maps the 0x80-0xFF high range correctly", () => {
    expect(decodeCp437(new Uint8Array([0x80]))).toBe("Ç");
    expect(decodeCp437(new Uint8Array([0x9b]))).toBe("¢");
    expect(decodeCp437(new Uint8Array([0xb0, 0xb1, 0xb2]))).toBe("░▒▓");
    expect(decodeCp437(new Uint8Array([0xe0]))).toBe("α");
    expect(decodeCp437(new Uint8Array([0xfb]))).toBe("√");
    // 0xFF is non-breaking space in CP437.
    expect(decodeCp437(new Uint8Array([0xff]))).toBe("\u00a0");
  });

  it("decodes the full 0x80-0xFF block", () => {
    const bytes = new Uint8Array(128);
    for (let i = 0; i < 128; i++) bytes[i] = 0x80 + i;
    const out = decodeCp437(bytes);
    // No replacement chars should appear — every byte has a defined mapping.
    expect(out.includes("�")).toBe(false);
    expect([...out].length).toBe(128);
  });
});

describe("decodeCp850", () => {
  it("passes ASCII through unchanged", () => {
    expect(decodeCp850(new Uint8Array([0x41, 0x42, 0x43]))).toBe("ABC");
  });

  it("maps the 0x80-0xFF high range correctly", () => {
    expect(decodeCp850(new Uint8Array([0x80]))).toBe("Ç");
    expect(decodeCp850(new Uint8Array([0x9b]))).toBe("ø");
    expect(decodeCp850(new Uint8Array([0xa6, 0xa7]))).toBe("ªº");
    expect(decodeCp850(new Uint8Array([0xff]))).toBe("\u00a0");
  });
});

describe("toUnicodeText", () => {
  it("decodes charset 13 as raw CP850", () => {
    const text = bytesAsString([0x80, 0x9b, 0x9c]); // Ç, ø, £
    expect(toUnicodeText(text, 13)).toBe("Çø£");
  });

  it("decodes charset 0 by remapping selected ASCII characters from the CP850 table", () => {
    // Charset 0 keeps "[" "]" "{" "}" "|" "^" etc. as their own values, identical
    // to charset 13 -> output should match charset 13 for ASCII input.
    const ascii = "Hello [world]";
    expect(toUnicodeText(ascii, 0)).toBe("Hello [world]");
  });

  it("applies remapping for charset 4 (Nordic)", () => {
    // Charset 4 replaces "[" -> "Æ", "]" -> "Å", "{" -> "æ", "}" -> "å",
    // and "|" -> "ø". 0x5C ("\") replaces with "Ø".
    const text = "[\\]{|}";
    expect(toUnicodeText(text, 4)).toBe("ÆØÅæøå");
  });

  it("decodes charset 27 as Windows-1252", () => {
    // 0x80 in Windows-1252 is the Euro sign U+20AC.
    const text = bytesAsString([0x80, 0x99]); // €, ™
    expect(toUnicodeText(text, 27)).toBe("€™");
  });

  it("returns text unchanged for unknown charsets", () => {
    expect(toUnicodeText("hello", 999)).toBe("hello");
  });

  it("round-trips ASCII through CP437 helper", () => {
    const original = "ABCabc123";
    const bytes = new Uint8Array(original.length);
    for (let i = 0; i < original.length; i++) bytes[i] = original.charCodeAt(i);
    expect(decodeCp437(bytes)).toBe(original);
  });
});
