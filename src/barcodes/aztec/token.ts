import type { BitList } from "../utils/index.js";

/**
 * Encoding tokens form a singly-linked list (newest first) recording the bits
 * to emit for the chosen high-level encoding sequence. Mirrors `token.go`.
 */
export interface Token {
  prev(): Token | null;
  appendTo(bits: BitList, text: Uint8Array): void;
  toString(): string;
}

/** Emits a fixed-width bit value (e.g. mode latch, single character). */
export class SimpleToken implements Token {
  constructor(
    private readonly previous: Token | null,
    private readonly value: number,
    private readonly bitCount: number,
  ) {}

  prev(): Token | null {
    return this.previous;
  }

  appendTo(bits: BitList, _text: Uint8Array): void {
    bits.addBits(this.value, this.bitCount);
  }

  toString(): string {
    const masked = this.value & ((1 << this.bitCount) - 1);
    return `<${masked.toString(2).padStart(this.bitCount, "0")}>`;
  }
}

/**
 * Emits a span of binary-shift bytes (with the appropriate header bits as
 * defined by the Aztec spec for runs of length 1-31, 32-62, and >62).
 */
export class BinaryShiftToken implements Token {
  constructor(
    private readonly previous: Token | null,
    private readonly bShiftStart: number,
    private readonly bShiftByteCnt: number,
  ) {}

  prev(): Token | null {
    return this.previous;
  }

  appendTo(bits: BitList, text: Uint8Array): void {
    const cnt = this.bShiftByteCnt;
    for (let i = 0; i < cnt; i++) {
      // Header before byte 0, and again before byte 31 if the total run is
      // <= 62 (because runs 1..31 use the short header, runs 32..62 use a
      // second short header, runs > 62 use the extended header once).
      if (i === 0 || (i === 31 && cnt <= 62)) {
        bits.addBits(31, 5); // BINARY_SHIFT
        if (cnt > 62) {
          bits.addBits(cnt - 31, 16);
        } else if (i === 0) {
          if (cnt < 31) {
            bits.addBits(cnt, 5);
          } else {
            bits.addBits(31, 5);
          }
        } else {
          bits.addBits(cnt - 31, 5);
        }
      }
      bits.addByte(text[this.bShiftStart + i] ?? 0);
    }
  }

  toString(): string {
    return `<${this.bShiftStart}::${this.bShiftStart + this.bShiftByteCnt - 1}>`;
  }
}

export function newSimpleToken(prev: Token | null, value: number, bitCount: number): Token {
  return new SimpleToken(prev, value, bitCount);
}

export function newShiftToken(prev: Token | null, bShiftStart: number, bShiftCnt: number): Token {
  return new BinaryShiftToken(prev, bShiftStart, bShiftCnt);
}
