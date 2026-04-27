import type { VirtualPrinter } from "../printers/virtual.js";
import {
  type CommandParser,
  parseFloatTrimmed,
  parseInt10,
  splitCommand,
} from "./command_parser.js";

export function newBarcodeFieldDefaultsParser(): CommandParser {
  const code = "^BY";

  return {
    commandCode: code,
    parse(command: string, printer: VirtualPrinter): unknown {
      const parts = splitCommand(command, code, 0);

      if (parts[0] !== undefined) {
        const v = parseInt10(parts[0]);
        if (v !== null) printer.defaultBarcodeDimensions.moduleWidth = v;
      }

      if (parts[1] !== undefined) {
        const v = parseFloatTrimmed(parts[1]);
        if (v !== null) {
          printer.defaultBarcodeDimensions.widthRatio = Math.max(2, Math.min(v, 3));
        }
      }

      if (parts[2] !== undefined) {
        const v = parseInt10(parts[2]);
        if (v !== null) printer.defaultBarcodeDimensions.height = v;
      }

      return null;
    },
  };
}
