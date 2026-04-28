import { platform } from "../platform.ts";

/**
 * Nearest-neighbor scale of an `ImageData` by integer factors on each axis.
 *
 * Mirrors Go `images.NewScaled`, which uses `draw.NearestNeighbor.Scale` to
 * upscale the image so 1-bit barcode/text bitmaps stay crisp. If both factors
 * are 1, returns a copy of the source so callers can mutate freely without
 * aliasing.
 */
export function scaled(src: ImageData, scaleX: number, scaleY: number): ImageData {
  if (!Number.isInteger(scaleX) || !Number.isInteger(scaleY) || scaleX < 1 || scaleY < 1) {
    throw new Error(`scaled: scale factors must be positive integers, got (${scaleX}, ${scaleY})`);
  }

  if (scaleX === 1 && scaleY === 1) {
    return platform.createImageData(new Uint8ClampedArray(src.data), src.width, src.height);
  }

  const dstW = src.width * scaleX;
  const dstH = src.height * scaleY;
  const dst = new Uint8ClampedArray(dstW * dstH * 4);

  for (let y = 0; y < dstH; y++) {
    const sy = (y / scaleY) | 0;
    for (let x = 0; x < dstW; x++) {
      const sx = (x / scaleX) | 0;
      const sIdx = (sy * src.width + sx) * 4;
      const dIdx = (y * dstW + x) * 4;
      dst[dIdx] = src.data[sIdx] ?? 0;
      dst[dIdx + 1] = src.data[sIdx + 1] ?? 0;
      dst[dIdx + 2] = src.data[sIdx + 2] ?? 0;
      dst[dIdx + 3] = src.data[sIdx + 3] ?? 0;
    }
  }

  return platform.createImageData(dst, dstW, dstH);
}
