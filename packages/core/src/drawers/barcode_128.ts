// Port of /Users/alancohen/fountain-bio/zebrash/internal/drawers/barcode_128.go.

import { ESCAPE_FNC_1, encodeCode128Auto, encodeCode128NoMode } from "../barcodes/code128/index.js";
import {
  type Barcode128WithData,
  BarcodeModeEan,
  BarcodeModeNo,
  BarcodeModeUcc,
} from "../elements/index.js";
import { paintBitArrayBars, paintHumanReadableText } from "./barcode_paint.js";
import {
  type ElementDrawer,
  adjustImageTypeSetPosition,
  rotateForOrientation,
} from "./element_drawer.js";

const PARENS_AND_SPACES = /[()\s]+/g;

export function newBarcode128Drawer(): ElementDrawer {
  return {
    async draw(ctx, element): Promise<void> {
      const barcode = element as Barcode128WithData | null;
      if (!barcode || barcode._kind !== "Barcode128WithData") return;

      let content = barcode.data;
      let text = barcode.data;

      // Mode Automatic leaves content untouched: invocation codes like ">;"
      // are encoded as part of the label content rather than stripped.
      if (barcode.mode === BarcodeModeEan) {
        const ean = modifyBarcodeContentEanMode(content);
        content = ean.content;
        text = ean.text;
      } else if (barcode.mode === BarcodeModeUcc) {
        content = modifyBarcodeContentUccMode(content);
      }

      const moduleWidth = Math.max(barcode.width, 1);
      const moduleHeight = Math.max(barcode.height, 1);

      let bits: boolean[];
      if (barcode.mode === BarcodeModeNo) {
        const out = encodeCode128NoMode(content);
        bits = [...out.bits];
        text = out.humanReadable;
      } else {
        const out = encodeCode128Auto(content);
        bits = [...out.bits];
      }

      const width = bits.length * moduleWidth;
      const height = moduleHeight;
      const pos = adjustImageTypeSetPosition(width, height, barcode.position, barcode.orientation);

      ctx.save();
      try {
        rotateForOrientation(ctx, width, height, pos, barcode.orientation);
        paintBitArrayBars(ctx, bits, pos, moduleWidth, height);
        if (barcode.line) {
          await paintHumanReadableText(
            ctx,
            text,
            pos,
            barcode.lineAbove,
            moduleWidth,
            width,
            height,
          );
        }
      } finally {
        ctx.restore();
      }
    },
  };
}

function modifyBarcodeContentEanMode(content: string): { content: string; text: string } {
  // Don't show special functions in human-readable text.
  const text = content.replaceAll(">8", "");

  let next = content.replace(PARENS_AND_SPACES, "");
  next = next.replaceAll(">8", ESCAPE_FNC_1);
  if (!next.startsWith(ESCAPE_FNC_1)) next = ESCAPE_FNC_1 + next;
  return { content: next, text };
}

function modifyBarcodeContentUccMode(content: string): string {
  const padded = content.padStart(19, "0").slice(0, 19);
  const checksumDigit = calculateUccBarcodeChecksumDigit(padded);
  return ESCAPE_FNC_1 + padded + checksumDigit;
}

function calculateUccBarcodeChecksumDigit(content: string): number {
  let checksum = 0;
  for (let i = 0; i < 19; i++) {
    const code = content.charCodeAt(i) - 48;
    checksum += code * ((i % 2) * 2 + 7);
  }
  return checksum % 10;
}
