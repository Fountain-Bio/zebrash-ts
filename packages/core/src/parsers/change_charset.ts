import type { VirtualPrinter } from "../printers/index.js";

import { type CommandParser, parseStrictInt, splitCommand } from "./command_parser.js";

export function newChangeCharsetParser(): CommandParser {
  const code = "^CI";

  return {
    commandCode: code,
    parse: (command: string, printer: VirtualPrinter) => {
      const parts = splitCommand(command, code, 0);

      if (parts.length > 0) {
        const r = parseStrictInt((parts[0] ?? "").trim());
        if (r.ok) {
          printer.currentCharset = r.value;
        }
      }

      return null;
    },
  };
}
