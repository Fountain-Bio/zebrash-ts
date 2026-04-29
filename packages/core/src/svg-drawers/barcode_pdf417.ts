// SVG analogue of `drawers/barcode_pdf417.ts`.

import type { BitMatrix } from "../barcodes/utils/index.ts";
import type { BarcodePdf417WithData } from "../elements/index.ts";
import type { SvgEmitter } from "../svg/emitter.ts";
import type { SvgElementDrawer } from "./svg_element_drawer.ts";

import { encodePdf417, toMatrix as pdf417ToMatrix } from "../barcodes/pdf417/index.ts";
import { adjustImageTypeSetPosition } from "../drawers/element_drawer.ts";
import { paintBitMatrixCellsSvg } from "./barcode_paint_svg.ts";
import { rotateForOrientation } from "./transform.ts";

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

export function newBarcodePdf417SvgDrawer(): SvgElementDrawer {
  return {
    draw(emitter: SvgEmitter, element: unknown): void {
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

      emitter.save();
      try {
        rotateForOrientation(emitter, width, height, pos, barcode.orientation);
        paintBitMatrixCellsSvg(
          emitter,
          matrix as unknown as BitMatrix,
          pos,
          moduleWidth,
          moduleHeight,
        );
      } finally {
        emitter.restore();
      }
    },
  };
}
