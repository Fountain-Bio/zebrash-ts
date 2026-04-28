import type { VirtualPrinter } from "../printers/index.js";

import { type CommandParser, parseStrictInt, splitCommand } from "./command_parser.js";

export function newPrintWidthParser(): CommandParser {
  const code = "^PW";

  return {
    commandCode: code,
    parse: (command: string, printer: VirtualPrinter) => {
      const parts = splitCommand(command, code, 0);

      if (parts.length > 0) {
        const r = parseStrictInt(parts[0] ?? "");
        if (r.ok) {
          printer.printWidth = Math.max(r.value, 2);
        }
      }

      return null;
    },
  };
}
