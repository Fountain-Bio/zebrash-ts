import { type PlatformCanvas, platform } from "../platform.ts";

const MONOCHROME_THRESHOLD = 128;

/**
 * Encode a canvas to PNG, thresholding each pixel to pure black or white.
 *
 * Mirrors Go `images.EncodeMonochrome`: it samples the red channel of each
 * RGBA pixel and emits 0 or 255 based on a 128 threshold. We replicate the
 * same red-channel test so identical input yields identical output, and emit
 * the result back into the canvas before encoding to PNG.
 *
 * `@napi-rs/canvas` does not expose a true 1-bit PNG encoder — RGB output with
 * `R=G=B` is visually identical and round-trips through `loadImage`.
 */
export async function encodeMonochrome(canvas: PlatformCanvas): Promise<Uint8Array> {
  const ctx = canvas.getContext("2d");
  if (ctx === null) throw new Error("zebrash: failed to acquire 2D context for encode");
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = img.data;

  for (let i = 0; i < pixels.length; i += 4) {
    const v = (pixels[i] ?? 0) > MONOCHROME_THRESHOLD ? 255 : 0;
    pixels[i] = v;
    pixels[i + 1] = v;
    pixels[i + 2] = v;
    pixels[i + 3] = 255;
  }

  ctx.putImageData(img, 0, 0);
  return platform.encodePng(canvas);
}

/**
 * Encode a canvas to PNG as 8-bit grayscale, preserving anti-aliasing.
 *
 * Mirrors Go `images.EncodeGrayscale`, which copies the red channel of each
 * RGBA pixel into a single-channel `image.Gray`. Go's image library happens
 * to use the red channel as its grayscale value (rather than computing a
 * proper luma) so we match that exactly.
 *
 * Emitted as RGB with `R=G=B=Y` because `@napi-rs/canvas` cannot natively
 * write 8-bit grayscale PNGs.
 */
export async function encodeGrayscale(canvas: PlatformCanvas): Promise<Uint8Array> {
  const ctx = canvas.getContext("2d");
  if (ctx === null) throw new Error("zebrash: failed to acquire 2D context for encode");
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = img.data;

  for (let i = 0; i < pixels.length; i += 4) {
    const y = pixels[i] ?? 0;
    pixels[i + 1] = y;
    pixels[i + 2] = y;
    pixels[i + 3] = 255;
  }

  ctx.putImageData(img, 0, 0);
  return platform.encodePng(canvas);
}
