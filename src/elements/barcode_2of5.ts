import type { FieldOrientation } from "./field_orientation.ts";
import type { LabelPosition } from "./label_position.ts";
import type { ReversePrint } from "./reverse_print.ts";

export interface Barcode2of5 {
  _kind: "Barcode2of5";
  Orientation: FieldOrientation;
  Height: number;
  Line: boolean;
  LineAbove: boolean;
  CheckDigit: boolean;
}

export interface Barcode2of5WithData extends Omit<Barcode2of5, "_kind"> {
  _kind: "Barcode2of5WithData";
  ReversePrint: ReversePrint;
  Width: number;
  WidthRatio: number;
  Position: LabelPosition;
  Data: string;
}
