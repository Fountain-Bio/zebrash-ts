import type { FieldOrientation } from "./field_orientation.ts";
import type { LabelPosition } from "./label_position.ts";
import type { ReversePrint } from "./reverse_print.ts";

export interface BarcodePdf417 {
  _kind: "BarcodePdf417";
  orientation: FieldOrientation;
  rowHeight: number;
  security: number;
  columns: number;
  rows: number;
  truncate: boolean;
}

export interface BarcodePdf417WithData extends Omit<BarcodePdf417, "_kind"> {
  _kind: "BarcodePdf417WithData";
  reversePrint: ReversePrint;
  position: LabelPosition;
  data: string;
}
