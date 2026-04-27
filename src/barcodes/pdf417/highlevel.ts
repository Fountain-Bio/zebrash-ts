// Ported from internal/barcodes/pdf417/highlevel.go.
// PDF417 high-level encoder: switches between Text, Numeric, and Byte encoding modes
// to produce data codewords from arbitrary input.

import { runeToInt } from "../utils/index.js";

export enum EncodingMode {
  Text = 0,
  Numeric = 1,
  Binary = 2,
}

enum SubMode {
  Upper = 0,
  Lower = 1,
  Mixed = 2,
  Punct = 3,
}

const LATCH_TO_TEXT = 900;
const LATCH_TO_BYTE_PADDED = 901;
const LATCH_TO_NUMERIC = 902;
const LATCH_TO_BYTE = 924;
const SHIFT_TO_BYTE = 913;

const MIN_NUMERIC_COUNT = 13;

// Both maps are indexed by Unicode code point. Values are codeword indexes
// inside the corresponding submode (Mixed or Punct).
const mixedMap = buildLookup([
  48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 38, 13, 9, 44, 58, 35, 45, 46, 36, 47, 43, 37, 42, 61, 94,
  0, 32, 0, 0, 0,
]);

const punctMap = buildLookup([
  59, 60, 62, 64, 91, 92, 93, 95, 96, 126, 33, 13, 9, 44, 58, 10, 45, 46, 36, 47, 34, 124, 42, 40,
  41, 63, 123, 125, 39, 0,
]);

function buildLookup(raw: readonly number[]): Map<number, number> {
  const map = new Map<number, number>();
  raw.forEach((ch, idx) => {
    if (ch > 0) {
      map.set(ch, idx);
    }
  });
  return map;
}

// Convert a JS string to a code point array — equivalent to Go's `[]rune(s)`.
function toRunes(s: string): number[] {
  return Array.from(s, (c) => c.codePointAt(0) ?? 0);
}

function determineConsecutiveDigitCount(data: number[]): number {
  let cnt = 0;
  for (const r of data) {
    if (runeToInt(r) === -1) {
      break;
    }
    cnt++;
  }
  return cnt;
}

function encodeNumeric(digits: number[]): number[] {
  const digitCount = digits.length;
  let chunkCount = Math.floor(digitCount / 44);
  if (digitCount % 44 !== 0) {
    chunkCount++;
  }

  const codeWords: number[] = [];

  for (let i = 0; i < chunkCount; i++) {
    const start = i * 44;
    const end = Math.min(start + 44, digitCount);
    const chunk = digits.slice(start, end);
    const chunkStr = String.fromCodePoint(...chunk);

    let chunkNum: bigint;
    try {
      chunkNum = BigInt(`1${chunkStr}`);
    } catch {
      throw new Error(`Failed converting: ${chunkStr}`);
    }

    const cws: number[] = [];
    while (chunkNum > 0n) {
      cws.unshift(Number(chunkNum % 900n));
      chunkNum = chunkNum / 900n;
    }

    codeWords.push(...cws);
  }

  return codeWords;
}

function isText(ch: number): boolean {
  return (
    ch === 0x09 /* \t */ || ch === 0x0a /* \n */ || ch === 0x0d /* \r */ || (ch >= 32 && ch <= 126)
  );
}

function determineConsecutiveTextCount(msg: number[]): number {
  let result = 0;
  for (let i = 0; i < msg.length; i++) {
    const ch = msg[i] ?? 0;
    const numericCount = determineConsecutiveDigitCount(msg.slice(i));
    if (numericCount >= MIN_NUMERIC_COUNT || (numericCount === 0 && !isText(ch))) {
      break;
    }
    result++;
  }
  return result;
}

interface EncodeTextResult {
  submode: SubMode;
  codewords: number[];
}

