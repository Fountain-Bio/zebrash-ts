import type { FieldOrientation } from "./field_orientation.ts";
import type { LabelPosition } from "./label_position.ts";
import type { ReversePrint } from "./reverse_print.ts";

export const DatamatrixRatio = {
  Square: 1,
  Rectangular: 2,
} as const;

export type DatamatrixRatio = (typeof DatamatrixRatio)[keyof typeof DatamatrixRatio];

export interface BarcodeDatamatrix {
  _kind: "BarcodeDatamatrix";
  Orientation: FieldOrientation;
  Height: number;
  // Quality: 0, 50, 80, 100, 140, 200. Default 0; recommended 200.
  Quality: number;
  Columns: number;
  Rows: number;
  // Format: 1..6 (default 6). Ignored for ECC 200.
  Format: number;
  // Escape character. Default "~".
  Escape: number;
  // Aspect ratio: 1=square, 2=rectangular.
  Ratio: DatamatrixRatio;
}

export interface BarcodeDatamatrixWithData extends Omit<BarcodeDatamatrix, "_kind"> {
  _kind: "BarcodeDatamatrixWithData";
  ReversePrint: ReversePrint;
  Position: LabelPosition;
  Data: string;
}
