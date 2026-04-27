import type { FieldOrientation } from "./field_orientation.ts";
import type { LabelPosition } from "./label_position.ts";
import type { ReversePrint } from "./reverse_print.ts";

export interface BarcodeEan13 {
  _kind: "BarcodeEan13";
  Orientation: FieldOrientation;
  Height: number;
  Line: boolean;
  LineAbove: boolean;
}

export interface BarcodeEan13WithData extends Omit<BarcodeEan13, "_kind"> {
  _kind: "BarcodeEan13WithData";
  ReversePrint: ReversePrint;
  Width: number;
  Position: LabelPosition;
  Data: string;
}
