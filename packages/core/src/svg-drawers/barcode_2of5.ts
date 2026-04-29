// SVG analogue of `drawers/barcode_2of5.ts`.

import type { Barcode2of5WithData } from "../elements/index.ts";
import type { SvgEmitter } from "../svg/emitter.ts";
import type { SvgElementDrawer } from "./svg_element_drawer.ts";

import { encodeInterleaved2of5 } from "../barcodes/twooffive/index.ts";
import { adjustImageTypeSetPosition } from "../drawers/element_drawer.ts";
import { paintBitArrayBarsSvg, paintHumanReadableTextSvg } from "./barcode_paint_svg.ts";
import { rotateForOrientation } from "./transform.ts";

const NON_DIGIT = /[^0-9]+/g;

export function newBarcode2of5SvgDrawer(): SvgElementDrawer {
  return {
    draw(emitter: SvgEmitter, element: unknown): void {
      const barcode = element as Barcode2of5WithData | null;
      if (!barcode || barcode._kind !== "Barcode2of5WithData") return;

      const content = barcode.data.replace(NON_DIGIT, "");
      const moduleWidth = Math.max(barcode.width, 1);
      const moduleHeight = Math.max(barcode.height, 1);

      const result = encodeInterleaved2of5(content, barcode.checkDigit);
      const bits = result.bits;
      const text = result.content;

      const width = bits.length * moduleWidth;
      const height = moduleHeight;
      const pos = adjustImageTypeSetPosition(width, height, barcode.position, barcode.orientation);

      emitter.save();
      try {
        rotateForOrientation(emitter, width, height, pos, barcode.orientation);
        paintBitArrayBarsSvg(emitter, bits, pos, moduleWidth, height);
        if (barcode.line) {
          paintHumanReadableTextSvg(
            emitter,
            text,
            pos,
            barcode.lineAbove,
            moduleWidth,
            width,
            height,
          );
        }
      } finally {
        emitter.restore();
      }
    },
  };
}
