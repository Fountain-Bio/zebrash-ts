export const TextAlignment = {
  Left: 0,
  Right: 1,
  Justified: 2,
  Center: 3,
} as const;

export type TextAlignment = (typeof TextAlignment)[keyof typeof TextAlignment];
