import {
  type GraphicField,
  type GraphicFieldFormat,
  GraphicFieldFormatAR,
  GraphicFieldFormatHex,
  GraphicFieldFormatRaw,
} from "../elements/index.js";
import { decodeGraphicFieldData } from "../hex/decode.js";
import type { VirtualPrinter } from "../printers/index.js";
import { type CommandParser, splitCommand } from "./command_parser.js";

export function newGraphicFieldParser(): CommandParser {
  const code = "^GF";

  return {
    CommandCode: code,
    Parse(command: string, printer: VirtualPrinter): GraphicField {
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

      const parts = splitCommand(command, code, 0);

      if (parts.length > 0 && (parts[0]?.length ?? 0) > 0) {
        const f = parts[0]?.[0];
        result.Format = formatFromChar(f);
      }

      if (parts.length > 1) {
        const v = Number.parseInt(parts[1] ?? "", 10);
        if (!Number.isNaN(v)) result.DataBytes = v;
      }

      if (parts.length > 2) {
        const v = Number.parseInt(parts[2] ?? "", 10);
        if (!Number.isNaN(v)) result.TotalBytes = v;
      }

      if (parts.length > 3) {
        const v = Number.parseInt(parts[3] ?? "", 10);
        if (!Number.isNaN(v)) result.RowBytes = Math.min(v, 9999999);
      }

      if (parts.length > 4) {
        const data = parts.slice(4).join(",").trim();

        switch (result.Format) {
          case GraphicFieldFormatHex: {
            try {
              result.Data = decodeGraphicFieldData(data, result.RowBytes);
            } catch (e) {
              throw new Error(
                `failed to decode hex string: ${e instanceof Error ? e.message : String(e)}`,
              );
            }
            break;
          }
          case GraphicFieldFormatRaw: {
            result.Data = new TextEncoder().encode(data);
            break;
          }
          default:
            // GraphicFieldFormatAR (very rare) and unspecified formats fall through unchanged.
            break;
        }
      }

      return result;
    },
  };
}

function formatFromChar(ch: string | undefined): GraphicFieldFormat | 0 {
  switch (ch) {
    case "A":
      return GraphicFieldFormatHex;
    case "B":
      return GraphicFieldFormatRaw;
    case "C":
      return GraphicFieldFormatAR;
    default:
      return 0;
  }
}
