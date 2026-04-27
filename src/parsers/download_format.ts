import {
  StoredFormatDefaultPath,
  type VirtualPrinter,
  ensureExtensions,
  validateDevice,
} from "../printers/index.js";
import { type CommandParser, commandText } from "./command_parser.js";

export function newDownloadFormatParser(): CommandParser {
  const code = "^DF";

  return {
    CommandCode: code,
    Parse(command: string, printer: VirtualPrinter): null {
      const raw = commandText(command, code);
      const path = raw === "" ? StoredFormatDefaultPath : raw;

      const err = validateDevice(path);
      if (err) {
        throw err;
      }

      printer.NextDownloadFormatName = ensureExtensions(path, "ZPL");
      return null;
    },
  };
}
