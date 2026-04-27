import type { VirtualPrinter } from "../printers/index.js";
import { type CommandParser, commandText } from "./command_parser.js";

export function newFieldValueParser(): CommandParser {
  const code = "^FV";

  return {
    commandCode: code,
    parse: (command: string, printer: VirtualPrinter) => {
      printer.nextElementFieldData = commandText(command, code);
      return null;
    },
  };
}
