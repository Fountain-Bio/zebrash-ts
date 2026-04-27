// Interleaved 2 of 5 encoder. Mirrors Go `internal/barcodes/twooffive/encoder.go`.

import { BitList, intToRune, runeToInt } from "../utils/index.js";

type Pattern = readonly [boolean, boolean, boolean, boolean, boolean];

const encodingTable: Record<string, Pattern> = {
  "0": [false, false, true, true, false],
  "1": [true, false, false, false, true],
  "2": [false, true, false, false, true],
  "3": [true, true, false, false, false],
  "4": [false, false, true, false, true],
  "5": [true, false, true, false, false],
  "6": [false, true, true, false, false],
  "7": [false, false, false, true, true],
  "8": [true, false, false, true, false],
  "9": [false, true, false, true, false],
};

const startPattern: readonly boolean[] = [true, false, true, false];
const endPattern: readonly boolean[] = [true, true, true, false, true];

// Wide module = 3 narrow modules; narrow = 1.
const wideWidth = 3;
const narrowWidth = 1;

export interface InterleavedResult {
  /** Encoded bit pattern (start + interleaved digit pairs + end). */
  bits: BitList;
  /** Final content used for encoding (after optional check-digit and zero-pad). */
  content: string;
}

/**
 * Encodes `content` as Interleaved 2 of 5. Equivalent to the Go
 * `twooffive.EncodeInterleaved` minus image rendering, which lives in unit 10.
 */
export function encodeInterleaved(content: string, checkDigit: boolean): InterleavedResult {
  let encoded = checkDigit ? addCheckDigit(content) : content;

  // Interleaved 2 of 5 requires an even number of digits; pad with a leading zero.
  if (encoded.length % 2 === 1) {
    encoded = `0${encoded}`;
  }

  const bits = new BitList();
  bits.addBit(...startPattern);

  for (let p = 0; p < encoded.length; p += 2) {
    const a = patternFor(encoded, p);
    const b = patternFor(encoded, p + 1);
    for (let i = 0; i < a.length; i++) {
      // Each pair interleaves bars (from `a`) with spaces (from `b`).
      addRun(bits, true, a[i] ? wideWidth : narrowWidth);
      addRun(bits, false, b[i] ? wideWidth : narrowWidth);
    }
  }

  bits.addBit(...endPattern);

  return { bits, content: encoded };
}

function patternFor(content: string, index: number): Pattern {
  const ch = content[index];
  const pattern = ch !== undefined ? encodingTable[ch] : undefined;
  if (!pattern) {
    throw new Error(`can not encode ${JSON.stringify(content)}`);
  }
  return pattern;
}

function addRun(bits: BitList, bit: boolean, count: number): void {
  for (let n = 0; n < count; n++) {
    bits.addBit(bit);
  }
}

function addCheckDigit(content: string): string {
  let even = true;
  let sum = 0;

  for (const ch of content) {
    if (!encodingTable[ch]) {
      throw new Error(`can not encode ${JSON.stringify(content)}`);
    }
    const value = runeToInt(ch);
    sum += even ? value * 3 : value;
    even = !even;
  }

  let remainder = sum % 10;
  if (remainder > 0) {
    remainder = 10 - remainder;
  }

  return content + intToRune(remainder);
}
