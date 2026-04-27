import type { GraphicSymbol } from "../elements/index.js";
import type { VirtualPrinter } from "../printers/index.js";
import { type CommandParser, splitCommand, toFieldOrientation } from "./command_parser.js";

export function newGraphicSymbolParser(): CommandParser {
  const code = "^GS";

  return {
    CommandCode: code,
    Parse(command: string, printer: VirtualPrinter): null {
      const symbol: GraphicSymbol = {
        Width: printer.DefaultFont.Width,
        Height: printer.DefaultFont.Height,
        Orientation: printer.DefaultOrientation,
      };

      const parts = splitCommand(command, code, 0);

      if (parts.length > 0 && (parts[0]?.length ?? 0) > 0) {
        symbol.Orientation = toFieldOrientation(parts[0]?.[0] ?? "");
      }

      if (parts.length > 1) {
        const v = Number.parseInt((parts[1] ?? "").trim(), 10);
        if (!Number.isNaN(v)) symbol.Height = v;
      }

      if (parts.length > 2) {
        const v = Number.parseInt((parts[2] ?? "").trim(), 10);
        if (!Number.isNaN(v)) symbol.Width = v;
      }

      printer.NextElementFieldElement = symbol;

      return null;
    },
  };
}
