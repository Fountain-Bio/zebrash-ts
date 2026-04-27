import { Buffer } from "node:buffer";
import { inflateSync } from "node:zlib";

const bInMb = 1024 * 1024;
const maxEmbeddedImageSizeMb = 3 * bInMb;
const maxEmbeddedFontSizeMb = 3 * bInMb;

/**
 * DecodeEscapedString replaces occurrences of `<escapeChar><HH>` (where HH is two hex
 * digits) within `value` with the corresponding byte. Mirrors hex.DecodeEscapedString in Go.
 *
 * The escape sequence is decoded to a single byte and re-emitted as a Latin-1 character
 * to match Go's `string(byteSlice)` behaviour: bytes 0x80-0xFF become the matching
 * Unicode code points (U+0080..U+00FF) rather than being interpreted as UTF-8.
 */
export function decodeEscapedString(value: string, escapeChar: string): string {
  if (escapeChar.length !== 1) {
    throw new Error("escapeChar must be a single character");
  }

  const escaped = escapeRegExp(escapeChar);
  const re = new RegExp(`${escaped}([0-9A-Fa-f]{2})`, "g");

  return value.replace(re, (_match, hex: string) => {
    const byte = Number.parseInt(hex, 16);
    if (Number.isNaN(byte)) {
      // Should be impossible given the regex, but mirror Go's "leave as-is on error".
      return `${escapeChar}${hex}`;
    }
    return String.fromCharCode(byte);
  });
}

/**
 * DecodeFontData decodes embedded font data from `^DU` / `~DU` style ZPL commands.
 */
export function decodeFontData(data: string, totalBytes: number): Buffer {
  return decodeFileData(data, totalBytes, maxEmbeddedFontSizeMb);
}

/**
 * DecodeGraphicFieldData decodes the data argument of a `^GF`/`^DG`/`~DY` graphic-field
 * command. `rowBytes` is the per-row byte count from the command parameters; it is used
 * to pace the run-length expansion logic.
 */
export function decodeGraphicFieldData(data: string, rowBytes: number): Buffer {
  return decodeFileData(data, rowBytes, maxEmbeddedImageSizeMb);
}

const compressCounts: Record<string, number> = {
  G: 1,
  H: 2,
  I: 3,
  J: 4,
  K: 5,
  L: 6,
  M: 7,
  N: 8,
  O: 9,
  P: 10,
  Q: 11,
  R: 12,
  S: 13,
  T: 14,
  U: 15,
  V: 16,
  W: 17,
  X: 18,
  Y: 19,
  g: 20,
  h: 40,
  i: 60,
  j: 80,
  k: 100,
  l: 120,
  m: 140,
  n: 160,
  o: 180,
  p: 200,
  q: 220,
  r: 240,
  s: 260,
  t: 280,
  u: 300,
  v: 320,
  w: 340,
  x: 360,
  y: 380,
  z: 400,
};

function decodeFileData(data: string, rowBytes: number, maxFileSizeMb: number): Buffer {
  if (z64Encoded(data)) {
    return decodeZ64(data);
  }

  const result: string[] = [];
  let resultLen = 0;
  let line = "";
  let prevLine = "";
  let compressCount = 0;
  const rowHex = rowBytes * 2;

  const flushIfRowComplete = (): void => {
    if (line.length >= rowHex) {
      validateEmbeddedFileSize(resultLen, line.length, 0, maxFileSizeMb);
      prevLine = line;
      result.push(prevLine);
      resultLen += prevLine.length;
      line = "";
    }
  };

  for (let i = 0; i < data.length; i++) {
    const char = data[i] as string;

    flushIfRowComplete();

    const cc = compressCounts[char];
    if (cc !== undefined) {
      compressCount += cc;
      continue;
    }

    if (char === ",") {
      const l = rowHex - line.length;
      validateEmbeddedFileSize(resultLen, line.length, l, maxFileSizeMb);
      if (rowHex > line.length) {
        line += "0".repeat(l);
      }
      continue;
    }

    if (char === "!") {
      const l = rowHex - line.length;
      validateEmbeddedFileSize(resultLen, line.length, l, maxFileSizeMb);
      if (rowHex > line.length) {
        line += "1".repeat(l);
      }
      continue;
    }

    if (char === ":") {
      validateEmbeddedFileSize(resultLen, line.length, prevLine.length, maxFileSizeMb);
      line += prevLine;
      continue;
    }

    const l = Math.max(compressCount, 1);
    validateEmbeddedFileSize(resultLen, line.length, l, maxFileSizeMb);
    line += char.repeat(l);
    compressCount = 0;
  }

  if (line.length > 0) {
    validateEmbeddedFileSize(resultLen, line.length, 0, maxFileSizeMb);
    result.push(line);
  }

  const hex = result.join("");
  if (hex.length % 2 !== 0) {
    throw new Error("encoding/hex: odd length hex string");
  }
  if (!/^[0-9A-Fa-f]*$/.test(hex)) {
    throw new Error("encoding/hex: invalid byte");
  }
  return Buffer.from(hex, "hex");
}

function validateEmbeddedFileSize(
  resultLen: number,
  lineLen: number,
  l: number,
  maxFileSizeMb: number,
): void {
  const totalHexL = resultLen + lineLen + l;
  if (totalHexL > 2 * maxFileSizeMb) {
    throw new Error(`embedded file size cannot be greater than ${maxFileSizeMb / bInMb} MB`);
  }
}

const z64Prefix = ":Z64:";

function z64Encoded(value: string): boolean {
  return value.startsWith(z64Prefix);
}

function decodeZ64(value: string): Buffer {
  let trimmed = value.slice(z64Prefix.length);

  const idx = trimmed.lastIndexOf(":");
  if (idx >= 0) {
    trimmed = trimmed.slice(0, idx);
  }

  const dec = Buffer.from(trimmed, "base64");
  return inflateSync(dec);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
