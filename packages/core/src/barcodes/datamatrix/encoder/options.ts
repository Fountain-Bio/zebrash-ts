import type { Dimension } from "./dimension.js";

import { SymbolShapeHint } from "./symbol_shape_hint.js";

export interface Options {
  minSize?: Dimension | null;
  maxSize?: Dimension | null;
  shape: SymbolShapeHint;
  gs1?: boolean;
}

export function defaultOptions(): Options {
  return { shape: SymbolShapeHint.FORCE_NONE };
}
