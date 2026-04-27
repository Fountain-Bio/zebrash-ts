import type { LabelPosition } from "./label_position.ts";
import type { LineColor } from "./line_color.ts";
import type { ReversePrint } from "./reverse_print.ts";

export interface GraphicBox {
  _kind: "GraphicBox";
  reversePrint: ReversePrint;
  position: LabelPosition;
  width: number;
  height: number;
  borderThickness: number;
  cornerRounding: number;
  lineColor: LineColor;
}
