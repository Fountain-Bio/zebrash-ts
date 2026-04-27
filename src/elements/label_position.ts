export interface LabelPosition {
  X: number;
  Y: number;
  CalculateFromBottom: boolean;
  AutomaticPosition: boolean;
}

export function addLabelPosition(p: LabelPosition, pos: LabelPosition): LabelPosition {
  return {
    X: p.X + pos.X,
    Y: p.Y + pos.Y,
    CalculateFromBottom: p.CalculateFromBottom,
    AutomaticPosition: p.AutomaticPosition,
  };
}
