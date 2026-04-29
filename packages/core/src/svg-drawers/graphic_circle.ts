// SVG analogue of `drawers/graphic_circle.ts`.

import type { GraphicCircle } from "../elements/graphic_circle.ts";
import { LineColor } from "../elements/line_color.ts";
import type { SvgEmitter } from "../svg/emitter.ts";
import type { SvgElementDrawer } from "./svg_element_drawer.ts";

function isGraphicCircle(value: unknown): value is GraphicCircle {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { _kind?: unknown })._kind === "GraphicCircle"
  );
}

export function newGraphicCircleSvgDrawer(): SvgElementDrawer {
  return {
    draw(emitter: SvgEmitter, element: unknown): void {
      if (!isGraphicCircle(element)) return;

      const color = element.lineColor === LineColor.White ? "#ffffff" : "#000000";
      const radius = element.circleDiameter / 2;
      emitter.circleStroke(
        element.position.x + radius,
        element.position.y + radius,
        radius,
        color,
        element.borderThickness,
      );
    },
  };
}
