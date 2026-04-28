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
      if (!barcode || barcode._kind !== "BarcodeQrWithData") return;

      const { data, level } = getQrInputData(barcode);
      const matrix = encodeQr(data, 1, 1, mapQrErrorCorrectionLevel(level), { QuietZone: 0 });

      const magnification = Math.max(barcode.magnification, 1);
      const cellsHeight = matrix.height * magnification;

      const pos = { ...barcode.position };
      if (!pos.calculateFromBottom) {
        pos.y += barcode.height;
      } else {
        // ftOffset = 7 modules of magnification — matches the Go reference's
        // QR drawer placement when calculateFromBottom is true. Encodes the
        // QR finder-pattern radius (7 modules) used as the anchor offset.
        const ftOffset = magnification * 7;
        pos.y = Math.max(pos.y - cellsHeight, 0) - ftOffset;
      }

      paintBitMatrixCells(ctx, matrix, pos, magnification);
    },
  };
}

function mapQrErrorCorrectionLevel(level: QrErrorCorrectionLevel): QrEncoderErrorCorrectionLevel {
  // The element's QrErrorCorrectionLevel is the ASCII code of "L"/"M"/"Q"/"H".
  // Map to the QR encoder's numeric ECL constants (L=01, M=00, Q=03, H=02).
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
