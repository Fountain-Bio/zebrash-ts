import type { BarcodeDatamatrix, DatamatrixRatio } from "../elements/index.js";
import type { VirtualPrinter } from "../printers/virtual.js";
import {
  type CommandParser,
  parseFloatTrimmed,
  parseInt10,
  splitCommand,
  toFieldOrientation,
} from "./command_parser.js";

export function newBarcodeDatamatrixParser(): CommandParser {
  const code = "^BX";
  const escapeTilde = "~".charCodeAt(0);

  return {
    commandCode: code,
    parse(command: string, printer: VirtualPrinter): unknown {
      const barcode: BarcodeDatamatrix = {
        _kind: "BarcodeDatamatrix",
        orientation: printer.defaultOrientation,
        height: printer.defaultBarcodeDimensions.height,
        quality: 0,
        columns: 0,
        rows: 0,
        format: 6,
        escape: escapeTilde,
        ratio: 0,
      };

      const parts = splitCommand(command, code, 0);
      if (parts[0] !== undefined && parts[0].length > 0) {
        barcode.orientation = toFieldOrientation(parts[0][0] ?? "");
      }

      if (parts[1] !== undefined) {
        const v = parseFloatTrimmed(parts[1]);
        if (v !== null) barcode.height = Math.ceil(v);
      }

      if (parts[2] !== undefined) {
        const v = parseInt10(parts[2]);
        if (v !== null) barcode.quality = v;
      }

      if (parts[3] !== undefined) {
        const v = parseInt10(parts[3]);
        if (v !== null) barcode.columns = v;
      }

      if (parts[4] !== undefined) {
        const v = parseInt10(parts[4]);
        if (v !== null) barcode.rows = v;
      }

      if (parts[5] !== undefined) {
        const v = parseInt10(parts[5]);
        if (v !== null && v > 0) barcode.format = v;
      }

      if (parts[6] !== undefined && parts[6].length > 0) {
        barcode.escape = parts[6].charCodeAt(0);
      }

      if (parts[7] !== undefined) {
        const v = parseInt10(parts[7]);
        if (v !== null && v > 0 && v < 3) {
          barcode.ratio = v as DatamatrixRatio;
        }
      }

      printer.nextElementFieldElement = barcode;
      return null;
    },
  };
}
