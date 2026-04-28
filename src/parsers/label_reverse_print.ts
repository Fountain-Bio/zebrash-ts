import type { VirtualPrinter } from "../printers/index.js";

import { type CommandParser, commandText } from "./command_parser.js";

export function newLabelReversePrintParser(): CommandParser {
  const code = "^LR";

  return {
    commandCode: code,
    parse: (command: string, printer: VirtualPrinter) => {
      const text = commandText(command, code);
      printer.labelReverse = text === "Y";
      return null;
    },
  };
}
