import { type GraphicDiagonalLine, LineColorBlack, LineColorWhite } from "../elements/index.js";
import type { VirtualPrinter } from "../printers/index.js";
import { type CommandParser, splitCommand } from "./command_parser.js";

export function newGraphicDiagonalLineParser(): CommandParser {
  const code = "^GD";

  return {
    CommandCode: code,
    Parse(command: string, printer: VirtualPrinter): GraphicDiagonalLine {
      const result: GraphicDiagonalLine = {
        Position: printer.NextElementPosition,
        Width: 1,
        Height: 1,
        BorderThickness: 1,
        LineColor: LineColorBlack,
        TopToBottom: false,
        ReversePrint: printer.GetReversePrint(),
      };

      const parts = splitCommand(command, code, 0);

      if (parts.length > 0) {
        const v = Number.parseInt(parts[0] ?? "", 10);
        if (!Number.isNaN(v)) result.Width = v;
      }

      if (parts.length > 1) {
        const v = Number.parseInt(parts[1] ?? "", 10);
        if (!Number.isNaN(v)) result.Height = v;
      }

      if (parts.length > 2) {
        const v = Number.parseInt(parts[2] ?? "", 10);
        if (!Number.isNaN(v)) result.BorderThickness = v;
      }

      if (parts.length > 3 && parts[3] === "W") {
        result.LineColor = LineColorWhite;
      }

      if (parts.length > 4) {
        result.TopToBottom = parts[4] === "L";
      }

      return result;
    },
  };
}
