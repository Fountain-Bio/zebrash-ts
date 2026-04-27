// Port of zebrash/internal/barcodes/code128/encoder.go
// Implements the Code 128 symbol set tables and the optimal A/B/C subset
// encoder used by ZPL ^BC barcodes.

/**
 * Bar/space pattern table for every Code 128 symbol value (0-106).
 * Each entry is a list of widths alternating bar, space, bar, space, ...
 * starting with a bar. Index 106 is the stop symbol and uses 7 entries.
 */
export const CODE_PATTERNS: ReadonlyArray<ReadonlyArray<number>> = [
  [2, 1, 2, 2, 2, 2], // 0
  [2, 2, 2, 1, 2, 2],
  [2, 2, 2, 2, 2, 1],
  [1, 2, 1, 2, 2, 3],
  [1, 2, 1, 3, 2, 2],
  [1, 3, 1, 2, 2, 2], // 5
  [1, 2, 2, 2, 1, 3],
  [1, 2, 2, 3, 1, 2],
  [1, 3, 2, 2, 1, 2],
  [2, 2, 1, 2, 1, 3],
  [2, 2, 1, 3, 1, 2], // 10
  [2, 3, 1, 2, 1, 2],
  [1, 1, 2, 2, 3, 2],
  [1, 2, 2, 1, 3, 2],
  [1, 2, 2, 2, 3, 1],
  [1, 1, 3, 2, 2, 2], // 15
  [1, 2, 3, 1, 2, 2],
  [1, 2, 3, 2, 2, 1],
  [2, 2, 3, 2, 1, 1],
  [2, 2, 1, 1, 3, 2],
  [2, 2, 1, 2, 3, 1], // 20
  [2, 1, 3, 2, 1, 2],
  [2, 2, 3, 1, 1, 2],
  [3, 1, 2, 1, 3, 1],
  [3, 1, 1, 2, 2, 2],
  [3, 2, 1, 1, 2, 2], // 25
  [3, 2, 1, 2, 2, 1],
  [3, 1, 2, 2, 1, 2],
  [3, 2, 2, 1, 1, 2],
  [3, 2, 2, 2, 1, 1],
  [2, 1, 2, 1, 2, 3], // 30
  [2, 1, 2, 3, 2, 1],
  [2, 3, 2, 1, 2, 1],
  [1, 1, 1, 3, 2, 3],
  [1, 3, 1, 1, 2, 3],
  [1, 3, 1, 3, 2, 1], // 35
  [1, 1, 2, 3, 1, 3],
  [1, 3, 2, 1, 1, 3],
  [1, 3, 2, 3, 1, 1],
  [2, 1, 1, 3, 1, 3],
  [2, 3, 1, 1, 1, 3], // 40
  [2, 3, 1, 3, 1, 1],
  [1, 1, 2, 1, 3, 3],
  [1, 1, 2, 3, 3, 1],
  [1, 3, 2, 1, 3, 1],
  [1, 1, 3, 1, 2, 3], // 45
  [1, 1, 3, 3, 2, 1],
  [1, 3, 3, 1, 2, 1],
  [3, 1, 3, 1, 2, 1],
  [2, 1, 1, 3, 3, 1],
  [2, 3, 1, 1, 3, 1], // 50
  [2, 1, 3, 1, 1, 3],
  [2, 1, 3, 3, 1, 1],
  [2, 1, 3, 1, 3, 1],
  [3, 1, 1, 1, 2, 3],
  [3, 1, 1, 3, 2, 1], // 55
  [3, 3, 1, 1, 2, 1],
  [3, 1, 2, 1, 1, 3],
  [3, 1, 2, 3, 1, 1],
  [3, 3, 2, 1, 1, 1],
  [3, 1, 4, 1, 1, 1], // 60
  [2, 2, 1, 4, 1, 1],
  [4, 3, 1, 1, 1, 1],
  [1, 1, 1, 2, 2, 4],
  [1, 1, 1, 4, 2, 2],
  [1, 2, 1, 1, 2, 4], // 65
  [1, 2, 1, 4, 2, 1],
  [1, 4, 1, 1, 2, 2],
  [1, 4, 1, 2, 2, 1],
  [1, 1, 2, 2, 1, 4],
  [1, 1, 2, 4, 1, 2], // 70
  [1, 2, 2, 1, 1, 4],
  [1, 2, 2, 4, 1, 1],
  [1, 4, 2, 1, 1, 2],
  [1, 4, 2, 2, 1, 1],
  [2, 4, 1, 2, 1, 1], // 75
  [2, 2, 1, 1, 1, 4],
  [4, 1, 3, 1, 1, 1],
  [2, 4, 1, 1, 1, 2],
  [1, 3, 4, 1, 1, 1],
  [1, 1, 1, 2, 4, 2], // 80
  [1, 2, 1, 1, 4, 2],
  [1, 2, 1, 2, 4, 1],
  [1, 1, 4, 2, 1, 2],
  [1, 2, 4, 1, 1, 2],
  [1, 2, 4, 2, 1, 1], // 85
  [4, 1, 1, 2, 1, 2],
  [4, 2, 1, 1, 1, 2],
  [4, 2, 1, 2, 1, 1],
  [2, 1, 2, 1, 4, 1],
  [2, 1, 4, 1, 2, 1], // 90
  [4, 1, 2, 1, 2, 1],
  [1, 1, 1, 1, 4, 3],
  [1, 1, 1, 3, 4, 1],
  [1, 3, 1, 1, 4, 1],
  [1, 1, 4, 1, 1, 3], // 95
  [1, 1, 4, 3, 1, 1],
  [4, 1, 1, 1, 1, 3],
  [4, 1, 1, 3, 1, 1],
  [1, 1, 3, 1, 4, 1],
  [1, 1, 4, 1, 3, 1], // 100
  [3, 1, 1, 1, 4, 1],
  [4, 1, 1, 1, 3, 1],
  [2, 1, 1, 4, 1, 2],
  [2, 1, 1, 2, 1, 4],
  [2, 1, 1, 2, 3, 2], // 105
  [2, 3, 3, 1, 1, 1, 2],
];

