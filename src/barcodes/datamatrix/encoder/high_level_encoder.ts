import { newASCIIEncoder } from "./ascii_encoder.js";
import { newBase256Encoder } from "./base256_encoder.js";
import { newC40Encoder } from "./c40_encoder.js";
import { newEdifactEncoder } from "./edifact_encoder.js";
import type { Encoder } from "./encoder.js";
import { newEncoderContext } from "./encoder_context.js";
import type { Options } from "./options.js";
import { newTextEncoder } from "./text_encoder.js";
import { newX12Encoder } from "./x12_encoder.js";

// DataMatrix ECC 200 data encoder following the algorithm described in ISO/IEC 16022:200(E) in annex S.

// Padding character
export const HighLevelEncoder_PAD = 129;
// mode latch to C40 encodation mode
export const HighLevelEncoder_LATCH_TO_C40 = 230;
// mode latch to Base 256 encodation mode
export const HighLevelEncoder_LATCH_TO_BASE256 = 231;
// FNC1 Codeword
export const HighLevelEncoder_FUNC1 = 232;
// Upper Shift
export const HighLevelEncoder_UPPER_SHIFT = 235;
// 05 Macro
export const HighLevelEncoder_MACRO_05 = 236;
// 06 Macro
export const HighLevelEncoder_MACRO_06 = 237;
// mode latch to ANSI X.12 encodation mode
export const HighLevelEncoder_LATCH_TO_ANSIX12 = 238;
// mode latch to Text encodation mode
export const HighLevelEncoder_LATCH_TO_TEXT = 239;
// mode latch to EDIFACT encodation mode
export const HighLevelEncoder_LATCH_TO_EDIFACT = 240;
// Unlatch from C40 encodation
export const HighLevelEncoder_C40_UNLATCH = 254;
// Unlatch from X12 encodation
export const HighLevelEncoder_X12_UNLATCH = 254;

// 05 Macro header
export const HighLevelEncoder_MACRO_05_HEADER = "[)>\u001E05\u001D";
// 06 Macro header
export const HighLevelEncoder_MACRO_06_HEADER = "[)>\u001E06\u001D";
// Macro trailer
export const HighLevelEncoder_MACRO_TRAILER = "\u001E\u0004";

export const HighLevelEncoder_ASCII_ENCODATION = 0;
export const HighLevelEncoder_C40_ENCODATION = 1;
export const HighLevelEncoder_TEXT_ENCODATION = 2;
export const HighLevelEncoder_X12_ENCODATION = 3;
export const HighLevelEncoder_EDIFACT_ENCODATION = 4;
export const HighLevelEncoder_BASE256_ENCODATION = 5;

const MAX_INT32 = 0x7fffffff;

function randomize253State(codewordPosition: number): number {
  const pseudoRandom = ((149 * codewordPosition) % 253) + 1;
  const tempVariable = HighLevelEncoder_PAD + pseudoRandom;
  if (tempVariable <= 254) {
    return tempVariable & 0xff;
  }
  return (tempVariable - 254) & 0xff;
}

// EncodeHighLevel performs message encoding of a DataMatrix message using the
// algorithm described in annex P of ISO/IEC 16022:2000(E).
export function encodeHighLevel(msg: string, opts: Options): Uint8Array {
  // the codewords 0..255 are encoded as Unicode characters
  const encoders: Encoder[] = [
    newASCIIEncoder(),
    newC40Encoder(),
    newTextEncoder(),
    newX12Encoder(),
    newEdifactEncoder(),
    newBase256Encoder(),
  ];

  const context = newEncoderContext(msg);
  context.setSymbolShape(opts.shape);
  context.setSizeConstraints(opts.minSize, opts.maxSize);

  if (
    msg.startsWith(HighLevelEncoder_MACRO_05_HEADER) &&
    msg.endsWith(HighLevelEncoder_MACRO_TRAILER)
  ) {
    context.writeCodeword(HighLevelEncoder_MACRO_05);
    context.setSkipAtEnd(2);
    context.pos += HighLevelEncoder_MACRO_05_HEADER.length;
  } else if (
    msg.startsWith(HighLevelEncoder_MACRO_06_HEADER) &&
    msg.endsWith(HighLevelEncoder_MACRO_TRAILER)
  ) {
    context.writeCodeword(HighLevelEncoder_MACRO_06);
    context.setSkipAtEnd(2);
    context.pos += HighLevelEncoder_MACRO_06_HEADER.length;
  }

  let encodingMode = HighLevelEncoder_ASCII_ENCODATION; // Default mode

  if (opts.gs1) {
    context.writeCodeword(HighLevelEncoder_FUNC1);
  }

  while (context.hasMoreCharacters()) {
    encoders[encodingMode]!.encode(context);
    if (context.getNewEncoding() >= 0) {
      encodingMode = context.getNewEncoding();
      context.resetEncoderSignal();
    }
  }
  const length = context.getCodewordCount();
  context.updateSymbolInfo();

  const capacity = context.getSymbolInfo().getDataCapacity();
  if (
    length < capacity &&
    encodingMode !== HighLevelEncoder_ASCII_ENCODATION &&
    encodingMode !== HighLevelEncoder_BASE256_ENCODATION &&
    encodingMode !== HighLevelEncoder_EDIFACT_ENCODATION
  ) {
    context.writeCodeword(0xfe); // Unlatch (254)
  }
  // Padding
  const codewords = context.getCodewords();
  if (codewords.length < capacity) {
    codewords.push(HighLevelEncoder_PAD);
  }
  while (codewords.length < capacity) {
    codewords.push(randomize253State(codewords.length + 1));
  }

  return Uint8Array.from(codewords);
}

