// Port of /Users/alancohen/fountain-bio/zebrash/internal/drawers/barcode_aztec.go.

import {
  AZTEC_DEFAULT_EC_PERCENT,
  AZTEC_DEFAULT_LAYERS,
  encodeAztec,
} from "../barcodes/aztec/index.js";
import type { BarcodeAztecWithData } from "../elements/index.js";
import { paintBitMatrixCells } from "./barcode_paint.js";
import {
  type ElementDrawer,
  adjustImageTypeSetPosition,
  rotateForOrientation,
} from "./element_drawer.js";

const SIZE_FULL_RANGE_OFFSET = 200;

export function newBarcodeAztecDrawer(): ElementDrawer {
  return {
    draw(ctx, element): void {
      const barcode = element as BarcodeAztecWithData | null;
      if (!barcode || barcode.kind !== "barcodeAztec") return;

      let layers = AZTEC_DEFAULT_LAYERS;
      let minECCPercent = AZTEC_DEFAULT_EC_PERCENT;

      if (barcode.size > 0) {
        if (barcode.size >= SIZE_FULL_RANGE_OFFSET && barcode.size <= SIZE_FULL_RANGE_OFFSET + 32) {
          layers = barcode.size - SIZE_FULL_RANGE_OFFSET;
        } else if (barcode.size >= 1 && barcode.size <= 99) {
          minECCPercent = barcode.size;
        } else if (barcode.size >= 101 && barcode.size <= 104) {
          layers = -(barcode.size - 100);
        } else {
          throw new Error(`aztec barcode size/mode ${barcode.size} is not supported`);
        }
      }

      const magnification = Math.max(barcode.magnification, 1);
      const matrix = encodeAztec(
        new TextEncoder().encode(barcode.data),
        minECCPercent,
        layers,
        magnification,
      );

      const width = matrix.width * magnification;
      const height = matrix.height * magnification;
      const pos = adjustImageTypeSetPosition(width, height, barcode.position, barcode.orientation);

      ctx.save();
      try {
        rotateForOrientation(ctx, width, height, pos, barcode.orientation);
        paintBitMatrixCells(ctx, matrix, pos, magnification);
      } finally {
        ctx.restore();
      }
    },
  };
}
