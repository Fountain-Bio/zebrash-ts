import type { VirtualPrinter } from "../printers/index.js";

import { type FieldBlock, TextAlignment } from "../elements/index.js";
import {
  type CommandParser,
  parseStrictInt,
  splitCommand,
  toTextAlignment,
} from "./command_parser.js";

export function newFieldBlockParser(): CommandParser {
  const code = "^FB";

  return {
    commandCode: code,
    parse: (command: string, printer: VirtualPrinter) => {
      const block: FieldBlock = {
        _kind: "FieldBlock",
        maxWidth: 0,
        maxLines: 1,
        lineSpacing: 0,
        alignment: TextAlignment.Left,
        hangingIndent: 0,
      };

      const parts = splitCommand(command, code, 0);

      if (parts.length > 0) {
        const r = parseStrictInt(parts[0] ?? "");
        if (r.ok) {
          block.maxWidth = r.value;
        }
      }

      if (parts.length > 1) {
        const r = parseStrictInt(parts[1] ?? "");
        if (r.ok) {
          block.maxLines = r.value;
        }
      }

      if (parts.length > 2) {
        const r = parseStrictInt(parts[2] ?? "");
        if (r.ok) {
          block.lineSpacing = r.value;
        }
      }

      if (parts.length > 3 && (parts[3]?.length ?? 0) > 0) {
        block.alignment = toTextAlignment((parts[3] ?? "").charAt(0));
      }

      if (parts.length > 4) {
        const r = parseStrictInt(parts[4] ?? "");
        if (r.ok) {
          block.hangingIndent = r.value;
        }
      }

      printer.nextElementFieldElement = block;

      return null;
    },
  };
}
