/**
 * RGBA color tuple as `[R, G, B, A]` with each channel in `[0, 255]`.
 *
 * Mirrors Go's `color.RGBA` literals used in `internal/images/colors.go`.
 */
export type RGBA = readonly [r: number, g: number, b: number, a: number];

/** Opaque black, matching Go `ColorBlack = color.RGBA{A: 255}`. */
export const ColorBlack: RGBA = [0, 0, 0, 255];

/** Opaque white, matching Go `ColorWhite = color.RGBA{R:255, G:255, B:255, A:255}`. */
export const ColorWhite: RGBA = [255, 255, 255, 255];

/** Fully transparent, matching Go `ColorTransparent = color.RGBA{A: 0}`. */
export const ColorTransparent: RGBA = [0, 0, 0, 0];

/** Format an `RGBA` tuple as a CSS `rgba(...)` string for `ctx.fillStyle`. */
export function rgbaToCss(c: RGBA): string {
  const [r, g, b, a] = c;
  return `rgba(${r}, ${g}, ${b}, ${a / 255})`;
}
