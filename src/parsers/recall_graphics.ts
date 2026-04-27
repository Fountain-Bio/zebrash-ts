import { GraphicFieldFormatHex } from "../elements/index.js";
import type { GraphicField } from "../elements/index.js";
import { StoredGraphicsDefaultPath, type VirtualPrinter } from "../printers/index.js";
import { type CommandParser, splitCommand } from "./command_parser.js";

export function newRecallGraphicsParser(): CommandParser {
  const code = "^XG";

  return {
    commandCode: code,
    parse(command: string, printer: VirtualPrinter): GraphicField | null {
      const parts = splitCommand(command, code, 0);

      const result: GraphicField = {
        _kind: "GraphicField",
        position: printer.nextElementPosition,
        format: GraphicFieldFormatHex,
        DataBytes: 0,
        totalBytes: 0,
        rowBytes: 0,
        data: new Uint8Array(0),
        magnificationX: 1,
        magnificationY: 1,
        reversePrint: printer.getReversePrint(),
      };

      let path = StoredGraphicsDefaultPath;
      if (parts.length > 0 && parts[0] !== "") {
        path = parts[0] ?? path;
      }

      if (parts.length > 1) {
        const v = Number.parseInt(parts[1] ?? "", 10);
        if (!Number.isNaN(v) && v >= 0 && v <= 10) {
          result.magnificationX = v;
        }
      }

      if (parts.length > 2) {
        const v = Number.parseInt(parts[2] ?? "", 10);
        if (!Number.isNaN(v) && v >= 0 && v <= 10) {
          result.magnificationY = v;
        }
      }

      const stored = printer.storedGraphics.get(path);
      if (!stored) {
        return null;
      }

      result.data = stored.data;
      result.DataBytes = stored.totalBytes;
      result.totalBytes = stored.totalBytes;
      result.rowBytes = stored.rowBytes;

      return result;
    },
  };
}
