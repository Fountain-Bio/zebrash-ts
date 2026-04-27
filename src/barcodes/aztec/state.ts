import { BitList } from "../utils/index.js";
import { type Token, newShiftToken, newSimpleToken } from "./token.js";

/** Aztec high-level encoding modes. The numeric values are also used to
 * index into the latch / shift / character lookup tables. */
export const Mode = {
  Upper: 0,
  Lower: 1,
  Digit: 2,
  Mixed: 3,
  Punct: 4,
} as const;
export type Mode = (typeof Mode)[keyof typeof Mode];

/**
 * Latch table: cost + bit-pattern to switch from one mode to another.
 *
 * `latchTable[from][to]` is encoded as `(numBits << 16) | bitPattern`. The
 * numbers are taken verbatim from the Aztec spec via the Go implementation.
 * `(0)` along the diagonal means "already in this mode".
 */
export const latchTable: ReadonlyArray<ReadonlyArray<number>> = [
  // Upper -> *
  [0, (5 << 16) + 28, (5 << 16) + 30, (5 << 16) + 29, (10 << 16) + (29 << 5) + 30],
  // Lower -> *
  [(9 << 16) + (30 << 4) + 14, 0, (5 << 16) + 30, (5 << 16) + 29, (10 << 16) + (29 << 5) + 30],
  // Digit -> *
  [
    (4 << 16) + 14,
    (9 << 16) + (14 << 5) + 28,
    0,
    (9 << 16) + (14 << 5) + 29,
    (14 << 16) + (14 << 10) + (29 << 5) + 30,
  ],
  // Mixed -> *
  [(5 << 16) + 29, (5 << 16) + 28, (10 << 16) + (29 << 5) + 30, 0, (5 << 16) + 30],
  // Punct -> *
  [
    (5 << 16) + 31,
    (10 << 16) + (31 << 5) + 28,
    (10 << 16) + (31 << 5) + 30,
    (10 << 16) + (31 << 5) + 29,
    0,
  ],
];

/**
 * Shift table. `shiftTable[from][to]` is the bit pattern to temporarily emit
 * a single character in `to`'s mode. `null` means no shift exists.
 */
export const shiftTable: ReadonlyArray<ReadonlyArray<number | null>> = [
  // Upper -> Punct
  [null, null, null, null, 0],
  // Lower -> Upper, Punct
  [28, null, null, null, 0],
  // Digit -> Upper, Punct
  [15, null, null, null, 0],
  // Mixed -> Punct
  [null, null, null, null, 0],
  // Punct: no shifts out
  [null, null, null, null, null],
];

/**
 * `charMap[mode][byte]` is the encoded value of `byte` in `mode`, or 0 if the
 * character is not directly representable in that mode. Built once at module
 * load (mirrors the `init()` function in the Go source).
 *
 * The Mixed and Punct tables list raw code points by index (some entries are
 * 0/unused per the Aztec spec). Upper / Lower / Digit are derived from ranges.
 */
export const charMap: ReadonlyArray<ReadonlyArray<number>> = (() => {
  const map: number[][] = Array.from({ length: 5 }, () => new Array<number>(256).fill(0));

  const upper = map[Mode.Upper]!;
  const lower = map[Mode.Lower]!;
  const digit = map[Mode.Digit]!;
  upper[0x20] = 1;
  lower[0x20] = 1;
  digit[0x20] = 1;
  for (let i = 0; i < 26; i++) {
    upper[0x41 + i] = i + 2; // 'A'..'Z'
    lower[0x61 + i] = i + 2; // 'a'..'z'
  }
  for (let i = 0; i < 10; i++) {
    digit[0x30 + i] = i + 2; // '0'..'9'
  }
  digit[0x2c /* , */] = 12;
  digit[0x2e /* . */] = 13;

  // Mixed: control characters + a handful of punctuation.
  const mixedTable = [
    0, 0x20, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 27, 28, 29, 30, 31, 0x40 /* @ */,
    0x5c /* \ */, 0x5e /* ^ */, 0x5f /* _ */, 0x60 /* ` */, 0x7c /* | */, 0x7e /* ~ */, 127,
  ];
  for (let i = 0; i < mixedTable.length; i++) {
    map[Mode.Mixed]![mixedTable[i]!] = i;
  }

  // Punct: spec-defined sparse table; entries marked 0 are unused slots.
  const punctTable = [
    0, 0x0d /* \r */, 0, 0, 0, 0, 0x21 /* ! */, 0x27 /* ' */, 0x23 /* # */, 0x24 /* $ */,
    0x25 /* % */, 0x26 /* & */, 0x27 /* ' */, 0x28 /* ( */, 0x29 /* ) */, 0x2a /* * */,
    0x2b /* + */, 0x2c /* , */, 0x2d /* - */, 0x2e /* . */, 0x2f /* / */, 0x3a /* : */,
    0x3b /* ; */, 0x3c /* < */, 0x3d /* = */, 0x3e /* > */, 0x3f /* ? */, 0x5b /* [ */,
    0x5d /* ] */, 0x7b /* { */, 0x7d /* } */,
  ];
  for (let i = 0; i < punctTable.length; i++) {
    const v = punctTable[i]!;
    if (v > 0) {
      map[Mode.Punct]![v] = i;
    }
  }

  return map;
})();

