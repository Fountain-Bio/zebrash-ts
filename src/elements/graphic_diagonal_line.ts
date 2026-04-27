import type { LabelPosition } from "./label_position.ts";
import type { LineColor } from "./line_color.ts";
import type { ReversePrint } from "./reverse_print.ts";

export interface GraphicDiagonalLine {
  _kind: "GraphicDiagonalLine";
  ReversePrint: ReversePrint;
  Position: LabelPosition;
  Width: number;
  Height: number;
  BorderThickness: number;
  LineColor: LineColor;
  TopToBottom: boolean;
}
