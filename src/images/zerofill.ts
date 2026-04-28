import type { PlatformCanvas } from "../platform.ts";

/**
 * Zero out every byte of an RGBA pixel buffer (R=G=B=A=0 → fully transparent
 * black). Matches Go `images.Zerofill`, which sets `rgba.Pix[i] = 0` for every
 * channel.
 *
 * Accepts either a `PlatformCanvas` (writes via `getImageData`/`putImageData`)
 * or an `ImageData` (mutates `.data` in place).
 */
export function zerofill(target: PlatformCanvas | ImageData): void {
  if (isImageData(target)) {
    target.data.fill(0);
    return;
  }

  const ctx = target.getContext("2d");
  if (ctx === null) throw new Error("zebrash: failed to acquire 2D context for zerofill");
  const img = ctx.getImageData(0, 0, target.width, target.height);
  img.data.fill(0);
  ctx.putImageData(img, 0, 0);
}

function isImageData(value: PlatformCanvas | ImageData): value is ImageData {
  return "data" in value && value.data instanceof Uint8ClampedArray;
}