export function modeBitCount(mode: Mode): number {
  return mode === Mode.Digit ? 4 : 5;
}

/** Encoding state for the high-level optimizer. Mirrors `state.go`. */
export class State {
  readonly mode: Mode;
  readonly tokens: Token | null;
  readonly bShiftByteCount: number;
  readonly bitCount: number;

  constructor(mode: Mode, tokens: Token | null, bShiftByteCount: number, bitCount: number) {
    this.mode = mode;
    this.tokens = tokens;
    this.bShiftByteCount = bShiftByteCount;
    this.bitCount = bitCount;
  }

  /** Latch to `mode` (paying the latch cost), then append the encoded value. */
  latchAndAppend(mode: Mode, value: number): State {
    let bitCount = this.bitCount;
    let tokens = this.tokens;

    if (mode !== this.mode) {
      const latch = latchTable[this.mode]?.[mode] ?? 0;
      tokens = newSimpleToken(tokens, latch & 0xffff, latch >> 16);
      bitCount += latch >> 16;
    }
    const mb = modeBitCount(mode);
    tokens = newSimpleToken(tokens, value, mb);
    return new State(mode, tokens, 0, bitCount + mb);
  }

  /** Temporary single-char shift to `mode`. Stays in the current mode. */
  shiftAndAppend(mode: Mode, value: number): State {
    let tokens = this.tokens;
    // All shifts use 5-bit values; the shift code itself is encoded in the
    // current mode's bit-width (4 for Digit, otherwise 5).
    const shiftCode = shiftTable[this.mode]?.[mode] ?? 0;
    tokens = newSimpleToken(tokens, shiftCode, modeBitCount(this.mode));
    tokens = newSimpleToken(tokens, value, 5);
    return new State(this.mode, tokens, 0, this.bitCount + modeBitCount(this.mode) + 5);
  }

  /** Output one more character in Binary Shift mode. */
  addBinaryShiftChar(index: number): State {
    let tokens = this.tokens;
    let mode = this.mode;
    let bitCnt = this.bitCount;
    if (this.mode === Mode.Punct || this.mode === Mode.Digit) {
      const latch = latchTable[this.mode]?.[Mode.Upper] ?? 0;
      tokens = newSimpleToken(tokens, latch & 0xffff, latch >> 16);
      bitCnt += latch >> 16;
      mode = Mode.Upper;
    }
    let deltaBitCount = 8;
    if (this.bShiftByteCount === 0 || this.bShiftByteCount === 31) {
      // First byte of run, or transition into the 32..62 range -> extra 10
      // header bits (the 5-bit BINARY_SHIFT + 5-bit count).
      deltaBitCount = 18;
    } else if (this.bShiftByteCount === 62) {
      // Crossing the 62-byte boundary upgrades to the long header.
      deltaBitCount = 9;
    }
    let result = new State(mode, tokens, this.bShiftByteCount + 1, bitCnt + deltaBitCount);
    if (result.bShiftByteCount === 2047 + 31) {
      // Maximum binary-shift run length reached; close it out.
      result = result.endBinaryShift(index + 1);
    }
    return result;
  }

  /** Close out an active binary-shift run by emitting its token. */
  endBinaryShift(index: number): State {
    if (this.bShiftByteCount === 0) {
      return this;
    }
    const tokens = newShiftToken(this.tokens, index - this.bShiftByteCount, this.bShiftByteCount);
    return new State(this.mode, tokens, 0, this.bitCount);
  }

  /**
   * Returns true when this state dominates `other`: it has at least the same
   * number of remaining bits available even after paying the cost to align to
   * `other`'s mode (and to enter binary shift if `other` is mid-shift).
   */
  isBetterThanOrEqualTo(other: State): boolean {
    let mySize = this.bitCount + ((latchTable[this.mode]?.[other.mode] ?? 0) >> 16);
    if (
      other.bShiftByteCount > 0 &&
      (this.bShiftByteCount === 0 || this.bShiftByteCount > other.bShiftByteCount)
    ) {
      // We'd need to enter binary shift here, which costs 10 bits.
      mySize += 10;
    }
    return mySize <= other.bitCount;
  }

  /** Walk the token list back-to-front and emit the encoded bit-stream. */
  toBitList(text: Uint8Array): BitList {
    const collected: Token[] = [];
    const closed = this.endBinaryShift(text.length);
    for (let t: Token | null = closed.tokens; t !== null; t = t.prev()) {
      collected.push(t);
    }
    const result = new BitList();
    for (let i = collected.length - 1; i >= 0; i--) {
      collected[i]!.appendTo(result, text);
    }
    return result;
  }
}

export const initialState: State = new State(Mode.Upper, null, 0, 0);
