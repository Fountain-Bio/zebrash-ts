import type { VirtualPrinter } from "../printers/index.js";
import type { CommandParser } from "./command_parser.js";

export function newFieldReversePrintParser(): CommandParser {
  const code = "^FR";

  return {
    commandCode: code,
    parse: (_command: string, printer: VirtualPrinter) => {
      printer.nextElementFieldReverse = true;
      return null;
    },
  };
}
