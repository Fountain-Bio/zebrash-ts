import { type VirtualPrinter, setDefaultOrientation } from "../printers/index.js";
import {
  type CommandParser,
  splitCommand,
  toFieldAlignment,
  toFieldOrientation,
} from "./command_parser.js";

export function newFieldOrientationParser(): CommandParser {
  const code = "^FW";

  return {
    commandCode: code,
    parse: (command: string, printer: VirtualPrinter) => {
      const parts = splitCommand(command, code, 0);

      if (parts.length > 0 && (parts[0]?.length ?? 0) > 0) {
        setDefaultOrientation(printer, toFieldOrientation((parts[0] ?? "").charAt(0)));
      }

      if (parts.length > 1 && (parts[1]?.length ?? 0) > 0) {
        const r = toFieldAlignment(parts[1] ?? "");
        if (r.ok) {
          printer.defaultAlignment = r.value;
        }
      }

      return null;
    },
  };
}
