import { decodeEscapedString } from "../hex/index.js";
import type { VirtualPrinter } from "../printers/index.js";
import { type CommandParser, commandText } from "./command_parser.js";

export function newFieldDataParser(): CommandParser {
  const code = "^FD";

  return {
    commandCode: code,
    parse: (command: string, printer: VirtualPrinter) => {
      let text = commandText(command, code);

      if (printer.nextHexEscapeChar !== 0) {
        text = decodeEscapedString(text, String.fromCharCode(printer.nextHexEscapeChar));
      }

      printer.nextElementFieldData = text;

      return null;
    },
  };
}
