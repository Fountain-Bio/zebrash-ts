import type { VirtualPrinter } from "../printers/index.js";

import { type GraphicCircle, LineColorBlack, LineColorWhite } from "../elements/index.js";
import { type CommandParser, splitCommand } from "./command_parser.js";

export function newGraphicCircleParser(): CommandParser {
  const code = "^GC";

  return {
    commandCode: code,
    parse(command: string, printer: VirtualPrinter): GraphicCircle {
      const result: GraphicCircle = {
        _kind: "GraphicCircle",
        position: printer.nextElementPosition,
        circleDiameter: 3,
        borderThickness: 1,
        lineColor: LineColorBlack,
        reversePrint: printer.getReversePrint(),
      };

      const parts = splitCommand(command, code, 0);

      if (parts.length > 0) {
        const v = Number.parseInt(parts[0] ?? "", 10);
        if (!Number.isNaN(v)) result.circleDiameter = v;
      }

      if (parts.length > 1) {
        const v = Number.parseInt(parts[1] ?? "", 10);
        if (!Number.isNaN(v)) result.borderThickness = v;
      }

      if (parts.length > 2 && parts[2] === "W") {
        result.lineColor = LineColorWhite;
      }

      return result;
    },
  };
}
