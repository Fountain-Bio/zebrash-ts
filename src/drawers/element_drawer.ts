import type { SKRSContext2D } from "@napi-rs/canvas";

import type { DrawerOptions } from "../drawer-options.ts";
import {
  FieldOrientation,
  type LabelPosition,
  LineColor,
  getFieldOrientationDegrees,
} from "../elements/index.ts";
import { colorBlack, colorWhite } from "../images/index.ts";
import type { DrawerState } from "./drawer_state.ts";

/**
 * Draws a single ZPL element onto the canvas. Each per-element drawer
 * (graphic box, text field, barcode, ...) is realised as one of these.
 *
 * Mirrors Go `internal/drawers.ElementDrawer`.
 */
export interface ElementDrawer {
  draw(
    ctx: SKRSContext2D,
    element: unknown,
    options: DrawerOptions,
    state: DrawerState,
  ): void | Promise<void>;
}

/** Width × height of an image-like value rendered by `rotateImage`. */
export interface RotatableImage {
  width: number;
  height: number;
}

/**
 * Adjusts a typeset position for elements that are anchored from the bottom.
 * Mirrors Go `internal/drawers.adjustImageTypeSetPosition`.
 */
export function adjustImageTypeSetPosition(
  img: RotatableImage,
  pos: LabelPosition,
  orientation: FieldOrientation,
): LabelPosition {
  if (!pos.calculateFromBottom) {
    return pos;
  }

  const { width, height } = img;
  let { x, y } = pos;

  switch (orientation) {
    case FieldOrientation.Normal:
      y = Math.max(y - height, 0);
      break;
    case FieldOrientation.Rotate180:
      x -= width;
      break;
    case FieldOrientation.Rotate270:
      x = Math.max(x - height, 0);
      y -= width;
      break;
    default:
      break;
  }

  return {
    x,
    y,
    calculateFromBottom: pos.calculateFromBottom,
    automaticPosition: pos.automaticPosition,
  };
}

/**
 * Applies the rotation transform for an image at the given anchor position.
 * Mirrors Go `internal/drawers.rotateImage` (which uses `gg.RotateAbout`).
 *
 * The ported behaviour is: rotate-about `(pos.x, pos.y)`, then apply the
 * orientation-specific translate so the image's top-left aligns with the
 * caller's expected coordinate frame.
 */
export function rotateImage(
  ctx: SKRSContext2D,
  img: RotatableImage,
  pos: LabelPosition,
  orientation: FieldOrientation,
): void {
  const degrees = getFieldOrientationDegrees(orientation);
  if (degrees === 0) {
    return;
  }

  const radians = (degrees * Math.PI) / 180;
  const { width, height } = img;

  // Rotate about (pos.x, pos.y) — equivalent to gg.RotateAbout.
  ctx.translate(pos.x, pos.y);
  ctx.rotate(radians);
  ctx.translate(-pos.x, -pos.y);

  switch (orientation) {
    case FieldOrientation.Rotate90:
      ctx.translate(0, -height);
      break;
    case FieldOrientation.Rotate180:
      ctx.translate(-width, -height);
      break;
    case FieldOrientation.Rotate270:
      ctx.translate(-width, 0);
      break;
    default:
      break;
  }
}

/** Sets both fill and stroke styles on the context based on a `LineColor`. */
export function setLineColor(ctx: SKRSContext2D, color: LineColor): void {
  const value = color === LineColor.White ? colorWhite : colorBlack;
  ctx.fillStyle = value;
  ctx.strokeStyle = value;
}
