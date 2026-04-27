// Port of /Users/alancohen/fountain-bio/zebrash/internal/drawers/barcode_datamatrix.go.

import { encodeDatamatrix } from "../barcodes/datamatrix/index.js";
import { type BarcodeDatamatrixWithData, DatamatrixRatioRectangular } from "../elements/index.js";
import { paintBitMatrixCells } from "./barcode_paint.js";
import {
  type ElementDrawer,
  adjustImageTypeSetPosition,
  rotateForOrientation,
} from "./element_drawer.js";

const GS_BYTE = String.fromCharCode(29);

export function newBarcodeDatamatrixDrawer(): ElementDrawer {
  return {
    draw(ctx, element): void {
      const barcode = element as BarcodeDatamatrixWithData | null;
      if (!barcode || barcode._kind !== "BarcodeDatamatrixWithData") return;

      const columns = Math.max(barcode.columns, 1);
      const rows = Math.max(barcode.rows, 1);
      const shape: "rectangle" | "square" =
        barcode.ratio === DatamatrixRatioRectangular ? "rectangle" : "square";

      let data = barcode.data;
      const fnc1 = `${barcode.escape}1`;
      let gs1 = false;
      if (data.startsWith(fnc1)) {
        gs1 = true;
        data = data.slice(fnc1.length);
      }
      data = data.replaceAll(fnc1, GS_BYTE);

      const matrix = encodeDatamatrix(data, columns, rows, {
        shape,
        minColumns: columns,
        minRows: rows,
        gs1,
      });

      const scale = Math.max(barcode.height, 1);
      const width = matrix.width * scale;
      const height = matrix.height * scale;
      const pos = adjustImageTypeSetPosition(width, height, barcode.position, barcode.orientation);

      ctx.save();
      try {
        rotateForOrientation(ctx, width, height, pos, barcode.orientation);
        paintBitMatrixCells(ctx, matrix, pos, scale);
      } finally {
        ctx.restore();
      }
    },
  };
}
