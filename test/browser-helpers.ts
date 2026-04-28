/**
 * Browser-side counterparts to `test/helpers.ts` — uses `createImageBitmap`
 * + `OffscreenCanvas` instead of `@napi-rs/canvas`.
 *
 * Three diff metrics, computed in one pass:
 *
 *   - `ratio` — diffPixels / totalPixels. The classic per-pixel mismatch
 *     metric. Useful as a rasterizer-drift sanity number, but on a mostly-
 *     white label a missing chunk of text only registers as ~0.3 %, so it
 *     misses structural bugs at any reasonable threshold.
 *
 *   - `inkDeltaRatio` — |inkA - inkB| / max(inkA, inkB) where "ink" is any
 *     dark pixel (R+G+B < 384). Sensitive to missing or extra structure:
 *     when a label is rendered with the human-readable digits dropped, this
 *     ratio jumps because the actual has fewer ink pixels than expected.
 *     In contrast, antialiasing drift pushes an equal number of pixels from
 *     ink-to-white as white-to-ink, so the symmetric delta stays small.
 *
 *   - `inkRatio` — diffPixels / max(inkA, inkB). Reported for context but
 *     not gated; on small-text fixtures even normal drift pushes this high.
 */

export interface PixelDiffResult {
  diffPixels: number;
  totalPixels: number;
  ratio: number;
  inkRatio: number;
  inkDeltaRatio: number;
  inkA: number;
  inkB: number;
  width: number;
  height: number;
}

async function decode(
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
  return { data: ctx.getImageData(0, 0, w, h).data, width: w, height: h };
}

const DARK_THRESHOLD = 384;

export async function pixelDiff(
  a: Uint8Array | Blob,
  b: Uint8Array | Blob,
  threshold = 16,
): Promise<PixelDiffResult> {
  const [imgA0, imgB0] = await Promise.all([decode(a), decode(b)]);
  const width = Math.min(imgA0.width, imgB0.width);
  const height = Math.min(imgA0.height, imgB0.height);

  const [da, db] =
    imgA0.width === width &&
    imgA0.height === height &&
    imgB0.width === width &&
    imgB0.height === height
      ? [imgA0.data, imgB0.data]
      : await Promise.all([
          decode(a, width, height).then((x) => x.data),
          decode(b, width, height).then((x) => x.data),
        ]);

  let diffPixels = 0;
  let inkA = 0;
  let inkB = 0;
  for (let i = 0; i < da.length; i += 4) {
    const ra = da[i] ?? 0,
      ga = da[i + 1] ?? 0,
      ba = da[i + 2] ?? 0;
    const rb = db[i] ?? 0,
      gb = db[i + 1] ?? 0,
      bb = db[i + 2] ?? 0;
    if (ra + ga + ba < DARK_THRESHOLD) inkA++;
    if (rb + gb + bb < DARK_THRESHOLD) inkB++;
    if (
      Math.abs(ra - rb) > threshold ||
      Math.abs(ga - gb) > threshold ||
      Math.abs(ba - bb) > threshold
    ) {
      diffPixels++;
    }
  }
  const totalPixels = width * height;
  const inkMax = Math.max(inkA, inkB);
  return {
    diffPixels,
    totalPixels,
    ratio: totalPixels > 0 ? diffPixels / totalPixels : 0,
    inkRatio: inkMax > 0 ? diffPixels / inkMax : 0,
    inkDeltaRatio: inkMax > 0 ? Math.abs(inkA - inkB) / inkMax : 0,
    inkA,
    inkB,
    width,
    height,
  };
}
