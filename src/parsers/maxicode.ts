import type { Maxicode } from "../elements/index.js";
import type { VirtualPrinter } from "../printers/index.js";

import { type CommandParser, splitCommand } from "./command_parser.js";

export function newMaxicodeParser(): CommandParser {
  const code = "^BD";

  return {
    commandCode: code,
    parse(command: string, printer: VirtualPrinter): null {
      const barcode: Maxicode = { _kind: "Maxicode", mode: 0 };

      const parts = splitCommand(command, code, 0);
      if (parts.length > 0) {
        const v = Number.parseInt(parts[0] ?? "", 10);
        if (!Number.isNaN(v)) barcode.mode = v;
      }

      printer.nextElementFieldElement = barcode;
      return null;
    },
  };
}
