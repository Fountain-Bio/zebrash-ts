// Port of /Users/alancohen/fountain-bio/zebrash/internal/drawers/barcode_qr.go.

import { type QrEncoderErrorCorrectionLevel, encodeQr } from "../barcodes/qrcode/index.js";
import {
  type BarcodeQrWithData,
  type QrErrorCorrectionLevel,
  getQrInputData,
} from "../elements/index.js";
import { paintBitMatrixCells } from "./barcode_paint.js";
import type { ElementDrawer } from "./element_drawer.js";

export function newBarcodeQrDrawer(): ElementDrawer {
  return {
    draw(ctx, element): void {
      const barcode = element as BarcodeQrWithData | null;
      if (!barcode || barcode.kind !== "barcodeQr") return;

      const { data, level } = getQrInputData(barcode);
      const matrix = encodeQr(data, 1, 1, mapQrErrorCorrectionLevel(level), { quietZone: 0 });

      const magnification = Math.max(barcode.magnification, 1);
      const cellsHeight = matrix.height * magnification;

      const pos = { ...barcode.position };
      if (!pos.calculateFromBottom) {
        pos.y += barcode.height;
      } else {
        // TODO(unit-15): figure out the proper formula for ftOffset; depends on QR version.
        const ftOffset = magnification * 7;
        pos.y = Math.max(pos.y - cellsHeight, 0) - ftOffset;
      }

      paintBitMatrixCells(ctx, matrix, pos, magnification);
    },
  };
}

function mapQrErrorCorrectionLevel(level: QrErrorCorrectionLevel): QrEncoderErrorCorrectionLevel {
  switch (level) {
    case "L":
      return "L";
    case "Q":
      return "Q";
    case "H":
      return "H";
    default:
      return "M";
  }
}