export function highLevelEncoder_lookAheadTest(
  msg: Uint8Array,
  startpos: number,
  currentMode: number,
): number {
  if (startpos >= msg.length) {
    return currentMode;
  }
  // step J
  const charCounts = new Float64Array(6);
  if (currentMode === HighLevelEncoder_ASCII_ENCODATION) {
    charCounts.set([0, 1, 1, 1, 1, 1.25]);
  } else {
    charCounts.set([1, 2, 2, 2, 2, 2.25]);
    charCounts[currentMode] = 0;
  }

  let charsProcessed = 0;
  for (;;) {
    // step K
    if (startpos + charsProcessed === msg.length) {
      const mins = new Uint8Array(6);
      const intCharCounts = new Int32Array(6);
      const min = findMinimums(charCounts, intCharCounts, MAX_INT32, mins);
      const minCount = getMinimumCount(mins);

      if (intCharCounts[HighLevelEncoder_ASCII_ENCODATION] === min) {
        return HighLevelEncoder_ASCII_ENCODATION;
      }
      if (minCount === 1 && mins[HighLevelEncoder_BASE256_ENCODATION]! > 0) {
        return HighLevelEncoder_BASE256_ENCODATION;
      }
      if (minCount === 1 && mins[HighLevelEncoder_EDIFACT_ENCODATION]! > 0) {
        return HighLevelEncoder_EDIFACT_ENCODATION;
      }
      if (minCount === 1 && mins[HighLevelEncoder_TEXT_ENCODATION]! > 0) {
        return HighLevelEncoder_TEXT_ENCODATION;
      }
      if (minCount === 1 && mins[HighLevelEncoder_X12_ENCODATION]! > 0) {
        return HighLevelEncoder_X12_ENCODATION;
      }
      return HighLevelEncoder_C40_ENCODATION;
    }

    const c = msg[startpos + charsProcessed]!;
    charsProcessed++;

    const ext = highLevelEncoder_isExtendedASCII(c);

    // step L: ASCII cost
    let asciiCost = charCounts[HighLevelEncoder_ASCII_ENCODATION]!;
    if (highLevelEncoder_isDigit(c)) {
      asciiCost += 0.5;
    } else if (ext) {
      asciiCost = Math.ceil(asciiCost) + 2.0;
    } else {
      asciiCost = Math.ceil(asciiCost) + 1;
    }
    charCounts[HighLevelEncoder_ASCII_ENCODATION] = asciiCost;

    // step M: C40 cost
    charCounts[HighLevelEncoder_C40_ENCODATION] =
      charCounts[HighLevelEncoder_C40_ENCODATION]! +
      (isNativeC40(c) ? 2.0 / 3.0 : ext ? 8.0 / 3.0 : 4.0 / 3.0);

    // step N: Text cost
    charCounts[HighLevelEncoder_TEXT_ENCODATION] =
      charCounts[HighLevelEncoder_TEXT_ENCODATION]! +
      (isNativeText(c) ? 2.0 / 3.0 : ext ? 8.0 / 3.0 : 4.0 / 3.0);

    // step O: X12 cost
    charCounts[HighLevelEncoder_X12_ENCODATION] =
      charCounts[HighLevelEncoder_X12_ENCODATION]! +
      (isNativeX12(c) ? 2.0 / 3.0 : ext ? 13.0 / 3.0 : 10.0 / 3.0);

    // step P: EDIFACT cost
    charCounts[HighLevelEncoder_EDIFACT_ENCODATION] =
      charCounts[HighLevelEncoder_EDIFACT_ENCODATION]! +
      (isNativeEDIFACT(c) ? 3.0 / 4.0 : ext ? 17.0 / 4.0 : 13.0 / 4.0);

    // step Q: Base256 cost
    charCounts[HighLevelEncoder_BASE256_ENCODATION] =
      charCounts[HighLevelEncoder_BASE256_ENCODATION]! + (isSpecialB256(c) ? 4.0 : 1);

    // step R
    if (charsProcessed >= 4) {
      const intCharCounts = new Int32Array(6);
      const mins = new Uint8Array(6);
      findMinimums(charCounts, intCharCounts, MAX_INT32, mins);
      const minCount = getMinimumCount(mins);

      const ascii = intCharCounts[HighLevelEncoder_ASCII_ENCODATION]!;
      const base256 = intCharCounts[HighLevelEncoder_BASE256_ENCODATION]!;
      const c40 = intCharCounts[HighLevelEncoder_C40_ENCODATION]!;
      const text = intCharCounts[HighLevelEncoder_TEXT_ENCODATION]!;
      const x12 = intCharCounts[HighLevelEncoder_X12_ENCODATION]!;
      const edifact = intCharCounts[HighLevelEncoder_EDIFACT_ENCODATION]!;

      if (ascii < base256 && ascii < c40 && ascii < text && ascii < x12 && ascii < edifact) {
        return HighLevelEncoder_ASCII_ENCODATION;
      }
      if (
        base256 < ascii ||
        mins[HighLevelEncoder_C40_ENCODATION]! +
          mins[HighLevelEncoder_TEXT_ENCODATION]! +
          mins[HighLevelEncoder_X12_ENCODATION]! +
          mins[HighLevelEncoder_EDIFACT_ENCODATION]! ===
          0
      ) {
        return HighLevelEncoder_BASE256_ENCODATION;
      }
      if (minCount === 1 && mins[HighLevelEncoder_EDIFACT_ENCODATION]! > 0) {
        return HighLevelEncoder_EDIFACT_ENCODATION;
      }
      if (minCount === 1 && mins[HighLevelEncoder_TEXT_ENCODATION]! > 0) {
        return HighLevelEncoder_TEXT_ENCODATION;
      }
      if (minCount === 1 && mins[HighLevelEncoder_X12_ENCODATION]! > 0) {
        return HighLevelEncoder_X12_ENCODATION;
      }
      if (c40 + 1 < ascii && c40 + 1 < base256 && c40 + 1 < edifact && c40 + 1 < text) {
        if (c40 < x12) {
          return HighLevelEncoder_C40_ENCODATION;
        }
        if (c40 === x12) {
          let p = startpos + charsProcessed + 1;
          while (p < msg.length) {
            const tc = msg[p]!;
            if (isX12TermSep(tc)) {
              return HighLevelEncoder_X12_ENCODATION;
            }
            if (!isNativeX12(tc)) {
              break;
            }
            p++;
          }
          return HighLevelEncoder_C40_ENCODATION;
        }
      }
    }
  }
}

