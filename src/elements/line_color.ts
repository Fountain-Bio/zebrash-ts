export const LineColor = {
  Black: 0,
  White: 1,
} as const;

export type LineColor = (typeof LineColor)[keyof typeof LineColor];