export const CODE_C = 99;
export const CODE_B = 100;
export const CODE_A = 101;

export const FNC_1 = 102;
export const FNC_2 = 97;
export const FNC_3 = 96;
export const FNC_4_A = 101;
export const FNC_4_B = 100;

export const START_A = 103;
export const START_B = 104;
export const START_C = 105;
export const STOP = 106;

export const DEL_B = 95;
export const CIRCUMFLEX = 62;
export const GREATER_THAN = 30;
export const TILDE_B = 94;

// Dummy characters used to specify control characters in input. These mirror
// the Latin-1 placeholders used by the Go implementation.
export const ESCAPE_FNC_1 = "ñ";
export const ESCAPE_FNC_2 = "ò";
export const ESCAPE_FNC_3 = "ó";
export const ESCAPE_FNC_4 = "ô";

// Results of minimal lookahead for code C
export const code128CType_UNCODABLE = 0;
export const code128CType_ONE_DIGIT = 1;
export const code128CType_TWO_DIGITS = 2;
export const code128CType_FNC_1 = 3;
export type Code128CType =
  | typeof code128CType_UNCODABLE
  | typeof code128CType_ONE_DIGIT
  | typeof code128CType_TWO_DIGITS
  | typeof code128CType_FNC_1;

const SPACE = 0x20;
const ZERO = 0x30; // '0'
const NINE = 0x39; // '9'
const BACKTICK = 0x60; // '`'
const ASCII_MAX = 127;

/**
 * Mirrors Go's `code128FindCType`: classify the next position in the input
 * as one digit, two digits, FNC1, or uncodable for code-set C.
 */
