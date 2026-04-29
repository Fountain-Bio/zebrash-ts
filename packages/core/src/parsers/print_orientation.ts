import type { VirtualPrinter } from "../printers/index.js";

import { type CommandParser, commandText } from "./command_parser.js";

export function newPrintOrientationParser(): CommandParser {
  const code = "^PO";

  return {
    commandCode: code,
    parse: (command: string, printer: VirtualPrinter) => {
      const text = commandText(command, code);
      printer.labelInverted = text === "I";
      return null;
    },
  };
}
