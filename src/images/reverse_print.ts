import type { Canvas, ImageData } from "@napi-rs/canvas";

const ALPHA_THRESHOLD = 30;

/**
 * Apply a `^FR` reverse-print mask: wherever the source pixel is opaque enough
 * (alpha ≥ 30), invert the destination pixel's RGB channels.
 *
 * Mirrors Go `images.reversePrint`: a black-on-transparent mask is XOR'd onto
 * a destination so glyphs/barcodes covering already-drawn ink turn white.
 *
 * Both inputs must match in width and height. A `Canvas` destination is read
 * via `getImageData`, mutated, and written back via `putImageData`.
 */
export function reversePrint(mask: Canvas | ImageData, dst: Canvas | ImageData): void {
  const maskImg = asImageData(mask);
  const dstImg = asImageData(dst);

  if (maskImg.width !== dstImg.width || maskImg.height !== dstImg.height) {
    throw new Error(
      `reversePrint: size mismatch — mask is ${maskImg.width}x${maskImg.height}, ` +
        `dst is ${dstImg.width}x${dstImg.height}`,
    );
  }

  const maskPixels = maskImg.data;
  const dstPixels = dstImg.data;

  for (let i = 0; i < maskPixels.length; i += 4) {
    if ((maskPixels[i + 3] ?? 0) < ALPHA_THRESHOLD) continue;
    dstPixels[i] = 255 - (dstPixels[i] ?? 0);
    dstPixels[i + 1] = 255 - (dstPixels[i + 1] ?? 0);
    dstPixels[i + 2] = 255 - (dstPixels[i + 2] ?? 0);
  }

  if (!isImageData(dst)) {
    dst.getContext("2d").putImageData(dstImg, 0, 0);
  }
}

function isImageData(value: Canvas | ImageData): value is ImageData {
  return "data" in value && value.data instanceof Uint8ClampedArray;
}

function asImageData(target: Canvas | ImageData): ImageData {
  if (isImageData(target)) return target;
  return target.getContext("2d").getImageData(0, 0, target.width, target.height);
}