function findMinimums(
  charCounts: Float64Array,
  intCharCounts: Int32Array,
  initialMin: number,
  mins: Uint8Array,
): number {
  let min = initialMin;
  mins.fill(0);
  for (let i = 0; i < 6; i++) {
    intCharCounts[i] = Math.ceil(charCounts[i]!);
    const current = intCharCounts[i]!;
    if (min > current) {
      min = current;
      mins.fill(0);
    }
    if (min === current) {
      mins[i] = (mins[i]! + 1) & 0xff;
    }
  }
  return min;
}

function getMinimumCount(mins: Uint8Array): number {
  let minCount = 0;
  for (let i = 0; i < 6; i++) {
    minCount += mins[i]!;
  }
  return minCount;
}

export function highLevelEncoder_isDigit(ch: number): boolean {
  return ch >= 0x30 /* '0' */ && ch <= 0x39 /* '9' */;
}

export function highLevelEncoder_isExtendedASCII(ch: number): boolean {
  return ch >= 128;
}

function isNativeC40(ch: number): boolean {
  return (
    ch === 0x20 /* ' ' */ ||
    (ch >= 0x30 && ch <= 0x39) /* '0'..'9' */ ||
    (ch >= 0x41 && ch <= 0x5a) /* 'A'..'Z' */
  );
}

function isNativeText(ch: number): boolean {
  return ch === 0x20 || (ch >= 0x30 && ch <= 0x39) || (ch >= 0x61 && ch <= 0x7a) /* 'a'..'z' */;
}

function isNativeX12(ch: number): boolean {
  return (
    isX12TermSep(ch) || ch === 0x20 || (ch >= 0x30 && ch <= 0x39) || (ch >= 0x41 && ch <= 0x5a)
  );
}

function isX12TermSep(ch: number): boolean {
  return ch === 0x0d /* '\r' */ || ch === 0x2a /* '*' */ || ch === 0x3e /* '>' */;
}

function isNativeEDIFACT(ch: number): boolean {
  return ch >= 0x20 /* ' ' */ && ch <= 0x5e /* '^' */;
}

function isSpecialB256(_ch: number): boolean {
  return false; // TODO: NOT IMPLEMENTED YET (matches Go upstream)
}

// determineConsecutiveDigitCount determines the number of consecutive characters
// that are encodable using numeric compaction.
export function highLevelEncoder_determineConsecutiveDigitCount(
  msg: Uint8Array,
  startpos: number,
): number {
  const len = msg.length;
  let idx = startpos;
  while (idx < len && highLevelEncoder_isDigit(msg[idx]!)) {
    idx++;
  }
  return idx - startpos;
}
