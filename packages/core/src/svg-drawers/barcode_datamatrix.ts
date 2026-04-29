// SVG analogue of `drawers/barcode_datamatrix.ts`.

import { SymbolShapeHint } from "../barcodes/datamatrix/encoder/symbol_shape_hint.ts";
import { encodeDatamatrix } from "../barcodes/datamatrix/index.ts";
import { adjustImageTypeSetPosition } from "../drawers/element_drawer.ts";
import { type BarcodeDatamatrixWithData, DatamatrixRatioRectangular } from "../elements/index.ts";
import type { SvgEmitter } from "../svg/emitter.ts";
import { paintBitMatrixCellsSvg } from "./barcode_paint_svg.ts";
import type { SvgElementDrawer } from "./svg_element_drawer.ts";
import { rotateForOrientation } from "./transform.ts";

const GS_BYTE = String.fromCharCode(29);

export function newBarcodeDatamatrixSvgDrawer(): SvgElementDrawer {
  return {
    draw(emitter: SvgEmitter, element: unknown): void {
      const barcode = element as BarcodeDatamatrixWithData | null;
      if (!barcode || barcode._kind !== "BarcodeDatamatrixWithData") return;

      const columns = Math.max(barcode.columns, 1);
      const rows = Math.max(barcode.rows, 1);
      const shape: SymbolShapeHint =
        barcode.ratio === DatamatrixRatioRectangular
          ? SymbolShapeHint.FORCE_RECTANGLE
          : SymbolShapeHint.FORCE_SQUARE;

      let data = barcode.data;
      const fnc1 = `${barcode.escape}1`;
      let gs1 = false;
      if (data.startsWith(fnc1)) {
        gs1 = true;
        data = data.slice(fnc1.length);
      }
      data = data.replaceAll(fnc1, GS_BYTE);

      const matrix = encodeDatamatrix(data, columns, rows, { shape, gs1 });

      const scale = Math.max(barcode.height, 1);
      const width = matrix.width * scale;
      const height = matrix.height * scale;
      const pos = adjustImageTypeSetPosition(width, height, barcode.position, barcode.orientation);

      emitter.save();
      try {
        rotateForOrientation(emitter, width, height, pos, barcode.orientation);
        paintBitMatrixCellsSvg(emitter, matrix, pos, scale);
      } finally {
        emitter.restore();
      }
    },
  };
}
