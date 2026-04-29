import {
  type FieldOrientation,
  FieldOrientation90,
  FieldOrientation180,
  FieldOrientation270,
  type LabelPosition,
  getFieldOrientationDegrees,
} from "../elements/index.ts";
import type { SvgEmitter } from "../svg/emitter.ts";

interface RotatableImage {
  width: number;
  height: number;
}

/**
 * Apply the same rotation transform `rotateImage` applies on a canvas, but
 * via the emitter's group stack. The matching `restore()` closes every
 * `<g>` opened here.
 */
export function rotateImage(
  emitter: SvgEmitter,
  img: RotatableImage,
  pos: LabelPosition,
  orientation: FieldOrientation,
): void {
  const degrees = getFieldOrientationDegrees(orientation);
  if (degrees === 0) return;

  const radians = (degrees * Math.PI) / 180;
  const { width, height } = img;

  emitter.translate(pos.x, pos.y);
  emitter.rotate(radians);
  emitter.translate(-pos.x, -pos.y);

  switch (orientation) {
    case FieldOrientation90:
      emitter.translate(0, -height);
      break;
    case FieldOrientation180:
      emitter.translate(-width, -height);
      break;
    case FieldOrientation270:
      emitter.translate(-width, 0);
      break;
    default:
      break;
  }
}

/** Width-and-height variant matching `rotateForOrientation` on the canvas side. */
export function rotateForOrientation(
  emitter: SvgEmitter,
  width: number,
  height: number,
  pos: LabelPosition,
  orientation: FieldOrientation,
): void {
  rotateImage(emitter, { width, height }, pos, orientation);
}

/** SVG analogue of `rotateAbout` — pure rotation about (x, y). */
export function rotateAbout(
  emitter: SvgEmitter,
  orientation: FieldOrientation,
  x: number,
  y: number,
): void {
  const degrees = getFieldOrientationDegrees(orientation);
  if (degrees === 0) return;
  const radians = (degrees * Math.PI) / 180;
  emitter.translate(x, y);
  emitter.rotate(radians);
  emitter.translate(-x, -y);
}

/** SVG analogue of `scaleAbout` — non-uniform scale about (x, y). */
export function scaleAbout(
  emitter: SvgEmitter,
  sx: number,
  sy: number,
  x: number,
  y: number,
): void {
  if (sx === 1 && sy === 1) return;
  emitter.translate(x, y);
  emitter.scale(sx, sy);
  emitter.translate(-x, -y);
}
