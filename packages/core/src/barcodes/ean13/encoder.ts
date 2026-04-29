import { BitList } from "../utils/index.ts";
import { type Ean13, newEan13 } from "./ean13.ts";

interface EncodedNumber {
  leftOdd: boolean[];
  leftEven: boolean[];
  right: boolean[];
  checkSum: boolean[];
}

const T = true;
const F = false;

const encoderTable: Record<string, EncodedNumber> = {
  "0": {
    leftOdd: [F, F, F, T, T, F, T],
    leftEven: [F, T, F, F, T, T, T],
    right: [T, T, T, F, F, T, F],
    checkSum: [F, F, F, F, F, F],
  },
  "1": {
    leftOdd: [F, F, T, T, F, F, T],
    leftEven: [F, T, T, F, F, T, T],
    right: [T, T, F, F, T, T, F],
    checkSum: [F, F, T, F, T, T],
  },
  "2": {
    leftOdd: [F, F, T, F, F, T, T],
    leftEven: [F, F, T, T, F, T, T],
    right: [T, T, F, T, T, F, F],
    checkSum: [F, F, T, T, F, T],
  },
  "3": {
    leftOdd: [F, T, T, T, T, F, T],
    leftEven: [F, T, F, F, F, F, T],
    right: [T, F, F, F, F, T, F],
    checkSum: [F, F, T, T, T, F],
  },
  "4": {
    leftOdd: [F, T, F, F, F, T, T],
    leftEven: [F, F, T, T, T, F, T],
    right: [T, F, T, T, T, F, F],
    checkSum: [F, T, F, F, T, T],
  },
  "5": {
    leftOdd: [F, T, T, F, F, F, T],
    leftEven: [F, T, T, T, F, F, T],
    right: [T, F, F, T, T, T, F],
    checkSum: [F, T, T, F, F, T],
  },
  "6": {
    leftOdd: [F, T, F, T, T, T, T],
    leftEven: [F, F, F, F, T, F, T],
    right: [T, F, T, F, F, F, F],
    checkSum: [F, T, T, T, F, F],
  },
  "7": {
    leftOdd: [F, T, T, T, F, T, T],
    leftEven: [F, F, T, F, F, F, T],
    right: [T, F, F, F, T, F, F],
    checkSum: [F, T, F, T, F, T],
  },
  "8": {
    leftOdd: [F, T, T, F, T, T, T],
    leftEven: [F, F, F, T, F, F, T],
    right: [T, F, F, T, F, F, F],
    checkSum: [F, T, F, T, T, F],
  },
  "9": {
    leftOdd: [F, F, F, T, F, T, T],
    leftEven: [F, F, T, F, T, T, T],
    right: [T, T, T, F, T, F, F],
    checkSum: [F, T, T, F, T, F],
  },
};

/**
 * Calculates the EAN-13 (or EAN-8) check digit for `code`.
 *
 * Mirrors `calcCheckNum` in encoder.go. The `x3` toggle starts `true` for a
 * 7-char input (EAN-8 minus check digit) and `false` otherwise (12 chars for
 * EAN-13). Returns the literal `"B"` for any non-digit input — same sentinel
 * the Go implementation produces.
 */
export function calcCheckNum(code: string): string {
  let x3 = code.length === 7;
  let sum = 0;
  for (let i = 0; i < code.length; i++) {
    const c = code.charCodeAt(i);
    if (c < 0x30 || c > 0x39) {
      return "B";
    }
    let curNum = c - 0x30;
    if (x3) {
      curNum = curNum * 3;
    }
    x3 = !x3;
    sum += curNum;
  }
  return String.fromCharCode(0x30 + ((10 - (sum % 10)) % 10));
}

/**
 * Sanitizes content to a 13-character EAN-13 string with check digit.
 * Mirrors `sanitizeContent` in encoder.go: replaces non-digits with '0',
 * left-pads to 12 chars, truncates oversized input keeping the first
 * character + last 11, and appends the check digit.
 */
export function sanitizeContent(content: string): string {
  let mapped = "";
  for (const ch of content) {
    if (ch >= "0" && ch <= "9") {
      mapped += ch;
    } else {
      mapped += "0";
    }
  }

  if (mapped.length < 12) {
    mapped = "0".repeat(12 - mapped.length) + mapped;
  }
  if (mapped.length > 13) {
    mapped = mapped[0] + mapped.slice(mapped.length - 11);
  }

  return withCheckDigit(mapped.slice(0, 12));
}

/** Appends the EAN check digit to a 12-digit code. */
export function withCheckDigit(content: string): string {
  return content + calcCheckNum(content);
}

/**
 * Encode renders an EAN-13 barcode for `content` at the given `height` and
 * `barWidth`. Returns the rendered barcode plus the (sanitized) content
 * string actually encoded.
 */
export function encode(
  content: string,
  height: number,
  barWidth: number,
): { image: Ean13; content: string } {
  const sanitized = sanitizeContent(content);
  const code = encodeEan13(sanitized);
  if (code === null) {
    throw new Error(`ean13: invalid character in content "${sanitized}"`);
  }
  return { image: newEan13(code, height, barWidth), content: sanitized };
}

/**
 * Encodes a 13-digit EAN-13 string into the barcode bit pattern.
 * Returns null if any character is not in the encoder table.
 */
export function encodeEan13(code: string): BitList | null {
  const result = new BitList();
  result.addBit(true, false, true);

  let firstNum: boolean[] | null = null;
  let cpos = 0;
  for (const r of code) {
    const num = encoderTable[r];
    if (!num) {
      return null;
    }
    if (cpos === 0) {
      firstNum = num.checkSum;
      cpos++;
      continue;
    }

    let data: boolean[];
    if (cpos < 7) {
      // Left side: parity selected by the first digit's checksum pattern.
      const parityBit = firstNum?.[cpos - 1] ?? false;
      data = parityBit ? num.leftEven : num.leftOdd;
    } else {
      data = num.right;
    }

    if (cpos === 7) {
      result.addBit(false, true, false, true, false);
    }
    result.addBit(...data);
    cpos++;
  }
  result.addBit(true, false, true);
  return result;
}
