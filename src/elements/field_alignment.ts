// The origin alignment to use.
// Not the same as text alignment for text block.
export const FieldAlignment = {
  Left: 0,
  Right: 1,
  // automatic alignment based on the direction of the field data text
  Auto: 2,
} as const;

export type FieldAlignment = (typeof FieldAlignment)[keyof typeof FieldAlignment];
