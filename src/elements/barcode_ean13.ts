import type { FieldOrientation } from "./field_orientation.ts";
import type { LabelPosition } from "./label_position.ts";
import type { ReversePrint } from "./reverse_print.ts";

export interface BarcodeEan13 {
  _kind: "BarcodeEan13";
  orientation: FieldOrientation;
  height: number;
  line: boolean;
  lineAbove: boolean;
}

export interface BarcodeEan13WithData extends Omit<BarcodeEan13, "_kind"> {
  _kind: "BarcodeEan13WithData";
  reversePrint: ReversePrint;
  width: number;
  position: LabelPosition;
  data: string;
}
