import { type Barcode128, BarcodeMode } from "../elements/index.js";
import type { VirtualPrinter } from "../printers/virtual.js";
import {
  type CommandParser,
  parseFloatTrimmed,
  splitCommand,
  toBoolField,
  toFieldBarcodeMode,
  toFieldOrientation,
} from "./command_parser.js";

export function newBarcode128Parser(): CommandParser {
  const code = "^BC";

  return {
    commandCode: code,
    parse(command: string, printer: VirtualPrinter): unknown {
      const barcode: Barcode128 = {
        orientation: printer.defaultOrientation,
        height: printer.defaultBarcodeDimensions.height,
        line: true,
        lineAbove: false,
        checkDigit: false,
        mode: BarcodeMode.No,
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

      if (parts[4] !== undefined && parts[4].length > 0) {
        barcode.checkDigit = toBoolField(parts[4][0] ?? "");
      }

      if (parts[5] !== undefined && parts[5].length > 0) {
        barcode.mode = toFieldBarcodeMode(parts[5][0] ?? "");
      }

      printer.nextElementFieldElement = barcode;
      return null;
    },
  };
}
