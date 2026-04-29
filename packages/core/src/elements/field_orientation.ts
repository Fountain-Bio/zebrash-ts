export const FieldOrientation = {
  // no rotation
  Normal: 0,
  // rotate 90° clockwise
  Rotate90: 1,
  // rotate 180° clockwise
  Rotate180: 2,
  // rotate 270° clockwise
  Rotate270: 3,
} as const;

export type FieldOrientation = (typeof FieldOrientation)[keyof typeof FieldOrientation];

export function getFieldOrientationDegrees(v: FieldOrientation): number {
  switch (v) {
    case FieldOrientation.Rotate90:
      return 90;
    case FieldOrientation.Rotate180:
      return 180;
    case FieldOrientation.Rotate270:
      return 270;
    default:
      return 0;
  }
}
