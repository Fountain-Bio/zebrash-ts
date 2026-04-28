import type { VirtualPrinter } from "../printers/index.js";

import { type CommandParser, commandText } from "./command_parser.js";

export function newHexEscapeParser(): CommandParser {
  const code = "^FH";

  return {
    commandCode: code,
    parse: (command: string, printer: VirtualPrinter) => {
      const text = commandText(command, code);

      // Default escape character is `_` (0x5F).
      let char = "_".charCodeAt(0);
      if (text.length > 0) {
        char = text.charCodeAt(0);
      }

      printer.nextHexEscapeChar = char;
      return null;
    },
  };
}
