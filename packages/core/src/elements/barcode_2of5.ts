import type { FieldOrientation } from "./field_orientation.ts";
import type { LabelPosition } from "./label_position.ts";
import type { ReversePrint } from "./reverse_print.ts";

export interface Barcode2of5 {
  _kind: "Barcode2of5";
  orientation: FieldOrientation;
  height: number;
  line: boolean;
  lineAbove: boolean;
  checkDigit: boolean;
}

export interface Barcode2of5WithData extends Omit<Barcode2of5, "_kind"> {
  _kind: "Barcode2of5WithData";
  reversePrint: ReversePrint;
  width: number;
  widthRatio: number;
  position: LabelPosition;
  data: string;
}
