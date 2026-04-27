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
  Orientation: FieldOrientation;
  Height: number;
  Line: boolean;
  LineAbove: boolean;
  // TODO: Figure out if it should be implemented, as it's part of the interface but reference
  // libraries disregard this value.
  CheckDigit: boolean;
  Mode: BarcodeMode;
}

export interface Barcode128WithData extends Omit<Barcode128, "_kind"> {
  _kind: "Barcode128WithData";
  ReversePrint: ReversePrint;
  Width: number;
  Position: LabelPosition;
  Data: string;
}
