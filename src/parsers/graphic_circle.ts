import { type GraphicCircle, LineColorBlack, LineColorWhite } from "../elements/index.js";
import type { VirtualPrinter } from "../printers/index.js";
import { type CommandParser, splitCommand } from "./command_parser.js";

export function newGraphicCircleParser(): CommandParser {
  const code = "^GC";

  return {
    CommandCode: code,
    Parse(command: string, printer: VirtualPrinter): GraphicCircle {
      const result: GraphicCircle = {
        Position: printer.NextElementPosition,
        CircleDiameter: 3,
        BorderThickness: 1,
        LineColor: LineColorBlack,
        ReversePrint: printer.GetReversePrint(),
      };

      const parts = splitCommand(command, code, 0);

      if (parts.length > 0) {
        const v = Number.parseInt(parts[0] ?? "", 10);
        if (!Number.isNaN(v)) result.CircleDiameter = v;
      }

      if (parts.length > 1) {
        const v = Number.parseInt(parts[1] ?? "", 10);
        if (!Number.isNaN(v)) result.BorderThickness = v;
      }

      if (parts.length > 2 && parts[2] === "W") {
        result.LineColor = LineColorWhite;
      }

      return result;
    },
  };
}
