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
  reversePrint: ReversePrint;
  position: LabelPosition;
  // A (hexadecimal), B (raw binary), C (AR compressed). No default.
  format: GraphicFieldFormat;
  // Total number of data bytes in the fifth parameter.
  DataBytes: number;
  // Total number of bytes in the image (pixels / 8).
  totalBytes: number;
  // Bytes per pixel row (pixel width / 8).
  rowBytes: number;
  // Image data, in the format specified.
  data: Uint8Array;
  // Horizontal magnification 1..10. Default 1.
  magnificationX: number;
  // Vertical magnification 1..10. Default 1.
  magnificationY: number;
}
