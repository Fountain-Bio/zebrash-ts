// SVG analogue of `drawers/barcode_128.ts`.

import { ESCAPE_FNC_1, encodeCode128Auto, encodeCode128NoMode } from "../barcodes/code128/index.ts";
import { adjustImageTypeSetPosition } from "../drawers/element_drawer.ts";
import {
  type Barcode128WithData,
  BarcodeModeEan,
  BarcodeModeNo,
  BarcodeModeUcc,
} from "../elements/index.ts";
import type { SvgEmitter } from "../svg/emitter.ts";
import { paintBitArrayBarsSvg, paintHumanReadableTextSvg } from "./barcode_paint_svg.ts";
import type { SvgElementDrawer } from "./svg_element_drawer.ts";
import { rotateForOrientation } from "./transform.ts";

const PARENS_AND_SPACES = /[()\s]+/g;

export function newBarcode128SvgDrawer(): SvgElementDrawer {
  return {
    draw(emitter: SvgEmitter, element: unknown): void {
      const barcode = element as Barcode128WithData | null;
      if (!barcode || barcode._kind !== "Barcode128WithData") return;

      let content = barcode.data;
      let text = barcode.data;

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

function modifyBarcodeContentEanMode(content: string): { content: string; text: string } {
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
