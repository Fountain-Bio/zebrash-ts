import type { Maxicode } from "../elements/index.js";
import type { VirtualPrinter } from "../printers/index.js";
import { type CommandParser, splitCommand } from "./command_parser.js";

export function newMaxicodeParser(): CommandParser {
  const code = "^BD";

  return {
    CommandCode: code,
    Parse(command: string, printer: VirtualPrinter): null {
      const barcode: Maxicode = { Mode: 0 };

      const parts = splitCommand(command, code, 0);
      if (parts.length > 0) {
        const v = Number.parseInt(parts[0] ?? "", 10);
        if (!Number.isNaN(v)) barcode.Mode = v;
      }

      printer.NextElementFieldElement = barcode;
      return null;
    },
  };
}
