import { GraphicFieldFormatHex } from "../elements/index.js";
import type { GraphicField } from "../elements/index.js";
import { StoredGraphicsDefaultPath, type VirtualPrinter } from "../printers/index.js";
import { type CommandParser, splitCommand } from "./command_parser.js";

export function newImageLoadParser(): CommandParser {
  const code = "^IL";

  return {
    commandCode: code,
    parse(command: string, printer: VirtualPrinter): GraphicField | null {
      const parts = splitCommand(command, code, 0);

      let path = StoredGraphicsDefaultPath;
      if (parts.length > 0 && parts[0] !== "") {
        path = parts[0] ?? path;
      }

      const stored = printer.storedGraphics.get(path);
      if (!stored) {
        return null;
      }

      return {
        _kind: "GraphicField",
        position: { x: 0, y: 0, calculateFromBottom: false, automaticPosition: false },
        format: GraphicFieldFormatHex,
        DataBytes: stored.totalBytes,
        totalBytes: stored.totalBytes,
        rowBytes: stored.rowBytes,
        data: stored.data,
        magnificationX: 1,
        magnificationY: 1,
        reversePrint: { value: false },
      };
    },
  };
}
