import type { BarcodePdf417 } from "../elements/index.js";
import type { VirtualPrinter } from "../printers/virtual.js";
import {
  type CommandParser,
  parseInt10,
  splitCommand,
  toBoolField,
  toFieldOrientation,
} from "./command_parser.js";

export function newBarcodePdf417Parser(): CommandParser {
  const code = "^B7";

  return {
    commandCode: code,
    parse(command: string, printer: VirtualPrinter): unknown {
      const barcode: BarcodePdf417 = {
        orientation: printer.defaultOrientation,
        rowHeight: 0,
        security: 0,
        columns: 0,
        rows: 0,
        truncate: false,
      };

      const parts = splitCommand(command, code, 0);

      if (parts[0] !== undefined && parts[0].length > 0) {
        barcode.orientation = toFieldOrientation(parts[0][0] ?? "");
      }

      if (parts[1] !== undefined) {
        const v = parseInt10(parts[1]);
        if (v !== null) barcode.rowHeight = v;
      }

      if (parts[2] !== undefined) {
        const v = parseInt10(parts[2]);
        if (v !== null) barcode.security = v;
      }

      if (parts[3] !== undefined) {
        const v = parseInt10(parts[3]);
        if (v !== null) barcode.columns = v;
      }

      if (parts[4] !== undefined) {
        const v = parseInt10(parts[4]);
        if (v !== null) barcode.rows = v;
      }

      if (parts[5] !== undefined && parts[5].length > 0) {
        barcode.truncate = toBoolField(parts[5][0] ?? "");
      }

      printer.nextElementFieldElement = barcode;
      return null;
    },
  };
}