export function code128FindCType(value: string, start: number): Code128CType {
  const last = value.length;
  if (start >= last) return code128CType_UNCODABLE;
  const c = value[start]!;
  if (c === ESCAPE_FNC_1) return code128CType_FNC_1;
  const cc = c.charCodeAt(0);
  if (cc < ZERO || cc > NINE) return code128CType_UNCODABLE;
  if (start + 1 >= last) return code128CType_ONE_DIGIT;
  const c2 = value.charCodeAt(start + 1);
  if (c2 < ZERO || c2 > NINE) return code128CType_ONE_DIGIT;
  return code128CType_TWO_DIGITS;
}

/**
 * Mirrors Go's `code128ChooseCode`: greedy lookahead picking the optimal
 * subset (A/B/C) for the next encoded position.
 */
export function code128ChooseCode(value: string, start: number, oldCode: number): number {
  let lookahead = code128FindCType(value, start);
  if (lookahead === code128CType_ONE_DIGIT) {
    if (oldCode === CODE_A) return CODE_A;
    return CODE_B;
  }
  if (lookahead === code128CType_UNCODABLE) {
    if (start < value.length) {
      const c = value[start]!;
      const cc = c.charCodeAt(0);
      if (
        cc < SPACE ||
        (oldCode === CODE_A && (cc < BACKTICK || (c >= ESCAPE_FNC_1 && c <= ESCAPE_FNC_4)))
      ) {
        // can continue in code A, encodes ASCII 0 to 95 or FNC1 to FNC4
        return CODE_A;
      }
    }
    return CODE_B; // no choice
  }
  if (oldCode === CODE_A && lookahead === code128CType_FNC_1) {
    return CODE_A;
  }
  if (oldCode === CODE_C) return CODE_C;
  if (oldCode === CODE_B) {
    if (lookahead === code128CType_FNC_1) {
      return CODE_B; // can continue in code B
    }
    // Seen two consecutive digits, see what follows
    lookahead = code128FindCType(value, start + 2);
    if (lookahead === code128CType_UNCODABLE || lookahead === code128CType_ONE_DIGIT) {
      return CODE_B; // not worth switching now
    }
    if (lookahead === code128CType_FNC_1) {
      // two digits, then FNC_1...
      lookahead = code128FindCType(value, start + 3);
      if (lookahead === code128CType_TWO_DIGITS) return CODE_C;
      return CODE_B;
    }
    // At least 4 consecutive digits; look ahead to decide whether to switch now.
    let index = start + 4;
    for (;;) {
      lookahead = code128FindCType(value, index);
      if (lookahead !== code128CType_TWO_DIGITS) break;
      index += 2;
    }
    if (lookahead === code128CType_ONE_DIGIT) return CODE_B; // odd # of digits
    return CODE_C;
  }
  // oldCode === 0 - choosing the initial code
  if (lookahead === code128CType_FNC_1) {
    lookahead = code128FindCType(value, start + 1);
  }
  if (lookahead === code128CType_TWO_DIGITS) return CODE_C;
  return CODE_B;
}

/** Append a Code 128 symbol's bar/space widths to the result bit list. */
export function appendPattern(target: boolean[], pattern: ReadonlyArray<number>): void {
  let color = true;
  for (const len of pattern) {
    for (let j = 0; j < len; j++) {
      target.push(color);
    }
    color = !color;
  }
}

export interface EncodedCode128 {
  /** Final bar/space bit list (true = bar, false = space). */
  readonly bits: boolean[];
  /** Symbol indices that were encoded, including START, data, checksum, STOP. */
  readonly patternsIdx: number[];
}

/**
 * Encode an array of Code 128 symbol indices into the final bit pattern,
 * including checksum and stop symbol. Mirrors Go's `encode`.
 */
