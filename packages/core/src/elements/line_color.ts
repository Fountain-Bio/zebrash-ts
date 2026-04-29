export const LineColor = {
  Black: 0,
  White: 1,
} as const;

export type LineColor = (typeof LineColor)[keyof typeof LineColor];

// Named constants for cross-unit consumers that import them directly.
export const LineColorBlack = LineColor.Black;
export const LineColorWhite = LineColor.White;
