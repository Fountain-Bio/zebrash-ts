// Port of zebrash/internal/parsers/command_parser.go.

import type { VirtualPrinter } from "../printers/index.ts";

import { BarcodeMode, FieldAlignment, FieldOrientation, TextAlignment } from "../elements/index.ts";

/**
 * A handler for a single ZPL command (e.g. `^FO`, `^FD`).
 *
 * Mirrors Go's `parsers.CommandParser` struct: a `commandCode` prefix and a
 * `parse` function that consumes the command text and mutates the printer
 * state, optionally returning a label element.
 */
export interface CommandParser {
  readonly commandCode: string;
  parse(command: string, printer: VirtualPrinter): unknown;
}

/**
 * Returns true if `command` begins with this parser's command code.
 */
export function canParse(parser: CommandParser, command: string): boolean {
  return command.startsWith(parser.commandCode);
}

/**
 * Splits the variable portion of a command into comma-separated fields.
 *
 * The Go version slices `command[len(prefix)+pos:]` and splits on `,`.
 */
export function splitCommand(command: string, prefix: string, pos: number): string[] {
  return command.slice(prefix.length + pos).split(",");
}

/**
 * Returns the substring of `command` after `prefix`.
 */
export function commandText(command: string, prefix: string): string {
  return command.slice(prefix.length);
}

export function toFieldOrientation(orientation: string): FieldOrientation {
  switch (orientation) {
    case "N":
      return FieldOrientation.Normal;
    case "R":
      return FieldOrientation.Rotate90;
    case "I":
      return FieldOrientation.Rotate180;
    case "B":
      return FieldOrientation.Rotate270;
    default:
      return FieldOrientation.Normal;
  }
}

/**
 * Parses a numeric field alignment value. Returns the alignment and a flag
 * indicating whether the input was a recognized value. Mirrors Go's
 * `(FieldAlignment, bool)` return.
 */
export function toFieldAlignment(alignment: string): {
  value: FieldAlignment;
  ok: boolean;
} {
  // Go uses strconv.Atoi, which only accepts plain base-10 integers.
  const trimmed = alignment.trim();
  if (trimmed.length > 0 && /^[+-]?\d+$/.test(trimmed)) {
    const v = Number.parseInt(trimmed, 10);
    switch (v) {
      case 0:
        return { value: FieldAlignment.Left, ok: true };
      case 1:
        return { value: FieldAlignment.Right, ok: true };
      case 2:
        return { value: FieldAlignment.Auto, ok: true };
      default:
        break;
    }
  }
  return { value: FieldAlignment.Left, ok: false };
}

export function toTextAlignment(alignment: string): TextAlignment {
  switch (alignment) {
    case "L":
      return TextAlignment.Left;
    case "R":
      return TextAlignment.Right;
    case "J":
      return TextAlignment.Justified;
    case "C":
      return TextAlignment.Center;
    default:
      return TextAlignment.Left;
  }
}

export function toFieldBarcodeMode(mode: string): BarcodeMode {
  switch (mode) {
    case "U":
      return BarcodeMode.Ucc;
    case "A":
      return BarcodeMode.Automatic;
    case "D":
      return BarcodeMode.Ean;
    default:
      return BarcodeMode.No;
  }
}

export function toBoolField(value: string): boolean {
  return value === "Y";
}

/**
 * Parses a numeric field as a positive integer (rounded, abs).
 * Mirrors Go's `toPositiveIntField` (which uses ParseFloat then abs+round).
 */
export function toPositiveIntField(value: string): { value: number; ok: boolean } {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return { value: 0, ok: false };
  }
  const v = Number.parseFloat(trimmed);
  if (!Number.isFinite(v)) {
    return { value: 0, ok: false };
  }
  return { value: Math.abs(Math.round(v)), ok: true };
}

/**
 * Strict integer parser used by unit-7 parsers. Returns {value, ok}.
 * Mirrors Go's `strconv.Atoi`: only base-10, no whitespace, optional minus.
 */
export function parseStrictInt(value: string): { value: number; ok: boolean } {
  if (!/^-?\d+$/.test(value)) {
    return { value: 0, ok: false };
  }
  const v = Number.parseInt(value, 10);
  if (!Number.isFinite(v)) {
    return { value: 0, ok: false };
  }
  return { value: v, ok: true };
}

/**
 * Trim-and-parse decimal int, returning `null` on failure. Used by unit-9 barcode
 * parsers. Allows leading `+`/`-` and surrounding whitespace; rejects floats.
 */
export function parseInt10(value: string): number | null {
  const trimmed = value.replace(/^[ \t]+|[ \t]+$/g, "");
  if (!/^[+-]?\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

/**
 * Mirrors `strconv.ParseFloat(strings.Trim(s, " "), 32)`: returns `null` on
 * failure, otherwise the parsed float.
 */
export function parseFloatTrimmed(value: string): number | null {
  const trimmed = value.replace(/^[ \t]+|[ \t]+$/g, "");
  if (trimmed.length === 0) return null;
  if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

/**
 * Splits `s` on `sep` into at most `n` parts (Go's `strings.SplitN` behavior).
 * `n <= 0` returns the whole string in a single-element array.
 */
export function splitN(s: string, sep: string, n: number): string[] {
  if (n <= 0) return [s];
  const parts: string[] = [];
  let rest = s;
  for (let i = 0; i < n - 1; i++) {
    const idx = rest.indexOf(sep);
    if (idx < 0) {
      parts.push(rest);
      return parts;
    }
    parts.push(rest.slice(0, idx));
    rest = rest.slice(idx + sep.length);
  }
  parts.push(rest);
  return parts;
}

/**
 * Normalizes a font name: uppercases, trims, and falls back to `A` when the
 * first character is not alphanumeric. Empty input returns empty string.
 */
export function toValidFontName(value: string): string {
  const upper = value.trim().toUpperCase();
  if (upper.length === 0) {
    return "";
  }
  const name = upper.charAt(0);
  if ((name >= "A" && name <= "Z") || (name >= "0" && name <= "9")) {
    return name;
  }
  return "A";
}
