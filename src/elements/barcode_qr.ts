import type { LabelPosition } from "./label_position.ts";
import type { ReversePrint } from "./reverse_print.ts";

export interface BarcodeQr {
  _kind: "BarcodeQr";
  // The bar code magnification to use. Any number between 1 and 10 may be used.
  // The default value depends on the print density being used.
  magnification: number;
}

export interface BarcodeQrWithData extends Omit<BarcodeQr, "_kind"> {
  _kind: "BarcodeQrWithData";
  reversePrint: ReversePrint;
  height: number;
  position: LabelPosition;
  data: string;
}

export const QrErrorCorrectionLevel = {
  H: "H".charCodeAt(0),
  Q: "Q".charCodeAt(0),
  M: "M".charCodeAt(0),
  L: "L".charCodeAt(0),
} as const;

export type QrErrorCorrectionLevel = number;

export const QrCharacterMode = {
  Automatic: 0,
  Binary: "B".charCodeAt(0),
  Numeric: "N".charCodeAt(0),
  Alphanumeric: "A".charCodeAt(0),
  Kanji: "K".charCodeAt(0),
} as const;

export type QrCharacterMode = number;

export interface QrInputData {
  data: string;
  level: QrErrorCorrectionLevel;
  mode: QrCharacterMode;
}

export function getQrInputData(barcode: BarcodeQrWithData): QrInputData {
  if (barcode.data.length < 4) {
    throw new Error("invalid qr barcode data");
  }

  let data = barcode.data.slice(3);
  let mode: QrCharacterMode = QrCharacterMode.Automatic;
  const level: QrErrorCorrectionLevel = barcode.data.charCodeAt(0);

  // First character of the data in manual mode defines character mode.
  if (barcode.data.charCodeAt(1) === "M".charCodeAt(0) && data.length > 0) {
    mode = data.charCodeAt(0);
    data = data.slice(1);
  }

  if (mode !== QrCharacterMode.Binary) {
    return { data, level, mode };
  }

  if (data.length < 5) {
    throw new Error("invalid qr barcode byte mode data");
  }

  const lenStr = data.slice(0, 4);
  const dataLen = Number.parseInt(lenStr, 10);
  if (!/^\d{4}$/.test(lenStr) || Number.isNaN(dataLen)) {
    throw new Error(`invalid qr barcode byte mode data length: ${lenStr}`);
  }

  data = data.slice(4);
  const finalLen = Math.min(data.length, dataLen);

  return { data: data.slice(0, finalLen), level, mode };
}
