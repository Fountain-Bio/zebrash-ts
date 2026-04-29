import type { VirtualPrinter } from "../printers/index.js";

import { addLabelPositions, newLabelPosition } from "../elements/index.js";
import {
  type CommandParser,
  splitCommand,
  toFieldAlignment,
  toPositiveIntField,
} from "./command_parser.js";

export function newFieldTypesetParser(): CommandParser {
  const code = "^FT";

  return {
    commandCode: code,
    parse: (command: string, printer: VirtualPrinter) => {
      const parts = splitCommand(command, code, 0);

      const pos = newLabelPosition({
        calculateFromBottom: true,
        automaticPosition: true,
      });

      if (parts.length > 0) {
        const r = toPositiveIntField(parts[0] ?? "");
        if (r.ok) {
          pos.x = r.value;
          pos.automaticPosition = false;
        }
      }

      if (parts.length > 1) {
        const r = toPositiveIntField(parts[1] ?? "");
        if (r.ok) {
          pos.y = r.value;
          pos.automaticPosition = false;
        }
      }

      if (parts.length > 2) {
        const r = toFieldAlignment(parts[2] ?? "");
        if (r.ok) {
          printer.nextElementAlignment = r.value;
        }
      }

      printer.nextElementPosition = addLabelPositions(pos, printer.labelHomePosition);

      return null;
    },
  };
}
