/**
 * Browser-side counterparts to `test/helpers.ts` — same shape, but using
 * `createImageBitmap` + `OffscreenCanvas` instead of `@napi-rs/canvas`.
 *
 * Used only by `golden.browser.test.ts`, which runs in vitest's browser mode.
 */

export interface PixelDiffResult {
  diffPixels: number;
  totalPixels: number;
  ratio: number;
  width: number;
  height: number;
}

async function decodeToImageData(
  data: Uint8Array | Blob,
  forceWidth?: number,
  forceHeight?: number,
): Promise<{ data: Uint8ClampedArray; width: number; height: number }> {
  const blob = data instanceof Blob ? data : new Blob([data as BlobPart], { type: "image/png" });
  const bmp = await createImageBitmap(blob);
  const w = forceWidth ?? bmp.width;
  const h = forceHeight ?? bmp.height;
  const cv = new OffscreenCanvas(w, h);
  const ctx = cv.getContext("2d");
  if (!ctx) throw new Error("OffscreenCanvas 2D context unavailable");
  ctx.drawImage(bmp, 0, 0);
  const imgData = ctx.getImageData(0, 0, w, h);
  return { data: imgData.data, width: w, height: h };
}

export async function pixelDiff(
  a: Uint8Array | Blob,
  b: Uint8Array | Blob,
  threshold = 16,
): Promise<PixelDiffResult> {
  // First decode both to discover their natural sizes.
  const [imgA, imgB] = await Promise.all([decodeToImageData(a), decodeToImageData(b)]);
  const width = Math.min(imgA.width, imgB.width);
  const height = Math.min(imgA.height, imgB.height);

  // Re-decode at the intersection size if needed so getImageData lengths match.
  const [da, db] =
    imgA.width === width && imgA.height === height && imgB.width === width && imgB.height === height
      ? [imgA.data, imgB.data]
      : await Promise.all([
          decodeToImageData(a, width, height).then((x) => x.data),
          decodeToImageData(b, width, height).then((x) => x.data),
        ]);

  let diffPixels = 0;
  for (let i = 0; i < da.length; i += 4) {
    const dr = Math.abs((da[i] ?? 0) - (db[i] ?? 0));
    const dg = Math.abs((da[i + 1] ?? 0) - (db[i + 1] ?? 0));
    const dbb = Math.abs((da[i + 2] ?? 0) - (db[i + 2] ?? 0));
    if (dr > threshold || dg > threshold || dbb > threshold) {
      diffPixels++;
    }
  }
  const totalPixels = width * height;
  return {
    diffPixels,
    totalPixels,
    ratio: totalPixels > 0 ? diffPixels / totalPixels : 0,
    width,
    height,
  };
}
