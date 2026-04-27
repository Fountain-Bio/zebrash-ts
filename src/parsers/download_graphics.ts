import type { StoredGraphics } from "../elements/index.js";
import { decodeGraphicFieldData } from "../hex/decode.js";
import {
  StoredGraphicsDefaultPath,
  type VirtualPrinter,
  ensureExtensions,
} from "../printers/index.js";
import { type CommandParser, commandText, splitN } from "./command_parser.js";

export function newDownloadGraphicsParser(): CommandParser {
  const code = "~DG";

  return {
    CommandCode: code,
    Parse(command: string, printer: VirtualPrinter): null {
      const parts = splitN(commandText(command, code), ",", 4);

      const graphics: StoredGraphics = {
        Data: new Uint8Array(0),
        TotalBytes: 0,
        RowBytes: 1,
      };

      let path = StoredGraphicsDefaultPath;
      if (parts.length > 0 && parts[0] !== "") {
        path = parts[0] ?? path;
      }

      if (parts.length > 1) {
        const v = Number.parseInt(parts[1] ?? "", 10);
        if (!Number.isNaN(v)) graphics.TotalBytes = v;
      }

      if (parts.length > 2) {
        const v = Number.parseInt(parts[2] ?? "", 10);
        if (!Number.isNaN(v)) graphics.RowBytes = Math.min(v, 9999999);
      }

      if (parts.length > 3) {
        try {
          graphics.Data = decodeGraphicFieldData(parts[3] ?? "", graphics.RowBytes);
        } catch (e) {
          throw new Error(
            `failed to decode embedded graphics: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }

      const finalPath = ensureExtensions(path, "GRF");
      printer.StoredGraphics.set(finalPath, graphics);

      return null;
    },
  };
}
