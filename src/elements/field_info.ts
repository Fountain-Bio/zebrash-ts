import type { FieldAlignment } from "./field_alignment.ts";
import type { FontInfo } from "./font.ts";
import type { LabelPosition } from "./label_position.ts";
import type { ReversePrint } from "./reverse_print.ts";

export interface FieldInfo {
  reversePrint: ReversePrint;
  element: unknown;
  font: FontInfo;
  position: LabelPosition;
  alignment: FieldAlignment;
  width: number;
  widthRatio: number;
  height: number;
  currentCharset: number;
}
