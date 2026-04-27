import type { FieldOrientation } from "./field_orientation.ts";
import type { LabelPosition } from "./label_position.ts";
import type { ReversePrint } from "./reverse_print.ts";

export interface Barcode39 {
  _kind: "Barcode39";
  Orientation: FieldOrientation;
  Height: number;
  Line: boolean;
  LineAbove: boolean;
  CheckDigit: boolean;
}

export interface Barcode39WithData extends Omit<Barcode39, "_kind"> {
  _kind: "Barcode39WithData";
  ReversePrint: ReversePrint;
  Width: number;
  WidthRatio: number;
  Position: LabelPosition;
  Data: string;
}
