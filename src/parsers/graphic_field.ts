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
    commandCode: code,
    parse(command: string, printer: VirtualPrinter): GraphicField {
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

      const parts = splitCommand(command, code, 0);

      if (parts.length > 0 && (parts[0]?.length ?? 0) > 0) {
        const f = parts[0]?.[0];
        result.format = formatFromChar(f);
      }

      if (parts.length > 1) {
        const v = Number.parseInt(parts[1] ?? "", 10);
        if (!Number.isNaN(v)) result.DataBytes = v;
      }

      if (parts.length > 2) {
        const v = Number.parseInt(parts[2] ?? "", 10);
        if (!Number.isNaN(v)) result.totalBytes = v;
      }

      if (parts.length > 3) {
        const v = Number.parseInt(parts[3] ?? "", 10);
        if (!Number.isNaN(v)) result.rowBytes = Math.min(v, 9999999);
      }

      if (parts.length > 4) {
        const data = parts.slice(4).join(",").trim();

        switch (result.format) {
          case GraphicFieldFormatHex: {
            try {
              result.data = decodeGraphicFieldData(data, result.rowBytes);
            } catch (e) {
              throw new Error(
                `failed to decode hex string: ${e instanceof Error ? e.message : String(e)}`,
              );
            }
            break;
          }
          case GraphicFieldFormatRaw: {
            result.data = new TextEncoder().encode(data);
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

function formatFromChar(ch: string | undefined): GraphicFieldFormat {
  switch (ch) {
    case "A":
      return GraphicFieldFormatHex;
    case "B":
      return GraphicFieldFormatRaw;
    case "C":
      return GraphicFieldFormatAR;
    default:
      return GraphicFieldFormatHex;
  }
}
