import type { FieldOrientation } from "./field_orientation.ts";
import type { LabelPosition } from "./label_position.ts";
import type { ReversePrint } from "./reverse_print.ts";

export interface BarcodePdf417 {
  _kind: "BarcodePdf417";
  Orientation: FieldOrientation;
  RowHeight: number;
  Security: number;
  Columns: number;
  Rows: number;
  Truncate: boolean;
}

export interface BarcodePdf417WithData extends Omit<BarcodePdf417, "_kind"> {
  _kind: "BarcodePdf417WithData";
  ReversePrint: ReversePrint;
  Position: LabelPosition;
  Data: string;
}
