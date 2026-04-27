import type { FieldAlignment } from "./field_alignment.ts";
import type { FieldBlock } from "./field_block.ts";
import type { FontInfo } from "./font.ts";
import type { LabelPosition } from "./label_position.ts";
import type { ReversePrint } from "./reverse_print.ts";

export interface TextField {
  _kind: "TextField";
  ReversePrint: ReversePrint;
  Font: FontInfo;
  Position: LabelPosition;
  Alignment: FieldAlignment;
  Text: string;
  Block?: FieldBlock | undefined;
}
