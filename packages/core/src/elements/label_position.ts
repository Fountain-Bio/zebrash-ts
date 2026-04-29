export interface LabelPosition {
  x: number;
  y: number;
  calculateFromBottom: boolean;
  automaticPosition: boolean;
}

/** Factory mirroring Go's `elements.LabelPosition{}` literals. */
export function newLabelPosition(init: Partial<LabelPosition> = {}): LabelPosition {
  return {
    x: init.x ?? 0,
    y: init.y ?? 0,
    calculateFromBottom: init.calculateFromBottom ?? false,
    automaticPosition: init.automaticPosition ?? false,
  };
}

/** Alias used by some consumers (matches Go's `AddLabelPositions`). */
export function addLabelPositions(a: LabelPosition, b: LabelPosition): LabelPosition {
  return addLabelPosition(a, b);
}

export function addLabelPosition(p: LabelPosition, pos: LabelPosition): LabelPosition {
  return {
    x: p.x + pos.x,
    y: p.y + pos.y,
    calculateFromBottom: p.calculateFromBottom,
    automaticPosition: p.automaticPosition,
  };
}
