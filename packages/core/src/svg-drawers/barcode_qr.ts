// SVG analogue of `drawers/barcode_qr.ts`.

import { type QrEncoderErrorCorrectionLevel, encodeQr } from "../barcodes/qrcode/index.ts";
import {
  type BarcodeQrWithData,
  type QrErrorCorrectionLevel,
  getQrInputData,
} from "../elements/index.ts";
import type { SvgEmitter } from "../svg/emitter.ts";
import { paintBitMatrixCellsSvg } from "./barcode_paint_svg.ts";
import type { SvgElementDrawer } from "./svg_element_drawer.ts";

export function newBarcodeQrSvgDrawer(): SvgElementDrawer {
  return {
    draw(emitter: SvgEmitter, element: unknown): void {
      const barcode = element as BarcodeQrWithData | null;
      if (!barcode || barcode._kind !== "BarcodeQrWithData") return;

      const { data, level } = getQrInputData(barcode);
      const matrix = encodeQr(data, 1, 1, mapQrErrorCorrectionLevel(level), { QuietZone: 0 });

      const magnification = Math.max(barcode.magnification, 1);
      const cellsHeight = matrix.height * magnification;

      const pos = { ...barcode.position };
      if (!pos.calculateFromBottom) {
        pos.y += barcode.height;
      } else {
        const ftOffset = magnification * 7;
        pos.y = Math.max(pos.y - cellsHeight, 0) - ftOffset;
      }

      paintBitMatrixCellsSvg(emitter, matrix, pos, magnification);
    },
  };
}

function mapQrErrorCorrectionLevel(level: QrErrorCorrectionLevel): QrEncoderErrorCorrectionLevel {
  switch (level) {
    case "L".charCodeAt(0):
      return 0x01 as QrEncoderErrorCorrectionLevel;
    case "Q".charCodeAt(0):
      return 0x03 as QrEncoderErrorCorrectionLevel;
    case "H".charCodeAt(0):
      return 0x02 as QrEncoderErrorCorrectionLevel;
    default:
      return 0x00 as QrEncoderErrorCorrectionLevel;
  }
}
