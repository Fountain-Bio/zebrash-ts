import type { VirtualPrinter } from "../printers/index.js";

import { type CommandParser, splitCommand, toValidFontName } from "./command_parser.js";

export function newChangeFontAliasParser(): CommandParser {
  const code = "^CW";

  return {
    commandCode: code,
    parse: (command: string, printer: VirtualPrinter) => {
      const parts = splitCommand(command, code, 0);

      let alias = "";
      if (parts.length > 0) {
        alias = toValidFontName(parts[0] ?? "");
      }

      let path = "";
      if (parts.length > 1) {
        path = parts[1] ?? "";
      }

      if (alias !== "" && path !== "") {
        printer.storedFontAliases.set(alias, path);
      }

      return null;
    },
  };
}
