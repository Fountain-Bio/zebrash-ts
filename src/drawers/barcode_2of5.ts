// Port of /Users/alancohen/fountain-bio/zebrash/internal/drawers/barcode_2of5.go.

import { encodeInterleaved2of5 } from "../barcodes/twooffive/index.js";
import type { Barcode2of5WithData } from "../elements/index.js";
import { paintBitArrayBars, paintHumanReadableText } from "./barcode_paint.js";
import {
  type ElementDrawer,
  adjustImageTypeSetPosition,
  rotateForOrientation,
} from "./element_drawer.js";

const NON_DIGIT = /[^0-9]+/g;

export function newBarcode2of5Drawer(): ElementDrawer {
  return {
    draw(ctx, element): void {
      const barcode = element as Barcode2of5WithData | null;
      if (!barcode || barcode.kind !== "barcode2of5") return;

      const content = barcode.data.replace(NON_DIGIT, "");
      const moduleWidth = Math.max(barcode.width, 1);
      const moduleHeight = Math.max(barcode.height, 1);

      const { bits, text } = encodeInterleaved2of5(
        content,
        moduleWidth,
        moduleHeight,
        barcode.widthRatio,
        barcode.checkDigit,
      );

      const width = bits.length * moduleWidth;
      const height = moduleHeight;
      const pos = adjustImageTypeSetPosition(width, height, barcode.position, barcode.orientation);

      ctx.save();
      try {
        rotateForOrientation(ctx, width, height, pos, barcode.orientation);
        paintBitArrayBars(ctx, bits, pos, moduleWidth, height);
        if (barcode.line) {
          paintHumanReadableText(ctx, text, pos, barcode.lineAbove, moduleWidth, width, height);
        }
      } finally {
        ctx.restore();
      }
    },
  };
}
