// Aggregated public surface for all command parsers.
//
// Exports the `CommandParser` interface, all `new*Parser()` factory functions,
// and a `defaultCommandParsers()` helper that returns the canonical list used
// by the top-level `Parser` class.

export type { CommandParser } from "./command_parser.ts";
export {
  canParse,
  commandText,
  parseFloatTrimmed,
  parseInt10,
  parseStrictInt,
  splitCommand,
  splitN,
  toBoolField,
  toFieldAlignment,
  toFieldBarcodeMode,
  toFieldOrientation,
  toPositiveIntField,
  toTextAlignment,
  toValidFontName,
} from "./command_parser.ts";

import type { CommandParser } from "./command_parser.ts";

// Field and label parsers (unit 7).
import { newChangeCharsetParser } from "./change_charset.ts";
import { newChangeDefaultFontParser } from "./change_default_font.ts";
import { newChangeFontParser } from "./change_font.ts";
import { newChangeFontAliasParser } from "./change_font_alias.ts";
import { newFieldBlockParser } from "./field_block.ts";
import { newFieldDataParser } from "./field_data.ts";
import { newFieldNumberParser } from "./field_number.ts";
import { newFieldOrientationParser } from "./field_orientation.ts";
import { newFieldOriginParser } from "./field_origin.ts";
import { newFieldReversePrintParser } from "./field_reverse_print.ts";
import { newFieldSeparatorParser } from "./field_separator.ts";
import { newFieldTypesetParser } from "./field_typeset.ts";
import { newFieldValueParser } from "./field_value.ts";
import { newHexEscapeParser } from "./hex_escape.ts";
import { newLabelHomeParser } from "./label_home.ts";
import { newLabelReversePrintParser } from "./label_reverse_print.ts";
import { newPrintOrientationParser } from "./print_orientation.ts";
import { newPrintWidthParser } from "./print_width.ts";

// Graphic and format parsers (unit 8).
import { graphicAndFormatParsers } from "./graphic_format_parsers.ts";

// Barcode parsers (unit 9).
import { barcodeParsers } from "./barcode_parsers.ts";

/**
 * Returns the full set of command parsers in the order Go's `NewParser`
 * registers them. The order matters because parsers are matched by prefix
 * and the first match wins; longer/more-specific prefixes must come first.
 */
export function defaultCommandParsers(): readonly CommandParser[] {
  return [
    newLabelHomeParser(),
    newLabelReversePrintParser(),
    ...graphicAndFormatParsers,
    newChangeDefaultFontParser(),
    newChangeFontParser(),
    newChangeCharsetParser(),
    newFieldOriginParser(),
    newFieldTypesetParser(),
    newFieldBlockParser(),
    newFieldSeparatorParser(),
    newFieldDataParser(),
    newFieldValueParser(),
    newFieldOrientationParser(),
    newFieldReversePrintParser(),
    newHexEscapeParser(),
    ...barcodeParsers,
    newPrintWidthParser(),
    newFieldNumberParser(),
    newPrintOrientationParser(),
    newChangeFontAliasParser(),
  ];
}