export function encode(patternsIdx: number[]): EncodedCode128 {
  if (patternsIdx.length === 0) {
    throw new Error("no data to encode");
  }
  const result: boolean[] = [];

  let checkSum = patternsIdx[0]!;
  for (let i = 0; i < patternsIdx.length; i++) {
    const idx = patternsIdx[i]!;
    const pattern = CODE_PATTERNS[idx];
    if (!pattern) throw new Error(`invalid pattern index ${idx}`);
    appendPattern(result, pattern);
    checkSum += idx * i;
  }

  checkSum = checkSum % 103;
  appendPattern(result, CODE_PATTERNS[checkSum]!);
  appendPattern(result, CODE_PATTERNS[STOP]!);

  return { bits: result, patternsIdx: [...patternsIdx, checkSum, STOP] };
}

/**
 * Mirrors Go's `EncodeAuto`: pick A/B/C subsets dynamically.
 *
 * Returns the bit pattern for the symbol. Throws on invalid inputs.
 */
export function EncodeAuto(content: string): EncodedCode128 {
  const length = content.length;
  if (length < 1 || length > 80) {
    throw new Error(`contents length should be between 1 and 80 characters, but got ${length}`);
  }

  const forcedCodeSet = -1;

  for (let i = 0; i < length; i++) {
    const c = content[i]!;
    if (c === ESCAPE_FNC_1 || c === ESCAPE_FNC_2 || c === ESCAPE_FNC_3 || c === ESCAPE_FNC_4) {
      // ok
    } else {
      const cc = c.charCodeAt(0);
      if (cc > ASCII_MAX) {
        throw new Error(`bad character in input: ASCII value=${cc}`);
      }
    }
  }

  const patternsIdx: number[] = [];
  let codeSet = 0;
  let position = 0;

  while (position < length) {
    let newCodeSet = forcedCodeSet;
    if (newCodeSet === -1) {
      newCodeSet = code128ChooseCode(content, position, codeSet);
    }

    let patternIndex: number;
    if (newCodeSet === codeSet) {
      const ch = content[position]!;
      if (ch === ESCAPE_FNC_1) {
        patternIndex = FNC_1;
      } else if (ch === ESCAPE_FNC_2) {
        patternIndex = FNC_2;
      } else if (ch === ESCAPE_FNC_3) {
        patternIndex = FNC_3;
      } else if (ch === ESCAPE_FNC_4) {
        patternIndex = codeSet === CODE_A ? FNC_4_A : FNC_4_B;
      } else {
        const cc = ch.charCodeAt(0);
        if (codeSet === CODE_A) {
          patternIndex = cc - SPACE;
          if (patternIndex < 0) {
            // ASCII below space comes after the underscore in the table.
            patternIndex += BACKTICK;
          }
        } else if (codeSet === CODE_B) {
          patternIndex = cc - SPACE;
        } else {
          // CODE_C: encode two digits per symbol.
          if (position + 1 === length) {
            throw new Error("bad number of characters for digit only encoding");
          }
          const a = cc - ZERO;
          const b = content.charCodeAt(position + 1) - ZERO;
          patternIndex = a * 10 + b;
          position++;
        }
      }
      position++;
    } else {
      if (codeSet === 0) {
        // No code set yet -> emit the appropriate START symbol.
        if (newCodeSet === CODE_A) patternIndex = START_A;
        else if (newCodeSet === CODE_B) patternIndex = START_B;
        else patternIndex = START_C;
      } else {
        patternIndex = newCodeSet;
      }
      codeSet = newCodeSet;
    }

    patternsIdx.push(patternIndex);
  }

  return encode(patternsIdx);
}

interface NoModeResult {
  readonly bits: boolean[];
  readonly patternsIdx: number[];
  readonly humanReadable: string;
}

/**
 * Mirrors Go's `EncodeNoMode`: ZPL ^BC mode N, where the input string
 * itself contains escape sequences (>< control codes) selecting the subset.
 *
 * The Go function consumes the input one character at a time using indices
 * starting at i=1 and looking back at content[i-1]; this port preserves the
 * same loop structure for fidelity.
 */
