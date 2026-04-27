import { type FontInfo, newFontInfo } from "../elements/index.js";
import type { VirtualPrinter } from "../printers/index.js";
import {
  type CommandParser,
  parseStrictInt,
  splitCommand,
  toValidFontName,
} from "./command_parser.js";

export function newChangeDefaultFontParser(): CommandParser {
  const code = "^CF";

  return {
    commandCode: code,
    parse: (command: string, printer: VirtualPrinter) => {
      const fontName = printer.defaultFont.name;
      const aliasPath = printer.storedFontAliases.get(fontName);
      const customFont = aliasPath !== undefined ? printer.storedFonts.get(aliasPath) : undefined;

      const font: FontInfo = newFontInfo({
        name: fontName,
        orientation: printer.defaultOrientation,
        customFont: customFont ?? null,
      });

      const parts = splitCommand(command, code, 0);
      if (parts.length > 0) {
        font.name = toValidFontName(parts[0] ?? "");
      }

      // Match Go's `v, _ := strconv.Atoi(...)`: a parse failure leaves the
      // freshly-zeroed field at zero, so we only assign on success.
      if (parts.length > 1) {
        const r = parseStrictInt((parts[1] ?? "").trim());
        if (r.ok) {
          font.height = r.value;
        }
      }

      if (parts.length > 2) {
        const r = parseStrictInt((parts[2] ?? "").trim());
        if (r.ok) {
          font.width = r.value;
        }
      }

      printer.defaultFont = font;
      return null;
    },
  };
}
