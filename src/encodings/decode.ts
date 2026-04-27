/**
 * Encodings 0-13 are all in fact CP850 encoding.
 * 13 is normal CP850. 0-12 have some characters replaced with other characters
 * (matches the lookup table in zebrash/internal/encodings/decode.go).
 */
const characterSets013: readonly (readonly string[])[] = [
  ["#", "0", "@", "[", "¢", "]", "^", "`", "{", "|", "}"],
  ["#", "0", "@", "⅓", "¢", "⅔", "^", "`", "¼", "½", "¾"],
  ["£", "0", "@", "[", "¢", "]", "^", "`", "{", "|", "}"],
  ["ƒ", "0", "§", "[", "IJ", "]", "^", "`", "{", "ij", "}"],
  ["#", "0", "@", "Æ", "Ø", "Å", "^", "`", "æ", "ø", "å"],
  ["Ü", "0", "É", "Ä", "Ö", "Å", "Ü", "é", "ä", "ö", "å"],
  ["#", "0", "§", "Ä", "Ö", "Ü", "^", "`", "ä", "ö", "ü"],
  ["£", "0", "à", "[", "ç", "]", "^", "`", "é", "|", "ù"],
  ["#", "0", "à", "â", "ç", "ê", "î", "ô", "é", "ù", "è"],
  ["£", "0", "§", "[", "ç", "é", "^", "ù", "à", "ò", "è"],
  ["#", "0", "§", "¡", "Ñ", "¿", "^", "`", "{", "ñ", "ç"],
  ["£", "0", "É", "Ä", "Ö", "Ü", "^", "ä", "ë", "ï", "ö"],
  ["#", "0", "@", "[", "¥", "]", "^", "`", "{", "|", "}"],
  ["#", "0", "@", "[", "\\", "]", "^", "`", "{", "|", "}"],
];

/**
 * ToUnicodeText decodes `text` (interpreted as raw bytes — using each char's low byte)
 * according to the supplied ZPL `^CI` charset number. Mirrors encodings.ToUnicodeText.
 */
export function toUnicodeText(text: string, charset: number): string {
  if (charset >= 0 && charset <= 13) {
    let decoded = decodeCp850(stringToBytes(text));

    if (charset < 13) {
      const search = characterSets013[13] as readonly string[];
      const replace = characterSets013[charset] as readonly string[];
      for (let i = 0; i < search.length; i++) {
        decoded = decoded.replaceAll(search[i] as string, replace[i] as string);
      }
    }

    return decoded;
  }

  if (charset === 27) {
    return new TextDecoder("windows-1252").decode(stringToBytes(text));
  }

  return text;
}

/** Decode raw bytes from IBM CP437 to a JS (UTF-16) string. */
export function decodeCp437(bytes: Uint8Array): string {
  return decodeWithTable(bytes, cp437Table);
}

/** Decode raw bytes from IBM CP850 to a JS (UTF-16) string. */
export function decodeCp850(bytes: Uint8Array): string {
  return decodeWithTable(bytes, cp850Table);
}

function decodeWithTable(bytes: Uint8Array, table: readonly string[]): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i] as number;
    out += b < 0x80 ? String.fromCharCode(b) : (table[b - 0x80] ?? "�");
  }
  return out;
}

// Match Go's behaviour where the input is a byte string. JS strings are UTF-16,
// so we take the low byte of each code unit (covers Latin-1 round-trip from
// hex-decoded bytes that came in via decodeEscapedString or similar).
function stringToBytes(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    out[i] = text.charCodeAt(i) & 0xff;
  }
  return out;
}

// IBM CP437 high range (0x80-0xFF). Standard mapping per the Unicode Consortium
// `CP437.TXT` table.
const cp437Table: readonly string[] = [
  "Ç",
  "ü",
  "é",
  "â",
  "ä",
  "à",
  "å",
  "ç",
  "ê",
  "ë",
  "è",
  "ï",
  "î",
  "ì",
  "Ä",
  "Å",
  "É",
  "æ",
  "Æ",
  "ô",
  "ö",
  "ò",
  "û",
  "ù",
  "ÿ",
  "Ö",
  "Ü",
  "¢",
  "£",
  "¥",
  "₧",
  "ƒ",
  "á",
  "í",
  "ó",
  "ú",
  "ñ",
  "Ñ",
  "ª",
  "º",
  "¿",
  "⌐",
  "¬",
  "½",
  "¼",
  "¡",
  "«",
  "»",
  "░",
  "▒",
  "▓",
  "│",
  "┤",
  "╡",
  "╢",
  "╖",
  "╕",
  "╣",
  "║",
  "╗",
  "╝",
  "╜",
  "╛",
  "┐",
  "└",
  "┴",
  "┬",
  "├",
  "─",
  "┼",
  "╞",
  "╟",
  "╚",
  "╔",
  "╩",
  "╦",
  "╠",
  "═",
  "╬",
  "╧",
  "╨",
  "╤",
  "╥",
  "╙",
  "╘",
  "╒",
  "╓",
  "╫",
  "╪",
  "┘",
  "┌",
  "█",
  "▄",
  "▌",
  "▐",
  "▀",
  "α",
  "ß",
  "Γ",
  "π",
  "Σ",
  "σ",
  "µ",
  "τ",
  "Φ",
  "Θ",
  "Ω",
  "δ",
  "∞",
  "φ",
  "ε",
  "∩",
  "≡",
  "±",
  "≥",
  "≤",
  "⌠",
  "⌡",
  "÷",
  "≈",
  "°",
  "∙",
  "·",
  "√",
  "ⁿ",
  "²",
  "■",
  " ",
];

// IBM CP850 high range (0x80-0xFF). Standard mapping per the Unicode Consortium
// `CP850.TXT` table.
const cp850Table: readonly string[] = [
  "Ç",
  "ü",
  "é",
  "â",
  "ä",
  "à",
  "å",
  "ç",
  "ê",
  "ë",
  "è",
  "ï",
  "î",
  "ì",
  "Ä",
  "Å",
  "É",
  "æ",
  "Æ",
  "ô",
  "ö",
  "ò",
  "û",
  "ù",
  "ÿ",
  "Ö",
  "Ü",
  "ø",
  "£",
  "Ø",
  "×",
  "ƒ",
  "á",
  "í",
  "ó",
  "ú",
  "ñ",
  "Ñ",
  "ª",
  "º",
  "¿",
  "®",
  "¬",
  "½",
  "¼",
  "¡",
  "«",
  "»",
  "░",
  "▒",
  "▓",
  "│",
  "┤",
  "Á",
  "Â",
  "À",
  "©",
  "╣",
  "║",
  "╗",
  "╝",
  "¢",
  "¥",
  "┐",
  "└",
  "┴",
  "┬",
  "├",
  "─",
  "┼",
  "ã",
  "Ã",
  "╚",
  "╔",
  "╩",
  "╦",
  "╠",
  "═",
  "╬",
  "¤",
  "ð",
  "Ð",
  "Ê",
  "Ë",
  "È",
  "ı",
  "Í",
  "Î",
  "Ï",
  "┘",
  "┌",
  "█",
  "▄",
  "¦",
  "Ì",
  "▀",
  "Ó",
  "ß",
  "Ô",
  "Ò",
  "õ",
  "Õ",
  "µ",
  "þ",
  "Þ",
  "Ú",
  "Û",
  "Ù",
  "ý",
  "Ý",
  "¯",
  "´",
  "­",
  "±",
  "‗",
  "¾",
  "¶",
  "§",
  "÷",
  "¸",
  "°",
  "¨",
  "·",
  "¹",
  "³",
  "²",
  "■",
  " ",
];