function encodeText(text: number[], startSubmode: SubMode): EncodeTextResult {
  let submode = startSubmode;

  const isAlphaUpper = (ch: number): boolean => ch === 0x20 /* ' ' */ || (ch >= 0x41 && ch <= 0x5a);
  const isAlphaLower = (ch: number): boolean => ch === 0x20 /* ' ' */ || (ch >= 0x61 && ch <= 0x7a);
  const isMixed = (ch: number): boolean => mixedMap.has(ch);
  const isPunctuation = (ch: number): boolean => punctMap.has(ch);

  const tmp: number[] = [];
  let idx = 0;
  while (idx < text.length) {
    const ch = text[idx] ?? 0;
    switch (submode) {
      case SubMode.Upper:
        if (isAlphaUpper(ch)) {
          tmp.push(ch === 0x20 ? 26 : ch - 0x41);
        } else if (isAlphaLower(ch)) {
          submode = SubMode.Lower;
          tmp.push(27); // lower latch
          continue;
        } else if (isMixed(ch)) {
          submode = SubMode.Mixed;
          tmp.push(28); // mixed latch
          continue;
        } else {
          tmp.push(29); // punctuation switch
          tmp.push(punctMap.get(ch) ?? 0);
        }
        break;
      case SubMode.Lower:
        if (isAlphaLower(ch)) {
          tmp.push(ch === 0x20 ? 26 : ch - 0x61);
        } else if (isAlphaUpper(ch)) {
          tmp.push(27); // upper switch
          tmp.push(ch - 0x41);
        } else if (isMixed(ch)) {
          submode = SubMode.Mixed;
          tmp.push(28); // mixed latch
          continue;
        } else {
          tmp.push(29); // punctuation switch
          tmp.push(punctMap.get(ch) ?? 0);
        }
        break;
      case SubMode.Mixed:
        if (isMixed(ch)) {
          tmp.push(mixedMap.get(ch) ?? 0);
        } else if (isAlphaUpper(ch)) {
          submode = SubMode.Upper;
          tmp.push(28); // upper latch
          continue;
        } else if (isAlphaLower(ch)) {
          submode = SubMode.Lower;
          tmp.push(27); // lower latch
          continue;
        } else {
          if (idx + 1 < text.length) {
            const next = text[idx + 1] ?? 0;
            if (isPunctuation(next)) {
              submode = SubMode.Punct;
              tmp.push(25); // punctuation latch
              continue;
            }
          }
          tmp.push(29); // punctuation switch
          tmp.push(punctMap.get(ch) ?? 0);
        }
        break;
      default: // SubMode.Punct
        if (isPunctuation(ch)) {
          tmp.push(punctMap.get(ch) ?? 0);
        } else {
          submode = SubMode.Upper;
          tmp.push(29); // upper latch
          continue;
        }
        break;
    }
    idx++;
  }

  let h = 0;
  const result: number[] = [];
  tmp.forEach((val, i) => {
    if (i % 2 !== 0) {
      h = h * 30 + val;
      result.push(h);
    } else {
      h = val;
    }
  });
  if (tmp.length % 2 !== 0) {
    result.push(h * 30 + 29);
  }
  return { submode, codewords: result };
}

function determineConsecutiveBinaryCount(msg: Uint8Array): number {
  let result = 0;
  for (let i = 0; i < msg.length; i++) {
    const tail = bytesToRunes(msg.subarray(i));
    const numericCount = determineConsecutiveDigitCount(tail);
    if (numericCount >= MIN_NUMERIC_COUNT) {
      break;
    }
    const textCount = determineConsecutiveTextCount(tail);
    if (textCount > 5) {
      break;
    }
    result++;
  }
  return result;
}

// Match Go's `[]rune(string(bytes))`: decode bytes as UTF-8 then collect code points.
function bytesToRunes(bytes: Uint8Array): number[] {
  const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  return toRunes(decoded);
}

function encodeBinary(data: Uint8Array, startMode: EncodingMode): number[] {
  const result: number[] = [];
  const count = data.length;

  if (count === 1 && startMode === EncodingMode.Text) {
    result.push(SHIFT_TO_BYTE);
  } else if (count % 6 === 0) {
    result.push(LATCH_TO_BYTE);
  } else {
    result.push(LATCH_TO_BYTE_PADDED);
  }

  let idx = 0;
  // Encode sixpacks
  if (count >= 6) {
    const words = new Array<number>(5);
    while (count - idx >= 6) {
      let t = 0n;
      for (let i = 0; i < 6; i++) {
        t = t << 8n;
        t += BigInt(data[idx + i] ?? 0);
      }
      for (let i = 0; i < 5; i++) {
        words[4 - i] = Number(t % 900n);
        t = t / 900n;
      }
      result.push(...words);
      idx += 6;
    }
  }
  // Encode rest (remaining n<6 bytes if any)
  for (let i = idx; i < count; i++) {
    result.push((data[i] ?? 0) & 0xff);
  }
  return result;
}

// Convert a string to its UTF-8 byte representation (Go's `[]byte(s)`).
function stringToBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

export function highlevelEncode(dataStr: string): number[] {
  let mode: EncodingMode = EncodingMode.Text;
  let textSubMode: SubMode = SubMode.Upper;

  const result: number[] = [];
  let data = stringToBytes(dataStr);

  while (data.length > 0) {
    const runes = bytesToRunes(data);
    const numericCount = determineConsecutiveDigitCount(runes);
    if (numericCount >= MIN_NUMERIC_COUNT || numericCount === data.length) {
      result.push(LATCH_TO_NUMERIC);
      mode = EncodingMode.Numeric;
      textSubMode = SubMode.Upper;
      const numData = encodeNumeric(runes.slice(0, numericCount));
      result.push(...numData);
      data = data.subarray(numericCount);
      continue;
    }

    const textCount = determineConsecutiveTextCount(runes);
    if (textCount >= 5 || textCount === data.length) {
      if (mode !== EncodingMode.Text) {
        result.push(LATCH_TO_TEXT);
        mode = EncodingMode.Text;
        textSubMode = SubMode.Upper;
      }
      const { submode, codewords } = encodeText(runes.slice(0, textCount), textSubMode);
      textSubMode = submode;
      result.push(...codewords);
      data = data.subarray(textCount);
      continue;
    }

    let binaryCount = determineConsecutiveBinaryCount(data);
    if (binaryCount === 0) {
      binaryCount = 1;
    }
    const bytes = data.subarray(0, binaryCount);
    if (bytes.length !== 1 || mode !== EncodingMode.Text) {
      mode = EncodingMode.Binary;
      textSubMode = SubMode.Upper;
    }
    const byteData = encodeBinary(bytes, mode);
    result.push(...byteData);
    data = data.subarray(binaryCount);
  }

  return result;
}
