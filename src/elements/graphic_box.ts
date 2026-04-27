import type { LabelPosition } from "./label_position.ts";
import type { LineColor } from "./line_color.ts";
import type { ReversePrint } from "./reverse_print.ts";

export interface GraphicBox {
  _kind: "GraphicBox";
  ReversePrint: ReversePrint;
  Position: LabelPosition;
  Width: number;
  Height: number;
  BorderThickness: number;
  CornerRounding: number;
  LineColor: LineColor;
}
