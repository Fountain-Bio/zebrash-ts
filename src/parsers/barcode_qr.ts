import type { BarcodeQr } from "../elements/index.js";
import type { VirtualPrinter } from "../printers/virtual.js";
import { type CommandParser, parseInt10, splitCommand } from "./command_parser.js";

// ^BQ orientation, model, magnification, errorCorrection, mask
export function newBarcodeQrParser(): CommandParser {
  const code = "^BQ";

  return {
    commandCode: code,
    parse(command: string, printer: VirtualPrinter): unknown {
      const barcode: BarcodeQr = {
        _kind: "BarcodeQr",
        magnification: 1,
      };

      const parts = splitCommand(command, code, 0);

      if (parts[2] !== undefined) {
        const v = parseInt10(parts[2]);
        if (v !== null) barcode.magnification = Math.min(Math.max(v, 1), 100);
      }

      printer.nextElementFieldElement = barcode;
      return null;
    },
  };
}
