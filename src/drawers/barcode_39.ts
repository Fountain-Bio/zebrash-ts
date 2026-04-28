// Port of /Users/alancohen/fountain-bio/zebrash/internal/drawers/barcode_39.go.

import type { Barcode39WithData } from "../elements/index.js";

import { encodeCode39 } from "../barcodes/code39/index.js";
import { paintBitArrayBars, paintHumanReadableText } from "./barcode_paint.js";
import {
  type ElementDrawer,
  adjustImageTypeSetPosition,
  rotateForOrientation,
} from "./element_drawer.js";

export function newBarcode39Drawer(): ElementDrawer {
  return {
    draw(ctx, element): void {
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
