// Port of /Users/alancohen/fountain-bio/zebrash/internal/drawers/barcode_pdf417.go.

import type { BitMatrix } from "../barcodes/utils/index.js";
import type { BarcodePdf417WithData } from "../elements/index.js";

import { encodePdf417, toMatrix as pdf417ToMatrix } from "../barcodes/pdf417/index.js";
import { paintBitMatrixCells } from "./barcode_paint.js";
import {
  type ElementDrawer,
  adjustImageTypeSetPosition,
  rotateForOrientation,
} from "./element_drawer.js";

/** Tiny adapter that exposes a `boolean[][]` matrix as a BitMatrix-shaped view. */
function asBitMatrix(rows: boolean[][]): {
  width: number;
  height: number;
  at(x: number, y: number): boolean;
} {
  const height = rows.length;
  const width = height > 0 ? rows[0]!.length : 0;
  return {
    width,
    height,
    at(x: number, y: number): boolean {
      return rows[y]?.[x] ?? false;
    },
  };
}

export function newBarcodePdf417Drawer(): ElementDrawer {
  return {
    draw(ctx, element): void {
      const barcode = element as BarcodePdf417WithData | null;
      if (!barcode || barcode._kind !== "BarcodePdf417WithData") return;

      const result = encodePdf417(barcode.data, barcode.security, barcode.columns);
      const matrix = asBitMatrix(pdf417ToMatrix(result));
      // PDF417 modules are 2px wide × rowHeight px tall (matches Go's
      // images.NewScaled(barcode, 2, scaleY) at encoder.go:scaleX=2).
      const moduleWidth = 2;
      const moduleHeight = Math.max(barcode.rowHeight, 1);
      const width = matrix.width * moduleWidth;
      const height = matrix.height * moduleHeight;
      const pos = adjustImageTypeSetPosition(width, height, barcode.position, barcode.orientation);

      ctx.save();
      try {
        rotateForOrientation(ctx, width, height, pos, barcode.orientation);
        // The adapter shape matches BitMatrix duck-type for paintBitMatrixCells.
        paintBitMatrixCells(ctx, matrix as unknown as BitMatrix, pos, moduleWidth, moduleHeight);
      } finally {
        ctx.restore();
      }
    },
  };
}
