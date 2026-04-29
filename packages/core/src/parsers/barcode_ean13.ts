import type { BarcodeEan13 } from "../elements/index.js";
import type { VirtualPrinter } from "../printers/virtual.js";

import {
  type CommandParser,
  parseFloatTrimmed,
  splitCommand,
  toBoolField,
  toFieldOrientation,
} from "./command_parser.js";

export function newBarcodeEan13Parser(): CommandParser {
  const code = "^BE";

  return {
    commandCode: code,
    parse(command: string, printer: VirtualPrinter): unknown {
      const barcode: BarcodeEan13 = {
        _kind: "BarcodeEan13",
        orientation: printer.defaultOrientation,
        height: printer.defaultBarcodeDimensions.height,
        line: true,
        lineAbove: false,
      };

      const parts = splitCommand(command, code, 0);
      if (parts[0] !== undefined && parts[0].length > 0) {
        barcode.orientation = toFieldOrientation(parts[0][0] ?? "");
      }

      if (parts[1] !== undefined) {
        const v = parseFloatTrimmed(parts[1]);
        if (v !== null) barcode.height = Math.ceil(v);
      }

      if (parts[2] !== undefined && parts[2].length > 0) {
        barcode.line = toBoolField(parts[2][0] ?? "");
      }

      if (parts[3] !== undefined && parts[3].length > 0) {
        barcode.lineAbove = toBoolField(parts[3][0] ?? "");
      }

      printer.nextElementFieldElement = barcode;
      return null;
    },
  };
}
