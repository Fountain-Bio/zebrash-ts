// Mirrors internal/drawers/graphic_box.go
import type { SKRSContext2D } from "@napi-rs/canvas";
import type { GraphicBox } from "../elements/graphic_box.ts";
import { type ElementDrawer, setLineColor } from "./element_drawer.ts";

function isGraphicBox(value: unknown): value is GraphicBox {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { kind?: unknown }).kind === "graphic_box"
  );
}

export function newGraphicBoxDrawer(): ElementDrawer {
  return {
    draw: (ctx, element) => {
      if (!isGraphicBox(element)) {
        return;
      }

      let width = element.width;
      let height = element.height;
      const border = element.borderThickness;

      if (border > width) {
        width = border;
      }
      if (border > height) {
        height = border;
      }

      const offset = border / 2;
      const x = element.position.x + offset;
      const y = element.position.y + offset;
      let w = width - border;
      let h = height - border;

      if (w === 0 && h === 0) {
        w = 1;
        h = 1;
      }

      setLineColor(ctx, element.lineColor);
      ctx.lineCap = "square";
      ctx.lineWidth = border;

      if (element.cornerRounding > 0) {
        drawRoundedRectangle(
          ctx,
          element.position.x,
          element.position.y,
          width,
          height,
          element.cornerRounding,
          border,
        );
        return;
      }

      drawRectangle(ctx, x, y, w, h);
    },
  };
}

function drawRectangle(ctx: SKRSContext2D, x: number, y: number, w: number, h: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.stroke();
}

function drawRoundedRectangle(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rounding: number,
  border: number,
): void {
  // Outer rounded rectangle filled, then inner rounded rectangle cleared to
  // produce a rounded border. Mirrors the gg "InvertMask" trick.
  const r1 = (rounding * Math.min(w, h)) / 16;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r1);
  ctx.fill();

  const innerW = w - 2 * border;
  const innerH = h - 2 * border;
  if (innerW <= 0 || innerH <= 0) {
    return;
  }

  const r2 = (rounding * Math.min(innerW, innerH)) / 16;
  if (r2 <= 0) {
    return;
  }

  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.roundRect(x + border, y + border, innerW, innerH, r2);
  ctx.fill();
  ctx.restore();
}
