import type { FieldOrientation } from "./field_orientation.ts";
import type { LabelPosition } from "./label_position.ts";
import type { ReversePrint } from "./reverse_print.ts";

export const BarcodeMode = {
  No: 0,
  Ucc: 1,
  Automatic: 2,
  Ean: 3,
} as const;

export type BarcodeMode = (typeof BarcodeMode)[keyof typeof BarcodeMode];

export interface Barcode128 {
  _kind: "Barcode128";
  orientation: FieldOrientation;
  height: number;
  line: boolean;
  lineAbove: boolean;
  // Part of the ZPL `^BC` interface; the Go reference and other Code 128
  // libraries (boombuler/barcode, gozxing) disregard this flag because Code 128
  // computes its own modulo-103 checksum, so it's effectively always on.
  // We keep it for ^BC parameter parity but never branch on it.
  checkDigit: boolean;
  mode: BarcodeMode;
}

export interface Barcode128WithData extends Omit<Barcode128, "_kind"> {
  _kind: "Barcode128WithData";
  reversePrint: ReversePrint;
  width: number;
  position: LabelPosition;
  data: string;
}
