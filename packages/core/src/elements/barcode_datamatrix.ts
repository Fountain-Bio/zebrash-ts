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
  orientation: FieldOrientation;
  height: number;
  // quality: 0, 50, 80, 100, 140, 200. Default 0; recommended 200.
  quality: number;
  columns: number;
  rows: number;
  // format: 1..6 (default 6). Ignored for ECC 200.
  format: number;
  // Escape character. Default "~".
  escape: number;
  // Aspect ratio: 1=square, 2=rectangular.
  ratio: DatamatrixRatio;
}

export interface BarcodeDatamatrixWithData extends Omit<BarcodeDatamatrix, "_kind"> {
  _kind: "BarcodeDatamatrixWithData";
  reversePrint: ReversePrint;
  position: LabelPosition;
  data: string;
}
