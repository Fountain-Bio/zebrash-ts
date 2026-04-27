import type { RecalledFormat } from "../elements/index.js";
import {
  StoredFormatDefaultPath,
  type VirtualPrinter,
  ensureExtensions,
  validateDevice,
} from "../printers/index.js";
import { type CommandParser, commandText } from "./command_parser.js";

export function newRecallFormatParser(): CommandParser {
  const code = "^XF";

  return {
    CommandCode: code,
    Parse(command: string, printer: VirtualPrinter): RecalledFormat | null {
      const raw = commandText(command, code);
      const path = raw === "" ? StoredFormatDefaultPath : raw;

      const err = validateDevice(path);
      if (err) {
        throw err;
      }

      const stored = printer.StoredFormats.get(ensureExtensions(path, "ZPL"));
      if (stored) {
        return stored.ToRecalledFormat();
      }

      return null;
    },
  };
}
