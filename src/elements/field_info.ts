import type { FieldAlignment } from "./field_alignment.ts";
import type { FontInfo } from "./font.ts";
import type { LabelPosition } from "./label_position.ts";
import type { ReversePrint } from "./reverse_print.ts";

export interface FieldInfo {
  ReversePrint: ReversePrint;
  Element: unknown;
  Font: FontInfo;
  Position: LabelPosition;
  Alignment: FieldAlignment;
  Width: number;
  WidthRatio: number;
  Height: number;
  CurrentCharset: number;
}
