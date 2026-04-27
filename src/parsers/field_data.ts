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
        // TODO(unit-2): hex.decodeEscapedString currently returns the input
        // unchanged. Once unit 2 lands the real decoder this will properly
        // honour the ^FH escape character.
        text = decodeEscapedString(text, printer.nextHexEscapeChar);
      }

      printer.nextElementFieldData = text;

      return null;
    },
  };
}
