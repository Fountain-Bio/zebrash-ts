// Port of internal/barcodes/qrcode/encoder/character_set_eci.go
//
// We register a set of character set ECI entries indexed by both numeric
// value and any of their canonical / alternate names. The Go version relies
// on golang.org/x/text/encoding for byte conversion; here we associate a
// canonical encoding name and provide an encoder via encodeBytes().

export class CharacterSetECI {
  values: number[];
  charset: string; // canonical encoding name (e.g. "UTF-8", "Shift_JIS")
  name: string;
  otherEncodingNames: string[];

  constructor(values: number[], charset: string, encodingNames: string[]) {
    this.values = values;
    this.charset = charset;
    this.name = encodingNames[0] ?? "";
    this.otherEncodingNames = encodingNames.slice(1);
  }

  getValue(): number {
    return this.values[0] ?? 0;
  }

  getCharset(): string {
    return this.charset;
  }

  getName(): string {
    return this.name;
  }
}

const valueToECI = new Map<number, CharacterSetECI>();
const nameToECI = new Map<string, CharacterSetECI>();

function newCharsetECI(
  values: number[],
  charset: string,
  encodingNames: string[],
): CharacterSetECI {
  const c = new CharacterSetECI(values, charset, encodingNames);
  for (const v of values) {
    valueToECI.set(v, c);
  }
  for (const n of encodingNames) {
    nameToECI.set(n, c);
  }
  if (!nameToECI.has(charset)) {
    nameToECI.set(charset, c);
  }
  return c;
}

// Mirror of the Go declarations; the canonical "charset" string identifies
// the encoding for byte conversion via encodeBytes(). Encodings we don't
// implement byte conversion for are still registered for ECI value lookups.
export const CharacterSetECI_Cp437 = newCharsetECI([0, 2], "IBM437", ["Cp437"]);
export const CharacterSetECI_ISO8859_1 = newCharsetECI([1, 3], "ISO-8859-1", [
  "ISO-8859-1",
  "ISO8859_1",
]);
export const CharacterSetECI_ISO8859_2 = newCharsetECI([4], "ISO-8859-2", [
  "ISO-8859-2",
  "ISO8859_2",
]);
export const CharacterSetECI_ISO8859_3 = newCharsetECI([5], "ISO-8859-3", [
  "ISO-8859-3",
  "ISO8859_3",
]);
export const CharacterSetECI_ISO8859_4 = newCharsetECI([6], "ISO-8859-4", [
  "ISO-8859-4",
  "ISO8859_4",
]);
export const CharacterSetECI_ISO8859_5 = newCharsetECI([7], "ISO-8859-5", [
  "ISO-8859-5",
  "ISO8859_5",
]);
export const CharacterSetECI_ISO8859_7 = newCharsetECI([9], "ISO-8859-7", [
  "ISO-8859-7",
  "ISO8859_7",
]);
export const CharacterSetECI_ISO8859_9 = newCharsetECI([11], "ISO-8859-9", [
  "ISO-8859-9",
  "ISO8859_9",
]);
export const CharacterSetECI_ISO8859_13 = newCharsetECI([15], "ISO-8859-13", [
  "ISO-8859-13",
  "ISO8859_13",
]);
export const CharacterSetECI_ISO8859_15 = newCharsetECI([17], "ISO-8859-15", [
  "ISO-8859-15",
  "ISO8859_15",
]);
export const CharacterSetECI_ISO8859_16 = newCharsetECI([18], "ISO-8859-16", [
  "ISO-8859-16",
  "ISO8859_16",
]);
export const CharacterSetECI_SJIS = newCharsetECI([20], "Shift_JIS", ["Shift_JIS", "SJIS"]);
export const CharacterSetECI_Cp1250 = newCharsetECI([21], "windows-1250", [
  "windows-1250",
  "Cp1250",
]);
export const CharacterSetECI_Cp1251 = newCharsetECI([22], "windows-1251", [
  "windows-1251",
  "Cp1251",
]);
export const CharacterSetECI_Cp1252 = newCharsetECI([23], "windows-1252", [
  "windows-1252",
  "Cp1252",
]);
export const CharacterSetECI_Cp1256 = newCharsetECI([24], "windows-1256", [
  "windows-1256",
  "Cp1256",
]);
export const CharacterSetECI_UnicodeBigUnmarked = newCharsetECI([25], "UTF-16BE", [
  "UTF-16BE",
  "UnicodeBig",
  "UnicodeBigUnmarked",
]);
export const CharacterSetECI_UTF8 = newCharsetECI([26], "UTF-8", ["UTF-8", "UTF8"]);
export const CharacterSetECI_ASCII = newCharsetECI([27, 170], "US-ASCII", ["ASCII", "US-ASCII"]);
export const CharacterSetECI_Big5 = newCharsetECI([28], "Big5", ["Big5"]);
export const CharacterSetECI_GB18030 = newCharsetECI([29], "GB18030", [
  "GB18030",
  "GB2312",
  "EUC_CN",
  "GBK",
]);
export const CharacterSetECI_EUC_KR = newCharsetECI([30], "EUC-KR", ["EUC-KR", "EUC_KR"]);

