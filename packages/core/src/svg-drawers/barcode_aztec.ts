// SVG analogue of `drawers/barcode_aztec.ts`.

import type { BitMatrix } from "../barcodes/utils/index.ts";
import type { BarcodeAztecWithData } from "../elements/index.ts";
import type { SvgEmitter } from "../svg/emitter.ts";
import type { SvgElementDrawer } from "./svg_element_drawer.ts";

import {
  AZTEC_DEFAULT_EC_PERCENT,
  AZTEC_DEFAULT_LAYERS,
  encodeAztec,
} from "../barcodes/aztec/index.ts";
import { adjustImageTypeSetPosition } from "../drawers/element_drawer.ts";
import { paintBitMatrixCellsSvg } from "./barcode_paint_svg.ts";
import { rotateForOrientation } from "./transform.ts";

const SIZE_FULL_RANGE_OFFSET = 200;

export function newBarcodeAztecSvgDrawer(): SvgElementDrawer {
  return {
    draw(emitter: SvgEmitter, element: unknown): void {
      const barcode = element as BarcodeAztecWithData | null;
      if (!barcode || barcode._kind !== "BarcodeAztecWithData") return;

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
      const matrix = encodeAztec(new TextEncoder().encode(barcode.data), {
        minECCPercent,
        userSpecifiedLayers: layers,
      });

      const width = matrix.width * magnification;
      const height = matrix.height * magnification;
      const pos = adjustImageTypeSetPosition(width, height, barcode.position, barcode.orientation);

      emitter.save();
      try {
        rotateForOrientation(emitter, width, height, pos, barcode.orientation);
        paintBitMatrixCellsSvg(emitter, matrix as unknown as BitMatrix, pos, magnification);
      } finally {
        emitter.restore();
      }
    },
  };
}
