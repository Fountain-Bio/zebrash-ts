// SymbolShapeHint - enumeration for DataMatrix symbol shape hint.
// It can be used to force square or rectangular symbols.
export const SymbolShapeHint = {
  FORCE_NONE: 0,
  FORCE_SQUARE: 1,
  FORCE_RECTANGLE: 2,
} as const;

export type SymbolShapeHint = (typeof SymbolShapeHint)[keyof typeof SymbolShapeHint];
