import { type GraphicBox, LineColorBlack, LineColorWhite } from "../elements/index.js";
import type { VirtualPrinter } from "../printers/index.js";
import { type CommandParser, splitCommand, toPositiveIntField } from "./command_parser.js";

export function newGraphicBoxParser(): CommandParser {
  const code = "^GB";

  return {
    commandCode: code,
    parse(command: string, printer: VirtualPrinter): GraphicBox {
      const result: GraphicBox = {
        _kind: "GraphicBox",
        position: printer.nextElementPosition,
        width: 1,
        height: 1,
        borderThickness: 1,
        cornerRounding: 0,
        lineColor: LineColorBlack,
        reversePrint: printer.getReversePrint(),
      };

      const parts = splitCommand(command, code, 0);

      // Border thickness is parsed first so width/height can clamp to it.
      if (parts.length > 2) {
        try {
          const v = toPositiveIntField(parts[2] ?? "").value;
          if (v > 0) result.borderThickness = v;
        } catch {
          // ignore parse errors — keep default
        }
      }

      if (parts.length > 0) {
        try {
          const v = toPositiveIntField(parts[0] ?? "").value;
          if (v > 0) result.width = Math.max(v, result.borderThickness);
        } catch {
          // ignore
        }
      }

      if (parts.length > 1) {
        try {
          const v = toPositiveIntField(parts[1] ?? "").value;
          if (v > 0) result.height = Math.max(v, result.borderThickness);
        } catch {
          // ignore
        }
      }

      if (parts.length > 3 && parts[3] === "W") {
        result.lineColor = LineColorWhite;
      }

      if (parts.length > 4) {
        const v = Number.parseInt(parts[4] ?? "", 10);
        if (!Number.isNaN(v) && v > 0 && v < 9) {
          result.cornerRounding = v;
        }
      }

      return result;
    },
  };
}
