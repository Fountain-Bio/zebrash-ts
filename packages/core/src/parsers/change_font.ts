import type { VirtualPrinter } from "../printers/index.js";

import {
  type CustomFontHandle,
  type FontInfo,
  fontExists,
  newFontInfo,
} from "../elements/index.js";
import {
  type CommandParser,
  parseStrictInt,
  splitCommand,
  toFieldOrientation,
  toValidFontName,
} from "./command_parser.js";

export function newChangeFontParser(): CommandParser {
  const code = "^A";

  return {
    commandCode: code,
    parse: (command: string, printer: VirtualPrinter) => {
      const parts = splitCommand(command, code, 0);
      const head = parts[0] ?? "";

      if (parts.length === 0 || head.length === 0) {
        // Use default font
        printer.nextFont = null;
        return null;
      }

      const fontName = toValidFontName(head);

      let customFont: CustomFontHandle | null = null;
      if (head.charAt(0) !== "@") {
        // Font is referenced by alias
        const aliasPath = printer.storedFontAliases.get(fontName);
        if (aliasPath !== undefined) {
          customFont = printer.storedFonts.get(aliasPath) ?? null;
        }
      } else if (parts.length > 3) {
        // Font is referenced directly by filename
        const fontPath = (parts[3] ?? "").trim();
        customFont = printer.storedFonts.get(fontPath) ?? null;
      }

      let font: FontInfo = newFontInfo({
        name: fontName,
        orientation: printer.defaultFont.orientation,
        customFont: customFont ?? undefined,
      });

      if (!fontExists(font)) {
        font = { ...printer.defaultFont };
      }

      if (head.length > 1) {
        font.orientation = toFieldOrientation(head.charAt(1));
      }

      // Match Go's `v, _ := strconv.Atoi(...)`: a parse failure forces the
      // value to zero, even if `font` came from defaultFont with non-zero size.
      if (parts.length > 1) {
        font.height = parseStrictInt((parts[1] ?? "").trim()).value;
      }

      if (parts.length > 2) {
        font.width = parseStrictInt((parts[2] ?? "").trim()).value;
      }

      printer.nextFont = font;
      return null;
    },
  };
}
