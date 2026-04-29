import { type RecalledFormat, storedFormatToRecalled } from "../elements/index.js";
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
    commandCode: code,
    parse(command: string, printer: VirtualPrinter): RecalledFormat | null {
      const raw = commandText(command, code);
      const path = raw === "" ? StoredFormatDefaultPath : raw;

      validateDevice(path);

      const stored = printer.storedFormats.get(ensureExtensions(path, "ZPL"));
      if (stored) {
        return storedFormatToRecalled(stored);
      }

      return null;
    },
  };
}
