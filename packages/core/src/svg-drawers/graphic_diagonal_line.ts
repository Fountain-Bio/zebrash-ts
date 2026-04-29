// SVG analogue of `drawers/graphic_diagonal_line.ts`.

import type { GraphicDiagonalLine } from "../elements/graphic_diagonal_line.ts";
import type { SvgEmitter } from "../svg/emitter.ts";
import type { SvgElementDrawer } from "./svg_element_drawer.ts";

import { LineColor } from "../elements/line_color.ts";

function isGraphicDiagonalLine(value: unknown): value is GraphicDiagonalLine {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { _kind?: unknown })._kind === "GraphicDiagonalLine"
  );
}

export function newGraphicDiagonalLineSvgDrawer(): SvgElementDrawer {
  return {
    draw(emitter: SvgEmitter, element: unknown): void {
      if (!isGraphicDiagonalLine(element)) return;

      const color = element.lineColor === LineColor.White ? "#ffffff" : "#000000";
      const { x, y } = element.position;
      const w = element.width;
      const h = element.height;
      const b = element.borderThickness;

      // Mirrors the canvas drawer's parallelogram, expressed as a polygon.
      const points: ReadonlyArray<readonly [number, number]> = element.topToBottom
        ? [
            [x, y],
            [x + b, y],
            [x + b + w, y + h],
            [x + w, y + h],
          ]
        : [
            [x, y + h],
            [x + b, y + h],
            [x + b + w, y],
            [x + w, y],
          ];
      emitter.polygon(points, color);
    },
  };
}
