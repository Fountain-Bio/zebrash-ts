// SVG analogue of `drawers/barcode_39.ts`.

import type { Barcode39WithData } from "../elements/index.ts";
import type { SvgEmitter } from "../svg/emitter.ts";
import type { SvgElementDrawer } from "./svg_element_drawer.ts";

import { encodeCode39 } from "../barcodes/code39/index.ts";
import { adjustImageTypeSetPosition } from "../drawers/element_drawer.ts";
import { paintBitArrayBarsSvg, paintHumanReadableTextSvg } from "./barcode_paint_svg.ts";
import { rotateForOrientation } from "./transform.ts";

export function newBarcode39SvgDrawer(): SvgElementDrawer {
  return {
    draw(emitter: SvgEmitter, element: unknown): void {
      const barcode = element as Barcode39WithData | null;
      if (!barcode || barcode._kind !== "Barcode39WithData") return;

      const content = barcode.data;
      const text = `*${barcode.data}*`;

      const moduleWidth = Math.max(barcode.width, 1);
      const moduleHeight = Math.max(barcode.height, 1);

      const bits = encodeCode39(content);
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
