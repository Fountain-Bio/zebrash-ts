import type { FieldOrientation } from "./field_orientation.ts";

export interface GraphicSymbol {
  _kind: "GraphicSymbol";
  Width: number;
  Height: number;
  Orientation: FieldOrientation;
}
