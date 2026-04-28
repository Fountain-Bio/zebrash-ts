// Port of /Users/alancohen/fountain-bio/zebrash/internal/drawers/maxicode.go
// (and the embedded SymbolGrid.Draw() routine from the upstream maxicode lib).

import type { SKRSContext2D } from "@napi-rs/canvas";

import {
  MAXICODE_COLS,
  MAXICODE_ROWS,
  type MaxicodeGrid,
  encodeMaxicode,
} from "../barcodes/maxicode/index.js";
import {
  FieldOrientationNormal,
  type MaxicodeWithData,
  getMaxicodeInputData,
} from "../elements/index.js";
import { type ElementDrawer, adjustImageTypeSetPosition } from "./element_drawer.js";

export function newMaxicodeDrawer(): ElementDrawer {
  return {
    draw(ctx, element, options): void {
      const barcode = element as MaxicodeWithData | null;
      if (!barcode || barcode._kind !== "MaxicodeWithData") return;

      const inputData = getMaxicodeInputData(barcode);
      const grid = encodeMaxicode(barcode.code.mode, 0, inputData);

      const dpmm = options.dpmm;
      const hexRectW = Math.round(0.76 * dpmm);
      const hexRectH = Math.round(0.88 * dpmm);

      const imageWidth = Math.trunc(28 * dpmm);
      const imageHeight = Math.trunc(26.8 * dpmm);

      const pos = adjustImageTypeSetPosition(
        imageWidth,
        imageHeight,
        barcode.position,
        FieldOrientationNormal,
      );

      ctx.save();
      try {
        ctx.translate(pos.x - hexRectW, pos.y - hexRectH);
        drawMaxicodeGrid(ctx, grid, dpmm);
      } finally {
        ctx.restore();
      }
    },
  };
}

/**
 * Render a Maxicode grid: bullseye + hexagonal modules.
 * Mirrors `SymbolGrid.Draw()` in github.com/ingridhq/maxicode.
 */
export function drawMaxicodeGrid(ctx: SKRSContext2D, grid: MaxicodeGrid, dpmm: number): void {
  const centerX = 13.64 * dpmm;
  const centerY = 13.43 * dpmm;
  const innerRadius = 0.85 * dpmm;
  const centerRadius = 2.2 * dpmm;
  const outerRadius = 3.54 * dpmm;

  ctx.lineWidth = 0.67 * dpmm;
  ctx.strokeStyle = "#000000";
  ctx.fillStyle = "#000000";

  for (const radius of [outerRadius, centerRadius, innerRadius]) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  const hexRectW = 0.76 * dpmm;
  const hexRectH = 0.88 * dpmm;

  for (let row = 0; row < MAXICODE_ROWS; row++) {
    const rowOffset = (row & 1) === 1 ? 1.32 : 0.88;
    for (let col = 0; col < MAXICODE_COLS; col++) {
      if (!grid.get(row, col)) continue;
      const hexRectX = (col * 0.88 + rowOffset) * dpmm;
      const hexRectY = (row * 0.76 + 0.76) * dpmm;
      ctx.beginPath();
      ctx.moveTo(hexRectX + hexRectW * 0.5, hexRectY);
      ctx.lineTo(hexRectX + hexRectW, hexRectY + hexRectH * 0.25);
      ctx.lineTo(hexRectX + hexRectW, hexRectY + hexRectH * 0.75);
      ctx.lineTo(hexRectX + hexRectW * 0.5, hexRectY + hexRectH);
      ctx.lineTo(hexRectX, hexRectY + hexRectH * 0.75);
      ctx.lineTo(hexRectX, hexRectY + hexRectH * 0.25);
      ctx.closePath();
      ctx.fill();
    }
  }
}
