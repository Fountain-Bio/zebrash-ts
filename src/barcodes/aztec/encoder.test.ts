import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import type { AztecCode } from "./azteccode.js";

import { BitList } from "../utils/bitlist.js";
import { encode, generateModeMessage, stuffBits } from "./encoder.js";
import { highlevelEncode } from "./highlevel.js";

const utf8 = (s: string): Uint8Array => new TextEncoder().encode(s);

function darkModuleCount(code: AztecCode): number {
  let count = 0;
  for (let x = 0; x < code.size; x++) {
    for (let y = 0; y < code.size; y++) {
      if (code.getModule(x, y)) count++;
    }
  }
  return count;
}

describe("Aztec encoder", () => {
  it("encodes short ASCII into a compact symbol", () => {
    const code = encode(utf8("HELLO"));
    // Smallest compact symbol is 11x11 (1 layer, base 11 + 4*1 = 15 actually
    // — 1 layer compact = 11 + 4 = 15). Either way the size must be in the
    // valid compact-aztec range (11..27) and odd.
    expect(code.size).toBeGreaterThanOrEqual(15);
    expect(code.size).toBeLessThanOrEqual(27);
    expect(code.size % 2).toBe(1);
    // The bullseye + at least some data bits ensure non-trivial dark-module
    // coverage.
    const dark = darkModuleCount(code);
    expect(dark).toBeGreaterThan(20);
  });

  it("encodes numeric content", () => {
    const code = encode(utf8("1234567890"));
    expect(code.size).toBeGreaterThan(0);
    expect(darkModuleCount(code)).toBeGreaterThan(20);
  });

  it("encodes binary-shifty content", () => {
    // Mix of upper, lower, digit, and punctuation forces the high-level
    // encoder to balance latches and binary-shifts.
    const code = encode(utf8("Part:123;Warehouse:BYZA;Position:12-12-1"));
    expect(code.size).toBeGreaterThan(0);
    expect(darkModuleCount(code)).toBeGreaterThan(50);
  });

  it("respects user-specified compact layers", () => {
    // -1 = compact, 1 layer = 15x15 matrix.
    const code = encode(utf8("HI"), { userSpecifiedLayers: -1 });
    expect(code.size).toBe(15);
  });

  it("rejects content that is too large for the chosen layer", () => {
    expect(() => encode(utf8("A".repeat(2000)), { userSpecifiedLayers: -1 })).toThrowError(
      /data too large/,
    );
  });

  it("encodes a fixture payload from aztec_ec.zpl without error", () => {
    const fixture = fileURLToPath(new URL("../../../test/fixtures/aztec_ec.zpl", import.meta.url));
    const text = readFileSync(fixture, "utf8");
    // The ^FD payload; multiple identical fields exist but they all carry
    // the same content, so any one suffices.
    const match = text.match(/\^FD([^^]+)\^FS/);
    expect(match).not.toBeNull();
    const payload = match?.[1] ?? "";
    expect(payload.length).toBeGreaterThan(0);
    const code = encode(utf8(payload));
    expect(code.size).toBeGreaterThan(0);
    expect(darkModuleCount(code)).toBeGreaterThan(50);
  });
});

describe("Aztec building blocks", () => {
  it("highlevelEncode returns at least the data length in bits", () => {
    const data = utf8("ABC123");
    const bits = highlevelEncode(data);
    // 6 chars at >= 4 bits each; expected to be considerably more once
    // mode-switches are accounted for, but never less than 4 * length.
    expect(bits.len()).toBeGreaterThanOrEqual(4 * data.length);
  });

  it("stuffBits avoids all-zero and all-one words", () => {
    // Build an input where the next 6-bit window is all zero.
    const input = new BitList();
    for (let i = 0; i < 6; i++) input.addBit(false);
    const stuffed = stuffBits(input, 6);
    // The stuffed word must not be 000000; the LSB is forced to 1.
    let word = 0;
    for (let i = 0; i < 6; i++) {
      if (stuffed.getBit(i)) word |= 1 << (5 - i);
    }
    expect(word).not.toBe(0);
  });

  it("generateModeMessage produces 28-bit compact / 40-bit full messages", () => {
    const compact = generateModeMessage(true, 1, 4);
    expect(compact.len()).toBe(28);
    const full = generateModeMessage(false, 1, 4);
    expect(full.len()).toBe(40);
  });
});
