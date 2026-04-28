import type { BarcodeAztec } from "../elements/index.js";
import type { VirtualPrinter } from "../printers/virtual.js";
import {
  type CommandParser,
  parseInt10,
  splitCommand,
  toFieldOrientation,
} from "./command_parser.js";

export function newBarcodeAztecParser(): CommandParser {
  const code = "^BO";

  return {
    commandCode: code,
    parse(command: string, printer: VirtualPrinter): unknown {
      const barcode: BarcodeAztec = {
        _kind: "BarcodeAztec",
        orientation: printer.defaultOrientation,
        magnification: 0,
        size: 0,
      };

      const parts = splitCommand(command, code, 0);
      if (parts[0] !== undefined && parts[0].length > 0) {
        barcode.orientation = toFieldOrientation(parts[0][0] ?? "");
      }

      if (parts[1] !== undefined) {
        const v = parseInt10(parts[1]);
        if (v !== null) barcode.magnification = v;
      }

      // ECI (parts[2]) is intentionally unimplemented — the Go reference
      // also ignores it (see internal/parsers/barcode_aztec.go), and no
      // current fixture exercises non-default ECI.

      if (parts[3] !== undefined) {
        const v = parseInt10(parts[3]);
        if (v !== null) barcode.size = v;
      }

      printer.nextElementFieldElement = barcode;
      return null;
    },
  };
}
