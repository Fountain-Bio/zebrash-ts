import type { FieldOrientation } from "./field_orientation.ts";
import type { LabelPosition } from "./label_position.ts";
import type { ReversePrint } from "./reverse_print.ts";

export interface Barcode39 {
  _kind: "Barcode39";
  orientation: FieldOrientation;
  height: number;
  line: boolean;
  lineAbove: boolean;
  checkDigit: boolean;
}

export interface Barcode39WithData extends Omit<Barcode39, "_kind"> {
  _kind: "Barcode39WithData";
  reversePrint: ReversePrint;
  width: number;
  widthRatio: number;
  position: LabelPosition;
  data: string;
}
