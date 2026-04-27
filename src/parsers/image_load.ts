import type { GraphicField } from "../elements/index.js";
import { StoredGraphicsDefaultPath, type VirtualPrinter } from "../printers/index.js";
import { type CommandParser, splitCommand } from "./command_parser.js";

export function newImageLoadParser(): CommandParser {
  const code = "^IL";

  return {
    CommandCode: code,
    Parse(command: string, printer: VirtualPrinter): GraphicField | null {
      const parts = splitCommand(command, code, 0);

      let path = StoredGraphicsDefaultPath;
      if (parts.length > 0 && parts[0] !== "") {
        path = parts[0] ?? path;
      }

      const stored = printer.StoredGraphics.get(path);
      if (!stored) {
        return null;
      }

      return {
        Position: { X: 0, Y: 0, CalculateFromBottom: false, AutomaticPosition: false },
        Format: 0,
        DataBytes: stored.TotalBytes,
        TotalBytes: stored.TotalBytes,
        RowBytes: stored.RowBytes,
        Data: stored.Data,
        MagnificationX: 1,
        MagnificationY: 1,
        ReversePrint: { Value: false },
      };
    },
  };
}
