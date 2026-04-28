import type { VirtualPrinter } from "../printers/index.js";

import { type CommandParser, parseStrictInt, splitCommand } from "./command_parser.js";

export function newLabelHomeParser(): CommandParser {
  const code = "^LH";

  return {
    commandCode: code,
    parse: (command: string, printer: VirtualPrinter) => {
      const pos = { ...printer.labelHomePosition };

      const parts = splitCommand(command, code, 0);

      if (parts.length > 0) {
        const r = parseStrictInt(parts[0] ?? "");
        if (r.ok) {
          pos.x = r.value;
        }
      }

      if (parts.length > 1) {
        const r = parseStrictInt(parts[1] ?? "");
        if (r.ok) {
          pos.y = r.value;
        }
      }

      printer.labelHomePosition = pos;
      return null;
    },
  };
}
