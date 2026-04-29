import type { FieldOrientation } from "./field_orientation.ts";

export interface GraphicSymbol {
  _kind: "GraphicSymbol";
  width: number;
  height: number;
  orientation: FieldOrientation;
}
