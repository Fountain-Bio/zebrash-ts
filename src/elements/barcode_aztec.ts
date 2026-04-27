import type { FieldOrientation } from "./field_orientation.ts";
import type { LabelPosition } from "./label_position.ts";
import type { ReversePrint } from "./reverse_print.ts";

export interface BarcodeAztec {
  _kind: "BarcodeAztec";
  orientation: FieldOrientation;
  // Magnification 1..10. Default depends on print density.
  magnification: number;
  // 101-104 (compact), 201-232 (full-range), 300 (Aztec runes), 1-99 (dynamic by min ECC %).
  size: number;
}

export interface BarcodeAztecWithData extends Omit<BarcodeAztec, "_kind"> {
  _kind: "BarcodeAztecWithData";
  reversePrint: ReversePrint;
  position: LabelPosition;
  data: string;
}
