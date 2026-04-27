import type { LabelPosition } from "./label_position.ts";
import type { LineColor } from "./line_color.ts";
import type { ReversePrint } from "./reverse_print.ts";

export interface GraphicCircle {
  _kind: "GraphicCircle";
  ReversePrint: ReversePrint;
  Position: LabelPosition;
  // The diameter of the circle, in dots. 3..4095. Default 3.
  CircleDiameter: number;
  // The line thickness, in dots. 1..4095. Default 1.
  BorderThickness: number;
  // The line color. B (black) or W (white). Default B.
  LineColor: LineColor;
}