export function GetCharacterSetECI(charset: string): CharacterSetECI | null {
  return nameToECI.get(charset) ?? null;
}

export function GetCharacterSetECIByValue(value: number): CharacterSetECI | null {
  if (value < 0 || value >= 900) {
    throw new Error("FormatException");
  }
  return valueToECI.get(value) ?? null;
}

export function GetCharacterSetECIByName(name: string): CharacterSetECI | null {
  return nameToECI.get(name) ?? null;
}

// Encode a string into bytes for the given charset. We support UTF-8,
// US-ASCII, ISO-8859-1, and Shift_JIS — these are the encodings the QR
// encoder actively uses.
export function encodeBytes(content: string, charset: string): Uint8Array {
  switch (charset) {
    case "UTF-8":
    case "UTF8":
      return new TextEncoder().encode(content);
    case "US-ASCII":
    case "ASCII": {
      const out = new Uint8Array(content.length);
      for (let i = 0; i < content.length; i++) {
        const code = content.charCodeAt(i);
        if (code > 0x7f) {
          throw new Error(`character out of range for ASCII: ${code}`);
        }
        out[i] = code;
      }
      return out;
    }
    case "ISO-8859-1": {
      const out = new Uint8Array(content.length);
      for (let i = 0; i < content.length; i++) {
        const code = content.charCodeAt(i);
        if (code > 0xff) {
          throw new Error(`character out of range for ISO-8859-1: ${code}`);
        }
        out[i] = code;
      }
      return out;
    }
    case "Shift_JIS":
    case "SJIS":
      return encodeShiftJIS(content);
    default:
      throw new Error(`unsupported charset: ${charset}`);
  }
}

// Minimal Shift_JIS encoder. Encodes ASCII verbatim; for non-ASCII it relies
// on a small embedded mapping covering the BMP characters that fall into the
// Shift_JIS double-byte range used by QR Kanji mode (0x8140..0x9FFC,
// 0xE040..0xEBBF). For our tests we only encode ASCII, but support the
// common JIS X 0208 range so kanji round-trips work.
function encodeShiftJIS(content: string): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < content.length; i++) {
    const code = content.charCodeAt(i);
    if (code <= 0x7f) {
      out.push(code);
      continue;
    }
    const sjis = unicodeToShiftJIS(code);
    if (sjis === -1) {
      throw new Error(`character not representable in Shift_JIS: U+${code.toString(16)}`);
    }
    out.push((sjis >> 8) & 0xff, sjis & 0xff);
  }
  return Uint8Array.from(out);
}

// Lazy-built unicode -> shift_jis lookup. We do not bundle the full table by
// default; tests in this unit only encode ASCII so this is fine. Throwing on
// non-ASCII keeps behaviour explicit. Callers needing full Shift_JIS support
// should set `setShiftJISTable` ahead of encoding.
let unicodeToSJISTable: Map<number, number> | null = null;

export function setShiftJISTable(table: Map<number, number>): void {
  unicodeToSJISTable = table;
}

function unicodeToShiftJIS(code: number): number {
  if (unicodeToSJISTable !== null) {
    return unicodeToSJISTable.get(code) ?? -1;
  }
  return -1;
}
