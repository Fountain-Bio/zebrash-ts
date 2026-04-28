import type { VirtualPrinter } from "../printers/index.js";

import { type CommandParser, commandText, parseStrictInt } from "./command_parser.js";

export function newFieldNumberParser(): CommandParser {
  const code = "^FN";

  return {
    commandCode: code,
    parse: (command: string, printer: VirtualPrinter) => {
      const number = commandText(command, code);
      const r = parseStrictInt(number);
      if (r.ok && r.value >= 0) {
        printer.nextElementFieldNumber = r.value;
      }
      return null;
    },
  };
}
