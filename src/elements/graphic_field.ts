import type { LabelPosition } from "./label_position.ts";
import type { ReversePrint } from "./reverse_print.ts";

export const GraphicFieldFormat = {
  Hex: 1,
  Raw: 2,
  AR: 3,
} as const;

export type GraphicFieldFormat = (typeof GraphicFieldFormat)[keyof typeof GraphicFieldFormat];

export interface GraphicField {
  _kind: "GraphicField";
  ReversePrint: ReversePrint;
  Position: LabelPosition;
  // A (hexadecimal), B (raw binary), C (AR compressed). No default.
  Format: GraphicFieldFormat;
  // Total number of data bytes in the fifth parameter.
  DataBytes: number;
  // Total number of bytes in the image (pixels / 8).
  TotalBytes: number;
  // Bytes per pixel row (pixel width / 8).
  RowBytes: number;
  // Image data, in the format specified.
  Data: Uint8Array;
  // Horizontal magnification 1..10. Default 1.
  MagnificationX: number;
  // Vertical magnification 1..10. Default 1.
  MagnificationY: number;
}
