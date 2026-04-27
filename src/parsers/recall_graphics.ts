import type { GraphicField } from "../elements/index.js";
import { StoredGraphicsDefaultPath, type VirtualPrinter } from "../printers/index.js";
import { type CommandParser, splitCommand } from "./command_parser.js";

export function newRecallGraphicsParser(): CommandParser {
  const code = "^XG";

  return {
    CommandCode: code,
    Parse(command: string, printer: VirtualPrinter): GraphicField | null {
      const parts = splitCommand(command, code, 0);

      const result: GraphicField = {
        Position: printer.NextElementPosition,
        Format: 0,
        DataBytes: 0,
        TotalBytes: 0,
        RowBytes: 0,
        Data: new Uint8Array(0),
        MagnificationX: 1,
        MagnificationY: 1,
        ReversePrint: printer.GetReversePrint(),
      };

      let path = StoredGraphicsDefaultPath;
      if (parts.length > 0 && parts[0] !== "") {
        path = parts[0] ?? path;
      }

      if (parts.length > 1) {
        const v = Number.parseInt(parts[1] ?? "", 10);
        if (!Number.isNaN(v) && v >= 0 && v <= 10) {
          result.MagnificationX = v;
        }
      }

      if (parts.length > 2) {
        const v = Number.parseInt(parts[2] ?? "", 10);
        if (!Number.isNaN(v) && v >= 0 && v <= 10) {
          result.MagnificationY = v;
        }
      }

      const stored = printer.StoredGraphics.get(path);
      if (!stored) {
        return null;
      }

      result.Data = stored.Data;
      result.DataBytes = stored.TotalBytes;
      result.TotalBytes = stored.TotalBytes;
      result.RowBytes = stored.RowBytes;

      return result;
    },
  };
}
