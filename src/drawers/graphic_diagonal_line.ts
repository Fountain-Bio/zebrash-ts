// Mirrors internal/drawers/graphic_diagonal_line.go
import type { SKRSContext2D } from "@napi-rs/canvas";
import type { GraphicDiagonalLine } from "../elements/graphic_diagonal_line.ts";
import { type ElementDrawer, setLineColor } from "./element_drawer.ts";

function isGraphicDiagonalLine(value: unknown): value is GraphicDiagonalLine {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { kind?: unknown }).kind === "graphic_diagonal_line"
  );
}

export function newGraphicDiagonalLineDrawer(): ElementDrawer {
  return {
    draw: (ctx, element) => {
      if (!isGraphicDiagonalLine(element)) {
        return;
      }

      setLineColor(ctx, element.lineColor);
      ctx.lineWidth = 1;
      ctx.lineCap = "square";

      drawDiagonalLine(
        ctx,
        element.position.x,
        element.position.y,
        element.width,
        element.height,
        element.borderThickness,
        element.topToBottom,
      );

      ctx.fill();
    },
  };
}

function drawDiagonalLine(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  b: number,
  bottomToTop: boolean,
): void {
  ctx.beginPath();

  if (bottomToTop) {
    ctx.moveTo(x, y);
    ctx.lineTo(x + b, y);
    ctx.lineTo(x + b + w, y + h);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y);
    ctx.closePath();
    return;
  }

  ctx.moveTo(x, y + h);
  ctx.lineTo(x + b, y + h);
  ctx.lineTo(x + b + w, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x, y + h);
  ctx.closePath();
}
