import { type GraphicBox, LineColorBlack, LineColorWhite } from "../elements/index.js";
import type { VirtualPrinter } from "../printers/index.js";
import { type CommandParser, splitCommand, toPositiveIntField } from "./command_parser.js";

export function newGraphicBoxParser(): CommandParser {
  const code = "^GB";

  return {
    CommandCode: code,
    Parse(command: string, printer: VirtualPrinter): GraphicBox {
      const result: GraphicBox = {
        Position: printer.NextElementPosition,
        Width: 1,
        Height: 1,
        BorderThickness: 1,
        CornerRounding: 0,
        LineColor: LineColorBlack,
        ReversePrint: printer.GetReversePrint(),
      };

      const parts = splitCommand(command, code, 0);

      // Border thickness is parsed first so width/height can clamp to it.
      if (parts.length > 2) {
        try {
          const v = toPositiveIntField(parts[2] ?? "");
          if (v > 0) result.BorderThickness = v;
        } catch {
          // ignore parse errors — keep default
        }
      }

      if (parts.length > 0) {
        try {
          const v = toPositiveIntField(parts[0] ?? "");
          if (v > 0) result.Width = Math.max(v, result.BorderThickness);
        } catch {
          // ignore
        }
      }

      if (parts.length > 1) {
        try {
          const v = toPositiveIntField(parts[1] ?? "");
          if (v > 0) result.Height = Math.max(v, result.BorderThickness);
        } catch {
          // ignore
        }
      }

      if (parts.length > 3 && parts[3] === "W") {
        result.LineColor = LineColorWhite;
      }

      if (parts.length > 4) {
        const v = Number.parseInt(parts[4] ?? "", 10);
        if (!Number.isNaN(v) && v > 0 && v < 9) {
          result.CornerRounding = v;
        }
      }

      return result;
    },
  };
}
