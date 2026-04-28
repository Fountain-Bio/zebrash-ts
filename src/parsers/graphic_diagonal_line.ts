import type { VirtualPrinter } from "../printers/index.js";

import { type GraphicDiagonalLine, LineColorBlack, LineColorWhite } from "../elements/index.js";
import { type CommandParser, splitCommand } from "./command_parser.js";

export function newGraphicDiagonalLineParser(): CommandParser {
  const code = "^GD";

  return {
    commandCode: code,
    parse(command: string, printer: VirtualPrinter): GraphicDiagonalLine {
      const result: GraphicDiagonalLine = {
        _kind: "GraphicDiagonalLine",
        position: printer.nextElementPosition,
        width: 1,
        height: 1,
        borderThickness: 1,
        lineColor: LineColorBlack,
        topToBottom: false,
        reversePrint: printer.getReversePrint(),
      };

      const parts = splitCommand(command, code, 0);

      if (parts.length > 0) {
        const v = Number.parseInt(parts[0] ?? "", 10);
        if (!Number.isNaN(v)) result.width = v;
      }

      if (parts.length > 1) {
        const v = Number.parseInt(parts[1] ?? "", 10);
        if (!Number.isNaN(v)) result.height = v;
      }

      if (parts.length > 2) {
        const v = Number.parseInt(parts[2] ?? "", 10);
        if (!Number.isNaN(v)) result.borderThickness = v;
      }

      if (parts.length > 3 && parts[3] === "W") {
        result.lineColor = LineColorWhite;
      }

      if (parts.length > 4) {
        result.topToBottom = parts[4] === "L";
      }

      return result;
    },
  };
}
