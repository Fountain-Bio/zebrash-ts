// Port of /Users/alancohen/fountain-bio/zebrash/internal/drawers/barcode_ean13.go.

import {
  calculateEan13GuardExtension,
  encodeEan13,
  sanitizeContent,
} from "../barcodes/ean13/index.js";
import {
  type BarcodeEan13WithData,
  type FieldOrientation,
  FieldOrientation90,
  FieldOrientation180,
  type LabelPosition,
} from "../elements/index.js";
import { paintBitArrayBars, paintEan13Text } from "./barcode_paint.js";
import {
  type ElementDrawer,
  adjustImageTypeSetPosition,
  rotateForOrientation,
} from "./element_drawer.js";

export function newBarcodeEan13Drawer(): ElementDrawer {
  return {
    draw(ctx, element): void {
      const barcode = element as BarcodeEan13WithData | null;
      if (!barcode || barcode._kind !== "BarcodeEan13WithData") return;

      const moduleWidth = Math.max(barcode.width, 1);
      const moduleHeight = Math.max(barcode.height, 1);

      // Sanitize the input the same way the encoder does so the human-readable
      // line (with check digit appended) matches the bars. Mirrors Go's
      // `ean13.Encode` which returns both the image and the sanitized content.
      const text = sanitizeContent(barcode.data);
      const bits = encodeEan13(text);
      if (bits === null) return;
      const width = bits.length * moduleWidth;
      const height = moduleHeight;
      const guardExtension = calculateEan13GuardExtension(moduleWidth);

      let pos = adjustImageTypeSetPosition(width, height, barcode.position, barcode.orientation);
      pos = adjustEan13Position(pos, barcode.orientation, guardExtension);

      ctx.save();
      try {
        rotateForOrientation(ctx, width, height, pos, barcode.orientation);
        paintBitArrayBars(ctx, bits, pos, moduleWidth, height);
        if (barcode.line) {
          paintEan13Text(
            ctx,
            text,
            pos,
            barcode.lineAbove,
            width,
            height,
            moduleWidth,
            guardExtension,
          );
        }
      } finally {
        ctx.restore();
      }
    },
  };
}

function adjustEan13Position(
  pos: LabelPosition,
  ori: FieldOrientation,
  guardExtension: number,
): LabelPosition {
  if (pos.calculateFromBottom) return pos;

  let { x, y } = pos;
  switch (ori) {
    case FieldOrientation90:
      x -= guardExtension;
      break;
    case FieldOrientation180:
      y -= guardExtension;
      break;
  }
  return {
    x,
    y,
    calculateFromBottom: pos.calculateFromBottom,
    automaticPosition: pos.automaticPosition,
  };
}