export function EncodeNoMode(content: string): NoModeResult {
  let humanReadable = "";
  const patternsIdx: number[] = [];

  // Force set B by default if no invocation codes were found
  let currSet = CODE_B;
  patternsIdx.push(START_B);

  for (let i = 1; i < content.length; i++) {
    if (content[i - 1] !== ">") {
      // Code 128 subsets A and C are programmed as pairs of digits, 00-99,
      // in the field data string.
      if (currSet === CODE_A || currSet === CODE_C) {
        const digit1 = content.charCodeAt(i) - ZERO;
        // Skip entire pair if second digit is non-numeric.
        if (digit1 >= 10) {
          i++;
          continue;
        }
        let digit0 = content.charCodeAt(i - 1) - ZERO;
        if (digit0 >= 10) digit0 = 0;

        const patternIdx = digit0 * 10 + digit1;
        patternsIdx.push(patternIdx);

        if (currSet === CODE_C) {
          humanReadable += patternIdx.toString().padStart(2, "0");
        } else if (patternIdx < 64) {
          humanReadable += String.fromCharCode(patternIdx + SPACE);
        } else if (patternIdx < 96) {
          humanReadable += String.fromCharCode(patternIdx - 64);
        }

        i++;
        continue;
      }

      // Subset B: each char is encoded directly.
      patternsIdx.push(content.charCodeAt(i - 1) - SPACE);
      humanReadable += content[i - 1]!;

      // Last iteration: also append the trailing character.
      if (i === content.length - 1) {
        patternsIdx.push(content.charCodeAt(i) - SPACE);
        humanReadable += content[i]!;
      }
      continue;
    }

    switch (content[i]) {
      case "<":
        if (currSet !== CODE_C) {
          patternsIdx.push(CIRCUMFLEX);
          humanReadable += String.fromCharCode(CIRCUMFLEX + SPACE);
        }
        break;
      case "0":
        if (currSet !== CODE_C) {
          patternsIdx.push(GREATER_THAN);
          humanReadable += String.fromCharCode(GREATER_THAN + SPACE);
        }
        break;
      case "=":
        if (currSet !== CODE_C) {
          patternsIdx.push(TILDE_B);
          if (currSet === CODE_B) {
            humanReadable += String.fromCharCode(TILDE_B + SPACE);
          }
        }
        break;
      case "1":
        if (currSet !== CODE_C) {
          patternsIdx.push(DEL_B);
        }
        break;
      // Special functions
      case "8":
        patternsIdx.push(FNC_1);
        break;
      case "2":
        if (currSet !== CODE_C) patternsIdx.push(FNC_3);
        break;
      case "3":
        if (currSet !== CODE_C) patternsIdx.push(FNC_2);
        break;
      // Start characters (only valid as the first invocation)
      case "9":
        if (i === 1) {
          currSet = CODE_A;
          patternsIdx[0] = START_A;
        }
        break;
      case ":":
        if (i === 1) {
          currSet = CODE_B;
          patternsIdx[0] = START_B;
        }
        break;
      case ";":
        if (i === 1) {
          currSet = CODE_C;
          patternsIdx[0] = START_C;
        }
        break;
      // Change set invocations
      case "7":
        if (currSet === CODE_A) {
          patternsIdx.push(FNC_4_A);
        } else {
          currSet = CODE_A;
          patternsIdx.push(currSet);
        }
        break;
      case "6":
        if (currSet === CODE_B) {
          patternsIdx.push(FNC_4_B);
        } else {
          currSet = CODE_B;
          patternsIdx.push(currSet);
        }
        break;
      case "5":
        if (currSet !== CODE_C) {
          patternsIdx.push(currSet);
        }
        break;
      default:
        break;
    }

    i++;
  }

  const encoded = encode(patternsIdx);
  return { bits: encoded.bits, patternsIdx: encoded.patternsIdx, humanReadable };
}
