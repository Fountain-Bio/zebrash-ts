import type { Barcode39 } from "../elements/index.js";
import type { VirtualPrinter } from "../printers/virtual.js";

import {
  type CommandParser,
  parseFloatTrimmed,
  splitCommand,
  toBoolField,
  toFieldOrientation,
} from "./command_parser.js";

export function newBarcode39Parser(): CommandParser {
  const code = "^B3";

  return {
    commandCode: code,
    parse(command: string, printer: VirtualPrinter): unknown {
      const barcode: Barcode39 = {
        _kind: "Barcode39",
        orientation: printer.defaultOrientation,
        height: printer.defaultBarcodeDimensions.height,
        line: true,
        lineAbove: false,
        checkDigit: false,
      };

      const parts = splitCommand(command, code, 0);
      if (parts[0] !== undefined && parts[0].length > 0) {
        barcode.orientation = toFieldOrientation(parts[0][0] ?? "");
      }

      if (parts[1] !== undefined && parts[1].length > 0) {
        barcode.checkDigit = toBoolField(parts[1][0] ?? "");
      }

      if (parts[2] !== undefined) {
        const v = parseFloatTrimmed(parts[2]);
        if (v !== null) barcode.height = Math.ceil(v);
      }

      if (parts[3] !== undefined && parts[3].length > 0) {
        barcode.line = toBoolField(parts[3][0] ?? "");
      }

      if (parts[4] !== undefined && parts[4].length > 0) {
        barcode.lineAbove = toBoolField(parts[4][0] ?? "");
      }

      printer.nextElementFieldElement = barcode;
      return null;
    },
  };
}
