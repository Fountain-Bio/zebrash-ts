// Mirrors internal/drawers/graphic_circle.go
import type { GraphicCircle } from "../elements/graphic_circle.ts";
import { type ElementDrawer, setLineColor } from "./element_drawer.ts";

function isGraphicCircle(value: unknown): value is GraphicCircle {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { kind?: unknown }).kind === "graphic_circle"
  );
}

export function newGraphicCircleDrawer(): ElementDrawer {
  return {
    draw: (ctx, element) => {
      if (!isGraphicCircle(element)) {
        return;
      }

      setLineColor(ctx, element.lineColor);
      ctx.lineWidth = element.borderThickness;

      const radius = element.circleDiameter / 2;
      ctx.beginPath();
      ctx.arc(element.position.x + radius, element.position.y + radius, radius, 0, Math.PI * 2);
      ctx.stroke();
    },
  };
}
