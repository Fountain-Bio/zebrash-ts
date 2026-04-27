// Port of /Users/alancohen/fountain-bio/zebrash/internal/drawers/barcode_pdf417.go.

import { encodePdf417 } from "../barcodes/pdf417/index.js";
import type { BarcodePdf417WithData } from "../elements/index.js";
import { paintBitMatrixCells } from "./barcode_paint.js";
import {
  type ElementDrawer,
  adjustImageTypeSetPosition,
  rotateForOrientation,
} from "./element_drawer.js";

export function newBarcodePdf417Drawer(): ElementDrawer {
  return {
    draw(ctx, element): void {
      const barcode = element as BarcodePdf417WithData | null;
      if (!barcode || barcode.kind !== "barcodePdf417") return;

      const matrix = encodePdf417(
        barcode.data,
        barcode.security,
        barcode.rowHeight,
        barcode.columns,
      );
      const moduleSize = 1;
      const width = matrix.width * moduleSize;
      const height = matrix.height * moduleSize;
      const pos = adjustImageTypeSetPosition(width, height, barcode.position, barcode.orientation);

      ctx.save();
      try {
        rotateForOrientation(ctx, width, height, pos, barcode.orientation);
        paintBitMatrixCells(ctx, matrix, pos, moduleSize);
      } finally {
        ctx.restore();
      }
    },
  };
}
